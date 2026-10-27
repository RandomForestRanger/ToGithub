import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { stratify, tree } from 'd3-hierarchy';
import { canon, LINES, ROOT_LINE, type Line } from '../data';
import { UI } from '../content/kaptein';
import { lineRec, type Store } from '../game/storage';

import vixenImg from '../assets/vixen.webp';

const VIXEN_W = 180, VIXEN_H = Math.round(VIXEN_W * 418 / 440); // image is 440x418
import { ALIVE_HUES, GOLD_HUES, bubbles, bulb, bulbDims, distantKelp, fronds, holdfast, hueIndex, particles, seabed, stipe, type BulbDims } from './kelpShapes';
import washImg from '../assets/wash.webp';
import { Crabs, SmallFish, Visitors, useVisitors } from './Creatures';
import { Badge } from './Badge';
import { RopeFrame } from './RopeFrame';
import { BADGES_LEFT, BADGES_RIGHT, type BadgeDef } from '../game/badges';

const PLY_PX = 26, MIN_STIPE = 40, DX = 52, FONT = 13;

interface Placed {
  id: string; x: number; y: number; px: number; py: number; leaf: boolean; line: Line; root: boolean;
  dims: BulbDims; w0: number; w1: number;
}
interface LabelPos { bx: number; by: number; ox: number; oy: number; anchor: 'start' | 'middle' | 'end'; placed: boolean }

// Ecklonia: the stipe is thin at its base and thickens upward into the bulb
const widths = (root: boolean, famous: boolean, d: BulbDims) => [root ? 6 : famous ? 2.8 : 2, d.neck * 2];

function layout(): { nodes: Placed[]; box: [number, number, number, number]; ground: number } {
  const root = stratify<Line>().id(l => l.id).parentId(l => l.parent)(canon.lines);
  root.sort((a, b) => (b.data.games - a.data.games));
  tree<Line>().nodeSize([DX, 1])(root);
  const nodes: Placed[] = [];
  const ground = 0, holdfastTop = ground - 18;
  root.each(n => {
    const isRoot = !n.parent;
    const dims = bulbDims(isRoot, n.data.famous);
    const [w0, w1] = widths(isRoot, n.data.famous, dims);
    const len = isRoot ? 70 : Math.max(MIN_STIPE, n.data.frondPlies * PLY_PX);
    // children grow from the parent's crown (top of its bulb)
    const parentY = n.parent ? (n.parent as any).crownY : holdfastTop;
    const parentX = n.parent ? n.parent.x! : n.x!;
    const y = parentY - len;
    (n as any).crownY = y - dims.len;
    nodes.push({ id: n.data.id, x: n.x!, y, px: parentX, py: parentY, leaf: !n.children, line: n.data, root: isRoot, dims, w0, w1 });
  });
  const xs = nodes.map(n => n.x), ys = nodes.map(n => n.y - n.dims.len);
  const minX = Math.min(...xs) - 140, maxX = Math.max(...xs) + 160;
  const minY = Math.min(...ys) - 170, maxY = 70;
  return { nodes, box: [minX, minY, maxX - minX, maxY - minY], ground };
}

/** Greedy label placement at fit scale: above, right, left or below the bulb, avoiding bulbs and earlier labels. */
function placeLabels(nodes: Placed[]): Map<string, LabelPos> {
  type Rect = [number, number, number, number];
  const hit = (a: Rect, b: Rect) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];
  const taken: Rect[] = nodes.map(n => [n.x - n.dims.rad, n.y - n.dims.len, n.dims.rad * 2, n.dims.len]);
  const order = [...nodes].sort((a, b) => (+b.root - +a.root) || (+b.line.famous - +a.line.famous) || (b.line.games - a.line.games));
  const out = new Map<string, LabelPos>();
  for (const n of order) {
    const w = n.line.label.length * FONT * 0.54 + 6, h = FONT + 3;
    const top = n.y - n.dims.len, mid = n.y - n.dims.len * 0.6, R = n.dims.rad;
    const cands: LabelPos[] = [
      { bx: n.x, by: top, ox: 0, oy: -6, anchor: 'middle', placed: true },
      { bx: n.x + R, by: mid, ox: 5, oy: 4, anchor: 'start', placed: true },
      { bx: n.x - R, by: mid, ox: -5, oy: 4, anchor: 'end', placed: true },
      { bx: n.x, by: n.y, ox: 0, oy: 15, anchor: 'middle', placed: true },
    ];
    const rectOf = (c: LabelPos): Rect => {
      const tx = c.bx + c.ox, ty = c.by + c.oy;
      const x0 = c.anchor === 'middle' ? tx - w / 2 : c.anchor === 'start' ? tx : tx - w;
      return [x0, ty - FONT + 1, w, h];
    };
    const ok = cands.find(c => !taken.some(t => hit(t, rectOf(c))));
    if (ok) { taken.push(rectOf(ok)); out.set(n.id, ok); }
    else out.set(n.id, { ...cands[0], placed: false });
  }
  return out;
}

/** The chain of lines from the root up to `id` (root first). */
export function routeOf(id: string): string[] {
  const out: string[] = [];
  for (let l: Line | undefined = LINES[id]; l; l = l.parent ? LINES[l.parent] : undefined) out.unshift(l.id);
  return out;
}

const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function Kelpwoud({ store, changed, onBegin, onToggleLights, route, overlay }: {
  store: Store; changed: string[]; onBegin: () => void; onToggleLights: () => void;
  /** round intro: light up the path to this line and pan to it */
  route?: string;
  /** shown instead of the footer (the round intro card) */
  overlay?: ReactNode;
}) {
  const { nodes, box, ground } = useMemo(layout, []);
  const labels = useMemo(() => placeLabels(nodes), [nodes]);
  const scene = useMemo(() => ({
    bed: seabed(box[0] - 2000, box[0] + box[2] + 2000, ground),
    roots: holdfast(nodes[0].x, ground),
    distant: distantKelp(box, ground),
    specks: particles(box),
    bubbles: bubbles(box, ground),
    shapes: new Map(nodes.map(n => {
      const b = bulb(n.x, n.y, n.dims);
      return [n.id, {
        stipe: stipe(n.px, n.py, n.x, n.y, n.w0, n.w1, n.line.reef, n.id),
        bulb: b,
        fronds: fronds(b.crown[0], b.crown[1], n.leaf, n.line.famous, n.id),
      }];
    })),
  }), [nodes, box, ground]);
  const [vb, setVb] = useState<[number, number, number, number]>(box);
  const visitors = useVisitors(box, ground);
  const onRoute = useMemo(() => new Set(route ? routeOf(route) : []), [route]);
  const vbRef = useRef(vb);
  vbRef.current = vb;
  /** glide the camera to v over ~700 ms (instant under reduced motion) */
  const glideTo = (v: [number, number, number, number]) => {
    if (reducedMotion()) { setVb(v); return; }
    const from = vbRef.current, t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 700), e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
      setVb(from.map((f, i) => f + (v[i] - f) * e) as [number, number, number, number]);
      if (k < 1) raf.current = requestAnimationFrame(step);
    };
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(step);
  };
  const raf = useRef(0);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  const fitW = useRef(box[2]);
  const [sel, setSel] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const ptrs = useRef(new Map<number, { x: number; y: number }>());
  const moved = useRef(0);
  const downOn = useRef<string | null>(null);

  // Start zoomed to fit; on a portrait phone fit the height and centre on the holdfast (pan for the rest).
  const fitView = () => {
    const el = svgRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const a = r.width / r.height;
    // include the Vixen above the surface (VIXEN_H of headroom)
    // (on a portrait phone a little more, so she clears the title and counter)
    const head = r.width < r.height ? VIXEN_H * 1.7 : VIXEN_H;
    const [bx, by, bw, bh] = [box[0], box[1] - head, box[2], box[3] + head];
    let v: [number, number, number, number];
    if (a < 1) {
      const w = bh * a;
      const rootX = nodes[0].x;
      v = [Math.max(bx, Math.min(bx + bw - w, rootX - w / 2)), by, w, bh];
    } else if (bw / bh > a) {
      const h = bw / a;
      v = [bx, by + bh - h, bw, h];
    } else {
      const w = bh * a;
      v = [bx + (bw - w) / 2, by, w, bh];
    }
    fitW.current = v[2];
    setVb(v);
  };
  useLayoutEffect(fitView, []); // eslint-disable-line react-hooks/exhaustive-deps

  const ids = canon.lines.map(l => l.id).filter(id => id !== ROOT_LINE);
  const greens = ids.filter(id => lineRec(store, id).state !== 'grey').length;
  const golds = ids.filter(id => lineRec(store, id).state === 'gold').length;

  // round intro: fit the route (holdfast to target bulb) into the part of the screen the intro card leaves free
  useEffect(() => {
    if (!route) return;
    const el = svgRef.current;
    const r = el?.getBoundingClientRect();
    if (!r || !r.width) return;
    const rn = nodes.filter(n => onRoute.has(n.id));
    const xs = rn.map(n => n.x), ys = rn.map(n => n.y - n.dims.len);
    const pad = 70;
    const cxr = (Math.min(...xs) + Math.max(...xs)) / 2;
    const wideScreen = r.width >= 760;
    const half = Math.max(wideScreen ? 450 : 220, (Math.max(...xs) - Math.min(...xs)) / 2 + pad * 2.5); // short routes keep some forest around them
    const bx0 = cxr - half, bx1 = cxr + half;
    const by0 = Math.min(...ys) - pad * 2.5, by1 = ground + 30;
    const left = 0, right = wideScreen ? r.width - 440 : r.width;
    const top = 60, bottom = wideScreen ? r.height - 20 : r.height * 0.5;
    const s = Math.max((bx1 - bx0) / (right - left), (by1 - by0) / (bottom - top));
    const w = r.width * s, h = r.height * s;
    // seabed at the bottom of the free area: any spare height shows more forest above, not sand below
    const v: [number, number, number, number] = [(bx0 + bx1) / 2 - ((left + right) / 2) * s, by1 - bottom * s, w, h];
    const t = setTimeout(() => glideTo(v), 30);
    return () => clearTimeout(t);
  }, [route]); // eslint-disable-line react-hooks/exhaustive-deps

  // after a round: pan to the lines that changed
  useEffect(() => {
    if (!changed.length) return;
    const ch = nodes.filter(n => changed.includes(n.id));
    const xs = ch.map(n => n.x), ys = ch.map(n => n.y);
    const w = Math.min(box[2], Math.max(1000, Math.max(...xs) - Math.min(...xs) + 400));
    const r = svgRef.current?.getBoundingClientRect();
    const h = r && r.width ? w * (r.height / r.width) : w;
    const cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2;
    const t = setTimeout(() => setVb([cx - w / 2, cy - h / 2, w, h]), 600);
    return () => clearTimeout(t);
  }, [changed, nodes, box]);

  const scale = () => {
    const r = svgRef.current!.getBoundingClientRect();
    return Math.max(vb[2] / r.width, vb[3] / r.height);
  };
  const onDown = (e: React.PointerEvent) => {
    cancelAnimationFrame(raf.current); // a touch takes over from any camera glide
    downOn.current = (e.target as Element).closest?.('[data-id]')?.getAttribute('data-id') ?? null;
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved.current = 0;
  };
  const onMove = (e: React.PointerEvent) => {
    const p = ptrs.current.get(e.pointerId);
    if (!p) return;
    const s = scale();
    if (ptrs.current.size === 1) {
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      moved.current += Math.abs(dx) + Math.abs(dy);
      setVb(v => [v[0] - dx * s, v[1] - dy * s, v[2], v[3]]);
    } else if (ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()];
      const other = a === p ? b : a;
      const d0 = Math.hypot(p.x - other.x, p.y - other.y);
      const d1 = Math.hypot(e.clientX - other.x, e.clientY - other.y);
      if (d0 > 0) zoom(d0 / d1, (p.x + other.x) / 2, (p.y + other.y) / 2);
      moved.current += 10;
    }
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  };
  const onUp = (e: React.PointerEvent) => {
    const wasTap = ptrs.current.size === 1 && moved.current < 8;
    ptrs.current.delete(e.pointerId);
    if (wasTap && downOn.current) setSel(downOn.current);
    downOn.current = null;
  };
  const zoom = (f: number, clientX: number, clientY: number) => {
    const r = svgRef.current!.getBoundingClientRect();
    setVb(v => {
      const nw = Math.min(box[2] * 1.5, Math.max(250, v[2] * f));
      const k = nw / v[2];
      const fx = (clientX - r.left) / r.width, fy = (clientY - r.top) / r.height;
      return [v[0] + v[2] * fx * (1 - k), v[1] + v[3] * fy * (1 - k), nw, v[3] * k];
    });
  };
  const onWheel = (e: React.WheelEvent) => zoom(e.deltaY > 0 ? 1.12 : 1 / 1.12, e.clientX, e.clientY);

  // labels keep a steady on-screen size; zoomed in, the less famous labels appear too
  const fs = Math.min(1, Math.max(0.4, vb[2] / fitW.current));
  const zoomedIn = fs < 0.6;

  const selLine = sel ? LINES[sel] : null;
  const selRec = sel ? lineRec(store, sel) : null;

  return (
    <div className="kelpwoud">
      <header className="kelp-top">
        <h1>{UI.title} <small>{UI.subtitle}</small></h1>
        <div className="counter">{UI.counter(greens, golds, ids.length)}</div>
      </header>
      <svg ref={svgRef} className={`forest ${route ? 'routing' : ''}`} viewBox={vb.join(' ')} preserveAspectRatio="xMidYMax meet"
           onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={e => { ptrs.current.delete(e.pointerId); }} onPointerLeave={e => { ptrs.current.delete(e.pointerId); }} onWheel={onWheel}>
        <defs>
          {/* 1. the glow: bright aqua under the surface, turquoise, deep teal at the seabed */}
          <linearGradient id="water" gradientUnits="userSpaceOnUse" x1="0" y1={box[1] - 200} x2="0" y2={ground + 60}>
            <stop offset="0" stopColor="#8af0e2" />
            <stop offset="0.12" stopColor="#2fd0cc" />
            <stop offset="0.38" stopColor="#0fa5ad" />
            <stop offset="0.68" stopColor="#0a7584" />
            <stop offset="1" stopColor="#06495a" />
          </linearGradient>
          <radialGradient id="glow" gradientUnits="userSpaceOnUse" cx={box[0] + box[2] * 0.55} cy={box[1] + 40} r={box[2] * 0.6}>
            <stop offset="0" stopColor="#fff6dc" stopOpacity=".55" />
            <stop offset="0.35" stopColor="#c9fff0" stopOpacity=".22" />
            <stop offset="1" stopColor="#c9fff0" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="surface" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f3fff8" />
            <stop offset="0.7" stopColor="#bff5ea" />
            <stop offset="1" stopColor="#8fe6dc" />
          </linearGradient>
          <linearGradient id="ray" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff4d6" stopOpacity=".26" />
            <stop offset="0.4" stopColor="#bdfbf0" stopOpacity=".09" />
            <stop offset="1" stopColor="#bdfbf0" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="sand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f0dcaa" />
            <stop offset="0.35" stopColor="#d2b57c" />
            <stop offset="1" stopColor="#7d7a58" />
          </linearGradient>
          <radialGradient id="bulbShade" cx="0.35" cy="0.3" r="0.85">
            <stop offset="0" stopColor="#fff8e1" stopOpacity=".55" />
            <stop offset="0.5" stopColor="#fff8e1" stopOpacity="0" />
            <stop offset="1" stopColor="#063a40" stopOpacity=".3" />
          </radialGradient>
          <pattern id="wash" patternUnits="userSpaceOnUse" width="420" height="420">
            <image href={washImg} width="420" height="420" />
          </pattern>
          {nodes.filter(n => changed.includes(n.id)).map(n => (
            <clipPath key={n.id} id={`clip-${n.id}`}><path d={scene.shapes.get(n.id)!.stipe.outline} /></clipPath>
          ))}
        </defs>
        <rect x={box[0] - 2000} y={box[1] - 400} width={box[2] + 4000} height={box[3] + 800} fill="url(#water)" />
        <rect x={box[0] - 2000} y={box[1] - 400} width={box[2] + 4000} height={box[3] + 800} fill="url(#glow)" />
        {/* dappled sunbeams, slowly breathing */}
        {[0.08, 0.27, 0.45, 0.63, 0.84].map((fx, i) => {
          const x = box[0] + box[2] * fx, top = box[1] + 44, w = 70 + (i % 3) * 40;
          return (
            <g key={i} className="ray" style={{ animationDelay: `${-i * 2.7}s` }}>
              <polygon fill="url(#ray)" points={`${x},${top} ${x + w},${top} ${x + w * 0.6 + 260},${ground} ${x - 120},${ground}`} />
              <polygon fill="url(#ray)" opacity=".8" points={`${x + w * 0.2},${top} ${x + w * 0.8},${top} ${x + w * 0.55 + 210},${ground} ${x - 60},${ground}`} />
              <polygon fill="url(#ray)" opacity=".8" points={`${x + w * 0.38},${top} ${x + w * 0.62},${top} ${x + w * 0.5 + 150},${ground} ${x + 10},${ground}`} />
            </g>
          );
        })}
        {/* misty kelp far behind */}
        {scene.distant.map((k, i) => <path key={i} d={k.d} className={`distant d${k.depth}`} />)}
        {scene.specks.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={p.r} opacity={p.o} className={`speck ${p.cream ? 'cream' : ''} ${p.drift ? 'drift' : ''}`}
            style={p.drift ? { animationDelay: `${p.delay}s` } : undefined} />
        ))}

        <Visitors box={box} {...visitors} kinds={['shark', 'dolphin']} />

        {/* the surface seen from below, with the Vixen on it */}
        <path d={`M ${box[0] - 2000} ${box[1] - 400} L ${box[0] + box[2] + 2000} ${box[1] - 400} L ${box[0] + box[2] + 2000} ${box[1] + 46} ${Array.from({ length: 40 }, (_, i) => `Q ${box[0] + box[2] + 2000 - (i + 0.5) * (box[2] + 4000) / 40} ${box[1] + (i % 2 ? 54 : 38)} ${box[0] + box[2] + 2000 - (i + 1) * (box[2] + 4000) / 40} ${box[1] + 46}`).join(' ')} Z`} fill="url(#surface)" opacity=".8" />
        <path d={`M ${box[0] - 2000} ${box[1] + 46} ${Array.from({ length: 40 }, (_, i) => `Q ${box[0] - 2000 + (i + 0.5) * (box[2] + 4000) / 40} ${box[1] + (i % 2 ? 38 : 54)} ${box[0] - 2000 + (i + 1) * (box[2] + 4000) / 40} ${box[1] + 46}`).join(' ')}`} className="surface-line" />
        {/* interim art cut from art/Ideas.jpg (green starboard light visible on her bow) */}
        <g transform={`translate(${box[0] + box[2] * 0.62}, ${box[1] + 30})`} className="vixen">
          <image href={vixenImg} x={-VIXEN_W / 2} y={18 - VIXEN_H} width={VIXEN_W} height={VIXEN_H} />
        </g>

        <path d={scene.bed.d} fill="url(#sand)" className="sand" />
        {scene.bed.ripples.map((d, i) => <path key={i} d={d} className="ripple" />)}
        {scene.bed.pebbles.map(({ tone, ...p }, i) => <ellipse key={i} {...p} fill={tone < 0.5 ? '#3f6e66' : tone < 0.8 ? '#a08a5c' : '#fff1cf'} opacity=".75" />)}
        <Crabs box={box} ground={ground} />
        <Visitors box={box} {...visitors} kinds={['eel']} />
        <SmallFish box={box} ground={ground} />
        {scene.bubbles.map((b, i) => (
          <g key={i} className="rise" style={{ animationDuration: `${b.dur}s`, animationDelay: `${b.delay}s` }}>
            <circle cx={b.x} cy={b.y} r={b.r} className="bub" />
            <circle cx={b.x - b.r * 0.35} cy={b.y - b.r * 0.35} r={b.r * 0.28} className="bub-hl" />
          </g>
        ))}

        {/* layer 1: fronds (behind), swaying from their crowns */}
        {nodes.map(n => {
          const st = lineRec(store, n.id).state, sh = scene.shapes.get(n.id)!, [cx, cy] = sh.bulb.crown;
          return (
            <g key={n.id + 'f'} className={`fronds s-${st} ${changed.includes(n.id) ? 'changed' : ''} ${onRoute.has(n.id) ? 'on-route' : ''}`}
               style={{ transformOrigin: `${cx}px ${cy}px`, animationDelay: `${(n.x % 9) * -0.8}s` }}>
              {sh.fronds.map((b, i) => {
                const hues = st === 'gold' ? GOLD_HUES : ALIVE_HUES, h = hues[(hueIndex(n.id) + i) % hues.length];
                return <g key={i}><path d={b.outline} className="blade" style={st !== 'grey' ? { fill: h } : undefined} /><path d={b.rib} className="rib" /></g>;
              })}
            </g>
          );
        })}

        {/* layer 2: holdfast and stipes */}
        <g className={`holdfast s-${lineRec(store, ROOT_LINE).state} ${route ? 'on-route' : ''}`}>
          {scene.roots.map((d, i) => <path key={'i' + i} d={d} className="root-ink" />)}
          {scene.roots.map((d, i) => <path key={i} d={d} />)}
          <ellipse cx={nodes[0].x} cy={ground - 12} rx={15} ry={11} />
        </g>
        {nodes.map(n => {
          const st = lineRec(store, n.id).state, sh = scene.shapes.get(n.id)!.stipe, ch = changed.includes(n.id);
          return (
            <g key={n.id} className={`kelp s-${ch ? 'grey' : st} ${n.line.famous ? 'famous' : ''} ${n.line.reef ? 'reef' : ''} ${onRoute.has(n.id) ? 'on-route' : ''}`}>
              <path d={sh.outline} className="stipe" />
              {ch && <path d={sh.centre} pathLength={1} className={`fill-in s-${st}`} strokeWidth={n.w0 + 4} clipPath={`url(#clip-${n.id})`} />}
              <path d={sh.highlight} className="stipe-hl" strokeWidth={Math.max(1, n.w1 * 0.3)} />
              {sh.barnacles.map(([bx, by], i) => <g key={i} className="barnacle"><circle cx={bx} cy={by} r={2.4} /><circle cx={bx} cy={by} r={0.8} className="barnacle-hole" /></g>)}
            </g>
          );
        })}

        <rect x={box[0] - 2000} y={box[1] - 400} width={box[2] + 4000} height={box[3] + 1300} fill="url(#wash)" className="wash" pointerEvents="none" />

        {/* layer 3: bulbs and labels */}
        {nodes.map(n => {
          const st = lineRec(store, n.id).state, b = scene.shapes.get(n.id)!.bulb, L = labels.get(n.id)!;
          const on = onRoute.has(n.id) || (L.placed && (n.line.famous || n.root || zoomedIn));
          return (
            <g key={n.id + 'b'} className={`bulb-g s-${st} ${n.line.famous ? 'famous' : ''} ${n.line.reef ? 'reef' : ''} ${changed.includes(n.id) ? 'changed' : ''} ${sel === n.id ? 'sel' : ''} ${on ? 'lbl-on' : ''} ${onRoute.has(n.id) ? 'on-route' : ''} ${route === n.id ? 'route-end' : ''}`}
               data-id={n.id}>
              <circle cx={n.x} cy={n.y - n.dims.len / 2} r={Math.max(18, n.dims.len * 0.6)} className="hit" />
              <path d={b.body} className="bulb" />
              <path d={b.body} fill="url(#bulbShade)" pointerEvents="none" />
              <path d={b.crownShape} className="crown" />
              <ellipse {...b.shine} className="shine" />
              {changed.includes(n.id) && [0, 1, 2].map(i => <circle key={i} cx={n.x + (i - 1) * 6} cy={b.crown[1]} r={3} className="bubble" style={{ animationDelay: `${2 + i * 0.3}s` }} />)}
              <text x={L.bx + L.ox * fs} y={L.by + L.oy * fs} textAnchor={L.anchor} fontSize={FONT * fs} strokeWidth={3 * fs} className="kelp-label">{n.line.label}</text>
            </g>
          );
        })}
      </svg>

      <RopeFrame />

      {!overlay && ([['left', BADGES_LEFT], ['right', BADGES_RIGHT]] as [string, BadgeDef[]][]).map(([side, list]) => {
        const earned = list.filter(b => lineRec(store, b.id).state === 'gold');
        return earned.length > 0 && (
          <div key={side} className={`badges badges-${side}`}>
            {earned.map(b => <Badge key={b.id} name={b.name} fresh={changed.includes(b.id)} onClick={() => setSel(b.id)} />)}
          </div>
        );
      })}

      {selLine && selRec && !overlay && (
        <div className="card line-card" role="dialog">
          <button className="x" onClick={() => setSel(null)} aria-label={UI.close}>×</button>
          <h2>{selLine.label}</h2>
          <div className="sub mono">{selLine.sub}</div>
          <div className="lichess">{selLine.name}</div>
          <div className={`chip chip-${selRec.state}`}>{UI.states[selRec.state]}</div>
          <div className="stats">{UI.stats(selRec.played, selRec.green, selRec.gold)}</div>
          {selLine.reef && <div className="reef-note">{UI.reefNote}</div>}
          {selRec.state !== 'grey' && (
            <div className="line-moves mono">{selLine.movesNumbered.slice(6).join(' ')}</div>
          )}
          {selRec.lastMissed && <div className="last-missed">{UI.lastMissed(selRec.lastMissed.move)}</div>}
        </div>
      )}

      {overlay ?? (
        <footer className="kelp-bottom">
          <label className="lights"><input type="checkbox" checked={store.settings.bishopLights} onChange={onToggleLights} /> {UI.lights}</label>
          <button className="btn primary" onClick={onBegin}>{UI.begin}</button>
          <button className="btn ghost" onClick={fitView} aria-label="Pas">⤢</button>
        </footer>
      )}
    </div>
  );
}

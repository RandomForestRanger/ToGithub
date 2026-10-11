import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { stratify, tree } from 'd3-hierarchy';
import { canon, LINES, ROOT_LINE, type Line } from '../data';
import { UI } from '../content/kaptein';
import { lineRec, type Store } from '../game/storage';

import { bulb, bulbDims, fronds, holdfast, seabed, snow, stipe, type BulbDims } from './kelpShapes';

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

export function Kelpwoud({ store, changed, onBegin, onToggleLights }: {
  store: Store; changed: string[]; onBegin: () => void; onToggleLights: () => void;
}) {
  const { nodes, box, ground } = useMemo(layout, []);
  const labels = useMemo(() => placeLabels(nodes), [nodes]);
  const scene = useMemo(() => ({
    bed: seabed(box[0] - 2000, box[0] + box[2] + 2000, ground),
    roots: holdfast(nodes[0].x, ground),
    snow: snow(box),
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
    const [bx, by, bw, bh] = box;
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
      <svg ref={svgRef} className="forest" viewBox={vb.join(' ')} preserveAspectRatio="xMidYMax meet"
           onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={e => { ptrs.current.delete(e.pointerId); }} onPointerLeave={e => { ptrs.current.delete(e.pointerId); }} onWheel={onWheel}>
        <defs>
          <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3f86b0" />
            <stop offset="0.45" stopColor="#17506f" />
            <stop offset="1" stopColor="#0a1f33" />
          </linearGradient>
          <linearGradient id="surface" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#bfe3f2" />
            <stop offset="1" stopColor="#5fa6cc" />
          </linearGradient>
          <linearGradient id="sand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#c8ad7c" />
            <stop offset="0.5" stopColor="#a68b5e" />
            <stop offset="1" stopColor="#6e5a3c" />
          </linearGradient>
          <linearGradient id="shaftG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity=".13" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="bulbShade" cx="0.35" cy="0.3" r="0.85">
            <stop offset="0" stopColor="#fff" stopOpacity=".28" />
            <stop offset="0.6" stopColor="#fff" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity=".28" />
          </radialGradient>
          {nodes.filter(n => changed.includes(n.id)).map(n => (
            <clipPath key={n.id} id={`clip-${n.id}`}><path d={scene.shapes.get(n.id)!.stipe.outline} /></clipPath>
          ))}
        </defs>
        <rect x={box[0] - 2000} y={box[1] - 400} width={box[2] + 4000} height={box[3] + 800} fill="url(#water)" />
        {[0.12, 0.34, 0.58, 0.8].map((fx, i) => (
          <polygon key={i} className="shaft" fill="url(#shaftG)" points={`${box[0] + box[2] * fx},${box[1] + 40} ${box[0] + box[2] * fx + 90},${box[1] + 40} ${box[0] + box[2] * (fx + 0.1)},${ground} ${box[0] + box[2] * (fx - 0.05)},${ground}`} />
        ))}
        {scene.snow.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={p.r} fill="#dff" opacity={p.o} />)}

        {/* the surface seen from below, with the Vixen on it: red light to port (left), green to starboard (right) */}
        <path d={`M ${box[0] - 2000} ${box[1] - 400} L ${box[0] + box[2] + 2000} ${box[1] - 400} L ${box[0] + box[2] + 2000} ${box[1] + 46} ${Array.from({ length: 40 }, (_, i) => `Q ${box[0] + box[2] + 2000 - (i + 0.5) * (box[2] + 4000) / 40} ${box[1] + (i % 2 ? 54 : 38)} ${box[0] + box[2] + 2000 - (i + 1) * (box[2] + 4000) / 40} ${box[1] + 46}`).join(' ')} Z`} fill="url(#surface)" opacity=".55" />
        <g transform={`translate(${box[0] + box[2] * 0.62}, ${box[1] + 30})`} className="vixen">
          <path d="M -70 0 L 70 0 L 55 18 L -55 18 Z" fill="#1d2b36" />
          <rect x={-18} y={-26} width={10} height={26} fill="#1d2b36" />
          <circle cx={10} cy={6} r={16} fill="none" stroke="#1d2b36" strokeWidth={4} />
          <circle cx={-62} cy={4} r={4} fill="#e74c3c" className="navlight" />
          <circle cx={62} cy={4} r={4} fill="#2ecc71" className="navlight" />
        </g>

        <path d={scene.bed.d} fill="url(#sand)" />
        {scene.bed.ripples.map((d, i) => <path key={i} d={d} className="ripple" />)}
        {scene.bed.pebbles.map(({ tone, ...p }, i) => <ellipse key={i} {...p} fill={tone < 0.5 ? '#5b4d3a' : tone < 0.8 ? '#8a7a62' : '#d9cdb4'} opacity=".7" />)}

        {/* layer 1: fronds (behind), swaying from their crowns */}
        {nodes.map(n => {
          const st = lineRec(store, n.id).state, sh = scene.shapes.get(n.id)!, [cx, cy] = sh.bulb.crown;
          return (
            <g key={n.id + 'f'} className={`fronds s-${st} ${changed.includes(n.id) ? 'changed' : ''}`}
               style={{ transformOrigin: `${cx}px ${cy}px`, animationDelay: `${(n.x % 9) * -0.8}s` }}>
              {sh.fronds.map((b, i) => <g key={i}><path d={b.outline} className="blade" /><path d={b.rib} className="rib" /></g>)}
            </g>
          );
        })}

        {/* layer 2: holdfast and stipes */}
        <g className={`holdfast s-${lineRec(store, ROOT_LINE).state}`}>
          {scene.roots.map((d, i) => <path key={i} d={d} />)}
          <ellipse cx={nodes[0].x} cy={ground - 12} rx={15} ry={11} />
        </g>
        {nodes.map(n => {
          const st = lineRec(store, n.id).state, sh = scene.shapes.get(n.id)!.stipe, ch = changed.includes(n.id);
          return (
            <g key={n.id} className={`kelp s-${ch ? 'grey' : st} ${n.line.famous ? 'famous' : ''} ${n.line.reef ? 'reef' : ''}`}>
              <path d={sh.outline} className="stipe" />
              {ch && <path d={sh.centre} pathLength={1} className={`fill-in s-${st}`} strokeWidth={n.w0 + 4} clipPath={`url(#clip-${n.id})`} />}
              <path d={sh.highlight} className="stipe-hl" strokeWidth={Math.max(1, n.w1 * 0.3)} />
              {sh.barnacles.map(([bx, by], i) => <g key={i} className="barnacle"><circle cx={bx} cy={by} r={2.4} /><circle cx={bx} cy={by} r={0.8} className="barnacle-hole" /></g>)}
            </g>
          );
        })}

        {/* layer 3: bulbs and labels */}
        {nodes.map(n => {
          const st = lineRec(store, n.id).state, b = scene.shapes.get(n.id)!.bulb, L = labels.get(n.id)!;
          const on = L.placed && (n.line.famous || n.root || zoomedIn);
          return (
            <g key={n.id + 'b'} className={`bulb-g s-${st} ${n.line.famous ? 'famous' : ''} ${n.line.reef ? 'reef' : ''} ${changed.includes(n.id) ? 'changed' : ''} ${sel === n.id ? 'sel' : ''} ${on ? 'lbl-on' : ''}`}
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

      {selLine && selRec && (
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

      <footer className="kelp-bottom">
        <label className="lights"><input type="checkbox" checked={store.settings.bishopLights} onChange={onToggleLights} /> {UI.lights}</label>
        <button className="btn primary" onClick={onBegin}>{UI.begin}</button>
        <button className="btn ghost" onClick={fitView} aria-label="Pas">⤢</button>
      </footer>
    </div>
  );
}

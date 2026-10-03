import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { stratify, tree } from 'd3-hierarchy';
import { canon, LINES, ROOT_LINE, type Line } from '../data';
import { UI } from '../content/kaptein';
import { lineRec, type Store } from '../game/storage';

const PLY_PX = 26, MIN_STIPE = 40, DX = 52;

interface Placed { id: string; x: number; y: number; px: number; py: number; leaf: boolean; line: Line }

function layout(): { nodes: Placed[]; box: [number, number, number, number] } {
  const root = stratify<Line>().id(l => l.id).parentId(l => l.parent)(canon.lines);
  root.sort((a, b) => (b.data.games - a.data.games));
  tree<Line>().nodeSize([DX, 1])(root);
  const nodes: Placed[] = [];
  const ground = 0;
  root.each(n => {
    const len = Math.max(MIN_STIPE, n.data.frondPlies * PLY_PX);
    const parentY = n.parent ? (n.parent as any).cy : ground;
    const parentX = n.parent ? n.parent.x! : n.x!;
    (n as any).cy = parentY - len;
    nodes.push({ id: n.data.id, x: n.x!, y: (n as any).cy, px: parentX, py: parentY, leaf: !n.children, line: n.data });
  });
  const xs = nodes.map(n => n.x), ys = nodes.map(n => n.y);
  const minX = Math.min(...xs) - 120, maxX = Math.max(...xs) + 120;
  const minY = Math.min(...ys) - 140, maxY = 60;
  return { nodes, box: [minX, minY, maxX - minX, maxY - minY] };
}

const stipe = (n: Placed) => {
  const mid = n.py - (n.py - n.y) * 0.55;
  return `M ${n.px} ${n.py} C ${n.px} ${mid}, ${n.x} ${mid + 10}, ${n.x} ${n.y}`;
};

const fronds = (n: Placed) => [-1, -0.4, 0.3, 1].map((s, i) => {
  const L = 70 + i * 12;
  return `M ${n.x} ${n.y} q ${s * 20} ${-L * 0.5} ${s * 34 + 6} ${-L}`;
});

export function Kelpwoud({ store, changed, onBegin, onToggleLights }: {
  store: Store; changed: string[]; onBegin: () => void; onToggleLights: () => void;
}) {
  const { nodes, box } = useMemo(layout, []);
  const [vb, setVb] = useState<[number, number, number, number]>(box);
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
    if (a < 1) {
      const w = bh * a;
      const rootX = nodes[0].x;
      setVb([Math.max(bx, Math.min(bx + bw - w, rootX - w / 2)), by, w, bh]);
    } else if (bw / bh > a) {
      const h = bw / a;
      setVb([bx, by + bh - h, bw, h]);
    } else {
      const w = bh * a;
      setVb([bx + (bw - w) / 2, by, w, bh]);
    }
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

  const labelLift = useMemo(() => {
    const m = new Map<string, number>();
    const fam = nodes.filter(n => n.line.famous).sort((a, b) => a.x - b.x);
    fam.forEach((n, i) => {
      const prev = fam[i - 1];
      if (prev && Math.abs(prev.y - n.y) < 20 && n.x - prev.x < 140 && !m.get(prev.id)) m.set(n.id, 16);
    });
    return m;
  }, [nodes]);

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
            <stop offset="0" stopColor="#3a7ca5" />
            <stop offset="0.5" stopColor="#16486b" />
            <stop offset="1" stopColor="#0b2236" />
          </linearGradient>
          <radialGradient id="bulbG" cx="0.35" cy="0.35" r="0.7">
            <stop offset="0" stopColor="#fff" stopOpacity=".5" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <filter id="rough"><feTurbulence baseFrequency="0.9" numOctaves="1" result="t" /><feDisplacementMap in="SourceGraphic" in2="t" scale="3" /></filter>
        </defs>
        <rect x={box[0] - 2000} y={box[1] - 400} width={box[2] + 4000} height={box[3] + 800} fill="url(#water)" />
        {[0.2, 0.45, 0.7].map((f, i) => (
          <polygon key={i} className="shaft" points={`${box[0] + box[2] * f},${box[1] - 300} ${box[0] + box[2] * f + 120},${box[1] - 300} ${box[0] + box[2] * (f + 0.12)},${60} ${box[0] + box[2] * (f - 0.06)},${60}`} />
        ))}
        {/* Vixen at the surface: red light to port (left), green to starboard (right) */}
        <g transform={`translate(${box[0] + box[2] * 0.62}, ${box[1] + 30})`} className="vixen">
          <path d="M -70 0 L 70 0 L 55 18 L -55 18 Z" fill="#1d2b36" />
          <rect x={-18} y={-26} width={10} height={26} fill="#1d2b36" />
          <circle cx={10} cy={6} r={16} fill="none" stroke="#1d2b36" strokeWidth={4} />
          <circle cx={-62} cy={4} r={4} fill="#e74c3c" className="navlight" />
          <circle cx={62} cy={4} r={4} fill="#2ecc71" className="navlight" />
        </g>
        <path d={`M ${box[0] - 2000} 30 Q ${box[0] + box[2] / 2} 0 ${box[0] + box[2] + 2000} 30 L ${box[0] + box[2] + 2000} 600 L ${box[0] - 2000} 600 Z`} fill="#c2a878" opacity=".85" />

        {nodes.map(n => {
          const st = lineRec(store, n.id).state;
          return (
            <g key={n.id} className={`kelp s-${st} ${n.line.famous ? 'famous' : ''} ${n.line.reef ? 'reef' : ''} ${changed.includes(n.id) ? 'changed' : ''}`}
               style={{ animationDelay: `${(n.x % 7) * -0.6}s` }}>
              <path d={stipe(n)} className="stipe" filter={n.line.reef ? 'url(#rough)' : undefined} />
              {n.leaf && fronds(n).map((d, i) => <path key={i} d={d} className="frond" />)}
            </g>
          );
        })}
        {nodes.map(n => {
          const st = lineRec(store, n.id).state;
          const r = n.id === ROOT_LINE ? 14 : n.line.famous ? 11 : 9;
          return (
            <g key={n.id + 'b'} className={`bulb-g s-${st} ${n.line.famous ? 'famous' : ''} ${n.line.reef ? 'reef' : ''} ${changed.includes(n.id) ? 'changed' : ''} ${sel === n.id ? 'sel' : ''}`}
               data-id={n.id}>
              <circle cx={n.x} cy={n.y} r={r} className="bulb" />
              <circle cx={n.x} cy={n.y} r={r} fill="url(#bulbG)" pointerEvents="none" />
              {changed.includes(n.id) && [0, 1, 2].map(i => <circle key={i} cx={n.x + (i - 1) * 6} cy={n.y} r={3} className="bubble" style={{ animationDelay: `${0.8 + i * 0.3}s` }} />)}
              <text x={n.x} y={n.y - r - 6 - (labelLift.get(n.id) ?? 0)} className="kelp-label">{n.line.label}</text>
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

// The thick, wavy rope that frames the Kelpwoud (thicker than the thin rope on panels, and never quite
// straight, like the rope along the bottom of art/First Ideas.png). Each edge is a gentle wave; twisted
// strands are laid along it at regular steps, turned to follow the rope. Knots hide the corners.
import { useLayoutEffect, useRef, useState } from 'react';
import { rng } from './kelpShapes';

const T = 15;       // rope thickness, px
const STEP = 8.5;   // one strand every STEP px along the rope
const INSET = 11;   // rope centreline distance from the screen edge

type Pt = [number, number];

/** A gently wavy line from a to b: two overlaid sines with seeded phases, fading to straight at the ends. */
function wavy(a: Pt, b: Pt, seed: string): Pt[] {
  const r = rng(seed), len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const nx = -(b[1] - a[1]) / len, ny = (b[0] - a[0]) / len;
  const p1 = r() * 6.28, p2 = r() * 6.28, w1 = 150 + r() * 80, w2 = 60 + r() * 30;
  const pts: Pt[] = [];
  const n = Math.max(8, Math.ceil(len / 4));
  for (let i = 0; i <= n; i++) {
    const t = i / n, s = t * len;
    const fade = Math.min(1, t * 6, (1 - t) * 6);
    const off = fade * (3.4 * Math.sin(s / w1 * 6.28 + p1) + 1.4 * Math.sin(s / w2 * 6.28 + p2));
    pts.push([a[0] + (b[0] - a[0]) * t + nx * off, a[1] + (b[1] - a[1]) * t + ny * off]);
  }
  return pts;
}

/** Strand positions every STEP px along a polyline, with the local direction. */
function strandsAlong(pts: Pt[]) {
  const out: { x: number; y: number; a: number }[] = [];
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const seg = Math.hypot(x1 - x0, y1 - y0), ang = Math.atan2(y1 - y0, x1 - x0) * 180 / Math.PI;
    let d = STEP - carry;
    while (d <= seg) { const t = d / seg; out.push({ x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t, a: ang }); d += STEP; }
    carry = seg - (d - STEP);
  }
  return out;
}

const path = (pts: Pt[]) => 'M' + pts.map(p => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('L');

// one strand in local coordinates: running along +x, the rope's width along y (-T/2..T/2)
const STRAND = `M${-STEP * 0.55} ${-T / 2 + 1.6} C${-STEP * 0.15} ${-T / 2 + 3} ${STEP * 0.25} ${T / 2 - 5} ${STEP * 0.55} ${T / 2 - 1.6}`;
const LIGHT = `M${-STEP * 0.6} ${-T / 2 + 3.3} C${-STEP * 0.25} ${-T / 2 + 4.6} ${STEP * 0.05} ${T / 2 - 6.5} ${STEP * 0.28} ${T / 2 - 3.6}`;

function Knot({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r="14" className="rs-ink-fill" />
      <circle r="11.5" className="rs-hemp-fill" />
      {[0, 60, 120, 180, 240, 300].map(a => <path key={a} d="M0 -10 C6 -8 8 -3 6 2" transform={`rotate(${a})`} className="rk-strand" />)}
      <circle r="3.6" className="rs-ink-fill" />
      <circle r="2" cx="-.6" cy="-.6" className="rk-glint" />
    </g>
  );
}

export function RopeFrame() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<[number, number]>([0, 0]);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize([el.clientWidth, el.clientHeight]));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const [w, h] = size;
  const c: Pt[] = [[INSET, INSET], [w - INSET, INSET], [w - INSET, h - INSET], [INSET, h - INSET]];
  const edges = w > 0 ? [wavy(c[0], c[1], 'top'), wavy(c[1], c[2], 'right'), wavy(c[2], c[3], 'bottom'), wavy(c[3], c[0], 'left')] : [];
  return (
    <div ref={ref} className="rope-frame" aria-hidden>
      {w > 0 && (
        <svg width={w} height={h}>
          {edges.map((pts, i) => (
            <g key={i} className="rope-edge">
              <path d={path(pts)} className="rope-ink" />
              <path d={path(pts)} className="rope-hemp" />
              {strandsAlong(pts).map((s, k) => (
                <g key={k} transform={`translate(${s.x.toFixed(1)} ${s.y.toFixed(1)}) rotate(${s.a.toFixed(1)})`}>
                  <path d={STRAND} className="rs-twist" />
                  <path d={LIGHT} className="rs-light" />
                </g>
              ))}
            </g>
          ))}
          {c.map(([x, y], i) => <Knot key={i} x={x} y={y} />)}
        </svg>
      )}
    </div>
  );
}

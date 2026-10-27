// Foreground decor at the sides of the Kelpwoud (after art/Kelp_prent.png): dense, darker kelp rising at
// the left and right edges, rocks, and an old anchor in the sand, over a side vignette that draws the eye to
// the forest in the middle. Screen-space (it does not pan or zoom) and never catches clicks.
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ribbon, rng } from './kelpShapes';

type Pt = [number, number];

/** Tall blades rising from the bottom corner of one side, leaning in, with a few side leaves. */
function sideKelp(w: number, h: number, side: 1 | -1) {
  const r = rng(side > 0 ? 'edgeR' : 'edgeL');
  const band = Math.min(150, w * 0.1);
  const blades: { d: string; leaves: string[]; tone: number; delay: number; ox: number; oy: number }[] = [];
  const n = w < 700 ? 3 : 5;
  for (let i = 0; i < n; i++) {
    const x0 = (side > 0 ? 0 : w) + side * (band * (0.05 + 0.85 * (i / (n - 1))) + (r() - 0.5) * 20);
    const height = h * (w < 700 ? 0.3 + r() * 0.25 : 0.4 + r() * 0.4) * (1 - 0.35 * (i / (n - 1)));
    const lean = side * (10 + r() * 30) * (0.4 + i / n);
    const wob = r() * 6, width = Math.max(12, band * 0.13) * (0.8 + r() * 0.4);
    const at = (t: number): Pt => [x0 + lean * t * t + Math.sin(t * 4 + wob) * 10, h + 10 - height * t];
    const leaves: string[] = [];
    for (let k = 0; k < 4; k++) {
      const t = 0.35 + k * 0.17 + r() * 0.05, p = at(t), s2 = k % 2 ? 1 : -1, len = (w < 700 ? 22 : 30) + r() * 24;
      const ang = -Math.PI / 2 + s2 * (0.7 + r() * 0.4);
      const C: Pt = [p[0] + Math.cos(ang) * len * 0.5, p[1] + Math.sin(ang) * len * 0.5];
      const T: Pt = [C[0] + Math.cos(ang - s2 * 0.6) * len * 0.5, C[1] + Math.sin(ang - s2 * 0.6) * len * 0.5];
      const q = (u: number): Pt => { const v = 1 - u; return [v * v * p[0] + 2 * v * u * C[0] + u * u * T[0], v * v * p[1] + 2 * v * u * C[1] + u * u * T[1]]; };
      leaves.push(ribbon(q, u => width * 0.9 * Math.sin(Math.PI * Math.pow(u, 0.6)) + 0.6, 14).outline);
    }
    blades.push({
      d: ribbon(at, t => width * (1 - 0.6 * t) * (1 + 0.15 * Math.sin(t * 18 + wob)) + 1.5, 26).outline,
      leaves, tone: i % 3, delay: -r() * 8, ox: x0, oy: h + 10,
    });
  }
  return blades;
}

function rocks(w: number, h: number) {
  const s = Math.min(1, w / 1100);
  return [
    { cx: 30 * s, cy: h - 10, rx: 90 * s, ry: 46 * s }, { cx: 120 * s, cy: h + 4, rx: 70 * s, ry: 34 * s },
    { cx: w - 40 * s, cy: h - 8, rx: 100 * s, ry: 52 * s }, { cx: w - 150 * s, cy: h + 6, rx: 60 * s, ry: 28 * s },
  ];
}

function Anchor({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(-28) scale(${s})`} className="edge-anchor">
      <circle cx="0" cy="-58" r="9" className="anc-ring" />
      <path d="M-4 -49 L4 -49 L4 22 L-4 22 Z" className="anc-metal" />
      <path d="M-20 -36 L20 -36 L20 -29 L-20 -29 Z" className="anc-metal" />
      <path d="M-32 6 C-30 24 -14 34 0 34 C14 34 30 24 32 6 L38 12 L33 -2 L22 4 L28 6 C24 20 12 26 0 26 C-12 26 -24 20 -28 6 L-22 4 L-33 -2 L-38 12 Z" className="anc-metal" />
      <path d="M-2 -46 L-2 18" className="anc-shine" />
    </g>
  );
}

export function EdgeDecor() {
  const ref = useRef<HTMLDivElement>(null);
  const [[w, h], setSize] = useState<[number, number]>([0, 0]);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize([el.clientWidth, el.clientHeight]));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const left = useMemo(() => (w ? sideKelp(w, h, 1) : []), [w, h]);
  const right = useMemo(() => (w ? sideKelp(w, h, -1) : []), [w, h]);
  return (
    <div ref={ref} className="edge-decor" aria-hidden>
      {w > 0 && (
        <svg width={w} height={h}>
          <defs>
            <linearGradient id="vigL" x1="0" x2="1"><stop offset="0" stopColor="#042a33" stopOpacity=".62" /><stop offset="1" stopColor="#042a33" stopOpacity="0" /></linearGradient>
            <linearGradient id="vigR" x1="1" x2="0"><stop offset="0" stopColor="#042a33" stopOpacity=".62" /><stop offset="1" stopColor="#042a33" stopOpacity="0" /></linearGradient>
          </defs>
          <rect width={w * 0.28} height={h} fill="url(#vigL)" />
          <rect x={w * 0.72} width={w * 0.28} height={h} fill="url(#vigR)" />
          {[...left, ...right].map((b, i) => (
            <g key={i} className={`edge-kelp tone${b.tone}`} style={{ transformOrigin: `${b.ox}px ${b.oy}px`, animationDelay: `${b.delay}s` }}>
              {b.leaves.map((d, k) => <path key={k} d={d} className="edge-leaf" />)}
              <path d={b.d} className="edge-stipe" />
            </g>
          ))}
          <Anchor x={Math.min(190, w * 0.16)} y={h - 40} s={Math.max(0.7, Math.min(1.5, w / 800))} />
          {rocks(w, h).map((r, i) => <ellipse key={i} {...r} className="edge-rock" />)}
        </svg>
      )}
    </div>
  );
}

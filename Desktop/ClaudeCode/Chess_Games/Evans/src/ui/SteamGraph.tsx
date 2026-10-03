import { GOLD_EVAL } from '../config';
import type { SteamPt } from '../game/controller';

/** Round-end steam over the whole game, with red (debt) and gold marks as step lines. */
export function SteamGraph({ pts }: { pts: SteamPt[] }) {
  if (pts.length < 2) return null;
  const W = 320, H = 140, P = 24;
  const x0 = pts[0].ply, x1 = Math.max(pts[pts.length - 1].ply, x0 + 1);
  const vals = pts.flatMap(p => [p.steam, p.debt + GOLD_EVAL, p.debt, 0]);
  const lo = Math.min(-1, ...vals), hi = Math.max(3, ...vals);
  const X = (p: number) => P + ((p - x0) / (x1 - x0)) * (W - 2 * P);
  const Y = (v: number) => H - P - ((v - lo) / (hi - lo)) * (H - 2 * P);
  const step = (f: (p: SteamPt) => number) =>
    pts.map((p, i) => (i === 0 ? `M ${X(p.ply)} ${Y(f(p))}` : `H ${X(p.ply)} V ${Y(f(p))}`)).join(' ');
  const line = pts.map((p, i) => `${i ? 'L' : 'M'} ${X(p.ply)} ${Y(p.steam)}`).join(' ');
  const moves = [];
  for (let m = Math.ceil((x0 + 1) / 2); m <= Math.floor((x1 + 1) / 2); m += 4) moves.push(m);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="steam-graph" role="img" aria-label="Stoomdruk-grafiek">
      <line x1={P} x2={W - P} y1={Y(0)} y2={Y(0)} stroke="rgba(255,255,255,.2)" />
      <path d={step(p => p.debt)} stroke="#e74c3c" fill="none" strokeWidth={2} strokeDasharray="4 3" />
      <path d={step(p => p.debt + GOLD_EVAL)} stroke="#ffd700" fill="none" strokeWidth={2} strokeDasharray="4 3" />
      <path d={line} stroke="#e8e8e8" fill="none" strokeWidth={2.5} />
      {moves.map(m => <text key={m} x={X(2 * m - 1)} y={H - 6} className="tick">{m}</text>)}
    </svg>
  );
}

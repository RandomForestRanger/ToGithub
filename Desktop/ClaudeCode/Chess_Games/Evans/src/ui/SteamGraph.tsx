import { GOLD_EVAL } from '../config';
import type { SteamPt } from '../game/controller';

/** Round-end pressure over the whole game, on the same fixed scale as the dial: red line at 0, gold line at GOLD_EVAL. */
export function SteamGraph({ pts }: { pts: SteamPt[] }) {
  if (pts.length < 2) return null;
  const W = 320, H = 140, P = 24;
  const ev = (p: SteamPt) => Math.max(-5, Math.min(5, p.steam - p.debt));
  const x0 = pts[0].ply, x1 = Math.max(pts[pts.length - 1].ply, x0 + 1);
  const vals = pts.map(ev);
  const lo = Math.min(-2, ...vals), hi = Math.max(2, ...vals);
  const X = (p: number) => P + ((p - x0) / (x1 - x0)) * (W - 2 * P);
  const Y = (v: number) => H - P - ((v - lo) / (hi - lo)) * (H - 2 * P);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'} ${X(p.ply)} ${Y(ev(p))}`).join(' ');
  const moves = [];
  for (let m = Math.ceil((x0 + 1) / 2); m <= Math.floor((x1 + 1) / 2); m += 4) moves.push(m);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="steam-graph" role="img" aria-label="Stoomdruk-grafiek">
      <line x1={P} x2={W - P} y1={Y(0)} y2={Y(0)} stroke="#e74c3c" strokeWidth={2} strokeDasharray="4 3" />
      <line x1={P} x2={W - P} y1={Y(GOLD_EVAL)} y2={Y(GOLD_EVAL)} stroke="#ffd700" strokeWidth={2} strokeDasharray="4 3" />
      <path d={line} stroke="#e8e8e8" fill="none" strokeWidth={2.5} />
      {moves.map(m => <text key={m} x={X(2 * m - 1)} y={H - 6} className="tick">{m}</text>)}
    </svg>
  );
}

import { GOLD_EVAL, PRESS_FULL, PRESS_ZONES } from '../config';
import { UI } from '../content/kaptein';
import type { PressPt, SteamPt } from '../game/controller';
import { numbered } from '../game/chessUtil';
import { pressZone } from '../game/pressure';

/**
 * Round-end graph: two small charts on one shared move axis (never one chart with two scales).
 * Top: the pressure of each of his moves (the needle), as bars; quiet moves are drawn dim.
 * Bottom: the score (White's eval) over the game, with fixed lines at 0 and at the gold mark.
 * Seen together, the story reads left to right: the bars fall first, the score follows.
 */
export function SteamGraph({ pts, press }: { pts: SteamPt[]; press: PressPt[] }) {
  if (pts.length < 2 && press.length < 2) return null;
  const withPress = press.length > 0; // a toernooi has no needle: the score chart alone
  const W = 340, P = 24, PR = 74, TOP_H = withPress ? 92 : 0, BOT_H = 100, GAP = 8; // PR: room on the right for the line labels
  // SteamPt.ply counts half-moves played; PressPt.ply is the 0-based index of his move, so +1 puts both on one axis
  const plies = [...pts.map(p => p.ply), ...press.map(p => p.ply + 1)];
  const x0 = Math.min(...plies), x1 = Math.max(Math.max(...plies), x0 + 1);
  const X = (ply: number) => P + ((ply - x0) / (x1 - x0)) * (W - P - PR);
  const barW = Math.max(3, Math.min(12, ((W - P - PR) / Math.max(1, (x1 - x0) / 2)) - 2));

  // top chart: pressure bars
  const tTop = 18, tBase = tTop + TOP_H - 16;
  const PY = (p: number) => tBase - (Math.min(p, PRESS_FULL) / PRESS_FULL) * (tBase - tTop);
  // bottom chart: eval line
  const bTop = tTop + TOP_H + GAP + 16, bBot = bTop + BOT_H - 30;
  const ev = (p: SteamPt) => Math.max(-3, Math.min(3, p.steam - p.debt));
  const vals = pts.map(ev);
  const lo = Math.min(-2, ...vals), hi = Math.max(2, ...vals);
  const EY = (v: number) => bBot - ((v - lo) / (hi - lo)) * (bBot - bTop);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'} ${X(p.ply)} ${EY(ev(p))}`).join(' ');
  const H = bBot + 22;

  const moves: number[] = [];
  for (let m = Math.ceil((x0 + 1) / 2); m <= Math.floor((x1 + 1) / 2); m += 4) moves.push(m);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="steam-graph" role="img"
      aria-label={`${UI.graphPress}; ${UI.graphEval}`}>
      {/* top: pressure */}
      {withPress && <>
      <text x={P} y={12} className="graph-title">{UI.graphPress}</text>
      <line x1={P} x2={W - PR} y1={tBase} y2={tBase} className="graph-axis" />
      {[PRESS_ZONES.green, PRESS_ZONES.gold].map(z => (
        <g key={z}>
          <line x1={P} x2={W - PR} y1={PY(z)} y2={PY(z)} className="graph-ref" />
          <text x={W - PR + 5} y={PY(z) + 4} className="graph-ref-label">{UI.zones[pressZone(z)]}</text>
        </g>
      ))}
      {press.map(p => {
        const quiet = p.press < PRESS_ZONES.amber;
        const y = Math.min(PY(p.press), tBase - 3);
        return (
          <rect key={p.ply} x={X(p.ply + 1) - barW / 2} y={y} width={barW} height={tBase - y} rx={2}
            className={`press-bar ${quiet ? 'quiet' : ''}`}>
            <title>{`${numbered(p.ply, p.san)}: ${UI.zones[pressZone(p.press)]}`}</title>
          </rect>
        );
      })}
      </>}
      {/* bottom: score */}
      <text x={P} y={bTop - 6} className="graph-title">{UI.graphEval}</text>
      <line x1={P} x2={W - PR} y1={EY(0)} y2={EY(0)} stroke="#e74c3c" strokeWidth={2} strokeDasharray="4 3" />
      <line x1={P} x2={W - PR} y1={EY(GOLD_EVAL)} y2={EY(GOLD_EVAL)} stroke="#ffd700" strokeWidth={2} strokeDasharray="4 3" />
      <text x={W - PR + 5} y={EY(GOLD_EVAL) + 4} className="graph-ref-label">{UI.states.gold}</text>
      {pts.length > 1 && <path d={line} stroke="#e8e8e8" fill="none" strokeWidth={2} />}
      {moves.map(m => <text key={m} x={X(2 * m - 1)} y={H - 6} className="tick">{m}</text>)}
    </svg>
  );
}

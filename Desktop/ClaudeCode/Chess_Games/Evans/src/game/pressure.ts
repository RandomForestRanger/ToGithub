// Stoomdruk = pressure (CLAUDE.md section 9): how big a question did his last move ask?
// It is what Black would lose by skipping his move (a null move), in pawns from White's side.
// Pure helpers only; the controller does the searching.
import { PRESS_FULL, PRESS_ZONES, BLACK_WINDOW_CP } from '../config';

export type Zone = 'gold' | 'green' | 'amber' | 'cold';

/** The same position with White to move again: what if Black slept through his turn? */
export function nullFen(fen: string): string {
  const f = fen.split(' ');
  f[1] = f[1] === 'w' ? 'b' : 'w';
  f[3] = '-';
  return f.join(' ');
}

/** Pressure in pawns from the two evals (centipawns, White's view), mates clamped so they stay finite. */
export function pressureOf(evalNow: number, evalIfBlackPasses: number): number {
  const c = (x: number) => Math.max(-1500, Math.min(1500, x));
  return Math.max(0, c(evalIfBlackPasses) - c(evalNow)) / 100;
}

/** Fixed zones on the pressure; the dial's painted bands never move. */
export function pressZone(p: number): Zone {
  if (p >= PRESS_ZONES.gold) return 'gold';
  if (p >= PRESS_ZONES.green) return 'green';
  if (p >= PRESS_ZONES.amber) return 'amber';
  return 'cold';
}

/**
 * Pressure -> position on the painted scale (-2 .. 2, "LAE DRUK" to "HOË DRUK").
 * The zone thresholds sit exactly on the painted ticks: amber at -1, green at =, gold at 1, PRESS_FULL at 2.
 * Zero pressure rests just past the left tick.
 */
export function pressToDial(p: number): number {
  const pts: [number, number][] = [
    [0, -2.3], [PRESS_ZONES.amber, -1], [PRESS_ZONES.green, 0], [PRESS_ZONES.gold, 1], [PRESS_FULL, 2], [PRESS_FULL * 2, 2.3],
  ];
  if (p <= 0) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    const [p0, v0] = pts[i - 1], [p1, v1] = pts[i];
    if (p <= p1) return v0 + ((p - p0) / (p1 - p0)) * (v1 - v0);
  }
  return 2.3;
}

// ---------- pressure-sensitive Black (CLAUDE.md section 5) ----------

/** One engine candidate, score from Black's side (centipawns, mates as +-MATE_CP). */
export interface Candidate { uci: string; cp: number }

export interface BlackChoice { uci: string; crack: boolean }

/**
 * Black's move in open sea. Normally: any candidate within BLACK_WINDOW_CP of the best, uniformly.
 * But when his last move asked a real question (pressure >= minPress, or a check) and Black has
 * exactly one safe move, Black misses it with probability crackP and plays the best of the unsafe
 * candidates instead: the natural-looking wrong answer. Obvious only-moves (taking back on the square
 * White just moved to) are never missed.
 */
export function chooseBlackMove(
  lines: Candidate[], opts: { press: number; inCheck: boolean; lastTo: string | null; crackP: number; minPress: number },
  rng: () => number,
): BlackChoice {
  const best = Math.max(...lines.map(l => l.cp));
  const safe = lines.filter(l => l.cp >= best - BLACK_WINDOW_CP);
  const unsafe = lines.filter(l => l.cp < best - BLACK_WINDOW_CP).sort((a, b) => b.cp - a.cp);
  const top = safe.reduce((a, b) => (b.cp > a.cp ? b : a), safe[0]);
  const obvious = !!opts.lastTo && top.uci.slice(2, 4) === opts.lastTo;
  const squeezed = opts.inCheck || opts.press >= opts.minPress;
  if (safe.length === 1 && unsafe.length > 0 && squeezed && !obvious && rng() < opts.crackP) {
    return { uci: unsafe[0].uci, crack: true };
  }
  return { uci: safe[Math.floor(rng() * safe.length)].uci, crack: false };
}

/**
 * Toernooi: Black's occasional wobble. A random candidate that costs Black between minCp and maxCp
 * against its best (a real slip, never a hung queen), or null when no candidate is in that band.
 */
export function wobbleMove(lines: Candidate[], minCp: number, maxCp: number, rng: () => number): string | null {
  if (!lines.length) return null;
  const best = Math.max(...lines.map(l => l.cp));
  const band = lines.filter(l => best - l.cp >= minCp && best - l.cp <= maxCp);
  return band.length ? band[Math.floor(rng() * band.length)].uci : null;
}

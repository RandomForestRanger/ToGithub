import { Chess } from 'chess.js';
import raw from '../data/evans_canon_app.json';
import { posKey } from './game/chessUtil';

export interface Line {
  id: string;
  name: string;
  label: string;
  sub: string;
  movesSan: string[];
  movesNumbered: string[];
  plies: number;
  endKey: string;
  parent: string | null;
  frondPlies: number;
  famous: boolean;
  reef: boolean;
  games: number;
}

export interface CanonMove { uci: string; san: string; games: number; named: boolean; to: string }

export interface CanonNode {
  fen: string;
  ply: number;
  toMove: 'w' | 'b';
  eval: number;
  material: number;
  debt: number;
  steam: number;
  /** Black-to-move nodes: pressure of the move that led here, in pawns (null = Black in check). tools/add_pressure.py */
  press?: number | null;
  best: string;
  top2: { san: string; uci: string; cp: number }[] | null;
  endOf: string[];
  reach: string[];
  toward: Record<string, string>;
  moves: CanonMove[];
  chartEnd: boolean;
}

export interface Canon {
  meta: { entry: string[]; entryNumbered: string[]; rootKey: string; capPly: number };
  lines: Line[];
  nodes: Record<string, CanonNode>;
}

export const canon = raw as unknown as Canon;
export const LINES: Record<string, Line> = Object.fromEntries(canon.lines.map(l => [l.id, l]));
export const ROOT_LINE = canon.lines.find(l => l.parent === null)!.id;

/** The lowest eval (pawns, White's view) on a line's own route after 4.b4: how deep its theory dips. */
const lowCache = new Map<string, number>();
export function routeLow(id: string): number {
  const hit = lowCache.get(id);
  if (hit !== undefined) return hit;
  const c = new Chess();
  let low = Infinity;
  LINES[id].movesSan.forEach((san, i) => {
    c.move(san);
    const n = canon.nodes[posKey(c)];
    if (n && i >= canon.meta.entry.length - 1) low = Math.min(low, n.eval / 100);
  });
  const v = Number.isFinite(low) ? low : 0;
  lowCache.set(id, v);
  return v;
}

/**
 * How hard a line is to learn the gambit from (CLAUDE.md section 8), computed from the data:
 *   1  White stays a pawn or more down at the line's end, at level or better: the clearest lesson
 *   2  the pawn comes back, or the line ends a little worse: "die vis spoeg die hoek uit"
 *   3  never a pawn down: declined lines and countergambits
 *   4  risky: reef lines, or theory that dips to -0.5 or worse on the way
 */
export type Tier = 1 | 2 | 3 | 4;
const tierCache = new Map<string, Tier>();
export function tierOf(id: string): Tier {
  const hit = tierCache.get(id);
  if (hit) return hit;
  const l = LINES[id];
  const c = new Chess();
  let minMat = 0;
  l.movesSan.forEach((san, i) => {
    c.move(san);
    const n = canon.nodes[posKey(c)];
    if (n && i >= canon.meta.entry.length - 1) minMat = Math.min(minMat, n.material);
  });
  const end = canon.nodes[l.endKey];
  const t: Tier = l.reef || routeLow(id) <= -0.5 ? 4
    : minMat === 0 ? 3
    : end.material <= -1 && end.eval >= -20 ? 1
    : 2;
  tierCache.set(id, t);
  return t;
}

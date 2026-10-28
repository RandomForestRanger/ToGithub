// "Wat het jou pion gekoop?" (CLAUDE.md section 9a). At a few moments while he has a pawn invested,
// the Captain asks what the pawn bought, and he taps one answer. Every answer is checked on the board,
// so "right" means something he can count. Pure functions only; the controller decides when to ask.
import { Chess, type Color, type Square } from 'chess.js';
import { CHECK_DEV_LEAD, CHECK_MOB_LEAD, CHECK_NOTHING_CP } from '../config';

export type Answer = 'tyd' | 'sentrum' | 'lyne' | 'koning' | 'niks';
export const ANSWERS: Answer[] = ['tyd', 'sentrum', 'lyne', 'koning', 'niks'];

export interface Reading {
  truths: Answer[];
  /** White's developed pieces (minor pieces off their squares, +1 for having castled) minus Black's. */
  devLead: number;
  /** White's legal moves minus Black's (each counted as if it were his turn). */
  mobLead: number;
}

const HOME: Record<Color, string[]> = { w: ['b1', 'g1', 'c1', 'f1'], b: ['b8', 'g8', 'c8', 'f8'] };
const CENTRE = ['d4', 'e4', 'd5', 'e5'];
const KING_MIDDLE = ['d8', 'e8', 'f8', 'd7', 'e7', 'f7'];

function withTurn(fen: string, turn: Color): Chess | null {
  const f = fen.split(' ');
  f[1] = turn;
  f[3] = '-';
  try { return new Chess(f.join(' ')); } catch { return null; }
}

export function developed(c: Chess, color: Color): number {
  let n = 0;
  for (const row of c.board()) for (const p of row) {
    if (p && p.color === color && (p.type === 'n' || p.type === 'b') && !HOME[color].includes(p.square)) n++;
  }
  const king = c.board().flat().find(p => p && p.type === 'k' && p.color === color)!;
  const castled = (color === 'w' ? ['g1', 'c1'] : ['g8', 'c8']).includes(king.square) && !c.getCastlingRights(color).k && !c.getCastlingRights(color).q;
  return n + (castled ? 1 : 0);
}

function centrePawns(c: Chess, color: Color): number {
  return CENTRE.filter(sq => { const p = c.get(sq as Square); return !!p && p.type === 'p' && p.color === color; }).length;
}

function mobility(fen: string, color: Color): number {
  const c = withTurn(fen, color);
  return c ? c.moves().length : 0;
}

/** Black's king is still in the middle and cannot simply castle next move. */
function kingInMiddle(c: Chess): boolean {
  const king = c.board().flat().find(p => p && p.type === 'k' && p.color === 'b')!;
  if (!KING_MIDDLE.includes(king.square)) return false;
  const rights = c.getCastlingRights('b');
  if (!rights.k && !rights.q) return true;
  return ['f8', 'g8'].some(sq => !!c.get(sq as Square) || c.isAttacked(sq as Square, 'w'));
}

/**
 * Read the position (White to move) for the checkpoint. Returns null when there is no fair question
 * to ask: nothing on the board shows the compensation, yet the engine does not call it lost either.
 */
export function readPosition(fen: string, evalCp: number): Reading | null {
  const c = new Chess(fen);
  if (c.turn() !== 'w' || c.inCheck()) return null;
  const devLead = developed(c, 'w') - developed(c, 'b');
  const mobLead = mobility(fen, 'w') - mobility(fen, 'b');
  const truths: Answer[] = [];
  if (devLead >= CHECK_DEV_LEAD) truths.push('tyd');
  const wc = centrePawns(c, 'w'), bc = centrePawns(c, 'b');
  if (wc >= 2 && wc > bc) truths.push('sentrum');
  if (mobLead >= CHECK_MOB_LEAD) truths.push('lyne');
  if (kingInMiddle(c)) truths.push('koning');
  if (!truths.length) {
    if (evalCp > CHECK_NOTHING_CP) return null;
    truths.push('niks');
  }
  return { truths, devLead, mobLead };
}

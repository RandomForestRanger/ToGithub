import { Chess } from 'chess.js';

// Exactly the helper from CLAUDE.md 2.1.
export function posKey(chess: Chess): string {
  const [placement, side, castling, ep] = chess.fen().split(' ');
  let epField = '-';
  if (ep !== '-') {
    const epLegal = chess.moves({ verbose: true }).some(m => m.flags.includes('e'));
    if (epLegal) epField = ep;
  }
  return `${placement} ${side} ${castling} ${epField}`;
}

const VAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** White minus Black material, in pawns. */
export function material(chess: Chess): number {
  let m = 0;
  for (const row of chess.board()) for (const sq of row) {
    if (sq) m += (sq.color === 'w' ? 1 : -1) * VAL[sq.type];
  }
  return m;
}

/** Numbered SAN for the ply index (0-based) — e.g. ply 10 'd4' -> '6.d4'. */
export function numbered(plyIndex: number, san: string): string {
  const n = Math.floor(plyIndex / 2) + 1;
  return plyIndex % 2 === 0 ? `${n}.${san}` : `${n}...${san}`;
}

export function uciToMove(uci: string) {
  return { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci[4] : undefined };
}

export function sanOf(fen: string, uci: string): string {
  const c = new Chess(fen);
  try { return c.move(uciToMove(uci)).san; } catch { return uci; }
}

import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import raw from '../../data/ghost_ship.json';
import { material, uciToMove } from './chessUtil';

interface Chapter { key: string; fen: string; moves: string[]; san: string[] }
const [slow, later] = (raw as { chapters: Chapter[] }).chapters;

describe('Die Spookskip (data/ghost_ship.json)', () => {
  it('chapter 1: the bait, then 5.O-O and quiet moves; Black stays exactly one pawn up and castles', () => {
    const c = new Chess(slow.fen);
    slow.moves.forEach((u, i) => {
      const m = c.move(uciToMove(u));
      expect(m.san).toBe(slow.san[i]);
      if (i >= 7) expect(material(c)).toBe(-1);
    });
    expect(slow.san.slice(0, 9).join(' ')).toBe('e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 O-O');
    expect(slow.san.filter((s, i) => i % 2 === 1).includes('O-O')).toBe(true);
  });

  it('chapter 2: the same queenside (a+c against a+b+c), and Black\'s extra pawn becomes a queen', () => {
    const c = new Chess(later.fen);
    const files = (color: 'w' | 'b') => c.board().flat().filter(p => p && p.type === 'p' && p.color === color && 'abc'.includes(p.square[0])).map(p => p!.square[0]).sort().join('');
    expect(files('w')).toBe('ac');
    expect(files('b')).toBe('abc');
    later.moves.forEach((u, i) => expect(c.move(uciToMove(u)).san).toBe(later.san[i]));
    expect(later.san[later.san.length - 1]).toMatch(/=Q/);
    expect(c.turn()).toBe('w'); // Black made the last move: the queen is Black's
  });
});

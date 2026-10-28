import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { readPosition } from './checkpoint';

const after = (moves: string) => { const c = new Chess(); moves.split(' ').forEach(m => c.move(m)); return c.fen(); };

describe('Wat het jou pion gekoop?', () => {
  it('the greedy fish: White has more pieces out and Black\'s king is stuck in the middle', () => {
    const fen = after('e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4 O-O dxc3 Qb3 Qf6');
    const r = readPosition(fen, 40)!;
    expect(r.truths).toContain('tyd');
    expect(r.truths).toContain('koning');
    expect(r.truths).not.toContain('niks');
    expect(r.devLead).toBeGreaterThanOrEqual(1);
  });

  it('the slow ship: nothing left to show, and "niks meer nie" is right only when the engine agrees', () => {
    const fen = after('e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 O-O Nf6 d3 d6 h3 O-O');
    expect(readPosition(fen, -120)!.truths).toEqual(['niks']);
    expect(readPosition(fen, 0)).toBeNull(); // no fair question to ask
  });

  it('a big centre counts once it is really his', () => {
    // (7.cxd4 at once is illegal: the a5 bishop pins c3 to the king, so castle first)
    const fen = after('e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4 O-O d6 cxd4 Bb6');
    expect(readPosition(fen, 0)!.truths).toContain('sentrum');
  });

  it('never asks with Black to move or with White in check', () => {
    expect(readPosition(after('e4 e5 Nf3 Nc6 Bc4 Bc5 b4'), 0)).toBeNull();
    expect(readPosition(after('e4 e5 f4 Qh4+'), 0)).toBeNull();
  });
});

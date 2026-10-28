import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { ledgerOf, nextBaitCap, imbalance, iconsOf, total, zero } from './ledger';

/** Play moves; `route` = how many of them are the opening route (theory). Returns the final ledger. */
function run(moves: string, route: number) {
  const c = new Chess();
  let cap = zero();
  moves.split(' ').forEach((m, i) => {
    c.move(m);
    cap = nextBaitCap(cap, imbalance(c).deficit, i < route);
  });
  return ledgerOf(c, cap);
}

describe('the plaque: lokaas, verloor, vangs', () => {
  it('the greedy fish: every pawn given on the route is lokaas', () => {
    const l = run('e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4 O-O dxc3', 14);
    expect(l.bait.p).toBe(3);
    expect(total(l.lost)).toBe(0);
  });

  it('winning a pawn back shrinks the lokaas, and it never grows again after the route', () => {
    const l = run('e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4 O-O dxc3 Nxc3', 14);
    expect(l.bait.p).toBe(2);
  });

  it('a piece lost in open sea is verloor, not lokaas', () => {
    // route ends after 5...Ba5; then he hangs the knight on f3 to the queen... (Qf6xf3 after Bg5?? style blunder)
    const l = run('e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d3 Qf6 Bg5 Qxf3', 10);
    expect(l.bait.p).toBe(1);
    expect(l.lost.m).toBe(1);
    expect(l.icons.lost).toEqual(['n']);
  });

  it('a bishop for a knight is just a trade', () => {
    const l = run('e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 dxc6', 0);
    expect(total(l.bait) + total(l.lost) + total(l.won)).toBe(0);
  });

  it('material he wins is vangs', () => {
    const l = run('e4 d5 exd5 Nf6 c4 c6 dxc6 Nxc6', 0); // Scandinavian: White keeps an extra pawn
    expect(l.won.p).toBe(1);
    expect(total(l.bait) + total(l.lost)).toBe(0);
    expect(iconsOf(l.won, l.icons.won)).toEqual(['p']);
  });
});

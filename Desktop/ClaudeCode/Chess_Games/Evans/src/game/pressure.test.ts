import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { PRESS_FULL, PRESS_ZONES } from '../config';
import { canon } from '../data';
import { chooseBlackMove, nullFen, pressToDial, pressureOf, pressZone } from './pressure';

describe('pressure', () => {
  it('null move: same position, other side to move, no en passant', () => {
    const c = new Chess();
    c.move('e4');
    const f = nullFen(c.fen()).split(' ');
    expect(f[1]).toBe('w');
    expect(f[3]).toBe('-');
    expect(f[0]).toBe(c.fen().split(' ')[0]);
    expect(() => new Chess(nullFen(c.fen()))).not.toThrow();
  });

  it('is what Black would lose by skipping his move, never negative, mates kept finite', () => {
    expect(pressureOf(20, 320)).toBeCloseTo(3);
    expect(pressureOf(50, 10)).toBe(0);
    expect(pressureOf(0, 10000)).toBe(15);
  });

  it('zones sit exactly on the painted ticks', () => {
    expect(pressToDial(PRESS_ZONES.amber)).toBeCloseTo(-1);
    expect(pressToDial(PRESS_ZONES.green)).toBeCloseTo(0);
    expect(pressToDial(PRESS_ZONES.gold)).toBeCloseTo(1);
    expect(pressToDial(PRESS_FULL)).toBeCloseTo(2);
    expect(pressToDial(0)).toBeLessThan(-2);
    expect(pressToDial(100)).toBeCloseTo(2.3);
    expect(pressZone(0.1)).toBe('cold');
    expect(pressZone(PRESS_ZONES.amber)).toBe('amber');
    expect(pressZone(PRESS_ZONES.green)).toBe('green');
    expect(pressZone(PRESS_ZONES.gold + 1)).toBe('gold');
  });

  it('rises steadily from LAE DRUK to HOË DRUK', () => {
    let prev = -Infinity;
    for (let p = 0; p <= 10; p += 0.05) {
      const v = pressToDial(p);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });

  it('every Black-to-move node in the canon has its pressure (null only when Black is in check)', () => {
    for (const n of Object.values(canon.nodes)) {
      if (n.toMove !== 'b') continue;
      expect(n.press === null || typeof n.press === 'number').toBe(true);
      if (n.press === null) expect(new Chess(n.fen).inCheck()).toBe(true);
    }
    // the bait asks a big question; 5...Ba5 6.d4 a smaller one
    const root = canon.nodes[canon.meta.rootKey];
    expect(root.press!).toBeGreaterThan(PRESS_ZONES.gold);
  });
});

describe('pressure-sensitive Black', () => {
  const narrow = [{ uci: 'g8f6', cp: 20 }, { uci: 'd7d6', cp: -120 }, { uci: 'h7h6', cp: -300 }];
  const wide = [{ uci: 'g8f6', cp: 20 }, { uci: 'd7d6', cp: 5 }, { uci: 'h7h6', cp: -10 }];
  const base = { press: 2, inCheck: false, lastTo: 'e5', crackP: 0.3, minPress: 0.8 };

  it('misses its only safe move, sometimes, when squeezed: and then plays the most natural wrong move', () => {
    expect(chooseBlackMove(narrow, base, () => 0.1)).toEqual({ uci: 'd7d6', crack: true });
    expect(chooseBlackMove(narrow, base, () => 0.9)).toEqual({ uci: 'g8f6', crack: false });
  });

  it('never cracks with room to breathe, without pressure, or on an obvious take-back', () => {
    expect(chooseBlackMove(wide, base, () => 0.01).crack).toBe(false);
    expect(chooseBlackMove(narrow, { ...base, press: 0.3 }, () => 0.01).crack).toBe(false);
    expect(chooseBlackMove(narrow, { ...base, lastTo: 'f6' }, () => 0.01).crack).toBe(false);
  });

  it('a check counts as pressure', () => {
    expect(chooseBlackMove(narrow, { ...base, press: 0, inCheck: true }, () => 0.1).crack).toBe(true);
  });

  it('with a wide road it still chooses among the safe moves only', () => {
    const picks = new Set([0, 0.34, 0.67, 0.99].map(r => chooseBlackMove(wide, base, () => r).uci));
    expect(picks).toEqual(new Set(['g8f6', 'd7d6', 'h7h6']));
    const mixed = [{ uci: 'a', cp: 0 }, { uci: 'b', cp: -20 }, { uci: 'c', cp: -200 }];
    const picks2 = new Set([0, 0.5, 0.99].map(r => chooseBlackMove(mixed, base, () => r).uci));
    expect(picks2).toEqual(new Set(['a', 'b']));
  });
});

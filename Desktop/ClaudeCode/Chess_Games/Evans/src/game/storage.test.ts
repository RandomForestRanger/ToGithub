import { describe, expect, it } from 'vitest';
import { applyRound, emptyStore } from './storage';
import { pointsFromLoss } from './scoring';
import { chooseRoundTarget, seeded } from './targets';

describe('storage and scoring', () => {
  it('6. a gold line stays gold after a bad round', () => {
    const s = emptyStore();
    const base = { date: '2026-10-02T10:00:00Z', target: 'stone-ware-variation', score: 50, finalEval: 1.4 };
    applyRound(s, { ...base, conquered: ['stone-ware-variation'], gold: true }, ['stone-ware-variation'], {});
    expect(s.lines['stone-ware-variation'].state).toBe('gold');
    const changed = applyRound(s, { ...base, conquered: ['stone-ware-variation'], gold: false, finalEval: -2 }, ['stone-ware-variation'], { 'stone-ware-variation': '5...Bd6' });
    expect(s.lines['stone-ware-variation'].state).toBe('gold');
    expect(changed).toEqual([]);
    expect(s.lines['stone-ware-variation'].played).toBe(2);
    expect(s.lines['stone-ware-variation'].lastMissed?.move).toBe('5...Bd6');
  });

  it('point bands', () => {
    expect([0, 25, 26, 60, 61, 120, 121].map(pointsFromLoss)).toEqual([4, 4, 3, 3, 2, 2, 1]);
  });

  it('round target never the root nor the last two targets', () => {
    const rng = seeded(3);
    for (let i = 0; i < 300; i++) {
      const t = chooseRoundTarget(rng, () => 'grey', ['main-line', 'pierce-defense']);
      expect(['evans-gambit', 'main-line', 'pierce-defense']).not.toContain(t);
    }
  });
});

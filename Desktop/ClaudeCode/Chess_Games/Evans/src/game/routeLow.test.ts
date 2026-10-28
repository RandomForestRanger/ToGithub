import { describe, expect, it } from 'vitest';
import { canon, routeLow } from '../data';
// The brief no longer shows the dip note (the needle shows pressure since 28 Oct), but routeLow stays:
// it is how a later curriculum can hold the deep-dip lines back.
const THEORY_DIP = -0.5;

describe('routeLow', () => {
  it('flags the deep-dip lines (and only a handful)', () => {
    const deep = canon.lines.filter(l => routeLow(l.id) <= THEORY_DIP).map(l => l.id);
    expect(deep).toContain('declined-vasquez-variation');
    expect(deep).not.toContain('pierce-defense');
    expect(deep.length).toBeGreaterThan(5);
    expect(deep.length).toBeLessThan(15);
  });
});

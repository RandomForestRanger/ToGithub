import { describe, expect, it } from 'vitest';
import { canon, routeLow } from '../data';
import { THEORY_DIP } from '../config';

describe('routeLow', () => {
  it('flags the deep-dip lines for the brief (and only a handful)', () => {
    const deep = canon.lines.filter(l => routeLow(l.id) <= THEORY_DIP).map(l => l.id);
    expect(deep).toContain('declined-vasquez-variation');
    expect(deep).not.toContain('pierce-defense');
    expect(deep.length).toBeGreaterThan(5);
    expect(deep.length).toBeLessThan(15);
  });
});

import { describe, expect, it } from 'vitest';
import { LINES, ROOT_LINE, tierOf, type Tier } from '../data';
import { chooseRoundTarget, seeded, type LineState } from './targets';

const idOf = (label: string) => Object.values(LINES).find(l => l.label === label)!.id;
const ids = Object.keys(LINES).filter(id => id !== ROOT_LINE);

function shares(stateOf: (id: string) => LineState, recent: string[] = [], n = 20000) {
  const rng = seeded(7);
  const byTier: Record<Tier, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const byState: Record<LineState, number> = { grey: 0, green: 0, gold: 0 };
  for (let i = 0; i < n; i++) {
    const t = chooseRoundTarget(rng, stateOf, recent);
    byTier[tierOf(t)] += 1 / n;
    byState[stateOf(t)] += 1 / n;
  }
  return { byTier, byState };
}

describe('target choice: easier lessons first, softly, interleaved', () => {
  it('tiers come from the data', () => {
    expect(tierOf(idOf('Compromised Defense'))).toBe(1);
    expect(tierOf(idOf('Pierce Defense'))).toBe(1);
    expect(tierOf(idOf('Lasker Defense'))).toBe(2);
    expect(tierOf(idOf('Showalter Variation'))).toBe(3);
    expect(tierOf(idOf('Hicken Variation'))).toBe(4);
  });

  it('a fresh forest mostly serves the clearest gambits, but every tier can come up', () => {
    const { byTier } = shares(() => 'grey');
    console.log('fresh forest, share of rounds by tier:', byTier);
    expect(byTier[1]).toBeGreaterThan(0.6);
    expect(byTier[2]).toBeGreaterThan(0.03);
    expect(byTier[3]).toBeGreaterThan(0.03);
    expect(byTier[4]).toBeGreaterThan(0.01);
    expect(byTier[4]).toBeLessThan(0.12);
  });

  it('as the clear gambits turn green, the other tiers open up', () => {
    const fresh = shares(() => 'grey').byTier;
    const later = shares(id => (tierOf(id) === 1 ? 'green' : 'grey')).byTier;
    console.log('tier 1 all green, share by tier:', later);
    expect(later[2] + later[3] + later[4]).toBeGreaterThan(fresh[2] + fresh[3] + fresh[4] + 0.2);
  });

  it('gold lines keep coming back', () => {
    // half the forest gold, the rest grey
    const { byState } = shares(id => (ids.indexOf(id) % 2 ? 'gold' : 'grey'));
    console.log('half gold, share by state:', byState);
    expect(byState.gold).toBeGreaterThan(0.1);
  });

  it('two rounds in a row from one tier make that tier less likely next', () => {
    const t1 = ids.filter(id => tierOf(id) === 1);
    const base = shares(() => 'grey').byTier[1];
    const after = shares(() => 'grey', [t1[0], t1[1]]).byTier[1];
    expect(after).toBeLessThan(base - 0.05);
  });
});

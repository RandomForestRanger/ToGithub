import { CLASS_ODDS, FAMOUS_WEIGHT, RECENT_EXCLUDE, TIER_FLOOR, TIER_NEED, TIER_REPEAT } from '../config';
import { LINES, ROOT_LINE, tierOf, type Tier } from '../data';

export type LineState = 'grey' | 'green' | 'gold';
export type Rng = () => number;

export function weight(id: string): number {
  const l = LINES[id];
  return (l.famous ? FAMOUS_WEIGHT : 1) * (1 + Math.log10(1 + l.games));
}

function pickWeighted<T>(rng: Rng, items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r < 0) return items[i];
  }
  return items[items.length - 1];
}

/**
 * How open each tier is for new (grey) lines right now. Never shut, so lessons interleave; fully open
 * once enough of the easier tiers is green (TIER_NEED). Section 8.
 */
export function tierOpenness(stateOf: (id: string) => LineState): Record<Tier, number> {
  const ids = Object.keys(LINES).filter(id => id !== ROOT_LINE);
  const done = (ts: Tier[]) => {
    const xs = ids.filter(i => ts.includes(tierOf(i)));
    return xs.length ? xs.filter(i => stateOf(i) !== 'grey').length / xs.length : 1;
  };
  const ramp = (t: Tier, progress: number) => TIER_FLOOR[t] + (1 - TIER_FLOOR[t]) * Math.min(1, progress / TIER_NEED[t]);
  return { 1: 1, 2: ramp(2, done([1])), 3: ramp(3, done([1, 2])), 4: ramp(4, done([1, 2, 3])) };
}

/**
 * Section 8: class first (grey/green/gold), then weighted by fame and games. New (grey) lines are also
 * weighted by how open their tier is, and a tier that gave the last two targets gets less weight, so the
 * rounds interleave and feel random while the easier lessons still come first. Green and gold lines keep
 * coming back for review through their class odds.
 */
export function chooseTarget(rng: Rng, ids: string[], stateOf: (id: string) => LineState, recent: string[] = []): string {
  const classes = (Object.keys(CLASS_ODDS) as LineState[])
    .map(c => ({ c, ids: ids.filter(i => stateOf(i) === c) }))
    .filter(x => x.ids.length > 0);
  const cls = pickWeighted(rng, classes, classes.map(x => CLASS_ODDS[x.c]));
  const open = tierOpenness(stateOf);
  const last = recent.slice(-2).filter(id => LINES[id]).map(tierOf);
  const repeat = last.length === 2 && last[0] === last[1] ? last[0] : null;
  const w = (id: string) => weight(id)
    * (cls.c === 'grey' ? open[tierOf(id)] : 1)
    * (tierOf(id) === repeat ? TIER_REPEAT : 1);
  return pickWeighted(rng, cls.ids, cls.ids.map(w));
}

export function chooseRoundTarget(rng: Rng, stateOf: (id: string) => LineState, recent: string[]): string {
  const all = Object.keys(LINES).filter(id => id !== ROOT_LINE);
  const excl = recent.slice(-RECENT_EXCLUDE);
  const pool = all.filter(id => !excl.includes(id));
  return chooseTarget(rng, pool.length ? pool : all, stateOf, recent);
}

export function pickWeightedMove<T extends { games: number }>(rng: Rng, moves: T[]): T {
  return pickWeighted(rng, moves, moves.map(m => Math.max(1, m.games)));
}

/** Small seeded RNG (mulberry32) for tests. */
export function seeded(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

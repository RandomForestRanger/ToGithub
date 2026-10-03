import { CLASS_ODDS, FAMOUS_WEIGHT, RECENT_EXCLUDE } from '../config';
import { LINES, ROOT_LINE } from '../data';

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

/** Section 8: class first (grey/green/gold), then weighted by fame and games. */
export function chooseTarget(rng: Rng, ids: string[], stateOf: (id: string) => LineState): string {
  const classes = (Object.keys(CLASS_ODDS) as LineState[])
    .map(c => ({ c, ids: ids.filter(i => stateOf(i) === c) }))
    .filter(x => x.ids.length > 0);
  const cls = pickWeighted(rng, classes, classes.map(x => CLASS_ODDS[x.c]));
  return pickWeighted(rng, cls.ids, cls.ids.map(weight));
}

export function chooseRoundTarget(rng: Rng, stateOf: (id: string) => LineState, recent: string[]): string {
  const all = Object.keys(LINES).filter(id => id !== ROOT_LINE);
  const excl = recent.slice(-RECENT_EXCLUDE);
  const pool = all.filter(id => !excl.includes(id));
  return chooseTarget(rng, pool.length ? pool : all, stateOf);
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

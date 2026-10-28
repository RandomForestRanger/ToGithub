// The plaque under the dial (CLAUDE.md section 9): what he paid on purpose, what he lost, what he caught.
//   Lokaas  - material given on the opening route (the gambit's own sacrifice). Frozen when the route
//             ends, and it only shrinks after that, as he wins it back.
//   Verloor - any other material he is down (a blunder in open sea is not bait).
//   Vangs   - material he is up.
// Knights and bishops count as one class (minor pieces), so an ordinary bishop-for-knight trade nets
// to nothing. Pure functions only.
import type { Chess } from 'chess.js';

export type Cls = 'q' | 'r' | 'm' | 'p';
export const CLASSES: Cls[] = ['q', 'r', 'm', 'p'];
export type Counts = Record<Cls, number>;
/** The icon to draw for a class: for minor pieces, the type actually missing or extra. */
export type Icon = 'q' | 'r' | 'b' | 'n' | 'p';

export interface Ledger {
  bait: Counts; lost: Counts; won: Counts;
  /** icons for the minor pieces in each segment, in order */
  icons: { bait: Icon[]; lost: Icon[]; won: Icon[] };
}

export const zero = (): Counts => ({ q: 0, r: 0, m: 0, p: 0 });
export const total = (c: Counts) => c.q + c.r + c.m + c.p;

interface Raw { w: Record<'q' | 'r' | 'b' | 'n' | 'p', number>; b: Record<'q' | 'r' | 'b' | 'n' | 'p', number> }

function count(c: Chess): Raw {
  const z = () => ({ q: 0, r: 0, b: 0, n: 0, p: 0 });
  const r: Raw = { w: z(), b: z() };
  for (const row of c.board()) for (const p of row) if (p && p.type !== 'k') r[p.color][p.type]++;
  return r;
}

/** White's deficit and surplus per class. */
export function imbalance(c: Chess): { deficit: Counts; surplus: Counts; minorDown: Icon[]; minorUp: Icon[] } {
  const r = count(c);
  const deficit = zero(), surplus = zero();
  const diff: Record<Cls, number> = {
    q: r.w.q - r.b.q, r: r.w.r - r.b.r, m: (r.w.n + r.w.b) - (r.b.n + r.b.b), p: r.w.p - r.b.p,
  };
  for (const k of CLASSES) { deficit[k] = Math.max(0, -diff[k]); surplus[k] = Math.max(0, diff[k]); }
  // which minor piece to draw: the type White actually has fewer (or more) of
  const icons = (n: number, prefer: Icon[]) => Array.from({ length: n }, (_, i) => prefer[i] ?? prefer[prefer.length - 1] ?? 'n');
  const fewer: Icon[] = [
    ...Array(Math.max(0, r.b.b - r.w.b)).fill('b'), ...Array(Math.max(0, r.b.n - r.w.n)).fill('n')];
  const more: Icon[] = [
    ...Array(Math.max(0, r.w.b - r.b.b)).fill('b'), ...Array(Math.max(0, r.w.n - r.b.n)).fill('n')];
  return { deficit, surplus, minorDown: icons(deficit.m, fewer.length ? fewer : ['n']), minorUp: icons(surplus.m, more.length ? more : ['n']) };
}

/** On the route every bit of material he is down is the gambit's own; after it, the bait can only shrink. */
export function nextBaitCap(cap: Counts, deficit: Counts, onRoute: boolean): Counts {
  if (onRoute) return { ...deficit };
  const n = zero();
  for (const k of CLASSES) n[k] = Math.min(cap[k], deficit[k]);
  return n;
}

export function ledgerOf(c: Chess, cap: Counts): Ledger {
  const { deficit, surplus, minorDown, minorUp } = imbalance(c);
  const bait = zero(), lost = zero();
  for (const k of CLASSES) { bait[k] = Math.min(deficit[k], cap[k]); lost[k] = deficit[k] - bait[k]; }
  return {
    bait, lost, won: surplus,
    icons: { bait: minorDown.slice(0, bait.m), lost: minorDown.slice(bait.m, bait.m + lost.m), won: minorUp },
  };
}

/** Icons for one segment, most valuable first. */
export function iconsOf(c: Counts, minor: Icon[]): Icon[] {
  return [
    ...Array(c.q).fill('q'), ...Array(c.r).fill('r'), ...minor.slice(0, c.m),
    ...Array(Math.max(0, c.m - minor.length)).fill('n'), ...Array(c.p).fill('p'),
  ];
}

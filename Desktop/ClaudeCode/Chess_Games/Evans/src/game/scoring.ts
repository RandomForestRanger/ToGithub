import { POINT_BANDS_CP, TOP2_TOLERANCE_CP } from '../config';
import type { CanonNode } from '../data';

/** Section 6: points from centipawn loss (White's view). */
export function pointsFromLoss(lossCp: number): number {
  const [a, b, c] = POINT_BANDS_CP;
  if (lossCp <= a) return 4;
  if (lossCp <= b) return 3;
  if (lossCp <= c) return 2;
  return 1;
}

/** Section 4.5: is uci one of the protected "top two" moves? */
export function isTopTwo(before: CanonNode, uci: string): boolean {
  const t = before.top2;
  if (!t || !t.length) return false;
  if (t[0].uci === uci) return true;
  return t.length > 1 && t[1].uci === uci && t[0].cp - t[1].cp <= TOP2_TOLERANCE_CP;
}

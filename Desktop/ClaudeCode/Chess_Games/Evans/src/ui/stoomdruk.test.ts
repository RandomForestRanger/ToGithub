import { describe, expect, it } from 'vitest';
import { needleAngle } from './Stoomdruk';

describe('drukmeter needle', () => {
  it('lands exactly on the painted ticks', () => {
    expect(needleAngle(-2)).toBeCloseTo(-50.6);
    expect(needleAngle(-1)).toBeCloseTo(-24);
    expect(needleAngle(0)).toBeCloseTo(1);
    expect(needleAngle(1)).toBeCloseTo(25.6);
    expect(needleAngle(2)).toBeCloseTo(52.2);
  });
  it('moves steadily between ticks and stops just past the ends', () => {
    expect(needleAngle(0.5)).toBeCloseTo((1 + 25.6) / 2);
    expect(needleAngle(9)).toBeCloseTo(needleAngle(2.3));
    expect(needleAngle(-9)).toBeCloseTo(needleAngle(-2.3));
    expect(needleAngle(2.3)).toBeGreaterThan(52.2);
    expect(needleAngle(-2.3)).toBeLessThan(-50.6);
  });
});

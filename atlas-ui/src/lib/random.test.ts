import { describe, expect, it } from 'vitest';
import { dailyBallOrder, localDateKey, msUntilNextLocalMidnight, pickRandomBalls } from './random';

describe('pickRandomBalls', () => {
  it('returns n unique balls within 1-49', () => {
    const balls = pickRandomBalls(20);
    expect(balls).toHaveLength(20);
    expect(new Set(balls).size).toBe(20);
    for (const b of balls) {
      expect(b).toBeGreaterThanOrEqual(1);
      expect(b).toBeLessThanOrEqual(49);
    }
  });

  it('returns all balls when n equals the range size', () => {
    const balls = pickRandomBalls(49);
    expect(new Set(balls)).toEqual(new Set(Array.from({ length: 49 }, (_, i) => i + 1)));
  });

  it('accepts an injected rng for deterministic tests', () => {
    const balls = pickRandomBalls(3, 5, () => 0);
    expect(balls).toHaveLength(3);
  });
});

describe('dailyBallOrder', () => {
  it('is a deterministic permutation of 1-49 for a given date key', () => {
    const order = dailyBallOrder('2026-08-13');
    expect(new Set(order)).toEqual(new Set(Array.from({ length: 49 }, (_, i) => i + 1)));
    expect(dailyBallOrder('2026-08-13')).toEqual(order);
  });

  it('differs between two different date keys', () => {
    expect(dailyBallOrder('2026-08-13')).not.toEqual(dailyBallOrder('2026-08-14'));
  });
});

describe('localDateKey', () => {
  it('formats as YYYY-MM-DD', () => {
    expect(localDateKey(new Date(2026, 7, 3))).toBe('2026-08-03');
  });
});

describe('msUntilNextLocalMidnight', () => {
  it('counts down to exactly the next local midnight', () => {
    const noon = new Date(2026, 7, 13, 12, 0, 0);
    expect(msUntilNextLocalMidnight(noon)).toBe(12 * 60 * 60 * 1000);
  });
});

import { describe, expect, it } from 'vitest';
import { pickRandomBalls } from './random';

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

import { describe, expect, it } from 'vitest';
import { gapSinceLastSeen, isInsufficientHistory, scoreSpecialNumbers } from './scoring';

describe('scoreSpecialNumbers', () => {
  it('probabilities sum to one within tolerance', () => {
    const history = [1, 2, 3, 1, 1, 7, 20, 20, 49];
    const total = scoreSpecialNumbers(history).reduce((s, x) => s + x.probability, 0);
    expect(Math.abs(total - 1)).toBeLessThan(1e-12);
  });

  it('gives a uniform distribution for empty history', () => {
    const scores = scoreSpecialNumbers([]);
    expect(scores).toHaveLength(49);
    expect(scores.every((s) => Math.abs(s.probability - 1 / 49) < 1e-12)).toBe(true);
  });

  it('ranks more frequent balls higher', () => {
    const history = [...Array(10).fill(8), ...Array(2).fill(3)];
    const scores = scoreSpecialNumbers(history);
    expect(scores[0].ball).toBe(8);
    expect(scores[0].count).toBe(10);
  });

  it('breaks ties by ascending ball number', () => {
    const scores = scoreSpecialNumbers([5, 9]);
    const tied = scores.filter((s) => s.count === 1).map((s) => s.ball);
    expect(tied.indexOf(5)).toBeLessThan(tied.indexOf(9));
  });

  it('matches the Dirichlet smoothing formula', () => {
    const history = [...Array(3).fill(7), ...Array(2).fill(8)];
    const scores = scoreSpecialNumbers(history);
    const denom = history.length + 49;
    const s7 = scores.find((s) => s.ball === 7)!;
    const s1 = scores.find((s) => s.ball === 1)!;
    expect(Math.abs(s7.probability - (3 + 1) / denom)).toBeLessThan(1e-12);
    expect(Math.abs(s1.probability - (0 + 1) / denom)).toBeLessThan(1e-12);
  });
});

describe('gapSinceLastSeen', () => {
  it('is zero for the most recent draw', () => {
    expect(gapSinceLastSeen([1, 2, 3], 3)).toBe(0);
  });

  it('counts draws since the ball last appeared', () => {
    expect(gapSinceLastSeen([9, 1, 2, 3], 9)).toBe(3);
  });

  it('is null when the ball was never seen', () => {
    expect(gapSinceLastSeen([1, 2, 3], 49)).toBeNull();
  });
});

describe('isInsufficientHistory', () => {
  it('is true below the threshold and false at/above it', () => {
    expect(isInsufficientHistory(99)).toBe(true);
    expect(isInsufficientHistory(100)).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { runBacktest, wilsonCi } from './backtest';

describe('wilsonCi', () => {
  it('is maximally uncertain for zero trials', () => {
    expect(wilsonCi(0, 0)).toEqual([0, 1]);
  });

  it('skews high for all hits', () => {
    const [low, high] = wilsonCi(10, 10);
    expect(low).toBeGreaterThan(0.6);
    expect(high).toBeGreaterThan(0.999999);
  });

  it('skews low for no hits', () => {
    const [low, high] = wilsonCi(0, 10);
    expect(low).toBe(0);
    expect(high).toBeLessThan(0.4);
  });
});

describe('runBacktest', () => {
  it('has zero test periods when history is shorter than warmup', () => {
    const result = runBacktest([1, 2, 3], 10);
    expect(result.testPeriodCount).toBe(0);
    expect(result.reliableEdgeFound).toBe(false);
    expect(result.metrics.every((m) => m.brierScore === null)).toBe(true);
  });

  it('test period count matches history length minus warmup', () => {
    const history = Array.from({ length: 20 }, (_, i) => (i % 49) + 1);
    const result = runBacktest(history, 10);
    expect(result.testPeriodCount).toBe(10);
    expect(result.metrics.every((m) => m.testPeriodCount === 10)).toBe(true);
  });

  it('returns 40 N metrics', () => {
    const history = Array.from({ length: 20 }, (_, i) => (i % 49) + 1);
    const result = runBacktest(history, 10);
    expect(result.metrics.map((m) => m.n)).toEqual(Array.from({ length: 40 }, (_, i) => i + 1));
  });

  it('hits every post-warmup period at N=1 for a repeating ball', () => {
    const history = Array(20).fill(7);
    const result = runBacktest(history, 10);
    const n1 = result.metrics.find((m) => m.n === 1)!;
    expect(n1.hitCount).toBe(result.testPeriodCount);
    expect(n1.hitRate).toBe(1);
  });

  it('finds a reliable edge for a strongly biased history', () => {
    const history = Array.from({ length: 3 }, () => [
      ...Array(30).fill(3),
      4,
      5,
      6,
    ]).flat();
    const result = runBacktest(history, 10);
    expect(result.reliableEdgeFound).toBe(true);
  });

  it('finds no reliable edge for an evenly spread history', () => {
    const history = Array.from({ length: 2 }, () =>
      Array.from({ length: 49 }, (_, i) => i + 1),
    ).flat();
    const result = runBacktest(history, 10);
    expect(result.reliableEdgeFound).toBe(false);
  });
});

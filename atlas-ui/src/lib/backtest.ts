// Walk-forward backtest: period t is predicted using only draws strictly
// before t (no future-data leakage). Compares hit rate against the random
// baseline N/49 with a Wilson 95% confidence interval.
// Ported from backend/app/services/backtest.py.

import { BALL_COUNT, scoreSpecialNumbers } from './scoring';

const Z_95 = 1.959963984540054;
export const MIN_TRAIN_SIZE = 10;
export const N_VALUES: number[] = Array.from({ length: 40 }, (_, i) => i + 1);

export interface NMetric {
  n: number;
  testPeriodCount: number;
  hitCount: number;
  hitRate: number;
  baselineHitRate: number;
  hitRateCiLow: number;
  hitRateCiHigh: number;
  deltaVsBaseline: number;
  brierScore: number | null;
}

export interface BacktestResult {
  testPeriodCount: number;
  metrics: NMetric[];
  reliableEdgeFound: boolean;
}

export function wilsonCi(hitCount: number, n: number, z: number = Z_95): [number, number] {
  if (n === 0) return [0, 1];
  const p = hitCount / n;
  const denom = 1 + (z * z) / n;
  const center = p + (z * z) / (2 * n);
  const margin = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  const low = Math.max(0, (center - margin) / denom);
  const high = Math.min(1, (center + margin) / denom);
  return [low, high];
}

/** history: chronological special numbers (oldest first). */
export function runBacktest(
  history: number[],
  minTrainSize: number = MIN_TRAIN_SIZE,
  nValues: number[] = N_VALUES,
): BacktestResult {
  const hitCounts = new Map<number, number>(nValues.map((n) => [n, 0]));
  let brierSum = 0;
  let testPeriodCount = 0;

  for (let t = minTrainSize; t < history.length; t++) {
    const train = history.slice(0, t);
    const actual = history[t];
    const scores = scoreSpecialNumbers(train);
    const rankedBalls = scores.map((s) => s.ball);
    const probByBall = new Map(scores.map((s) => [s.ball, s.probability]));

    testPeriodCount += 1;
    for (const n of nValues) {
      if (rankedBalls.slice(0, n).includes(actual)) {
        hitCounts.set(n, (hitCounts.get(n) ?? 0) + 1);
      }
    }

    let periodBrier = 0;
    for (let ball = 1; ball <= BALL_COUNT; ball++) {
      const p = probByBall.get(ball) ?? 0;
      const y = ball === actual ? 1 : 0;
      periodBrier += (p - y) ** 2;
    }
    brierSum += periodBrier;
  }

  const brierScore = testPeriodCount > 0 ? brierSum / testPeriodCount : null;

  const metrics: NMetric[] = [];
  let reliableEdgeFound = false;
  for (const n of nValues) {
    const hitCount = hitCounts.get(n) ?? 0;
    const hitRate = testPeriodCount > 0 ? hitCount / testPeriodCount : 0;
    const baseline = n / BALL_COUNT;
    const [ciLow, ciHigh] = wilsonCi(hitCount, testPeriodCount);
    const delta = hitRate - baseline;

    if (testPeriodCount > 0 && ciLow > baseline) reliableEdgeFound = true;

    metrics.push({
      n,
      testPeriodCount,
      hitCount,
      hitRate,
      baselineHitRate: baseline,
      hitRateCiLow: ciLow,
      hitRateCiHigh: ciHigh,
      deltaVsBaseline: delta,
      brierScore,
    });
  }

  return { testPeriodCount, metrics, reliableEdgeFound };
}

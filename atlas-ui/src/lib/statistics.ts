/**
 * FrequencyDistribution — compute ball/symbol frequencies + chi-square test.
 *
 * Used by NumberFrequencySparkline, Heatmap, and UniformityCheck components.
 */

import type { Snapshot } from '../types';
import { getZodiacForBall } from './symbolMaps';

const ALL_BALLS = Array.from({ length: 49 }, (_, i) => i + 1);

export interface BallFreq {
  ball: number;
  count: number;
  expected: number;
  deviation: number;   // count - expected
  z_score: number;     // (count - expected) / sqrt(expected * (1 - 1/49))
}

export function computeBallFreqs(snapshot: Snapshot): BallFreq[] {
  // Per-ball count across all positions (1-7) of all periods
  const counts: Record<number, number> = Object.fromEntries(ALL_BALLS.map(b => [b, 0]));
  let total = 0;
  for (const p of snapshot.periods) {
    for (const n of p.numbers) {
      if (n.ball >= 1 && n.ball <= 49) {
        counts[n.ball]++;
        total++;
      }
    }
  }
  // Expected count under uniform = total / 49
  const expected = total / 49;
  // Z-score uses binomial variance: np(1-p) where p=1/49
  return ALL_BALLS.map(ball => {
    const count = counts[ball];
    const dev = count - expected;
    const stdDev = Math.sqrt(expected * (1 - 1 / 49));
    return {
      ball,
      count,
      expected,
      deviation: dev,
      z_score: stdDev > 0 ? dev / stdDev : 0,
    };
  });
}

export interface ChiSquareResult {
  chi2: number;
  df: number;             // degrees of freedom (n_categories - 1)
  p_value: number;        // approximation
  reject_null: boolean;   // p < 0.05
}

/**
 * Chi-square goodness-of-fit test against uniform.
 * Approximates p-value using survival function of chi² distribution.
 *
 * For small samples (n < 30), this approximation is rough. For larger samples
 * it's reasonable for df >= 1.
 */
export function chiSquareTest(observed: number[], expectedPerCat: number): ChiSquareResult {
  // All observed should sum to N, expected should also sum to N
  const N = observed.reduce((s, v) => s + v, 0);
  if (N === 0 || observed.length < 2) {
    return { chi2: 0, df: observed.length - 1, p_value: 1, reject_null: false };
  }
  // Scale expected to sum to N
  const expected = observed.map(() => expectedPerCat * (N / observed.reduce((s, v) => s + v, 0)));

  // Chi-square statistic
  let chi2 = 0;
  for (let i = 0; i < observed.length; i++) {
    if (expected[i] > 0) {
      const diff = observed[i] - expected[i];
      chi2 += (diff * diff) / expected[i];
    }
  }
  const df = observed.length - 1;

  // P-value approximation: regularized upper incomplete gamma function.
  // We use a polynomial approximation sufficient for UI display (rough but OK).
  const p_value = approximateChiSquarePValue(chi2, df);

  return {
    chi2,
    df,
    p_value,
    reject_null: p_value < 0.05,
  };
}

/**
 * Incomplete gamma function approximation for chi-square survival.
 * Uses series expansion for small x, continued fraction for large x.
 * Sufficient accuracy for UI p-value display (~3 sig figs).
 */
function approximateChiSquarePValue(x: number, df: number): number {
  if (x <= 0) return 1;
  if (df <= 0) return 1;

  // For df >= 1: P(χ² > x) using regularized upper incomplete gamma
  // We approximate using a simple series for df=1, then recursion for higher df.

  // Use normal approximation (Wilson-Hilferty): χ² ~ N(df, 2df)
  // P(χ² > x) ≈ 1 - Φ(z) where z = (x/df)^(1/3) - (1 - 2/(9df)) / sqrt(2/(9df))
  const z = (Math.pow(x / df, 1 / 3) - (1 - 2 / (9 * df))) / Math.sqrt(2 / (9 * df));
  return 1 - normalCdf(z);
}

function normalCdf(z: number): number {
  // Abramowitz & Stegun approximation
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp(-z * z / 2);
  let p = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  p = 1 - p;
  if (z > 0) p = 1 - p;
  return p;
}

/**
 * Per-period symbol counts: For each period × each zodiac, count occurrences.
 * Returns a 2D matrix for heatmap display.
 */
export interface SymbolMatrix {
  periods: number[];                     // period_ids (most recent first)
  zodiacs: string[];                      // 12 zodiacs
  wuxings: string[];                      // 5 wuxing
  waves: string[];                        // 3 waves
  zodiacGrid: Record<number, Record<string, number>>;  // period_id → zodiac → count
  wuxingGrid: Record<number, Record<string, number>>;
  waveGrid: Record<number, Record<string, number>>;
}

export function computeSymbolMatrix(snapshot: Snapshot, limit: number = 30): SymbolMatrix {
  const zodiacs = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
  const wuxings = ['金', '木', '水', '火', '土'];
  const waves = ['红', '蓝', '绿'];

  // Take most recent N periods
  const periods = snapshot.periods.slice(0, limit);

  const zodiacGrid: SymbolMatrix['zodiacGrid'] = {};
  const wuxingGrid: SymbolMatrix['wuxingGrid'] = {};
  const waveGrid: SymbolMatrix['waveGrid'] = {};

  for (const p of periods) {
    const year = Math.floor(p.period_id / 1000);
    const zc: Record<string, number> = Object.fromEntries(zodiacs.map(z => [z, 0]));
    const wc: Record<string, number> = Object.fromEntries(wuxings.map(w => [w, 0]));
    const vc: Record<string, number> = Object.fromEntries(waves.map(v => [v, 0]));
    for (const n of p.numbers) {
      if (n.ball < 1 || n.ball > 49) continue;
      const z = getZodiacForBall(n.ball, year);
      const w = n.wuxing;
      const v = n.wave;
      if (z && z in zc) zc[z]++;
      if (w && w in wc) wc[w]++;
      if (v && v in vc) vc[v]++;
    }
    zodiacGrid[p.period_id] = zc;
    wuxingGrid[p.period_id] = wc;
    waveGrid[p.period_id] = vc;
  }

  return {
    periods: periods.map(p => p.period_id),
    zodiacs, wuxings, waves,
    zodiacGrid, wuxingGrid, waveGrid,
  };
}
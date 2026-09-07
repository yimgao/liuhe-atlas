/**
 * Bayesian predictor — port of Python analyzer/bayes_l2.py
 *
 * Level 1 (univariate): P(ball) = (count + alpha) / (total + 49*alpha)
 * Level 2 (symbol-aggregated): P(symbol) first, then project back to balls
 *
 * Year-aware: each historical period uses its year's zodiac mapping.
 */

import type { Snapshot, BallSymbol, Period } from '../types';
import {
  WUXING_MAP, WAVE_MAP, ODD_EVEN_MAP,
  ALL_ZODIACS, ALL_WUXING, ALL_WAVES,
  getZodiacForBall,
} from './symbolMaps';

const ALPHA_LAPLACE = 1.0;
const UNIFORM = 1 / 49;
const ALL_BALLS = Array.from({ length: 49 }, (_, i) => i + 1);

export interface PredictionResult {
  ranked: Array<{ ball: number; probability: number; symbol: BallSymbol; rank: number }>;
  signalStrength: {
    kl_divergence: number;
    log_loss_baseline: number;
    log_loss_model: number;
    lift_bits: number;
    interpretation: 'no-signal' | 'weak' | 'moderate' | 'strong';
  };
  dataScope: {
    total_periods: number;
    total_draws: number;
  };
}

function periodYear(period: Period): number {
  // period_id like 2026194 → year 2026
  // period_id like 2020203 → year 2020
  return Math.floor(period.period_id / 1000);
}

interface Counts {
  ballCounts: Record<number, number>;
  zodiacCounts: Record<string, number>;
  wuxingCounts: Record<string, number>;
  waveCounts: Record<string, number>;
  total: number;
}

function aggregateCounts(periods: Snapshot['periods']): Counts {
  const ballCounts: Record<number, number> = Object.fromEntries(ALL_BALLS.map(b => [b, 0]));
  const zodiacCounts: Record<string, number> = Object.fromEntries(ALL_ZODIACS.map(z => [z, 0]));
  const wuxingCounts: Record<string, number> = Object.fromEntries(ALL_WUXING.map(w => [w, 0]));
  const waveCounts: Record<string, number> = Object.fromEntries(ALL_WAVES.map(w => [w, 0]));
  let total = 0;

  for (const period of periods) {
    const year = periodYear(period);
    for (const drawn of period.numbers) {
      const ball = drawn.ball;
      if (ball < 1 || ball > 49) continue;
      ballCounts[ball]++;

      const z = getZodiacForBall(ball, year);
      const wx = WUXING_MAP[ball] ?? drawn.wuxing;
      const wv = WAVE_MAP[ball] ?? drawn.wave;
      if (z) zodiacCounts[z]++;
      if (wx) wuxingCounts[wx]++;
      if (wv) waveCounts[wv]++;
      total++;
    }
  }

  return { ballCounts, zodiacCounts, wuxingCounts, waveCounts, total };
}

function smooth(count: number, total: number, n: number, alpha = ALPHA_LAPLACE): number {
  return (count + alpha) / (total + n * alpha);
}

export function predict(snapshot: Snapshot, targetYear: number = 2026): PredictionResult {
  const { zodiacCounts, wuxingCounts, waveCounts, ballCounts, total } =
    aggregateCounts(snapshot.periods);

  // Level 1: univariate ball probability
  const lvl1Prob: Record<number, number> = {};
  for (const ball of ALL_BALLS) {
    lvl1Prob[ball] = smooth(ballCounts[ball], total, 49);
  }

  // Level 2: symbol-aggregated
  const lvl2Prob: Record<number, number> = {};
  let lvl2Sum = 0;
  for (const ball of ALL_BALLS) {
    const z = getZodiacForBall(ball, targetYear);
    const wx = WUXING_MAP[ball];
    const wv = WAVE_MAP[ball];
    const pz = z ? zodiacCounts[z] / (total + ALL_ZODIACS.length * ALPHA_LAPLACE) : UNIFORM;
    const pwx = wx ? wuxingCounts[wx] / (total + ALL_WUXING.length * ALPHA_LAPLACE) : UNIFORM;
    const pwv = wv ? waveCounts[wv] / (total + ALL_WAVES.length * ALPHA_LAPLACE) : UNIFORM;
    const score = (pz + pwx + pwv) / 3;
    lvl2Prob[ball] = score;
    lvl2Sum += score;
  }
  for (const ball of ALL_BALLS) {
    lvl2Prob[ball] = lvl2Sum > 0 ? lvl2Prob[ball] / lvl2Sum : UNIFORM;
  }

  // Blend
  const blended: Record<number, number> = {};
  for (const ball of ALL_BALLS) {
    blended[ball] = 0.5 * lvl1Prob[ball] + 0.5 * lvl2Prob[ball];
  }

  const ranked = ALL_BALLS
    .map(ball => ({
      ball,
      probability: blended[ball],
      symbol: {
        ball,
        zodiac: getZodiacForBall(ball, targetYear),
        wuxing: WUXING_MAP[ball] ?? '土',
        wave: WAVE_MAP[ball] ?? '红',
        odd_even: ODD_EVEN_MAP[ball] ?? '单',
      },
    }))
    .sort((a, b) => b.probability - a.probability)
    .map((item, idx) => ({ ...item, rank: idx + 1 }));

  // Signal strength
  const eps = 1e-12;
  let kl = 0;
  for (const ball of ALL_BALLS) {
    const p = blended[ball];
    if (p > 0) kl += p * Math.log(p / UNIFORM + eps);
  }
  const logLossBaseline = -Math.log(UNIFORM);
  let logLossModel = 0;
  for (const ball of ALL_BALLS) {
    const p = Math.max(blended[ball], 1e-6);
    logLossModel += -Math.log(p) / 49;
  }
  const liftBits = logLossBaseline - logLossModel;

  let interpretation: PredictionResult['signalStrength']['interpretation'];
  if (kl < 0.005) interpretation = 'no-signal';
  else if (kl < 0.02) interpretation = 'weak';
  else if (kl < 0.05) interpretation = 'moderate';
  else interpretation = 'strong';

  return {
    ranked,
    signalStrength: {
      kl_divergence: kl,
      log_loss_baseline: logLossBaseline,
      log_loss_model: logLossModel,
      lift_bits: liftBits,
      interpretation,
    },
    dataScope: {
      total_periods: snapshot.periods.length,
      total_draws: total,
    },
  };
}

export function selectBalls(
  ranked: PredictionResult['ranked'],
  mode: 'top-n' | 'cover-n',
  n: number,
): number[] {
  const clamped = Math.max(1, Math.min(45, n));
  if (mode === 'top-n') {
    return ranked.slice(0, clamped).map(r => r.ball);
  }
  return ranked.slice(49 - clamped).map(r => r.ball);
}
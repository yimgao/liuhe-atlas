/**
 * Backtest simulator — run the Top-N / Cover-N strategy against historical periods.
 * Reports honest metrics including expected vs actual hit rate.
 */

import type { Snapshot } from '../types';

export interface BacktestConfig {
  mode: 'top-n' | 'cover-n';
  n: number;
  // Simulate "winning" the special-ball (特码, position=7) bet
  // Standard payout ~47x in legitimate lottery; we'll use this for ROI calc.
  payout_per_unit: number;
  cost_per_unit: number;
}

export interface BacktestResult {
  total_periods: number;
  hits: number;
  hit_rate: number;
  expected_hits_uniform: number;
  lift: number;           // hit_rate - expected_hits_uniform
  expected_roi: number;    // roi if you followed this strategy on every historical period
  cumulative_pnl: number;  // total $ profit/loss on this historical sample
  per_period: Array<{
    period_id: number;
    draw_date: string;
    special: number;          // actual special-ball that period
    selected: number[];       // what we would have picked (using data BEFORE this period)
    hit: boolean;
    pnl: number;
  }>;
}

export function backtest(
  snapshot: Snapshot,
  config: BacktestConfig,
  // We need to re-pick at each historical period using only PRIOR data
  // Since predictor.ts uses the FULL snapshot, we'll pass a sliced snapshot here.
  buildPickFn: (historySoFar: Snapshot) => number[],
): BacktestResult {
  const periods = [...snapshot.periods].sort((a, b) => a.period_id - b.period_id);

  const per_period: BacktestResult['per_period'] = [];
  let hits = 0;
  let cumulativePnl = 0;

  for (let i = 0; i < periods.length; i++) {
    const period = periods[i];
    if (period.numbers.length < 7) continue;

    const historySoFar: Snapshot = {
      ...snapshot,
      periods: periods.slice(0, i),  // strictly prior
    };
    if (historySoFar.periods.length === 0) continue;  // can't predict first period

    const selected = buildPickFn(historySoFar);
    const special = period.numbers.find(n => n.position === 7)?.ball ?? null;
    if (special === null) continue;

    const hit = selected.includes(special);
    if (hit) hits++;
    const pnl = hit ? config.payout_per_unit : -config.cost_per_unit;
    cumulativePnl += pnl;

    per_period.push({
      period_id: period.period_id,
      draw_date: period.draw_date,
      special,
      selected,
      hit,
      pnl,
    });
  }

  const totalPeriods = per_period.length;
  const hitRate = totalPeriods > 0 ? hits / totalPeriods : 0;
  const expectedHitsUniform = (config.n / 49) * totalPeriods;
  const lift = hitRate - config.n / 49;
  const expectedRoi = totalPeriods > 0
    ? (hits * config.payout_per_unit - (totalPeriods - hits) * config.cost_per_unit) / (totalPeriods * config.cost_per_unit)
    : 0;

  return {
    total_periods: totalPeriods,
    hits,
    hit_rate: hitRate,
    expected_hits_uniform: expectedHitsUniform,
    lift,
    expected_roi: expectedRoi,
    cumulative_pnl: cumulativePnl,
    per_period,
  };
}

/**
 * Expected loss calculator — show how much you'd lose over N periods at current selection.
 * 
 * Honest model: betting is a binary outcome.
 * - You pay `cost_per_period` to play
 * - If your N balls cover the winning special-ball (probability ~ N/49 if uniform), 
 *   you receive `payout` total — net = payout - cost
 * - Otherwise net = -cost
 *
 * Under fair-RNG assumption, expected ROI = (N/49) × payout - cost_per_period all divided by cost.
 * For any payout < 49, expected value is negative as N approaches 49.
 *
 * The "sobering widget" — math says if you did this 156 times a year for 10 years,
 * here's where you'd be.
 */
export function expectedLoss(config: {
  periods_per_year: number;
  years: number;
  cost_per_period: number;
  n: number;     // balls selected
  payout: number;
}): {
  total_cost: number;
  total_expected_payout: number;
  expected_pnl: number;
  expected_pnl_pct: number;
  expected_hits: number;
  interpretation: string;
} {
  const totalPeriods = config.periods_per_year * config.years;
  const totalCost = totalPeriods * config.cost_per_period;

  // Probability of winning = n/49 (uniform baseline; Bayesian model output would be similar)
  const winProb = Math.min(config.n / 49, 1);
  const loseProb = 1 - winProb;

  // Per-period expected net: win → +(payout - cost), lose → -cost
  const expectedNetPerPeriod = winProb * (config.payout - config.cost_per_period) - loseProb * config.cost_per_period;
  // = winProb * payout - cost_per_period
  const totalExpectedPayout = totalPeriods * winProb * config.payout;
  const expectedPnl = totalPeriods * expectedNetPerPeriod;
  const expectedPnlPct = expectedPnl / totalCost;
  const expectedHits = totalPeriods * winProb;

  let interpretation: string;
  if (config.payout >= 49 && config.n >= 45) {
    interpretation = `With payout=${config.payout}× and N=${config.n} near max coverage, this is approximately fair — but variance is huge.`;
  } else if (expectedPnlPct < -0.5) {
    interpretation = `Under honest assumptions, you'd lose over half your stake over ${config.years} years.`;
  } else if (expectedPnlPct < -0.1) {
    interpretation = `Math says you lose ~${(Math.abs(expectedPnlPct) * 100).toFixed(0)}% of stake over ${config.years} years.`;
  } else if (expectedPnlPct < 0) {
    interpretation = `Expected slight loss (~${(Math.abs(expectedPnlPct) * 100).toFixed(1)}%) over ${config.years} years.`;
  } else if (expectedPnlPct > 0.5) {
    interpretation = `Mathematically positive — but only because payout (${config.payout}) exceeds 1/(N/49)=${(49/config.n).toFixed(1)}. Real lottery payout rarely exceeds this without rakes.`;
  } else {
    interpretation = `Near-zero expected return. Variance dominates over short horizons.`;
  }

  return {
    total_cost: totalCost,
    total_expected_payout: totalExpectedPayout,
    expected_pnl: expectedPnl,
    expected_pnl_pct: expectedPnlPct,
    expected_hits: expectedHits,
    interpretation,
  };
}
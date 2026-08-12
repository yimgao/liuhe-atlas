// Client-side replacement for the old FastAPI-backed src/api.ts. Computes
// recommendations and backtests directly from the static snapshot, ported
// from backend/app/api/recommendations.py and backend/app/api/backtests.py.

import type { BacktestResponse, RecommendationsResponse } from '../types';
import { runBacktest } from './backtest';
import { ALPHA, MODEL_NAME, MODEL_VERSION, gapSinceLastSeen, isInsufficientHistory, scoreSpecialNumbers } from './scoring';
import { latestDraw, loadPeriods, specialNumberHistory } from './snapshot';

const DISCLAIMER = '模型估计不代表真实中奖概率或中奖保证。';
const INSUFFICIENT_HISTORY_WARNING = '历史样本不足，排名主要反映抽样噪声';
const RELIABLE_EDGE_SUMMARY = '在样本外回测中相对随机基线发现统计显著优势。';
const NO_EDGE_SUMMARY = '未发现可靠预测优势，当前排名主要反映历史频率的抽样噪声。';

export { SnapshotError } from './snapshot';

export async function fetchRecommendations(count: number): Promise<RecommendationsResponse> {
  const periods = await loadPeriods();
  const history = specialNumberHistory(periods);
  const scores = scoreSpecialNumbers(history);
  const sampleCount = history.length;
  const dataQuality = isInsufficientHistory(sampleCount) ? 'insufficient_history' : 'ok';

  return {
    target: 'next_special_number',
    requested_count: count,
    model: { name: MODEL_NAME, version: MODEL_VERSION, alpha: ALPHA },
    latest_draw: latestDraw(periods),
    sample_count: sampleCount,
    data_quality: dataQuality,
    warning: dataQuality === 'insufficient_history' ? INSUFFICIENT_HISTORY_WARNING : null,
    recommendations: scores.slice(0, count).map((s, i) => ({
      rank: i + 1,
      ball: s.ball,
      estimated_probability: s.probability,
      historical_count: s.count,
      gap_draws: gapSinceLastSeen(history, s.ball),
    })),
    generated_at: new Date().toISOString(),
    disclaimer: DISCLAIMER,
  };
}

export async function fetchLatestBacktest(): Promise<BacktestResponse> {
  const periods = await loadPeriods();
  const history = specialNumberHistory(periods);
  const result = runBacktest(history);

  return {
    model: { name: MODEL_NAME, version: MODEL_VERSION, alpha: ALPHA },
    test_period_count: result.testPeriodCount,
    generated_at: new Date().toISOString(),
    metrics: result.metrics.map((m) => ({
      n: m.n,
      test_period_count: m.testPeriodCount,
      hit_count: m.hitCount,
      hit_rate: m.hitRate,
      baseline_hit_rate: m.baselineHitRate,
      hit_rate_ci_low: m.hitRateCiLow,
      hit_rate_ci_high: m.hitRateCiHigh,
      delta_vs_baseline: m.deltaVsBaseline,
      brier_score: m.brierScore,
    })),
    reliable_edge_found: result.reliableEdgeFound,
    summary: result.reliableEdgeFound ? RELIABLE_EDGE_SUMMARY : NO_EDGE_SUMMARY,
  };
}

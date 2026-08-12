import type { BacktestResponse, RecommendationsResponse } from '../../types';

export function makeRecommendations(
  count: number,
  overrides: Partial<RecommendationsResponse> = {},
): RecommendationsResponse {
  return {
    target: 'next_special_number',
    requested_count: count,
    model: { name: 'dirichlet_frequency', version: '1.0.0', alpha: 1 },
    latest_draw: {
      period_id: 2026123,
      draw_date: '2026-08-10',
      special_number: 7,
    },
    sample_count: 200,
    data_quality: 'ok',
    warning: null,
    recommendations: Array.from({ length: count }, (_, i) => ({
      rank: i + 1,
      ball: i + 1,
      estimated_probability: 1 / 49 - i * 0.0001,
      historical_count: 10 - i,
      gap_draws: i,
    })),
    generated_at: '2026-08-12T00:00:00Z',
    disclaimer: '模型估计不代表真实中奖概率或中奖保证。',
    ...overrides,
  };
}

export function makeBacktest(overrides: Partial<BacktestResponse> = {}): BacktestResponse {
  return {
    model: { name: 'dirichlet_frequency', version: '1.0.0', alpha: 1 },
    test_period_count: 0,
    generated_at: '2026-08-12T00:00:00Z',
    metrics: [],
    reliable_edge_found: false,
    summary: '未发现可靠预测优势，当前排名主要反映历史频率的抽样噪声。',
    ...overrides,
  };
}

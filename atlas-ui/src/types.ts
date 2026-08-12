// Domain types mirroring backend/app/schemas.py

export interface ModelInfo {
  name: string;
  version: string;
  alpha: number;
}

export interface LatestDrawInfo {
  period_id: number;
  draw_date: string;
  special_number: number;
}

export interface RecommendationItem {
  rank: number;
  ball: number;
  estimated_probability: number;
  historical_count: number;
  gap_draws: number | null;
}

export interface RecommendationsResponse {
  target: 'next_special_number';
  requested_count: number;
  model: ModelInfo;
  latest_draw: LatestDrawInfo | null;
  sample_count: number;
  data_quality: 'ok' | 'insufficient_history';
  warning: string | null;
  recommendations: RecommendationItem[];
  generated_at: string;
  disclaimer: string;
}

export interface NValueMetric {
  n: number;
  test_period_count: number;
  hit_count: number;
  hit_rate: number;
  baseline_hit_rate: number;
  hit_rate_ci_low: number;
  hit_rate_ci_high: number;
  delta_vs_baseline: number;
  brier_score: number | null;
}

export interface BacktestResponse {
  model: ModelInfo;
  test_period_count: number;
  generated_at: string;
  metrics: NValueMetric[];
  reliable_edge_found: boolean;
  summary: string;
}

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel

DISCLAIMER = "模型估计不代表真实中奖概率或中奖保证。"
INSUFFICIENT_HISTORY_WARNING = "历史样本不足，排名主要反映抽样噪声"


class ModelInfo(BaseModel):
    name: str
    version: str
    alpha: float


class LatestDrawInfo(BaseModel):
    period_id: int
    draw_date: date
    special_number: int


class RecommendationItem(BaseModel):
    rank: int
    ball: int
    estimated_probability: float
    historical_count: int
    gap_draws: int | None


class RecommendationsResponse(BaseModel):
    target: Literal["next_special_number"] = "next_special_number"
    requested_count: int
    model: ModelInfo
    latest_draw: LatestDrawInfo | None
    sample_count: int
    data_quality: Literal["ok", "insufficient_history"]
    warning: str | None = None
    recommendations: list[RecommendationItem]
    generated_at: datetime
    disclaimer: str = DISCLAIMER


class DrawNumberOut(BaseModel):
    position: int
    ball: int


class DrawOut(BaseModel):
    lottery_type: int
    period_id: int
    draw_date: date
    numbers: list[DrawNumberOut]


class DrawsListResponse(BaseModel):
    total: int
    limit: int
    offset: int
    draws: list[DrawOut]


class HealthResponse(BaseModel):
    status: Literal["ok"]
    database: Literal["ok", "error"]


class NValueMetric(BaseModel):
    n: int
    test_period_count: int
    hit_count: int
    hit_rate: float
    baseline_hit_rate: float
    hit_rate_ci_low: float
    hit_rate_ci_high: float
    delta_vs_baseline: float
    brier_score: float | None


class BacktestResponse(BaseModel):
    model: ModelInfo
    test_period_count: int
    generated_at: datetime
    metrics: list[NValueMetric]
    reliable_edge_found: bool
    summary: str

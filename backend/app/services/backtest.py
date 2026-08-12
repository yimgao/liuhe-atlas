"""Walk-forward backtest: period t is predicted using only draws strictly
before t (no future-data leakage). Compares hit rate against the random
baseline N/49 with a Wilson 95% confidence interval.
"""
import math
from dataclasses import dataclass

from app.services.scoring import BALL_RANGE, score_special_numbers

Z_95 = 1.959963984540054
MIN_TRAIN_SIZE = 10
N_VALUES = range(1, 41)


@dataclass(frozen=True)
class NMetric:
    n: int
    test_period_count: int
    hit_count: int
    hit_rate: float
    baseline_hit_rate: float
    hit_rate_ci_low: float
    hit_rate_ci_high: float
    delta_vs_baseline: float
    brier_score: float | None


@dataclass(frozen=True)
class BacktestResult:
    test_period_count: int
    metrics: list[NMetric]
    reliable_edge_found: bool


def wilson_ci(hit_count: int, n: int, z: float = Z_95) -> tuple[float, float]:
    if n == 0:
        return (0.0, 1.0)
    p = hit_count / n
    denom = 1 + z * z / n
    center = p + z * z / (2 * n)
    margin = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))
    low = max(0.0, (center - margin) / denom)
    high = min(1.0, (center + margin) / denom)
    return (low, high)


def run_backtest(
    history: list[int], min_train_size: int = MIN_TRAIN_SIZE, n_values: range = N_VALUES
) -> BacktestResult:
    """history: chronological special numbers (oldest first)."""
    hit_counts = {n: 0 for n in n_values}
    brier_sum = 0.0
    test_period_count = 0

    for t in range(min_train_size, len(history)):
        train = history[:t]
        actual = history[t]
        scores = score_special_numbers(train)
        ranked_balls = [s.ball for s in scores]
        prob_by_ball = {s.ball: s.probability for s in scores}

        test_period_count += 1
        for n in n_values:
            if actual in ranked_balls[:n]:
                hit_counts[n] += 1

        brier_sum += sum(
            (prob_by_ball[ball] - (1.0 if ball == actual else 0.0)) ** 2 for ball in BALL_RANGE
        )

    brier_score = brier_sum / test_period_count if test_period_count else None

    metrics = []
    reliable_edge_found = False
    for n in n_values:
        hit_count = hit_counts[n]
        hit_rate = hit_count / test_period_count if test_period_count else 0.0
        baseline = n / len(BALL_RANGE)
        ci_low, ci_high = wilson_ci(hit_count, test_period_count)
        delta = hit_rate - baseline

        # A "reliable" edge requires the whole 95% CI to sit above baseline.
        if test_period_count > 0 and ci_low > baseline:
            reliable_edge_found = True

        metrics.append(
            NMetric(
                n=n,
                test_period_count=test_period_count,
                hit_count=hit_count,
                hit_rate=hit_rate,
                baseline_hit_rate=baseline,
                hit_rate_ci_low=ci_low,
                hit_rate_ci_high=ci_high,
                delta_vs_baseline=delta,
                brier_score=brier_score,
            )
        )

    return BacktestResult(
        test_period_count=test_period_count, metrics=metrics, reliable_edge_found=reliable_edge_found
    )

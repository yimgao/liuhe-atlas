"""MVP scoring model: Dirichlet/Laplace-smoothed frequency over historical
special numbers (position=7 draws only).

p_i = (count_i + alpha) / (sample_count + 49 * alpha)

Deliberately does not implement "gap since last seen" or "last-period
demotion" heuristics — see spec 4.5. Those require versioned, out-of-sample
evidence before they can be enabled.
"""
from dataclasses import dataclass

BALL_RANGE = range(1, 50)  # 1-49 inclusive
ALPHA = 1.0
MODEL_NAME = "dirichlet_frequency"
MODEL_VERSION = "1.0.0"
INSUFFICIENT_HISTORY_THRESHOLD = 100


@dataclass(frozen=True)
class BallScore:
    ball: int
    probability: float
    count: int


def score_special_numbers(history: list[int], alpha: float = ALPHA) -> list[BallScore]:
    """history: special numbers (position=7 balls) in chronological order.

    Returns all 49 balls ranked by probability desc, count desc, ball asc.
    Probabilities always sum to 1 within 1e-12.
    """
    counts = {ball: 0 for ball in BALL_RANGE}
    for ball in history:
        counts[ball] += 1

    sample_count = len(history)
    denominator = sample_count + len(BALL_RANGE) * alpha

    scores = [
        BallScore(ball=ball, probability=(counts[ball] + alpha) / denominator, count=counts[ball])
        for ball in BALL_RANGE
    ]
    scores.sort(key=lambda s: (-s.probability, -s.count, s.ball))
    return scores


def gap_since_last_seen(history: list[int], ball: int) -> int | None:
    """Number of draws since `ball` last appeared as the special number.

    0 means it appeared in the most recent draw. None means it has never
    appeared in the given history.
    """
    for gap, seen in enumerate(reversed(history)):
        if seen == ball:
            return gap
    return None


def is_insufficient_history(sample_count: int) -> bool:
    return sample_count < INSUFFICIENT_HISTORY_THRESHOLD

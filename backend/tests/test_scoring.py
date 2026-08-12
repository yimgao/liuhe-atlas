from app.services.scoring import (
    BallScore,
    gap_since_last_seen,
    is_insufficient_history,
    score_special_numbers,
)


def test_probabilities_sum_to_one_within_tolerance():
    history = [1, 2, 3, 1, 1, 7, 20, 20, 49] * 5
    scores = score_special_numbers(history)
    assert abs(sum(s.probability for s in scores) - 1.0) < 1e-12


def test_probabilities_sum_to_one_for_empty_history():
    scores = score_special_numbers([])
    assert abs(sum(s.probability for s in scores) - 1.0) < 1e-12


def test_returns_all_49_balls():
    scores = score_special_numbers([5, 5, 5])
    assert len(scores) == 49
    assert {s.ball for s in scores} == set(range(1, 50))


def test_empty_history_gives_uniform_distribution():
    scores = score_special_numbers([])
    probs = {s.probability for s in scores}
    assert probs == {1 / 49}


def test_more_frequent_ball_ranks_higher():
    history = [8] * 10 + [3] * 2
    scores = score_special_numbers(history)
    assert scores[0].ball == 8
    assert scores[0].count == 10


def test_sort_order_is_probability_desc_then_count_desc_then_ball_asc():
    # balls 5 and 9 tied on count -> ball 5 must sort before ball 9
    history = [5, 9]
    scores = score_special_numbers(history)
    tied = [s for s in scores if s.count == 1]
    tied_balls = [s.ball for s in tied]
    assert tied_balls == sorted(tied_balls)
    assert tied_balls.index(5) < tied_balls.index(9)


def test_deterministic_for_same_input():
    history = [1, 2, 3, 4, 4, 4, 10, 22, 37]
    first = score_special_numbers(history)
    second = score_special_numbers(history)
    assert first == second


def test_dirichlet_smoothing_formula():
    history = [7] * 3 + [8] * 2
    scores = {s.ball: s for s in score_special_numbers(history)}
    sample_count = len(history)
    denom = sample_count + 49
    assert abs(scores[7].probability - (3 + 1) / denom) < 1e-12
    assert abs(scores[1].probability - (0 + 1) / denom) < 1e-12


def test_gap_since_last_seen_zero_for_most_recent_draw():
    assert gap_since_last_seen([1, 2, 3], 3) == 0


def test_gap_since_last_seen_counts_draws_since():
    assert gap_since_last_seen([9, 1, 2, 3], 9) == 3


def test_gap_since_last_seen_none_when_never_seen():
    assert gap_since_last_seen([1, 2, 3], 49) is None


def test_gap_since_last_seen_empty_history():
    assert gap_since_last_seen([], 1) is None


def test_insufficient_history_threshold():
    assert is_insufficient_history(0) is True
    assert is_insufficient_history(99) is True
    assert is_insufficient_history(100) is False
    assert is_insufficient_history(500) is False


def test_ball_score_is_frozen_dataclass():
    score = BallScore(ball=1, probability=0.5, count=1)
    assert score.ball == 1

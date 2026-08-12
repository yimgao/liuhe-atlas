from unittest.mock import patch

from app.services.backtest import run_backtest, wilson_ci
from app.services import scoring


def test_wilson_ci_zero_trials_returns_maximally_uncertain_range():
    low, high = wilson_ci(0, 0)
    assert low == 0.0
    assert high == 1.0


def test_wilson_ci_all_hits_skews_high():
    low, high = wilson_ci(10, 10)
    assert low > 0.6
    assert high > 0.999999


def test_wilson_ci_no_hits_skews_low():
    low, high = wilson_ci(0, 10)
    assert low == 0.0
    assert high < 0.4


def test_wilson_ci_widens_as_sample_size_shrinks():
    _, high_small_n = wilson_ci(1, 2)
    _, high_large_n = wilson_ci(50, 100)
    assert (high_small_n - 0.5) > (high_large_n - 0.5)


def test_run_backtest_zero_test_periods_when_history_shorter_than_warmup():
    result = run_backtest(history=[1, 2, 3], min_train_size=10)
    assert result.test_period_count == 0
    assert result.reliable_edge_found is False
    assert all(m.brier_score is None for m in result.metrics)
    assert all(m.hit_rate == 0.0 for m in result.metrics)


def test_run_backtest_test_period_count_matches_history_length_minus_warmup():
    history = list(range(1, 21))  # 20 distinct draws, warmup=10 -> 10 test points
    result = run_backtest(history=history, min_train_size=10)
    assert result.test_period_count == 10
    assert all(m.test_period_count == 10 for m in result.metrics)


def test_run_backtest_returns_49_n_metrics():
    history = list(range(1, 21))
    result = run_backtest(history=history, min_train_size=10)
    assert [m.n for m in result.metrics] == list(range(1, 41))


def test_run_backtest_baseline_is_n_over_49():
    history = [1] * 15
    result = run_backtest(history=history, min_train_size=10)
    for m in result.metrics:
        assert abs(m.baseline_hit_rate - m.n / 49) < 1e-12


def test_run_backtest_hit_count_matches_manual_expectation_for_repeating_ball():
    # After enough repeats of ball 7, the model always ranks 7 first, so
    # every post-warmup test period should hit for N=1.
    history = [7] * 20
    result = run_backtest(history=history, min_train_size=10)
    n1 = next(m for m in result.metrics if m.n == 1)
    assert n1.hit_count == result.test_period_count
    assert n1.hit_rate == 1.0


def test_run_backtest_never_trains_on_future_draws():
    history = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    seen_train_sets = []

    original = scoring.score_special_numbers

    def spy(train, *args, **kwargs):
        seen_train_sets.append(list(train))
        return original(train, *args, **kwargs)

    with patch("app.services.backtest.score_special_numbers", side_effect=spy):
        run_backtest(history=history, min_train_size=5)

    for i, train in enumerate(seen_train_sets):
        t = 5 + i  # first test index is min_train_size
        assert train == history[:t]
        assert history[t] not in train or history[t] in history[:t]  # no leakage of the tested value itself
        assert len(train) == t


def test_reliable_edge_found_false_for_uniform_random_like_history():
    # a short, evenly spread history shouldn't produce a statistically
    # significant edge over the random baseline
    history = list(range(1, 50)) * 2  # each ball appears twice, in order
    result = run_backtest(history=history, min_train_size=10)
    assert result.reliable_edge_found is False


def test_reliable_edge_found_true_for_strongly_biased_history():
    # ball 3 appears far more often than chance would predict -> after
    # enough evidence, the CI lower bound for N=1 should clear baseline
    history = ([3] * 30 + [4, 5, 6]) * 3
    result = run_backtest(history=history, min_train_size=10)
    assert result.reliable_edge_found is True

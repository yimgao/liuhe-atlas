import pytest

from app.services.validator import parse_draw_date, validate_balls


def test_validate_balls_accepts_seven_valid_numeric_strings():
    result = validate_balls(["1", "2", "3", "4", "5", "6", "7"])
    assert result.valid
    assert result.balls == [1, 2, 3, 4, 5, 6, 7]


def test_validate_balls_rejects_fewer_than_seven():
    result = validate_balls(["1", "2", "3"])
    assert not result.valid
    assert "expected 7" in result.reason


def test_validate_balls_rejects_out_of_range():
    result = validate_balls(["0", "2", "3", "4", "5", "6", "50"])
    assert not result.valid


def test_validate_balls_rejects_duplicates():
    result = validate_balls(["1", "1", "3", "4", "5", "6", "7"])
    assert not result.valid
    assert "duplicate" in result.reason


def test_validate_balls_skips_non_numeric_promo_text():
    # legacy sources sometimes return Chinese promo text instead of numbers
    result = validate_balls(["六合宝典开奖快", "2", "3", "4", "5", "6", "7"])
    assert not result.valid
    assert "expected 7" in result.reason


def test_validate_balls_only_considers_first_seven_entries():
    result = validate_balls(["1", "2", "3", "4", "5", "6", "7", "8", "9"])
    assert result.valid
    assert result.balls == [1, 2, 3, 4, 5, 6, 7]


def test_parse_draw_date():
    assert parse_draw_date("2026年08月12日21时32分 星期三").isoformat() == "2026-08-12"


def test_parse_draw_date_rejects_unrecognized_format():
    with pytest.raises(ValueError):
        parse_draw_date("not a date")

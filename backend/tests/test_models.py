import datetime

import pytest
from sqlalchemy.exc import IntegrityError

from app.models import Draw, DrawNumber


def _make_draw(lottery_type=1, period_id=2026001):
    return Draw(
        lottery_type=lottery_type,
        period_id=period_id,
        draw_date=datetime.date(2026, 1, 1),
        source_url="https://example.com",
        fetched_at=datetime.datetime(2026, 1, 1, 12, 0, 0),
    )


def _valid_numbers(lottery_type=1, period_id=2026001):
    balls = [1, 2, 3, 4, 5, 6, 7]
    return [
        DrawNumber(lottery_type=lottery_type, period_id=period_id, position=i + 1, ball=balls[i])
        for i in range(7)
    ]


def test_valid_draw_with_seven_numbers_persists(db_session):
    draw = _make_draw()
    draw.numbers.extend(_valid_numbers())
    db_session.add(draw)
    db_session.commit()

    stored = db_session.get(Draw, (1, 2026001))
    assert stored is not None
    assert len(stored.numbers) == 7


def test_position_out_of_range_rejected(db_session):
    db_session.add(_make_draw())
    db_session.commit()

    db_session.add(DrawNumber(lottery_type=1, period_id=2026001, position=8, ball=10))
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_position_zero_rejected(db_session):
    db_session.add(_make_draw())
    db_session.commit()

    db_session.add(DrawNumber(lottery_type=1, period_id=2026001, position=0, ball=10))
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_ball_out_of_range_rejected(db_session):
    db_session.add(_make_draw())
    db_session.commit()

    db_session.add(DrawNumber(lottery_type=1, period_id=2026001, position=1, ball=50))
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_duplicate_ball_within_same_period_rejected(db_session):
    draw = _make_draw()
    db_session.add(draw)
    db_session.add(DrawNumber(lottery_type=1, period_id=2026001, position=1, ball=10))
    db_session.commit()

    db_session.add(DrawNumber(lottery_type=1, period_id=2026001, position=2, ball=10))
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_same_ball_across_different_positions_not_a_conflict_when_different_period(db_session):
    db_session.add(_make_draw(period_id=2026001))
    db_session.add(_make_draw(period_id=2026002))
    db_session.add(DrawNumber(lottery_type=1, period_id=2026001, position=1, ball=10))
    db_session.add(DrawNumber(lottery_type=1, period_id=2026002, position=1, ball=10))
    db_session.commit()

    assert db_session.get(DrawNumber, (1, 2026001, 1)).ball == 10
    assert db_session.get(DrawNumber, (1, 2026002, 1)).ball == 10


def test_different_lottery_types_same_period_id_do_not_collide(db_session):
    db_session.add(_make_draw(lottery_type=1, period_id=2026001))
    db_session.add(_make_draw(lottery_type=2, period_id=2026001))
    db_session.commit()

    assert db_session.get(Draw, (1, 2026001)) is not None
    assert db_session.get(Draw, (2, 2026001)) is not None


def test_draw_number_without_matching_draw_rejected_by_foreign_key(db_session):
    db_session.add(DrawNumber(lottery_type=1, period_id=9999999, position=1, ball=1))
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_composite_primary_key_prevents_duplicate_period_row(db_session):
    db_session.add(_make_draw())
    db_session.commit()

    db_session.add(_make_draw())
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()

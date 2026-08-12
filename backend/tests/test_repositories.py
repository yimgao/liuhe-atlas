import datetime

from app.models import Draw
from app.repositories.draws import (
    count_draws,
    get_latest_draw,
    get_special_number_history,
    list_draws,
    upsert_draw,
)


def _upsert(session, lottery_type, period_id, balls, source_url="https://example.com", when=None, draw_date=None):
    return upsert_draw(
        session,
        lottery_type=lottery_type,
        period_id=period_id,
        draw_date=draw_date or datetime.date(2026, 1, 1),
        balls=balls,
        source_url=source_url,
        fetched_at=when or datetime.datetime(2026, 1, 1, 12, 0, 0),
    )


def test_upsert_creates_new_draw_with_numbers(db_session):
    _upsert(db_session, 1, 2026001, [1, 2, 3, 4, 5, 6, 7])
    db_session.commit()

    draw = db_session.get(Draw, (1, 2026001))
    assert draw is not None
    assert [n.ball for n in sorted(draw.numbers, key=lambda n: n.position)] == [1, 2, 3, 4, 5, 6, 7]


def test_upsert_is_idempotent_for_same_period(db_session):
    _upsert(db_session, 1, 2026001, [1, 2, 3, 4, 5, 6, 7])
    db_session.commit()

    _upsert(db_session, 1, 2026001, [10, 20, 30, 40, 41, 42, 43], source_url="https://updated.example.com")
    db_session.commit()

    assert db_session.query(Draw).count() == 1
    draw = db_session.get(Draw, (1, 2026001))
    assert [n.ball for n in sorted(draw.numbers, key=lambda n: n.position)] == [10, 20, 30, 40, 41, 42, 43]
    assert draw.source_url == "https://updated.example.com"


def test_upsert_does_not_overwrite_a_different_lottery_type_with_same_period_id(db_session):
    _upsert(db_session, 1, 2026001, [1, 2, 3, 4, 5, 6, 7])
    _upsert(db_session, 2, 2026001, [11, 12, 13, 14, 15, 16, 17])
    db_session.commit()

    draw_1 = db_session.get(Draw, (1, 2026001))
    draw_2 = db_session.get(Draw, (2, 2026001))
    assert [n.ball for n in sorted(draw_1.numbers, key=lambda n: n.position)] == [1, 2, 3, 4, 5, 6, 7]
    assert [n.ball for n in sorted(draw_2.numbers, key=lambda n: n.position)] == [11, 12, 13, 14, 15, 16, 17]

    # re-upserting one lottery_type must not touch the other
    _upsert(db_session, 1, 2026001, [21, 22, 23, 24, 25, 26, 27])
    db_session.commit()
    draw_2_after = db_session.get(Draw, (2, 2026001))
    assert [n.ball for n in sorted(draw_2_after.numbers, key=lambda n: n.position)] == [11, 12, 13, 14, 15, 16, 17]


def test_get_special_number_history_returns_position_7_in_chronological_order(db_session):
    _upsert(db_session, 1, 2026001, [1, 2, 3, 4, 5, 6, 10], draw_date=datetime.date(2026, 1, 1))
    _upsert(db_session, 1, 2026002, [1, 2, 3, 4, 5, 6, 20], draw_date=datetime.date(2026, 1, 3))
    _upsert(db_session, 1, 2026000, [1, 2, 3, 4, 5, 6, 30], draw_date=datetime.date(2025, 12, 30))
    db_session.commit()

    assert get_special_number_history(db_session, 1) == [30, 10, 20]


def test_get_special_number_history_ignores_other_lottery_types(db_session):
    _upsert(db_session, 1, 2026001, [1, 2, 3, 4, 5, 6, 10])
    _upsert(db_session, 2, 2026001, [1, 2, 3, 4, 5, 6, 40])
    db_session.commit()

    assert get_special_number_history(db_session, 1) == [10]
    assert get_special_number_history(db_session, 2) == [40]


def test_get_special_number_history_empty_when_no_draws(db_session):
    assert get_special_number_history(db_session, 1) == []


def test_get_latest_draw_returns_most_recent_by_draw_date(db_session):
    _upsert(db_session, 1, 2026001, [1, 2, 3, 4, 5, 6, 10], draw_date=datetime.date(2026, 1, 1))
    _upsert(db_session, 1, 2026002, [1, 2, 3, 4, 5, 6, 20], draw_date=datetime.date(2026, 1, 5))
    db_session.commit()

    latest = get_latest_draw(db_session, 1)
    assert latest.period_id == 2026002


def test_get_latest_draw_none_when_empty(db_session):
    assert get_latest_draw(db_session, 1) is None


def test_list_draws_pagination(db_session):
    for i in range(5):
        _upsert(db_session, 1, 2026001 + i, [1, 2, 3, 4, 5, 6, 10 + i], draw_date=datetime.date(2026, 1, 1 + i))
    db_session.commit()

    page1 = list_draws(db_session, 1, limit=2, offset=0)
    page2 = list_draws(db_session, 1, limit=2, offset=2)

    assert [d.period_id for d in page1] == [2026005, 2026004]
    assert [d.period_id for d in page2] == [2026003, 2026002]


def test_count_draws(db_session):
    _upsert(db_session, 1, 2026001, [1, 2, 3, 4, 5, 6, 10])
    _upsert(db_session, 1, 2026002, [1, 2, 3, 4, 5, 6, 20])
    _upsert(db_session, 2, 2026001, [1, 2, 3, 4, 5, 6, 30])
    db_session.commit()

    assert count_draws(db_session, 1) == 2
    assert count_draws(db_session, 2) == 1

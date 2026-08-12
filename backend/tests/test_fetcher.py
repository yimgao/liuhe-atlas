from unittest.mock import patch

from app.services import fetcher


def _bible_payload(period=223, year=2026, balls=None, title="2026年08月12日21时32分 星期三"):
    balls = balls or ["21", "43", "01", "38", "29", "44", "23"]
    return {
        "period": period,
        "year": year,
        "originalDataList": balls,
        "title": title,
        "lotteryType": 2,
    }


def test_normalize_bible_source():
    normalized = fetcher.normalize("六合宝典", fetcher.SOURCES[0], _bible_payload(), lottery_type=2)
    assert normalized["period_id"] == 2026223
    assert normalized["balls_raw"] == ["21", "43", "01", "38", "29", "44", "23"]
    assert normalized["draw_date_raw"] == "2026年08月12日21时32分 星期三"


def test_fetch_one_returns_normalized_draw_on_first_source_success():
    session = object()
    with patch.object(fetcher, "fetch_latest", return_value=_bible_payload()) as mock_fetch:
        result = fetcher.fetch_one(2, session)

    assert mock_fetch.call_count == 1
    assert result["period_id"] == 2026223
    assert result["balls"] == [21, 43, 1, 38, 29, 44, 23]
    assert result["draw_date"].isoformat() == "2026-08-12"


def _tuku_payload(period=223, year=2026, balls=None, lottery_time="2026年08月12日21时32分 星期三"):
    balls = balls or ["21", "43", "01", "38", "29", "44", "23"]
    return {"period": period, "year": year, "numberList": balls, "lotteryTime": lottery_time}


def test_fetch_one_falls_back_to_second_source_when_first_fails():
    session = object()

    def side_effect(src, sess, lottery_type):
        if src["name"] == "六合宝典":
            raise RuntimeError("primary source down")
        return _tuku_payload()

    with patch.object(fetcher, "fetch_latest", side_effect=side_effect) as mock_fetch:
        result = fetcher.fetch_one(2, session)

    assert mock_fetch.call_count == 2
    assert result is not None
    assert result["balls"] == [21, 43, 1, 38, 29, 44, 23]


def test_fetch_one_returns_none_when_all_sources_invalid():
    session = object()
    promo_payload = _bible_payload(balls=["六合宝典开奖快", "2", "3", "4", "5", "6", "7"])
    with patch.object(fetcher, "fetch_latest", return_value=promo_payload):
        result = fetcher.fetch_one(2, session)

    assert result is None


def test_fetch_one_returns_none_when_all_sources_raise():
    session = object()
    with patch.object(fetcher, "fetch_latest", side_effect=RuntimeError("boom")):
        result = fetcher.fetch_one(2, session)

    assert result is None


def test_run_reports_zero_failures_on_full_success(db_session):
    normalized_by_type = {
        2: {**_normalized_stub(2, 2026223), },
        1: {**_normalized_stub(1, 2026087), },
    }

    def fake_fetch_one(lottery_type, session):
        return normalized_by_type[lottery_type]

    with patch.object(fetcher, "SessionLocal", return_value=db_session), \
         patch.object(fetcher, "fetch_one", side_effect=fake_fetch_one), \
         patch.object(fetcher, "make_session", return_value=object()):
        failures = fetcher.run([2, 1])

    assert failures == 0


def test_run_counts_failures_and_still_processes_others(db_session):
    def fake_fetch_one(lottery_type, session):
        if lottery_type == 2:
            return None
        return _normalized_stub(1, 2026087)

    with patch.object(fetcher, "SessionLocal", return_value=db_session), \
         patch.object(fetcher, "fetch_one", side_effect=fake_fetch_one), \
         patch.object(fetcher, "make_session", return_value=object()):
        failures = fetcher.run([2, 1])

    assert failures == 1


def _normalized_stub(lottery_type, period_id):
    import datetime

    return {
        "lottery_type": lottery_type,
        "period_id": period_id,
        "balls": [1, 2, 3, 4, 5, 6, 7],
        "draw_date": datetime.date(2026, 8, 12),
        "source_url": "https://example.com",
    }

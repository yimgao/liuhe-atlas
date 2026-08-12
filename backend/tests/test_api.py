import datetime

import pytest
from fastapi.testclient import TestClient

from app.db import get_db
from app.main import app
from app.repositories.draws import upsert_draw


@pytest.fixture()
def client(db_session):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()


def _seed(session, lottery_type=2, n=5, start_period=2026001):
    for i in range(n):
        upsert_draw(
            session,
            lottery_type=lottery_type,
            period_id=start_period + i,
            draw_date=datetime.date(2026, 1, 1) + datetime.timedelta(days=i),
            balls=[1, 2, 3, 4, 5, 6, 10 + (i % 40)],
            source_url="https://example.com",
            fetched_at=datetime.datetime(2026, 1, 1, 12, 0, 0),
        )
    session.commit()


def test_health(client):
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert body["database"] == "ok"


def test_recommendations_default_count(client, db_session):
    _seed(db_session)
    resp = client.get("/api/v1/recommendations")
    assert resp.status_code == 200
    body = resp.json()
    assert body["requested_count"] == 20
    assert len(body["recommendations"]) == 20
    assert body["target"] == "next_special_number"


def test_recommendations_field_is_estimated_probability_not_real_probability(client, db_session):
    _seed(db_session)
    resp = client.get("/api/v1/recommendations?count=1")
    body = resp.json()
    assert "estimated_probability" in body["recommendations"][0]
    assert "real_probability" not in body["recommendations"][0]
    assert "disclaimer" in body


def test_recommendations_count_1_returns_one_item(client, db_session):
    _seed(db_session)
    resp = client.get("/api/v1/recommendations?count=1")
    assert resp.status_code == 200
    assert len(resp.json()["recommendations"]) == 1


def test_recommendations_count_40_returns_forty_items(client, db_session):
    _seed(db_session)
    resp = client.get("/api/v1/recommendations?count=40")
    assert resp.status_code == 200
    assert len(resp.json()["recommendations"]) == 40


@pytest.mark.parametrize("bad_count", [0, 41, "abc", 1.5])
def test_recommendations_invalid_count_returns_422(client, db_session, bad_count):
    _seed(db_session)
    resp = client.get(f"/api/v1/recommendations?count={bad_count}")
    assert resp.status_code == 422


def test_recommendations_insufficient_history_warning(client, db_session):
    _seed(db_session, n=5)  # far below the 100-sample threshold
    resp = client.get("/api/v1/recommendations?count=5")
    body = resp.json()
    assert body["data_quality"] == "insufficient_history"
    assert body["warning"]


def test_recommendations_ok_quality_at_threshold(client, db_session):
    _seed(db_session, n=100, start_period=2026001)
    resp = client.get("/api/v1/recommendations?count=5")
    body = resp.json()
    assert body["data_quality"] == "ok"
    assert body["warning"] is None


def test_recommendations_empty_database_returns_uniform_scores(client, db_session):
    resp = client.get("/api/v1/recommendations?count=5")
    assert resp.status_code == 200
    body = resp.json()
    assert body["sample_count"] == 0
    assert body["data_quality"] == "insufficient_history"
    assert body["latest_draw"] is None


def test_recommendations_only_reads_special_number_position(client, db_session):
    # positions 1-6 all identical across draws; only position 7 varies.
    # If the model leaked non-special positions, ball 1 (always present in
    # positions 1-6) would dominate the ranking.
    _seed(db_session, n=10)
    resp = client.get("/api/v1/recommendations?count=40")
    body = resp.json()
    top_ball = body["recommendations"][0]["ball"]
    assert top_ball != 1


def test_draws_latest(client, db_session):
    _seed(db_session, n=3)
    resp = client.get("/api/v1/draws/latest")
    assert resp.status_code == 200
    body = resp.json()
    assert body["period_id"] == 2026003


def test_draws_latest_empty_database_returns_null(client):
    resp = client.get("/api/v1/draws/latest")
    assert resp.status_code == 200
    assert resp.json() is None


def test_draws_list_pagination(client, db_session):
    _seed(db_session, n=5)
    resp = client.get("/api/v1/draws?limit=2&offset=0")
    body = resp.json()
    assert body["total"] == 5
    assert len(body["draws"]) == 2
    assert body["draws"][0]["period_id"] == 2026005


def test_draws_list_different_lottery_types_do_not_mix(client, db_session):
    _seed(db_session, lottery_type=1, n=2, start_period=2026001)
    _seed(db_session, lottery_type=2, n=3, start_period=2026101)
    resp = client.get("/api/v1/draws?lottery_type=1")
    body = resp.json()
    assert body["total"] == 2
    assert all(d["lottery_type"] == 1 for d in body["draws"])


def test_backtests_latest_with_insufficient_history_shows_no_edge(client, db_session):
    _seed(db_session, n=5)
    resp = client.get("/api/v1/backtests/latest")
    assert resp.status_code == 200
    body = resp.json()
    assert body["test_period_count"] == 0
    assert body["reliable_edge_found"] is False
    assert "未发现可靠预测优势" in body["summary"]
    assert len(body["metrics"]) == 40


def test_backtests_latest_metrics_have_baseline_n_over_49(client, db_session):
    _seed(db_session, n=30)
    resp = client.get("/api/v1/backtests/latest")
    body = resp.json()
    for m in body["metrics"]:
        assert abs(m["baseline_hit_rate"] - m["n"] / 49) < 1e-9

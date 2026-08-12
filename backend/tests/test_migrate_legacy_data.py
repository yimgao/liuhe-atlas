import sqlite3
from pathlib import Path

import pytest
from sqlalchemy.orm import Session

from app.db import Base, make_engine
from app.models import Draw
from app.services.validator import parse_draw_date
from scripts.migrate_legacy_data import run, validate_numbers

LEGACY_SCHEMA = """
CREATE TABLE periods (
    period_id INTEGER PRIMARY KEY,
    lottery_type INTEGER NOT NULL,
    draw_date DATETIME NOT NULL,
    fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    source_domain TEXT,
    UNIQUE(period_id, lottery_type)
);
CREATE TABLE numbers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    period_id INTEGER NOT NULL,
    lottery_type INTEGER NOT NULL,
    position INTEGER NOT NULL,
    ball_number INTEGER NOT NULL
);
"""


def _seed_legacy_db(path: Path):
    con = sqlite3.connect(path)
    con.executescript(LEGACY_SCHEMA)

    # valid real period
    con.execute(
        "INSERT INTO periods VALUES (2026001, 1, '2026年07月14日21时32分 星期二', "
        "'2026-07-14 01:07:49', 'real-source.example')"
    )
    for pos, ball in enumerate([1, 2, 3, 4, 5, 6, 7], start=1):
        con.execute(
            "INSERT INTO numbers (period_id, lottery_type, position, ball_number) VALUES (?,?,?,?)",
            (2026001, 1, pos, ball),
        )

    # synthetic period — must be excluded regardless of validity
    con.execute(
        "INSERT INTO periods VALUES (2026002, 1, '2026年07月16日21时32分 星期四', "
        "'2026-07-16 04:49:57', 'synthetic_backfill_for_ui_demo')"
    )
    for pos, ball in enumerate([10, 11, 12, 13, 14, 15, 16], start=1):
        con.execute(
            "INSERT INTO numbers (period_id, lottery_type, position, ball_number) VALUES (?,?,?,?)",
            (2026002, 1, pos, ball),
        )

    # invalid: duplicate ball within the period
    con.execute(
        "INSERT INTO periods VALUES (2026003, 1, '2026年07月17日21时32分 星期五', "
        "'2026-07-17 03:30:02', 'real-source.example')"
    )
    dup_balls = [1, 1, 3, 4, 5, 6, 7]
    for pos, ball in enumerate(dup_balls, start=1):
        con.execute(
            "INSERT INTO numbers (period_id, lottery_type, position, ball_number) VALUES (?,?,?,?)",
            (2026003, 1, pos, ball),
        )

    # invalid: missing numbers (only 6)
    con.execute(
        "INSERT INTO periods VALUES (2026004, 1, '2026年07月18日21时32分 星期六', "
        "'2026-07-18 03:30:18', 'real-source.example')"
    )
    for pos, ball in enumerate([1, 2, 3, 4, 5, 6], start=1):
        con.execute(
            "INSERT INTO numbers (period_id, lottery_type, position, ball_number) VALUES (?,?,?,?)",
            (2026004, 1, pos, ball),
        )

    con.commit()
    con.close()


@pytest.fixture()
def legacy_db(tmp_path):
    path = tmp_path / "legacy.db"
    _seed_legacy_db(path)
    return path


@pytest.fixture()
def target_session():
    engine = make_engine("sqlite://")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    engine.dispose()


def test_parse_draw_date():
    assert parse_draw_date("2026年07月14日21时32分 星期二").isoformat() == "2026-07-14"


def test_parse_draw_date_rejects_unrecognized_format():
    with pytest.raises(ValueError):
        parse_draw_date("2026-07-14")


def test_validate_numbers_accepts_seven_distinct_in_range():
    assert validate_numbers([(1, 1), (2, 2), (3, 3), (4, 4), (5, 5), (6, 6), (7, 7)]) is None


def test_validate_numbers_rejects_wrong_count():
    assert validate_numbers([(1, 1)]) is not None


def test_validate_numbers_rejects_duplicate_ball():
    assert validate_numbers([(1, 1), (2, 1), (3, 3), (4, 4), (5, 5), (6, 6), (7, 7)]) is not None


def test_validate_numbers_rejects_out_of_range_ball():
    assert validate_numbers([(1, 50), (2, 2), (3, 3), (4, 4), (5, 5), (6, 6), (7, 7)]) is not None


def test_migration_excludes_synthetic_and_invalid_periods(legacy_db, target_session):
    result = run(legacy_db, dry_run=False, session=target_session)

    assert [row["period_id"] for row in result["included"]] == [2026001]
    excluded_ids = {row["period_id"]: row["reason"] for row in result["excluded"]}
    assert excluded_ids[2026002] == "synthetic_backfill tag"
    assert "duplicate ball" in excluded_ids[2026003]
    assert "expected 7 numbers" in excluded_ids[2026004]


def test_migration_persists_only_valid_real_period(legacy_db, target_session):
    run(legacy_db, dry_run=False, session=target_session)

    assert target_session.get(Draw, (1, 2026001)) is not None
    assert target_session.get(Draw, (1, 2026002)) is None
    assert target_session.get(Draw, (1, 2026003)) is None
    assert target_session.get(Draw, (1, 2026004)) is None


def test_dry_run_does_not_persist(legacy_db, target_session):
    result = run(legacy_db, dry_run=True, session=target_session)

    assert len(result["included"]) == 1
    assert target_session.get(Draw, (1, 2026001)) is None


def test_rerun_skips_already_imported_periods(legacy_db, target_session):
    run(legacy_db, dry_run=False, session=target_session)
    second = run(legacy_db, dry_run=False, session=target_session)

    assert second["included"] == []
    reasons = {row["period_id"]: row["reason"] for row in second["excluded"]}
    assert reasons[2026001] == "already present in target db (skipped)"

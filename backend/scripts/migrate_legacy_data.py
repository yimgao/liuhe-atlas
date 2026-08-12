"""One-time historical backfill: import periods from the legacy atlas SQLite DB.

Reads from a backup copy of the legacy DB (never the original), skips any
period tagged as synthetic (source_domain LIKE 'synthetic%'), and only
imports periods with exactly 7 valid, non-duplicate numbers. Safe to re-run:
periods already present in the target DB are skipped.

Usage:
    python scripts/migrate_legacy_data.py [--source PATH] [--dry-run]
"""
import argparse
import json
import logging
import shutil
import sqlite3
import tempfile
from datetime import datetime
from pathlib import Path

from sqlalchemy.orm import Session

from app.db import engine
from app.models import Draw, DrawNumber
from app.services.validator import parse_draw_date

logger = logging.getLogger("migrate_legacy_data")

DEFAULT_SOURCE = Path(__file__).resolve().parents[2] / "atlas" / "data" / "lotto.db"
LOG_DIR = Path(__file__).resolve().parents[1] / "logs"


def load_source_periods(source_db: Path):
    con = sqlite3.connect(f"file:{source_db}?mode=ro", uri=True)
    con.row_factory = sqlite3.Row
    try:
        periods = con.execute(
            "SELECT period_id, lottery_type, draw_date, source_domain, fetched_at "
            "FROM periods ORDER BY lottery_type, period_id"
        ).fetchall()
        numbers_by_period = {}
        for row in con.execute(
            "SELECT period_id, lottery_type, position, ball_number FROM numbers"
        ).fetchall():
            key = (row["lottery_type"], row["period_id"])
            numbers_by_period.setdefault(key, []).append((row["position"], row["ball_number"]))
        return periods, numbers_by_period
    finally:
        con.close()


def validate_numbers(numbers: list[tuple[int, int]]) -> str | None:
    """Returns an error reason string, or None if the period is model-eligible."""
    if len(numbers) != 7:
        return f"expected 7 numbers, found {len(numbers)}"
    positions = sorted(p for p, _ in numbers)
    if positions != list(range(1, 8)):
        return f"positions not exactly 1-7: {positions}"
    balls = [b for _, b in numbers]
    if any(b < 1 or b > 49 for b in balls):
        return f"ball out of 1-49 range: {balls}"
    if len(set(balls)) != len(balls):
        return f"duplicate ball within period: {balls}"
    return None


def run(source_db: Path, dry_run: bool, session: Session) -> dict:
    periods, numbers_by_period = load_source_periods(source_db)

    included, excluded = [], []
    for row in periods:
        key = (row["lottery_type"], row["period_id"])
        source_domain = row["source_domain"] or ""

        if source_domain.lower().startswith("synthetic"):
            excluded.append({**dict(row), "reason": "synthetic_backfill tag"})
            continue

        numbers = sorted(numbers_by_period.get(key, []))
        reason = validate_numbers(numbers)
        if reason is not None:
            excluded.append({**dict(row), "reason": reason})
            continue

        if session.get(Draw, key) is not None:
            excluded.append({**dict(row), "reason": "already present in target db (skipped)"})
            continue

        draw = Draw(
            lottery_type=row["lottery_type"],
            period_id=row["period_id"],
            draw_date=parse_draw_date(row["draw_date"]),
            source_url=source_domain or "unknown",
            fetched_at=datetime.fromisoformat(row["fetched_at"]),
        )
        draw.numbers.extend(
            DrawNumber(
                lottery_type=row["lottery_type"],
                period_id=row["period_id"],
                position=position,
                ball=ball,
            )
            for position, ball in numbers
        )
        if not dry_run:
            session.add(draw)
        included.append(dict(row))

    if not dry_run:
        session.commit()

    return {"included": included, "excluded": excluded}


def write_audit_log(result: dict, dry_run: bool) -> Path:
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%dT%H%M%S")
    path = LOG_DIR / f"legacy_import_audit_{ts}.json"
    payload = {
        "dry_run": dry_run,
        "included_count": len(result["included"]),
        "excluded_count": len(result["excluded"]),
        "included": result["included"],
        "excluded": result["excluded"],
    }
    path.write_text(json.dumps(payload, indent=2, default=str, ensure_ascii=False))
    return path


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if not args.source.exists():
        raise SystemExit(f"source DB not found: {args.source}")

    with tempfile.TemporaryDirectory() as tmp:
        backup_path = Path(tmp) / "lotto_backup.db"
        shutil.copy2(args.source, backup_path)
        logger.info("copied legacy DB %s -> %s (read-only import)", args.source, backup_path)

        with Session(engine) as session:
            result = run(backup_path, args.dry_run, session)

    audit_path = write_audit_log(result, args.dry_run)
    logger.info(
        "included=%d excluded=%d dry_run=%s audit_log=%s",
        len(result["included"]),
        len(result["excluded"]),
        args.dry_run,
        audit_path,
    )


if __name__ == "__main__":
    main()

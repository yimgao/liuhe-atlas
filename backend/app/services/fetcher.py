"""Daily fetcher: pulls the latest draw from primary/backup sources and upserts it.

Single production entry point (per spec: keep one production fetch entry
point and one historical backfill entry point — the latter is
scripts/migrate_legacy_data.py).

Usage:
    python -m app.services.fetcher
"""
import logging
import sys
from datetime import datetime, timezone

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from app.db import SessionLocal
from app.repositories.draws import upsert_draw
from app.services.validator import parse_draw_date, validate_balls

logger = logging.getLogger("fetcher")

# Sources in priority order; the first that returns a valid 200 + parseable
# draw wins. TLS certificate verification is always on (verify=True) — never
# disable it globally.
SOURCES = [
    {
        "name": "六合宝典",
        "base": "https://82hats7.66852.cc:8443/bible/h5",
        "path": "/index/lastLotteryRecord",
    },
    {
        "name": "49图库",
        "base": "https://6xr4in4.xn--eck6e6bcfa3628cg56c.xn--q9jyb4c/unite49/h5",
        "path": "/index/lastLotteryRecord",
    },
]

LOTTERY_TYPES = {2: "澳门六合彩", 1: "香港六合彩"}


def make_session() -> requests.Session:
    session = requests.Session()
    retries = Retry(
        total=3,
        backoff_factor=1.5,
        status_forcelist=[502, 503, 504, 408],
        allowed_methods=["GET"],
    )
    adapter = HTTPAdapter(max_retries=retries)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    return session


def _raw_balls(raw: dict) -> list:
    field = "originalDataList" if "originalDataList" in raw else "numberList"
    return raw.get(field, [])


def fetch_latest(src: dict, session: requests.Session, lottery_type: int) -> dict:
    url = src["base"] + src["path"]
    resp = session.get(url, params={"lotteryType": lottery_type}, timeout=15, verify=True)
    resp.raise_for_status()
    payload = resp.json()
    if payload.get("code") != 10000:
        raise RuntimeError(f"{src['name']} API error: {payload}")
    return payload["data"]


def normalize(source_name: str, src: dict, raw: dict, lottery_type: int) -> dict:
    period_id = raw["year"] * 1000 + raw["period"]
    if source_name == "六合宝典":
        draw_date_raw = raw.get("title") or ""
    else:
        draw_date_raw = raw.get("lotteryTime") or ""

    return {
        "period_id": period_id,
        "lottery_type": lottery_type,
        "lottery_name": LOTTERY_TYPES.get(lottery_type, "Unknown"),
        "draw_date_raw": draw_date_raw,
        "source_url": src["base"] + src["path"],
        "balls_raw": _raw_balls(raw),
    }


def fetch_one(lottery_type: int, session: requests.Session) -> dict | None:
    """Try each source in order for one lottery_type. Returns a validated,
    normalized draw dict, or None if every source failed or was invalid."""
    for src in SOURCES:
        try:
            raw = fetch_latest(src, session, lottery_type)
        except Exception:
            logger.exception("fetch failed", extra={"source": src["name"], "lottery_type": lottery_type})
            continue

        normalized = normalize(src["name"], src, raw, lottery_type)
        result = validate_balls(normalized["balls_raw"])
        if not result.valid:
            logger.warning(
                "validation rejected draw",
                extra={"source": src["name"], "lottery_type": lottery_type, "period_id": normalized["period_id"], "reason": result.reason},
            )
            continue

        try:
            draw_date = parse_draw_date(normalized["draw_date_raw"])
        except ValueError:
            logger.warning(
                "unparseable draw_date",
                extra={"source": src["name"], "lottery_type": lottery_type, "raw": normalized["draw_date_raw"]},
            )
            continue

        normalized["balls"] = result.balls
        normalized["draw_date"] = draw_date
        logger.info(
            "fetched draw",
            extra={"source": src["name"], "lottery_type": lottery_type, "period_id": normalized["period_id"]},
        )
        return normalized

    return None


def run(lottery_types: list[int]) -> int:
    """Fetch + upsert each lottery_type. Returns count of lottery_types that
    failed (0 == full success)."""
    session = make_session()
    failures = 0

    with SessionLocal() as db:
        for lottery_type in lottery_types:
            normalized = fetch_one(lottery_type, session)
            if normalized is None:
                logger.error("all sources failed or invalid", extra={"lottery_type": lottery_type})
                failures += 1
                continue

            upsert_draw(
                db,
                lottery_type=normalized["lottery_type"],
                period_id=normalized["period_id"],
                draw_date=normalized["draw_date"],
                balls=normalized["balls"],
                source_url=normalized["source_url"],
                fetched_at=datetime.now(timezone.utc),
            )
            db.commit()

    return failures


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    failures = run([2, 1])
    if failures:
        logger.error("fetch run completed with failures", extra={"failed_lottery_types": failures})
        return 1
    logger.info("fetch run completed successfully")
    return 0


if __name__ == "__main__":
    sys.exit(main())

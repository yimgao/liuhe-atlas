"""
Export lotto.db → JSON snapshot for the frontend.

Adds zodiac_maps per year so the frontend can do year-aware lookups.
"""
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

THIS_FILE = Path(__file__).resolve()
PROJECT_ROOT = THIS_FILE.parent
DB_PATH = PROJECT_ROOT / "data" / "lotto.db"
# Path relative to atlas/ so the script works on any host (local Mac, Linux CI,
# GitHub Actions runner). Repo layout: ../atlas-ui/public/data/snapshot.json
UI_PUBLIC = PROJECT_ROOT.parent / "atlas-ui" / "public" / "data" / "snapshot.json"

LOTTERY_TYPE = 2  # 澳门 only


def export_snapshot():
    # CI / GitHub Actions may not have the DB. Write a minimal valid snapshot
    # so the frontend doesn't crash and the deploy still succeeds.
    if not DB_PATH.exists():
        return _write_empty_snapshot("DB not found")

    try:
        return _export_from_db()
    except sqlite3.OperationalError as e:
        # Missing table (CI runner without schema) or other DB error.
        return _write_empty_snapshot(f"DB query failed: {e}")


def _write_empty_snapshot(reason: str):
    print(f"[WARN] {reason}; writing empty snapshot (CI fallback)")
    UI_PUBLIC.parent.mkdir(parents=True, exist_ok=True)
    empty = {
        "meta": {
            "lottery_type": LOTTERY_TYPE,
            "lottery_name": "澳门六合彩",
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "period_count": 0,
            "real_period_count": 0,
            "synthetic_period_count": 0,
            "zodiac_map_years": [],
            "note": f"CI fallback — {reason}. Local build will populate real data.",
        },
        "periods": [],
        "zodiac_maps": {},
    }
    with open(UI_PUBLIC, "w", encoding="utf-8") as f:
        json.dump(empty, f, ensure_ascii=False, indent=2)
    return empty


def _export_from_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # Pull all periods + numbers
    cur.execute("""
        SELECT
            p.period_id, p.lottery_name, p.draw_date, p.source_domain, p.fetched_at,
            n.position, n.ball_number, n.zodiac, n.wuxing, n.wave_color, n.odd_even
        FROM periods p
        JOIN numbers n ON p.period_id = n.period_id AND p.lottery_type = n.lottery_type
        WHERE p.lottery_type = ?
        ORDER BY p.period_id DESC, n.position
    """, (LOTTERY_TYPE,))
    rows = cur.fetchall()

    # Pull all symbol_maps (for all years 2020-2026)
    cur.execute("""
        SELECT year, ball_number, zodiac, wuxing, wave_color, odd_even
        FROM symbol_maps
        ORDER BY year, ball_number
    """)
    symbol_rows = cur.fetchall()

    # Group periods
    periods = {}
    for r in rows:
        pid = r["period_id"]
        if pid not in periods:
            periods[pid] = {
                "period_id": pid,
                "lottery_name": r["lottery_name"],
                "draw_date": r["draw_date"],
                "source_domain": r["source_domain"],
                "fetched_at": r["fetched_at"],
                "numbers": [],
            }
        periods[pid]["numbers"].append({
            "position": r["position"],
            "ball": r["ball_number"],
            "zodiac": r["zodiac"],
            "wuxing": r["wuxing"],
            "wave": r["wave_color"],
            "odd_even": r["odd_even"],
        })

    period_list = list(periods.values())
    period_list.sort(key=lambda p: p["period_id"], reverse=True)

    # Group symbol maps by year
    zodiac_maps = {}
    for r in symbol_rows:
        year = r["year"]
        if year not in zodiac_maps:
            zodiac_maps[year] = {}
        zodiac_maps[year][r["ball_number"]] = {
            "zodiac": r["zodiac"],
            "wuxing": r["wuxing"],
            "wave": r["wave_color"],
            "odd_even": r["odd_even"],
        }

    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM periods WHERE lottery_type = ? AND source_domain LIKE 'synthetic%'",
                (LOTTERY_TYPE,))
    synthetic_count = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM periods WHERE lottery_type = ? AND source_domain NOT LIKE 'synthetic%'",
                (LOTTERY_TYPE,))
    real_count = cur.fetchone()[0]

    snapshot = {
        "meta": {
            "lottery_type": LOTTERY_TYPE,
            "lottery_name": "澳门六合彩",
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "period_count": len(period_list),
            "real_period_count": real_count,
            "synthetic_period_count": synthetic_count,
            "zodiac_map_years": sorted(zodiac_maps.keys()),
            "note": "Zodiac maps formula-derived from the 2026=马年 anchor (see derive_zodiac.py); cross-checked against two independent aggregators for 2025 and 2026, exact match on all 12 zodiacs.",
        },
        "periods": period_list,
        "zodiac_maps": zodiac_maps,
    }

    UI_PUBLIC.parent.mkdir(parents=True, exist_ok=True)
    with open(UI_PUBLIC, "w", encoding="utf-8") as f:
        json.dump(snapshot, f, ensure_ascii=False, indent=2)

    print(f"[OK] Exported {len(period_list)} periods to {UI_PUBLIC}")
    print(f"     Zodiac maps for years: {sorted(zodiac_maps.keys())}")
    if period_list:
        print(f"     Latest period: {period_list[0]['period_id']}")
        print(f"     Latest balls: {[n['ball'] for n in period_list[0]['numbers']]}")
    return snapshot


if __name__ == "__main__":
    export_snapshot()
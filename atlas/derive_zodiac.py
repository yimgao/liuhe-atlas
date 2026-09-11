"""
M7 — Zodiac table derivation (formula-based, verified)

Builds the 1-1 zodiac -> ball-number assignment for any year using the
standard 六合彩 rule, rather than OCR'ing a photo (the old approach produced
a broken table — see git history of this file).

Rule (verified against two independent aggregators for 2025 AND 2026,
all 12 zodiacs matched exactly on both years):
- The CURRENT year's zodiac ("本命"/太岁) owns {1, 13, 25, 37, 49} (5 balls).
- Every other zodiac owns a {base, base+12, base+24, base+36} run (4 balls),
  where base runs 2..12 assigned to zodiacs walking BACKWARD through the
  cycle from the current year's zodiac.
- The whole table rotates by exactly one cycle position per year.

2026 is 丙午年 (Year of the Horse), confirmed anchor: 马 -> index 6.
"""
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "data" / "lotto.db"

ZODIAC_CYCLE = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪']

ANCHOR_YEAR = 2026
ANCHOR_ZODIAC_INDEX = ZODIAC_CYCLE.index('马')  # 2026 = Year of the Horse


def zodiac_index_for_year(year: int) -> int:
    return (ANCHOR_ZODIAC_INDEX + (year - ANCHOR_YEAR)) % 12


def build_zodiac_map(year: int) -> dict:
    """Build the {zodiac: [balls]} map for a given year via the verified formula."""
    idx_y = zodiac_index_for_year(year)
    out = {}
    for j in range(12):
        base = j + 1
        zodiac = ZODIAC_CYCLE[(idx_y - j) % 12]
        out[zodiac] = [1, 13, 25, 37, 49] if base == 1 else [base, base + 12, base + 24, base + 36]
    return out


def derive_all_years(start: int = 2020, end: int = 2027) -> dict:
    """Derive zodiac maps for every year in [start, end] inclusive."""
    return {y: build_zodiac_map(y) for y in range(start, end + 1)}


def validate_1to1(year_map: dict) -> bool:
    """Verify 49 balls covered exactly once."""
    seen = []
    for balls in year_map.values():
        seen.extend(balls)
    return sorted(seen) == list(range(1, 50))


def seed_yearly_maps(conn, maps: dict):
    cur = conn.cursor()
    # Pull year-invariant columns from 2026 row (already in DB)
    cur.execute("""
        SELECT ball_number, wuxing, wave_color, odd_even
        FROM symbol_maps WHERE year = 2026
    """)
    invariant = {row[0]: (row[1], row[2], row[3]) for row in cur.fetchall()}

    total = 0
    for year, ymap in sorted(maps.items()):
        cur.execute("DELETE FROM symbol_maps WHERE year = ?", (year,))
        for zodiac, balls in ymap.items():
            for ball in balls:
                wuxing, wave, odd_even = invariant.get(ball, (None, None, None))
                cur.execute("""
                    INSERT INTO symbol_maps
                        (year, ball_number, zodiac, wuxing, wave_color, odd_even, source)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    year, ball, zodiac, wuxing, wave, odd_even,
                    f"formula_derived (anchor_year={ANCHOR_YEAR}, anchor_zodiac=马)"
                ))
                total += 1
    conn.commit()
    return total


def main():
    print("=== Step 1: Build zodiac maps for 2020-2027 via verified formula ===")
    maps = derive_all_years(2020, 2027)
    for year in sorted(maps.keys()):
        valid = validate_1to1(maps[year])
        flag = "OK" if valid else "FAIL"
        zodiac_name = ZODIAC_CYCLE[zodiac_index_for_year(year)]
        print(f"  {year} ({zodiac_name}年): {flag}")
        for z in ZODIAC_CYCLE:
            print(f"    {z}: {maps[year][z]}")

    print("\n=== Step 2: Seed into SQLite ===")
    conn = sqlite3.connect(DB_PATH)
    total = seed_yearly_maps(conn, maps)
    print(f"  Inserted {total} rows")

    cur = conn.cursor()
    cur.execute("SELECT year, COUNT(*) FROM symbol_maps GROUP BY year ORDER BY year")
    print("\n=== Final DB state ===")
    for year, cnt in cur.fetchall():
        print(f"  {year}: {cnt} rows")
    conn.close()


if __name__ == "__main__":
    main()

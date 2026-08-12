import re
from dataclasses import dataclass
from datetime import date, datetime

_DATE_RE = re.compile(r"(\d{4})年(\d{2})月(\d{2})日")


def parse_draw_date(raw: str) -> date:
    match = _DATE_RE.search(raw)
    if not match:
        raise ValueError(f"unrecognized draw_date format: {raw!r}")
    year, month, day = (int(g) for g in match.groups())
    return datetime(year, month, day).date()


@dataclass(frozen=True)
class ValidationResult:
    valid: bool
    balls: list[int] | None
    reason: str | None = None


def validate_balls(raw_balls: list) -> ValidationResult:
    """Validate raw ball values from a fetched source.

    Requires exactly 7 usable entries among the first 7 raw values, each
    parseable as an integer in 1-49, with no duplicates within the period.
    """
    candidates = []
    for b in raw_balls[:7]:
        try:
            n = int(b)
        except (TypeError, ValueError):
            continue
        if 1 <= n <= 49:
            candidates.append(n)

    if len(candidates) != 7:
        return ValidationResult(False, None, f"expected 7 valid balls (1-49), found {len(candidates)}")

    if len(set(candidates)) != 7:
        return ValidationResult(False, None, f"duplicate ball within period: {candidates}")

    return ValidationResult(True, candidates, None)

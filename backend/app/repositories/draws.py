from datetime import date, datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Draw, DrawNumber

SPECIAL_NUMBER_POSITION = 7


def upsert_draw(
    session: Session,
    *,
    lottery_type: int,
    period_id: int,
    draw_date: date,
    balls: list[int],
    source_url: str,
    fetched_at: datetime,
) -> Draw:
    """Idempotent upsert keyed on the composite (lottery_type, period_id).

    Never touches rows for a different lottery_type, even if period_id
    collides across lottery types.
    """
    draw = session.get(Draw, (lottery_type, period_id))
    if draw is None:
        draw = Draw(lottery_type=lottery_type, period_id=period_id)
        session.add(draw)

    draw.draw_date = draw_date
    draw.source_url = source_url
    draw.fetched_at = fetched_at
    draw.numbers.clear()
    draw.numbers.extend(
        DrawNumber(lottery_type=lottery_type, period_id=period_id, position=position, ball=ball)
        for position, ball in enumerate(balls, start=1)
    )
    return draw


def get_special_number_history(session: Session, lottery_type: int) -> list[int]:
    """Special numbers (position=7) in chronological order (oldest first)."""
    stmt = (
        select(DrawNumber.ball)
        .join(Draw, (DrawNumber.lottery_type == Draw.lottery_type) & (DrawNumber.period_id == Draw.period_id))
        .where(DrawNumber.lottery_type == lottery_type, DrawNumber.position == SPECIAL_NUMBER_POSITION)
        .order_by(Draw.draw_date.asc(), Draw.period_id.asc())
    )
    return list(session.scalars(stmt))


def get_latest_draw(session: Session, lottery_type: int) -> Draw | None:
    stmt = (
        select(Draw)
        .where(Draw.lottery_type == lottery_type)
        .order_by(Draw.draw_date.desc(), Draw.period_id.desc())
        .limit(1)
    )
    return session.scalars(stmt).first()


def list_draws(session: Session, lottery_type: int, limit: int, offset: int) -> list[Draw]:
    stmt = (
        select(Draw)
        .where(Draw.lottery_type == lottery_type)
        .order_by(Draw.draw_date.desc(), Draw.period_id.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(session.scalars(stmt))


def count_draws(session: Session, lottery_type: int) -> int:
    stmt = select(func.count()).select_from(Draw).where(Draw.lottery_type == lottery_type)
    return session.scalar(stmt) or 0

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.models import Draw
from app.repositories.draws import count_draws, get_latest_draw, list_draws
from app.schemas import DrawNumberOut, DrawOut, DrawsListResponse

router = APIRouter()


def _draw_to_out(draw: Draw) -> DrawOut:
    return DrawOut(
        lottery_type=draw.lottery_type,
        period_id=draw.period_id,
        draw_date=draw.draw_date,
        numbers=[
            DrawNumberOut(position=n.position, ball=n.ball)
            for n in sorted(draw.numbers, key=lambda n: n.position)
        ],
    )


@router.get("/draws/latest", response_model=DrawOut | None)
def latest_draw(
    lottery_type: int = settings.default_lottery_type, db: Session = Depends(get_db)
) -> DrawOut | None:
    draw = get_latest_draw(db, lottery_type)
    return _draw_to_out(draw) if draw is not None else None


@router.get("/draws", response_model=DrawsListResponse)
def draws(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    lottery_type: int = settings.default_lottery_type,
    db: Session = Depends(get_db),
) -> DrawsListResponse:
    items = list_draws(db, lottery_type, limit, offset)
    total = count_draws(db, lottery_type)
    return DrawsListResponse(
        total=total, limit=limit, offset=offset, draws=[_draw_to_out(d) for d in items]
    )

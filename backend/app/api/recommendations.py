from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.repositories.draws import SPECIAL_NUMBER_POSITION, get_latest_draw, get_special_number_history
from app.schemas import (
    DISCLAIMER,
    INSUFFICIENT_HISTORY_WARNING,
    LatestDrawInfo,
    ModelInfo,
    RecommendationItem,
    RecommendationsResponse,
)
from app.services.scoring import (
    ALPHA,
    MODEL_NAME,
    MODEL_VERSION,
    gap_since_last_seen,
    is_insufficient_history,
    score_special_numbers,
)

router = APIRouter()


@router.get("/recommendations", response_model=RecommendationsResponse)
def recommendations(
    count: int = Query(20, ge=1, le=40),
    lottery_type: int = settings.default_lottery_type,
    db: Session = Depends(get_db),
) -> RecommendationsResponse:
    history = get_special_number_history(db, lottery_type)
    scores = score_special_numbers(history)
    sample_count = len(history)
    data_quality = "insufficient_history" if is_insufficient_history(sample_count) else "ok"

    items = [
        RecommendationItem(
            rank=rank,
            ball=s.ball,
            estimated_probability=s.probability,
            historical_count=s.count,
            gap_draws=gap_since_last_seen(history, s.ball),
        )
        for rank, s in enumerate(scores[:count], start=1)
    ]

    latest = get_latest_draw(db, lottery_type)
    latest_draw_info = None
    if latest is not None:
        special = next(
            (n.ball for n in latest.numbers if n.position == SPECIAL_NUMBER_POSITION), None
        )
        if special is not None:
            latest_draw_info = LatestDrawInfo(
                period_id=latest.period_id, draw_date=latest.draw_date, special_number=special
            )

    return RecommendationsResponse(
        requested_count=count,
        model=ModelInfo(name=MODEL_NAME, version=MODEL_VERSION, alpha=ALPHA),
        latest_draw=latest_draw_info,
        sample_count=sample_count,
        data_quality=data_quality,
        warning=INSUFFICIENT_HISTORY_WARNING if data_quality == "insufficient_history" else None,
        recommendations=items,
        generated_at=datetime.now(timezone.utc),
        disclaimer=DISCLAIMER,
    )

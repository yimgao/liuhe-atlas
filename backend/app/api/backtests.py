from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.repositories.draws import get_special_number_history
from app.schemas import BacktestResponse, ModelInfo, NValueMetric
from app.services.backtest import run_backtest
from app.services.scoring import ALPHA, MODEL_NAME, MODEL_VERSION

router = APIRouter()

RELIABLE_EDGE_SUMMARY = "在样本外回测中相对随机基线发现统计显著优势。"
NO_EDGE_SUMMARY = "未发现可靠预测优势，当前排名主要反映历史频率的抽样噪声。"


@router.get("/backtests/latest", response_model=BacktestResponse)
def backtests_latest(
    lottery_type: int = settings.default_lottery_type, db: Session = Depends(get_db)
) -> BacktestResponse:
    history = get_special_number_history(db, lottery_type)
    result = run_backtest(history)

    return BacktestResponse(
        model=ModelInfo(name=MODEL_NAME, version=MODEL_VERSION, alpha=ALPHA),
        test_period_count=result.test_period_count,
        generated_at=datetime.now(timezone.utc),
        metrics=[
            NValueMetric(
                n=m.n,
                test_period_count=m.test_period_count,
                hit_count=m.hit_count,
                hit_rate=m.hit_rate,
                baseline_hit_rate=m.baseline_hit_rate,
                hit_rate_ci_low=m.hit_rate_ci_low,
                hit_rate_ci_high=m.hit_rate_ci_high,
                delta_vs_baseline=m.delta_vs_baseline,
                brier_score=m.brier_score,
            )
            for m in result.metrics
        ],
        reliable_edge_found=result.reliable_edge_found,
        summary=RELIABLE_EDGE_SUMMARY if result.reliable_edge_found else NO_EDGE_SUMMARY,
    )

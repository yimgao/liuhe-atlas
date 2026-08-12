from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import backtests, draws, health, recommendations

app = FastAPI(title="Liuhe Special Number Recommender", version="0.1.0")

# Public, read-only, unauthenticated API (no cookies/credentials) -> safe to
# allow any origin so the frontend can be hosted separately (e.g. Vercel).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api/v1", tags=["health"])
app.include_router(draws.router, prefix="/api/v1", tags=["draws"])
app.include_router(recommendations.router, prefix="/api/v1", tags=["recommendations"])
app.include_router(backtests.router, prefix="/api/v1", tags=["backtests"])

"""Production-ready stateless FastAPI app for Day 12 Part 1."""
from __future__ import annotations

import logging
import signal
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import uvicorn
from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from redis.asyncio import Redis

from app.auth import api_key_fingerprint, verify_api_key
from app.config import settings
from app.cost_guard import RedisCostGuard
from app.rate_limiter import RedisRateLimiter
from utils.mock_llm import ask as llm_ask

logging.basicConfig(level=getattr(logging, settings.log_level.upper(), logging.INFO))
logger = logging.getLogger(__name__)

START_TIME = time.time()
APP_STATE = {
    "ready": False,
}


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@asynccontextmanager
async def lifespan(app: FastAPI):
    redis_client = Redis.from_url(settings.redis_url, decode_responses=True)
    await redis_client.ping()

    app.state.redis = redis_client
    app.state.rate_limiter = RedisRateLimiter(
        redis_client=redis_client,
        max_requests=settings.rate_limit_per_minute,
        window_seconds=60,
    )
    app.state.cost_guard = RedisCostGuard(
        redis_client=redis_client,
        monthly_budget_usd=settings.monthly_budget_usd,
    )
    APP_STATE["ready"] = True
    logger.info("Application startup complete")

    try:
        yield
    finally:
        APP_STATE["ready"] = False
        await redis_client.close()
        logger.info("Application shutdown complete")


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    lifespan=lifespan,
    docs_url=None if settings.environment == "production" else "/docs",
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.allowed_origins),
    allow_methods=["GET", "POST"],
    allow_headers=["X-API-Key", "Content-Type"],
)


@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    response: Response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Cache-Control"] = "no-store"
    return response


class AskRequest(BaseModel):
    user_id: str = Field(..., min_length=1, max_length=128)
    question: str = Field(..., min_length=1, max_length=2000)


class AskResponse(BaseModel):
    user_id: str
    question: str
    answer: str
    model: str
    timestamp: str
    rate_limit_remaining: int
    month_cost_usd: float
    monthly_budget_usd: float


@app.get("/")
def root() -> dict:
    return {
        "app": settings.app_name,
        "version": settings.app_version,
        "status_endpoints": ["/health", "/ready"],
        "agent_endpoint": "POST /ask",
    }


@app.post("/ask", response_model=AskResponse)
async def ask_agent(
    payload: AskRequest,
    request: Request,
    api_key: str = Depends(verify_api_key),
) -> AskResponse:
    redis_client: Redis = request.app.state.redis
    rate_limiter: RedisRateLimiter = request.app.state.rate_limiter
    cost_guard: RedisCostGuard = request.app.state.cost_guard

    key_bucket = api_key_fingerprint(api_key)
    rate_state = await rate_limiter.enforce(key_bucket)

    estimated_input_tokens = max(1, len(payload.question.split()) * 2)
    estimated_output_tokens = 180
    estimated_cost = RedisCostGuard.estimate_cost_usd(
        input_tokens=estimated_input_tokens,
        output_tokens=estimated_output_tokens,
        input_cost_per_1k=settings.estimated_input_cost_per_1k,
        output_cost_per_1k=settings.estimated_output_cost_per_1k,
    )
    cost_state = await cost_guard.check_and_record(estimated_cost)

    try:
        answer = llm_ask(payload.question)
    except Exception as exc:
        logger.exception("LLM call failed: %s", exc)
        raise HTTPException(status_code=502, detail="Failed to process question") from exc

    return AskResponse(
        user_id=payload.user_id,
        question=payload.question,
        answer=answer,
        model="mock-llm",
        timestamp=_utc_now_iso(),
        rate_limit_remaining=rate_state["remaining"],
        month_cost_usd=round(cost_state["current_month_cost_usd"], 6),
        monthly_budget_usd=cost_state["monthly_budget_usd"],
    )


@app.get("/health")
async def health(request: Request) -> dict:
    redis_status = "ok"
    try:
        await request.app.state.redis.ping()
    except Exception:
        redis_status = "down"

    return {
        "status": "ok" if redis_status == "ok" else "degraded",
        "app": settings.app_name,
        "version": settings.app_version,
        "environment": settings.environment,
        "redis": redis_status,
        "uptime_seconds": round(time.time() - START_TIME, 2),
        "timestamp": _utc_now_iso(),
    }


@app.get("/ready")
async def ready(request: Request) -> dict:
    if not APP_STATE["ready"]:
        raise HTTPException(status_code=503, detail="Application is not ready")

    try:
        await request.app.state.redis.ping()
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Redis is not ready") from exc

    return {"ready": True, "timestamp": _utc_now_iso()}


def _handle_signal(signum, _frame):
    logger.info("Received signal %s, starting graceful shutdown", signum)
    APP_STATE["ready"] = False


if hasattr(signal, "SIGTERM"):
    signal.signal(signal.SIGTERM, _handle_signal)
if hasattr(signal, "SIGINT"):
    signal.signal(signal.SIGINT, _handle_signal)


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        timeout_graceful_shutdown=settings.request_timeout_seconds,
    )

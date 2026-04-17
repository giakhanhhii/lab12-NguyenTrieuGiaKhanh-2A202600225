"""Application configuration loaded from environment variables."""
from __future__ import annotations

import os
from dataclasses import dataclass


def _env_required(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise ValueError(f"Missing required environment variable: {name}")
    return value


@dataclass(frozen=True)
class Settings:
    app_name: str = os.getenv("APP_NAME", "Day12 Agent")
    app_version: str = os.getenv("APP_VERSION", "1.0.0")
    environment: str = os.getenv("ENVIRONMENT", "development")

    host: str = os.getenv("HOST", "0.0.0.0")
    port: int = int(os.getenv("PORT", "8000"))
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    request_timeout_seconds: int = int(os.getenv("REQUEST_TIMEOUT_SECONDS", "30"))

    agent_api_key: str = _env_required("AGENT_API_KEY")
    redis_url: str = _env_required("REDIS_URL")

    # Part 1 requirement: strictly 10 requests per minute.
    rate_limit_per_minute: int = 10
    monthly_budget_usd: float = float(os.getenv("MONTHLY_BUDGET_USD", "10.0"))
    estimated_input_cost_per_1k: float = float(
        os.getenv("ESTIMATED_INPUT_COST_PER_1K", "0.00015")
    )
    estimated_output_cost_per_1k: float = float(
        os.getenv("ESTIMATED_OUTPUT_COST_PER_1K", "0.0006")
    )

    allowed_origins: tuple[str, ...] = tuple(
        origin.strip()
        for origin in os.getenv("ALLOWED_ORIGINS", "*").split(",")
        if origin.strip()
    )


settings = Settings()

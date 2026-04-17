"""Redis-backed monthly cost guard."""
from __future__ import annotations

import calendar
from datetime import datetime, timezone

from fastapi import HTTPException, status
from redis.asyncio import Redis


class RedisCostGuard:
    def __init__(self, redis_client: Redis, monthly_budget_usd: float):
        self.redis = redis_client
        self.monthly_budget_usd = monthly_budget_usd

    @staticmethod
    def estimate_cost_usd(
        input_tokens: int,
        output_tokens: int,
        input_cost_per_1k: float,
        output_cost_per_1k: float,
    ) -> float:
        input_cost = (input_tokens / 1000) * input_cost_per_1k
        output_cost = (output_tokens / 1000) * output_cost_per_1k
        return round(input_cost + output_cost, 8)

    @staticmethod
    def _month_context() -> tuple[str, int]:
        now = datetime.now(timezone.utc)
        key = f"cost_guard:global:{now.strftime('%Y-%m')}"

        days_in_month = calendar.monthrange(now.year, now.month)[1]
        month_end = datetime(now.year, now.month, days_in_month, 23, 59, 59, tzinfo=timezone.utc)
        ttl_seconds = int((month_end - now).total_seconds()) + 1
        return key, max(ttl_seconds, 60)

    async def check_and_record(self, cost_to_add_usd: float) -> dict[str, float]:
        key, ttl_seconds = self._month_context()

        script = """
local key = KEYS[1]
local add_cost = tonumber(ARGV[1])
local budget = tonumber(ARGV[2])
local ttl = tonumber(ARGV[3])
local current = tonumber(redis.call("GET", key) or "0")
local next_cost = current + add_cost
if next_cost > budget then
  return {0, current, next_cost}
end
redis.call("SET", key, next_cost)
if redis.call("TTL", key) < 0 then
  redis.call("EXPIRE", key, ttl)
end
return {1, next_cost, next_cost}
"""
        allowed, current_value, projected_value = await self.redis.eval(
            script, 1, key, str(cost_to_add_usd), str(self.monthly_budget_usd), str(ttl_seconds)
        )

        current_usd = float(current_value)
        projected_usd = float(projected_value)

        if int(allowed) != 1:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=(
                    f"Monthly budget exceeded. Used ${current_usd:.4f} "
                    f"of ${self.monthly_budget_usd:.2f}."
                ),
            )

        return {
            "monthly_budget_usd": self.monthly_budget_usd,
            "current_month_cost_usd": projected_usd,
            "remaining_budget_usd": max(self.monthly_budget_usd - projected_usd, 0.0),
        }

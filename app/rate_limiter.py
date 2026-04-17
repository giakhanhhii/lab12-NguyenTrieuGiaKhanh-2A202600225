"""Redis-backed request rate limiter."""
from __future__ import annotations

import time

from fastapi import HTTPException, status
from redis.asyncio import Redis


class RedisRateLimiter:
    def __init__(self, redis_client: Redis, max_requests: int = 10, window_seconds: int = 60):
        self.redis = redis_client
        self.max_requests = max_requests
        self.window_seconds = window_seconds

    def _window_key(self, client_id: str) -> tuple[str, int]:
        now = int(time.time())
        window_start = now - (now % self.window_seconds)
        return f"rate_limit:{client_id}:{window_start}", window_start

    async def enforce(self, client_id: str) -> dict[str, int]:
        key, window_start = self._window_key(client_id)
        current = await self.redis.incr(key)

        if current == 1:
            await self.redis.expire(key, self.window_seconds)

        ttl = await self.redis.ttl(key)
        retry_after = max(ttl, 1)
        remaining = max(self.max_requests - current, 0)

        if current > self.max_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded: {self.max_requests} requests/minute",
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(self.max_requests),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(window_start + self.window_seconds),
                },
            )

        return {
            "limit": self.max_requests,
            "remaining": remaining,
            "retry_after": retry_after,
            "reset_epoch": window_start + self.window_seconds,
        }

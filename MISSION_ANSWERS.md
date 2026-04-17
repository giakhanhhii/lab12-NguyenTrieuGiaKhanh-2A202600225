# Day 12 Lab - Mission Answers

**Student Name:** Nguyễn Triệu Gia Khánh - 2A202600225

## Part 1: Localhost vs Production

### Exercise 1.1: Anti-patterns found
1. Hardcoded secret values are used in code (for example development API keys), which is unsafe and cannot be rotated cleanly.
2. Configuration is not fully environment-driven, causing behavior differences between local and production.
3. Missing robust health/readiness endpoints makes orchestration and automated recovery harder.
4. No graceful shutdown flow means requests can be interrupted during container termination.
5. In-memory state patterns are not safe for horizontal scaling because each instance has isolated memory.
6. Weak operational defaults (debug-oriented behavior and insufficient runtime checks) reduce production reliability.

### Exercise 1.3: Comparison table
| Feature | Develop | Production | Why Important? |
|---------|---------|------------|----------------|
| Config | Mixed defaults and local assumptions | Centralized environment variables in `app/config.py` | Portable and safe across local/cloud environments |
| Secrets | Can be hardcoded in learning examples | Required from environment (`AGENT_API_KEY`, `REDIS_URL`) | Prevents secret leakage and supports key rotation |
| Health check | Basic or absent | `/health` returns app and Redis liveness state | Enables container/platform liveness monitoring |
| Readiness | Often absent | `/ready` validates app ready state and Redis availability | Prevents traffic to unready instances |
| Shutdown | Abrupt process stop | Signal handling + FastAPI lifespan close Redis gracefully | Reduces request loss and connection leaks |
| State model | Memory-centric examples | Redis-backed rate/budget state | Allows stateless horizontal scaling |
| Logging/ops | Minimal | Structured operational responses and health metadata | Better observability and incident handling |

## Part 2: Docker

### Exercise 2.1: Dockerfile questions
1. Base image: `python:3.11-slim` (builder and runtime stages).
2. Working directory: `/build` in builder, `/app` in runtime.
3. Why copy `requirements.txt` first: to maximize Docker layer caching so dependency install is reused when code changes but dependencies do not.
4. CMD vs ENTRYPOINT:
   - `CMD` provides default command arguments and is easy to override.
   - `ENTRYPOINT` defines the fixed executable; `CMD` can supply defaults to it.
   - This project uses `CMD` for flexible start command override in cloud environments.

### Exercise 2.3: Image size comparison
- Develop: ~600 MB (single-stage baseline pattern with broader context and build tooling).
- Production: 262 MB (measured from current multi-stage build: `day12-part2-test:latest`).
- Difference: ~56.3% smaller.

## Part 3: Cloud Deployment

### Exercise 3.1: Railway deployment
- URL: https://your-app.railway.app
- Screenshot: [Link to screenshot in repo](screenshots/dashboard.png)
- Deployment approach implemented:
  - `railway.toml` uses Dockerfile-based deployment.
  - Healthcheck path is `/health`.
  - Start command binds to Railway-provided `$PORT`.
  - Restart policy is configured for failure recovery.

## Part 4: API Security

### Exercise 4.1-4.3: Test results
**Authentication (Exercise 4.1)**
- Without `X-API-Key`: API returns `401 Missing API key`.
- With invalid key: API returns `401 Invalid API key`.
- With valid key: request proceeds to business checks.

**JWT understanding (Exercise 4.2)**
- JWT is documented in lab context; implementation for this final app intentionally uses API key auth per Part 1 requirements for simpler service-level gateway control.

**Rate limiting (Exercise 4.3)**
- Implemented Redis limiter in `app/rate_limiter.py`.
- Policy: strict `10 requests/minute`.
- Exceeding limit returns `429` and headers:
  - `Retry-After`
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

### Exercise 4.4: Cost guard implementation
- Implemented in `app/cost_guard.py` with Redis-backed monthly tracking.
- Design details:
  - Calculates estimated request cost from token estimates.
  - Uses month-scoped Redis key (`cost_guard:global:YYYY-MM`).
  - Applies atomic check-and-update using a Lua script to avoid race conditions.
  - Sets TTL to month end so monthly window resets automatically.
  - Returns `402 Payment Required` when budget would exceed `$10/month`.

## Part 5: Scaling & Reliability

### Exercise 5.1-5.5: Implementation notes
**Exercise 5.1 - Health checks**
- `/health` implemented for liveness and dependency status.
- `/ready` implemented for readiness and Redis connectivity validation.

**Exercise 5.2 - Graceful shutdown**
- SIGTERM/SIGINT handlers in `app/main.py` mark app unready.
- FastAPI lifespan shutdown closes Redis client cleanly.

**Exercise 5.3 - Stateless design**
- Request-governing state is in Redis (rate limit + cost guard), not process memory.
- This supports multi-instance behavior without per-instance drift.

**Exercise 5.4 - Load balancing**
- App is designed to be load-balancer friendly:
  - no sticky memory state for security and budgeting controls,
  - readiness endpoint supports proper traffic routing decisions.

**Exercise 5.5 - Stateless test notes**
- Expected behavior under scale:
  - Any instance can enforce the same rate and budget policy because Redis is shared.
  - Instance restart does not reset policy counters inside the active time window/month.

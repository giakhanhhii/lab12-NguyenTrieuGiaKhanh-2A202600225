# Day 12 Production Agent Deployment

Production-ready FastAPI agent for Day 12 lab, implemented with:
- API key authentication
- Redis-backed rate limiting (10 requests/minute)
- Redis-backed monthly cost guard ($10/month)
- Health + readiness probes
- Graceful shutdown behavior
- Multi-stage Docker deployment for cloud platforms

## Project Structure

```text
day12_ha-tang-cloud_va_deployment/
├── app/
│   ├── main.py
│   ├── config.py
│   ├── auth.py
│   ├── rate_limiter.py
│   └── cost_guard.py
├── utils/
│   └── mock_llm.py
├── Dockerfile
├── .dockerignore
├── railway.toml
├── requirements.txt
├── .env.example
├── MISSION_ANSWERS.md
└── README.md
```

## Prerequisites

- Python 3.11+
- Docker Desktop (for containerized run)
- Redis (local container or cloud Redis)

## Environment Setup

1. Copy the template:

```bash
cp .env.example .env
```

PowerShell equivalent:

```powershell
Copy-Item .env.example .env
```

2. Edit `.env`:
   - Set a strong `AGENT_API_KEY`
   - Set `REDIS_URL` (for local Docker Redis use `redis://localhost:6379/0`)
   - Keep `RATE_LIMIT_PER_MINUTE=10` and `MONTHLY_BUDGET_USD=10`

## Run Locally (Python)

1. Install dependencies:

```bash
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
```

PowerShell equivalent:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

2. Export environment variables from `.env` and start app:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

3. Verify endpoints:

```bash
curl http://localhost:8000/health
curl http://localhost:8000/ready
```

4. Test protected endpoint:

```bash
curl -X POST http://localhost:8000/ask \
  -H "X-API-Key: your-secure-key" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"test-user","question":"Hello"}'
```

## Run with Docker

Build image:

```bash
docker build -t day12-agent .
```

Run Redis:

```bash
docker run -d --name day12-redis -p 6379:6379 redis:7-alpine
```

Run app container:

```bash
docker run --rm -p 8000:8000 \
  --env-file .env \
  --name day12-agent \
  day12-agent
```

Image optimization:
- Multi-stage build (`builder` + `runtime`)
- Slim base image
- Minimal copy context through `.dockerignore`
- Final measured image size: ~262 MB (< 500 MB requirement)

## Railway Deployment

This repository includes `railway.toml` configured for Dockerfile deployment.

1. Push repository to GitHub.
2. Create a Railway project and connect the repo.
3. Set environment variables in Railway:
   - `PORT`
   - `REDIS_URL`
   - `AGENT_API_KEY`
   - `LOG_LEVEL`
   - `ENVIRONMENT`
4. Deploy.
5. Validate:

```bash
curl https://your-app.railway.app/health
curl -X POST https://your-app.railway.app/ask \
  -H "X-API-Key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"cloud-test","question":"Hello"}'
```

## Security and Reliability Notes

- No hardcoded secrets in source code.
- API key verification uses constant-time comparison.
- Redis centralizes rate/budget state for stateless scaling.
- Health/readiness probes support orchestration decisions.
- Graceful shutdown path handles termination signals safely.

## Troubleshooting

- `401 Unauthorized`: check `X-API-Key`.
- `503` on `/ready`: verify Redis availability and `REDIS_URL`.
- `429 Too Many Requests`: exceeded per-minute rate limit.
- `402 Payment Required`: monthly cost guard limit reached.

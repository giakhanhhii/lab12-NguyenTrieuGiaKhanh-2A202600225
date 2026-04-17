# Deployment Information

## Public URL
https://lab12-nguyentrieugiakhanh-2a202600225-production.up.railway.app

## Platform
Railway

## Test Commands

### Health Check
```bash
curl https://lab12-nguyentrieugiakhanh-2a202600225-production.up.railway.app/health
# Expected: {"status":"ok", ...}
```

### Readiness Check
```bash
curl https://lab12-nguyentrieugiakhanh-2a202600225-production.up.railway.app/ready
# Expected: {"ready": true, ...}
```

### API Test (without authentication)
```bash
curl -X POST https://lab12-nguyentrieugiakhanh-2a202600225-production.up.railway.app/ask \
  -H "Content-Type: application/json" \
  -d '{"user_id":"test","question":"Hello"}'
# Expected: 401 Unauthorized
```

### API Test (with authentication)
```bash
curl -X POST https://lab12-nguyentrieugiakhanh-2a202600225-production.up.railway.app/ask \
  -H "X-API-Key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"test","question":"Hello"}'
# Expected: 200 OK
```

## Environment Variables Set
- AGENT_API_KEY
- REDIS_URL
- LOG_LEVEL
- ENVIRONMENT
- MONTHLY_BUDGET_USD
- RATE_LIMIT_PER_MINUTE
- ESTIMATED_INPUT_COST_PER_1K
- ESTIMATED_OUTPUT_COST_PER_1K
- PORT (provided by Railway runtime)

## Screenshots
- [Deployment dashboard](screenshots/1.%20Deploy_successful.png)
- [Health check](screenshots/2.%20health_check.png)
- [Readiness check](screenshots/3.%20ready.png)
- [Test results](screenshots/4.%20test_api_successfully.png)

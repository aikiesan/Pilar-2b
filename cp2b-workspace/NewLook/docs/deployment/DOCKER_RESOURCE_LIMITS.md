# Docker Resource Limits Configuration Guide

## Executive Summary

**Status:** ⚠️ **CRITICAL - MUST CONFIGURE BEFORE PRODUCTION**

Resource limits prevent a single container from consuming all host resources, which could:
- Crash the entire server
- Impact other services on the same host
- Cause cascading failures
- Lead to unpredictable costs in cloud environments

## Why Resource Limits Are Critical

### Without Limits (Current Risk)

```
┌─────────────────────────────────────┐
│  Host Server (8 CPU, 16GB RAM)     │
│                                     │
│  ┌──────────────────────────────┐  │
│  │ CP2B Backend Container       │  │
│  │ Memory Leak: 15.9GB ❌       │  │
│  │ CPU: 7.8 cores ❌            │  │
│  └──────────────────────────────┘  │
│                                     │
│  Other services: CRASHED ❌         │
│  Host: Out of Memory Killer         │
└─────────────────────────────────────┘
```

### With Limits (Protected)

```
┌─────────────────────────────────────┐
│  Host Server (8 CPU, 16GB RAM)     │
│                                     │
│  ┌──────────────────────────────┐  │
│  │ CP2B Backend Container       │  │
│  │ Limit: 4GB RAM ✅            │  │
│  │ Limit: 2 CPUs ✅             │  │
│  │ Container restarts if OOM    │  │
│  └──────────────────────────────┘  │
│                                     │
│  Other services: HEALTHY ✅         │
│  Host: Available resources ✅       │
└─────────────────────────────────────┘
```

## Recommended Resource Limits

### Production Environment

Based on Sprint 4 performance testing (p95 < 3s):

| Resource | Minimum | Recommended | Maximum |
|----------|---------|-------------|---------|
| **CPU** | 1 core | 2 cores | 4 cores |
| **Memory** | 2GB | 4GB | 8GB |
| **Swap** | 0 (disabled) | 0 | 0 |
| **Storage** | 10GB | 20GB | 50GB |

**Rationale:**
- 2 CPU cores: Handles 50-100 concurrent requests
- 4GB RAM: Comfortable buffer for connection pool (20 connections) + caching
- No swap: Prevents performance degradation (use OOM killer instead)

### Development Environment

| Resource | Value |
|----------|-------|
| CPU | 1 core |
| Memory | 2GB |
| Storage | 10GB |

## Configuration by Platform

### 1. Railway (Current Production)

**Via Dashboard:**

```
1. Go to: https://railway.app/project/[your-project-id]
2. Select: "newlook-production" service
3. Click: Settings → Resources
4. Configure:
   - Memory Limit: 4096 MB (4GB)
   - CPU Limit: 2000 millicores (2 cores)
   - Restart Policy: Always
   - Restart Timeout: 60 seconds
5. Save changes
```

**Via `railway.toml`:**

```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "backend/Dockerfile"

[deploy]
startCommand = "uvicorn app.main:app --host 0.0.0.0 --port $PORT"
healthcheckPath = "/health"
healthcheckTimeout = 10
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3

# Resource limits
[[deploy.resources]]
cpuLimit = 2.0        # 2 CPU cores
memoryLimit = 4096    # 4GB RAM
```

**Verification:**
```bash
# Check current limits
railway run env | grep RAILWAY

# Monitor resource usage
railway logs --tail
```

### 2. Render (Alternative/Migration Target)

**Via Dashboard:**

```
1. Go to: https://dashboard.render.com/
2. Select your backend service
3. Go to: Settings → Instance
4. Choose Instance Type:
   - Starter: 512MB RAM, 0.5 CPU (❌ Too small)
   - Standard: 2GB RAM, 1 CPU (🟡 Minimum)
   - Pro: 4GB RAM, 2 CPU (✅ Recommended)
   - Pro Plus: 8GB RAM, 4 CPU (🟢 High traffic)
```

**Resource Limits per Plan:**

| Plan | CPU | RAM | Price/month |
|------|-----|-----|-------------|
| Free | Shared | 512MB | $0 (❌ Not production-ready) |
| Starter | 0.5 | 512MB | $7 (❌ Too limited) |
| Standard | 1 | 2GB | $25 (🟡 Minimum) |
| Pro | 2 | 4GB | $85 (✅ Recommended) |
| Pro Plus | 4 | 8GB | $170 (High traffic) |

**Via `render.yaml`:**

```yaml
services:
  - type: web
    name: cp2b-backend
    env: docker
    dockerfilePath: ./backend/Dockerfile
    plan: pro  # 4GB RAM, 2 CPU

    # Health check
    healthCheckPath: /health

    # Auto-scaling (optional)
    autoDeploy: true
    scaling:
      minInstances: 1
      maxInstances: 3
      targetMemoryPercent: 80
      targetCPUPercent: 80

    # Environment variables
    envVars:
      - key: APP_ENV
        value: production
      - key: PORT
        value: 8000
```

### 3. Docker Compose (Self-Hosted)

Use the provided `docker-compose.production.yml`:

```bash
# Start with resource limits
docker-compose -f docker-compose.production.yml up -d

# Verify limits are applied
docker inspect cp2b-backend | grep -A 10 "Resources"

# Expected output:
# "NanoCpus": 2000000000,  (2 CPUs)
# "Memory": 4294967296,     (4GB)
```

**Monitor resource usage:**
```bash
# Real-time monitoring
docker stats cp2b-backend

# Expected output:
# NAME            CPU %    MEM USAGE / LIMIT    MEM %
# cp2b-backend    25%      1.2GB / 4GB          30%
```

### 4. Kubernetes (Future Migration)

**Resource Limits in Pod Spec:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cp2b-backend
spec:
  replicas: 2
  template:
    spec:
      containers:
      - name: backend
        image: cp2b-maps-backend:latest
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"    # 1 CPU
          limits:
            memory: "4Gi"
            cpu: "2000m"    # 2 CPUs
        livenessProbe:
          httpGet:
            path: /health/live
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 8000
          initialDelaySeconds: 10
          periodSeconds: 5
```

## Testing Resource Limits

### 1. Load Testing

**Install dependencies:**
```bash
pip install locust
```

**Create load test:**
```python
# locustfile.py
from locust import HttpUser, task, between

class CP2BUser(HttpUser):
    wait_time = between(1, 3)

    @task(3)
    def get_municipalities(self):
        self.client.get("/api/v1/geospatial/municipalities")

    @task(2)
    def proximity_analysis(self):
        self.client.get(
            "/api/v1/proximity/search",
            params={"latitude": -23.55, "longitude": -46.63, "radius_km": 50}
        )

    @task(1)
    def health_check(self):
        self.client.get("/health")
```

**Run load test:**
```bash
# Test with 100 users, spawn 10/second
locust -f locustfile.py --host https://newlook-production.up.railway.app --users 100 --spawn-rate 10

# Monitor container during test
docker stats cp2b-backend

# Or for Railway
railway logs --tail
```

### 2. Memory Stress Test

**Trigger memory usage:**
```python
# stress_test.py
import requests
import concurrent.futures

def make_request():
    response = requests.get(
        "https://newlook-production.up.railway.app/api/v1/geospatial/municipalities",
        params={"format": "geojson"}  # Large response
    )
    return response.status_code

# Bombard with requests
with concurrent.futures.ThreadPoolExecutor(max_workers=50) as executor:
    futures = [executor.submit(make_request) for _ in range(1000)]
    results = [f.result() for f in concurrent.futures.as_completed(futures)]

print(f"Success rate: {results.count(200) / len(results) * 100}%")
```

**Expected Behavior:**
- Memory usage increases to ~60-80% of limit
- Container **DOES NOT** exceed 4GB
- If OOM, container restarts gracefully
- Load balancer redirects traffic to healthy instances

### 3. CPU Stress Test

**Test CPU-intensive operations:**
```bash
# Economic simulation (CPU-heavy)
curl -X POST "https://newlook-production.up.railway.app/api/v1/economic/simulation" \
  -H "Content-Type: application/json" \
  -d '{
    "municipality_code": "3550308",
    "investment_amount": 10000000,
    "sectors": ["agriculture", "energy"],
    "calculation_type": "detailed"
  }'

# Monitor CPU usage
watch -n 1 'railway logs --tail | grep "CPU"'
```

## Monitoring & Alerts

### Railway Monitoring

**Built-in Metrics:**
- Memory usage graph (last 24h)
- CPU usage graph (last 24h)
- Request rate
- Error rate

**Set Up Alerts:**
```
1. Settings → Notifications
2. Add webhook for:
   - Memory > 90% for 5 minutes
   - CPU > 90% for 5 minutes
   - Service down
3. Integrate with:
   - Slack
   - Discord
   - PagerDuty
   - Custom webhook
```

### Prometheus + Grafana (Advanced)

**Export metrics:**
```python
# Add to requirements.txt
prometheus-client==0.19.0

# app/monitoring.py
from prometheus_client import Counter, Histogram, Gauge, generate_latest
from fastapi import Response

# Define metrics
request_count = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint', 'status'])
request_duration = Histogram('http_request_duration_seconds', 'HTTP request duration')
memory_usage = Gauge('process_memory_bytes', 'Process memory usage in bytes')

@app.get("/metrics")
async def metrics():
    return Response(content=generate_latest(), media_type="text/plain")
```

**Grafana Dashboard:**
- Import dashboard ID: 11714 (FastAPI metrics)
- Add panels for:
  - Request rate
  - Error rate
  - p95 latency
  - Memory usage
  - CPU usage
  - Connection pool utilization

## Resource Limit Violations

### Out of Memory (OOM)

**Symptoms:**
```
Container cp2b-backend exited with code 137
OOMKilled: true
```

**Troubleshooting:**
```bash
# Check memory usage before crash
railway logs --tail 100 | grep "memory"

# Common causes:
# 1. Memory leak in code
# 2. Too many concurrent requests
# 3. Large result sets not paginated
# 4. Connection pool not closing connections
```

**Solutions:**
1. **Increase memory limit** (short-term)
   ```toml
   memoryLimit = 8192  # 8GB
   ```

2. **Fix memory leak** (long-term)
   ```python
   # Ensure connections are closed
   with get_db() as conn:
       cursor = conn.cursor()
       # ... use connection
       cursor.close()  # Explicit close
   # Connection returned to pool automatically
   ```

3. **Add pagination**
   ```python
   # Limit result set size
   cursor.execute("SELECT * FROM table LIMIT %s OFFSET %s", (limit, offset))
   ```

### CPU Throttling

**Symptoms:**
```
High CPU usage (>90%)
Slow response times (p95 > 10s)
Request timeouts
```

**Troubleshooting:**
```python
# Add timing logs
import time
start = time.time()
# ... operation
logger.info(f"Operation took {time.time() - start:.2f}s")
```

**Solutions:**
1. **Increase CPU limit**
   ```toml
   cpuLimit = 4.0  # 4 cores
   ```

2. **Optimize queries**
   ```sql
   -- Add indexes
   CREATE INDEX idx_municipality_code ON municipalities(codigo_ibge);

   -- Use EXPLAIN ANALYZE to find slow queries
   EXPLAIN ANALYZE SELECT ...
   ```

3. **Enable caching**
   ```python
   # Already implemented in Sprint 4
   from app.services.cache_service import cached
   ```

## Cost Analysis

### Railway Pricing

| CPU Limit | Memory Limit | Est. Cost/month |
|-----------|--------------|-----------------|
| 1 core | 2GB | ~$20-30 |
| 2 cores | 4GB | ~$40-60 (✅ Recommended) |
| 4 cores | 8GB | ~$80-120 |

**Calculate your cost:**
```
Cost = ($10/GB-month × Memory) + ($10/vCPU-month × CPU)
Example: (4GB × $10) + (2 CPU × $10) = $60/month
```

### Render Pricing

Fixed pricing per plan (see table above).

**Recommendation:** Pro plan ($85/month) for production.

## Implementation Checklist

### Before Production

- [ ] **Configure resource limits in Railway**
  - [ ] Set CPU limit: 2 cores
  - [ ] Set memory limit: 4GB
  - [ ] Enable auto-restart on failure

- [ ] **Test resource limits**
  - [ ] Run load test (100 concurrent users)
  - [ ] Verify memory stays under limit
  - [ ] Verify CPU usage is reasonable (<80%)
  - [ ] Test OOM behavior (does it restart?)

- [ ] **Set up monitoring**
  - [ ] Configure Railway alerts (memory >90%, CPU >90%)
  - [ ] Set up Sentry for error tracking
  - [ ] Create dashboard for key metrics

- [ ] **Document limits**
  - [ ] Add to runbook
  - [ ] Include in incident response procedures
  - [ ] Train team on interpreting metrics

### Post-Production

- [ ] **Week 1: Monitor closely**
  - Daily check of resource usage
  - Adjust limits if needed
  - Document any issues

- [ ] **Month 1: Optimize**
  - Review slow queries
  - Optimize memory usage
  - Fine-tune limits based on actual usage

- [ ] **Quarterly: Review**
  - Analyze resource trends
  - Plan for scaling
  - Update limits as needed

## References

- [Docker Resource Constraints](https://docs.docker.com/config/containers/resource_constraints/)
- [Railway Resource Limits](https://docs.railway.app/deploy/resource-limits)
- [Render Instance Types](https://render.com/docs/instance-types)
- [Kubernetes Resource Management](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)

---

**Sprint 4 Security Review**
**Status:** ⚠️ **ACTION REQUIRED - Configure before production**
**Priority:** CRITICAL
**Date:** 2026-01-25

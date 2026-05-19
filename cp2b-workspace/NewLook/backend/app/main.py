"""
PILAR-2b V3 Backend API
FastAPI application for geospatial biogas potential analysis
Sprint 4: Performance optimizations, error handling, and production deployment
"""
import os

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
import uvicorn
from datetime import datetime, timezone
from slowapi.errors import RateLimitExceeded
import logging

log = logging.getLogger(__name__)

from app.core.config import settings
from app.core.database import test_db_connection
from app.api.v1.api import api_router
from app.middleware.rate_limiter import rate_limit_middleware
from app.middleware.response_compression import gzip_middleware
from app.middleware.rate_limit import limiter, rate_limit_exceeded_handler
from app.middleware.request_size_limit import request_size_limit_middleware
from app.middleware.validation import validation_middleware
from app.services.cache_service import get_all_cache_stats

# Create FastAPI app - disable docs in production
_is_production = settings.APP_ENV == "production"
app = FastAPI(
    title="PILAR-2b V3 API",
    description="Backend API for biogas potential analysis platform",
    version="3.0.0",
    docs_url=None if _is_production else "/docs",
    redoc_url=None if _is_production else "/redoc",
)

# Register slowapi limiter with FastAPI app
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# Sprint 4: Performance & Security Middleware (applied in order)
# 1. Request size limiting (prevents DoS via large payloads)
app.middleware("http")(request_size_limit_middleware)

# 2. Rate limiting (prevents abuse)
app.middleware("http")(rate_limit_middleware)

# 3. Input validation & injection detection (blocks SQLi/CMDi in query params)
app.middleware("http")(validation_middleware)

# 4. CORS middleware - Allow specific PILAR-2b deployments only
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_all_origins(),  # Includes localhost origins
    # Restrict to PILAR-2b specific subdomains only
    # Vercel: new-look*.vercel.app, cp2b-maps*.vercel.app
    # Cloudflare: cp2bmaps.pages.dev and numbered previews
    allow_origin_regex=r"https://(new-look.*|cp2b-maps.*)\.vercel\.app|https://(cp2bmaps|\w{8}\.cp2bmaps)\.pages\.dev",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],  # Explicit methods
    allow_headers=["*"],  # Allow all headers for preflight compatibility
    expose_headers=["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Window"],
    max_age=3600,  # Cache preflight requests for 1 hour
)

# 5. Response compression (reduces bandwidth)
app.middleware("http")(gzip_middleware)

# 6. Trusted host middleware - Prevents host header injection attacks
# NOTE: TrustedHostMiddleware doesn't support wildcards in allowed_hosts
# Using specific domains only. CORS middleware above handles origin validation.
# For production, we allow:
# - Render backend domain (update with your actual Render service name)
# - Railway backend domain (legacy, remove after migration complete)
# - Localhost for development
# - Wildcard disabled to prevent security issues
if settings.APP_ENV == "production":
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=[
            "cp2b.unicamp.br",
            "cp2b-maps-backend.onrender.com",
            "newlook-production.up.railway.app",
            "localhost",
            "127.0.0.1",
        ]
    )
else:
    # Development: Allow all hosts
    # In production, CORS already validates origins
    pass

# Include API routes
app.include_router(api_router, prefix="/api/v1")

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "PILAR-2b V3 API",
        "version": "3.0.0",
        "docs": "/docs",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    """
    Comprehensive health check endpoint with database verification.
    Returns current timestamp and database connectivity status.
    """
    health_status = {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": settings.VERSION,
        "environment": settings.APP_ENV
    }

    # Check database connectivity
    try:
        db_healthy = test_db_connection()
        health_status["database"] = "connected" if db_healthy else "error"

        if not db_healthy:
            health_status["status"] = "degraded"
            return JSONResponse(
                status_code=200,  # Still return 200 for degraded state
                content=health_status
            )

    except Exception as e:
        health_status["status"] = "unhealthy"
        health_status["database"] = "disconnected"
        health_status["error"] = str(e)
        return JSONResponse(
            status_code=503,  # Service unavailable
            content=health_status
        )

    return health_status


@app.get("/health/ready")
async def readiness_check():
    """Kubernetes-style readiness probe - checks if app can serve traffic"""
    try:
        if test_db_connection():
            return {"ready": True, "timestamp": datetime.now(timezone.utc).isoformat()}
        return JSONResponse(
            status_code=503,
            content={"ready": False, "reason": "database_unavailable"}
        )
    except Exception as e:
        log.error("Readiness check failed: %s", e, exc_info=True)
        return JSONResponse(
            status_code=503,
            content={"ready": False, "reason": "Internal server error"}
        )


@app.get("/health/live")
async def liveness_check():
    """Kubernetes-style liveness probe - checks if app process is alive"""
    return {
        "alive": True,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@app.get("/stats/cache")
async def cache_statistics():
    """
    Cache performance statistics (Sprint 4)
    Shows hit rates and cache efficiency
    """
    stats = get_all_cache_stats()
    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "caches": stats
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info"
    )
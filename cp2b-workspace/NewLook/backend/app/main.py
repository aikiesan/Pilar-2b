"""
PILAR-2b V3 Backend API
FastAPI application for geospatial biogas potential analysis
Sprint 4: Performance optimizations, error handling, and production deployment

Copyright (C) 2025-2026 PILAR-2b Contributors

This program is free software: you can redistribute it and/or modify it
under the terms of the GNU General Public License as published by the Free
Software Foundation, version 3.

This program is distributed in the hope that it will be useful, but WITHOUT
ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with
this program. If not, see <https://www.gnu.org/licenses/>.

SPDX-License-Identifier: GPL-3.0-only
"""

import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded

from app.api.v1.api import api_router
from app.core.config import settings
from app.core.database import test_db_connection
from app.core.log_sanitizer import PiiRedactingFilter
from app.middleware.rate_limit import limiter, rate_limit_exceeded_handler
from app.middleware.rate_limiter import rate_limit_middleware
from app.middleware.request_size_limit import request_size_limit_middleware
from app.middleware.security_headers import security_headers_middleware
from app.middleware.validation import validation_middleware
from app.services.cache_service import get_all_cache_stats

# Redact PII (e-mails, CPF/CNPJ) from all log records (LGPD data-minimisation).
logging.getLogger().addFilter(PiiRedactingFilter())

log = logging.getLogger(__name__)


def canonical_parameters_available() -> bool:
    """Whether feedstocks.yaml can be found in this deployment's layout."""
    from app.services.canonical_loader import resolve_feedstocks_path

    return resolve_feedstocks_path().is_file()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # A missing feedstocks.yaml is a deployment misconfiguration, not a per-request
    # condition, but the map endpoints catch it per-municipality — which once turned a
    # total loss of canonical data into ~105k warnings and no visible failure. Say it
    # once, at boot, where it is actually actionable. Not fatal: map_metrics is
    # deliberately usable without the YAML.
    from app.services.canonical_loader import resolve_feedstocks_path

    path = resolve_feedstocks_path()
    if path.is_file():
        log.info("Canonical parameters loaded from %s", path)
    else:
        log.error(
            "Canonical parameters NOT FOUND at %s — every biogas metric will be absent "
            "from API responses and the map will silently fall back to legacy columns. "
            "In Docker, mount data/canonical_parameters into the container; otherwise "
            "set CANONICAL_PARAMETERS_PATH.",
            path,
        )
    yield


# Create FastAPI app - disable docs in production
_is_production = settings.APP_ENV == "production"
app = FastAPI(
    title="PILAR-2b V3 API",
    description="Backend API for biogas potential analysis platform",
    version="3.0.0",
    docs_url=None if _is_production else "/docs",
    redoc_url=None if _is_production else "/redoc",
    lifespan=lifespan,
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

# 3b. Security headers (X-Content-Type-Options, X-Frame-Options, HSTS, …)
app.middleware("http")(security_headers_middleware)

# 4. CORS middleware - Allow specific PILAR-2b deployments only
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_all_origins(),  # Includes localhost origins
    # Restrict to PILAR-2b specific subdomains only
    # Vercel: new-look*.vercel.app, cp2b-maps*.vercel.app
    # Cloudflare: cp2bmaps.pages.dev and numbered previews
    allow_origin_regex=(
        r"https://(new-look.*|cp2b-maps.*)\.vercel\.app"
        r"|https://(cp2bmaps|\w{8}\.cp2bmaps)\.pages\.dev"
    ),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],  # Explicit methods
    allow_headers=["*"],  # Allow all headers for preflight compatibility
    expose_headers=["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Window"],
    max_age=3600,  # Cache preflight requests for 1 hour
)

# 5. Response compression (reduces bandwidth)
#
# Starlette's GZipMiddleware, not a hand-rolled one: `call_next` hands back a
# StreamingResponse, which has no `.body`. The previous middleware guarded on
# `hasattr(response, "body")`, so its compression branch was unreachable and
# nothing was ever compressed — /municipalities/geojson shipped its 12.1 MB
# uncompressed even when the client sent `Accept-Encoding: gzip`.
app.add_middleware(GZipMiddleware, minimum_size=1024)

# 6. Trusted host middleware - Prevents host header injection attacks
# NOTE: TrustedHostMiddleware doesn't support wildcards in allowed_hosts
# Using specific domains only. CORS middleware above handles origin validation.
# For production, we allow:
# - Unicamp VM domain
# - Render backend domain (legacy mirror)
# - Localhost for development
# - Wildcard disabled to prevent security issues
if settings.APP_ENV == "production":
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=[
            "cp2b.unicamp.br",
            "cp2b-maps-backend.onrender.com",
            "localhost",
            "127.0.0.1",
        ],
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
    return {"message": "PILAR-2b V3 API", "version": "3.0.0", "docs": "/docs", "status": "running"}


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
        "environment": settings.APP_ENV,
    }

    # Canonical parameters: without them the API still serves, but every biogas
    # metric is missing — degraded, not unhealthy.
    if canonical_parameters_available():
        health_status["canonical_parameters"] = "available"
    else:
        health_status["canonical_parameters"] = "missing"
        health_status["status"] = "degraded"

    # Check database connectivity
    try:
        db_healthy = test_db_connection()
        health_status["database"] = "connected" if db_healthy else "error"

        if not db_healthy:
            health_status["status"] = "degraded"
            return JSONResponse(
                status_code=200, content=health_status  # Still return 200 for degraded state
            )

    except Exception as e:
        health_status["status"] = "unhealthy"
        health_status["database"] = "disconnected"
        health_status["error"] = str(e)
        return JSONResponse(status_code=503, content=health_status)  # Service unavailable

    return health_status


@app.get("/health/ready")
async def readiness_check():
    """Kubernetes-style readiness probe - checks if app can serve traffic"""
    try:
        if test_db_connection():
            return {"ready": True, "timestamp": datetime.now(timezone.utc).isoformat()}
        return JSONResponse(
            status_code=503, content={"ready": False, "reason": "database_unavailable"}
        )
    except Exception as e:
        log.error("Readiness check failed: %s", e, exc_info=True)
        return JSONResponse(
            status_code=503, content={"ready": False, "reason": "Internal server error"}
        )


@app.get("/health/live")
async def liveness_check():
    """Kubernetes-style liveness probe - checks if app process is alive"""
    return {"alive": True, "timestamp": datetime.now(timezone.utc).isoformat()}


@app.get("/stats/cache")
async def cache_statistics():
    """
    Cache performance statistics (Sprint 4)
    Shows hit rates and cache efficiency
    """
    stats = get_all_cache_stats()
    return {"timestamp": datetime.now(timezone.utc).isoformat(), "caches": stats}


if __name__ == "__main__":
    uvicorn.run(
        "main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG, log_level="info"
    )

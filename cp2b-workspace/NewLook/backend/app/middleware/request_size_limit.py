"""
Request Size Limit Middleware
Prevents DoS attacks via oversized request bodies

Sprint 4: Production Security Hardening
"""
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    """
    Middleware to enforce maximum request body size.

    Prevents DoS attacks via large payloads that could:
    - Exhaust server memory
    - Slow down request processing
    - Fill up disk space

    Configuration:
    - MAX_REQUEST_SIZE in settings (default: 10MB)

    Returns:
    - 413 Payload Too Large if request exceeds limit
    """

    def __init__(self, app: ASGIApp, max_size: int = None):
        """
        Initialize middleware with max request size.

        Args:
            app: ASGI application
            max_size: Maximum request size in bytes (default from settings)
        """
        super().__init__(app)
        self.max_size = max_size or settings.MAX_REQUEST_SIZE
        logger.info(f"✅ Request size limit enabled: {self.max_size / 1_000_000:.1f}MB")

    async def dispatch(self, request: Request, call_next) -> Response:
        """
        Check request size before processing.

        Args:
            request: Incoming HTTP request
            call_next: Next middleware in chain

        Returns:
            Response from next middleware or 413 error
        """
        # Check Content-Length header
        if "content-length" in request.headers:
            content_length = int(request.headers["content-length"])

            if content_length > self.max_size:
                logger.warning(
                    f"Request rejected: size {content_length} bytes exceeds limit "
                    f"({self.max_size} bytes) from {request.client.host}"
                )
                return JSONResponse(
                    status_code=413,
                    content={
                        "detail": "Request body too large",
                        "max_size_mb": self.max_size / 1_000_000,
                        "received_size_mb": content_length / 1_000_000
                    }
                )

        # Process request
        response = await call_next(request)
        return response


async def request_size_limit_middleware(request: Request, call_next):
    """
    Standalone middleware function for request size limiting.

    Alternative to RequestSizeLimitMiddleware class.
    Use this for app.middleware("http") decorator pattern.

    Args:
        request: Incoming HTTP request
        call_next: Next middleware/handler

    Returns:
        Response from next handler or 413 error
    """
    if "content-length" in request.headers:
        content_length = int(request.headers["content-length"])

        if content_length > settings.MAX_REQUEST_SIZE:
            logger.warning(
                f"⚠️  Large request rejected: {content_length / 1_000_000:.1f}MB "
                f"from {request.client.host if request.client else 'unknown'}"
            )
            return JSONResponse(
                status_code=413,
                content={
                    "detail": "Request body too large",
                    "max_size_mb": settings.MAX_REQUEST_SIZE / 1_000_000,
                    "received_size_mb": content_length / 1_000_000
                }
            )

    response = await call_next(request)
    return response


__all__ = [
    "RequestSizeLimitMiddleware",
    "request_size_limit_middleware"
]

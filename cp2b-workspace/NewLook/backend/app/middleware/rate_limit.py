"""
Rate limiting middleware for API endpoints
Prevents brute force attacks and API abuse
"""

import logging

from fastapi import Request
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

logger = logging.getLogger(__name__)

# Create limiter instance
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200/minute"],  # Global rate limit
    storage_uri="memory://",  # Use in-memory storage (upgrade to Redis for production)
    strategy="fixed-window",  # or "moving-window" for more accuracy
    headers_enabled=True,  # Include rate limit headers in response
)


def get_client_ip(request: Request) -> str:
    """
    Get client IP address from request.
    Handles X-Forwarded-For header for proxied requests.

    Args:
        request: FastAPI request object

    Returns:
        Client IP address as string
    """
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        # Take the first IP in the chain
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def rate_limit_key_func(request: Request) -> str:
    """
    Generate rate limit key based on client IP and endpoint.

    Args:
        request: FastAPI request object

    Returns:
        Unique key for rate limiting
    """
    client_ip = get_client_ip(request)
    endpoint = request.url.path
    return f"{client_ip}:{endpoint}"


# NOTE on headers_enabled: with headers_enabled=True, slowapi's decorator must
# inject X-RateLimit-* headers after the endpoint returns, which requires every
# decorated endpoint to declare a `response: Response` parameter (or return a
# Response). Ours return Pydantic models without one, so slowapi raised
# "parameter `response` must be an instance of starlette.responses.Response"
# on EVERY successful call — login could never succeed on a live server
# (found live 2026-07-09). Limits are still fully enforced without the headers.

# Auth-specific limiter with stricter limits
auth_limiter = Limiter(
    key_func=rate_limit_key_func,
    default_limits=["5/minute"],  # 5 requests per minute for auth endpoints
    storage_uri="memory://",
    strategy="fixed-window",
    headers_enabled=False,
)

# Login-specific limiter (most restrictive)
login_limiter = Limiter(
    key_func=rate_limit_key_func,
    default_limits=["3/minute", "20/hour"],  # 3 per minute, 20 per hour
    storage_uri="memory://",
    strategy="fixed-window",
    headers_enabled=False,
)

# Read-only endpoint limiter (more permissive)
read_limiter = Limiter(
    key_func=rate_limit_key_func,
    default_limits=["100/minute"],  # 100 requests per minute for read operations
    storage_uri="memory://",
    strategy="fixed-window",
    headers_enabled=False,
)


async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    """
    Custom handler for rate limit exceeded errors.

    Args:
        request: FastAPI request object
        exc: RateLimitExceeded exception

    Returns:
        JSON error response
    """
    client_ip = get_client_ip(request)
    logger.warning(
        f"Rate limit exceeded: {client_ip} on {request.url.path}",
        extra={
            "client_ip": client_ip,
            "endpoint": request.url.path,
            "method": request.method,
        },
    )

    # slowapi's default handler is synchronous and returns a JSONResponse —
    # awaiting it raised TypeError, turning every 429 into a 500 (live find,
    # 2026-07-09).
    return _rate_limit_exceeded_handler(request, exc)


# Export limiter instances
__all__ = [
    "limiter",
    "auth_limiter",
    "login_limiter",
    "read_limiter",
    "rate_limit_exceeded_handler",
    "get_client_ip",
]

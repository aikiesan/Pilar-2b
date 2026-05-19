"""
Rate limiting middleware for API endpoints
Prevents brute force attacks and API abuse
"""
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request
import logging

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

# Auth-specific limiter with stricter limits
auth_limiter = Limiter(
    key_func=rate_limit_key_func,
    default_limits=["5/minute"],  # 5 requests per minute for auth endpoints
    storage_uri="memory://",
    strategy="fixed-window",
    headers_enabled=True,
)

# Login-specific limiter (most restrictive)
login_limiter = Limiter(
    key_func=rate_limit_key_func,
    default_limits=["3/minute", "20/hour"],  # 3 per minute, 20 per hour
    storage_uri="memory://",
    strategy="fixed-window",
    headers_enabled=True,
)

# Read-only endpoint limiter (more permissive)
read_limiter = Limiter(
    key_func=rate_limit_key_func,
    default_limits=["100/minute"],  # 100 requests per minute for read operations
    storage_uri="memory://",
    strategy="fixed-window",
    headers_enabled=True,
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
        }
    )

    return await _rate_limit_exceeded_handler(request, exc)

# Export limiter instances
__all__ = [
    "limiter",
    "auth_limiter",
    "login_limiter",
    "read_limiter",
    "rate_limit_exceeded_handler",
    "get_client_ip",
]

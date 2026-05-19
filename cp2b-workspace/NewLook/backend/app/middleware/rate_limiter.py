"""
Rate Limiting Middleware for PILAR-2b V3
Prevents spam and abuse - max 10 analyses per user per minute
Sprint 4: Task 4.1 - Performance Optimization
"""

from fastapi import Request, status
from fastapi.responses import JSONResponse
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict, Tuple
import logging

logger = logging.getLogger(__name__)


class RateLimiter:
    """
    Simple in-memory rate limiter
    
    Production note: For multi-server deployments, use Redis-based rate limiting
    """
    
    def __init__(self, max_requests: int = 10, window_minutes: int = 1):
        """
        Args:
            max_requests: Maximum requests allowed per window
            window_minutes: Time window in minutes
        """
        self.max_requests = max_requests
        self.window_minutes = window_minutes
        # Store: {client_id: [(timestamp1, request_count), ...]}
        self.requests: Dict[str, list] = defaultdict(list)
        
    def is_allowed(self, client_id: str) -> Tuple[bool, int, int]:
        """
        Check if request is allowed for client
        
        Args:
            client_id: Unique identifier (IP or user ID)
            
        Returns:
            Tuple of (is_allowed, remaining_requests, retry_after_seconds)
        """
        now = datetime.now()
        cutoff_time = now - timedelta(minutes=self.window_minutes)
        
        # Clean old requests
        self.requests[client_id] = [
            (timestamp, count) for timestamp, count in self.requests[client_id]
            if timestamp > cutoff_time
        ]
        
        # Count requests in current window
        total_requests = sum(count for _, count in self.requests[client_id])
        
        if total_requests >= self.max_requests:
            # Calculate retry-after (seconds until oldest request expires)
            if self.requests[client_id]:
                oldest_request_time = min(ts for ts, _ in self.requests[client_id])
                retry_after = int((oldest_request_time + timedelta(minutes=self.window_minutes) - now).total_seconds())
                return False, 0, max(retry_after, 1)
            return False, 0, 60
        
        # Allow request and record it
        self.requests[client_id].append((now, 1))
        remaining = self.max_requests - total_requests - 1
        
        return True, remaining, 0
    
    def reset(self, client_id: str):
        """Reset rate limit for a specific client (admin use)"""
        if client_id in self.requests:
            del self.requests[client_id]


# Global rate limiter instances
analysis_rate_limiter = RateLimiter(max_requests=300, window_minutes=1)
general_rate_limiter = RateLimiter(max_requests=300, window_minutes=1)


async def rate_limit_middleware(request: Request, call_next):
    """
    Middleware to apply rate limiting to API endpoints
    """
    # Skip rate limiting for OPTIONS preflight requests (CORS)
    if request.method == "OPTIONS":
        return await call_next(request)

    # Get client identifier (prefer user ID, fallback to IP)
    client_id = request.client.host if request.client else "unknown"
    
    # Check if authenticated user
    if hasattr(request.state, "user") and request.state.user:
        client_id = f"user_{request.state.user.get('id', client_id)}"
    
    # Determine rate limiter based on endpoint
    path = request.url.path
    
    # Apply stricter limits to analysis endpoints
    if "/proximity/analyze" in path or "/analysis/" in path:
        rate_limiter = analysis_rate_limiter
        endpoint_type = "analysis"
    else:
        rate_limiter = general_rate_limiter
        endpoint_type = "general"
    
    # Check rate limit
    is_allowed, remaining, retry_after = rate_limiter.is_allowed(client_id)
    
    if not is_allowed:
        logger.warning(
            f"Rate limit exceeded for {client_id} on {endpoint_type} endpoint: {path}"
        )
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={
                "detail": f"Taxa de requisições excedida. Tente novamente em {retry_after} segundos.",
                "error_code": "RATE_LIMIT_EXCEEDED",
                "retry_after": retry_after,
                "limit": rate_limiter.max_requests,
                "window_minutes": rate_limiter.window_minutes
            },
            headers={
                "Retry-After": str(retry_after),
                "X-RateLimit-Limit": str(rate_limiter.max_requests),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(retry_after)
            }
        )
    
    # Add rate limit headers to response
    response = await call_next(request)
    response.headers["X-RateLimit-Limit"] = str(rate_limiter.max_requests)
    response.headers["X-RateLimit-Remaining"] = str(remaining)
    response.headers["X-RateLimit-Window"] = f"{rate_limiter.window_minutes}m"
    
    return response


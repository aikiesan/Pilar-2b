"""
Response Compression Middleware for PILAR-2b V3
Compress API responses with gzip for faster transmission
Sprint 4: Task 4.1 - Performance Optimization
"""

from fastapi import Request
from fastapi.responses import Response
import gzip
import logging

logger = logging.getLogger(__name__)


async def gzip_middleware(request: Request, call_next):
    """
    Compress responses if client supports gzip encoding
    
    Compresses responses > 1KB to reduce bandwidth usage
    """
    response = await call_next(request)
    
    # Check if client accepts gzip
    accept_encoding = request.headers.get("accept-encoding", "")
    
    if "gzip" not in accept_encoding:
        return response
    
    # Only compress if response is large enough (>1KB) and not already compressed
    if (
        hasattr(response, "body") 
        and len(response.body) > 1024 
        and "content-encoding" not in response.headers
    ):
        try:
            # Compress response body
            compressed_body = gzip.compress(response.body, compresslevel=6)
            
            # Calculate compression ratio
            original_size = len(response.body)
            compressed_size = len(compressed_body)
            ratio = (1 - compressed_size / original_size) * 100
            
            logger.debug(
                f"Compressed response: {original_size}B → {compressed_size}B "
                f"({ratio:.1f}% reduction)"
            )
            
            # Update response
            response.headers["Content-Encoding"] = "gzip"
            response.headers["Content-Length"] = str(compressed_size)
            
            # Create new response with compressed body
            return Response(
                content=compressed_body,
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type=response.media_type
            )
        except Exception as e:
            logger.error(f"Compression failed: {e}")
            return response
    
    return response


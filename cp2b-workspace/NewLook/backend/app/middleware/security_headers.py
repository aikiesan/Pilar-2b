"""
Security headers middleware for PILAR-2b.

Adds baseline HTTP security headers to every API response, supporting the
'security of processing' duty (LGPD Art. 46). These headers are safe for a JSON
API and do not affect payloads. The Content-Security-Policy for the *frontend*
HTML is set separately in the Next.js config; it is intentionally not enforced
here so it cannot break the map tiles or the inline theme script.
"""

from fastapi import Request


async def security_headers_middleware(request: Request, call_next):
    response = await call_next(request)
    # Prevent MIME-type sniffing.
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    # Disallow framing (clickjacking protection); the API is not meant to be embedded.
    response.headers.setdefault("X-Frame-Options", "DENY")
    # Don't leak full URLs as referrers to third parties.
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    # Drop access to powerful browser features the API never needs.
    response.headers.setdefault(
        "Permissions-Policy", "geolocation=(), microphone=(), camera=()"
    )
    # Enforce HTTPS for a year (the platform is served over TLS in production).
    response.headers.setdefault(
        "Strict-Transport-Security", "max-age=31536000; includeSubDomains"
    )
    return response

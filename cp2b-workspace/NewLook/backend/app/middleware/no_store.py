"""Cache-Control: private, no-store on every response that depends on who asks.

Analyses (and the admin routes that decide who sees them) answer differently
per person, so no shared proxy or browser may keep a copy. Setting the header
here, not only in the handlers, covers the paths no handler reaches: 401, 403,
404, 422, 429, redirects and unhandled errors.
"""

import logging
import re

from fastapi import Request
from fastapi.responses import JSONResponse

log = logging.getLogger(__name__)

NO_STORE = "private, no-store"
_PREFIXES = ("/api/v1/analyses", "/api/v1/admin/analyses")
_CLEARANCE = re.compile(r"/api/v1/auth/users/[^/]+/clearance/?")


def is_no_store_path(path: str) -> bool:
    return path.startswith(_PREFIXES) or _CLEARANCE.fullmatch(path) is not None


async def no_store_middleware(request: Request, call_next):
    if not is_no_store_path(request.url.path):
        return await call_next(request)
    try:
        response = await call_next(request)
    except Exception:
        # An unhandled error is turned into a 500 outside the middleware stack,
        # where this header would be missed; answer it here instead.
        log.exception("Unhandled error on %s", request.url.path)
        response = JSONResponse(status_code=500, content={"detail": "Internal Server Error"})
    # Overrides, never setdefault: nothing downstream may loosen it.
    response.headers["Cache-Control"] = NO_STORE
    return response

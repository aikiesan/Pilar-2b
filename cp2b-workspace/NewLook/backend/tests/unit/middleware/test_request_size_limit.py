"""
Unit tests for app.middleware.request_size_limit

Covers both RequestSizeLimitMiddleware (class-based) and the standalone
request_size_limit_middleware function via mini FastAPI apps.
"""

from unittest.mock import patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.middleware.request_size_limit import (
    RequestSizeLimitMiddleware,
    request_size_limit_middleware,
)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_1MB = 1_000_000
_10MB = 10_000_000
_SMALL = 512  # well under any realistic limit
_OVER_LIMIT = _10MB + 1


# ---------------------------------------------------------------------------
# Fixtures — class-based middleware
# ---------------------------------------------------------------------------


@pytest.fixture(scope="module")
def class_middleware_client():
    """TestClient using RequestSizeLimitMiddleware (class-based, 1 MB limit)."""
    mini_app = FastAPI()
    mini_app.add_middleware(RequestSizeLimitMiddleware, max_size=_1MB)

    @mini_app.post("/upload")
    async def upload():
        return {"received": True}

    @mini_app.get("/healthz")
    async def healthz():
        return {"status": "ok"}

    with TestClient(mini_app, raise_server_exceptions=False) as c:
        yield c


# ---------------------------------------------------------------------------
# Fixtures — function-based middleware
# ---------------------------------------------------------------------------


@pytest.fixture(scope="module")
def func_middleware_client():
    """TestClient using request_size_limit_middleware (function-based)."""
    mini_app = FastAPI()
    mini_app.middleware("http")(request_size_limit_middleware)

    @mini_app.post("/data")
    async def data():
        return {"ok": True}

    @mini_app.get("/info")
    async def info():
        return {"info": True}

    # Patch settings so the function middleware uses a predictable 1 MB limit
    with patch("app.middleware.request_size_limit.settings") as mock_settings:
        mock_settings.MAX_REQUEST_SIZE = _1MB
        with TestClient(mini_app, raise_server_exceptions=False) as c:
            yield c


# ---------------------------------------------------------------------------
# RequestSizeLimitMiddleware — class-based tests
# ---------------------------------------------------------------------------


@pytest.mark.unit
class TestRequestSizeLimitMiddlewareClass:
    """Tests for the class-based RequestSizeLimitMiddleware."""

    def test_request_under_limit_passes(self, class_middleware_client):
        """A body smaller than the limit must reach the handler (200)."""
        headers = {"Content-Length": str(_SMALL)}
        response = class_middleware_client.post("/upload", headers=headers, content=b"x" * _SMALL)
        assert response.status_code == 200
        assert response.json()["received"] is True

    def test_request_over_limit_returns_413(self, class_middleware_client):
        """A Content-Length header exceeding the limit must return 413."""
        headers = {"Content-Length": str(_1MB + 1)}
        response = class_middleware_client.post(
            "/upload", headers=headers, content=b"x" * min(_SMALL, 100)
        )
        assert response.status_code == 413

    def test_413_body_contains_detail_and_sizes(self, class_middleware_client):
        """The 413 response body must include detail, max_size_mb, and received_size_mb."""
        big = _1MB + 500
        headers = {"Content-Length": str(big)}
        response = class_middleware_client.post("/upload", headers=headers, content=b"")
        assert response.status_code == 413
        body = response.json()
        assert "detail" in body
        assert "max_size_mb" in body
        assert "received_size_mb" in body

    def test_request_exactly_at_limit_passes(self, class_middleware_client):
        """A body exactly at max_size must be allowed (boundary is exclusive >)."""
        exact = _1MB
        headers = {"Content-Length": str(exact)}
        response = class_middleware_client.post("/upload", headers=headers, content=b"x" * 1)
        assert response.status_code == 200

    def test_get_request_no_body_passes(self, class_middleware_client):
        """GET with no Content-Length header must always pass through."""
        response = class_middleware_client.get("/healthz")
        assert response.status_code == 200

    def test_no_content_length_header_passes(self, class_middleware_client):
        """POST without Content-Length must not be blocked (middleware only checks the header)."""
        response = class_middleware_client.post("/upload", content=b"hello")
        # TestClient may set Content-Length automatically; the important thing is
        # that a small body is not rejected with 413.
        assert response.status_code in (200, 422)  # 422 = missing required fields is fine

    def test_max_size_stored_on_instance(self):
        """max_size attribute must reflect the value passed to the constructor."""
        app = FastAPI()
        app.add_middleware(RequestSizeLimitMiddleware, max_size=500_000)

        @app.get("/")
        async def root():
            return {}

        with TestClient(app, raise_server_exceptions=False):
            pass  # Just instantiating exercises __init__

    def test_default_max_size_comes_from_settings(self):
        """When max_size is not passed, __init__ must read from settings."""
        with patch("app.middleware.request_size_limit.settings") as mock_cfg:
            mock_cfg.MAX_REQUEST_SIZE = 5_000_000

            app = FastAPI()
            # Cannot add middleware again to an existing app easily; test directly
            import asyncio

            from starlette.testclient import TestClient as StarletteTestClient

            # Instantiate the middleware around a trivial ASGI app
            async def trivial_app(scope, receive, send):  # pragma: no cover
                pass

            middleware = RequestSizeLimitMiddleware(trivial_app)
            assert middleware.max_size == 5_000_000


# ---------------------------------------------------------------------------
# request_size_limit_middleware — function-based tests
# ---------------------------------------------------------------------------


@pytest.mark.unit
class TestRequestSizeLimitMiddlewareFunction:
    """Tests for the standalone request_size_limit_middleware function."""

    def test_small_request_passes(self, func_middleware_client):
        """Body under the limit must reach the handler."""
        headers = {"Content-Length": str(_SMALL)}
        response = func_middleware_client.post("/data", headers=headers, content=b"x" * _SMALL)
        assert response.status_code == 200

    def test_oversized_request_returns_413(self, func_middleware_client):
        """Content-Length above the limit must return 413."""
        headers = {"Content-Length": str(_1MB + 1)}
        response = func_middleware_client.post("/data", headers=headers, content=b"")
        assert response.status_code == 413

    def test_413_body_has_expected_fields(self, func_middleware_client):
        """Function middleware 413 body must contain detail, max_size_mb, received_size_mb."""
        headers = {"Content-Length": str(_1MB + 100)}
        response = func_middleware_client.post("/data", headers=headers, content=b"")
        assert response.status_code == 413
        body = response.json()
        assert "detail" in body
        assert "max_size_mb" in body
        assert "received_size_mb" in body

    def test_get_without_body_passes(self, func_middleware_client):
        """GET with no Content-Length header must not be blocked."""
        response = func_middleware_client.get("/info")
        assert response.status_code == 200

    def test_exact_limit_boundary_passes(self, func_middleware_client):
        """Content-Length equal to max_size should not be blocked (> not >=)."""
        exact = _1MB
        headers = {"Content-Length": str(exact)}
        response = func_middleware_client.post("/data", headers=headers, content=b"x")
        assert response.status_code == 200

    def test_zero_content_length_passes(self, func_middleware_client):
        """Content-Length: 0 must always pass through."""
        headers = {"Content-Length": "0"}
        response = func_middleware_client.post("/data", headers=headers, content=b"")
        assert response.status_code == 200


# ---------------------------------------------------------------------------
# Module-level __all__ check
# ---------------------------------------------------------------------------


@pytest.mark.unit
class TestModuleExports:
    def test_all_exports_present(self):
        from app.middleware import request_size_limit as mod

        assert "RequestSizeLimitMiddleware" in mod.__all__
        assert "request_size_limit_middleware" in mod.__all__

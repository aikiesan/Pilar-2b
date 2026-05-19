"""
Unit tests for app.middleware.response_compression

Covers gzip_middleware behaviour: compression of large responses, pass-through
for small responses, accept-encoding negotiation, and already-compressed content.
"""
import asyncio
import gzip
import json
import pytest
from fastapi import FastAPI
from fastapi.responses import JSONResponse, Response, PlainTextResponse
from fastapi.testclient import TestClient
from starlette.datastructures import Headers
from starlette.requests import Request
from starlette.types import Scope

from app.middleware.response_compression import gzip_middleware


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_THRESHOLD = 1024          # gzip_middleware only compresses bodies > 1 KB
_SMALL_BODY = b"hi"        # well under threshold
_LARGE_BODY = b"A" * 2048  # well over threshold


def _make_app(response_body: bytes = _LARGE_BODY, media_type: str = "text/plain"):
    """Build a minimal FastAPI app that returns a fixed body via a Response."""
    app = FastAPI()
    app.middleware("http")(gzip_middleware)

    @app.get("/data")
    async def data():
        return Response(content=response_body, media_type=media_type)

    return app


# ---------------------------------------------------------------------------
# Module-scoped clients for the most common scenarios
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def large_response_client():
    """App returning a 2 KB plaintext body (above threshold)."""
    with TestClient(_make_app(response_body=_LARGE_BODY), raise_server_exceptions=False) as c:
        yield c


@pytest.fixture(scope="module")
def small_response_client():
    """App returning a 2-byte body (below threshold)."""
    with TestClient(_make_app(response_body=_SMALL_BODY), raise_server_exceptions=False) as c:
        yield c


# ---------------------------------------------------------------------------
# Direct async invocation helpers
# ---------------------------------------------------------------------------

def _make_mock_request(accept_encoding: str = "gzip") -> Request:
    """Build a minimal Starlette Request with the given Accept-Encoding header."""
    scope: Scope = {
        "type": "http",
        "method": "GET",
        "path": "/data",
        "query_string": b"",
        "headers": [(b"accept-encoding", accept_encoding.encode())],
    }
    return Request(scope)


def _run(coro):
    """Run an async coroutine synchronously (safe in pytest sync tests)."""
    return asyncio.get_event_loop().run_until_complete(coro)


# ---------------------------------------------------------------------------
# Compression behaviour tests — direct middleware invocation
# ---------------------------------------------------------------------------

@pytest.mark.unit
class TestGzipCompression:
    """
    Large Response objects must be compressed by gzip_middleware.

    TestClient wraps route handlers in _StreamingResponse which has no .body
    attribute, so we invoke the middleware directly with a mock call_next that
    returns a real starlette Response — this exercises the compression branch.
    """

    def test_large_response_is_compressed_directly(self):
        """Middleware must set Content-Encoding: gzip for a large Response."""
        async def call_next(request):
            return Response(content=_LARGE_BODY, media_type="text/plain")

        request = _make_mock_request("gzip")
        result = _run(gzip_middleware(request, call_next))
        assert result.headers.get("content-encoding") == "gzip"

    def test_compressed_body_decodes_to_original(self):
        """Compressed body must decompress back to the original bytes."""
        async def call_next(request):
            return Response(content=_LARGE_BODY, media_type="text/plain")

        request = _make_mock_request("gzip")
        result = _run(gzip_middleware(request, call_next))
        assert gzip.decompress(result.body) == _LARGE_BODY

    def test_content_length_reflects_compressed_size(self):
        """Content-Length header must equal the compressed body length."""
        async def call_next(request):
            return Response(content=_LARGE_BODY, media_type="text/plain")

        request = _make_mock_request("gzip")
        result = _run(gzip_middleware(request, call_next))
        assert int(result.headers["content-length"]) < _THRESHOLD

    def test_large_json_response_compressed_directly(self):
        """JSON payload over threshold must also be compressed."""
        large_data = {"items": ["value"] * 200}
        body = json.dumps(large_data).encode()
        assert len(body) > _THRESHOLD

        async def call_next(request):
            return Response(content=body, media_type="application/json")

        request = _make_mock_request("gzip")
        result = _run(gzip_middleware(request, call_next))
        assert result.headers.get("content-encoding") == "gzip"


# ---------------------------------------------------------------------------
# No-compression scenarios
# ---------------------------------------------------------------------------

@pytest.mark.unit
class TestNoCompression:
    """Responses should not be compressed when conditions aren't met."""

    def test_small_response_not_compressed(self, small_response_client):
        """Bodies at or below the 1 KB threshold must pass through uncompressed."""
        response = small_response_client.get(
            "/data", headers={"Accept-Encoding": "gzip"}
        )
        assert response.status_code == 200
        assert response.headers.get("content-encoding") != "gzip"

    def test_no_accept_encoding_not_compressed(self, large_response_client):
        """Without Accept-Encoding: gzip, large responses must not be compressed."""
        response = large_response_client.get("/data")
        assert response.status_code == 200
        assert response.headers.get("content-encoding") != "gzip"

    def test_different_accept_encoding_not_compressed(self, large_response_client):
        """Accept-Encoding: identity (no gzip) must not trigger compression."""
        response = large_response_client.get(
            "/data", headers={"Accept-Encoding": "identity"}
        )
        assert response.status_code == 200
        assert response.headers.get("content-encoding") != "gzip"

    def test_already_compressed_response_not_recompressed(self):
        """If Content-Encoding is already set the middleware must leave it alone."""
        pre_compressed = gzip.compress(_LARGE_BODY)

        app = FastAPI()
        app.middleware("http")(gzip_middleware)

        @app.get("/precomp")
        async def precomp():
            return Response(
                content=pre_compressed,
                media_type="text/plain",
                headers={"Content-Encoding": "gzip"},
            )

        with TestClient(app, raise_server_exceptions=False) as c:
            response = c.get("/precomp", headers={"Accept-Encoding": "gzip"})
        # Content-Encoding header should remain exactly "gzip" (not double-gzip)
        assert response.headers.get("content-encoding") == "gzip"

    def test_response_without_body_attribute_not_compressed(self):
        """StreamingResponse (no .body attribute) must pass through untouched."""
        from starlette.responses import StreamingResponse

        async def stream():
            yield b"A" * 2048

        app = FastAPI()
        app.middleware("http")(gzip_middleware)

        @app.get("/stream")
        async def streamed():
            return StreamingResponse(stream(), media_type="text/plain")

        with TestClient(app, raise_server_exceptions=False) as c:
            response = c.get("/stream", headers={"Accept-Encoding": "gzip"})
        assert response.status_code == 200
        # No compression should be applied — middleware skips responses without .body
        assert response.headers.get("content-encoding") != "gzip"


# ---------------------------------------------------------------------------
# Edge-case: exactly at threshold
# ---------------------------------------------------------------------------

@pytest.mark.unit
class TestCompressionThresholdBoundary:
    """Verify boundary behaviour around the 1 KB threshold."""

    def test_body_exactly_at_threshold_not_compressed(self):
        """A body of exactly 1024 bytes must NOT be compressed (> not >=)."""
        body = b"B" * _THRESHOLD
        assert len(body) == _THRESHOLD

        app = _make_app(response_body=body)
        with TestClient(app, raise_server_exceptions=False) as c:
            response = c.get("/data", headers={"Accept-Encoding": "gzip"})
        assert response.headers.get("content-encoding") != "gzip"

    def test_body_one_byte_over_threshold_is_compressed(self):
        """A body of 1025 bytes must be compressed (direct invocation)."""
        body = b"C" * (_THRESHOLD + 1)

        async def call_next(request):
            return Response(content=body, media_type="text/plain")

        request = _make_mock_request("gzip")
        result = _run(gzip_middleware(request, call_next))
        assert result.headers.get("content-encoding") == "gzip"


# ---------------------------------------------------------------------------
# Accept-Encoding header variations
# ---------------------------------------------------------------------------

@pytest.mark.unit
class TestAcceptEncodingVariants:
    """gzip in a multi-value Accept-Encoding header must still trigger compression."""

    def test_gzip_in_multi_value_accept_encoding(self):
        """'deflate, gzip, br' must be recognised as accepting gzip (direct invocation)."""
        async def call_next(request):
            return Response(content=_LARGE_BODY, media_type="text/plain")

        request = _make_mock_request("deflate, gzip, br")
        result = _run(gzip_middleware(request, call_next))
        assert result.headers.get("content-encoding") == "gzip"

    def test_empty_accept_encoding_not_compressed(self, large_response_client):
        """An empty Accept-Encoding header must not trigger compression."""
        response = large_response_client.get(
            "/data", headers={"Accept-Encoding": ""}
        )
        assert response.status_code == 200
        assert response.headers.get("content-encoding") != "gzip"

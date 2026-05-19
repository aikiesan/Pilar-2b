"""
Unit tests for app.middleware.response_compression

Covers gzip_middleware behaviour: compression of large responses, pass-through
for small responses, accept-encoding negotiation, and already-compressed content.
"""
import gzip
import json
import pytest
from fastapi import FastAPI
from fastapi.responses import JSONResponse, Response, PlainTextResponse
from fastapi.testclient import TestClient

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
# Compression behaviour tests
# ---------------------------------------------------------------------------

@pytest.mark.unit
class TestGzipCompression:
    """Large responses must be compressed when the client accepts gzip."""

    def test_large_response_is_compressed(self, large_response_client):
        """Content-Encoding: gzip must be set for responses over the threshold."""
        response = large_response_client.get(
            "/data", headers={"Accept-Encoding": "gzip"}
        )
        assert response.status_code == 200
        assert response.headers.get("content-encoding") == "gzip"

    def test_compressed_body_is_valid_gzip(self, large_response_client):
        """The compressed bytes must decode back to the original content."""
        response = large_response_client.get(
            "/data", headers={"Accept-Encoding": "gzip"}
        )
        assert response.status_code == 200
        # TestClient may decompress automatically; check raw bytes if available
        raw = response.content
        # If the client already decompressed, raw == _LARGE_BODY
        # If it didn't, decompress manually
        if response.headers.get("content-encoding") == "gzip":
            decompressed = gzip.decompress(raw)
            assert decompressed == _LARGE_BODY
        else:
            assert raw == _LARGE_BODY

    def test_compressed_content_length_header_updated(self, large_response_client):
        """Content-Length must reflect the compressed size after compression."""
        response = large_response_client.get(
            "/data", headers={"Accept-Encoding": "gzip"}
        )
        assert response.status_code == 200
        if response.headers.get("content-encoding") == "gzip":
            content_length = int(response.headers["content-length"])
            # Compressed 2 KB of 'A' bytes will be much smaller than 2048
            assert content_length < _THRESHOLD

    def test_large_json_response_compressed(self):
        """JSON payload over the threshold must also be compressed."""
        # Build a JSON payload definitely over 1 KB
        large_data = {"items": ["value"] * 200}
        body = json.dumps(large_data).encode()
        assert len(body) > _THRESHOLD

        app = _make_app(response_body=body, media_type="application/json")
        with TestClient(app, raise_server_exceptions=False) as c:
            response = c.get("/data", headers={"Accept-Encoding": "gzip"})
        assert response.status_code == 200
        assert response.headers.get("content-encoding") == "gzip"


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
        """A body of 1025 bytes must be compressed."""
        body = b"C" * (_THRESHOLD + 1)

        app = _make_app(response_body=body)
        with TestClient(app, raise_server_exceptions=False) as c:
            response = c.get("/data", headers={"Accept-Encoding": "gzip"})
        assert response.headers.get("content-encoding") == "gzip"


# ---------------------------------------------------------------------------
# Accept-Encoding header variations
# ---------------------------------------------------------------------------

@pytest.mark.unit
class TestAcceptEncodingVariants:
    """gzip in a multi-value Accept-Encoding header must still trigger compression."""

    def test_gzip_in_multi_value_accept_encoding(self, large_response_client):
        """'deflate, gzip, br' must be recognised as accepting gzip."""
        response = large_response_client.get(
            "/data", headers={"Accept-Encoding": "deflate, gzip, br"}
        )
        assert response.status_code == 200
        assert response.headers.get("content-encoding") == "gzip"

    def test_empty_accept_encoding_not_compressed(self, large_response_client):
        """An empty Accept-Encoding header must not trigger compression."""
        response = large_response_client.get(
            "/data", headers={"Accept-Encoding": ""}
        )
        assert response.status_code == 200
        assert response.headers.get("content-encoding") != "gzip"

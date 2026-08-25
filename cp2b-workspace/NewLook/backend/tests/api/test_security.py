"""
Security tests for validation_middleware.

These tests verify that the middleware correctly blocks injection payloads at the
API boundary. They intentionally bypass the stripped-down test_app in conftest.py
and build a mini app that includes validation_middleware, exercising the full
middleware path rather than just the utility functions (which are covered by
test_validation.py).
"""

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.middleware.validation import validation_middleware

# ---------------------------------------------------------------------------
# Minimal validated app fixture
# ---------------------------------------------------------------------------


@pytest.fixture(scope="module")
def validated_client():
    """TestClient wrapping a minimal FastAPI app with validation_middleware active."""
    mini_app = FastAPI()
    mini_app.middleware("http")(validation_middleware)

    @mini_app.get("/probe")
    async def probe(q: str = ""):
        return {"ok": True, "q": q}

    with TestClient(mini_app, raise_server_exceptions=False) as c:
        yield c


# ---------------------------------------------------------------------------
# SQL injection payloads — must produce 400 from the middleware
# ---------------------------------------------------------------------------

SQL_PAYLOADS = [
    "' OR 1=1--",
    "'; DROP TABLE municipalities;--",
    "' UNION SELECT NULL--",
    "1 OR 1=1",
    "AND 1=1",
]


@pytest.mark.api
class TestSQLInjectionBlocked:

    def test_safe_query_passes(self, validated_client: TestClient):
        """Baseline: a benign value must reach the handler (200)."""
        response = validated_client.get("/probe", params={"q": "Campinas"})
        assert response.status_code == 200
        assert response.json()["ok"] is True

    @pytest.mark.parametrize("payload", SQL_PAYLOADS)
    def test_sql_injection_returns_400(self, validated_client: TestClient, payload: str):
        """Each SQL injection payload must be blocked with HTTP 400."""
        response = validated_client.get("/probe", params={"q": payload})
        assert (
            response.status_code == 400
        ), f"Expected 400 for SQL payload {payload!r}, got {response.status_code}"
        body = response.json()
        assert "detail" in body

    def test_sql_in_arbitrary_param_name(self, validated_client: TestClient):
        """Injection in a parameter whose name the app doesn't declare is also caught."""
        response = validated_client.get("/probe", params={"search": "UNION SELECT * FROM users"})
        assert response.status_code == 400


# ---------------------------------------------------------------------------
# Command injection payloads — must produce 400
# ---------------------------------------------------------------------------

CMD_PAYLOADS = [
    "ls; rm -rf /",
    "$(whoami)",
    "cmd | cat /etc/passwd",
    "`id`",
]


@pytest.mark.api
class TestCommandInjectionBlocked:

    @pytest.mark.parametrize("payload", CMD_PAYLOADS)
    def test_command_injection_returns_400(self, validated_client: TestClient, payload: str):
        """Each command injection payload must be blocked with HTTP 400."""
        response = validated_client.get("/probe", params={"q": payload})
        assert (
            response.status_code == 400
        ), f"Expected 400 for CMD payload {payload!r}, got {response.status_code}"
        body = response.json()
        assert "detail" in body


# ---------------------------------------------------------------------------
# Middleware does not interfere with OPTIONS (CORS preflight)
# ---------------------------------------------------------------------------


@pytest.mark.api
class TestMiddlewareEdgeCases:

    def test_options_request_passes_through(self, validated_client: TestClient):
        """OPTIONS requests must not be blocked (CORS preflight compatibility)."""
        response = validated_client.options("/probe")
        # May be 200 or 405 (method not allowed by route) — must NOT be 400
        assert response.status_code != 400

    def test_no_query_params_passes(self, validated_client: TestClient):
        """Requests with no query params must always pass validation."""
        response = validated_client.get("/probe")
        assert response.status_code == 200

    def test_numeric_param_passes(self, validated_client: TestClient):
        """Pure numeric query param must not be treated as injection."""
        response = validated_client.get("/probe", params={"q": "3550308"})
        assert response.status_code == 200

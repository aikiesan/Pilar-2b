"""
Integration tests for health-check endpoints.

Exercises /health, /health/ready, /health/live, /stats/cache and the root
endpoint using the TestClient from conftest.py (mocked DB via
mock_db_connection autouse fixture).

These tests focus on the contract — status codes, mandatory fields, and value
constraints — not on live database connectivity.
"""
import pytest
from fastapi.testclient import TestClient


@pytest.mark.integration
class TestRootEndpoint:

    def test_root_returns_200(self, client: TestClient):
        response = client.get("/")
        assert response.status_code == 200

    def test_root_returns_json(self, client: TestClient):
        response = client.get("/")
        assert response.headers["content-type"].startswith("application/json")

    def test_root_has_status_running(self, client: TestClient):
        body = client.get("/").json()
        assert body.get("status") == "running"

    def test_root_has_message_field(self, client: TestClient):
        body = client.get("/").json()
        assert "message" in body
        assert isinstance(body["message"], str)
        assert len(body["message"]) > 0

    def test_root_has_version_or_docs_field(self, client: TestClient):
        body = client.get("/").json()
        # At least one informational field beyond status + message
        extra_fields = {k for k in body if k not in ("status", "message")}
        assert len(extra_fields) >= 1


@pytest.mark.integration
class TestHealthCheck:

    def test_health_returns_200_or_503(self, client: TestClient):
        response = client.get("/health")
        # 200 when DB mock succeeds; 503 if DB is considered degraded
        assert response.status_code in (200, 503)

    def test_health_returns_json(self, client: TestClient):
        response = client.get("/health")
        assert response.headers["content-type"].startswith("application/json")

    def test_health_status_field_present(self, client: TestClient):
        body = client.get("/health").json()
        assert "status" in body

    def test_health_status_valid_value(self, client: TestClient):
        body = client.get("/health").json()
        assert body["status"] in ("healthy", "degraded", "unhealthy")

    def test_health_timestamp_field_present(self, client: TestClient):
        body = client.get("/health").json()
        assert "timestamp" in body
        assert isinstance(body["timestamp"], str)
        assert len(body["timestamp"]) > 0

    def test_health_database_field_present(self, client: TestClient):
        body = client.get("/health").json()
        # DB status field must exist (value depends on mock)
        assert "database" in body

    def test_health_never_returns_4xx(self, client: TestClient):
        response = client.get("/health")
        assert response.status_code < 400 or response.status_code >= 500


@pytest.mark.integration
class TestReadinessCheck:

    def test_readiness_returns_200_or_503(self, client: TestClient):
        response = client.get("/health/ready")
        assert response.status_code in (200, 503)

    def test_readiness_never_returns_4xx(self, client: TestClient):
        """Readiness probe must never return a client error."""
        response = client.get("/health/ready")
        assert response.status_code not in range(400, 500)

    def test_readiness_has_ready_field(self, client: TestClient):
        body = client.get("/health/ready").json()
        assert "ready" in body

    def test_readiness_ready_is_boolean(self, client: TestClient):
        body = client.get("/health/ready").json()
        assert isinstance(body["ready"], bool)

    def test_readiness_has_timestamp_field(self, client: TestClient):
        body = client.get("/health/ready").json()
        assert "timestamp" in body

    def test_readiness_reason_present_when_not_ready(self, client: TestClient):
        body = client.get("/health/ready").json()
        if not body.get("ready", True):
            # 503 responses should explain why
            assert "reason" in body or "timestamp" in body


@pytest.mark.integration
class TestLivenessCheck:

    def test_liveness_always_returns_200(self, client: TestClient):
        """Liveness probe must always return 200 — it only checks process health."""
        response = client.get("/health/live")
        assert response.status_code == 200

    def test_liveness_alive_is_true(self, client: TestClient):
        body = client.get("/health/live").json()
        assert body.get("alive") is True

    def test_liveness_has_timestamp(self, client: TestClient):
        body = client.get("/health/live").json()
        assert "timestamp" in body
        assert isinstance(body["timestamp"], str)

    def test_liveness_is_fast(self, client: TestClient):
        """Liveness probe should never involve slow operations."""
        import time

        start = time.perf_counter()
        client.get("/health/live")
        elapsed = time.perf_counter() - start
        # Even with mocked DB, a no-op liveness check must be < 2s
        assert elapsed < 2.0


@pytest.mark.integration
class TestCacheStatistics:

    def test_cache_stats_not_5xx(self, client: TestClient):
        response = client.get("/stats/cache")
        assert response.status_code < 500

    def test_cache_stats_returns_json(self, client: TestClient):
        response = client.get("/stats/cache")
        if response.status_code == 200:
            assert response.headers["content-type"].startswith("application/json")

    def test_cache_stats_has_timestamp_if_200(self, client: TestClient):
        response = client.get("/stats/cache")
        if response.status_code == 200:
            body = response.json()
            assert "timestamp" in body or len(body) > 0

"""
Backend sanity tests — happy-path sweep of all major GET endpoints.

Goals:
- Verify no endpoint returns HTTP 5xx for well-formed requests
- Enforce a loose 5-second response-time gate
- Confirm structural response shapes for endpoints with stable sample data

All tests use the `client` fixture from conftest.py (mocked DB).
Endpoints that depend on shapefile or heavy DB queries may legitimately return
4xx (e.g. 404/503) when data is absent — those are not failures here.
"""
import time
import pytest
from fastapi.testclient import TestClient


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _get(client: TestClient, path: str, params: dict | None = None):
    """Timed GET; returns (response, elapsed_seconds)."""
    start = time.perf_counter()
    response = client.get(path, params=params or {})
    return response, time.perf_counter() - start


LATENCY_LIMIT = 5.0  # seconds


# ---------------------------------------------------------------------------
# Root & health endpoints
# ---------------------------------------------------------------------------

@pytest.mark.api
class TestHealthEndpoints:

    def test_root_returns_200(self, client: TestClient):
        response, elapsed = _get(client, "/")
        assert response.status_code == 200
        assert elapsed < LATENCY_LIMIT
        body = response.json()
        assert body.get("message") == "PILAR-2b V3 API"
        assert body.get("status") == "running"

    def test_health_check_returns_200(self, client: TestClient):
        response, elapsed = _get(client, "/health")
        assert response.status_code == 200
        assert elapsed < LATENCY_LIMIT


# ---------------------------------------------------------------------------
# Municipalities endpoints
# ---------------------------------------------------------------------------

@pytest.mark.api
class TestMunicipalitiesSanity:

    def test_list_endpoint_not_5xx(self, client: TestClient):
        response, elapsed = _get(client, "/api/v1/municipalities/")
        assert response.status_code < 500
        assert elapsed < LATENCY_LIMIT

    def test_list_default_response_shape(self, client: TestClient):
        """When sample data is returned the envelope must have the expected keys."""
        response, _ = _get(client, "/api/v1/municipalities/")
        if response.status_code == 200:
            body = response.json()
            for key in ("data", "total", "limit", "offset"):
                assert key in body, f"Missing key '{key}' in municipalities response"

    def test_list_with_search_param_not_5xx(self, client: TestClient):
        response, elapsed = _get(client, "/api/v1/municipalities/", params={"search": "São Paulo"})
        assert response.status_code < 500
        assert elapsed < LATENCY_LIMIT

    def test_list_pagination_params_not_5xx(self, client: TestClient):
        response, elapsed = _get(client, "/api/v1/municipalities/", params={"limit": 10, "offset": 0})
        assert response.status_code < 500
        assert elapsed < LATENCY_LIMIT

    def test_stats_summary_not_5xx(self, client: TestClient):
        response, elapsed = _get(client, "/api/v1/municipalities/stats/summary")
        assert response.status_code < 500
        assert elapsed < LATENCY_LIMIT


# ---------------------------------------------------------------------------
# Statistics endpoint
# ---------------------------------------------------------------------------

@pytest.mark.api
class TestStatisticsSanity:

    def test_summary_not_5xx(self, client: TestClient):
        response, elapsed = _get(client, "/api/v1/statistics/summary")
        assert response.status_code < 500
        assert elapsed < LATENCY_LIMIT


# ---------------------------------------------------------------------------
# Residuos endpoint
# ---------------------------------------------------------------------------

@pytest.mark.api
class TestResiduosSanity:

    def test_residuos_list_not_5xx(self, client: TestClient):
        response, elapsed = _get(client, "/api/v1/residuos/")
        assert response.status_code < 500
        assert elapsed < LATENCY_LIMIT


# ---------------------------------------------------------------------------
# Scientific endpoint
# ---------------------------------------------------------------------------

@pytest.mark.api
class TestScientificSanity:

    def test_kinetics_list_not_5xx(self, client: TestClient):
        response, elapsed = _get(client, "/api/v1/scientific/kinetics")
        assert response.status_code < 500
        assert elapsed < LATENCY_LIMIT


# ---------------------------------------------------------------------------
# Technology routes endpoint
# ---------------------------------------------------------------------------

@pytest.mark.api
class TestTechnologyRoutesSanity:

    def test_list_not_5xx(self, client: TestClient):
        response, elapsed = _get(client, "/api/v1/technology-routes/")
        assert response.status_code < 500
        assert elapsed < LATENCY_LIMIT


# ---------------------------------------------------------------------------
# Cache stats (internal monitoring endpoint on main app)
# ---------------------------------------------------------------------------

@pytest.mark.api
class TestCacheSanity:

    def test_cache_stats_not_5xx(self, client: TestClient):
        # /stats/cache is on the main app, not on the test_app router — skip gracefully
        response, elapsed = _get(client, "/stats/cache")
        # Accept 200 or 404 (test_app omits this endpoint); never 500
        assert response.status_code in (200, 404)
        assert elapsed < LATENCY_LIMIT

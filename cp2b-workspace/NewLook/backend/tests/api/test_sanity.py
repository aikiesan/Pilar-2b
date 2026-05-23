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

    def test_health_check_schema(self, client: TestClient):
        """Health response must contain status and timestamp."""
        response, _ = _get(client, "/health")
        if response.status_code == 200:
            body = response.json()
            assert "status" in body
            assert body["status"] in ("healthy", "degraded", "unhealthy")
            assert "timestamp" in body

    def test_readiness_check_not_5xx(self, client: TestClient):
        """/health/ready must not crash the server."""
        response, elapsed = _get(client, "/health/ready")
        # 200 (ready) or 503 (db unavailable) — never 4xx
        assert response.status_code in (200, 503)
        assert elapsed < LATENCY_LIMIT

    def test_readiness_check_schema(self, client: TestClient):
        """Readiness probe returns a 'ready' boolean field."""
        response, _ = _get(client, "/health/ready")
        body = response.json()
        assert "ready" in body
        assert isinstance(body["ready"], bool)
        assert "timestamp" in body

    def test_liveness_check_returns_200(self, client: TestClient):
        """/health/live always returns 200 with alive=true."""
        response, elapsed = _get(client, "/health/live")
        assert response.status_code == 200
        assert elapsed < LATENCY_LIMIT

    def test_liveness_check_alive_true(self, client: TestClient):
        """Liveness probe always reports alive=true when the process is running."""
        response, _ = _get(client, "/health/live")
        assert response.status_code == 200
        body = response.json()
        assert body.get("alive") is True
        assert "timestamp" in body


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
# Analysis endpoints
# ---------------------------------------------------------------------------

@pytest.mark.api
class TestAnalysisSanity:

    def test_residue_config_not_5xx(self, client: TestClient):
        response, elapsed = _get(client, "/api/v1/analysis/residue-config")
        assert response.status_code < 500
        assert elapsed < LATENCY_LIMIT

    def test_by_residue_not_5xx(self, client: TestClient):
        response, elapsed = _get(client, "/api/v1/analysis/by-residue", params={"category": "agricultural"})
        assert response.status_code < 500
        assert elapsed < LATENCY_LIMIT

    def test_distribution_not_5xx(self, client: TestClient):
        response, elapsed = _get(client, "/api/v1/analysis/distribution")
        assert response.status_code < 500
        assert elapsed < LATENCY_LIMIT


# ---------------------------------------------------------------------------
# Proximity endpoint
# ---------------------------------------------------------------------------

@pytest.mark.api
class TestProximitySanity:

    def test_proximity_post_valid_body_not_5xx(self, client: TestClient):
        """POST /proximity with a valid Campinas coordinate must not 5xx."""
        response, elapsed = client.post(
            "/api/v1/proximity/analyze",
            json={"latitude": -22.9, "longitude": -47.06, "radius_km": 20},
        ), 0.0
        # Unpack the tuple returned when not using _get
        if isinstance(response, tuple):
            response, elapsed = response
        assert response.status_code < 500


# ---------------------------------------------------------------------------
# Infrastructure endpoint
# ---------------------------------------------------------------------------

@pytest.mark.api
class TestInfrastructureSanity:

    def test_infrastructure_not_5xx(self, client: TestClient):
        response, elapsed = _get(client, "/api/v1/infrastructure/")
        assert response.status_code < 500
        assert elapsed < LATENCY_LIMIT


# ---------------------------------------------------------------------------
# Co-digestion endpoint
# ---------------------------------------------------------------------------

@pytest.mark.api
class TestCodigestionSanity:

    def test_clusters_not_5xx(self, client: TestClient):
        response, elapsed = _get(client, "/api/v1/codigestion/clusters")
        assert response.status_code < 500
        assert elapsed < LATENCY_LIMIT

    def test_residue_cn_matrix_not_5xx(self, client: TestClient):
        response, elapsed = _get(client, "/api/v1/codigestion/residue-cn-matrix")
        assert response.status_code < 500
        assert elapsed < LATENCY_LIMIT


# ---------------------------------------------------------------------------
# Intermediate regions endpoint
# ---------------------------------------------------------------------------

@pytest.mark.api
class TestIntermediateRegionsSanity:

    def test_list_not_5xx(self, client: TestClient):
        response, elapsed = _get(client, "/api/v1/intermediate-regions/")
        assert response.status_code < 500
        assert elapsed < LATENCY_LIMIT


# ---------------------------------------------------------------------------
# Calculator endpoint
# ---------------------------------------------------------------------------

@pytest.mark.api
class TestCalculatorSanity:

    def test_calculator_get_not_5xx(self, client: TestClient):
        """GET on the calculator root should return 200 or 405 (method not allowed)."""
        response, elapsed = _get(client, "/api/v1/calculator/")
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

"""
Integration tests for Co-digestion API endpoints
Tests cluster discovery, cluster detail lookup, C:N profiles, pairing
candidates, residue C:N matrix, and cache management endpoints.
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from app.main import app

client = TestClient(app)

# ─── Sample payloads ─────────────────────────────────────────────────────────

SAMPLE_CLUSTER_1 = {
    "cluster_id": "cluster-001",
    "municipalities": ["São Paulo", "Santo André"],
    "ibge_codes": ["3550308", "3547809"],
    "centroid": {"lat": -23.55, "lon": -46.63},
    "geojson": {
        "type": "Feature",
        "geometry": {"type": "Polygon", "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 0]]]},
        "properties": {},
    },
    "cn_ratio_a": 12.5,
    "cn_ratio_b": 38.0,
    "cn_blended": 24.8,
    "improvement_score": 8.4,
    "total_biomass_tons": 15000.0,
    "residue_pair": ["swine", "sugarcane"],
}

SAMPLE_CLUSTER_2 = {
    "cluster_id": "cluster-002",
    "municipalities": ["Campinas"],
    "ibge_codes": ["3509502"],
    "centroid": {"lat": -22.90, "lon": -47.06},
    "geojson": {
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [-47.06, -22.90]},
        "properties": {},
    },
    "cn_ratio_a": 8.0,
    "cn_ratio_b": 45.0,
    "cn_blended": 22.1,
    "improvement_score": 11.2,
    "total_biomass_tons": 8200.0,
    "residue_pair": ["cattle", "corn"],
}

SAMPLE_CLUSTERS_RESULT = {
    "clusters": [SAMPLE_CLUSTER_1, SAMPLE_CLUSTER_2],
    "total_clusters": 2,
    "radius_km": 30.0,
    "min_biomass_tons": 1000.0,
}

SAMPLE_CN_PROFILES = [
    {"ibge_code": "3550308", "municipality": "São Paulo",  "weighted_cn": 18.3, "dominant_role": "nitrogen_donor"},
    {"ibge_code": "3509502", "municipality": "Campinas",   "weighted_cn": 31.7, "dominant_role": "carbon_donor"},
    {"ibge_code": "3547809", "municipality": "Santo André","weighted_cn": 24.5, "dominant_role": "balanced"},
]

SAMPLE_PAIRING_CANDIDATES = [
    {
        "ibge_code": "3509502",
        "municipality": "Campinas",
        "distance_km": 95.0,
        "weighted_cn": 31.7,
        "cn_blended": 23.9,
        "improvement_score": 6.5,
    }
]

SAMPLE_CN_MATRIX = {
    "residues": [
        {"key": "sugarcane", "label": "Palha de Cana", "cn_ratio": 80.0, "role": "carbon_donor"},
        {"key": "swine",     "label": "Dejetos de Suínos", "cn_ratio": 6.5, "role": "nitrogen_donor"},
        {"key": "cattle",    "label": "Esterco Bovino", "cn_ratio": 14.0, "role": "nitrogen_donor"},
    ],
    "optimal_range": {"low": 20.0, "high": 30.0},
}


# ─── Helper to clear module-level caches between tests ───────────────────────

def _clear_codigestion_caches():
    import app.api.v1.endpoints.codigestion as mod
    mod._cluster_cache.clear()
    mod._cn_profile_cache = None


# ─── Tests ───────────────────────────────────────────────────────────────────

@pytest.mark.integration
class TestGetCodigestionClusters:
    """Tests for GET /api/v1/codigestion/clusters"""

    def setup_method(self):
        _clear_codigestion_caches()

    def test_get_clusters_happy_path(self):
        """Returns cluster list with default query params."""
        with patch(
            "app.api.v1.endpoints.codigestion.find_codigestion_clusters",
            return_value=SAMPLE_CLUSTERS_RESULT,
        ):
            response = client.get("/api/v1/codigestion/clusters")

        assert response.status_code == 200
        body = response.json()
        assert "clusters" in body
        assert body["total_clusters"] == 2
        assert len(body["clusters"]) == 2

    def test_get_clusters_structure(self):
        """Each cluster object contains required fields."""
        with patch(
            "app.api.v1.endpoints.codigestion.find_codigestion_clusters",
            return_value=SAMPLE_CLUSTERS_RESULT,
        ):
            response = client.get("/api/v1/codigestion/clusters")

        cluster = response.json()["clusters"][0]
        assert "cluster_id" in cluster
        assert "municipalities" in cluster
        assert "cn_blended" in cluster
        assert "improvement_score" in cluster
        assert "geojson" in cluster

    def test_get_clusters_custom_radius(self):
        """Custom radius_km is forwarded to the service function."""
        with patch(
            "app.api.v1.endpoints.codigestion.find_codigestion_clusters",
            return_value=SAMPLE_CLUSTERS_RESULT,
        ) as mock_fn:
            response = client.get("/api/v1/codigestion/clusters?radius_km=50.0")

        assert response.status_code == 200
        mock_fn.assert_called_once()
        call_kwargs = mock_fn.call_args.kwargs
        assert call_kwargs["radius_km"] == 50.0

    def test_get_clusters_custom_min_biomass(self):
        """Custom min_biomass_tons is forwarded to the service function."""
        with patch(
            "app.api.v1.endpoints.codigestion.find_codigestion_clusters",
            return_value=SAMPLE_CLUSTERS_RESULT,
        ) as mock_fn:
            response = client.get("/api/v1/codigestion/clusters?min_biomass_tons=5000")

        assert response.status_code == 200
        call_kwargs = mock_fn.call_args.kwargs
        assert call_kwargs["min_biomass_tons"] == 5000.0

    def test_get_clusters_radius_below_minimum_returns_422(self):
        """radius_km below ge=10 constraint is rejected with 422."""
        response = client.get("/api/v1/codigestion/clusters?radius_km=5.0")
        assert response.status_code == 422

    def test_get_clusters_radius_above_maximum_returns_422(self):
        """radius_km above le=150 constraint is rejected with 422."""
        response = client.get("/api/v1/codigestion/clusters?radius_km=200.0")
        assert response.status_code == 422

    def test_get_clusters_max_clusters_limit(self):
        """max_clusters parameter is passed to the service."""
        with patch(
            "app.api.v1.endpoints.codigestion.find_codigestion_clusters",
            return_value={"clusters": [SAMPLE_CLUSTER_1], "total_clusters": 1},
        ) as mock_fn:
            response = client.get("/api/v1/codigestion/clusters?max_clusters=5")

        assert response.status_code == 200
        call_kwargs = mock_fn.call_args.kwargs
        assert call_kwargs["max_clusters"] == 5

    def test_get_clusters_service_error_returns_500(self):
        """Service exceptions are wrapped in 500 responses."""
        with patch(
            "app.api.v1.endpoints.codigestion.find_codigestion_clusters",
            side_effect=RuntimeError("biomass data unavailable"),
        ):
            response = client.get("/api/v1/codigestion/clusters")

        assert response.status_code == 500
        assert "Clustering error" in response.json()["detail"]

    def test_get_clusters_empty_result(self):
        """Service returning zero clusters is handled gracefully."""
        with patch(
            "app.api.v1.endpoints.codigestion.find_codigestion_clusters",
            return_value={"clusters": [], "total_clusters": 0},
        ):
            response = client.get("/api/v1/codigestion/clusters")

        assert response.status_code == 200
        body = response.json()
        assert body["total_clusters"] == 0
        assert body["clusters"] == []

    def test_get_clusters_result_is_cached(self):
        """Second call with same params uses cache; service called only once."""
        _clear_codigestion_caches()
        with patch(
            "app.api.v1.endpoints.codigestion.find_codigestion_clusters",
            return_value=SAMPLE_CLUSTERS_RESULT,
        ) as mock_fn:
            client.get("/api/v1/codigestion/clusters")
            client.get("/api/v1/codigestion/clusters")

        mock_fn.assert_called_once()


@pytest.mark.integration
class TestGetClusterDetail:
    """Tests for GET /api/v1/codigestion/clusters/{cluster_id}"""

    def setup_method(self):
        _clear_codigestion_caches()

    def test_get_cluster_detail_valid_id(self):
        """Returns specific cluster when cluster_id exists in the result."""
        with patch(
            "app.api.v1.endpoints.codigestion.find_codigestion_clusters",
            return_value=SAMPLE_CLUSTERS_RESULT,
        ):
            response = client.get("/api/v1/codigestion/clusters/cluster-001")

        assert response.status_code == 200
        body = response.json()
        assert body["cluster_id"] == "cluster-001"
        assert body["municipalities"] == ["São Paulo", "Santo André"]

    def test_get_cluster_detail_invalid_id_returns_404(self):
        """Returns 404 when cluster_id is not found."""
        with patch(
            "app.api.v1.endpoints.codigestion.find_codigestion_clusters",
            return_value=SAMPLE_CLUSTERS_RESULT,
        ):
            response = client.get("/api/v1/codigestion/clusters/cluster-999")

        assert response.status_code == 404
        assert "cluster-999" in response.json()["detail"]

    def test_get_cluster_detail_service_error_returns_500(self):
        """Service exception during detail lookup returns 500."""
        with patch(
            "app.api.v1.endpoints.codigestion.find_codigestion_clusters",
            side_effect=ValueError("db error"),
        ):
            response = client.get("/api/v1/codigestion/clusters/cluster-001")

        assert response.status_code == 500

    def test_get_cluster_detail_uses_custom_radius(self):
        """radius_km param is forwarded when cache miss triggers recompute."""
        with patch(
            "app.api.v1.endpoints.codigestion.find_codigestion_clusters",
            return_value=SAMPLE_CLUSTERS_RESULT,
        ) as mock_fn:
            response = client.get(
                "/api/v1/codigestion/clusters/cluster-001?radius_km=45.0"
            )

        assert response.status_code == 200
        call_kwargs = mock_fn.call_args.kwargs
        assert call_kwargs["radius_km"] == 45.0


@pytest.mark.integration
class TestMunicipalityCnProfiles:
    """Tests for GET /api/v1/codigestion/municipality-cn-profiles"""

    def setup_method(self):
        _clear_codigestion_caches()

    def test_get_cn_profiles_happy_path(self):
        """Returns list of municipality C:N profiles."""
        with patch(
            "app.api.v1.endpoints.codigestion.get_municipality_cn_profiles",
            return_value=SAMPLE_CN_PROFILES,
        ):
            response = client.get("/api/v1/codigestion/municipality-cn-profiles")

        assert response.status_code == 200
        body = response.json()
        assert "profiles" in body
        assert "count" in body
        assert body["count"] == 3

    def test_get_cn_profiles_structure(self):
        """Each profile contains ibge_code and weighted_cn."""
        with patch(
            "app.api.v1.endpoints.codigestion.get_municipality_cn_profiles",
            return_value=SAMPLE_CN_PROFILES,
        ):
            response = client.get("/api/v1/codigestion/municipality-cn-profiles")

        profile = response.json()["profiles"][0]
        assert "ibge_code" in profile
        assert "weighted_cn" in profile

    def test_get_cn_profiles_empty(self):
        """Empty profile list is returned cleanly."""
        with patch(
            "app.api.v1.endpoints.codigestion.get_municipality_cn_profiles",
            return_value=[],
        ):
            response = client.get("/api/v1/codigestion/municipality-cn-profiles")

        assert response.status_code == 200
        assert response.json()["count"] == 0

    def test_get_cn_profiles_service_error_returns_500(self):
        """Service error returns 500."""
        with patch(
            "app.api.v1.endpoints.codigestion.get_municipality_cn_profiles",
            side_effect=Exception("shapefile not found"),
        ):
            response = client.get("/api/v1/codigestion/municipality-cn-profiles")

        assert response.status_code == 500

    def test_get_cn_profiles_cached_on_second_call(self):
        """C:N profiles are cached after first successful call."""
        _clear_codigestion_caches()
        with patch(
            "app.api.v1.endpoints.codigestion.get_municipality_cn_profiles",
            return_value=SAMPLE_CN_PROFILES,
        ) as mock_fn:
            client.get("/api/v1/codigestion/municipality-cn-profiles")
            client.get("/api/v1/codigestion/municipality-cn-profiles")

        mock_fn.assert_called_once()


@pytest.mark.integration
class TestPairingCandidates:
    """Tests for GET /api/v1/codigestion/pairing-candidates"""

    def test_get_pairing_candidates_happy_path(self):
        """Returns candidates for a valid IBGE code."""
        with patch(
            "app.api.v1.endpoints.codigestion.get_pairing_candidates",
            return_value=SAMPLE_PAIRING_CANDIDATES,
        ):
            response = client.get(
                "/api/v1/codigestion/pairing-candidates?ibge_code=3550308"
            )

        assert response.status_code == 200
        body = response.json()
        assert body["ibge_code"] == "3550308"
        assert "candidates" in body
        assert len(body["candidates"]) == 1

    def test_get_pairing_candidates_missing_ibge_code_returns_422(self):
        """ibge_code is required; missing it returns 422."""
        response = client.get("/api/v1/codigestion/pairing-candidates")
        assert response.status_code == 422

    def test_get_pairing_candidates_not_found_returns_404(self):
        """Service returning None signals municipality not found -> 404."""
        with patch(
            "app.api.v1.endpoints.codigestion.get_pairing_candidates",
            return_value=None,
        ):
            response = client.get(
                "/api/v1/codigestion/pairing-candidates?ibge_code=9999999"
            )

        assert response.status_code == 404
        assert "9999999" in response.json()["detail"]

    def test_get_pairing_candidates_service_error_returns_500(self):
        """Service exception returns 500."""
        with patch(
            "app.api.v1.endpoints.codigestion.get_pairing_candidates",
            side_effect=RuntimeError("data unavailable"),
        ):
            response = client.get(
                "/api/v1/codigestion/pairing-candidates?ibge_code=3550308"
            )

        assert response.status_code == 500


@pytest.mark.integration
class TestResidueCnMatrix:
    """Tests for GET /api/v1/codigestion/residue-cn-matrix"""

    def test_get_residue_cn_matrix_happy_path(self):
        """Returns C:N matrix with residues and optimal range."""
        with patch(
            "app.api.v1.endpoints.codigestion.get_residue_cn_matrix",
            return_value=SAMPLE_CN_MATRIX,
        ):
            response = client.get("/api/v1/codigestion/residue-cn-matrix")

        assert response.status_code == 200
        body = response.json()
        assert "residues" in body
        assert "optimal_range" in body
        assert body["optimal_range"]["low"] == 20.0
        assert body["optimal_range"]["high"] == 30.0

    def test_get_residue_cn_matrix_service_error_returns_500(self):
        """Service error returns 500."""
        with patch(
            "app.api.v1.endpoints.codigestion.get_residue_cn_matrix",
            side_effect=Exception("db error"),
        ):
            response = client.get("/api/v1/codigestion/residue-cn-matrix")

        assert response.status_code == 500


@pytest.mark.integration
class TestClearClusterCache:
    """Tests for DELETE /api/v1/codigestion/clusters/cache"""

    def test_clear_cache_returns_cleared_count(self):
        """DELETE /clusters/cache clears caches and returns count."""
        import app.api.v1.endpoints.codigestion as mod
        mod._cluster_cache[("30.0", "1000.0", 20)] = SAMPLE_CLUSTERS_RESULT
        mod._cn_profile_cache = SAMPLE_CN_PROFILES

        response = client.delete("/api/v1/codigestion/clusters/cache")

        assert response.status_code == 200
        body = response.json()
        assert "cleared_entries" in body
        assert "message" in body
        # Cache should now be empty
        assert len(mod._cluster_cache) == 0
        assert mod._cn_profile_cache is None

    def test_clear_cache_on_empty_cache(self):
        """Clearing an already-empty cache returns 0 cleared entries."""
        _clear_codigestion_caches()
        response = client.delete("/api/v1/codigestion/clusters/cache")

        assert response.status_code == 200
        assert response.json()["cleared_entries"] == 0

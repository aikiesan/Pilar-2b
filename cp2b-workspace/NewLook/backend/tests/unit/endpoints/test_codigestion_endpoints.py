"""
Co-digestion endpoint — unit tests for all five routes.
The service functions are patched so no real DB or computation is needed.
"""

from unittest.mock import MagicMock, patch

import pytest

# ─── Fixture: mock the service layer ─────────────────────────────────────────

FAKE_CLUSTERS = {
    "clusters": [
        {
            "cluster_id": "cluster-1",
            "municipalities": ["3550308", "3509502"],
            "cn_weighted": 22.5,
            "improvement_score": 8.3,
            "total_biomass_tons": 15000.0,
        }
    ],
    "total_clusters": 1,
}

FAKE_CN_PROFILES = [
    {"ibge_code": "3550308", "municipality_name": "São Paulo", "cn_weighted": 22.5},
    {"ibge_code": "3509502", "municipality_name": "Campinas", "cn_weighted": 18.0},
]

FAKE_CN_MATRIX = {
    "residues": [
        {"code": "PEC_ESTERCO_BOVINO", "cn_ratio": 15.0, "role": "nitrogen_donor"},
        {"code": "AG_CANA_BAGACO", "cn_ratio": 80.0, "role": "carbon_donor"},
    ]
}

FAKE_CANDIDATES = [
    {
        "ibge_code": "3509502",
        "municipality_name": "Campinas",
        "improvement_score": 6.5,
        "distance_km": 12.3,
    }
]


# ─── DELETE /clusters/cache ───────────────────────────────────────────────────


@pytest.mark.unit
class TestClearClusterCache:

    def test_delete_cache_returns_200(self, client):
        response = client.delete("/api/v1/codigestion/clusters/cache")
        assert response.status_code == 200

    def test_delete_cache_has_cleared_entries(self, client):
        data = client.delete("/api/v1/codigestion/clusters/cache").json()
        assert "cleared_entries" in data

    def test_delete_cache_has_message(self, client):
        data = client.delete("/api/v1/codigestion/clusters/cache").json()
        assert "message" in data


# ─── GET /clusters ────────────────────────────────────────────────────────────


@pytest.mark.unit
class TestGetClusters:

    def test_returns_200_with_service_mock(self, client):
        with patch(
            "app.services.codigestion_service.find_codigestion_clusters", return_value=FAKE_CLUSTERS
        ):
            response = client.get("/api/v1/codigestion/clusters")
        assert response.status_code == 200

    def test_accepts_radius_param(self, client):
        with patch(
            "app.services.codigestion_service.find_codigestion_clusters", return_value=FAKE_CLUSTERS
        ):
            response = client.get("/api/v1/codigestion/clusters?radius_km=50.0")
        assert response.status_code == 200

    def test_accepts_min_biomass_param(self, client):
        with patch(
            "app.services.codigestion_service.find_codigestion_clusters", return_value=FAKE_CLUSTERS
        ):
            response = client.get("/api/v1/codigestion/clusters?min_biomass_tons=500.0")
        assert response.status_code == 200


# ─── GET /municipality-cn-profiles ───────────────────────────────────────────


@pytest.mark.unit
class TestMunicipalityCNProfiles:

    def test_returns_200(self, client):
        with patch(
            "app.services.codigestion_service.get_municipality_cn_profiles",
            return_value=FAKE_CN_PROFILES,
        ):
            response = client.get("/api/v1/codigestion/municipality-cn-profiles")
        assert response.status_code == 200

    def test_has_profiles_key(self, client):
        with patch(
            "app.services.codigestion_service.get_municipality_cn_profiles",
            return_value=FAKE_CN_PROFILES,
        ):
            data = client.get("/api/v1/codigestion/municipality-cn-profiles").json()
        assert "profiles" in data
        assert "count" in data

    def test_count_matches_profiles_length(self, client):
        with patch(
            "app.services.codigestion_service.get_municipality_cn_profiles",
            return_value=FAKE_CN_PROFILES,
        ):
            data = client.get("/api/v1/codigestion/municipality-cn-profiles").json()
        assert data["count"] == len(FAKE_CN_PROFILES)


# ─── GET /residue-cn-matrix ───────────────────────────────────────────────────


@pytest.mark.unit
class TestResidueCNMatrix:

    def test_returns_200(self, client):
        with patch(
            "app.services.codigestion_service.get_residue_cn_matrix", return_value=FAKE_CN_MATRIX
        ):
            response = client.get("/api/v1/codigestion/residue-cn-matrix")
        assert response.status_code == 200


# ─── GET /pairing-candidates ──────────────────────────────────────────────────


@pytest.mark.unit
class TestPairingCandidates:

    def test_returns_200_with_valid_ibge(self, client):
        with patch(
            "app.services.codigestion_service.get_pairing_candidates", return_value=FAKE_CANDIDATES
        ):
            response = client.get("/api/v1/codigestion/pairing-candidates?ibge_code=3550308")
        assert response.status_code == 200

    def test_response_contains_candidates(self, client):
        with patch(
            "app.services.codigestion_service.get_pairing_candidates", return_value=FAKE_CANDIDATES
        ):
            data = client.get("/api/v1/codigestion/pairing-candidates?ibge_code=3550308").json()
        assert "candidates" in data

    def test_missing_ibge_returns_422(self, client):
        response = client.get("/api/v1/codigestion/pairing-candidates")
        assert response.status_code == 422

    def test_not_found_municipality_returns_404(self, client):
        with patch("app.services.codigestion_service.get_pairing_candidates", return_value=None):
            response = client.get("/api/v1/codigestion/pairing-candidates?ibge_code=0000000")
        assert response.status_code == 404

    def test_accepts_radius_param(self, client):
        with patch(
            "app.services.codigestion_service.get_pairing_candidates", return_value=FAKE_CANDIDATES
        ):
            response = client.get(
                "/api/v1/codigestion/pairing-candidates?ibge_code=3550308&radius_km=75.0"
            )
        assert response.status_code == 200


# ─── GET /clusters/{cluster_id} ──────────────────────────────────────────────


@pytest.mark.unit
class TestGetClusterDetail:

    def test_existing_cluster_returns_200(self, client):
        # Populate the cache via /clusters first, then fetch detail
        with patch(
            "app.services.codigestion_service.find_codigestion_clusters", return_value=FAKE_CLUSTERS
        ):
            client.get("/api/v1/codigestion/clusters")  # populates _cluster_cache
            response = client.get("/api/v1/codigestion/clusters/cluster-1")
        assert response.status_code == 200

    def test_missing_cluster_returns_404(self, client):
        # Clear cache first so the service is called, then return empty
        client.delete("/api/v1/codigestion/clusters/cache")
        empty = {"clusters": [], "total_clusters": 0}
        with patch(
            "app.services.codigestion_service.find_codigestion_clusters", return_value=empty
        ):
            response = client.get("/api/v1/codigestion/clusters/nonexistent-id")
        assert response.status_code == 404

    def test_cache_hit_returns_same_data(self, client):
        with patch(
            "app.services.codigestion_service.find_codigestion_clusters", return_value=FAKE_CLUSTERS
        ) as mock_svc:
            client.delete("/api/v1/codigestion/clusters/cache")
            client.get("/api/v1/codigestion/clusters")  # first call — populates cache
            client.get("/api/v1/codigestion/clusters")  # second call — cache hit
        # Service should only be called once (first populate), not twice
        assert mock_svc.call_count == 1

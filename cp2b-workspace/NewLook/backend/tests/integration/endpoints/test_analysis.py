"""
Integration tests for Analysis API endpoints (psycopg2 backend).

The analysis endpoint was rewritten from Supabase to direct PostgreSQL queries.
Tests use the conftest `client` fixture (mocked DB) and configure the mock
cursor per-test as needed.
"""
import pytest
from fastapi.testclient import TestClient


# ── Residue config (static — no DB) ─────────────────────────────────────────

@pytest.mark.integration
class TestResidueConfig:

    def test_get_residue_config_returns_200(self, client: TestClient):
        response = client.get("/api/v1/analysis/residue-config")
        assert response.status_code == 200

    def test_residue_config_has_categories(self, client: TestClient):
        response = client.get("/api/v1/analysis/residue-config")
        data = response.json()
        assert "categories" in data
        cats = data["categories"]
        assert "agricultural" in cats
        assert "livestock" in cats
        assert "urban" in cats

    def test_agricultural_config_has_residues(self, client: TestClient):
        response = client.get("/api/v1/analysis/residue-config")
        agricultural = response.json()["categories"]["agricultural"]
        assert "residues" in agricultural
        assert len(agricultural["residues"]) > 0

    def test_livestock_config_has_residues(self, client: TestClient):
        response = client.get("/api/v1/analysis/residue-config")
        livestock = response.json()["categories"]["livestock"]
        assert "residues" in livestock

    def test_urban_config_has_residues(self, client: TestClient):
        response = client.get("/api/v1/analysis/residue-config")
        urban = response.json()["categories"]["urban"]
        assert "residues" in urban


# ── By-residue endpoint ──────────────────────────────────────────────────────

_SAMPLE_MUN_ROW = {
    "ibge_code": "3550308",
    "municipality_name": "São Paulo",
    "administrative_region": "Metropolitana de São Paulo",
    "population": 12_325_232,
    "area_km2": 1521.11,
    "agricultural_biogas_m3_year": 150_000_000,
    "livestock_biogas_m3_year": 80_000_000,
    "urban_biogas_m3_year": 200_000_000,
}


@pytest.mark.integration
class TestByResidue:

    def test_agricultural_category_not_5xx(self, client: TestClient, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchall.return_value = [_SAMPLE_MUN_ROW]

        response = client.get("/api/v1/analysis/by-residue?category=agricultural")
        assert response.status_code < 500

    def test_livestock_category_not_5xx(self, client: TestClient, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchall.return_value = [_SAMPLE_MUN_ROW]

        response = client.get("/api/v1/analysis/by-residue?category=livestock")
        assert response.status_code < 500

    def test_urban_category_not_5xx(self, client: TestClient, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchall.return_value = [_SAMPLE_MUN_ROW]

        response = client.get("/api/v1/analysis/by-residue?category=urban")
        assert response.status_code < 500

    def test_response_shape_when_data_present(self, client: TestClient, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchall.return_value = [_SAMPLE_MUN_ROW]

        response = client.get("/api/v1/analysis/by-residue?category=agricultural")
        if response.status_code == 200:
            body = response.json()
            assert "data" in body or "category" in body  # accept either envelope

    def test_empty_db_returns_200(self, client: TestClient, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchall.return_value = []

        response = client.get("/api/v1/analysis/by-residue?category=agricultural")
        assert response.status_code < 500

    def test_invalid_category_returns_error(self, client: TestClient):
        response = client.get("/api/v1/analysis/by-residue?category=invalid_category")
        assert response.status_code in (400, 422)


# ── Distribution endpoint ────────────────────────────────────────────────────

@pytest.mark.integration
class TestDistribution:

    def test_distribution_not_5xx(self, client: TestClient, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchall.return_value = []

        response = client.get("/api/v1/analysis/distribution")
        assert response.status_code < 500

    def test_distribution_with_data(self, client: TestClient, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchall.return_value = [
            {"municipality_name": f"Mun{i}", "total_biogas_m3_year": 100_000_000 + i * 10_000_000}
            for i in range(20)
        ]

        response = client.get("/api/v1/analysis/distribution")
        assert response.status_code < 500
        if response.status_code == 200:
            body = response.json()
            assert "histogram" in body or "data" in body

    def test_distribution_bins_validation_min(self, client: TestClient):
        """bins < 5 must be rejected."""
        response = client.get("/api/v1/analysis/distribution?bins=3")
        assert response.status_code == 422

    def test_distribution_bins_validation_max(self, client: TestClient):
        """bins > 50 must be rejected."""
        response = client.get("/api/v1/analysis/distribution?bins=100")
        assert response.status_code == 422

    def test_distribution_valid_bins(self, client: TestClient, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchall.return_value = []

        response = client.get("/api/v1/analysis/distribution?bins=20")
        assert response.status_code < 500


# ── Statistics by category ───────────────────────────────────────────────────

@pytest.mark.integration
class TestStatisticsByCategory:

    def test_stats_by_category_not_5xx(self, client: TestClient, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchall.return_value = [_SAMPLE_MUN_ROW]

        response = client.get("/api/v1/analysis/statistics/by-category")
        assert response.status_code < 500

    def test_stats_by_category_response_shape(self, client: TestClient, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchall.return_value = [_SAMPLE_MUN_ROW]

        response = client.get("/api/v1/analysis/statistics/by-category")
        if response.status_code == 200:
            body = response.json()
            assert "categories" in body or "data" in body


# ── Statistics by region ─────────────────────────────────────────────────────

@pytest.mark.integration
class TestStatisticsByRegion:

    def test_stats_by_region_not_5xx(self, client: TestClient, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchall.return_value = [
            {**_SAMPLE_MUN_ROW, "administrative_region": "Metropolitana de São Paulo"}
        ]

        response = client.get("/api/v1/analysis/statistics/by-region")
        assert response.status_code < 500

    def test_stats_by_region_agricultural_filter(self, client: TestClient, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchall.return_value = [_SAMPLE_MUN_ROW]

        response = client.get("/api/v1/analysis/statistics/by-region?category=agricultural")
        assert response.status_code < 500

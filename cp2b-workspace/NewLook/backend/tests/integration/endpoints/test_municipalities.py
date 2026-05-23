"""
Integration tests for Municipalities API endpoints (psycopg2 / PostGIS backend).

The municipalities endpoint was rewritten from Supabase to direct PostgreSQL
queries.  These tests use the `client` fixture (mocked DB via conftest autouse)
and configure the mock cursor per-test to return realistic data.
"""
import json
import pytest
from fastapi.testclient import TestClient

# ── Sample data ──────────────────────────────────────────────────────────────

_SP_ROW = {
    "ibge_code": "3550308",
    "municipality_name": "São Paulo",
    "id": 1,
    "geojson": json.dumps({"type": "Polygon", "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 0]]]}),
    "total_biogas_m3_year": 500_000_000,
    "agricultural_biogas_m3_year": 100_000_000,
    "livestock_biogas_m3_year": 150_000_000,
    "urban_biogas_m3_year": 250_000_000,
    "energy_potential_mwh_year": 1_000_000,
    "co2_reduction_tons_year": 250_000,
    "population": 12_325_232,
    "area_km2": 1521.11,
    "population_density": 8100.0,
    "population_year": 2022,
    "area_year": 2022,
    "gdp_total": 750_000_000_000.0,
    "gdp_per_capita": 60_000.0,
    "gdp_year": 2021,
    "administrative_region": "Metropolitana de São Paulo",
    "immediate_region": "São Paulo",
    "intermediate_region": "São Paulo",
    "immediate_region_code": "35001",
    "intermediate_region_code": "3501",
    "sugarcane_biogas_m3_year": 50_000_000,
    "soybean_biogas_m3_year": 5_000_000,
    "corn_biogas_m3_year": 5_000_000,
    "coffee_biogas_m3_year": 2_000_000,
    "citrus_biogas_m3_year": 1_000_000,
    "cattle_biogas_m3_year": 80_000_000,
    "swine_biogas_m3_year": 40_000_000,
    "poultry_biogas_m3_year": 20_000_000,
    "aquaculture_biogas_m3_year": 10_000_000,
    "rsu_biogas_m3_year": 200_000_000,
    "rpo_biogas_m3_year": 50_000_000,
    "total_biomass_tons_year": None,
    "agricultural_biomass_tons_year": None,
    "livestock_biomass_tons_year": None,
    "urban_biomass_tons_year": None,
    "sugarcane_biomass_tons_year": None,
    "soybean_biomass_tons_year": None,
    "corn_biomass_tons_year": None,
    "coffee_biomass_tons_year": None,
    "citrus_biomass_tons_year": None,
    "cattle_biomass_tons_year": None,
    "swine_biomass_tons_year": None,
    "poultry_biomass_tons_year": None,
    "aquaculture_biomass_tons_year": None,
    "rsu_biomass_tons_year": None,
    "rpo_biomass_tons_year": None,
    "cluster_id": None,
    "cluster_label": None,
    "mun_total_gwh": None,
    "mun_n_streams": None,
    "mun_dominant_stream": None,
}

_CAMPINAS_ROW = {**_SP_ROW, "ibge_code": "3509502", "municipality_name": "Campinas", "id": 2,
                 "population": 1_213_792, "total_biogas_m3_year": 50_000_000}

_STATS_ROW = {
    "total": 645,
    "total_population": 44_000_000,
    "total_area_km2": 248_220.0,
    "total_biogas_m3_year": 9_000_000_000,
    "total_energy_potential_mwh_year": 18_000_000,
    "total_agricultural_m3_year": 3_000_000_000,
    "total_livestock_m3_year": 3_000_000_000,
    "total_urban_m3_year": 3_000_000_000,
    "avg_biogas_m3_year": 13_953_488,
    "max_biogas_m3_year": 500_000_000,
    "min_biogas_m3_year": 0,
}


# ── GeoJSON endpoint ──────────────────────────────────────────────────────────

@pytest.mark.integration
class TestMunicipalitiesGeoJSON:

    def test_geojson_returns_200(self, client: TestClient, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        # _table_exists returns True so cluster columns are included
        mock_cursor.fetchone.return_value = {"total": 1}
        mock_cursor.fetchall.return_value = [_SP_ROW, _CAMPINAS_ROW]

        response = client.get("/api/v1/municipalities/geojson")

        assert response.status_code == 200

    def test_geojson_is_feature_collection(self, client: TestClient, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = {"total": 1}
        mock_cursor.fetchall.return_value = [_SP_ROW]

        response = client.get("/api/v1/municipalities/geojson")
        body = response.json()

        assert body["type"] == "FeatureCollection"
        assert "features" in body
        assert "metadata" in body

    def test_geojson_feature_structure(self, client: TestClient, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = {"total": 1}
        mock_cursor.fetchall.return_value = [_SP_ROW]

        response = client.get("/api/v1/municipalities/geojson")
        feature = response.json()["features"][0]

        assert feature["type"] == "Feature"
        assert "geometry" in feature
        assert "properties" in feature

    def test_geojson_properties_contain_required_keys(self, client: TestClient, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = {"total": 1}
        mock_cursor.fetchall.return_value = [_SP_ROW]

        response = client.get("/api/v1/municipalities/geojson")
        props = response.json()["features"][0]["properties"]

        for key in ("ibge_code", "municipality_name", "total_biogas_m3_year",
                    "population", "area_km2", "potential_category"):
            assert key in props, f"Missing property '{key}'"

    def test_geojson_potential_category_values(self, client: TestClient, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = {"total": 1}
        mock_cursor.fetchall.return_value = [_SP_ROW]

        response = client.get("/api/v1/municipalities/geojson")
        category = response.json()["features"][0]["properties"]["potential_category"]

        assert category in ("ALTO", "MEDIO", "BAIXO", "SEM DADOS")

    def test_geojson_empty_db_returns_empty_collection(self, client: TestClient, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = None
        mock_cursor.fetchall.return_value = []

        response = client.get("/api/v1/municipalities/geojson")

        assert response.status_code == 200
        body = response.json()
        assert body["type"] == "FeatureCollection"
        assert body["features"] == []

    def test_geojson_limit_param_accepted(self, client: TestClient, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = None
        mock_cursor.fetchall.return_value = []

        response = client.get("/api/v1/municipalities/geojson?limit=50")
        assert response.status_code == 200

    def test_geojson_limit_validation(self, client: TestClient):
        """limit > 1000 must be rejected by FastAPI validation."""
        response = client.get("/api/v1/municipalities/geojson?limit=9999")
        assert response.status_code == 422


# ── Stats / summary endpoint ──────────────────────────────────────────────────

@pytest.mark.integration
class TestMunicipalitiesStatsSummary:

    def test_stats_summary_not_5xx(self, client: TestClient, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = _STATS_ROW

        response = client.get("/api/v1/municipalities/stats/summary")
        assert response.status_code < 500

    def test_stats_summary_response_shape(self, client: TestClient, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = _STATS_ROW

        response = client.get("/api/v1/municipalities/stats/summary")
        if response.status_code == 200:
            body = response.json()
            for key in ("total_municipalities", "total_population",
                        "total_biogas_m3_year", "total_area_km2"):
                assert key in body, f"Missing key '{key}'"

    def test_stats_summary_no_db_returns_defaults(self, client: TestClient, mock_db_connection):
        """When DB returns no row, the endpoint should degrade gracefully (not 500)."""
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = None

        response = client.get("/api/v1/municipalities/stats/summary")
        assert response.status_code < 500


# ── List endpoint ─────────────────────────────────────────────────────────────

@pytest.mark.integration
class TestMunicipalitiesList:

    def test_list_not_5xx(self, client: TestClient):
        response = client.get("/api/v1/municipalities/")
        assert response.status_code < 500

    def test_list_pagination_params(self, client: TestClient):
        response = client.get("/api/v1/municipalities/?limit=10&offset=0")
        assert response.status_code < 500

    def test_list_search_param(self, client: TestClient):
        response = client.get("/api/v1/municipalities/?search=Campinas")
        assert response.status_code < 500

    def test_list_limit_validation(self, client: TestClient):
        """limit > 1000 must be rejected."""
        response = client.get("/api/v1/municipalities/?limit=9999")
        assert response.status_code == 422

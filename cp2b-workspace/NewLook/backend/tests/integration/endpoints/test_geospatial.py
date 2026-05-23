"""
Integration tests for Geospatial API endpoints.
Tests PostGIS-based spatial queries, GeoJSON generation, and municipality data.

Uses the conftest `client` fixture (mocked DB via `mock_db_connection`).
Each test configures `mock_conn.cursor.return_value = MockCursor(...)` so that
executed queries and return values can be inspected precisely.
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch


# ── Local cursor/connection helpers ───────────────────────────────────────────

class MockCursor:
    """Mock database cursor for PostGIS queries — tracks executed SQL."""

    def __init__(self, return_value=None):
        self.return_value = return_value
        self.executed_queries = []
        self.executed_params = []

    def execute(self, query, params=None):
        self.executed_queries.append(query)
        self.executed_params.append(params)

    def fetchone(self):
        return self.return_value

    def fetchall(self):
        if isinstance(self.return_value, list):
            return self.return_value
        return [self.return_value] if self.return_value else []

    def close(self):
        pass


@pytest.fixture
def mock_shapefile_loader():
    with patch("app.api.v1.endpoints.geospatial.shapefile_loader") as mock:
        yield mock


# ── /geospatial/municipalities/geojson ───────────────────────────────────────

@pytest.mark.integration
class TestMunicipalitiesGeoJSON:

    def test_get_municipalities_geojson_basic(self, client: TestClient, mock_db_connection):
        mock_conn, _ = mock_db_connection
        cursor = MockCursor({
            "geojson": {
                "type": "FeatureCollection",
                "features": [
                    {
                        "type": "Feature",
                        "id": 1,
                        "geometry": {"type": "Polygon", "coordinates": [[[-46.6, -23.5], [-46.5, -23.5], [-46.5, -23.4], [-46.6, -23.5]]]},
                        "properties": {"id": 1, "name": "São Paulo", "total_biogas_m3_year": 200_000_000},
                    }
                ],
            }
        })
        mock_conn.cursor.return_value = cursor

        response = client.get("/api/v1/geospatial/municipalities/geojson")

        assert response.status_code == 200
        data = response.json()
        assert data["type"] == "FeatureCollection"

    def test_get_municipalities_geojson_with_limit(self, client: TestClient, mock_db_connection):
        mock_conn, _ = mock_db_connection
        cursor = MockCursor({"geojson": {"type": "FeatureCollection", "features": []}})
        mock_conn.cursor.return_value = cursor

        response = client.get("/api/v1/geospatial/municipalities/geojson?limit=50")

        assert response.status_code == 200
        assert any("LIMIT" in q for q in cursor.executed_queries)

    def test_get_municipalities_geojson_with_min_biogas(self, client: TestClient, mock_db_connection):
        mock_conn, _ = mock_db_connection
        cursor = MockCursor({"geojson": {"type": "FeatureCollection", "features": []}})
        mock_conn.cursor.return_value = cursor

        response = client.get("/api/v1/geospatial/municipalities/geojson?min_biogas=100000000")

        assert response.status_code == 200

    def test_get_municipalities_geojson_with_valid_region(self, client: TestClient, mock_db_connection):
        mock_conn, _ = mock_db_connection
        cursor = MockCursor({"geojson": {"type": "FeatureCollection", "features": []}})
        mock_conn.cursor.return_value = cursor

        response = client.get("/api/v1/geospatial/municipalities/geojson?region=Campinas")

        assert response.status_code == 200

    def test_get_municipalities_geojson_empty_result(self, client: TestClient, mock_db_connection):
        mock_conn, _ = mock_db_connection
        cursor = MockCursor(None)
        mock_conn.cursor.return_value = cursor

        response = client.get("/api/v1/geospatial/municipalities/geojson")

        assert response.status_code == 200
        data = response.json()
        assert data["type"] == "FeatureCollection"
        assert data.get("features", []) == []

    def test_get_municipalities_geojson_database_error(self, client: TestClient, mock_db_connection):
        import psycopg2

        mock_conn, _ = mock_db_connection
        cursor = MockCursor()
        cursor.execute = Mock(side_effect=psycopg2.Error("Connection failed"))
        mock_conn.cursor.return_value = cursor

        response = client.get("/api/v1/geospatial/municipalities/geojson")

        assert response.status_code == 500


# ── /geospatial/municipalities/centroids ─────────────────────────────────────

@pytest.mark.integration
class TestMunicipalityCentroids:

    def test_get_centroids_basic(self, client: TestClient, mock_db_connection):
        mock_conn, _ = mock_db_connection
        cursor = MockCursor({
            "geojson": {
                "type": "FeatureCollection",
                "features": [
                    {
                        "type": "Feature",
                        "id": 1,
                        "geometry": {"type": "Point", "coordinates": [-46.6333, -23.5505]},
                        "properties": {"id": 1, "name": "São Paulo", "biogas": 200_000_000},
                    }
                ],
            }
        })
        mock_conn.cursor.return_value = cursor

        response = client.get("/api/v1/geospatial/municipalities/centroids")

        assert response.status_code == 200

    def test_get_centroids_empty_result(self, client: TestClient, mock_db_connection):
        mock_conn, _ = mock_db_connection
        cursor = MockCursor(None)
        mock_conn.cursor.return_value = cursor

        response = client.get("/api/v1/geospatial/municipalities/centroids")

        assert response.status_code == 200


# ── /geospatial/municipalities ────────────────────────────────────────────────

@pytest.mark.integration
class TestListMunicipalities:

    def test_list_municipalities_default_params(self, client: TestClient, mock_db_connection):
        mock_conn, _ = mock_db_connection
        cursor = MockCursor([
            {"id": 1, "municipality_name": "São Paulo", "total_biogas_m3_year": 200_000_000,
             "energy_potential_mwh_year": 400_000, "ranking": 1}
        ])
        mock_conn.cursor.return_value = cursor

        response = client.get("/api/v1/geospatial/municipalities")

        assert response.status_code == 200

    def test_list_municipalities_with_pagination(self, client: TestClient, mock_db_connection):
        mock_conn, _ = mock_db_connection
        cursor = MockCursor([])
        mock_conn.cursor.return_value = cursor

        response = client.get("/api/v1/geospatial/municipalities?limit=50&offset=100")

        assert response.status_code == 200
        assert any("LIMIT" in q for q in cursor.executed_queries)
        assert any("OFFSET" in q for q in cursor.executed_queries)

    def test_list_municipalities_sort_by_name(self, client: TestClient, mock_db_connection):
        mock_conn, _ = mock_db_connection
        cursor = MockCursor([])
        mock_conn.cursor.return_value = cursor

        response = client.get("/api/v1/geospatial/municipalities?sort_by=name&order=asc")

        assert response.status_code == 200

    def test_list_municipalities_invalid_sort_returns_200_or_422(self, client: TestClient, mock_db_connection):
        mock_conn, _ = mock_db_connection
        cursor = MockCursor([])
        mock_conn.cursor.return_value = cursor

        response = client.get("/api/v1/geospatial/municipalities?sort_by=invalid_column")

        assert response.status_code in (200, 422)


# ── /geospatial/municipalities/{id} ──────────────────────────────────────────

@pytest.mark.integration
class TestGetMunicipality:

    _DETAIL_ROW = {
        "id": 1,
        "municipality_name": "São Paulo",
        "ibge_code": "3550308",
        "area_km2": 1521.0,
        "population_density": 7891.0,
        "total_biogas_m3_year": 200_000_000,
        "total_biogas_m3_day": 547_945,
        "urban_biogas_m3_year": 120_000_000,
        "agricultural_biogas_m3_year": 50_000_000,
        "livestock_biogas_m3_year": 30_000_000,
        "rsu_biogas_m3_year": 80_000_000,
        "rpo_biogas_m3_year": 40_000_000,
        "sugarcane_biogas_m3_year": 30_000_000,
        "soybean_biogas_m3_year": 10_000_000,
        "corn_biogas_m3_year": 5_000_000,
        "coffee_biogas_m3_year": 3_000_000,
        "citrus_biogas_m3_year": 2_000_000,
        "cattle_biogas_m3_year": 15_000_000,
        "swine_biogas_m3_year": 10_000_000,
        "poultry_biogas_m3_year": 4_000_000,
        "aquaculture_biogas_m3_year": 1_000_000,
        "energy_potential_kwh_day": 1_000_000,
        "energy_potential_mwh_year": 400_000,
        "co2_reduction_tons_year": 100_000,
        "population": 12_000_000,
        "urban_population": 11_000_000,
        "rural_population": 1_000_000,
        "gdp_total": 700_000_000_000,
        "gdp_per_capita": 58_333,
        "centroid": {"type": "Point", "coordinates": [-46.6333, -23.5505]},
        "administrative_region": "Metropolitana de São Paulo",
        "immediate_region": "São Paulo",
        "intermediate_region": "São Paulo",
    }

    def test_get_municipality_detail(self, client: TestClient, mock_db_connection):
        mock_conn, _ = mock_db_connection
        cursor = MockCursor(self._DETAIL_ROW)
        mock_conn.cursor.return_value = cursor

        response = client.get("/api/v1/geospatial/municipalities/1")

        assert response.status_code == 200
        data = response.json()
        assert data["municipality_name"] == "São Paulo"

    def test_get_municipality_not_found(self, client: TestClient, mock_db_connection):
        mock_conn, _ = mock_db_connection
        cursor = MockCursor(None)
        mock_conn.cursor.return_value = cursor

        response = client.get("/api/v1/geospatial/municipalities/99999")

        assert response.status_code == 404

    def test_get_municipality_database_error(self, client: TestClient, mock_db_connection):
        import psycopg2

        mock_conn, _ = mock_db_connection
        cursor = MockCursor()
        cursor.execute = Mock(side_effect=psycopg2.Error("Query failed"))
        mock_conn.cursor.return_value = cursor

        response = client.get("/api/v1/geospatial/municipalities/1")

        assert response.status_code == 500


# ── /geospatial/proximity (POST) ──────────────────────────────────────────────

@pytest.mark.integration
class TestProximityAnalysis:

    def test_proximity_analysis_basic(self, client: TestClient, mock_db_connection):
        mock_conn, _ = mock_db_connection
        cursor = MockCursor([
            {"municipality_id": 1, "municipality_name": "São Paulo", "distance_km": 5.2},
            {"municipality_id": 2, "municipality_name": "Guarulhos", "distance_km": 15.8},
        ])
        mock_conn.cursor.return_value = cursor

        response = client.post(
            "/api/v1/geospatial/proximity",
            json={"latitude": -23.5505, "longitude": -46.6333, "radius_km": 50.0},
        )

        assert response.status_code == 200

    def test_proximity_analysis_validation_latitude(self, client: TestClient):
        response = client.post(
            "/api/v1/geospatial/proximity",
            json={"latitude": 91.0, "longitude": -46.6333, "radius_km": 50.0},
        )
        assert response.status_code == 422

    def test_proximity_analysis_validation_longitude(self, client: TestClient):
        response = client.post(
            "/api/v1/geospatial/proximity",
            json={"latitude": -23.5505, "longitude": 181.0, "radius_km": 50.0},
        )
        assert response.status_code == 422

    def test_proximity_analysis_validation_radius_zero(self, client: TestClient):
        response = client.post(
            "/api/v1/geospatial/proximity",
            json={"latitude": -23.5505, "longitude": -46.6333, "radius_km": 0},
        )
        assert response.status_code == 422

    def test_proximity_analysis_no_results(self, client: TestClient, mock_db_connection):
        mock_conn, _ = mock_db_connection
        cursor = MockCursor([])
        mock_conn.cursor.return_value = cursor

        response = client.post(
            "/api/v1/geospatial/proximity",
            json={"latitude": -23.5505, "longitude": -46.6333, "radius_km": 1.0},
        )

        assert response.status_code == 200


# ── /geospatial/rankings ──────────────────────────────────────────────────────

@pytest.mark.integration
class TestRankings:

    def test_rankings_total_biogas(self, client: TestClient, mock_db_connection):
        mock_conn, _ = mock_db_connection
        cursor = MockCursor([
            {"municipality_name": "São Paulo", "biogas_potential": 200_000_000,
             "energy_potential_mwh_year": 400_000, "ranking": 1},
            {"municipality_name": "Campinas", "biogas_potential": 150_000_000,
             "energy_potential_mwh_year": 300_000, "ranking": 2},
        ])
        mock_conn.cursor.return_value = cursor

        response = client.get("/api/v1/geospatial/rankings?criteria=total&limit=20")

        assert response.status_code == 200

    def test_rankings_limit_validation(self, client: TestClient, mock_db_connection):
        mock_conn, _ = mock_db_connection
        cursor = MockCursor([])
        mock_conn.cursor.return_value = cursor

        response = client.get("/api/v1/geospatial/rankings?limit=50")
        assert response.status_code == 200

        response = client.get("/api/v1/geospatial/rankings?limit=101")
        assert response.status_code == 422


# ── /geospatial/statistics/summary ───────────────────────────────────────────

@pytest.mark.integration
class TestSummaryStatistics:

    def test_summary_statistics_not_5xx(self, client: TestClient, mock_db_connection):
        mock_conn, _ = mock_db_connection
        stats_cursor = MockCursor({
            "total_municipalities": 645,
            "total_biogas_potential": 50_000_000_000,
            "avg_biogas_potential": 77_519_379,
            "total_energy_potential": 100_000_000,
            "total_co2_reduction": 25_000_000,
            "total_population": 44_000_000,
            "total_agricultural": 20_000_000_000,
            "total_livestock": 15_000_000_000,
            "total_urban": 15_000_000_000,
        })
        mock_conn.cursor.return_value = stats_cursor

        response = client.get("/api/v1/geospatial/statistics/summary")

        assert response.status_code < 500

    def test_summary_statistics_database_error(self, client: TestClient, mock_db_connection):
        import psycopg2

        mock_conn, _ = mock_db_connection
        cursor = MockCursor()
        cursor.execute = Mock(side_effect=psycopg2.Error("Connection failed"))
        mock_conn.cursor.return_value = cursor

        response = client.get("/api/v1/geospatial/statistics/summary")

        # Should return 200 with safe defaults or 500 — never crash without a response
        assert response.status_code in (200, 500)

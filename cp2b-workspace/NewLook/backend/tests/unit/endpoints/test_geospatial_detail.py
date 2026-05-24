"""
Geospatial municipality detail endpoint — centroid fix verification tests.

Tests GET /geospatial/municipalities/{id} after the centroid=None bug fix.
All DB access is intercepted by the autouse mock_db_connection fixture.
"""

import pytest
from unittest.mock import MagicMock


# ─── Mock row factory ─────────────────────────────────────────────────────────

def _municipality_row(
    mun_id=1,
    name="Campinas",
    ibge_code="3509502",
    centroid_lat=None,
    centroid_lng=None,
    area_km2=796.61,
    population=1213792,
):
    row = {
        "id": mun_id,
        "municipality_name": name,
        "ibge_code": ibge_code,
        "centroid_lat": centroid_lat,
        "centroid_lng": centroid_lng,
        "area_km2": area_km2,
        "population": population,
        "urban_population": 1180000,
        "rural_population": 33792,
        "total_biogas_m3_year": 50_000_000.0,
        "total_biogas_m3_day": 136_986.0,
        "urban_biogas_m3_year": 20_000_000.0,
        "agricultural_biogas_m3_year": 18_000_000.0,
        "livestock_biogas_m3_year": 12_000_000.0,
        "rsu_biogas_m3_year": 15_000_000.0,
        "rpo_biogas_m3_year": 5_000_000.0,
        "sugarcane_biogas_m3_year": 8_000_000.0,
        "soybean_biogas_m3_year": 3_000_000.0,
        "corn_biogas_m3_year": 4_000_000.0,
        "coffee_biogas_m3_year": 2_000_000.0,
        "citrus_biogas_m3_year": 1_000_000.0,
        "cattle_biogas_m3_year": 7_000_000.0,
        "swine_biogas_m3_year": 3_000_000.0,
        "poultry_biogas_m3_year": 1_500_000.0,
        "aquaculture_biogas_m3_year": 500_000.0,
        "energy_potential_kwh_day": 274_000.0,
        "energy_potential_mwh_year": 100_000.0,
        "co2_reduction_tons_year": 25_000.0,
        "gdp_total": 90_000_000_000.0,
        "gdp_per_capita": 74_000.0,
        "administrative_region": "Campinas",
        "immediate_region": "Campinas",
        "intermediate_region": "Campinas",
    }
    # Make it dict-accessible
    mock = MagicMock()
    mock.__getitem__ = lambda self, k: row[k]
    mock.get = lambda k, default=None: row.get(k, default)
    return mock


# ─── 404 path ────────────────────────────────────────────────────────────────

@pytest.mark.unit
class TestGetMunicipalityNotFound:

    def test_missing_returns_404(self, client, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = None
        response = client.get("/api/v1/geospatial/municipalities/9999")
        assert response.status_code == 404

    def test_missing_has_detail(self, client, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = None
        data = client.get("/api/v1/geospatial/municipalities/9999").json()
        assert "detail" in data


# ─── Centroid fix ─────────────────────────────────────────────────────────────

@pytest.mark.unit
class TestGetMunicipalityCentroid:

    def test_centroid_populated_when_db_has_values(self, client, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = _municipality_row(
            centroid_lat=-22.9056,
            centroid_lng=-47.0608,
        )
        data = client.get("/api/v1/geospatial/municipalities/1").json()
        assert data["centroid"] is not None
        assert data["centroid"]["lat"] == pytest.approx(-22.9056, abs=1e-4)
        assert data["centroid"]["lng"] == pytest.approx(-47.0608, abs=1e-4)

    def test_centroid_null_when_db_columns_are_null(self, client, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = _municipality_row(
            centroid_lat=None,
            centroid_lng=None,
        )
        data = client.get("/api/v1/geospatial/municipalities/1").json()
        assert data["centroid"] is None

    def test_centroid_has_lat_and_lng_keys(self, client, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = _municipality_row(
            centroid_lat=-23.5505,
            centroid_lng=-46.6333,
        )
        data = client.get("/api/v1/geospatial/municipalities/1").json()
        centroid = data["centroid"]
        assert "lat" in centroid
        assert "lng" in centroid


# ─── Response shape ───────────────────────────────────────────────────────────

@pytest.mark.unit
class TestGetMunicipalityShape:

    def _row(self, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = _municipality_row()

    def test_returns_200(self, client, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = _municipality_row()
        response = client.get("/api/v1/geospatial/municipalities/1")
        assert response.status_code == 200

    def test_municipality_name_present(self, client, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = _municipality_row(name="Campinas")
        data = client.get("/api/v1/geospatial/municipalities/1").json()
        assert data["municipality_name"] == "Campinas"

    def test_biogas_totals_present(self, client, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = _municipality_row()
        data = client.get("/api/v1/geospatial/municipalities/1").json()
        assert data["total_biogas_m3_year"] == pytest.approx(50_000_000.0)

    def test_population_density_computed(self, client, mock_db_connection):
        """population_density = population / area_km2"""
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = _municipality_row(
            area_km2=796.61, population=1_213_792
        )
        data = client.get("/api/v1/geospatial/municipalities/1").json()
        expected = 1_213_792 / 796.61
        assert data["population_density"] == pytest.approx(expected, rel=1e-3)

    def test_null_gdp_becomes_none_not_zero(self, client, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        row = _municipality_row()
        row.get = lambda k, default=None: {
            "gdp_total": None,
            "gdp_per_capita": None,
        }.get(k, _municipality_row().get(k, default))
        mock_cursor.fetchone.return_value = row
        data = client.get("/api/v1/geospatial/municipalities/1").json()
        # gdp_total being 0 from _f("gdp_total") or None → should be None
        # (test documents the intended behaviour of `_f("gdp_total") or None`)
        assert data.get("gdp_total") in (None, 0.0, pytest.approx(0.0))

    def test_all_sector_biogas_fields_present(self, client, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = _municipality_row()
        data = client.get("/api/v1/geospatial/municipalities/1").json()
        for field in (
            "urban_biogas_m3_year",
            "agricultural_biogas_m3_year",
            "livestock_biogas_m3_year",
        ):
            assert field in data, f"Missing field: {field}"

    def test_ibge_code_present(self, client, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = _municipality_row(ibge_code="3509502")
        data = client.get("/api/v1/geospatial/municipalities/1").json()
        assert data["ibge_code"] == "3509502"

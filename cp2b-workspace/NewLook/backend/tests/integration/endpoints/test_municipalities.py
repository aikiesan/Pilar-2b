"""
Integration tests for Municipalities API endpoints
Tests municipality data retrieval, GeoJSON generation, and statistics
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


class TestMunicipalitiesEndpoints:
    """Test municipalities API endpoints"""

    @pytest.fixture
    def mock_supabase_client(self):
        """Create mock Supabase client"""
        mock = Mock()
        mock.table = Mock()
        return mock

    @pytest.fixture
    def sample_municipality_data(self):
        """Sample municipality data from database"""
        return [
            {
                "id": 1,
                "ibge_code": "3550308",
                "municipality_name": "São Paulo",
                "population": 12325232,
                "area_km2": 1521.11,
                "total_biogas_m3_year": 500000000,
                "agricultural_biogas_m3_year": 100000000,
                "livestock_biogas_m3_year": 150000000,
                "urban_biogas_m3_year": 250000000,
                "energy_potential_mwh_year": 1000000,
                "administrative_region": "Metropolitana de São Paulo",
                "potential_category": "High",
                "sugarcane_biogas_m3_year": 50000000,
                "cattle_biogas_m3_year": 100000000,
            },
            {
                "id": 2,
                "ibge_code": "3509502",
                "municipality_name": "Campinas",
                "population": 1213792,
                "area_km2": 795.7,
                "total_biogas_m3_year": 50000000,
                "agricultural_biogas_m3_year": 20000000,
                "livestock_biogas_m3_year": 15000000,
                "urban_biogas_m3_year": 15000000,
                "energy_potential_mwh_year": 100000,
                "administrative_region": "Metropolitana de Campinas",
                "potential_category": "Medium",
            },
        ]

    def test_get_municipalities_success(
        self, mock_supabase_client, sample_municipality_data
    ):
        """Test GET /municipalities returns municipality list"""
        # Setup mock response
        mock_result = Mock()
        mock_result.data = sample_municipality_data

        mock_count_result = Mock()
        mock_count_result.count = 2

        mock_query = Mock()
        mock_query.range.return_value = mock_query
        mock_query.execute.return_value = mock_result

        mock_count_query = Mock()
        mock_count_query.execute.return_value = mock_count_result

        mock_table = Mock()
        mock_table.select = Mock()
        mock_table.select.side_effect = [mock_query, mock_count_query]

        mock_supabase_client.table.return_value = mock_table

        # Execute
        with patch(
            "app.api.v1.endpoints.municipalities.get_supabase_client",
            return_value=mock_supabase_client,
        ):
            response = client.get("/api/v1/municipalities/")

        # Verify
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "total" in data
        assert data["total"] == 2
        assert len(data["data"]) == 2
        assert data["data"][0]["municipality_name"] == "São Paulo"

    def test_get_municipalities_with_pagination(self, mock_supabase_client):
        """Test GET /municipalities with pagination parameters"""
        mock_result = Mock()
        mock_result.data = []

        mock_count_result = Mock()
        mock_count_result.count = 100

        mock_query = Mock()
        mock_query.range.return_value = mock_query
        mock_query.execute.return_value = mock_result

        mock_count_query = Mock()
        mock_count_query.execute.return_value = mock_count_result

        mock_table = Mock()
        mock_table.select = Mock()
        mock_table.select.side_effect = [mock_query, mock_count_query]

        mock_supabase_client.table.return_value = mock_table

        # Execute
        with patch(
            "app.api.v1.endpoints.municipalities.get_supabase_client",
            return_value=mock_supabase_client,
        ):
            response = client.get("/api/v1/municipalities/?limit=10&offset=20")

        # Verify
        assert response.status_code == 200
        data = response.json()
        assert data["limit"] == 10
        assert data["offset"] == 20
        assert data["has_more"] is True  # 20 + 10 < 100

        # Verify range was called correctly
        mock_query.range.assert_called_once_with(20, 29)

    def test_get_municipalities_with_search(self, mock_supabase_client):
        """Test GET /municipalities with search parameter"""
        mock_result = Mock()
        mock_result.data = []

        mock_count_result = Mock()
        mock_count_result.count = 1

        mock_query = Mock()
        mock_query.ilike.return_value = mock_query
        mock_query.range.return_value = mock_query
        mock_query.execute.return_value = mock_result

        mock_count_query = Mock()
        mock_count_query.execute.return_value = mock_count_result

        mock_table = Mock()
        mock_table.select = Mock()
        mock_table.select.side_effect = [mock_query, mock_count_query]

        mock_supabase_client.table.return_value = mock_table

        # Execute
        with patch(
            "app.api.v1.endpoints.municipalities.get_supabase_client",
            return_value=mock_supabase_client,
        ):
            response = client.get("/api/v1/municipalities/?search=São Paulo")

        # Verify
        assert response.status_code == 200
        mock_query.ilike.assert_called_once_with("municipality_name", "%São Paulo%")

    def test_get_municipality_by_id(
        self, mock_supabase_client, sample_municipality_data
    ):
        """Test GET /municipalities/{id} returns specific municipality"""
        mock_result = Mock()
        mock_result.data = [sample_municipality_data[0]]

        mock_query = Mock()
        mock_query.eq.return_value = mock_query
        mock_query.execute.return_value = mock_result

        mock_table = Mock()
        mock_table.select.return_value = mock_query

        mock_supabase_client.table.return_value = mock_table

        # Execute
        with patch(
            "app.api.v1.endpoints.municipalities.get_supabase_client",
            return_value=mock_supabase_client,
        ):
            response = client.get("/api/v1/municipalities/1")

        # Verify
        assert response.status_code == 200
        data = response.json()
        assert data["municipality_name"] == "São Paulo"
        assert data["ibge_code"] == "3550308"

        # Verify query was built correctly
        mock_query.eq.assert_called_once_with("id", 1)

    def test_get_municipality_by_ibge_code(
        self, mock_supabase_client, sample_municipality_data
    ):
        """Test GET /municipalities/{ibge_code} with IBGE code"""
        mock_result = Mock()
        mock_result.data = [sample_municipality_data[0]]

        mock_query = Mock()
        mock_query.eq.return_value = mock_query
        mock_query.execute.return_value = mock_result

        mock_table = Mock()
        mock_table.select.return_value = mock_query

        mock_supabase_client.table.return_value = mock_table

        # Execute
        with patch(
            "app.api.v1.endpoints.municipalities.get_supabase_client",
            return_value=mock_supabase_client,
        ):
            response = client.get("/api/v1/municipalities/3550308")

        # Verify
        assert response.status_code == 200
        data = response.json()
        assert data["municipality_name"] == "São Paulo"

        # Verify IBGE code was used
        mock_query.eq.assert_called_once_with("ibge_code", "3550308")

    def test_get_municipality_not_found(self, mock_supabase_client):
        """Test GET /municipalities/{id} with non-existent ID"""
        mock_result = Mock()
        mock_result.data = []

        mock_query = Mock()
        mock_query.eq.return_value = mock_query
        mock_query.execute.return_value = mock_result

        mock_table = Mock()
        mock_table.select.return_value = mock_query

        mock_supabase_client.table.return_value = mock_table

        # Execute
        with patch(
            "app.api.v1.endpoints.municipalities.get_supabase_client",
            return_value=mock_supabase_client,
        ):
            response = client.get("/api/v1/municipalities/99999")

        # Verify
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_get_municipalities_stats(
        self, mock_supabase_client, sample_municipality_data
    ):
        """Test GET /municipalities/stats/summary returns aggregated statistics"""
        # Setup mock count result
        mock_count_result = Mock()
        mock_count_result.count = 2

        mock_count_query = Mock()
        mock_count_query.execute.return_value = mock_count_result

        # Setup mock stats result
        mock_stats_result = Mock()
        mock_stats_result.data = sample_municipality_data

        mock_stats_query = Mock()
        mock_stats_query.execute.return_value = mock_stats_result

        # Setup table mock
        mock_table = Mock()
        mock_table.select = Mock()
        mock_table.select.side_effect = [mock_count_query, mock_stats_query]

        mock_supabase_client.table.return_value = mock_table

        # Execute
        with patch(
            "app.api.v1.endpoints.municipalities.get_supabase_client",
            return_value=mock_supabase_client,
        ):
            response = client.get("/api/v1/municipalities/stats/summary")

        # Verify
        assert response.status_code == 200
        data = response.json()

        assert "total_municipalities" in data
        assert data["total_municipalities"] == 2

        assert "total_population" in data
        assert data["total_population"] == 12325232 + 1213792

        assert "total_area_km2" in data
        assert data["total_area_km2"] == pytest.approx(1521.11 + 795.7, rel=0.01)

        assert "total_biogas_m3_year" in data
        assert data["total_biogas_m3_year"] == pytest.approx(
            500000000 + 50000000, rel=0.01
        )

    def test_get_municipalities_stats_empty_database(self, mock_supabase_client):
        """Test GET /municipalities/stats/summary with empty database"""
        # Setup empty results
        mock_count_result = Mock()
        mock_count_result.count = 0

        mock_count_query = Mock()
        mock_count_query.execute.return_value = mock_count_result

        mock_stats_result = Mock()
        mock_stats_result.data = []

        mock_stats_query = Mock()
        mock_stats_query.execute.return_value = mock_stats_result

        mock_table = Mock()
        mock_table.select = Mock()
        mock_table.select.side_effect = [mock_count_query, mock_stats_query]

        mock_supabase_client.table.return_value = mock_table

        # Execute
        with patch(
            "app.api.v1.endpoints.municipalities.get_supabase_client",
            return_value=mock_supabase_client,
        ):
            response = client.get("/api/v1/municipalities/stats/summary")

        # Verify
        assert response.status_code == 200
        data = response.json()
        assert data["total_municipalities"] == 0
        assert data["total_population"] == 0
        assert data["total_area_km2"] == 0
        assert data["total_biogas_m3_year"] == 0

    def test_get_municipalities_error_handling(self, mock_supabase_client):
        """Test GET /municipalities handles database errors"""
        # Setup mock to raise error
        mock_supabase_client.table.side_effect = Exception("Database connection error")

        # Execute
        with patch(
            "app.api.v1.endpoints.municipalities.get_supabase_client",
            return_value=mock_supabase_client,
        ):
            response = client.get("/api/v1/municipalities/")

        # Verify
        assert response.status_code == 500
        assert "error" in response.json()["detail"].lower()

    def test_get_municipalities_limit_validation(self):
        """Test GET /municipalities validates limit parameter"""
        # Execute with limit > 1000 (should be rejected)
        response = client.get("/api/v1/municipalities/?limit=2000")

        # Verify - FastAPI should validate and return 422
        assert response.status_code == 422

    def test_get_municipalities_stats_handles_null_values(self, mock_supabase_client):
        """Test stats calculation handles null values correctly"""
        # Data with some null values
        data_with_nulls = [
            {
                "population": 1000000,
                "area_km2": 100.0,
                "total_biogas_m3_year": 50000,
            },
            {
                "population": None,
                "area_km2": None,
                "total_biogas_m3_year": None,
            },
            {
                "population": 500000,
                "area_km2": 50.0,
                "total_biogas_m3_year": 25000,
            },
        ]

        mock_count_result = Mock()
        mock_count_result.count = 3

        mock_count_query = Mock()
        mock_count_query.execute.return_value = mock_count_result

        mock_stats_result = Mock()
        mock_stats_result.data = data_with_nulls

        mock_stats_query = Mock()
        mock_stats_query.execute.return_value = mock_stats_result

        mock_table = Mock()
        mock_table.select = Mock()
        mock_table.select.side_effect = [mock_count_query, mock_stats_query]

        mock_supabase_client.table.return_value = mock_table

        # Execute
        with patch(
            "app.api.v1.endpoints.municipalities.get_supabase_client",
            return_value=mock_supabase_client,
        ):
            response = client.get("/api/v1/municipalities/stats/summary")

        # Verify - should only sum non-null values
        assert response.status_code == 200
        data = response.json()
        assert data["total_population"] == 1500000  # Only non-null values
        assert data["total_area_km2"] == 150.0
        assert data["total_biogas_m3_year"] == 75000.0


class TestMunicipalitiesGeoJSON:
    """Test GeoJSON endpoint (requires shapefile)"""

    @pytest.fixture
    def mock_geopandas_dataframe(self):
        """Mock GeoDataFrame with sample data"""
        from shapely.geometry import Polygon

        mock_gdf = Mock()
        mock_gdf.__len__ = Mock(return_value=2)

        # Create sample rows
        row1 = {
            "CD_MUN": "3550308",
            "NM_MUN": "São Paulo",
            "geometry": Polygon(
                [(-46.6, -23.5), (-46.5, -23.5), (-46.5, -23.6), (-46.6, -23.6)]
            ),
        }

        row2 = {
            "CD_MUN": "3509502",
            "NM_MUN": "Campinas",
            "geometry": Polygon(
                [(-47.0, -22.9), (-46.9, -22.9), (-46.9, -23.0), (-47.0, -23.0)]
            ),
        }

        mock_gdf.iterrows.return_value = [(0, type("Row", (), row1)()), (1, type("Row", (), row2)())]

        return mock_gdf

    def test_get_geojson_shapefile_not_found(self):
        """Test GeoJSON endpoint when shapefile doesn't exist"""
        with patch("app.api.v1.endpoints.municipalities.SHAPEFILE_PATH") as mock_path:
            mock_path.exists.return_value = False
            with patch(
                "app.api.v1.endpoints.municipalities.SHAPEFILE_PATH_ALT"
            ) as mock_alt_path:
                mock_alt_path.exists.return_value = False

                response = client.get("/api/v1/municipalities/geojson")

        # Verify
        assert response.status_code == 500
        assert "Shapefile not found" in response.json()["detail"]

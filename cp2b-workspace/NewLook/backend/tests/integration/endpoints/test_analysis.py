"""
Integration tests for Analysis API endpoints
Tests biogas residue analysis, statistics, and distribution endpoints
"""

from unittest.mock import Mock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


class MockSupabaseResponse:
    """Mock Supabase response"""

    def __init__(self, data):
        self.data = data


@pytest.fixture
def mock_supabase_client():
    """Mock Supabase client for testing"""
    with patch("app.api.v1.endpoints.analysis.get_supabase_client") as mock:
        client = Mock()
        mock.return_value = client
        yield client


class TestByResidueAnalysis:
    """Tests for residue-specific biogas analysis"""

    def test_get_agricultural_residue_total(self, mock_supabase_client):
        """Test getting agricultural biogas totals"""
        # Mock Supabase response
        mock_table = Mock()
        mock_supabase_client.table.return_value = mock_table
        mock_select = Mock()
        mock_table.select.return_value = mock_select

        mock_select.execute.return_value = MockSupabaseResponse(
            [
                {
                    "id": 1,
                    "municipality_name": "São Paulo",
                    "ibge_code": "3550308",
                    "administrative_region": "Metropolitana de São Paulo",
                    "population": 12000000,
                    "area_km2": 1521.0,
                    "agricultural_biogas_m3_year": 150000000,
                },
                {
                    "id": 2,
                    "municipality_name": "Campinas",
                    "ibge_code": "3509502",
                    "administrative_region": "Metropolitana de Campinas",
                    "population": 1200000,
                    "area_km2": 795.0,
                    "agricultural_biogas_m3_year": 120000000,
                },
            ]
        )

        response = client.get("/api/v1/analysis/by-residue?category=agricultural")

        assert response.status_code == 200
        data = response.json()

        assert data["category"] == "agricultural"
        assert data["total"] == 2
        assert len(data["data"]) == 2

        # Verify sorting (descending by biogas)
        assert data["data"][0]["biogas_m3_year"] >= data["data"][1]["biogas_m3_year"]

        # Verify structure
        item = data["data"][0]
        assert "id" in item
        assert "municipality_name" in item
        assert "ibge_code" in item
        assert "biogas_m3_year" in item

    def test_get_specific_residue_types(self, mock_supabase_client):
        """Test getting specific residue types (sugarcane + soybean)"""
        mock_table = Mock()
        mock_supabase_client.table.return_value = mock_table
        mock_select = Mock()
        mock_table.select.return_value = mock_select

        mock_select.execute.return_value = MockSupabaseResponse(
            [
                {
                    "id": 1,
                    "municipality_name": "Ribeirão Preto",
                    "ibge_code": "3543402",
                    "administrative_region": "Ribeirão Preto",
                    "population": 700000,
                    "area_km2": 650.0,
                    "sugarcane_biogas_m3_year": 80000000,
                    "soybean_biogas_m3_year": 20000000,
                }
            ]
        )

        response = client.get(
            "/api/v1/analysis/by-residue",
            params={"category": "agricultural", "residue_types": ["sugarcane", "soybean"]},
        )

        assert response.status_code == 200
        data = response.json()

        assert data["category"] == "agricultural"
        assert "sugarcane" in data["residue_types"]
        assert "soybean" in data["residue_types"]

        # Verify sum calculation (80M + 20M = 100M)
        assert data["data"][0]["biogas_m3_year"] == 100000000

    def test_get_livestock_residues(self, mock_supabase_client):
        """Test getting livestock biogas totals"""
        mock_table = Mock()
        mock_supabase_client.table.return_value = mock_table
        mock_select = Mock()
        mock_table.select.return_value = mock_select

        mock_select.execute.return_value = MockSupabaseResponse(
            [
                {
                    "id": 1,
                    "municipality_name": "Toledo",
                    "ibge_code": "4127700",
                    "administrative_region": "Oeste Paulista",
                    "population": 140000,
                    "area_km2": 1200.0,
                    "livestock_biogas_m3_year": 90000000,
                }
            ]
        )

        response = client.get("/api/v1/analysis/by-residue?category=livestock")

        assert response.status_code == 200
        data = response.json()

        assert data["category"] == "livestock"
        assert len(data["data"]) == 1

    def test_get_urban_residues(self, mock_supabase_client):
        """Test getting urban biogas totals"""
        mock_table = Mock()
        mock_supabase_client.table.return_value = mock_table
        mock_select = Mock()
        mock_table.select.return_value = mock_select

        mock_select.execute.return_value = MockSupabaseResponse(
            [
                {
                    "id": 1,
                    "municipality_name": "São Paulo",
                    "ibge_code": "3550308",
                    "administrative_region": "Metropolitana de São Paulo",
                    "population": 12000000,
                    "area_km2": 1521.0,
                    "urban_biogas_m3_year": 200000000,
                }
            ]
        )

        response = client.get("/api/v1/analysis/by-residue?category=urban")

        assert response.status_code == 200
        data = response.json()

        assert data["category"] == "urban"

    def test_limit_parameter(self, mock_supabase_client):
        """Test limit parameter restricts results"""
        mock_table = Mock()
        mock_supabase_client.table.return_value = mock_table
        mock_select = Mock()
        mock_table.select.return_value = mock_select

        # Create 50 municipalities
        municipalities = [
            {
                "id": i,
                "municipality_name": f"Município {i}",
                "ibge_code": f"350{i:04d}",
                "administrative_region": "Teste",
                "population": 100000,
                "area_km2": 500.0,
                "agricultural_biogas_m3_year": 100000000 - (i * 1000000),
            }
            for i in range(50)
        ]

        mock_select.execute.return_value = MockSupabaseResponse(municipalities)

        response = client.get("/api/v1/analysis/by-residue?category=agricultural&limit=10")

        assert response.status_code == 200
        data = response.json()

        assert len(data["data"]) == 10

    def test_min_value_filter(self, mock_supabase_client):
        """Test min_value parameter filters results"""
        mock_table = Mock()
        mock_supabase_client.table.return_value = mock_table
        mock_select = Mock()
        mock_table.select.return_value = mock_select

        mock_select.execute.return_value = MockSupabaseResponse(
            [
                {
                    "id": 1,
                    "municipality_name": "High Value",
                    "ibge_code": "3550308",
                    "administrative_region": "Teste",
                    "population": 100000,
                    "area_km2": 500.0,
                    "agricultural_biogas_m3_year": 150000000,
                },
                {
                    "id": 2,
                    "municipality_name": "Low Value",
                    "ibge_code": "3509502",
                    "administrative_region": "Teste",
                    "population": 50000,
                    "area_km2": 300.0,
                    "agricultural_biogas_m3_year": 50000000,
                },
            ]
        )

        response = client.get(
            "/api/v1/analysis/by-residue?category=agricultural&min_value=100000000"
        )

        assert response.status_code == 200
        data = response.json()

        # Only high value municipality should be included
        assert data["total"] == 1
        assert data["data"][0]["municipality_name"] == "High Value"

    def test_empty_results(self, mock_supabase_client):
        """Test handling of empty database results"""
        mock_table = Mock()
        mock_supabase_client.table.return_value = mock_table
        mock_select = Mock()
        mock_table.select.return_value = mock_select

        mock_select.execute.return_value = MockSupabaseResponse([])

        response = client.get("/api/v1/analysis/by-residue?category=agricultural")

        assert response.status_code == 200
        data = response.json()

        assert data["data"] == []
        assert data["total"] == 0

    def test_invalid_residue_types(self, mock_supabase_client):
        """Test error handling for invalid residue types"""
        response = client.get(
            "/api/v1/analysis/by-residue",
            params={"category": "agricultural", "residue_types": ["invalid_residue"]},
        )

        assert response.status_code == 400
        assert "No valid residue types" in response.json()["detail"]

    def test_database_error_handling(self, mock_supabase_client):
        """Test error handling for database errors"""
        mock_table = Mock()
        mock_supabase_client.table.return_value = mock_table
        mock_select = Mock()
        mock_table.select.return_value = mock_select

        mock_select.execute.side_effect = Exception("Database connection failed")

        response = client.get("/api/v1/analysis/by-residue?category=agricultural")

        assert response.status_code == 500
        assert "Error fetching residue analysis" in response.json()["detail"]


class TestStatisticsByCategory:
    """Tests for category statistics endpoint"""

    def test_get_statistics_all_categories(self, mock_supabase_client):
        """Test getting statistics for all categories"""
        mock_table = Mock()
        mock_supabase_client.table.return_value = mock_table
        mock_select = Mock()
        mock_table.select.return_value = mock_select

        mock_select.execute.return_value = MockSupabaseResponse(
            [
                {
                    "agricultural_biogas_m3_year": 150000000,
                    "livestock_biogas_m3_year": 80000000,
                    "urban_biogas_m3_year": 120000000,
                    "total_biogas_m3_year": 350000000,
                },
                {
                    "agricultural_biogas_m3_year": 100000000,
                    "livestock_biogas_m3_year": 60000000,
                    "urban_biogas_m3_year": 90000000,
                    "total_biogas_m3_year": 250000000,
                },
            ]
        )

        response = client.get("/api/v1/analysis/statistics/by-category")

        assert response.status_code == 200
        data = response.json()

        assert "categories" in data
        assert "total_municipalities" in data
        assert data["total_municipalities"] == 2

        # Verify all categories present
        assert "agricultural" in data["categories"]
        assert "livestock" in data["categories"]
        assert "urban" in data["categories"]
        assert "total" in data["categories"]

        # Verify agricultural stats
        ag_stats = data["categories"]["agricultural"]
        assert ag_stats["total"] == 250000000  # 150M + 100M
        assert ag_stats["average"] == 125000000
        assert ag_stats["min"] == 100000000
        assert ag_stats["max"] == 150000000
        assert ag_stats["count"] == 2

    def test_empty_database(self, mock_supabase_client):
        """Test handling of empty database"""
        mock_table = Mock()
        mock_supabase_client.table.return_value = mock_table
        mock_select = Mock()
        mock_table.select.return_value = mock_select

        mock_select.execute.return_value = MockSupabaseResponse([])

        response = client.get("/api/v1/analysis/statistics/by-category")

        assert response.status_code == 200
        data = response.json()

        assert data["categories"] == {}
        assert data["total_municipalities"] == 0

    def test_database_error(self, mock_supabase_client):
        """Test database error handling"""
        mock_table = Mock()
        mock_supabase_client.table.return_value = mock_table
        mock_select = Mock()
        mock_table.select.return_value = mock_select

        mock_select.execute.side_effect = Exception("Database error")

        response = client.get("/api/v1/analysis/statistics/by-category")

        assert response.status_code == 500
        assert "Error fetching category statistics" in response.json()["detail"]


class TestStatisticsByRegion:
    """Tests for regional statistics endpoint"""

    def test_get_statistics_all_regions(self, mock_supabase_client):
        """Test getting statistics for all regions"""
        mock_table = Mock()
        mock_supabase_client.table.return_value = mock_table
        mock_select = Mock()
        mock_table.select.return_value = mock_select

        mock_select.execute.return_value = MockSupabaseResponse(
            [
                {
                    "administrative_region": "Metropolitana de São Paulo",
                    "total_biogas_m3_year": 400000000,
                },
                {
                    "administrative_region": "Metropolitana de Campinas",
                    "total_biogas_m3_year": 200000000,
                },
                {
                    "administrative_region": "Metropolitana de São Paulo",
                    "total_biogas_m3_year": 100000000,
                },
            ]
        )

        response = client.get("/api/v1/analysis/statistics/by-region")

        assert response.status_code == 200
        data = response.json()

        assert "regions" in data
        assert "total" in data
        assert "category" in data

        # Verify aggregation (São Paulo should have 500M total)
        regions = data["regions"]
        sp_region = next(r for r in regions if r["region"] == "Metropolitana de São Paulo")
        assert sp_region["biogas_m3_year"] == 500000000

        # Verify percentages
        assert sp_region["percentage"] > 0
        total_percentage = sum(r["percentage"] for r in regions)
        assert abs(total_percentage - 100.0) < 0.1  # Allow floating point error

        # Verify sorting (descending)
        assert regions[0]["biogas_m3_year"] >= regions[1]["biogas_m3_year"]

    def test_get_statistics_agricultural_only(self, mock_supabase_client):
        """Test filtering by agricultural category"""
        mock_table = Mock()
        mock_supabase_client.table.return_value = mock_table
        mock_select = Mock()
        mock_table.select.return_value = mock_select

        mock_select.execute.return_value = MockSupabaseResponse(
            [{"administrative_region": "Ribeirão Preto", "agricultural_biogas_m3_year": 300000000}]
        )

        response = client.get("/api/v1/analysis/statistics/by-region?category=agricultural")

        assert response.status_code == 200
        data = response.json()

        assert data["category"] == "agricultural"

    def test_undefined_region_handling(self, mock_supabase_client):
        """Test handling of null/undefined regions"""
        mock_table = Mock()
        mock_supabase_client.table.return_value = mock_table
        mock_select = Mock()
        mock_table.select.return_value = mock_select

        mock_select.execute.return_value = MockSupabaseResponse(
            [{"administrative_region": None, "total_biogas_m3_year": 50000000}]
        )

        response = client.get("/api/v1/analysis/statistics/by-region")

        assert response.status_code == 200
        data = response.json()

        # Should have "Não definido" region
        regions = data["regions"]
        assert any(r["region"] == "Não definido" for r in regions)

    def test_empty_results(self, mock_supabase_client):
        """Test handling of empty results"""
        mock_table = Mock()
        mock_supabase_client.table.return_value = mock_table
        mock_select = Mock()
        mock_table.select.return_value = mock_select

        mock_select.execute.return_value = MockSupabaseResponse([])

        response = client.get("/api/v1/analysis/statistics/by-region")

        assert response.status_code == 200
        data = response.json()

        assert data["regions"] == []
        assert data["total"] == 0


class TestDistribution:
    """Tests for distribution/histogram endpoint"""

    def test_get_distribution_default_bins(self, mock_supabase_client):
        """Test getting distribution with default bin count"""
        mock_table = Mock()
        mock_supabase_client.table.return_value = mock_table
        mock_select = Mock()
        mock_table.select.return_value = mock_select

        # Create sample data with varying values
        municipalities = [
            {"municipality_name": f"Mun{i}", "total_biogas_m3_year": 100000000 + (i * 10000000)}
            for i in range(20)
        ]

        mock_select.execute.return_value = MockSupabaseResponse(municipalities)

        response = client.get("/api/v1/analysis/distribution")

        assert response.status_code == 200
        data = response.json()

        assert "histogram" in data
        assert "statistics" in data
        assert "category" in data

        # Verify histogram structure (default 10 bins)
        assert len(data["histogram"]) == 10

        for bin_data in data["histogram"]:
            assert "bin_start" in bin_data
            assert "bin_end" in bin_data
            assert "count" in bin_data
            assert "label" in bin_data

        # Verify statistics
        stats = data["statistics"]
        assert "count" in stats
        assert "min" in stats
        assert "max" in stats
        assert "mean" in stats
        assert "median" in stats
        assert "std" in stats

        assert stats["count"] == 20
        assert stats["min"] == 100000000
        assert stats["max"] == 290000000

    def test_get_distribution_custom_bins(self, mock_supabase_client):
        """Test getting distribution with custom bin count"""
        mock_table = Mock()
        mock_supabase_client.table.return_value = mock_table
        mock_select = Mock()
        mock_table.select.return_value = mock_select

        municipalities = [
            {"municipality_name": f"Mun{i}", "total_biogas_m3_year": 100000000 + (i * 5000000)}
            for i in range(30)
        ]

        mock_select.execute.return_value = MockSupabaseResponse(municipalities)

        response = client.get("/api/v1/analysis/distribution?bins=20")

        assert response.status_code == 200
        data = response.json()

        # Verify 20 bins created
        assert len(data["histogram"]) == 20

    def test_get_distribution_by_category(self, mock_supabase_client):
        """Test filtering distribution by category"""
        mock_table = Mock()
        mock_supabase_client.table.return_value = mock_table
        mock_select = Mock()
        mock_table.select.return_value = mock_select

        municipalities = [
            {
                "municipality_name": f"Mun{i}",
                "agricultural_biogas_m3_year": 50000000 + (i * 2000000),
            }
            for i in range(15)
        ]

        mock_select.execute.return_value = MockSupabaseResponse(municipalities)

        response = client.get("/api/v1/analysis/distribution?category=agricultural")

        assert response.status_code == 200
        data = response.json()

        assert data["category"] == "agricultural"

    def test_distribution_excludes_zero_values(self, mock_supabase_client):
        """Test that zero values are excluded from distribution"""
        mock_table = Mock()
        mock_supabase_client.table.return_value = mock_table
        mock_select = Mock()
        mock_table.select.return_value = mock_select

        municipalities = [
            {"municipality_name": "Mun1", "total_biogas_m3_year": 100000000},
            {"municipality_name": "Mun2", "total_biogas_m3_year": 0},
            {"municipality_name": "Mun3", "total_biogas_m3_year": 150000000},
            {"municipality_name": "Mun4", "total_biogas_m3_year": 0},
        ]

        mock_select.execute.return_value = MockSupabaseResponse(municipalities)

        response = client.get("/api/v1/analysis/distribution")

        assert response.status_code == 200
        data = response.json()

        # Only 2 non-zero values
        assert data["statistics"]["count"] == 2

    def test_all_zero_values(self, mock_supabase_client):
        """Test handling when all values are zero"""
        mock_table = Mock()
        mock_supabase_client.table.return_value = mock_table
        mock_select = Mock()
        mock_table.select.return_value = mock_select

        municipalities = [
            {"municipality_name": f"Mun{i}", "total_biogas_m3_year": 0} for i in range(10)
        ]

        mock_select.execute.return_value = MockSupabaseResponse(municipalities)

        response = client.get("/api/v1/analysis/distribution")

        assert response.status_code == 200
        data = response.json()

        assert data["histogram"] == []
        assert data["statistics"] == {}

    def test_empty_database(self, mock_supabase_client):
        """Test handling of empty database"""
        mock_table = Mock()
        mock_supabase_client.table.return_value = mock_table
        mock_select = Mock()
        mock_table.select.return_value = mock_select

        mock_select.execute.return_value = MockSupabaseResponse([])

        response = client.get("/api/v1/analysis/distribution")

        assert response.status_code == 200
        data = response.json()

        assert data["histogram"] == []
        assert data["statistics"] == {}

    def test_bin_count_validation(self):
        """Test bin count parameter validation"""
        # Test minimum (5)
        response = client.get("/api/v1/analysis/distribution?bins=5")
        assert response.status_code == 200

        # Test maximum (50)
        response = client.get("/api/v1/analysis/distribution?bins=50")
        assert response.status_code == 200

        # Test below minimum (should use default or fail)
        response = client.get("/api/v1/analysis/distribution?bins=3")
        assert response.status_code == 422  # Validation error

        # Test above maximum
        response = client.get("/api/v1/analysis/distribution?bins=100")
        assert response.status_code == 422  # Validation error

"""
PILAR-2b V3 Backend - Fixed Municipality API Tests
API tests with proper host configuration for testing
"""
import pytest
from fastapi.testclient import TestClient
from fastapi import FastAPI


def create_test_app():
    """Create a FastAPI app for testing without middleware restrictions"""
    from app.api.v1.api import api_router

    test_app = FastAPI(
        title="PILAR-2b V3 API - Test",
        description="Test version without middleware restrictions",
        version="3.0.0",
    )

    # Include API routes without middleware
    test_app.include_router(api_router, prefix="/api/v1")

    return test_app


@pytest.fixture
def test_client():
    """Create a test client with proper configuration"""
    app = create_test_app()
    with TestClient(app, base_url="http://testserver") as client:
        yield client


@pytest.mark.api
class TestMunicipalitiesAPIFixed:
    """Fixed API tests for municipalities endpoints"""

    def test_municipalities_list_endpoint(self, test_client):
        """Test municipalities list endpoint works"""
        response = test_client.get("/api/v1/municipalities/")

        assert response.status_code == 200

        data = response.json()
        assert "data" in data
        assert "total" in data
        assert "limit" in data
        assert "offset" in data
        assert "has_more" in data

        # Verify structure
        assert isinstance(data["data"], list)
        assert data["total"] >= 0
        assert data["limit"] == 100
        assert data["offset"] == 0

    def test_municipalities_with_limit(self, test_client):
        """Test municipalities endpoint with limit parameter"""
        response = test_client.get("/api/v1/municipalities/?limit=1")

        assert response.status_code == 200

        data = response.json()
        assert len(data["data"]) <= 1
        assert data["limit"] == 1

    def test_municipalities_with_search(self, test_client):
        """Test municipalities search functionality"""
        response = test_client.get("/api/v1/municipalities/?search=São")

        assert response.status_code == 200

        data = response.json()
        assert isinstance(data["data"], list)

    def test_municipality_detail_endpoint(self, test_client):
        """Test individual municipality endpoint (200 with data, 404 when DB is mocked empty)"""
        response = test_client.get("/api/v1/municipalities/1")

        assert response.status_code in [200, 404]

        if response.status_code == 200:
            municipality = response.json()
            assert "id" in municipality
            assert "name" in municipality
            assert "code" in municipality
            assert "coordinates" in municipality

    def test_municipality_not_found(self, test_client):
        """Test 404 response for non-existent municipality"""
        response = test_client.get("/api/v1/municipalities/999999")

        assert response.status_code == 404

    def test_municipalities_stats_endpoint(self, test_client):
        """Test municipalities statistics endpoint"""
        response = test_client.get("/api/v1/municipalities/stats/summary")

        assert response.status_code == 200

        stats = response.json()
        assert "total_municipalities" in stats
        assert "total_population" in stats
        assert "total_biogas_m3_year" in stats  # actual field name returned by endpoint

    def test_parameter_validation(self, test_client):
        """Test parameter validation"""
        # Test invalid limit
        response = test_client.get("/api/v1/municipalities/?limit=2000")
        assert response.status_code == 422

        # Test invalid offset
        response = test_client.get("/api/v1/municipalities/?offset=-1")
        assert response.status_code == 422

    def test_response_format(self, test_client):
        """Test response format is correct JSON"""
        response = test_client.get("/api/v1/municipalities/")

        assert response.status_code == 200
        assert "application/json" in response.headers.get("content-type", "")

    def test_data_consistency(self, test_client):
        """Test data consistency between endpoints"""
        # Get list
        list_response = test_client.get("/api/v1/municipalities/")
        assert list_response.status_code == 200

        municipalities = list_response.json()["data"]

        if municipalities:
            # Get first municipality details
            first_id = municipalities[0]["id"]
            detail_response = test_client.get(f"/api/v1/municipalities/{first_id}")
            assert detail_response.status_code == 200

            individual = detail_response.json()
            assert individual["id"] == municipalities[0]["id"]

    def test_stats_accuracy(self, test_client):
        """Test statistics calculation accuracy"""
        # Get all data
        list_response = test_client.get("/api/v1/municipalities/?limit=1000")
        assert list_response.status_code == 200

        municipalities = list_response.json()["data"]

        # Get stats
        stats_response = test_client.get("/api/v1/municipalities/stats/summary")
        assert stats_response.status_code == 200

        stats = stats_response.json()

        # Verify count matches
        assert stats["total_municipalities"] == len(municipalities)


@pytest.mark.api
class TestMunicipalitiesErrorHandling:
    """Test error handling for API endpoints"""

    def test_invalid_municipality_id_format(self, test_client):
        """Test invalid ID format handling.

        Non-integer strings are treated as IBGE codes; when not found → 404.
        """
        response = test_client.get("/api/v1/municipalities/invalid")

        assert response.status_code in [404, 422]

    def test_large_search_term(self, test_client):
        """Test handling of very large search terms"""
        large_term = "x" * 1000
        response = test_client.get(f"/api/v1/municipalities/?search={large_term}")

        # Should handle gracefully
        assert response.status_code in [200, 400]

    def test_special_characters_in_search(self, test_client):
        """Test special characters in search"""
        special_terms = ["ção", "São", "!@#$"]

        for term in special_terms:
            response = test_client.get(f"/api/v1/municipalities/?search={term}")
            # Should not crash
            assert response.status_code in [200, 400]


@pytest.mark.api
@pytest.mark.slow
class TestMunicipalitiesPerformanceFixed:
    """Performance tests for API endpoints"""

    def test_list_endpoint_performance(self, test_client):
        """Test list endpoint response time"""
        import time

        start_time = time.time()
        response = test_client.get("/api/v1/municipalities/")
        elapsed = time.time() - start_time

        assert response.status_code == 200
        assert elapsed < 1.0  # Should respond within 1 second

    def test_stats_endpoint_performance(self, test_client):
        """Test stats endpoint response time"""
        import time

        start_time = time.time()
        response = test_client.get("/api/v1/municipalities/stats/summary")
        elapsed = time.time() - start_time

        assert response.status_code == 200
        assert elapsed < 0.5  # Should respond within 500ms
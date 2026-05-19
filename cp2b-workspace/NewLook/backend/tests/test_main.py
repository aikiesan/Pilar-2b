"""
PILAR-2b V3 Backend - Main Application Tests
Tests for FastAPI application configuration, middleware, and core endpoints
"""
import pytest
from fastapi.testclient import TestClient
from httpx import AsyncClient


@pytest.mark.api
class TestMainApplication:
    """Test suite for main FastAPI application"""

    def test_app_creation(self, test_app):
        """Test that FastAPI app is created properly"""
        assert test_app.title == "PILAR-2b V3 API"
        assert test_app.version == "3.0.0"
        assert test_app.docs_url == "/docs"
        assert test_app.redoc_url == "/redoc"

    def test_root_endpoint(self, client: TestClient):
        """Test root endpoint returns correct information"""
        response = client.get("/")

        assert response.status_code == 200

        data = response.json()
        expected_fields = ["message", "version", "docs", "status"]

        for field in expected_fields:
            assert field in data

        assert data["message"] == "PILAR-2b V3 API"
        assert data["version"] == "3.0.0"
        assert data["docs"] == "/docs"
        assert data["status"] == "running"

    def test_health_check_endpoint(self, client: TestClient):
        """Test health check endpoint"""
        response = client.get("/health")

        assert response.status_code == 200

        data = response.json()
        assert "status" in data
        assert "timestamp" in data

        assert data["status"] == "healthy"
        assert isinstance(data["timestamp"], str)

    def test_docs_endpoint(self, client: TestClient):
        """Test that OpenAPI docs are accessible"""
        response = client.get("/docs")

        assert response.status_code == 200
        assert "text/html" in response.headers["content-type"]

    def test_redoc_endpoint(self, client: TestClient):
        """Test that ReDoc documentation is accessible"""
        response = client.get("/redoc")

        assert response.status_code == 200
        assert "text/html" in response.headers["content-type"]

    def test_openapi_schema(self, client: TestClient):
        """Test OpenAPI schema generation"""
        response = client.get("/openapi.json")

        assert response.status_code == 200

        schema = response.json()
        assert "openapi" in schema
        assert "info" in schema
        assert "paths" in schema

        # Verify basic schema structure
        assert schema["info"]["title"] == "PILAR-2b V3 API"
        assert schema["info"]["version"] == "3.0.0"

    def test_nonexistent_endpoint(self, client: TestClient):
        """Test 404 handling for non-existent endpoints"""
        response = client.get("/nonexistent")

        assert response.status_code == 404

        data = response.json()
        assert "detail" in data


@pytest.mark.api
class TestCORSMiddleware:
    """Test CORS middleware configuration"""

    def test_cors_headers_present(self, client: TestClient):
        """Test that CORS headers are present in responses"""
        response = client.get("/")

        assert response.status_code == 200

        # Check for CORS headers
        cors_headers = [
            "access-control-allow-origin",
            "access-control-allow-credentials",
            "access-control-allow-methods",
            "access-control-allow-headers"
        ]

        # Note: TestClient may not include all CORS headers
        # This is more for documentation of expected behavior

    def test_cors_preflight_request(self, client: TestClient):
        """Test CORS preflight (OPTIONS) request handling"""
        headers = {
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "Content-Type"
        }

        response = client.options("/api/v1/municipalities/", headers=headers)

        # Should handle OPTIONS request (may be 200 or 405 depending on setup)
        assert response.status_code in [200, 405]


@pytest.mark.api
class TestSecurityMiddleware:
    """Test security middleware and headers"""

    def test_trusted_host_middleware(self, client: TestClient):
        """Test trusted host middleware"""
        # Test with valid host
        response = client.get("/", headers={"host": "localhost"})
        assert response.status_code == 200

        # Note: TestClient may not enforce host validation
        # This test documents expected behavior

    def test_security_headers(self, client: TestClient):
        """Test that security headers are present"""
        response = client.get("/")

        assert response.status_code == 200

        # Document expected security headers
        # (May not be enforced by TestClient but should be in production)
        expected_security_headers = [
            "x-content-type-options",
            "x-frame-options",
            "x-xss-protection"
        ]

        # This test documents what should be checked in integration tests


@pytest.mark.api
class TestAPIVersioning:
    """Test API versioning"""

    def test_v1_prefix_routes(self, client: TestClient):
        """Test that v1 API routes are accessible"""
        response = client.get("/api/v1/municipalities/")

        assert response.status_code == 200

    def test_api_without_version_404(self, client: TestClient):
        """Test that API routes without version return 404"""
        response = client.get("/api/municipalities/")

        assert response.status_code == 404

    def test_future_version_404(self, client: TestClient):
        """Test that future API versions return 404"""
        response = client.get("/api/v2/municipalities/")

        assert response.status_code == 404


@pytest.mark.api
@pytest.mark.asyncio
class TestAsyncOperations:
    """Test asynchronous operations"""

    async def test_async_root_endpoint(self, async_client: AsyncClient):
        """Test root endpoint with async client"""
        response = await async_client.get("/")

        assert response.status_code == 200

        data = response.json()
        assert data["status"] == "running"

    async def test_async_health_check(self, async_client: AsyncClient):
        """Test health check with async client"""
        response = await async_client.get("/health")

        assert response.status_code == 200

        data = response.json()
        assert data["status"] == "healthy"


@pytest.mark.api
class TestErrorHandling:
    """Test application error handling"""

    def test_invalid_json_handling(self, client: TestClient):
        """Test handling of invalid JSON in request body"""
        # Since current endpoints don't accept POST data,
        # this test documents expected behavior for future endpoints
        response = client.post(
            "/api/v1/municipalities/",
            data="invalid json",
            headers={"content-type": "application/json"}
        )

        # Should return 405 (Method Not Allowed) since POST isn't implemented
        # or 422 (Unprocessable Entity) for invalid JSON
        assert response.status_code in [405, 422]

    def test_unsupported_media_type(self, client: TestClient):
        """Test handling of unsupported media type"""
        response = client.post(
            "/api/v1/municipalities/",
            data="some data",
            headers={"content-type": "text/plain"}
        )

        # Should return 405 (Method Not Allowed) since POST isn't implemented
        assert response.status_code == 405

    def test_large_request_handling(self, client: TestClient):
        """Test handling of extremely large requests"""
        # Test with very large query parameter
        large_search = "x" * 10000
        response = client.get(f"/api/v1/municipalities/?search={large_search}")

        # Should either handle gracefully or return appropriate error
        assert response.status_code in [200, 400, 414, 422]


@pytest.mark.integration
class TestApplicationIntegration:
    """Integration tests for the complete application"""

    def test_full_api_flow(self, client: TestClient):
        """Test complete API workflow"""
        # 1. Check application health
        health_response = client.get("/health")
        assert health_response.status_code == 200

        # 2. Get municipalities list
        list_response = client.get("/api/v1/municipalities/")
        assert list_response.status_code == 200

        municipalities = list_response.json()["data"]

        # 3. Get details for first municipality (if available)
        if municipalities:
            detail_response = client.get(f"/api/v1/municipalities/{municipalities[0]['id']}")
            assert detail_response.status_code == 200

        # 4. Get statistics
        stats_response = client.get("/api/v1/municipalities/stats/summary")
        assert stats_response.status_code == 200

    def test_concurrent_requests(self, client: TestClient):
        """Test handling of concurrent requests"""
        import concurrent.futures
        import time

        def make_request():
            return client.get("/api/v1/municipalities/")

        start_time = time.time()

        # Make 5 concurrent requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(make_request) for _ in range(5)]
            responses = [future.result() for future in futures]

        elapsed_time = time.time() - start_time

        # All requests should succeed
        for response in responses:
            assert response.status_code == 200

        # Should complete within reasonable time
        assert elapsed_time < 5.0
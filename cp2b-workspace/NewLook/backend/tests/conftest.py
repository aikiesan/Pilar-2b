"""
PILAR-2b V3 Backend - Test Configuration
Pytest configuration and fixtures for comprehensive testing
"""
import pytest
import asyncio
import os
from typing import AsyncGenerator, Generator
from fastapi import FastAPI
from fastapi.testclient import TestClient
from unittest.mock import Mock, MagicMock
import psycopg2
from httpx import AsyncClient, ASGITransport

# Mock the database connection for tests
@pytest.fixture(autouse=True)
def mock_db_connection(monkeypatch):
    """Mock database connections for all tests"""
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_conn.cursor.return_value = mock_cursor

    def mock_get_db():
        yield mock_conn

    monkeypatch.setattr("app.core.database.get_db", mock_get_db)
    return mock_conn, mock_cursor


@pytest.fixture(autouse=True)
def mock_supabase_autouse(monkeypatch):
    """
    Auto-mock the Supabase client for all tests so endpoints never attempt
    real network calls or fail on missing credentials.

    Patches get_supabase_client at each *call site* (where it's imported)
    rather than at the source module, so tests that exercise the source
    module directly (e.g. singleton tests) are not affected.
    """
    mock_result = MagicMock()
    mock_result.data = []
    mock_result.count = 0

    mock_query = MagicMock()
    mock_query.select.return_value = mock_query
    mock_query.ilike.return_value = mock_query
    mock_query.eq.return_value = mock_query
    mock_query.range.return_value = mock_query
    mock_query.execute.return_value = mock_result

    mock_client = MagicMock()
    mock_client.table.return_value = mock_query
    mock_client.auth = MagicMock()

    mock_fn = lambda: mock_client  # noqa: E731

    # Patch at call sites so the source module stays intact.
    # Use raising=False so tests continue if the attribute was removed.
    for call_site in (
        "app.api.v1.endpoints.municipalities.get_supabase_client",
        "app.api.v1.endpoints.analysis.get_supabase_client",
        "app.services.auth_service.get_supabase_client",
    ):
        monkeypatch.setattr(call_site, mock_fn, raising=False)

    return mock_client


def create_test_app():
    """Create a FastAPI app for testing without middleware restrictions."""
    from app.api.v1.api import api_router
    from fastapi.responses import JSONResponse
    from datetime import datetime, timezone

    test_app = FastAPI(
        title="PILAR-2b V3 API",          # Match production title for schema assertions
        description="Test version without middleware restrictions",
        version="3.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # Include API routes without middleware
    test_app.include_router(api_router, prefix="/api/v1")

    # Mirror root endpoints from main.py so test_main.py tests work
    @test_app.get("/")
    async def root():
        return {
            "message": "PILAR-2b V3 API",
            "version": "3.0.0",
            "docs": "/docs",
            "status": "running",
        }

    @test_app.get("/health")
    async def health_check():
        return {
            "status": "healthy",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    return test_app

@pytest.fixture(scope="function")
def test_app() -> FastAPI:
    """Create a FastAPI app instance for testing"""
    return create_test_app()

@pytest.fixture(scope="function")
def client(test_app: FastAPI) -> Generator[TestClient, None, None]:
    """Create a TestClient for synchronous API testing"""
    with TestClient(test_app, base_url="http://testserver") as test_client:
        yield test_client

@pytest.fixture
async def async_client(test_app: FastAPI) -> AsyncGenerator[AsyncClient, None]:
    """Create an AsyncClient for async API testing.

    Uses ASGITransport explicitly to avoid httpx 0.27 + Starlette 0.45
    incompatibility that causes spurious 403 'Host not allowed' responses.
    """
    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac

@pytest.fixture
def mock_supabase_client():
    """Mock Supabase client for testing"""
    mock_client = MagicMock()
    return mock_client

@pytest.fixture
def sample_municipality():
    """Sample municipality data for testing"""
    return {
        "id": 1,
        "name": "São Paulo",
        "cod_ibge": "3550308",
        "state": "SP",
        "area_km2": 1521.11,
        "population": 12396372,
    }

@pytest.fixture
def sample_residue():
    """Sample residue data for testing"""
    return {
        "id": 1,
        "name": "Vinhaça",
        "category": "agroindustrial",
        "biogas_potential": 25.5,
    }

@pytest.fixture
def sample_user():
    """Sample user data for testing"""
    return {
        "id": "test-user-id",
        "email": "test@example.com",
        "full_name": "Test User",
        "role": "autenticado",
    }

@pytest.fixture
def auth_headers():
    """Authentication headers for testing"""
    return {
        "Authorization": "Bearer mock-jwt-token"
    }

@pytest.fixture
def mock_jwt_decode(monkeypatch):
    """Mock JWT token decoding.

    python-jose was removed (unmaintained, unfixed CVEs). Auth is delegated to
    Supabase via supabase.auth.get_user(), so patch that instead if needed.
    This fixture is kept as a no-op for backward compatibility with any test
    that requests it by name.
    """
    pass  # no-op: jose is no longer a dependency

# Database test fixtures
@pytest.fixture
def db_connection():
    """
    Real database connection for integration tests
    Use this sparingly and mark tests with @pytest.mark.database
    """
    # Only create real connection if DATABASE_URL is set for integration tests
    if not os.getenv("TEST_DATABASE_URL"):
        pytest.skip("Integration tests require TEST_DATABASE_URL")

    conn = psycopg2.connect(os.getenv("TEST_DATABASE_URL"))
    yield conn
    conn.close()

@pytest.fixture
def db_transaction(db_connection):
    """
    Database transaction that rolls back after test
    """
    db_connection.autocommit = False
    cursor = db_connection.cursor()
    yield cursor
    db_connection.rollback()
    cursor.close()

# Advanced testing fixtures
class TestSettings:
    """Test configuration settings"""
    DEBUG = True
    TESTING = True
    DATABASE_URL = "sqlite:///:memory:"
    SECRET_KEY = "test-secret-key-do-not-use-in-production"

@pytest.fixture
def test_settings() -> TestSettings:
    """Test application settings"""
    return TestSettings()

# Event loop fixture for async tests
@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

# Markers for test categorization
pytest.mark.unit = pytest.mark.unit
pytest.mark.integration = pytest.mark.integration
pytest.mark.api = pytest.mark.api
pytest.mark.slow = pytest.mark.slow
pytest.mark.auth = pytest.mark.auth
pytest.mark.database = pytest.mark.database
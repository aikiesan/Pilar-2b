"""
PILAR-2b V3 Backend - Basic Tests
Simple tests to verify the test infrastructure is working
"""
import pytest
from fastapi.testclient import TestClient

def test_import_app():
    """Test that the app can be imported"""
    from app.main import app
    assert app is not None
    assert app.title == "PILAR-2b V3 API"

def test_basic_test_framework():
    """Test that pytest is working"""
    assert True

def test_basic_math():
    """Test basic math for test framework validation"""
    assert 1 + 1 == 2
    assert 2 * 3 == 6

@pytest.mark.unit
def test_app_instance():
    """Test FastAPI app instance creation"""
    from app.main import app

    # Check app properties
    assert hasattr(app, 'title')
    assert hasattr(app, 'version')
    assert app.title == "PILAR-2b V3 API"
    assert app.version == "3.0.0"
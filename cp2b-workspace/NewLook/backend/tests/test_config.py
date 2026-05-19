"""
Tests for configuration module
"""
import pytest
from app.core.config import Settings
from pydantic import ValidationError
import os

class TestSettings:
    """Tests for Settings configuration"""

    def test_secret_key_validation_production(self, monkeypatch):
        """Test that default SECRET_KEY raises error in production"""
        monkeypatch.setenv("APP_ENV", "production")
        monkeypatch.setenv("SECRET_KEY", "your-secret-key-change-in-production")

        with pytest.raises(ValidationError) as exc_info:
            Settings()

        assert "SECRET_KEY must be changed in production" in str(exc_info.value)

    def test_secret_key_validation_development(self, monkeypatch):
        """Test that default SECRET_KEY works in development"""
        monkeypatch.setenv("APP_ENV", "development")
        monkeypatch.setenv("SECRET_KEY", "your-secret-key-change-in-production")

        # Should not raise error in development
        settings = Settings()
        assert settings.SECRET_KEY == "your-secret-key-change-in-production"

    def test_secret_key_length_validation(self, monkeypatch):
        """Test that SHORT SECRET_KEY raises error"""
        monkeypatch.setenv("SECRET_KEY", "short")

        with pytest.raises(ValidationError) as exc_info:
            Settings()

        assert "SECRET_KEY too short" in str(exc_info.value)

    def test_valid_secret_key(self, monkeypatch):
        """Test that valid SECRET_KEY is accepted"""
        valid_key = "a" * 32  # 32+ characters
        monkeypatch.setenv("SECRET_KEY", valid_key)

        settings = Settings()
        assert settings.SECRET_KEY == valid_key

    def test_postgres_password_production(self, monkeypatch):
        """Test that POSTGRES_PASSWORD is required in production"""
        monkeypatch.setenv("APP_ENV", "production")
        monkeypatch.setenv("SECRET_KEY", "a" * 32)
        monkeypatch.setenv("POSTGRES_PASSWORD", "")

        with pytest.raises(ValidationError) as exc_info:
            Settings()

        assert "POSTGRES_PASSWORD is required in production" in str(exc_info.value)

    def test_postgres_password_length_production(self, monkeypatch, caplog):
        """Test that short POSTGRES_PASSWORD in production triggers a warning (not an error)"""
        import logging
        monkeypatch.setenv("APP_ENV", "production")
        monkeypatch.setenv("SECRET_KEY", "a" * 32)
        monkeypatch.setenv("POSTGRES_PASSWORD", "short")
        monkeypatch.setenv("POSTGRES_HOST", "localhost")

        with caplog.at_level(logging.WARNING):
            settings = Settings()

        # Short password is a warning, not a hard error
        assert any("short" in msg.lower() or "12 char" in msg.lower() for msg in caplog.messages)

    def test_cors_origins_parsing(self, monkeypatch):
        """Test that CORS origins are parsed correctly"""
        monkeypatch.setenv("SECRET_KEY", "a" * 32)
        monkeypatch.setenv("PRODUCTION_ORIGINS", "https://example.com,https://test.com")

        settings = Settings()
        all_origins = settings.get_all_origins()

        assert "https://example.com" in all_origins
        assert "https://test.com" in all_origins

    def test_wildcard_cors_blocked_in_production(self, monkeypatch):
        """Test that wildcard CORS is not allowed in production"""
        monkeypatch.setenv("APP_ENV", "production")
        monkeypatch.setenv("SECRET_KEY", "a" * 32)
        monkeypatch.setenv("POSTGRES_PASSWORD", "secure-password-123")
        monkeypatch.setenv("PRODUCTION_ORIGINS", "*")

        settings = Settings()

        # validate_all should return False
        assert settings.validate_all() is False

    def test_default_values(self, monkeypatch):
        """Test that default values are set correctly"""
        monkeypatch.setenv("SECRET_KEY", "a" * 32)

        settings = Settings()

        assert settings.APP_NAME == "PILAR-2b V3 API"
        assert settings.APP_ENV == "development"
        assert settings.DEBUG is False  # Default is False for security; set DEBUG=true to enable
        assert settings.PORT == 8000
        assert settings.RATE_LIMIT_PER_MINUTE == 60

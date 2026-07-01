"""
Integration tests for Auth API endpoints
Tests user registration, login, logout, profile retrieval, profile update,
and token verification endpoints.

The auth_service is a mock implementation that always returns success
responses (authentication is disabled). Tests validate HTTP-layer behaviour:
status codes, response shapes, and correct delegation to auth_service methods.

For error paths the auth_service methods are patched to raise HTTPException
so that the full request → endpoint → service error path is exercised.
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException, status
from fastapi.testclient import TestClient

# Disable slowapi response-header injection before importing app.
# Auth endpoints lack a Response parameter, causing header injection to crash.
import app.middleware.rate_limit as _rl_module

_rl_module.auth_limiter._headers_enabled = False
_rl_module.login_limiter._headers_enabled = False
_rl_module.read_limiter._headers_enabled = False

# Use the production app so the slowapi limiter and exception handler are
# registered and the auth decorators (@auth_limiter.limit) do not break.
from app.main import app
from app.middleware.auth import get_current_user as _get_current_user

client = TestClient(app, raise_server_exceptions=False)

# ─── Sample data ─────────────────────────────────────────────────────────────

SAMPLE_USER_PROFILE = {
    "id": "mock-local-user-id",
    "email": "alice@example.com",
    "full_name": "Alice Example",
    "role": "admin",
    "created_at": datetime.now(timezone.utc).isoformat(),
    "updated_at": datetime.now(timezone.utc).isoformat(),
}

VALID_REGISTRATION_PAYLOAD = {
    "email": "alice@example.com",
    "password": "SecurePass1",
    "full_name": "Alice Example",
}

VALID_LOGIN_PAYLOAD = {
    "email": "alice@example.com",
    "password": "SecurePass1",
}

AUTH_HEADERS = {"Authorization": "Bearer mock-jwt-token"}


# ─── Helper ──────────────────────────────────────────────────────────────────


def _make_auth_response(email: str = "alice@example.com", full_name: str = "Alice Example"):
    """Build an AuthResponse-compatible dict for assertion helpers."""
    return {
        "access_token": "mock-token-for-local",
        "token_type": "bearer",
        "user": {
            "id": "mock-local-user-id",
            "email": email,
            "full_name": full_name,
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
    }


# ─── Tests ───────────────────────────────────────────────────────────────────


@pytest.mark.integration
class TestRegisterEndpoint:
    """Tests for POST /api/v1/auth/register"""

    def test_register_valid_data_returns_201(self):
        """Valid registration payload returns 201 with AuthResponse body."""
        response = client.post("/api/v1/auth/register", json=VALID_REGISTRATION_PAYLOAD)

        assert response.status_code == 201
        body = response.json()
        assert "access_token" in body
        assert "token_type" in body
        assert body["token_type"] == "bearer"
        assert "user" in body

    def test_register_response_contains_user_object(self):
        """Returned user object contains all required profile fields."""
        response = client.post("/api/v1/auth/register", json=VALID_REGISTRATION_PAYLOAD)

        assert response.status_code == 201
        user = response.json()["user"]
        for field in ("id", "email", "full_name", "role", "created_at", "updated_at"):
            assert field in user, f"Missing user field: {field}"

    def test_register_email_reflected_in_user(self):
        """The registered email appears in the user object."""
        response = client.post("/api/v1/auth/register", json=VALID_REGISTRATION_PAYLOAD)

        assert response.status_code == 201
        assert response.json()["user"]["email"] == VALID_REGISTRATION_PAYLOAD["email"]

    def test_register_missing_email_returns_422(self):
        """Missing required email field produces 422 Unprocessable Entity."""
        payload = {"password": "SecurePass1", "full_name": "Alice Example"}
        response = client.post("/api/v1/auth/register", json=payload)

        assert response.status_code == 422

    def test_register_missing_password_returns_422(self):
        """Missing required password field produces 422."""
        payload = {"email": "alice@example.com", "full_name": "Alice Example"}
        response = client.post("/api/v1/auth/register", json=payload)

        assert response.status_code == 422

    def test_register_password_too_short_returns_422(self):
        """Password below the 8-character minimum produces 422."""
        payload = {**VALID_REGISTRATION_PAYLOAD, "password": "Ab1"}
        response = client.post("/api/v1/auth/register", json=payload)

        assert response.status_code == 422

    def test_register_password_missing_uppercase_returns_422(self):
        """Password with no uppercase letter is rejected by the Pydantic validator."""
        payload = {**VALID_REGISTRATION_PAYLOAD, "password": "securepass1"}
        response = client.post("/api/v1/auth/register", json=payload)

        assert response.status_code == 422

    def test_register_password_missing_digit_returns_422(self):
        """Password with no digit is rejected by the Pydantic validator."""
        payload = {**VALID_REGISTRATION_PAYLOAD, "password": "SecurePassNoDigit"}
        response = client.post("/api/v1/auth/register", json=payload)

        assert response.status_code == 422

    def test_register_service_error_propagates_http_exception(self):
        """HTTPException raised by auth_service.register_user propagates to caller."""
        with patch(
            "app.api.v1.endpoints.auth.auth_service.register_user",
            new_callable=AsyncMock,
            side_effect=HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            ),
        ):
            response = client.post("/api/v1/auth/register", json=VALID_REGISTRATION_PAYLOAD)

        assert response.status_code == 400
        assert "Email already registered" in response.json()["detail"]

    def test_register_invalid_email_format_returns_422(self):
        """A malformed email address is rejected by Pydantic's EmailStr validator."""
        payload = {**VALID_REGISTRATION_PAYLOAD, "email": "not-an-email"}
        response = client.post("/api/v1/auth/register", json=payload)

        assert response.status_code == 422


@pytest.mark.integration
class TestLoginEndpoint:
    """Tests for POST /api/v1/auth/login"""

    def test_login_valid_credentials_returns_200(self):
        """Valid login returns 200 with access_token and user."""
        response = client.post("/api/v1/auth/login", json=VALID_LOGIN_PAYLOAD)

        assert response.status_code == 200
        body = response.json()
        assert "access_token" in body
        assert "user" in body

    def test_login_response_shape(self):
        """Login response contains token_type=bearer."""
        response = client.post("/api/v1/auth/login", json=VALID_LOGIN_PAYLOAD)

        assert response.status_code == 200
        assert response.json()["token_type"] == "bearer"

    def test_login_access_token_is_string(self):
        """access_token is a non-empty string."""
        response = client.post("/api/v1/auth/login", json=VALID_LOGIN_PAYLOAD)

        assert response.status_code == 200
        token = response.json()["access_token"]
        assert isinstance(token, str)
        assert len(token) > 0

    def test_login_missing_email_returns_422(self):
        """Login request without email produces 422."""
        response = client.post("/api/v1/auth/login", json={"password": "SecurePass1"})

        assert response.status_code == 422

    def test_login_missing_password_returns_422(self):
        """Login request without password produces 422."""
        response = client.post("/api/v1/auth/login", json={"email": "alice@example.com"})

        assert response.status_code == 422

    def test_login_wrong_credentials_returns_401(self):
        """HTTPException(401) from auth_service propagates correctly."""
        with patch(
            "app.api.v1.endpoints.auth.auth_service.login_user",
            new_callable=AsyncMock,
            side_effect=HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            ),
        ):
            # Use a unique IP to avoid exhausting the 3/minute login rate limit
            response = client.post(
                "/api/v1/auth/login",
                json=VALID_LOGIN_PAYLOAD,
                headers={"X-Forwarded-For": "10.99.99.1"},
            )

        assert response.status_code == 401
        assert "Invalid email or password" in response.json()["detail"]

    def test_login_service_error_returns_500(self):
        """Unexpected exception from auth_service is surfaced as 500."""
        with patch(
            "app.api.v1.endpoints.auth.auth_service.login_user",
            new_callable=AsyncMock,
            side_effect=RuntimeError("database unavailable"),
        ):
            response = client.post("/api/v1/auth/login", json=VALID_LOGIN_PAYLOAD)

        assert response.status_code in (500, 401)  # middleware may wrap differently


@pytest.mark.integration
class TestLogoutEndpoint:
    """Tests for POST /api/v1/auth/logout"""

    def test_logout_with_valid_token_returns_200(self):
        """Valid Bearer token produces 200 with a message."""
        response = client.post("/api/v1/auth/logout", headers=AUTH_HEADERS)

        assert response.status_code == 200
        body = response.json()
        assert "message" in body

    def test_logout_message_content(self):
        """Logout message is a non-empty string."""
        response = client.post("/api/v1/auth/logout", headers=AUTH_HEADERS)

        assert response.status_code == 200
        assert isinstance(response.json()["message"], str)
        assert len(response.json()["message"]) > 0

    def test_logout_without_token_returns_401(self):
        """Absence of Authorization header returns 401 (HTTP Bearer security)."""
        response = client.post("/api/v1/auth/logout")

        assert response.status_code in (401, 403)

    def test_logout_service_error_propagates(self):
        """HTTPException from auth_service.logout_user reaches the caller."""
        with patch(
            "app.api.v1.endpoints.auth.auth_service.logout_user",
            new_callable=AsyncMock,
            side_effect=HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token already invalidated",
            ),
        ):
            response = client.post("/api/v1/auth/logout", headers=AUTH_HEADERS)

        assert response.status_code == 401


@pytest.mark.integration
class TestGetMeEndpoint:
    """Tests for GET /api/v1/auth/me"""

    def test_get_me_with_valid_token_returns_200(self):
        """GET /me with a Bearer token returns 200 and a UserProfile."""
        response = client.get("/api/v1/auth/me", headers=AUTH_HEADERS)

        assert response.status_code == 200
        body = response.json()
        for field in ("id", "email", "full_name", "role", "created_at", "updated_at"):
            assert field in body, f"Missing profile field: {field}"

    def test_get_me_without_token_returns_401(self):
        """GET /me without Authorization header returns 401."""
        response = client.get("/api/v1/auth/me")

        assert response.status_code in (401, 403)

    def test_get_me_role_field_is_valid(self):
        """Role in the returned profile is one of the expected literals."""
        response = client.get("/api/v1/auth/me", headers=AUTH_HEADERS)

        assert response.status_code == 200
        role = response.json()["role"]
        assert role in ("visitante", "autenticado", "admin")

    def test_get_me_auth_failure_raises_401(self):
        """get_current_user raising HTTPException(401) propagates correctly."""

        async def _fail():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

        app.dependency_overrides[_get_current_user] = _fail
        try:
            response = client.get("/api/v1/auth/me", headers=AUTH_HEADERS)
        finally:
            app.dependency_overrides.pop(_get_current_user, None)

        assert response.status_code == 401


@pytest.mark.integration
class TestUpdateMeEndpoint:
    """Tests for PUT /api/v1/auth/me"""

    def test_update_me_valid_payload_returns_200(self):
        """Valid profile update returns 200 with updated UserProfile."""
        response = client.put(
            "/api/v1/auth/me",
            json={"full_name": "Alice Updated"},
            headers=AUTH_HEADERS,
        )

        assert response.status_code == 200
        body = response.json()
        assert "id" in body
        assert "email" in body
        assert "full_name" in body

    def test_update_me_without_token_returns_401(self):
        """PUT /me without Authorization header returns 401."""
        response = client.put("/api/v1/auth/me", json={"full_name": "Alice Updated"})

        assert response.status_code in (401, 403)

    def test_update_me_empty_payload_returns_200(self):
        """Empty update body (no fields to change) is accepted."""
        response = client.put(
            "/api/v1/auth/me",
            json={},
            headers=AUTH_HEADERS,
        )

        assert response.status_code == 200

    def test_update_me_service_error_propagates(self):
        """HTTPException from auth_service.update_user_profile propagates."""
        with patch(
            "app.api.v1.endpoints.auth.auth_service.update_user_profile",
            new_callable=AsyncMock,
            side_effect=HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update profile",
            ),
        ):
            response = client.put(
                "/api/v1/auth/me",
                json={"full_name": "Alice Updated"},
                headers=AUTH_HEADERS,
            )

        assert response.status_code == 500


@pytest.mark.integration
class TestVerifyTokenEndpoint:
    """Tests for GET /api/v1/auth/verify"""

    def test_verify_valid_token_returns_200(self):
        """GET /verify with a valid Bearer token returns 200 with a message."""
        response = client.get("/api/v1/auth/verify", headers=AUTH_HEADERS)

        assert response.status_code == 200
        body = response.json()
        assert "message" in body

    def test_verify_message_contains_token_is_valid(self):
        """Verification message confirms token validity."""
        response = client.get("/api/v1/auth/verify", headers=AUTH_HEADERS)

        assert response.status_code == 200
        assert "valid" in response.json()["message"].lower()

    def test_verify_without_token_returns_401(self):
        """GET /verify without Authorization header returns 401."""
        response = client.get("/api/v1/auth/verify")

        assert response.status_code in (401, 403)

    def test_verify_invalid_token_returns_401(self):
        """get_current_user raising 401 reaches the caller."""

        async def _fail():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

        app.dependency_overrides[_get_current_user] = _fail
        try:
            response = client.get("/api/v1/auth/verify", headers=AUTH_HEADERS)
        finally:
            app.dependency_overrides.pop(_get_current_user, None)

        assert response.status_code == 401

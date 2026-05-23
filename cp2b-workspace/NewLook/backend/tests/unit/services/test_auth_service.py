"""
Unit tests for AuthService — the mock implementation used while
production authentication (Supabase) is disabled.

AuthService is a simple pass-through that always succeeds, so tests
verify the response contracts rather than auth logic.
"""
import pytest
from datetime import datetime

from app.services.auth_service import AuthService
from app.models.auth import (
    UserRegistration,
    UserLogin,
    UserProfile,
    AuthResponse,
    UpdateProfile,
)


@pytest.fixture
def auth_service():
    return AuthService()


@pytest.fixture
def sample_registration():
    return UserRegistration(
        email="test@example.com",
        password="SecurePassword123!",
        full_name="Test User",
    )


@pytest.fixture
def sample_login():
    return UserLogin(
        email="test@example.com",
        password="SecurePassword123!",
    )


@pytest.mark.unit
class TestRegisterUser:

    @pytest.mark.asyncio
    async def test_register_returns_auth_response(self, auth_service, sample_registration):
        result = await auth_service.register_user(sample_registration)
        assert isinstance(result, AuthResponse)

    @pytest.mark.asyncio
    async def test_register_returns_access_token(self, auth_service, sample_registration):
        result = await auth_service.register_user(sample_registration)
        assert result.access_token
        assert isinstance(result.access_token, str)

    @pytest.mark.asyncio
    async def test_register_token_type_is_bearer(self, auth_service, sample_registration):
        result = await auth_service.register_user(sample_registration)
        assert result.token_type == "bearer"

    @pytest.mark.asyncio
    async def test_register_user_profile_contains_email(self, auth_service, sample_registration):
        result = await auth_service.register_user(sample_registration)
        assert result.user.email == sample_registration.email

    @pytest.mark.asyncio
    async def test_register_user_profile_contains_full_name(self, auth_service, sample_registration):
        result = await auth_service.register_user(sample_registration)
        assert result.user.full_name == sample_registration.full_name

    @pytest.mark.asyncio
    async def test_register_user_has_id(self, auth_service, sample_registration):
        result = await auth_service.register_user(sample_registration)
        assert result.user.id
        assert isinstance(result.user.id, str)

    @pytest.mark.asyncio
    async def test_register_user_has_role(self, auth_service, sample_registration):
        result = await auth_service.register_user(sample_registration)
        assert result.user.role in ("admin", "autenticado", "visitante")


@pytest.mark.unit
class TestLoginUser:

    @pytest.mark.asyncio
    async def test_login_returns_auth_response(self, auth_service, sample_login):
        result = await auth_service.login_user(sample_login)
        assert isinstance(result, AuthResponse)

    @pytest.mark.asyncio
    async def test_login_returns_access_token(self, auth_service, sample_login):
        result = await auth_service.login_user(sample_login)
        assert result.access_token
        assert isinstance(result.access_token, str)

    @pytest.mark.asyncio
    async def test_login_token_type_is_bearer(self, auth_service, sample_login):
        result = await auth_service.login_user(sample_login)
        assert result.token_type == "bearer"

    @pytest.mark.asyncio
    async def test_login_user_profile_has_email(self, auth_service, sample_login):
        result = await auth_service.login_user(sample_login)
        assert result.user.email == sample_login.email

    @pytest.mark.asyncio
    async def test_login_returns_user_profile_instance(self, auth_service, sample_login):
        result = await auth_service.login_user(sample_login)
        assert isinstance(result.user, UserProfile)


@pytest.mark.unit
class TestLogoutUser:

    @pytest.mark.asyncio
    async def test_logout_returns_dict(self, auth_service):
        result = await auth_service.logout_user("any-token")
        assert isinstance(result, dict)

    @pytest.mark.asyncio
    async def test_logout_returns_message(self, auth_service):
        result = await auth_service.logout_user("any-token")
        assert "message" in result

    @pytest.mark.asyncio
    async def test_logout_accepts_any_token(self, auth_service):
        """Mock auth always succeeds regardless of token value."""
        result = await auth_service.logout_user("totally-invalid-token-xyz")
        assert "message" in result


@pytest.mark.unit
class TestGetCurrentUser:

    @pytest.mark.asyncio
    async def test_get_current_user_returns_profile(self, auth_service):
        result = await auth_service.get_current_user("any-token")
        assert isinstance(result, UserProfile)

    @pytest.mark.asyncio
    async def test_get_current_user_has_id(self, auth_service):
        result = await auth_service.get_current_user("any-token")
        assert result.id

    @pytest.mark.asyncio
    async def test_get_current_user_has_email(self, auth_service):
        result = await auth_service.get_current_user("any-token")
        assert result.email
        assert "@" in result.email

    @pytest.mark.asyncio
    async def test_get_current_user_has_role(self, auth_service):
        result = await auth_service.get_current_user("any-token")
        assert result.role in ("admin", "autenticado", "visitante")

    @pytest.mark.asyncio
    async def test_get_current_user_timestamps(self, auth_service):
        result = await auth_service.get_current_user("any-token")
        assert isinstance(result.created_at, datetime)
        assert isinstance(result.updated_at, datetime)


@pytest.mark.unit
class TestUpdateUserProfile:

    @pytest.mark.asyncio
    async def test_update_profile_returns_user_profile(self, auth_service):
        update = UpdateProfile(full_name="Updated Name")
        result = await auth_service.update_user_profile("any-token", update)
        assert isinstance(result, UserProfile)

    @pytest.mark.asyncio
    async def test_update_profile_applies_full_name(self, auth_service):
        new_name = "Updated Name"
        update = UpdateProfile(full_name=new_name)
        result = await auth_service.update_user_profile("any-token", update)
        assert result.full_name == new_name

    @pytest.mark.asyncio
    async def test_update_profile_empty_name_uses_default(self, auth_service):
        update = UpdateProfile(full_name=None)
        result = await auth_service.update_user_profile("any-token", update)
        assert result.full_name  # some default name

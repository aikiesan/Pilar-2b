"""
Tests for Authentication Service
Tests user registration, login, logout, and profile management
"""

import pytest
from unittest.mock import Mock, MagicMock, patch, AsyncMock
from datetime import datetime
from fastapi import HTTPException, status

from app.services.auth_service import AuthService
from app.models.auth import (
    UserRegistration,
    UserLogin,
    UserProfile,
    AuthResponse,
    UpdateProfile,
)


class TestAuthService:
    """Test AuthService class"""

    @pytest.fixture
    def auth_service(self):
        """Create AuthService instance for testing"""
        return AuthService()

    @pytest.fixture
    def mock_supabase(self):
        """Create mock Supabase client"""
        mock = Mock()

        # Mock auth methods
        mock.auth = Mock()
        mock.auth.sign_up = Mock()
        mock.auth.sign_in_with_password = Mock()
        mock.auth.sign_out = Mock()
        mock.auth.get_user = Mock()

        # Mock table methods
        mock.table = Mock()

        return mock

    @pytest.fixture
    def sample_user_registration(self):
        """Sample user registration data"""
        return UserRegistration(
            email="test@example.com",
            password="SecurePassword123!",
            full_name="Test User",
        )

    @pytest.fixture
    def sample_user_login(self):
        """Sample user login data"""
        return UserLogin(
            email="test@example.com",
            password="SecurePassword123!",
        )

    @pytest.fixture
    def sample_user_profile(self):
        """Sample user profile data"""
        return {
            "id": "user-123",
            "full_name": "Test User",
            "role": "autenticado",  # must be one of: visitante, autenticado, admin
            "created_at": "2024-01-01T00:00:00+00:00",
            "updated_at": "2024-01-01T00:00:00+00:00",
        }

    @pytest.mark.asyncio
    async def test_register_user_success(
        self, auth_service, mock_supabase, sample_user_registration, sample_user_profile
    ):
        """Test successful user registration"""
        # Setup mock responses
        mock_auth_response = Mock()
        mock_auth_response.user = Mock()
        mock_auth_response.user.id = "user-123"
        mock_auth_response.user.email = "test@example.com"
        mock_auth_response.session = Mock()
        mock_auth_response.session.access_token = "test-access-token"

        mock_supabase.auth.sign_up.return_value = mock_auth_response

        mock_profile_response = Mock()
        mock_profile_response.data = [sample_user_profile]

        mock_table = Mock()
        mock_table.select.return_value = mock_table
        mock_table.eq.return_value = mock_table
        mock_table.execute.return_value = mock_profile_response
        mock_supabase.table.return_value = mock_table

        # Inject mock
        auth_service._supabase = mock_supabase

        # Execute
        result = await auth_service.register_user(sample_user_registration)

        # Verify
        assert isinstance(result, AuthResponse)
        assert result.access_token == "test-access-token"
        assert result.token_type == "bearer"
        assert result.user.email == "test@example.com"
        assert result.user.full_name == "Test User"
        assert result.user.role == "autenticado"

        # Verify Supabase calls
        mock_supabase.auth.sign_up.assert_called_once()
        call_args = mock_supabase.auth.sign_up.call_args[0][0]
        assert call_args["email"] == "test@example.com"
        assert call_args["password"] == "SecurePassword123!"

    @pytest.mark.asyncio
    async def test_register_user_no_user_created(
        self, auth_service, mock_supabase, sample_user_registration
    ):
        """Test registration fails when user creation fails"""
        # Setup mock to return no user
        mock_auth_response = Mock()
        mock_auth_response.user = None
        mock_supabase.auth.sign_up.return_value = mock_auth_response

        auth_service._supabase = mock_supabase

        # Execute and verify
        with pytest.raises(HTTPException) as exc_info:
            await auth_service.register_user(sample_user_registration)

        assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST
        assert "Failed to create user account" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_register_user_no_profile_created(
        self, auth_service, mock_supabase, sample_user_registration
    ):
        """Test registration fails when profile creation fails"""
        # Setup mock user creation success
        mock_auth_response = Mock()
        mock_auth_response.user = Mock()
        mock_auth_response.user.id = "user-123"
        mock_supabase.auth.sign_up.return_value = mock_auth_response

        # Setup mock profile creation failure
        mock_profile_response = Mock()
        mock_profile_response.data = []

        mock_table = Mock()
        mock_table.select.return_value = mock_table
        mock_table.eq.return_value = mock_table
        mock_table.execute.return_value = mock_profile_response
        mock_supabase.table.return_value = mock_table

        auth_service._supabase = mock_supabase

        # Execute and verify
        with pytest.raises(HTTPException) as exc_info:
            await auth_service.register_user(sample_user_registration)

        assert exc_info.value.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert "Failed to create user profile" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_login_user_success(
        self, auth_service, mock_supabase, sample_user_login, sample_user_profile
    ):
        """Test successful user login"""
        # Setup mock responses
        mock_auth_response = Mock()
        mock_auth_response.user = Mock()
        mock_auth_response.user.id = "user-123"
        mock_auth_response.user.email = "test@example.com"
        mock_auth_response.session = Mock()
        mock_auth_response.session.access_token = "test-access-token"

        mock_supabase.auth.sign_in_with_password.return_value = mock_auth_response

        mock_profile_response = Mock()
        mock_profile_response.data = [sample_user_profile]

        mock_table = Mock()
        mock_table.select.return_value = mock_table
        mock_table.eq.return_value = mock_table
        mock_table.execute.return_value = mock_profile_response
        mock_supabase.table.return_value = mock_table

        auth_service._supabase = mock_supabase

        # Execute
        result = await auth_service.login_user(sample_user_login)

        # Verify
        assert isinstance(result, AuthResponse)
        assert result.access_token == "test-access-token"
        assert result.user.email == "test@example.com"

        # Verify Supabase calls
        mock_supabase.auth.sign_in_with_password.assert_called_once()
        call_args = mock_supabase.auth.sign_in_with_password.call_args[0][0]
        assert call_args["email"] == "test@example.com"
        assert call_args["password"] == "SecurePassword123!"

    @pytest.mark.asyncio
    async def test_login_user_invalid_credentials(
        self, auth_service, mock_supabase, sample_user_login
    ):
        """Test login fails with invalid credentials"""
        # Setup mock to return no user
        mock_auth_response = Mock()
        mock_auth_response.user = None
        mock_auth_response.session = None
        mock_supabase.auth.sign_in_with_password.return_value = mock_auth_response

        auth_service._supabase = mock_supabase

        # Execute and verify
        with pytest.raises(HTTPException) as exc_info:
            await auth_service.login_user(sample_user_login)

        assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
        assert "Invalid email or password" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_login_user_no_profile(
        self, auth_service, mock_supabase, sample_user_login
    ):
        """Test login fails when profile not found"""
        # Setup mock auth success
        mock_auth_response = Mock()
        mock_auth_response.user = Mock()
        mock_auth_response.user.id = "user-123"
        mock_auth_response.session = Mock()
        mock_supabase.auth.sign_in_with_password.return_value = mock_auth_response

        # Setup mock profile not found
        mock_profile_response = Mock()
        mock_profile_response.data = []

        mock_table = Mock()
        mock_table.select.return_value = mock_table
        mock_table.eq.return_value = mock_table
        mock_table.execute.return_value = mock_profile_response
        mock_supabase.table.return_value = mock_table

        auth_service._supabase = mock_supabase

        # Execute and verify
        with pytest.raises(HTTPException) as exc_info:
            await auth_service.login_user(sample_user_login)

        assert exc_info.value.status_code == status.HTTP_404_NOT_FOUND
        assert "User profile not found" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_logout_user_success(self, auth_service, mock_supabase):
        """Test successful user logout"""
        auth_service._supabase = mock_supabase

        # Execute
        result = await auth_service.logout_user("test-token")

        # Verify
        assert result["message"] == "Logout successful"
        mock_supabase.auth.sign_out.assert_called_once()

    @pytest.mark.asyncio
    async def test_logout_user_handles_errors(self, auth_service, mock_supabase):
        """Test logout handles errors gracefully"""
        mock_supabase.auth.sign_out.side_effect = Exception("Logout error")
        auth_service._supabase = mock_supabase

        # Execute - should not raise
        result = await auth_service.logout_user("test-token")

        # Verify - still returns success
        assert result["message"] == "Logout successful"

    @pytest.mark.asyncio
    async def test_get_current_user_success(
        self, auth_service, mock_supabase, sample_user_profile
    ):
        """Test getting current user profile"""
        # Setup mock user response
        mock_user_response = Mock()
        mock_user_response.user = Mock()
        mock_user_response.user.id = "user-123"
        mock_user_response.user.email = "test@example.com"
        mock_supabase.auth.get_user.return_value = mock_user_response

        # Setup mock profile response
        mock_profile_response = Mock()
        mock_profile_response.data = [sample_user_profile]

        mock_table = Mock()
        mock_table.select.return_value = mock_table
        mock_table.eq.return_value = mock_table
        mock_table.execute.return_value = mock_profile_response
        mock_supabase.table.return_value = mock_table

        auth_service._supabase = mock_supabase

        # Execute
        result = await auth_service.get_current_user("test-token")

        # Verify
        assert isinstance(result, UserProfile)
        assert result.id == "user-123"
        assert result.email == "test@example.com"
        assert result.full_name == "Test User"
        assert result.role == "autenticado"

        mock_supabase.auth.get_user.assert_called_once_with("test-token")

    @pytest.mark.asyncio
    async def test_get_current_user_invalid_token(self, auth_service, mock_supabase):
        """Test get current user fails with invalid token"""
        # Setup mock to return no user
        mock_user_response = Mock()
        mock_user_response.user = None
        mock_supabase.auth.get_user.return_value = mock_user_response

        auth_service._supabase = mock_supabase

        # Execute and verify
        with pytest.raises(HTTPException) as exc_info:
            await auth_service.get_current_user("invalid-token")

        assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
        assert "Invalid or expired token" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_update_user_profile_success(
        self, auth_service, mock_supabase, sample_user_profile
    ):
        """Test successful profile update"""
        # Setup mock current user
        mock_user_response = Mock()
        mock_user_response.user = Mock()
        mock_user_response.user.id = "user-123"
        mock_user_response.user.email = "test@example.com"
        mock_supabase.auth.get_user.return_value = mock_user_response

        # Setup mock profile responses
        mock_profile_response = Mock()
        mock_profile_response.data = [sample_user_profile]

        updated_profile = sample_user_profile.copy()
        updated_profile["full_name"] = "Updated Name"
        mock_updated_response = Mock()
        mock_updated_response.data = [updated_profile]

        # Create mock table chain
        mock_table = Mock()
        mock_select = Mock()
        mock_eq = Mock()
        mock_update = Mock()
        mock_update_eq = Mock()

        # Setup select chain for get_current_user calls
        mock_table.select.return_value = mock_select
        mock_select.eq.return_value = mock_eq
        mock_eq.execute.side_effect = [mock_profile_response, mock_updated_response]

        # Setup update chain
        mock_table.update.return_value = mock_update
        mock_update.eq.return_value = mock_update_eq
        mock_update_eq.execute.return_value = mock_updated_response

        mock_supabase.table.return_value = mock_table
        auth_service._supabase = mock_supabase

        # Execute
        update_data = UpdateProfile(full_name="Updated Name")
        result = await auth_service.update_user_profile("test-token", update_data)

        # Verify
        assert isinstance(result, UserProfile)
        assert result.full_name == "Updated Name"

        # Verify update was called
        mock_table.update.assert_called_once()

    @pytest.mark.asyncio
    async def test_update_user_profile_no_changes(
        self, auth_service, mock_supabase, sample_user_profile
    ):
        """Test profile update with no changes returns current profile"""
        # Setup mock current user
        mock_user_response = Mock()
        mock_user_response.user = Mock()
        mock_user_response.user.id = "user-123"
        mock_user_response.user.email = "test@example.com"
        mock_supabase.auth.get_user.return_value = mock_user_response

        mock_profile_response = Mock()
        mock_profile_response.data = [sample_user_profile]

        mock_table = Mock()
        mock_table.select.return_value = mock_table
        mock_table.eq.return_value = mock_table
        mock_table.execute.return_value = mock_profile_response
        mock_supabase.table.return_value = mock_table

        auth_service._supabase = mock_supabase

        # Execute - empty update
        update_data = UpdateProfile()
        result = await auth_service.update_user_profile("test-token", update_data)

        # Verify - returns current profile without update
        assert isinstance(result, UserProfile)
        mock_table.update.assert_not_called()

    @pytest.mark.asyncio
    async def test_update_user_profile_update_fails(
        self, auth_service, mock_supabase, sample_user_profile
    ):
        """Test profile update handles database errors"""
        # Setup mock current user
        mock_user_response = Mock()
        mock_user_response.user = Mock()
        mock_user_response.user.id = "user-123"
        mock_user_response.user.email = "test@example.com"
        mock_supabase.auth.get_user.return_value = mock_user_response

        mock_profile_response = Mock()
        mock_profile_response.data = [sample_user_profile]

        # Setup update to return no data
        mock_update_response = Mock()
        mock_update_response.data = []

        mock_table = Mock()
        mock_select = Mock()
        mock_eq = Mock()
        mock_update = Mock()
        mock_update_eq = Mock()

        mock_table.select.return_value = mock_select
        mock_select.eq.return_value = mock_eq
        mock_eq.execute.return_value = mock_profile_response

        mock_table.update.return_value = mock_update
        mock_update.eq.return_value = mock_update_eq
        mock_update_eq.execute.return_value = mock_update_response

        mock_supabase.table.return_value = mock_table
        auth_service._supabase = mock_supabase

        # Execute and verify
        update_data = UpdateProfile(full_name="New Name")
        with pytest.raises(HTTPException) as exc_info:
            await auth_service.update_user_profile("test-token", update_data)

        assert exc_info.value.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert "Failed to update profile" in exc_info.value.detail

    def test_supabase_lazy_initialization(self, auth_service):
        """Test Supabase client is initialized lazily"""
        # Initially None
        assert auth_service._supabase is None

        # Mock the get_supabase_client function
        with patch("app.services.auth_service.get_supabase_client") as mock_get_client:
            mock_client = Mock()
            mock_get_client.return_value = mock_client

            # Access supabase property
            result = auth_service.supabase

            # Verify
            assert result == mock_client
            mock_get_client.assert_called_once()

    def test_supabase_initialization_error(self, auth_service):
        """Test Supabase initialization error is handled"""
        with patch("app.services.auth_service.get_supabase_client") as mock_get_client:
            mock_get_client.side_effect = Exception("Supabase error")

            # First access should catch and store error
            with pytest.raises(HTTPException) as exc_info:
                _ = auth_service.supabase

            assert exc_info.value.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
            assert "Supabase not configured" in exc_info.value.detail

            # Subsequent accesses should raise same error without retrying
            with pytest.raises(HTTPException) as exc_info:
                _ = auth_service.supabase

            # Should only call get_supabase_client once
            mock_get_client.assert_called_once()

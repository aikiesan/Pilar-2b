"""
Unit tests for Authentication Models
Tests Pydantic validation for auth request/response models
"""
import pytest
from pydantic import ValidationError
from datetime import datetime

from app.models.auth import (
    UserRegistration,
    UserLogin,
    UserProfile,
    AuthResponse,
    UpdateProfile,
    MessageResponse
)


class TestUserRegistration:
    """Test UserRegistration model"""

    def test_valid_registration(self):
        """Test valid user registration"""
        registration = UserRegistration(
            email="user@example.com",
            password="SecurePass123",
            full_name="John Doe"
        )

        assert registration.email == "user@example.com"
        assert registration.password == "SecurePass123"
        assert registration.full_name == "John Doe"

    def test_email_validation(self):
        """Test email must be valid format"""
        with pytest.raises(ValidationError) as exc_info:
            UserRegistration(
                email="invalid-email",
                password="SecurePass123",
                full_name="John Doe"
            )

        errors = exc_info.value.errors()
        assert any(e['loc'] == ('email',) for e in errors)

    def test_email_valid_formats(self):
        """Test various valid email formats"""
        valid_emails = [
            "user@example.com",
            "user.name@example.com",
            "user+tag@example.co.uk",
            "user_123@test-domain.org"
        ]

        for email in valid_emails:
            registration = UserRegistration(
                email=email,
                password="SecurePass123",
                full_name="John Doe"
            )
            assert registration.email == email

    def test_password_min_length(self):
        """Test password must be at least 8 characters"""
        with pytest.raises(ValidationError) as exc_info:
            UserRegistration(
                email="user@example.com",
                password="Pass1",  # Too short
                full_name="John Doe"
            )

        errors = exc_info.value.errors()
        assert any('at least 8 characters' in str(e) for e in errors)

    def test_password_max_length(self):
        """Test password max length validation"""
        with pytest.raises(ValidationError):
            UserRegistration(
                email="user@example.com",
                password="A" * 101 + "b1",  # Too long
                full_name="John Doe"
            )

    def test_password_requires_uppercase(self):
        """Test password must contain uppercase letter"""
        with pytest.raises(ValidationError) as exc_info:
            UserRegistration(
                email="user@example.com",
                password="securepass123",  # No uppercase
                full_name="John Doe"
            )

        assert "uppercase letter" in str(exc_info.value)

    def test_password_requires_lowercase(self):
        """Test password must contain lowercase letter"""
        with pytest.raises(ValidationError) as exc_info:
            UserRegistration(
                email="user@example.com",
                password="SECUREPASS123",  # No lowercase
                full_name="John Doe"
            )

        assert "lowercase letter" in str(exc_info.value)

    def test_password_requires_digit(self):
        """Test password must contain digit"""
        with pytest.raises(ValidationError) as exc_info:
            UserRegistration(
                email="user@example.com",
                password="SecurePassword",  # No digit
                full_name="John Doe"
            )

        assert "digit" in str(exc_info.value)

    def test_password_all_requirements(self):
        """Test password with all requirements passes"""
        passwords = [
            "SecurePass123",
            "MyP@ssw0rd",
            "Test1234Password",
            "Aa1bcdefgh"
        ]

        for password in passwords:
            registration = UserRegistration(
                email="user@example.com",
                password=password,
                full_name="John Doe"
            )
            assert registration.password == password

    def test_full_name_min_length(self):
        """Test full name must be at least 2 characters"""
        with pytest.raises(ValidationError) as exc_info:
            UserRegistration(
                email="user@example.com",
                password="SecurePass123",
                full_name="A"  # Too short
            )

        errors = exc_info.value.errors()
        assert any(e['loc'] == ('full_name',) for e in errors)

    def test_full_name_max_length(self):
        """Test full name max length validation"""
        with pytest.raises(ValidationError):
            UserRegistration(
                email="user@example.com",
                password="SecurePass123",
                full_name="A" * 101  # Too long
            )

    def test_full_name_valid_lengths(self):
        """Test valid full name lengths"""
        names = [
            "Jo",  # Minimum
            "John Doe",
            "María José García López",
            "A" * 100  # Maximum
        ]

        for name in names:
            registration = UserRegistration(
                email="user@example.com",
                password="SecurePass123",
                full_name=name
            )
            assert registration.full_name == name

    def test_serialization(self):
        """Test registration can be serialized"""
        registration = UserRegistration(
            email="user@example.com",
            password="SecurePass123",
            full_name="John Doe"
        )

        data = registration.model_dump()
        assert data['email'] == "user@example.com"
        assert data['password'] == "SecurePass123"
        assert data['full_name'] == "John Doe"


class TestUserLogin:
    """Test UserLogin model"""

    def test_valid_login(self):
        """Test valid login credentials"""
        login = UserLogin(
            email="user@example.com",
            password="securePass123"
        )

        assert login.email == "user@example.com"
        assert login.password == "securePass123"

    def test_login_email_validation(self):
        """Test login email must be valid"""
        with pytest.raises(ValidationError):
            UserLogin(
                email="invalid-email",
                password="password123"
            )

    def test_login_no_password_validation(self):
        """Test login does not validate password strength"""
        # Login should accept any password (validation happens server-side)
        login = UserLogin(
            email="user@example.com",
            password="weak"  # Weak password is OK for login
        )

        assert login.password == "weak"

    def test_login_required_fields(self):
        """Test both email and password are required"""
        with pytest.raises(ValidationError):
            UserLogin(email="user@example.com")  # Missing password

        with pytest.raises(ValidationError):
            UserLogin(password="password123")  # Missing email


class TestUserProfile:
    """Test UserProfile model"""

    def test_valid_profile(self):
        """Test valid user profile"""
        profile = UserProfile(
            id="550e8400-e29b-41d4-a716-446655440000",
            email="user@example.com",
            full_name="John Doe",
            role="autenticado",
            created_at=datetime(2025, 11, 17, 10, 0, 0),
            updated_at=datetime(2025, 11, 17, 10, 0, 0)
        )

        assert profile.id == "550e8400-e29b-41d4-a716-446655440000"
        assert profile.email == "user@example.com"
        assert profile.role == "autenticado"

    def test_valid_roles(self):
        """Test all valid user roles"""
        valid_roles = ["visitante", "autenticado", "admin"]

        for role in valid_roles:
            profile = UserProfile(
                id="test-id",
                email="user@example.com",
                full_name="John Doe",
                role=role,
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            assert profile.role == role

    def test_invalid_role(self):
        """Test invalid role is rejected"""
        with pytest.raises(ValidationError) as exc_info:
            UserProfile(
                id="test-id",
                email="user@example.com",
                full_name="John Doe",
                role="invalid_role",  # Invalid
                created_at=datetime.now(),
                updated_at=datetime.now()
            )

        errors = exc_info.value.errors()
        assert any(e['loc'] == ('role',) for e in errors)

    def test_datetime_fields(self):
        """Test datetime fields are properly handled"""
        now = datetime.now()
        profile = UserProfile(
            id="test-id",
            email="user@example.com",
            full_name="John Doe",
            role="autenticado",
            created_at=now,
            updated_at=now
        )

        assert isinstance(profile.created_at, datetime)
        assert isinstance(profile.updated_at, datetime)

    def test_all_fields_required(self):
        """Test all profile fields are required"""
        with pytest.raises(ValidationError):
            UserProfile(
                id="test-id",
                email="user@example.com"
                # Missing required fields
            )


class TestAuthResponse:
    """Test AuthResponse model"""

    def test_valid_auth_response(self):
        """Test valid authentication response"""
        response = AuthResponse(
            access_token="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            user=UserProfile(
                id="test-id",
                email="user@example.com",
                full_name="John Doe",
                role="autenticado",
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
        )

        assert response.access_token.startswith("eyJ")
        assert response.token_type == "bearer"
        assert response.user.email == "user@example.com"

    def test_token_type_default(self):
        """Test token_type defaults to 'bearer'"""
        response = AuthResponse(
            access_token="test-token",
            user=UserProfile(
                id="test-id",
                email="user@example.com",
                full_name="John Doe",
                role="autenticado",
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
        )

        assert response.token_type == "bearer"

    def test_token_type_can_be_overridden(self):
        """Test token_type can be set explicitly"""
        response = AuthResponse(
            access_token="test-token",
            token_type="custom",
            user=UserProfile(
                id="test-id",
                email="user@example.com",
                full_name="John Doe",
                role="autenticado",
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
        )

        assert response.token_type == "custom"

    def test_nested_user_validation(self):
        """Test nested UserProfile is validated"""
        with pytest.raises(ValidationError):
            AuthResponse(
                access_token="test-token",
                user={"invalid": "user"}  # Invalid user object
            )


class TestUpdateProfile:
    """Test UpdateProfile model"""

    def test_valid_profile_update(self):
        """Test valid profile update"""
        update = UpdateProfile(full_name="Jane Doe")

        assert update.full_name == "Jane Doe"

    def test_full_name_optional(self):
        """Test full_name is optional"""
        update = UpdateProfile()

        assert update.full_name is None

    def test_full_name_min_length_when_provided(self):
        """Test full_name min length when provided"""
        with pytest.raises(ValidationError):
            UpdateProfile(full_name="A")  # Too short

    def test_full_name_max_length_when_provided(self):
        """Test full_name max length when provided"""
        with pytest.raises(ValidationError):
            UpdateProfile(full_name="A" * 101)  # Too long

    def test_valid_full_name_updates(self):
        """Test various valid full name updates"""
        valid_names = [
            "Jo",
            "John Doe",
            "María José García",
            "A" * 100
        ]

        for name in valid_names:
            update = UpdateProfile(full_name=name)
            assert update.full_name == name


class TestMessageResponse:
    """Test MessageResponse model"""

    def test_valid_message(self):
        """Test valid message response"""
        response = MessageResponse(message="Operation successful")

        assert response.message == "Operation successful"

    def test_message_required(self):
        """Test message field is required"""
        with pytest.raises(ValidationError):
            MessageResponse()  # Missing message

    def test_various_messages(self):
        """Test various message types"""
        messages = [
            "User registered successfully",
            "Password updated",
            "Error: Invalid credentials",
            "✓ Profile updated",
            "Multi-line\nmessage\nhere"
        ]

        for msg in messages:
            response = MessageResponse(message=msg)
            assert response.message == msg

    def test_serialization(self):
        """Test message can be serialized"""
        response = MessageResponse(message="Test message")

        data = response.model_dump()
        assert data['message'] == "Test message"


class TestModelSerialization:
    """Test model serialization and JSON compatibility"""

    def test_registration_to_json(self):
        """Test registration serializes to JSON"""
        registration = UserRegistration(
            email="user@example.com",
            password="SecurePass123",
            full_name="John Doe"
        )

        json_str = registration.model_dump_json()
        assert "user@example.com" in json_str
        assert "John Doe" in json_str

    def test_profile_to_json(self):
        """Test profile serializes to JSON"""
        profile = UserProfile(
            id="test-id",
            email="user@example.com",
            full_name="John Doe",
            role="autenticado",
            created_at=datetime(2025, 11, 17, 10, 0, 0),
            updated_at=datetime(2025, 11, 17, 10, 0, 0)
        )

        json_str = profile.model_dump_json()
        assert "test-id" in json_str
        assert "autenticado" in json_str

    def test_auth_response_nested_serialization(self):
        """Test AuthResponse with nested UserProfile serializes correctly"""
        response = AuthResponse(
            access_token="test-token",
            user=UserProfile(
                id="test-id",
                email="user@example.com",
                full_name="John Doe",
                role="autenticado",
                created_at=datetime(2025, 11, 17, 10, 0, 0),
                updated_at=datetime(2025, 11, 17, 10, 0, 0)
            )
        )

        data = response.model_dump()
        assert data['user']['email'] == "user@example.com"
        assert data['user']['role'] == "autenticado"
        assert data['token_type'] == "bearer"


class TestPasswordSecurity:
    """Test password security validations"""

    def test_common_weak_passwords_rejected(self):
        """Test common weak passwords are rejected"""
        weak_passwords = [
            "password123",  # No uppercase
            "PASSWORD123",  # No lowercase
            "PasswordABC",  # No digit
            "Pass1",  # Too short
        ]

        for password in weak_passwords:
            with pytest.raises(ValidationError):
                UserRegistration(
                    email="user@example.com",
                    password=password,
                    full_name="John Doe"
                )

    def test_strong_passwords_accepted(self):
        """Test strong passwords are accepted"""
        strong_passwords = [
            "MyP@ssw0rd",
            "SecurePass123!",
            "C0mpl3xP@ss",
            "Tr0ub4dor&3"
        ]

        for password in strong_passwords:
            registration = UserRegistration(
                email="user@example.com",
                password=password,
                full_name="John Doe"
            )
            assert registration.password == password

    def test_password_edge_cases(self):
        """Test password edge cases"""
        # Exactly 8 characters (minimum)
        registration = UserRegistration(
            email="user@example.com",
            password="Pass123A",  # Exactly 8 chars
            full_name="John Doe"
        )
        assert len(registration.password) == 8

        # 100 characters (maximum)
        long_password = "A" * 50 + "a" * 49 + "1"
        registration = UserRegistration(
            email="user@example.com",
            password=long_password,
            full_name="John Doe"
        )
        assert len(registration.password) == 100

"""
Authentication service for PILAR-2b V3
Mocked implementation since Authentication is disabled.
"""

from datetime import datetime
from typing import Dict

from app.models.auth import AuthResponse, UpdateProfile, UserLogin, UserProfile, UserRegistration


class AuthService:
    """Mock Authentication service"""

    async def register_user(self, registration: UserRegistration) -> AuthResponse:
        user_profile = UserProfile(
            id="mock-local-user-id",
            email=registration.email,
            full_name=registration.full_name,
            role="admin",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        return AuthResponse(
            access_token="mock-token-for-local", token_type="bearer", user=user_profile
        )

    async def login_user(self, login: UserLogin) -> AuthResponse:
        user_profile = UserProfile(
            id="mock-local-user-id",
            email=login.email,
            full_name="Local Admin",
            role="admin",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        return AuthResponse(
            access_token="mock-token-for-local", token_type="bearer", user=user_profile
        )

    async def logout_user(self, access_token: str) -> Dict[str, str]:
        return {"message": "Logout successful"}

    async def get_current_user(self, access_token: str) -> UserProfile:
        return UserProfile(
            id="mock-local-user-id",
            email="local@cp2b.com",
            full_name="Local Admin",
            role="admin",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

    async def update_user_profile(
        self, access_token: str, update_data: UpdateProfile
    ) -> UserProfile:
        return UserProfile(
            id="mock-local-user-id",
            email="local@cp2b.com",
            full_name=update_data.full_name or "Local Admin",
            role="admin",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )


# Create global instance
auth_service = AuthService()

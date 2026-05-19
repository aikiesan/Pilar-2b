"""
Authentication middleware for PILAR-2b V3
Provides dependency injection for protected routes
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional

from app.services.auth_service import auth_service
from app.models.auth import UserProfile, UserRole

# HTTP Bearer security scheme
security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> UserProfile:
    """
    Dependency to get current authenticated user from JWT token

    Args:
        credentials: HTTP Bearer credentials from request header

    Returns:
        UserProfile: Current user's profile

    Raises:
        HTTPException: If authentication fails
    """
    try:
        access_token = credentials.credentials
        user = await auth_service.get_current_user(access_token)
        return user
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"}
        )

async def get_current_active_user(
    current_user: UserProfile = Depends(get_current_user)
) -> UserProfile:
    """
    Dependency to get current active user (non-visitante)

    Args:
        current_user: Current user from get_current_user dependency

    Returns:
        UserProfile: Current active user's profile

    Raises:
        HTTPException: If user is not active (visitante role)
    """
    if current_user.role == "visitante":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user. Please verify your email or upgrade your account."
        )
    return current_user

async def require_role(
    required_role: UserRole,
    current_user: UserProfile = Depends(get_current_user)
) -> UserProfile:
    """
    Dependency factory to require specific user role

    Args:
        required_role: Required role for access
        current_user: Current user from get_current_user dependency

    Returns:
        UserProfile: Current user's profile if role matches

    Raises:
        HTTPException: If user doesn't have required role
    """
    # Role hierarchy: admin > autenticado > visitante
    role_hierarchy = {
        "visitante": 0,
        "autenticado": 1,
        "admin": 2
    }

    user_level = role_hierarchy.get(current_user.role, 0)
    required_level = role_hierarchy.get(required_role, 0)

    if user_level < required_level:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions. Required role: {required_role}"
        )

    return current_user

def require_admin(current_user: UserProfile = Depends(get_current_user)) -> UserProfile:
    """
    Dependency to require admin role

    Args:
        current_user: Current user from get_current_user dependency

    Returns:
        UserProfile: Current user's profile if admin

    Raises:
        HTTPException: If user is not admin
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

def require_authenticated(
    current_user: UserProfile = Depends(get_current_user)
) -> UserProfile:
    """
    Dependency to require authenticated (autenticado or admin) role

    Args:
        current_user: Current user from get_current_user dependency

    Returns:
        UserProfile: Current user's profile if authenticated

    Raises:
        HTTPException: If user is only visitante
    """
    if current_user.role == "visitante":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Authenticated access required. Please complete email verification."
        )
    return current_user

async def optional_auth(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
) -> Optional[UserProfile]:
    """
    Dependency for optional authentication - returns user if authenticated, None otherwise

    Args:
        credentials: Optional HTTP Bearer credentials from request header

    Returns:
        Optional[UserProfile]: User profile if authenticated, None if not
    """
    if credentials is None:
        return None

    try:
        access_token = credentials.credentials
        user = await auth_service.get_current_user(access_token)
        return user
    except Exception:
        # If authentication fails, return None instead of raising error
        return None

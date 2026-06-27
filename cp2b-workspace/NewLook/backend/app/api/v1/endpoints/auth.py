"""
Authentication API endpoints — local, self-hosted (UNICAMP VM).

Registration is invite-only: only an admin can provision accounts (POST /users).
Login/logout/me/verify use VM-local JWTs. Admin user-management endpoints support
LGPD data-subject operations (deactivate / delete / list).
"""
from typing import List

from fastapi import APIRouter, Depends, status, Request
from fastapi.security import HTTPAuthorizationCredentials

from app.models.auth import (
    AdminCreateUser,
    UserLogin,
    AuthResponse,
    UserProfile,
    UpdateProfile,
    MessageResponse,
)
from app.services.auth_service import auth_service
from app.middleware.auth import get_current_user, require_admin, security
from app.middleware.rate_limit import login_limiter, auth_limiter, read_limiter

router = APIRouter()


# ── Admin: account provisioning (invite-only registration) ────────────────────
@router.post(
    "/users",
    response_model=UserProfile,
    status_code=status.HTTP_201_CREATED,
    summary="Create internal account (admin only)",
    description="Provision a new internal account. Registration is invite-only.",
)
@auth_limiter.limit("10/minute")
async def create_user(
    request: Request,
    payload: AdminCreateUser,
    admin: UserProfile = Depends(require_admin),
):
    """Create an internal account with role + clearance. Admin only."""
    return await auth_service.create_user(payload, created_by=admin.id)


@router.get(
    "/users",
    response_model=List[UserProfile],
    summary="List accounts (admin only)",
)
@read_limiter.limit("60/minute")
async def list_users(request: Request, admin: UserProfile = Depends(require_admin)):
    return await auth_service.list_users()


@router.patch(
    "/users/{user_id}/active",
    response_model=MessageResponse,
    summary="Activate / deactivate an account (admin only)",
)
@auth_limiter.limit("20/minute")
async def set_user_active(
    request: Request,
    user_id: str,
    active: bool,
    admin: UserProfile = Depends(require_admin),
):
    result = await auth_service.set_active(user_id, active)
    return MessageResponse(message=result["message"])


@router.delete(
    "/users/{user_id}",
    response_model=MessageResponse,
    summary="Delete an account (admin only) — LGPD erasure",
)
@auth_limiter.limit("20/minute")
async def delete_user(
    request: Request,
    user_id: str,
    admin: UserProfile = Depends(require_admin),
):
    result = await auth_service.delete_user(user_id)
    return MessageResponse(message=result["message"])


# ── Session ───────────────────────────────────────────────────────────────────
@router.post(
    "/login",
    response_model=AuthResponse,
    summary="Login user",
    description="Authenticate user and issue a local access token",
)
@login_limiter.limit("3/minute")
async def login(request: Request, login_data: UserLogin):
    """
    Authenticate with email + password and receive a signed access token.

    Rate limit: 3/minute per IP; accounts also lock after repeated failures.
    """
    return await auth_service.login_user(login_data)


@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="Logout user",
    description="Revoke the current access token",
)
@auth_limiter.limit("10/minute")
async def logout(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Revoke the presented token (adds its jti to the denylist)."""
    result = await auth_service.logout_user(credentials.credentials)
    return MessageResponse(message=result["message"])


@router.get(
    "/me",
    response_model=UserProfile,
    summary="Get current user",
)
@read_limiter.limit("100/minute")
async def get_me(request: Request, current_user: UserProfile = Depends(get_current_user)):
    """Return the authenticated user's profile (LGPD access right)."""
    return current_user


@router.put(
    "/me",
    response_model=UserProfile,
    summary="Update user profile",
)
@auth_limiter.limit("10/minute")
async def update_me(
    request: Request,
    update_data: UpdateProfile,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    return await auth_service.update_user_profile(credentials.credentials, update_data)


@router.get(
    "/verify",
    response_model=MessageResponse,
    summary="Verify token",
)
@read_limiter.limit("100/minute")
async def verify_token(request: Request, current_user: UserProfile = Depends(get_current_user)):
    return MessageResponse(message=f"Token is valid for user: {current_user.email}")

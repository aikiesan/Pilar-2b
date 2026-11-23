"""
Authentication API endpoints — local, self-hosted (UNICAMP VM).

Anyone may ask for an account (POST /signup): it waits for the e-mail to be
confirmed and then for an admin to approve it at a level. Admins can still
create an approved account directly (POST /users).
Login/logout/me/verify use VM-local JWTs. Admin user-management endpoints support
LGPD data-subject operations (deactivate / delete / list).
"""

import uuid
from typing import List

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request, status
from fastapi.security import HTTPAuthorizationCredentials

from app.middleware.auth import get_current_user, require_admin, security
from app.middleware.rate_limit import auth_limiter, login_limiter, read_limiter
from app.models.auth import (
    AccessRequest,
    AccountStatus,
    AdminCreateUser,
    ApproveRequest,
    AuthResponse,
    ClearanceUpdate,
    EmailOnly,
    MessageResponse,
    PasswordReset,
    RejectRequest,
    SignupRequest,
    TokenOnly,
    UpdateProfile,
    UserLogin,
    UserProfile,
    VerifyEmailResponse,
)
from app.services import mailer
from app.services.auth_service import auth_service
from app.services.mailer import Mail

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


@router.patch(
    "/users/{user_id}/clearance",
    response_model=UserProfile,
    summary="Set an account's data clearance (admin only)",
)
@auth_limiter.limit("20/minute")
async def set_user_clearance(
    request: Request,
    user_id: str,
    payload: ClearanceUpdate,
    admin: UserProfile = Depends(require_admin),
):
    # Changing your own level is refused outright: it can only lock you out.
    # Compared in canonical form, so another spelling of the same id (upper
    # case, urn:uuid:) cannot get past it.
    try:
        user_id = str(uuid.UUID(user_id))
    except ValueError:
        pass  # the service answers 404 for it
    if user_id == str(admin.id).lower():
        raise HTTPException(status_code=400, detail="You cannot change your own clearance")
    return await auth_service.set_clearance(user_id, payload.clearance)


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


# ── Sign-up with approval ─────────────────────────────────────────────────────
# Every public answer here is the same whether or not the e-mail has an
# account, so the forms never reveal who is registered.
_SIGNUP_ANSWER = "If the address can be used, a confirmation link is on its way."
_FORGOT_ANSWER = "If an approved account uses this address, a link is on its way."


def _send_later(background: BackgroundTasks, mails: List[Mail]) -> None:
    for mail in mails:
        background.add_task(mailer.send, mail)


@router.post(
    "/signup",
    response_model=MessageResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Ask for an account (public)",
)
@auth_limiter.limit("3/minute")
async def signup(request: Request, payload: SignupRequest, background: BackgroundTasks):
    # The hidden field: a person never fills it. Answer as usual, do nothing.
    if payload.website.strip():
        return MessageResponse(message=_SIGNUP_ANSWER)
    _send_later(background, await auth_service.signup(payload))
    return MessageResponse(message=_SIGNUP_ANSWER)


@router.post(
    "/verify-email",
    response_model=VerifyEmailResponse,
    summary="Confirm the e-mail address from the link (public)",
)
@auth_limiter.limit("10/minute")
async def verify_email(request: Request, payload: TokenOnly, background: BackgroundTasks):
    account_status, mails = await auth_service.verify_email(payload.token)
    _send_later(background, mails)
    return VerifyEmailResponse(status=account_status)


@router.post(
    "/verify-email/resend",
    response_model=MessageResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Send the confirmation link again (public)",
)
@auth_limiter.limit("3/minute")
async def resend_verification(request: Request, payload: EmailOnly, background: BackgroundTasks):
    _send_later(background, await auth_service.resend_verification(payload.email))
    return MessageResponse(message=_SIGNUP_ANSWER)


@router.post(
    "/password/forgot",
    response_model=MessageResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Send a password reset link (public)",
)
@auth_limiter.limit("3/minute")
async def forgot_password(request: Request, payload: EmailOnly, background: BackgroundTasks):
    _send_later(background, await auth_service.forgot_password(payload.email))
    return MessageResponse(message=_FORGOT_ANSWER)


@router.post(
    "/password/reset",
    response_model=MessageResponse,
    summary="Choose a new password from the link (public)",
)
@auth_limiter.limit("5/minute")
async def reset_password(request: Request, payload: PasswordReset):
    await auth_service.reset_password(payload.token, payload.password)
    return MessageResponse(message="Password changed")


# ── Admin: the request queue ──────────────────────────────────────────────────
@router.get(
    "/admin/requests",
    response_model=List[AccessRequest],
    summary="Access requests by status (admin only)",
)
@read_limiter.limit("60/minute")
async def list_requests(
    request: Request,
    status_filter: AccountStatus = Query("pending_review", alias="status"),
    admin: UserProfile = Depends(require_admin),
):
    return await auth_service.list_requests(status_filter)


@router.post(
    "/admin/requests/{user_id}/approve",
    response_model=AccessRequest,
    summary="Approve a request at a level (admin only)",
)
@auth_limiter.limit("30/minute")
async def approve_request(
    request: Request,
    user_id: str,
    payload: ApproveRequest,
    background: BackgroundTasks,
    admin: UserProfile = Depends(require_admin),
):
    approved, mails = await auth_service.approve_request(user_id, payload.clearance, admin.id)
    _send_later(background, mails)
    return approved


@router.post(
    "/admin/requests/{user_id}/reject",
    response_model=AccessRequest,
    summary="Refuse a request, with an optional reason (admin only)",
)
@auth_limiter.limit("30/minute")
async def reject_request(
    request: Request,
    user_id: str,
    payload: RejectRequest,
    background: BackgroundTasks,
    admin: UserProfile = Depends(require_admin),
):
    refused, mails = await auth_service.reject_request(user_id, payload.note, admin.id)
    _send_later(background, mails)
    return refused

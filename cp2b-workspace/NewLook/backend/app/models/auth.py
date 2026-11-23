"""
Authentication models for PILAR-2b V3
Pydantic models for request/response validation
"""

import re
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator

# User role types (hierarchy: visitante < autenticado < interno < admin)
UserRole = Literal["visitante", "autenticado", "interno", "admin"]

# Data-clearance tiers, gated independently of role:
#   0 = public · 1 = registered · 2 = partner · 3 = internal
Clearance = Literal[0, 1, 2, 3]

# Where an account is in sign-up with approval (migration 040):
#   pending_email -> pending_review -> approved | rejected
AccountStatus = Literal["pending_email", "pending_review", "approved", "rejected"]


class UserRegistration(BaseModel):
    """User registration request model"""

    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    full_name: str = Field(..., min_length=2, max_length=100)

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        """
        Validate password strength requirements.

        Requirements:
        - At least 8 characters (enforced by Field)
        - At least one uppercase letter
        - At least one lowercase letter
        - At least one digit
        """
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "email": "usuario@example.com",
                "password": "YourSecurePassword123",
                "full_name": "João Silva",
            }
        }


class UserLogin(BaseModel):
    """User login request model"""

    email: EmailStr
    password: str

    class Config:
        json_schema_extra = {
            "example": {"email": "usuario@example.com", "password": "yourSecurePassword123"}
        }


class UserProfile(BaseModel):
    """User profile model"""

    id: str
    email: str
    full_name: str
    role: UserRole
    clearance: int = 0
    is_active: bool = True
    created_at: datetime
    updated_at: datetime
    last_login_at: Optional[datetime] = None  # filled by the admin user list
    status: AccountStatus = "approved"

    class Config:
        json_schema_extra = {
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "email": "usuario@example.com",
                "full_name": "João Silva",
                "role": "autenticado",
                "created_at": "2025-11-17T10:00:00Z",
                "updated_at": "2025-11-17T10:00:00Z",
            }
        }


class AuthResponse(BaseModel):
    """Authentication response model"""

    access_token: str
    token_type: str = "bearer"
    user: UserProfile

    class Config:
        json_schema_extra = {
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer",
                "user": {
                    "id": "550e8400-e29b-41d4-a716-446655440000",
                    "email": "usuario@example.com",
                    "full_name": "João Silva",
                    "role": "autenticado",
                    "created_at": "2025-11-17T10:00:00Z",
                    "updated_at": "2025-11-17T10:00:00Z",
                },
            }
        }


class UpdateProfile(BaseModel):
    """Update user profile request model"""

    full_name: Optional[str] = Field(None, min_length=2, max_length=100)

    class Config:
        json_schema_extra = {"example": {"full_name": "João Pedro Silva"}}


class AdminCreateUser(BaseModel):
    """Admin-only model to provision an internal account (invite-only registration)."""

    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    full_name: str = Field(..., min_length=2, max_length=100)
    role: UserRole = "autenticado"
    clearance: int = Field(1, ge=0, le=3)  # 1 = registered, unless the admin says otherwise

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        return v


def _password_strength(v: str) -> str:
    if not re.search(r"[A-Z]", v):
        raise ValueError("Password must contain at least one uppercase letter")
    if not re.search(r"[a-z]", v):
        raise ValueError("Password must contain at least one lowercase letter")
    if not re.search(r"\d", v):
        raise ValueError("Password must contain at least one digit")
    return v


class SignupRequest(BaseModel):
    """Public: ask for an account. It waits for the e-mail and then for an admin."""

    email: EmailStr
    password: str = Field(..., min_length=10, max_length=100)
    full_name: str = Field(..., min_length=2, max_length=100)
    institution: str = Field(..., min_length=2, max_length=200)
    purpose: str = Field(..., min_length=10, max_length=500)
    accept_terms: bool
    # Hidden in the form; a person never fills it, a bot usually does.
    website: str = ""

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        return _password_strength(v)

    @field_validator("full_name", "institution", "purpose")
    @classmethod
    def strip_text(cls, v: str) -> str:
        return v.strip()

    @field_validator("accept_terms")
    @classmethod
    def must_accept(cls, v: bool) -> bool:
        if not v:
            raise ValueError("The terms must be accepted")
        return v


class EmailOnly(BaseModel):
    """Resend the confirmation link, or ask for a password reset."""

    email: EmailStr


class TokenOnly(BaseModel):
    token: str = Field(..., min_length=20, max_length=200)


class PasswordReset(BaseModel):
    token: str = Field(..., min_length=20, max_length=200)
    password: str = Field(..., min_length=10, max_length=100)

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        return _password_strength(v)


class VerifyEmailResponse(BaseModel):
    status: AccountStatus


class AccessRequest(BaseModel):
    """One account as the admin's request queue shows it."""

    id: str
    email: str
    full_name: str
    institution: Optional[str] = None
    purpose: Optional[str] = None
    status: AccountStatus
    clearance: int
    created_at: datetime
    email_verified_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None
    review_note: Optional[str] = None


class ApproveRequest(BaseModel):
    """Approve with the level chosen on the spot (1 registered by default)."""

    clearance: int = Field(1, ge=1, le=3)


class RejectRequest(BaseModel):
    note: Optional[str] = Field(None, max_length=500)


class ClearanceUpdate(BaseModel):
    """Admin-only: set a person's data clearance (0 public .. 3 internal)."""

    clearance: int = Field(..., ge=0, le=3)


class MessageResponse(BaseModel):
    """Generic message response"""

    message: str

    class Config:
        json_schema_extra = {"example": {"message": "Operation completed successfully"}}

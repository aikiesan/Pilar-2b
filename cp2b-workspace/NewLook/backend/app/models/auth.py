"""
Authentication models for PILAR-2b V3
Pydantic models for request/response validation
"""
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, Literal
from datetime import datetime
import re

# User role types
UserRole = Literal["visitante", "autenticado", "admin"]

class UserRegistration(BaseModel):
    """User registration request model"""
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    full_name: str = Field(..., min_length=2, max_length=100)

    @field_validator('password')
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
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "email": "usuario@example.com",
                "password": "YourSecurePassword123",
                "full_name": "João Silva"
            }
        }

class UserLogin(BaseModel):
    """User login request model"""
    email: EmailStr
    password: str

    class Config:
        json_schema_extra = {
            "example": {
                "email": "usuario@example.com",
                "password": "yourSecurePassword123"
            }
        }

class UserProfile(BaseModel):
    """User profile model"""
    id: str
    email: str
    full_name: str
    role: UserRole
    created_at: datetime
    updated_at: datetime

    class Config:
        json_schema_extra = {
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "email": "usuario@example.com",
                "full_name": "João Silva",
                "role": "autenticado",
                "created_at": "2025-11-17T10:00:00Z",
                "updated_at": "2025-11-17T10:00:00Z"
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
                    "updated_at": "2025-11-17T10:00:00Z"
                }
            }
        }

class UpdateProfile(BaseModel):
    """Update user profile request model"""
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)

    class Config:
        json_schema_extra = {
            "example": {
                "full_name": "João Pedro Silva"
            }
        }

class MessageResponse(BaseModel):
    """Generic message response"""
    message: str

    class Config:
        json_schema_extra = {
            "example": {
                "message": "Operation completed successfully"
            }
        }

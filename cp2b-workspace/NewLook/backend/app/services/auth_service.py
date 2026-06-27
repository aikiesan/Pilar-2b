"""
Authentication service for PILAR-2b V3 — local, self-hosted (UNICAMP VM).

All authentication data lives in PostgreSQL on the VM (table `auth_users`), behind
the UNICAMP proxy. Passwords are bcrypt-hashed (passlib); access tokens are HS256
JWTs signed with the local SECRET_KEY (PyJWT). Registration is invite-only: only an
admin can create accounts. Real logout is supported via a JWT-id (jti) denylist.

LGPD: data-minimised (only auth-essential fields); access to confidential resources
is recorded in `auth_access_log` for accountability (Art. 37/46).
"""
from __future__ import annotations

import uuid
import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional

import jwt
from fastapi import HTTPException, status
from passlib.context import CryptContext

from app.core.config import settings
from app.core.database import get_db, get_db_transaction
from app.models.auth import (
    AdminCreateUser,
    AuthResponse,
    UpdateProfile,
    UserLogin,
    UserProfile,
)

logger = logging.getLogger(__name__)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Account-lockout policy (brute-force defence, complements per-IP rate limiting).
MAX_FAILED_LOGINS = 5
LOCKOUT_MINUTES = 15


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _credentials_error(detail: str = "Could not validate credentials") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def _row_to_profile(row: dict) -> UserProfile:
    return UserProfile(
        id=str(row["id"]),
        email=row["email"],
        full_name=row["full_name"],
        role=row["role"],
        clearance=int(row["clearance"]),
        is_active=bool(row["is_active"]),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


class AuthService:
    """DB-backed authentication service."""

    # ── password + token helpers ──────────────────────────────────────────────
    @staticmethod
    def hash_password(password: str) -> str:
        return pwd_context.hash(password)

    @staticmethod
    def verify_password(password: str, password_hash: str) -> bool:
        try:
            return pwd_context.verify(password, password_hash)
        except Exception:
            return False

    def _issue_token(self, row: dict) -> str:
        """Create a signed HS256 access token with a unique jti for revocation."""
        jti = str(uuid.uuid4())
        expire = _now() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        payload = {
            "sub": str(row["id"]),
            "email": row["email"],
            "role": row["role"],
            "clearance": int(row["clearance"]),
            "jti": jti,
            "iat": _now(),
            "exp": expire,
        }
        return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    # ── admin: create internal account (invite-only registration) ─────────────
    async def create_user(self, data: AdminCreateUser, created_by: Optional[str] = None) -> UserProfile:
        password_hash = self.hash_password(data.password)
        try:
            with get_db_transaction() as conn:
                cur = conn.cursor()
                cur.execute(
                    """
                    INSERT INTO auth_users (email, password_hash, full_name, role, clearance, created_by)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING id, email, full_name, role, clearance, is_active, created_at, updated_at
                    """,
                    (data.email, password_hash, data.full_name, data.role, data.clearance, created_by),
                )
                row = cur.fetchone()
        except Exception as e:
            # Unique-violation on email → 409 (do not leak internals).
            if "unique" in str(e).lower() or "duplicate" in str(e).lower():
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
            logger.error("create_user failed: %s", e)
            raise HTTPException(status_code=500, detail="Could not create user")
        return _row_to_profile(row)

    # ── login ─────────────────────────────────────────────────────────────────
    async def login_user(self, login: UserLogin) -> AuthResponse:
        with get_db_transaction() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                SELECT id, email, password_hash, full_name, role, clearance,
                       is_active, failed_login_count, locked_until, created_at, updated_at
                FROM auth_users WHERE email = %s
                """,
                (login.email,),
            )
            row = cur.fetchone()

            # Uniform error to avoid user enumeration.
            invalid = _credentials_error("Invalid email or password")
            if row is None:
                raise invalid
            if not row["is_active"]:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is inactive")
            if row["locked_until"] and row["locked_until"] > _now():
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                    detail="Account temporarily locked. Try again later.")

            if not self.verify_password(login.password, row["password_hash"]):
                failed = int(row["failed_login_count"]) + 1
                locked_until = _now() + timedelta(minutes=LOCKOUT_MINUTES) if failed >= MAX_FAILED_LOGINS else None
                cur.execute(
                    "UPDATE auth_users SET failed_login_count=%s, locked_until=%s, updated_at=now() WHERE id=%s",
                    (failed, locked_until, row["id"]),
                )
                raise invalid

            # Success → reset counters, stamp last_login.
            cur.execute(
                "UPDATE auth_users SET failed_login_count=0, locked_until=NULL, last_login_at=now(), updated_at=now() WHERE id=%s",
                (row["id"],),
            )

        token = self._issue_token(row)
        return AuthResponse(access_token=token, token_type="bearer", user=_row_to_profile(row))

    # ── current user (token verification) ─────────────────────────────────────
    async def get_current_user(self, access_token: str) -> UserProfile:
        try:
            payload = jwt.decode(access_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        except jwt.ExpiredSignatureError:
            raise _credentials_error("Token has expired")
        except jwt.InvalidTokenError:
            raise _credentials_error()

        jti = payload.get("jti")
        user_id = payload.get("sub")
        if not jti or not user_id:
            raise _credentials_error()

        with get_db() as conn:
            cur = conn.cursor()
            # Revoked (logged out)?
            cur.execute("SELECT 1 FROM auth_token_denylist WHERE jti = %s", (jti,))
            if cur.fetchone():
                raise _credentials_error("Token has been revoked")
            cur.execute(
                """
                SELECT id, email, full_name, role, clearance, is_active, created_at, updated_at
                FROM auth_users WHERE id = %s
                """,
                (user_id,),
            )
            row = cur.fetchone()
            cur.close()

        if row is None or not row["is_active"]:
            raise _credentials_error("User not found or inactive")
        return _row_to_profile(row)

    # ── logout (revoke this token) ────────────────────────────────────────────
    async def logout_user(self, access_token: str) -> Dict[str, str]:
        try:
            payload = jwt.decode(
                access_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM],
                options={"verify_exp": False},  # allow revoking an already-near-expiry token
            )
        except jwt.InvalidTokenError:
            return {"message": "Logout successful"}  # nothing to revoke
        jti = payload.get("jti")
        exp = payload.get("exp")
        if jti and exp:
            with get_db_transaction() as conn:
                cur = conn.cursor()
                cur.execute(
                    """
                    INSERT INTO auth_token_denylist (jti, user_id, expires_at)
                    VALUES (%s, %s, to_timestamp(%s))
                    ON CONFLICT (jti) DO NOTHING
                    """,
                    (jti, payload.get("sub"), exp),
                )
        return {"message": "Logout successful"}

    # ── profile update ────────────────────────────────────────────────────────
    async def update_user_profile(self, access_token: str, update_data: UpdateProfile) -> UserProfile:
        user = await self.get_current_user(access_token)
        if update_data.full_name is None:
            return user
        with get_db_transaction() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                UPDATE auth_users SET full_name=%s, updated_at=now() WHERE id=%s
                RETURNING id, email, full_name, role, clearance, is_active, created_at, updated_at
                """,
                (update_data.full_name, user.id),
            )
            row = cur.fetchone()
        return _row_to_profile(row)

    # ── admin: user management (LGPD data-subject ops) ────────────────────────
    async def list_users(self) -> List[UserProfile]:
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                SELECT id, email, full_name, role, clearance, is_active, created_at, updated_at
                FROM auth_users ORDER BY created_at DESC
                """
            )
            rows = cur.fetchall()
            cur.close()
        return [_row_to_profile(r) for r in rows]

    async def set_active(self, user_id: str, active: bool) -> Dict[str, str]:
        with get_db_transaction() as conn:
            cur = conn.cursor()
            cur.execute("UPDATE auth_users SET is_active=%s, updated_at=now() WHERE id=%s RETURNING id",
                        (active, user_id))
            found = cur.fetchone()
        if not found:
            raise HTTPException(status_code=404, detail="User not found")
        return {"message": "User activated" if active else "User deactivated"}

    async def delete_user(self, user_id: str) -> Dict[str, str]:
        with get_db_transaction() as conn:
            cur = conn.cursor()
            cur.execute("DELETE FROM auth_users WHERE id=%s RETURNING id", (user_id,))
            found = cur.fetchone()
        if not found:
            raise HTTPException(status_code=404, detail="User not found")
        return {"message": "User deleted"}

    # ── LGPD accountability: log access to a confidential resource ────────────
    async def log_access(self, user: UserProfile, resource: str, action: str = "access",
                         ip_address: Optional[str] = None) -> None:
        try:
            with get_db_transaction() as conn:
                cur = conn.cursor()
                cur.execute(
                    """
                    INSERT INTO auth_access_log (user_id, email, resource, action, ip_address)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (user.id, user.email, resource, action, ip_address),
                )
        except Exception as e:  # never let logging break the request
            logger.warning("auth_access_log insert failed: %s", e)


# Global instance
auth_service = AuthService()

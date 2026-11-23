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

import hashlib
import logging
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple

import jwt
from fastapi import HTTPException, status
from passlib.context import CryptContext

from app.core.config import settings
from app.core.database import get_db, get_db_transaction
from app.models.auth import (
    AccessRequest,
    AdminCreateUser,
    AuthResponse,
    SignupRequest,
    UpdateProfile,
    UserLogin,
    UserProfile,
)
from app.services import mailer
from app.services.mailer import Mail

logger = logging.getLogger(__name__)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Account-lockout policy (brute-force defence, complements per-IP rate limiting).
MAX_FAILED_LOGINS = 5
LOCKOUT_MINUTES = 15

# How long an e-mailed link stays valid (single use either way).
VERIFY_EMAIL_HOURS = 48
RESET_PASSWORD_HOURS = 1

# What the sign-in form says for an account that is not approved yet. The
# password is checked first, so these never tell a stranger an account exists.
_STATUS_ERRORS = {
    "pending_email": ("email_not_verified", "Confirm your e-mail address first"),
    "pending_review": ("pending_review", "Your access request is waiting for approval"),
    "rejected": ("rejected", "Your access request was not approved"),
}

_REQUEST_COLUMNS = (
    "id, email, full_name, institution, purpose, status, clearance, created_at, "
    "email_verified_at, reviewed_at, review_note"
)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _credentials_error(detail: str = "Could not validate credentials") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def _auth_error(status_code: int, code: str, message: str) -> HTTPException:
    """An error the sign-in and sign-up forms explain to the user.

    `code` is stable, so the frontend words it in the page's language; `message`
    is the English fallback for any other client.
    """
    headers = (
        {"WWW-Authenticate": "Bearer"} if status_code == status.HTTP_401_UNAUTHORIZED else None
    )
    return HTTPException(
        status_code=status_code, detail={"code": code, "message": message}, headers=headers
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
        last_login_at=row.get("last_login_at"),
        status=row.get("status") or "approved",
    )


def _row_to_request(row: dict) -> AccessRequest:
    return AccessRequest(
        id=str(row["id"]),
        email=row["email"],
        full_name=row["full_name"],
        institution=row.get("institution"),
        purpose=row.get("purpose"),
        status=row["status"],
        clearance=int(row["clearance"]),
        created_at=row["created_at"],
        email_verified_at=row.get("email_verified_at"),
        reviewed_at=row.get("reviewed_at"),
        review_note=row.get("review_note"),
    )


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _new_email_token(cur, user_id, kind: str, hours: int) -> str:
    """Issue a single-use link token; older unused ones of the same kind stop working."""
    cur.execute(
        "UPDATE auth_email_tokens SET used_at=now() "
        "WHERE user_id=%s AND kind=%s AND used_at IS NULL",
        (user_id, kind),
    )
    token = secrets.token_urlsafe(32)
    cur.execute(
        "INSERT INTO auth_email_tokens (user_id, kind, token_hash, expires_at) "
        "VALUES (%s, %s, %s, %s)",
        (user_id, kind, _hash_token(token), _now() + timedelta(hours=hours)),
    )
    return token


def _invalid_token() -> HTTPException:
    return _auth_error(
        status.HTTP_400_BAD_REQUEST, "invalid_token", "This link is invalid or has expired"
    )


def _canonical_id(user_id: str) -> str:
    try:
        return str(uuid.UUID(user_id))
    except ValueError:
        raise HTTPException(status_code=404, detail="User not found")


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
    async def create_user(
        self, data: AdminCreateUser, created_by: Optional[str] = None
    ) -> UserProfile:
        password_hash = self.hash_password(data.password)
        try:
            with get_db_transaction() as conn:
                cur = conn.cursor()
                cur.execute(
                    """
                    INSERT INTO auth_users
                        (email, password_hash, full_name, role, clearance, created_by,
                         status, email_verified_at, reviewed_by, reviewed_at)
                    VALUES (%s, %s, %s, %s, %s, %s, 'approved', now(), %s, now())
                    RETURNING id, email, full_name, role, clearance,
                              is_active, created_at, updated_at, status
                    """,
                    (
                        data.email,
                        password_hash,
                        data.full_name,
                        data.role,
                        data.clearance,
                        created_by,
                        created_by,
                    ),
                )
                row = cur.fetchone()
        except Exception as e:
            # Unique-violation on email → 409 (do not leak internals).
            if "unique" in str(e).lower() or "duplicate" in str(e).lower():
                raise _auth_error(
                    status.HTTP_409_CONFLICT, "email_taken", "Email already registered"
                )
            logger.error("create_user failed: %s", e)
            raise HTTPException(status_code=500, detail="Could not create user")
        return _row_to_profile(row)

    # ── login ─────────────────────────────────────────────────────────────────
    async def login_user(self, login: UserLogin) -> AuthResponse:
        # Uniform error to avoid user enumeration.
        invalid = _auth_error(
            status.HTTP_401_UNAUTHORIZED, "invalid_credentials", "Invalid email or password"
        )
        with get_db_transaction() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                SELECT id, email, password_hash, full_name, role, clearance, status,
                       is_active, failed_login_count, locked_until, created_at, updated_at
                FROM auth_users WHERE email = %s
                """,
                (login.email,),
            )
            row = cur.fetchone()

            if row is None:
                raise invalid
            if not row["is_active"]:
                raise _auth_error(
                    status.HTTP_403_FORBIDDEN, "account_inactive", "Account is inactive"
                )
            if row["locked_until"] and row["locked_until"] > _now():
                raise _auth_error(
                    status.HTTP_403_FORBIDDEN,
                    "account_locked",
                    "Account temporarily locked. Try again later.",
                )

            password_ok = self.verify_password(login.password, row["password_hash"])
            if password_ok:
                # Success → reset counters, stamp last_login.
                cur.execute(
                    "UPDATE auth_users SET failed_login_count=0, locked_until=NULL, "
                    "last_login_at=now(), updated_at=now() WHERE id=%s",
                    (row["id"],),
                )
            else:
                failed = int(row["failed_login_count"]) + 1
                locked_until = (
                    _now() + timedelta(minutes=LOCKOUT_MINUTES)
                    if failed >= MAX_FAILED_LOGINS
                    else None
                )
                cur.execute(
                    "UPDATE auth_users SET failed_login_count=%s, locked_until=%s, "
                    "updated_at=now() WHERE id=%s",
                    (failed, locked_until, row["id"]),
                )

        # Raised once the transaction has committed: raising inside it would roll
        # the failed-attempt count back, and the account would never lock.
        if not password_ok:
            raise invalid
        # Only now, with the right password, may the form say why it cannot go on.
        account_status = row.get("status", "approved")
        if account_status in _STATUS_ERRORS:
            code, message = _STATUS_ERRORS[account_status]
            raise _auth_error(status.HTTP_403_FORBIDDEN, code, message)

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
                SELECT id, email, full_name, role, clearance, is_active, status,
                       created_at, updated_at
                FROM auth_users WHERE id = %s
                """,
                (user_id,),
            )
            row = cur.fetchone()
            cur.close()

        # Checked on every request, so deactivating an account ends its session
        # at once, even though tokens now last seven days.
        if row is None or not row["is_active"] or row.get("status", "approved") != "approved":
            raise _credentials_error("User not found or inactive")
        return _row_to_profile(row)

    # ── logout (revoke this token) ────────────────────────────────────────────
    async def logout_user(self, access_token: str) -> Dict[str, str]:
        try:
            payload = jwt.decode(
                access_token,
                settings.SECRET_KEY,
                algorithms=[settings.ALGORITHM],
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
    async def update_user_profile(
        self, access_token: str, update_data: UpdateProfile
    ) -> UserProfile:
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
            cur.execute("""
                SELECT id, email, full_name, role, clearance, is_active, created_at, updated_at,
                       last_login_at, status
                FROM auth_users ORDER BY created_at DESC
                """)
            rows = cur.fetchall()
            cur.close()
        return [_row_to_profile(r) for r in rows]

    async def set_active(self, user_id: str, active: bool) -> Dict[str, str]:
        with get_db_transaction() as conn:
            cur = conn.cursor()
            cur.execute(
                "UPDATE auth_users SET is_active=%s, updated_at=now() WHERE id=%s RETURNING id",
                (active, user_id),
            )
            found = cur.fetchone()
        if not found:
            raise HTTPException(status_code=404, detail="User not found")
        return {"message": "User activated" if active else "User deactivated"}

    async def set_clearance(self, user_id: str, clearance: int) -> UserProfile:
        try:
            user_id = str(uuid.UUID(user_id))
        except ValueError:
            raise HTTPException(status_code=404, detail="User not found")
        with get_db_transaction() as conn:
            cur = conn.cursor()
            cur.execute(
                """
                UPDATE auth_users SET clearance=%s, updated_at=now() WHERE id=%s
                RETURNING id, email, full_name, role, clearance, is_active, created_at,
                          updated_at, last_login_at, status
                """,
                (clearance, user_id),
            )
            row = cur.fetchone()
            cur.close()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        return _row_to_profile(row)

    async def delete_user(self, user_id: str) -> Dict[str, str]:
        with get_db_transaction() as conn:
            cur = conn.cursor()
            cur.execute("DELETE FROM auth_users WHERE id=%s RETURNING id", (user_id,))
            found = cur.fetchone()
        if not found:
            raise HTTPException(status_code=404, detail="User not found")
        return {"message": "User deleted"}

    # ── sign-up with approval ─────────────────────────────────────────────────
    async def signup(self, data: SignupRequest) -> List[Mail]:
        """Create a pending account and return the mail to send.

        The caller answers the same way whatever happens here, so nobody learns
        which e-mails have accounts. An address still waiting for confirmation
        gets a fresh link; any other existing account gets nothing.
        """
        password_hash = self.hash_password(data.password)
        with get_db_transaction() as conn:
            cur = conn.cursor()
            cur.execute(
                "SELECT id, full_name, status FROM auth_users WHERE email = %s",
                (data.email,),
            )
            existing = cur.fetchone()
            if existing is not None:
                if existing["status"] != "pending_email":
                    return []
                token = _new_email_token(cur, existing["id"], "verify_email", VERIFY_EMAIL_HOURS)
                return [mailer.verify_email(data.email, existing["full_name"], token)]
            cur.execute(
                """
                INSERT INTO auth_users
                    (email, password_hash, full_name, role, clearance, status,
                     institution, purpose)
                VALUES (%s, %s, %s, 'autenticado', 0, 'pending_email', %s, %s)
                RETURNING id
                """,
                (data.email, password_hash, data.full_name, data.institution, data.purpose),
            )
            user_id = cur.fetchone()["id"]
            token = _new_email_token(cur, user_id, "verify_email", VERIFY_EMAIL_HOURS)
        return [mailer.verify_email(data.email, data.full_name, token)]

    async def resend_verification(self, email: str) -> List[Mail]:
        with get_db_transaction() as conn:
            cur = conn.cursor()
            cur.execute("SELECT id, full_name, status FROM auth_users WHERE email = %s", (email,))
            row = cur.fetchone()
            if row is None or row["status"] != "pending_email":
                return []
            token = _new_email_token(cur, row["id"], "verify_email", VERIFY_EMAIL_HOURS)
        return [mailer.verify_email(email, row["full_name"], token)]

    @staticmethod
    def _take_token(cur, token: str, kind: str) -> Optional[dict]:
        """The token's row (locked), whether or not it is still usable."""
        cur.execute(
            """
            SELECT t.id AS token_id, t.user_id, t.expires_at, t.used_at,
                   u.email, u.full_name, u.status, u.institution, u.purpose,
                   u.email_verified_at
            FROM auth_email_tokens t JOIN auth_users u ON u.id = t.user_id
            WHERE t.token_hash = %s AND t.kind = %s
            FOR UPDATE OF t
            """,
            (_hash_token(token), kind),
        )
        return cur.fetchone()

    async def verify_email(self, token: str) -> Tuple[str, List[Mail]]:
        """Confirm the address; the request moves to the admin's queue."""
        with get_db_transaction() as conn:
            cur = conn.cursor()
            row = self._take_token(cur, token, "verify_email")
            if row is None:
                raise _invalid_token()
            # A second click on the same link: say where the request stands.
            if row["used_at"] is not None and row["email_verified_at"] is not None:
                return row["status"], []
            if row["used_at"] is not None or row["expires_at"] <= _now():
                raise _invalid_token()
            cur.execute(
                "UPDATE auth_email_tokens SET used_at=now() WHERE id=%s", (row["token_id"],)
            )
            if row["status"] != "pending_email":
                return row["status"], []
            cur.execute(
                "UPDATE auth_users SET status='pending_review', email_verified_at=now(), "
                "updated_at=now() WHERE id=%s",
                (row["user_id"],),
            )
        mails: List[Mail] = []
        if settings.ADMIN_NOTIFY_EMAIL:
            mails.append(
                mailer.new_request_notice(
                    settings.ADMIN_NOTIFY_EMAIL,
                    row["full_name"],
                    row["email"],
                    row["institution"] or "",
                    row["purpose"] or "",
                )
            )
        else:
            logger.warning("ADMIN_NOTIFY_EMAIL is not set: nobody is told about the new request")
        return "pending_review", mails

    async def forgot_password(self, email: str) -> List[Mail]:
        """Only an approved, active account gets a link; the answer is the same either way."""
        with get_db_transaction() as conn:
            cur = conn.cursor()
            cur.execute(
                "SELECT id, full_name, status, is_active FROM auth_users WHERE email = %s",
                (email,),
            )
            row = cur.fetchone()
            if row is None or row["status"] != "approved" or not row["is_active"]:
                return []
            token = _new_email_token(cur, row["id"], "reset_password", RESET_PASSWORD_HOURS)
        return [mailer.reset_password(email, row["full_name"], token)]

    async def reset_password(self, token: str, password: str) -> None:
        password_hash = self.hash_password(password)
        with get_db_transaction() as conn:
            cur = conn.cursor()
            row = self._take_token(cur, token, "reset_password")
            if row is None or row["used_at"] is not None or row["expires_at"] <= _now():
                raise _invalid_token()
            cur.execute(
                "UPDATE auth_email_tokens SET used_at=now() WHERE id=%s", (row["token_id"],)
            )
            cur.execute(
                "UPDATE auth_users SET password_hash=%s, failed_login_count=0, "
                "locked_until=NULL, updated_at=now() WHERE id=%s",
                (password_hash, row["user_id"]),
            )

    # ── admin: the request queue ──────────────────────────────────────────────
    async def list_requests(self, status_filter: str) -> List[AccessRequest]:
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                f"SELECT {_REQUEST_COLUMNS} FROM auth_users WHERE status = %s "
                "ORDER BY created_at LIMIT 500",
                (status_filter,),
            )
            rows = cur.fetchall()
            cur.close()
        return [_row_to_request(r) for r in rows]

    async def approve_request(
        self, user_id: str, clearance: int, admin_id: str
    ) -> Tuple[AccessRequest, List[Mail]]:
        """Approve at the chosen level. A refused request can be approved later."""
        user_id = _canonical_id(user_id)
        with get_db_transaction() as conn:
            cur = conn.cursor()
            cur.execute(
                f"""
                UPDATE auth_users
                   SET status='approved', clearance=%s, reviewed_by=%s, reviewed_at=now(),
                       review_note=NULL, updated_at=now()
                 WHERE id=%s AND status <> 'approved'
                RETURNING {_REQUEST_COLUMNS}
                """,
                (clearance, admin_id, user_id),
            )
            row = cur.fetchone()
            if row is None:
                self._missing_or_decided(cur, user_id)
        request = _row_to_request(row)
        return request, [mailer.approved(request.email, request.full_name)]

    async def reject_request(
        self, user_id: str, note: Optional[str], admin_id: str
    ) -> Tuple[AccessRequest, List[Mail]]:
        user_id = _canonical_id(user_id)
        note = (note or "").strip() or None
        with get_db_transaction() as conn:
            cur = conn.cursor()
            cur.execute(
                f"""
                UPDATE auth_users
                   SET status='rejected', reviewed_by=%s, reviewed_at=now(),
                       review_note=%s, updated_at=now()
                 WHERE id=%s AND status IN ('pending_email', 'pending_review')
                RETURNING {_REQUEST_COLUMNS}
                """,
                (admin_id, note, user_id),
            )
            row = cur.fetchone()
            if row is None:
                self._missing_or_decided(cur, user_id)
        request = _row_to_request(row)
        return request, [mailer.rejected(request.email, request.full_name, note)]

    @staticmethod
    def _missing_or_decided(cur, user_id: str):
        cur.execute("SELECT status FROM auth_users WHERE id=%s", (user_id,))
        found = cur.fetchone()
        if found is None:
            raise HTTPException(status_code=404, detail="User not found")
        raise _auth_error(
            status.HTTP_409_CONFLICT,
            "already_decided",
            f"This request is already {found['status']}",
        )

    # ── LGPD accountability: log access to a confidential resource ────────────
    async def log_access(
        self,
        user: UserProfile,
        resource: str,
        action: str = "access",
        ip_address: Optional[str] = None,
    ) -> None:
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

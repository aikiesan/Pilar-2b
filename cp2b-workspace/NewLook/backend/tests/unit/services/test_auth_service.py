"""
Tests for the real (DB-backed, VM-local) Authentication Service.

The service imports get_db / get_db_transaction at module scope, so these tests
monkeypatch those names directly with a self-contained fake connection — no real
database and no dependency on conftest DB mocks. Async methods are driven with
asyncio.run so the tests do not depend on pytest-asyncio mode.
"""

import asyncio
import uuid
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone

import jwt
import pytest
from fastapi import HTTPException

from app.core.config import settings
from app.models.auth import AdminCreateUser, UserLogin
from app.services import auth_service as svc_module
from app.services.auth_service import MAX_FAILED_LOGINS, AuthService


def _now():
    return datetime.now(timezone.utc)


class FakeCursor:
    def __init__(self):
        self.fetchone_queue = []
        self.fetchall_result = []
        self.executed = []

    def execute(self, sql, params=None):
        self.executed.append((sql, params))

    def fetchone(self):
        return self.fetchone_queue.pop(0) if self.fetchone_queue else None

    def fetchall(self):
        return self.fetchall_result

    def close(self):
        pass


class FakeConn:
    def __init__(self, cursor):
        self._c = cursor

    def cursor(self):
        return self._c


@pytest.fixture
def svc():
    return AuthService()


@pytest.fixture
def cursor():
    return FakeCursor()


@pytest.fixture(autouse=True)
def patch_db(monkeypatch, cursor):
    @contextmanager
    def _ctx():
        yield FakeConn(cursor)

    monkeypatch.setattr(svc_module, "get_db", _ctx)
    monkeypatch.setattr(svc_module, "get_db_transaction", _ctx)
    return cursor


def _user_row(svc, password="Password123", **over):
    row = {
        "id": uuid.uuid4(),
        "email": "user@cp2b.unicamp.br",
        "password_hash": svc.hash_password(password),
        "full_name": "Test User",
        "role": "interno",
        "clearance": 1,
        "is_active": True,
        "failed_login_count": 0,
        "locked_until": None,
        "created_at": _now(),
        "updated_at": _now(),
    }
    row.update(over)
    return row


# ── password hashing (pure) ───────────────────────────────────────────────────
def test_password_hash_and_verify(svc):
    h = svc.hash_password("Password123")
    assert h != "Password123"
    assert svc.verify_password("Password123", h) is True
    assert svc.verify_password("wrong", h) is False


# ── token issue / decode round-trip ───────────────────────────────────────────
def test_token_roundtrip_contains_claims(svc):
    row = {"id": uuid.uuid4(), "email": "a@b.com", "role": "interno", "clearance": 2}
    token = svc._issue_token(row)
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    assert payload["sub"] == str(row["id"])
    assert payload["role"] == "interno"
    assert payload["clearance"] == 2
    assert payload["jti"]
    assert payload["exp"] > payload["iat"]


# ── token verification failures (no DB needed; decode fails first) ────────────
def test_get_current_user_rejects_garbage_token(svc):
    with pytest.raises(HTTPException) as e:
        asyncio.run(svc.get_current_user("not-a-jwt"))
    assert e.value.status_code == 401


def test_get_current_user_rejects_expired_token(svc):
    token = jwt.encode(
        {"sub": str(uuid.uuid4()), "jti": str(uuid.uuid4()), "exp": _now() - timedelta(minutes=1)},
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )
    with pytest.raises(HTTPException) as e:
        asyncio.run(svc.get_current_user(token))
    assert e.value.status_code == 401


def test_get_current_user_rejects_wrong_signature(svc):
    token = jwt.encode(
        {"sub": str(uuid.uuid4()), "jti": str(uuid.uuid4()), "exp": _now() + timedelta(minutes=5)},
        "a-different-secret-key-of-sufficient-length-xx",
        algorithm="HS256",
    )
    with pytest.raises(HTTPException) as e:
        asyncio.run(svc.get_current_user(token))
    assert e.value.status_code == 401


# ── get_current_user happy path + revocation (DB) ─────────────────────────────
def test_get_current_user_valid(svc, cursor):
    row = _user_row(svc)
    token = svc._issue_token(row)
    cursor.fetchone_queue = [None, row]  # denylist miss, then user row
    profile = asyncio.run(svc.get_current_user(token))
    assert profile.email == row["email"]
    assert profile.role == "interno"
    assert profile.clearance == 1


def test_get_current_user_rejects_revoked_token(svc, cursor):
    row = _user_row(svc)
    token = svc._issue_token(row)
    cursor.fetchone_queue = [{"x": 1}]  # denylist HIT → revoked
    with pytest.raises(HTTPException) as e:
        asyncio.run(svc.get_current_user(token))
    assert e.value.status_code == 401


def test_get_current_user_inactive_user(svc, cursor):
    row = _user_row(svc, is_active=False)
    token = svc._issue_token(row)
    cursor.fetchone_queue = [None, row]
    with pytest.raises(HTTPException) as e:
        asyncio.run(svc.get_current_user(token))
    assert e.value.status_code == 401


# ── login (DB) ────────────────────────────────────────────────────────────────
def test_login_success_returns_token(svc, cursor):
    row = _user_row(svc, password="Password123")
    cursor.fetchone_queue = [row]
    resp = asyncio.run(svc.login_user(UserLogin(email=row["email"], password="Password123")))
    assert resp.token_type == "bearer"
    assert resp.user.role == "interno"
    payload = jwt.decode(resp.access_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    assert payload["sub"] == str(row["id"])


def test_login_wrong_password_raises_and_increments(svc, cursor):
    row = _user_row(svc, password="Password123", failed_login_count=0)
    cursor.fetchone_queue = [row]
    with pytest.raises(HTTPException) as e:
        asyncio.run(svc.login_user(UserLogin(email=row["email"], password="WrongPass1")))
    assert e.value.status_code == 401
    # Only UPDATE statements count — the login SELECT also mentions the column.
    assert any(
        sql.strip().startswith("UPDATE") and "failed_login_count" in sql
        for sql, _ in cursor.executed
    )


def test_login_locks_after_max_failures(svc, cursor):
    row = _user_row(svc, password="Password123", failed_login_count=MAX_FAILED_LOGINS - 1)
    cursor.fetchone_queue = [row]
    with pytest.raises(HTTPException):
        asyncio.run(svc.login_user(UserLogin(email=row["email"], password="WrongPass1")))
    upd = [
        params
        for sql, params in cursor.executed
        if sql.strip().startswith("UPDATE") and "locked_until" in sql
    ]
    assert upd and upd[0][1] is not None  # locked_until param set


def test_login_rejects_locked_account(svc, cursor):
    row = _user_row(svc, locked_until=_now() + timedelta(minutes=10))
    cursor.fetchone_queue = [row]
    with pytest.raises(HTTPException) as e:
        asyncio.run(svc.login_user(UserLogin(email=row["email"], password="Password123")))
    assert e.value.status_code == 403


def test_login_rejects_inactive_account(svc, cursor):
    row = _user_row(svc, is_active=False)
    cursor.fetchone_queue = [row]
    with pytest.raises(HTTPException) as e:
        asyncio.run(svc.login_user(UserLogin(email=row["email"], password="Password123")))
    assert e.value.status_code == 403


def test_login_unknown_email_is_401(svc, cursor):
    cursor.fetchone_queue = [None]
    with pytest.raises(HTTPException) as e:
        asyncio.run(
            svc.login_user(UserLogin(email="nobody@cp2b.unicamp.br", password="Password123"))
        )
    assert e.value.status_code == 401


# ── admin create user (DB) ────────────────────────────────────────────────────
def test_create_user_returns_profile(svc, cursor):
    created = _user_row(svc, role="autenticado", clearance=0)
    cursor.fetchone_queue = [created]
    data = AdminCreateUser(
        email=created["email"],
        password="Password123",
        full_name="Test User",
        role="autenticado",
        clearance=0,
    )
    profile = asyncio.run(svc.create_user(data))
    assert profile.email == created["email"]
    assert profile.role == "autenticado"
    assert profile.clearance == 0

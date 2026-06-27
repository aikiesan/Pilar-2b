"""
Integration tests for the Auth API endpoints (real, VM-local auth).

These exercise the HTTP layer end-to-end:
- enforcement: protected endpoints reject missing/invalid tokens;
- admin-only endpoints reject non-admins;
- a dependency-overridden happy path proves wiring without a database.

The service layer (DB-backed) is covered by tests/unit/services/test_auth_service.py.
"""
from datetime import datetime, timezone
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

# Disable slowapi response-header injection before importing the app
# (auth endpoints have no Response param; header injection would crash).
import app.middleware.rate_limit as _rl_module
_rl_module.auth_limiter._headers_enabled = False
_rl_module.login_limiter._headers_enabled = False
_rl_module.read_limiter._headers_enabled = False

from app.main import app
from app.middleware.auth import get_current_user as _get_current_user
from app.services.auth_service import auth_service
from app.models.auth import AuthResponse, UserProfile

client = TestClient(app, raise_server_exceptions=False)


def _profile(role="admin", clearance=2):
    return UserProfile(
        id="11111111-1111-1111-1111-111111111111",
        email="admin@cp2b.unicamp.br",
        full_name="CP2B Admin",
        role=role,
        clearance=clearance,
        is_active=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


@pytest.fixture(autouse=True)
def _clear_overrides():
    yield
    app.dependency_overrides.clear()


# ── enforcement: no token ─────────────────────────────────────────────────────
@pytest.mark.parametrize("method,path", [
    ("get", "/api/v1/auth/me"),
    ("get", "/api/v1/auth/verify"),
    ("get", "/api/v1/auth/users"),
    ("post", "/api/v1/auth/users"),
])
def test_protected_endpoints_require_token(method, path):
    resp = getattr(client, method)(path, json={} if method == "post" else None)
    # HTTPBearer(auto_error=True) returns 403 when the header is absent.
    assert resp.status_code in (401, 403)


def test_me_with_invalid_token_is_401():
    resp = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer not-a-real-jwt"})
    assert resp.status_code == 401


# ── login validation ──────────────────────────────────────────────────────────
def test_login_malformed_payload_is_422():
    resp = client.post("/api/v1/auth/login", json={"email": "not-an-email"})
    assert resp.status_code == 422


# ── login happy path (service patched; no DB) ─────────────────────────────────
def test_login_success_returns_token(monkeypatch):
    resp_obj = AuthResponse(access_token="signed.jwt.token", token_type="bearer", user=_profile())
    monkeypatch.setattr(auth_service, "login_user", AsyncMock(return_value=resp_obj))
    resp = client.post("/api/v1/auth/login",
                       json={"email": "admin@cp2b.unicamp.br", "password": "Password123"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["access_token"] == "signed.jwt.token"
    assert body["token_type"] == "bearer"
    assert body["user"]["role"] == "admin"
    assert body["user"]["clearance"] == 2


# ── /me happy path (dependency override; no DB) ───────────────────────────────
def test_me_returns_profile_when_authenticated():
    app.dependency_overrides[_get_current_user] = lambda: _profile(role="interno", clearance=1)
    resp = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer anything"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["role"] == "interno"
    assert body["clearance"] == 1
    for field in ("id", "email", "full_name", "role", "clearance", "is_active",
                  "created_at", "updated_at"):
        assert field in body


# ── admin endpoint rejects a non-admin ────────────────────────────────────────
def test_create_user_rejects_non_admin():
    # require_admin depends on get_current_user; override it to a non-admin.
    app.dependency_overrides[_get_current_user] = lambda: _profile(role="autenticado", clearance=0)
    resp = client.post("/api/v1/auth/users", headers={"Authorization": "Bearer anything"},
                       json={"email": "new@cp2b.unicamp.br", "password": "Password123",
                             "full_name": "New User", "role": "interno", "clearance": 1})
    assert resp.status_code == 403

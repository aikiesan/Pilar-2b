"""
Unit tests for the role/clearance authorization dependencies.

These call the dependency functions directly with a UserProfile (FastAPI would
otherwise inject `current_user` via Depends).
"""

from datetime import datetime, timezone

import pytest
from fastapi import HTTPException

from app.middleware.auth import require_admin, require_clearance, require_internal
from app.models.auth import UserProfile


def _user(role="autenticado", clearance=0):
    return UserProfile(
        id="u",
        email="u@cp2b.unicamp.br",
        full_name="U",
        role=role,
        clearance=clearance,
        is_active=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


# ── require_internal ──────────────────────────────────────────────────────────
@pytest.mark.parametrize("role", ["interno", "admin"])
def test_require_internal_allows_internal_roles(role):
    assert require_internal(_user(role=role)).role == role


@pytest.mark.parametrize("role", ["visitante", "autenticado"])
def test_require_internal_blocks_non_internal(role):
    with pytest.raises(HTTPException) as e:
        require_internal(_user(role=role))
    assert e.value.status_code == 403


# ── require_clearance ─────────────────────────────────────────────────────────
def test_require_clearance_allows_equal_or_higher():
    checker = require_clearance(2)
    assert checker(_user(clearance=2)).clearance == 2


@pytest.mark.parametrize("level,user_clearance", [(2, 1), (2, 0), (1, 0)])
def test_require_clearance_blocks_lower(level, user_clearance):
    checker = require_clearance(level)
    with pytest.raises(HTTPException) as e:
        checker(_user(clearance=user_clearance))
    assert e.value.status_code == 403


# ── require_admin ─────────────────────────────────────────────────────────────
def test_require_admin_blocks_internal():
    with pytest.raises(HTTPException) as e:
        require_admin(_user(role="interno"))
    assert e.value.status_code == 403


def test_require_admin_allows_admin():
    assert require_admin(_user(role="admin")).role == "admin"

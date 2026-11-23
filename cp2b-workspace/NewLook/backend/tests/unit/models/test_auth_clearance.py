"""Four-level clearance scale: 0 public, 1 registered, 2 partner, 3 internal."""

import pytest
from pydantic import ValidationError

from app.models.auth import AdminCreateUser

# Meets the password-strength rules (upper, lower, digit, >= 8)
PASSWORD = "Passw0rd-long"


def _make(**extra):
    return AdminCreateUser(email="a@b.co", password=PASSWORD, full_name="Ana Teste", **extra)


def test_create_user_accepts_levels_0_to_3():
    for level in (0, 1, 2, 3):
        assert _make(clearance=level).clearance == level


def test_create_user_rejects_level_4():
    with pytest.raises(ValidationError):
        _make(clearance=4)


def test_create_user_defaults_to_registered():
    assert _make().clearance == 1

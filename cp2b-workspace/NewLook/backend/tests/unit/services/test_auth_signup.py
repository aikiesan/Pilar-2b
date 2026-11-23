"""
Sign-up with approval in the auth service (migration 040).

Same fake connection as test_auth_service.py: a cursor that records every
statement and answers fetchone() from a queue. Async methods run with
asyncio.run.
"""

import asyncio
import hashlib
import re
import uuid
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone

import jwt
import pytest
from fastapi import HTTPException

from app.core.config import settings
from app.models.auth import SignupRequest, UserLogin
from app.services import auth_service as svc_module
from app.services.auth_service import AuthService

ADMIN_ID = "11111111-1111-1111-1111-111111111111"
USER_ID = "22222222-2222-2222-2222-222222222222"


def _now():
    return datetime.now(timezone.utc)


class FakeCursor:
    def __init__(self):
        self.fetchone_queue = []
        self.fetchall_result = []
        self.executed = []

    def execute(self, sql, params=None):
        self.executed.append((" ".join(sql.split()), params))

    def fetchone(self):
        return self.fetchone_queue.pop(0) if self.fetchone_queue else None

    def fetchall(self):
        return self.fetchall_result

    def close(self):
        pass

    def sql(self):
        return [s for s, _ in self.executed]


class FakeConn:
    def __init__(self, cursor):
        self._c = cursor

    def cursor(self):
        return self._c


@pytest.fixture
def svc():
    return AuthService()


@pytest.fixture
def cursor(monkeypatch):
    cur = FakeCursor()

    @contextmanager
    def _ctx():
        yield FakeConn(cur)

    monkeypatch.setattr(svc_module, "get_db", _ctx)
    monkeypatch.setattr(svc_module, "get_db_transaction", _ctx)
    return cur


def _signup(**over):
    data = {
        "email": "nova@usp.br",
        "password": "SenhaForte123",
        "full_name": "Ana Pesquisadora",
        "institution": "USP",
        "purpose": "Estudo regional de potencial de biogás",
        "accept_terms": True,
    }
    data.update(over)
    return SignupRequest(**data)


def _token_from(mail):
    found = re.search(r"token=([A-Za-z0-9_\-]+)", mail.text)
    assert found, mail.text
    return found.group(1)


def _stored_hash(cursor):
    inserts = [p for s, p in cursor.executed if s.startswith("INSERT INTO auth_email_tokens")]
    assert len(inserts) == 1
    return inserts[0]


# ── sign-up ───────────────────────────────────────────────────────────────────
def test_signup_creates_a_pending_account_and_mails_a_link_stored_only_as_hash(svc, cursor):
    cursor.fetchone_queue = [None, {"id": USER_ID}]
    mails = asyncio.run(svc.signup(_signup()))

    insert = next(s for s in cursor.sql() if s.startswith("INSERT INTO auth_users"))
    assert "'pending_email'" in insert and "'autenticado', 0" in insert
    assert len(mails) == 1 and mails[0].to == "nova@usp.br"
    token = _token_from(mails[0])
    user_id, kind, token_hash, expires_at = _stored_hash(cursor)
    assert kind == "verify_email" and user_id == USER_ID
    assert token_hash == hashlib.sha256(token.encode()).hexdigest()
    assert token not in str(cursor.executed)  # the token itself never reaches the DB
    assert timedelta(hours=47) < expires_at - _now() <= timedelta(hours=48)


def test_signup_for_an_existing_account_sends_nothing(svc, cursor):
    cursor.fetchone_queue = [{"id": USER_ID, "full_name": "A", "status": "approved"}]
    assert asyncio.run(svc.signup(_signup())) == []
    assert not any(s.startswith("INSERT") for s in cursor.sql())


def test_signup_again_while_unconfirmed_sends_a_fresh_link_and_retires_the_old(svc, cursor):
    cursor.fetchone_queue = [{"id": USER_ID, "full_name": "Ana", "status": "pending_email"}]
    mails = asyncio.run(svc.signup(_signup()))
    assert len(mails) == 1
    assert cursor.sql()[1].startswith("UPDATE auth_email_tokens SET used_at=now()")
    assert not any(s.startswith("INSERT INTO auth_users") for s in cursor.sql())


@pytest.mark.parametrize(
    "over",
    [
        {"password": "Curta1A"},  # under 10
        {"password": "semmaiusculas123"},
        {"accept_terms": False},
        {"purpose": "curto"},
        {"institution": ""},
    ],
)
def test_signup_validation(over):
    with pytest.raises(ValueError):
        _signup(**over)


# ── e-mail confirmation ───────────────────────────────────────────────────────
def _token_row(**over):
    row = {
        "token_id": 7,
        "user_id": USER_ID,
        "expires_at": _now() + timedelta(hours=1),
        "used_at": None,
        "email": "nova@usp.br",
        "full_name": "Ana <script>",
        "status": "pending_email",
        "institution": "USP",
        "purpose": "Estudo",
        "email_verified_at": None,
    }
    row.update(over)
    return row


def test_verify_email_moves_the_request_to_review_and_tells_the_admin(svc, cursor, monkeypatch):
    monkeypatch.setattr(settings, "ADMIN_NOTIFY_EMAIL", "admin@example.org")
    cursor.fetchone_queue = [_token_row()]
    account_status, mails = asyncio.run(svc.verify_email("x" * 43))
    assert account_status == "pending_review"
    assert any("status='pending_review'" in s for s in cursor.sql())
    assert any(
        s.startswith("UPDATE auth_email_tokens SET used_at=now() WHERE id") for s in cursor.sql()
    )
    assert [m.to for m in mails] == ["admin@example.org"]
    assert "&lt;script&gt;" in mails[0].html and "<script>" not in mails[0].html


def test_verify_email_without_admin_address_still_moves_on(svc, cursor, monkeypatch):
    monkeypatch.setattr(settings, "ADMIN_NOTIFY_EMAIL", "")
    cursor.fetchone_queue = [_token_row()]
    assert asyncio.run(svc.verify_email("x" * 43)) == ("pending_review", [])


@pytest.mark.parametrize(
    "row",
    [
        None,
        _token_row(expires_at=_now() - timedelta(minutes=1)),
        _token_row(used_at=_now()),  # used, but the address never got confirmed (retired link)
    ],
)
def test_verify_email_refuses_unknown_expired_or_retired_links(svc, cursor, row):
    cursor.fetchone_queue = [row]
    with pytest.raises(HTTPException) as e:
        asyncio.run(svc.verify_email("x" * 43))
    assert e.value.status_code == 400 and e.value.detail["code"] == "invalid_token"


def test_second_click_on_the_link_says_where_the_request_stands(svc, cursor):
    cursor.fetchone_queue = [
        _token_row(used_at=_now(), email_verified_at=_now(), status="pending_review")
    ]
    assert asyncio.run(svc.verify_email("x" * 43)) == ("pending_review", [])
    assert not any(s.startswith("UPDATE") for s in cursor.sql())


# ── password reset ────────────────────────────────────────────────────────────
def test_forgot_password_mails_only_an_approved_active_account(svc, cursor):
    cursor.fetchone_queue = [
        {"id": USER_ID, "full_name": "Ana", "status": "approved", "is_active": True}
    ]
    mails = asyncio.run(svc.forgot_password("nova@usp.br"))
    assert len(mails) == 1 and "/reset-password?token=" in mails[0].text
    _, kind, _, expires_at = _stored_hash(cursor)
    assert kind == "reset_password" and expires_at - _now() <= timedelta(hours=1)


@pytest.mark.parametrize(
    "row",
    [
        None,
        {"id": USER_ID, "full_name": "A", "status": "pending_review", "is_active": True},
        {"id": USER_ID, "full_name": "A", "status": "approved", "is_active": False},
    ],
)
def test_forgot_password_sends_nothing_otherwise(svc, cursor, row):
    cursor.fetchone_queue = [row]
    assert asyncio.run(svc.forgot_password("nova@usp.br")) == []


def test_reset_password_sets_the_new_hash_and_unlocks(svc, cursor):
    cursor.fetchone_queue = [_token_row(status="approved")]
    asyncio.run(svc.reset_password("y" * 43, "NovaSenha456"))
    sql, params = next(
        (s, p) for s, p in cursor.executed if s.startswith("UPDATE auth_users SET password_hash")
    )
    assert "locked_until=NULL" in sql
    assert svc.verify_password("NovaSenha456", params[0])


def test_reset_password_refuses_an_expired_link(svc, cursor):
    cursor.fetchone_queue = [_token_row(expires_at=_now() - timedelta(seconds=1))]
    with pytest.raises(HTTPException) as e:
        asyncio.run(svc.reset_password("y" * 43, "NovaSenha456"))
    assert e.value.status_code == 400
    assert not any("password_hash" in s for s in cursor.sql())


# ── the admin's decision ──────────────────────────────────────────────────────
def _request_row(**over):
    row = {
        "id": USER_ID,
        "email": "nova@usp.br",
        "full_name": "Ana",
        "institution": "USP",
        "purpose": "Estudo",
        "status": "approved",
        "clearance": 2,
        "created_at": _now(),
        "email_verified_at": _now(),
        "reviewed_at": _now(),
        "review_note": None,
    }
    row.update(over)
    return row


def test_approve_sets_the_chosen_level_and_mails_the_login_link(svc, cursor):
    cursor.fetchone_queue = [_request_row()]
    request, mails = asyncio.run(svc.approve_request(USER_ID.upper(), 2, ADMIN_ID))
    sql, params = cursor.executed[0]
    assert "status='approved', clearance=%s" in sql and "status <> 'approved'" in sql
    assert params == (2, ADMIN_ID, USER_ID)  # canonical id
    assert request.clearance == 2
    assert len(mails) == 1 and "/pt-BR/login" in mails[0].text


def test_approving_twice_is_a_conflict_and_an_unknown_id_is_404(svc, cursor):
    cursor.fetchone_queue = [None, {"status": "approved"}]
    with pytest.raises(HTTPException) as e:
        asyncio.run(svc.approve_request(USER_ID, 1, ADMIN_ID))
    assert e.value.status_code == 409
    cursor.fetchone_queue = [None, None]
    with pytest.raises(HTTPException) as e:
        asyncio.run(svc.approve_request(USER_ID, 1, ADMIN_ID))
    assert e.value.status_code == 404
    with pytest.raises(HTTPException) as e:
        asyncio.run(svc.approve_request("nope", 1, ADMIN_ID))
    assert e.value.status_code == 404


def test_reject_keeps_the_reason_and_mails_it(svc, cursor):
    cursor.fetchone_queue = [_request_row(status="rejected", review_note="Fora do escopo")]
    request, mails = asyncio.run(svc.reject_request(USER_ID, "  Fora do escopo ", ADMIN_ID))
    sql, params = cursor.executed[0]
    assert "status IN ('pending_email', 'pending_review')" in sql
    assert params == (ADMIN_ID, "Fora do escopo", USER_ID)
    assert "Motivo: Fora do escopo" in mails[0].text


def test_reject_without_a_reason_stores_none(svc, cursor):
    cursor.fetchone_queue = [_request_row(status="rejected")]
    asyncio.run(svc.reject_request(USER_ID, "   ", ADMIN_ID))
    assert cursor.executed[0][1] == (ADMIN_ID, None, USER_ID)


# ── sign-in and sessions for accounts not approved ────────────────────────────
def _login_row(svc, status_value, password="Password123"):
    return {
        "id": uuid.uuid4(),
        "email": "nova@usp.br",
        "password_hash": svc.hash_password(password),
        "full_name": "Ana",
        "role": "autenticado",
        "clearance": 0,
        "status": status_value,
        "is_active": True,
        "failed_login_count": 0,
        "locked_until": None,
        "created_at": _now(),
        "updated_at": _now(),
    }


@pytest.mark.parametrize(
    "status_value,code",
    [
        ("pending_email", "email_not_verified"),
        ("pending_review", "pending_review"),
        ("rejected", "rejected"),
    ],
)
def test_login_with_the_right_password_explains_the_status(svc, cursor, status_value, code):
    cursor.fetchone_queue = [_login_row(svc, status_value)]
    with pytest.raises(HTTPException) as e:
        asyncio.run(svc.login_user(UserLogin(email="nova@usp.br", password="Password123")))
    assert e.value.status_code == 403 and e.value.detail["code"] == code


def test_login_with_a_wrong_password_never_reveals_the_status(svc, cursor):
    cursor.fetchone_queue = [_login_row(svc, "pending_review")]
    with pytest.raises(HTTPException) as e:
        asyncio.run(svc.login_user(UserLogin(email="nova@usp.br", password="Wrong123")))
    assert e.value.status_code == 401 and e.value.detail["code"] == "invalid_credentials"


def test_session_of_an_account_no_longer_approved_is_refused(svc, cursor):
    token = svc._issue_token(
        {"id": USER_ID, "email": "a@b.c", "role": "autenticado", "clearance": 1}
    )
    row = {
        "id": USER_ID,
        "email": "a@b.c",
        "full_name": "A",
        "role": "autenticado",
        "clearance": 1,
        "is_active": True,
        "status": "rejected",
        "created_at": _now(),
        "updated_at": _now(),
    }
    cursor.fetchone_queue = [None, row]  # not on the denylist, then the user
    with pytest.raises(HTTPException) as e:
        asyncio.run(svc.get_current_user(token))
    assert e.value.status_code == 401


def test_sessions_last_seven_days(svc):
    token = svc._issue_token(
        {"id": USER_ID, "email": "a@b.c", "role": "autenticado", "clearance": 1}
    )
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    assert payload["exp"] - payload["iat"] == 7 * 24 * 3600


def test_admin_created_accounts_start_approved(svc, cursor):
    from app.models.auth import AdminCreateUser

    cursor.fetchone_queue = [
        {
            "id": USER_ID,
            "email": "x@y.z",
            "full_name": "X",
            "role": "autenticado",
            "clearance": 1,
            "is_active": True,
            "status": "approved",
            "created_at": _now(),
            "updated_at": _now(),
        }
    ]
    user = asyncio.run(
        svc.create_user(
            AdminCreateUser(email="x@y.z", password="Password123", full_name="Xavier"),
            created_by=ADMIN_ID,
        )
    )
    assert "'approved', now()" in cursor.sql()[0]
    assert user.status == "approved"

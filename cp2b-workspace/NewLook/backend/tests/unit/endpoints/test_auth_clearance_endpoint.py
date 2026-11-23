"""PATCH /auth/users/{id}/clearance and the user list's last_login_at."""

import os
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone

import psycopg2
import pytest
from fastapi.testclient import TestClient
from psycopg2.extras import RealDictCursor

from app.middleware.auth import get_current_user
from app.models.auth import UserProfile
from app.services import auth_service as auth_module

ADMIN_ID = "11111111-1111-1111-1111-111111111111"
USER_ID = "22222222-2222-2222-2222-222222222222"
NOW = datetime(2026, 1, 1, tzinfo=timezone.utc)
LOGIN = datetime(2026, 2, 3, 4, 5, tzinfo=timezone.utc)


def _profile(role="admin", uid=ADMIN_ID):
    return UserProfile(
        id=uid, email="a@example.com", full_name="A", role=role, clearance=3,
        created_at=NOW, updated_at=NOW,
    )  # fmt: skip


def _user_row(**kw):
    row = {
        "id": USER_ID,
        "email": "u@example.com",
        "full_name": "U",
        "role": "autenticado",
        "clearance": 1,
        "is_active": True,
        "created_at": NOW,
        "updated_at": NOW,
        "last_login_at": LOGIN,
    }
    row.update(kw)
    return row


class _Cursor:
    def __init__(self, rows):
        self.rows, self.calls = rows, []

    def execute(self, sql, params=None):
        self.calls.append((" ".join(sql.split()), params))

    def fetchone(self):
        return self.rows[0] if self.rows else None

    def fetchall(self):
        return self.rows

    def close(self):
        pass


@pytest.fixture
def api(test_app, monkeypatch):
    holder = {"cursor": _Cursor([])}

    class _Conn:
        def cursor(self, cursor_factory=None):
            return holder["cursor"]

    @contextmanager
    def fake_db():
        yield _Conn()

    monkeypatch.setattr(auth_module, "get_db", fake_db)
    monkeypatch.setattr(auth_module, "get_db_transaction", fake_db)
    test_app.dependency_overrides[get_current_user] = lambda: _profile()
    yield TestClient(test_app, base_url="http://testserver"), holder
    test_app.dependency_overrides.clear()


def test_set_clearance_returns_the_profile_and_writes_it(api):
    client, holder = api
    holder["cursor"] = _Cursor([_user_row(clearance=2)])
    resp = client.patch(f"/api/v1/auth/users/{USER_ID}/clearance", json={"clearance": 2})
    assert resp.status_code == 200
    body = resp.json()
    assert body["id"] == USER_ID and body["clearance"] == 2
    sql, params = holder["cursor"].calls[0]
    assert sql.startswith("UPDATE auth_users SET clearance=%s, updated_at=now()")
    assert params == (2, USER_ID)


@pytest.mark.parametrize("body", [{"clearance": 4}, {"clearance": -1}, {}, {"clearance": "x"}])
def test_set_clearance_rejects_out_of_range(api, body):
    client, holder = api
    resp = client.patch(f"/api/v1/auth/users/{USER_ID}/clearance", json=body)
    assert resp.status_code == 422 and holder["cursor"].calls == []


def test_set_clearance_404_for_unknown_or_malformed_user(api):
    client, holder = api
    assert (
        client.patch(f"/api/v1/auth/users/{USER_ID}/clearance", json={"clearance": 1}).status_code
        == 404
    )
    holder["cursor"] = _Cursor([])
    assert (
        client.patch("/api/v1/auth/users/nope/clearance", json={"clearance": 1}).status_code == 404
    )
    assert holder["cursor"].calls == []  # a bad id never reaches the database


def test_admin_cannot_change_their_own_clearance(api):
    client, holder = api
    resp = client.patch(f"/api/v1/auth/users/{ADMIN_ID}/clearance", json={"clearance": 1})
    assert resp.status_code == 400 and holder["cursor"].calls == []


def test_own_id_in_another_spelling_is_still_refused(api):
    client, holder = api
    for spelled in (ADMIN_ID.upper(), f"urn:uuid:{ADMIN_ID}"):
        resp = client.patch(f"/api/v1/auth/users/{spelled}/clearance", json={"clearance": 1})
        assert resp.status_code == 400
    assert holder["cursor"].calls == []


def test_clearance_queries_use_the_canonical_id(api):
    client, holder = api
    holder["cursor"] = _Cursor([_user_row(clearance=2)])
    resp = client.patch(
        f"/api/v1/auth/users/urn:uuid:{USER_ID.upper()}/clearance", json={"clearance": 2}
    )
    assert resp.status_code == 200
    assert holder["cursor"].calls[0][1] == (2, USER_ID)


def test_non_admin_gets_403(api, test_app):
    client, holder = api
    test_app.dependency_overrides[get_current_user] = lambda: _profile("interno", "other")
    resp = client.patch(f"/api/v1/auth/users/{USER_ID}/clearance", json={"clearance": 1})
    assert resp.status_code == 403 and holder["cursor"].calls == []


def test_list_users_includes_last_login(api):
    client, holder = api
    holder["cursor"] = _Cursor([_user_row(), _user_row(id=ADMIN_ID, last_login_at=None)])
    resp = client.get("/api/v1/auth/users")
    assert resp.status_code == 200
    body = resp.json()
    assert body[0]["last_login_at"].startswith("2026-02-03T04:05")
    assert body[1]["last_login_at"] is None
    assert "last_login_at" in holder["cursor"].calls[0][0]


@pytest.mark.database
def test_set_clearance_takes_effect_next_request(test_app, monkeypatch):
    url = os.getenv("TEST_DATABASE_URL")
    if not url:
        pytest.skip("Needs TEST_DATABASE_URL")
    conn = psycopg2.connect(url, cursor_factory=RealDictCursor)  # as the app's pool does
    uid = str(uuid.uuid4())

    @contextmanager
    def real_db():
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise

    monkeypatch.setattr(auth_module, "get_db", real_db)
    monkeypatch.setattr(auth_module, "get_db_transaction", real_db)
    try:
        cur = conn.cursor()
        cur.execute(
            """INSERT INTO auth_users (id, email, password_hash, full_name, role, clearance)
               VALUES (%s, %s, 'x', 'T', 'autenticado', 1)""",
            (uid, f"{uid}@t6.example.com"),
        )
        conn.commit()
        test_app.dependency_overrides[get_current_user] = lambda: _profile()
        client = TestClient(test_app, base_url="http://testserver")
        resp = client.patch(f"/api/v1/auth/users/{uid}/clearance", json={"clearance": 3})
        assert resp.status_code == 200 and resp.json()["clearance"] == 3
        listed = [u for u in client.get("/api/v1/auth/users").json() if u["id"] == uid]
        assert listed[0]["clearance"] == 3 and listed[0]["last_login_at"] is None
        cur.execute("SELECT clearance FROM auth_users WHERE id = %s", (uid,))
        assert cur.fetchone()["clearance"] == 3
    finally:
        test_app.dependency_overrides.clear()
        conn.rollback()
        conn.cursor().execute("DELETE FROM auth_users WHERE id = %s", (uid,))
        conn.commit()
        conn.close()

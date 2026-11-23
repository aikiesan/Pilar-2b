"""/admin/analyses: levels, opening dates and grants, admin only, never cached.

Unit tests use a scripted fake cursor (what the SQL says is checked through
what it was sent); one database-backed test runs the real SQL end to end
against the scratch database and leaves no rows behind.
"""

import os
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone

import psycopg2
import pytest
from fastapi.testclient import TestClient

from app.api.v1.endpoints import admin_analyses, analyses
from app.middleware.auth import get_current_user, optional_auth
from app.middleware.no_store import no_store_middleware
from app.models.auth import UserProfile

NO_STORE = "private, no-store"
BASE = "/api/v1/admin/analyses"
ADMIN_ID = "11111111-1111-1111-1111-111111111111"
USER_ID = "22222222-2222-2222-2222-222222222222"
NOW = datetime(2026, 1, 1, tzinfo=timezone.utc)

# The six admin routes: (method, path, json body).
ROUTES = [
    ("GET", BASE, None),
    ("PATCH", f"{BASE}/demo_xy", {"level": 1}),
    ("GET", f"{BASE}/demo_xy/grants", None),
    ("PUT", f"{BASE}/demo_xy/grants/{USER_ID}", {}),
    ("DELETE", f"{BASE}/demo_xy/grants/{USER_ID}", None),
    ("PATCH", f"/api/v1/auth/users/{USER_ID}/clearance", {"clearance": 2}),
]


def _profile(role="admin", uid=ADMIN_ID, clearance=3):
    return UserProfile(
        id=uid,
        email="t@example.com",
        full_name="T",
        role=role,
        clearance=clearance,
        created_at=NOW,
        updated_at=NOW,
    )


class _Cursor:
    """Returns scripted rows: `answers` maps a SQL fragment to a list of rows."""

    def __init__(self, answers=None):
        self.answers = answers or {}
        self.calls = []  # (sql, params)
        self.rows = []

    def execute(self, sql, params=None):
        self.calls.append((" ".join(sql.split()), params))
        self.rows = []
        for fragment, rows in self.answers.items():
            if fragment in sql:
                self.rows = list(rows)
                break

    def fetchall(self):
        return self.rows

    def fetchone(self):
        return self.rows[0] if self.rows else None

    def close(self):
        pass

    def sent(self, fragment):
        return [(s, p) for s, p in self.calls if fragment in s]


@pytest.fixture
def api(test_app, monkeypatch):
    """Client signed in as `role`; `cursor` is the fake the endpoints talk to."""
    cursor = _Cursor()

    class _Conn:
        def cursor(self, cursor_factory=None):
            return cursor

    @contextmanager
    def fake_db():
        yield _Conn()

    monkeypatch.setattr(admin_analyses, "get_db", fake_db)
    monkeypatch.setattr(admin_analyses, "get_db_transaction", fake_db)
    client = TestClient(test_app, base_url="http://testserver")

    def as_role(role="admin"):
        test_app.dependency_overrides[get_current_user] = lambda: _profile(role)
        return client

    yield as_role, cursor, client, test_app
    test_app.dependency_overrides.clear()


# --- who may call ----------------------------------------------------------


@pytest.mark.parametrize("method,path,body", ROUTES)
def test_non_admin_gets_403_on_every_admin_route(api, method, path, body):
    as_role, cursor, _, _ = api
    resp = as_role("interno").request(method, path, json=body)
    assert resp.status_code == 403
    assert cursor.calls == []


@pytest.mark.parametrize("method,path,body", ROUTES)
def test_no_token_gets_401_on_every_admin_route(api, method, path, body):
    _, cursor, client, _ = api
    resp = client.request(method, path, json=body)
    assert resp.status_code == 401
    assert cursor.calls == []


# --- GET list --------------------------------------------------------------


def test_list_shape_and_counts(api):
    as_role, cursor, _, _ = api
    row = {
        "id": "demo_xy",
        "title_pt": "Demo",
        "level": 3,
        "opens_at": None,
        "is_active": True,
        "municipalities": 7,
        "grants": 2,
    }
    cursor.answers = {"FROM analyses a": [row]}
    resp = as_role().get(BASE)
    assert resp.status_code == 200
    assert resp.headers["cache-control"] == NO_STORE
    assert resp.json() == [row]
    sql = cursor.calls[0][0]
    assert "c.cell IS NOT NULL" in sql  # municipalities: only classified cells
    assert "expires_at IS NULL OR g.expires_at > now()" in sql  # unexpired grants only
    assert sql.endswith("ORDER BY a.id")


# --- PATCH analysis --------------------------------------------------------


def test_patch_level_records_who_and_when(api):
    as_role, cursor, _, _ = api
    cursor.answers = {
        "UPDATE analyses": [
            {"id": "demo_xy", "title_pt": "D", "level": 2, "opens_at": None, "is_active": True}
        ]
    }
    resp = as_role().patch(f"{BASE}/demo_xy", json={"level": 2})
    assert resp.status_code == 200
    assert resp.json()["level"] == 2
    assert resp.headers["cache-control"] == NO_STORE
    sql, params = cursor.sent("UPDATE analyses")[0]
    assert "level = %s" in sql and "updated_by = %s" in sql and "updated_at = now()" in sql
    set_part = sql.split(" WHERE ")[0]
    assert "opens_at" not in set_part and "is_active" not in set_part  # only what was sent
    assert params == [2, ADMIN_ID, "demo_xy"]


def test_patch_clears_opens_at_with_null_and_sets_date(api):
    as_role, cursor, _, _ = api
    cursor.answers = {"UPDATE analyses": [{"id": "demo_xy"}]}
    client = as_role()
    assert client.patch(f"{BASE}/demo_xy", json={"opens_at": None}).status_code == 200
    assert cursor.sent("UPDATE")[0][1] == [None, ADMIN_ID, "demo_xy"]
    resp = client.patch(
        f"{BASE}/demo_xy", json={"opens_at": "2027-03-01T12:00:00-03:00", "is_active": False}
    )
    assert resp.status_code == 200
    when = cursor.sent("UPDATE")[1][1][0]
    assert when.utcoffset() is not None and when.year == 2027
    assert cursor.sent("UPDATE")[1][1][1] is False


@pytest.mark.parametrize(
    "body",
    [
        {},
        {"level": 4},
        {"level": -1},
        {"level": None},
        {"is_active": None},
        {"opens_at": "2027-03-01T12:00:00"},  # no offset
        {"opens_at": "2027-03-01"},  # date only: no offset either
        {"opens_at": "not a date"},
        {"level": "high"},
    ],
)
def test_patch_rejects_level_4_and_bad_dates(api, body):
    as_role, cursor, _, _ = api
    resp = as_role().patch(f"{BASE}/demo_xy", json=body)
    assert resp.status_code == 422  # its header is the middleware's job, tested below
    assert cursor.calls == []


def test_patch_unknown_or_malformed_id_is_404(api):
    as_role, cursor, _, _ = api
    client = as_role()
    assert client.patch(f"{BASE}/nope", json={"level": 1}).status_code == 404  # no row returned
    assert client.patch(f"{BASE}/Bad-Id", json={"level": 1}).status_code == 404
    assert len(cursor.calls) == 1  # the malformed one never reached the database


# --- grants ----------------------------------------------------------------

GRANT_ROW = {
    "user_id": USER_ID,
    "full_name": "Pessoa",
    "email": "p@example.com",
    "granted_by_name": "Admin",
    "granted_at": NOW,
    "expires_at": None,
    "note": None,
}
GRANT_KEYS = {
    "user_id",
    "full_name",
    "email",
    "granted_by_name",
    "granted_at",
    "expires_at",
    "note",
}


def test_list_grants_shape_and_404(api):
    as_role, cursor, _, _ = api
    cursor.answers = {
        "SELECT 1 AS ok FROM analyses": [{"ok": 1}],
        "FROM analysis_grants g": [GRANT_ROW],
    }
    body = as_role().get(f"{BASE}/demo_xy/grants").json()
    assert len(body) == 1 and set(body[0]) == GRANT_KEYS
    cursor.answers = {}
    resp = as_role().get(f"{BASE}/nope/grants")
    assert resp.status_code == 404 and resp.headers["cache-control"] == NO_STORE


def test_put_grant_upserts_with_admin_as_granter(api):
    as_role, cursor, _, _ = api
    cursor.answers = {
        "FROM analyses": [{"ok": 1}],
        "FROM auth_users WHERE": [{"ok": 1}],
        "FROM analysis_grants g": [GRANT_ROW],
    }
    resp = as_role().put(
        f"{BASE}/demo_xy/grants/{USER_ID}",
        json={"expires_at": "2027-01-01T00:00:00Z", "note": "parceiro X"},
    )
    assert resp.status_code == 200
    assert set(resp.json()) == GRANT_KEYS
    assert resp.headers["cache-control"] == NO_STORE
    sql, params = cursor.sent("INSERT INTO analysis_grants")[0]
    assert "ON CONFLICT (analysis_id, user_id) DO UPDATE" in sql
    assert params[:3] == ("demo_xy", USER_ID, ADMIN_ID)
    assert params[3].utcoffset() is not None and params[4] == "parceiro X"


def test_put_grant_is_idempotent_and_updates_expiry(api):
    as_role, cursor, _, _ = api
    cursor.answers = {
        "FROM analyses": [{"ok": 1}],
        "FROM auth_users WHERE": [{"ok": 1}],
        "FROM analysis_grants g": [GRANT_ROW],
    }
    client = as_role()
    url = f"{BASE}/demo_xy/grants/{USER_ID}"
    assert client.put(url, json={"expires_at": "2027-01-01T00:00:00Z"}).status_code == 200
    assert client.put(url, json={"expires_at": None, "note": "x"}).status_code == 200
    assert client.put(url).status_code == 200  # empty body: a grant that never expires
    inserts = cursor.sent("INSERT INTO analysis_grants")
    assert len(inserts) == 3 and all("DO UPDATE" in s for s, _ in inserts)
    assert inserts[1][1][3] is None and inserts[2][1][3:] == (None, None)
    assert (
        "expires_at = EXCLUDED.expires_at" in inserts[0][0]
        and "note = EXCLUDED.note" in inserts[0][0]
    )


@pytest.mark.parametrize(
    "body",
    [{"expires_at": "2027-01-01T00:00:00"}, {"note": "x" * 201}, {"expires_at": "soon"}],
)
def test_put_grant_rejects_naive_dates_and_long_notes(api, body):
    as_role, cursor, _, _ = api
    resp = as_role().put(f"{BASE}/demo_xy/grants/{USER_ID}", json=body)
    assert resp.status_code == 422 and cursor.calls == []
    assert (
        as_role().put(f"{BASE}/demo_xy/grants/{USER_ID}", json={"note": "x" * 200}).status_code
        != 422
    )


def test_put_grant_404_for_unknown_analysis_user_or_bad_ids(api):
    as_role, cursor, _, _ = api
    client = as_role()
    url = f"{BASE}/demo_xy/grants/{USER_ID}"
    assert client.put(url, json={}).status_code == 404  # analysis missing
    cursor.answers = {"FROM analyses": [{"ok": 1}]}
    resp = client.put(url, json={})
    assert resp.status_code == 404 and resp.json()["detail"] == "User not found"
    assert not cursor.sent("INSERT")
    n = len(cursor.calls)
    assert client.put(f"{BASE}/demo_xy/grants/not-a-uuid", json={}).status_code == 404
    assert client.put(f"{BASE}/BAD/grants/{USER_ID}", json={}).status_code == 404
    assert len(cursor.calls) == n


def test_delete_grant_204_then_404(api):
    as_role, cursor, _, _ = api
    client = as_role()
    url = f"{BASE}/demo_xy/grants/{USER_ID}"
    cursor.answers = {"DELETE FROM analysis_grants": [{"ok": 1}]}
    resp = client.delete(url)
    assert resp.status_code == 204 and resp.content == b""
    assert resp.headers["cache-control"] == NO_STORE
    cursor.answers = {}
    resp = client.delete(url)
    assert resp.status_code == 404 and resp.headers["cache-control"] == NO_STORE


def test_grant_routes_canonicalise_the_user_id(api):
    as_role, cursor, _, _ = api
    client = as_role()
    spelled = f"urn:uuid:{USER_ID.upper()}"
    cursor.answers = {
        "FROM analyses": [{"ok": 1}],
        "FROM auth_users WHERE": [{"ok": 1}],
        "FROM analysis_grants g": [GRANT_ROW],
        "DELETE FROM analysis_grants": [{"ok": 1}],
    }
    assert client.put(f"{BASE}/demo_xy/grants/{spelled}", json={}).status_code == 200
    assert cursor.sent("INSERT INTO analysis_grants")[0][1][1] == USER_ID
    assert cursor.sent("FROM auth_users WHERE")[0][1] == (USER_ID,)
    assert client.delete(f"{BASE}/demo_xy/grants/{spelled}").status_code == 204
    assert cursor.sent("DELETE FROM analysis_grants")[0][1] == ("demo_xy", USER_ID)


# --- the Cache-Control middleware -------------------------------------------


def test_main_app_registers_the_no_store_middleware():
    from app.main import app

    assert any(m.kwargs.get("dispatch") is no_store_middleware for m in app.user_middleware)


@pytest.fixture
def wrapped(api):
    """The same app, wrapped the way main.py wraps it."""
    as_role, cursor, _, test_app = api
    test_app.middleware("http")(no_store_middleware)
    return as_role, cursor, TestClient(test_app, base_url="http://testserver")


def test_middleware_covers_422_and_404_and_auth_errors(wrapped):
    as_role, _, client = wrapped
    as_role()
    assert client.patch(f"{BASE}/demo_xy", json={}).status_code == 422
    assert client.patch(f"{BASE}/demo_xy", json={}).headers["cache-control"] == NO_STORE
    resp = client.patch(f"{BASE}/nope", json={"level": 1})
    assert resp.status_code == 404 and resp.headers["cache-control"] == NO_STORE
    as_role("autenticado")
    resp = client.get(BASE)
    assert resp.status_code == 403 and resp.headers["cache-control"] == NO_STORE


def test_middleware_covers_paths_and_overrides_the_handler(wrapped):
    _, _, client = wrapped
    for path in (
        "/api/v1/analyses",
        "/api/v1/analyses/nope",
        BASE,  # no token: 401
        f"/api/v1/auth/users/{USER_ID}/clearance",  # wrong method: 405
    ):
        assert client.get(path).headers["cache-control"] == NO_STORE, path
    # Other paths are left alone.
    assert client.get("/health").headers.get("cache-control") != NO_STORE
    assert client.get("/api/v1/auth/users/x/active").headers.get("cache-control") != NO_STORE


def test_middleware_turns_unhandled_errors_into_a_no_store_500(api, monkeypatch):
    _, _, _, test_app = api
    test_app.middleware("http")(no_store_middleware)

    def boom():
        raise RuntimeError("boom")

    monkeypatch.setattr(analyses, "get_db", boom)
    test_app.dependency_overrides[optional_auth] = lambda: None
    resp = TestClient(test_app, base_url="http://testserver").get("/api/v1/analyses")
    assert resp.status_code == 500
    assert resp.headers["cache-control"] == NO_STORE
    assert "boom" not in resp.text


# --- database-backed: the real SQL, end to end -------------------------------


@pytest.fixture
def real_db(test_app, monkeypatch):
    url = os.getenv("TEST_DATABASE_URL")
    if not url:
        pytest.skip("Needs TEST_DATABASE_URL")
    conn = psycopg2.connect(url)

    @contextmanager
    def real_get_db():
        yield conn

    @contextmanager
    def real_get_db_transaction():
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise

    for mod in (analyses, admin_analyses):
        monkeypatch.setattr(mod, "get_db", real_get_db)
    monkeypatch.setattr(admin_analyses, "get_db_transaction", real_get_db_transaction)
    created = {"users": [], "analyses": []}
    try:
        yield conn, created
    finally:
        conn.rollback()
        cur = conn.cursor()
        cur.execute("DELETE FROM analyses WHERE id = ANY(%s)", (created["analyses"],))
        cur.execute("DELETE FROM auth_users WHERE id = ANY(%s::uuid[])", (created["users"],))
        conn.commit()
        conn.close()
        test_app.dependency_overrides.clear()


@pytest.mark.database
def test_admin_sets_level_and_grant_and_viewer_follows(real_db, test_app):
    conn, created = real_db
    cur = conn.cursor()
    admin_id, viewer_id = str(uuid.uuid4()), str(uuid.uuid4())
    created["users"] += [admin_id, viewer_id]
    for uid, role in ((admin_id, "admin"), (viewer_id, "autenticado")):
        cur.execute(
            """INSERT INTO auth_users (id, email, password_hash, full_name, role, clearance)
               VALUES (%s, %s, 'x', %s, %s, 1)""",
            (uid, f"{uid}@t6.example.com", f"Pessoa {role}", role),
        )
    created["analyses"].append("t6_demo")
    cur.execute(
        """INSERT INTO analyses (id, title_pt, title_en, question_pt, question_en,
               x_label_pt, x_label_en, y_label_pt, y_label_en, x_method, y_method,
               answer_cell, uf_prefixes, level)
           VALUES ('t6_demo','t','t','q','q','x','x','y','y','tertile','tertile',0,%s,0)""",
        (["35"],),
    )
    cur.execute(
        "INSERT INTO analysis_classes (analysis_id, ibge_code, cell) VALUES"
        " ('t6_demo','3500001',4), ('t6_demo','3500002',NULL)"
    )
    conn.commit()

    client = TestClient(test_app, base_url="http://testserver")
    as_admin = _profile("admin", admin_id)
    viewer = _profile("autenticado", viewer_id, clearance=1)

    def as_(user):
        test_app.dependency_overrides[get_current_user] = lambda: user
        test_app.dependency_overrides[optional_auth] = lambda: user

    def viewer_status():
        as_(viewer)
        return client.get("/api/v1/analyses/t6_demo").status_code

    as_(as_admin)
    assert viewer_status() == 200  # level 0: open to everyone

    as_(as_admin)
    resp = client.patch(f"{BASE}/t6_demo", json={"level": 3})
    assert resp.status_code == 200 and resp.json()["level"] == 3
    cur.execute("SELECT updated_by::text FROM analyses WHERE id = 't6_demo'")
    assert cur.fetchone()[0] == admin_id
    conn.rollback()
    assert viewer_status() == 404

    as_(as_admin)
    listed = [a for a in client.get(BASE).json() if a["id"] == "t6_demo"][0]
    assert listed["level"] == 3 and listed["municipalities"] == 1 and listed["grants"] == 0

    url = f"{BASE}/t6_demo/grants/{viewer_id}"
    resp = client.put(url, json={"note": "parceiro", "expires_at": "2099-01-01T00:00:00Z"})
    assert resp.status_code == 200
    assert resp.json()["granted_by_name"] == "Pessoa admin" and resp.json()["note"] == "parceiro"
    assert client.put(url, json={"note": "novo"}).json()["note"] == "novo"  # upsert
    assert [g["user_id"] for g in client.get(f"{BASE}/t6_demo/grants").json()] == [viewer_id]
    assert [a for a in client.get(BASE).json() if a["id"] == "t6_demo"][0]["grants"] == 1
    assert viewer_status() == 200

    as_(as_admin)
    assert client.delete(url).status_code == 204
    assert client.delete(url).status_code == 404
    assert viewer_status() == 404

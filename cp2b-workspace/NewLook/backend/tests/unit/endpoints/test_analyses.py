"""/analyses and /analyses/{id}: only what the viewer may see, never cached.

Unit tests use a fake database that applies the visibility rule from the SQL
parameters; one database-backed test proves the real SQL end to end.
"""

import os
import uuid
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone

import psycopg2
import pytest
from fastapi.testclient import TestClient

from app.api.v1.endpoints import analyses
from app.middleware.auth import optional_auth
from app.models.auth import UserProfile

NO_STORE = "private, no-store"
META_KEYS = {
    "id",
    "title",
    "question",
    "source",
    "x_label",
    "y_label",
    "answer_cell",
    "x_invert",
    "y_invert",
    "layers",
    "uf_prefixes",
}


def _row(aid, level, **kw):
    row = {
        "id": aid,
        "title_pt": f"Título {aid}",
        "title_en": f"Title {aid}",
        "question_pt": "Pergunta?",
        "question_en": "Question?",
        "source_pt": "Fonte",
        "source_en": "Source",
        "x_label_pt": "X pt",
        "x_label_en": "X en",
        "y_label_pt": "Y pt",
        "y_label_en": "Y en",
        "answer_cell": 2,
        "layers": ["a", "b"],
        "uf_prefixes": ["35", "31"],
        "level": level,
        "opens_at": None,
        "is_active": True,
        "x_invert": False,
        "y_invert": False,
        # Columns that must never reach the client.
        "x_method": "tertile",
        "y_method": "tertile",
    }
    row.update(kw)
    return row


ROWS = [_row("demo_xy", 0), _row("hidden_one", 3), _row("granted_one", 3)]
CLASSES = {
    "demo_xy": [
        ("3543402", 0),
        ("3543403", 0),
        ("3543404", 8),
        ("3543405", None),
        ("3106200", 4),
        ("3106201", None),
        ("3106202", None),
    ]
}
BREAKS = {
    "demo_xy": [
        ("35", "x", 1.5, 3.5),
        ("35", "y", 10.0, 20.0),
        ("31", "x", None, None),
        # 31/y missing altogether
    ]
}


class _Cursor:
    """Answers the three queries; applies the visibility rule from params."""

    def __init__(self, grants=()):
        self.grants = set(grants)  # (analysis_id, user_id)
        self.rows = []
        self.queries = []

    def execute(self, sql, params=None):
        self.queries.append(sql)
        if "FROM analyses a" in sql:
            self.rows = self._visible(sql, params)
        elif "FROM analysis_classes" in sql:
            self.rows = [{"ibge_code": c, "cell": k} for c, k in CLASSES.get(params[0], [])]
        elif "FROM analysis_breaks" in sql:
            self.rows = [
                {"uf_prefix": u, "axis": a, "b1": b1, "b2": b2}
                for u, a, b1, b2 in BREAKS.get(params[0], [])
            ]
        else:
            raise AssertionError(f"unexpected query: {sql}")

    def _visible(self, sql, params):
        params = list(params)
        wanted = params.pop() if "a.id = %s" in sql else None
        now = datetime.now(timezone.utc)

        def allowed(r):
            if "WHERE TRUE" in sql:  # admin
                return True
            if not r["is_active"]:
                return False
            level = params[0]
            uid = params[1] if "analysis_grants" in sql else None
            opened = r["opens_at"] is not None and r["opens_at"] <= now
            return (0 if opened else r["level"]) <= level or (r["id"], uid) in self.grants

        return [
            r
            for r in sorted(ROWS, key=lambda r: r["id"])
            if allowed(r) and (wanted is None or r["id"] == wanted)
        ]

    def fetchall(self):
        return self.rows

    def fetchone(self):
        return self.rows[0] if self.rows else None

    def close(self):
        pass


def _user(clearance=0, role="autenticado", uid="u1"):
    return UserProfile(
        id=uid,
        email="t@example.com",
        full_name="T",
        role=role,
        clearance=clearance,
        created_at=datetime(2025, 1, 1, tzinfo=timezone.utc),
        updated_at=datetime(2025, 1, 1, tzinfo=timezone.utc),
    )


def _fake_db(monkeypatch, cursor):
    class _Conn:
        def cursor(self, cursor_factory=None):
            return cursor

    @contextmanager
    def fake_db():
        yield _Conn()

    monkeypatch.setattr(analyses, "get_db", fake_db)


@pytest.fixture
def api(test_app, monkeypatch):
    cursor = _Cursor(grants={("granted_one", "u1")})
    _fake_db(monkeypatch, cursor)
    client = TestClient(test_app, base_url="http://testserver")

    def as_user(user):
        test_app.dependency_overrides[optional_auth] = lambda: user
        return client

    yield as_user, cursor
    test_app.dependency_overrides.clear()


LIST = "/api/v1/analyses"


def test_list_hides_what_the_viewer_cannot_see(api):
    as_user, _ = api
    body = as_user(None).get(LIST).json()
    assert [a["id"] for a in body["analyses"]] == ["demo_xy"]
    body = as_user(_user(clearance=3)).get(LIST).json()
    assert [a["id"] for a in body["analyses"]] == ["demo_xy", "granted_one", "hidden_one"]
    body = as_user(_user(clearance=0)).get(LIST).json()
    assert [a["id"] for a in body["analyses"]] == ["demo_xy", "granted_one"]


def test_list_never_leaks_level_or_dates(api):
    as_user, _ = api
    body = as_user(_user(clearance=3)).get(LIST).json()
    assert set(body) == {"analyses"}
    for item in body["analyses"]:
        assert set(item) == META_KEYS
    first = body["analyses"][0]
    assert first["title"] == {"pt": "Título demo_xy", "en": "Title demo_xy"}
    assert first["layers"] == ["a", "b"] and first["uf_prefixes"] == ["35", "31"]
    assert first["x_invert"] is False and first["y_invert"] is False


def test_detail_404_for_hidden_and_for_missing_alike(api):
    as_user, _ = api
    client = as_user(None)
    hidden = client.get(f"{LIST}/hidden_one")
    missing = client.get(f"{LIST}/nope")
    malformed = client.get(f"{LIST}/Bad-Id")
    assert hidden.status_code == missing.status_code == malformed.status_code == 404
    assert hidden.json() == missing.json() == malformed.json()
    assert set(hidden.headers) == set(missing.headers) == set(malformed.headers)
    assert hidden.headers["cache-control"] == missing.headers["cache-control"] == NO_STORE


def test_detail_serves_cells_and_breaks_not_values(api):
    as_user, cursor = api
    body = as_user(None).get(f"{LIST}/demo_xy").json()
    assert set(body) == {"id", "cells", "breaks", "counts", "no_data"}
    assert body["cells"]["3543402"] == 0 and body["cells"]["3543405"] is None
    assert body["breaks"] == {
        "35": {"x": [1.5, 3.5], "y": [10.0, 20.0]},
        "31": {"x": None, "y": None},
    }
    assert body["counts"]["35"] == [2, 0, 0, 0, 0, 0, 0, 0, 1]
    assert body["counts"]["31"] == [0, 0, 0, 0, 1, 0, 0, 0, 0]
    assert body["no_data"] == {"35": 1, "31": 2}
    assert not any("analysis_values" in q for q in cursor.queries)


def test_detail_hidden_then_granted(api):
    as_user, _ = api
    assert as_user(_user(uid="other")).get(f"{LIST}/granted_one").status_code == 404
    assert as_user(_user(uid="u1")).get(f"{LIST}/granted_one").status_code == 200


def test_every_response_is_private_no_store(api):
    as_user, _ = api
    client = as_user(None)
    for url in (LIST, f"{LIST}/demo_xy", f"{LIST}/hidden_one", f"{LIST}/nope", f"{LIST}/A!"):
        assert client.get(url).headers["cache-control"] == NO_STORE, url


def test_invalid_token_is_anonymous_and_still_no_store(test_app, monkeypatch):
    # No override: the real optional_auth must treat a bad token as anonymous.
    _fake_db(monkeypatch, _Cursor())
    client = TestClient(test_app, base_url="http://testserver")
    resp = client.get(LIST, headers={"Authorization": "Bearer not-a-token"})
    assert resp.status_code == 200
    assert [a["id"] for a in resp.json()["analyses"]] == ["demo_xy"]
    assert resp.headers["cache-control"] == NO_STORE


def test_malformed_id_is_404_and_never_reaches_the_database(api):
    as_user, cursor = api
    client = as_user(None)
    assert client.get(f"{LIST}/" + "a" * 41).status_code == 404
    assert client.get(f"{LIST}/UPPER").status_code == 404
    assert cursor.queries == []


# --- database-backed: the real SQL through the real endpoints ---------------


@pytest.fixture
def real_db(test_app, monkeypatch):
    url = os.getenv("TEST_DATABASE_URL")
    if not url:
        pytest.skip("Needs TEST_DATABASE_URL")
    conn = psycopg2.connect(url)

    @contextmanager
    def real_get_db():
        yield conn

    monkeypatch.setattr(analyses, "get_db", real_get_db)
    try:
        yield conn
    finally:
        conn.rollback()  # nothing is ever committed
        conn.close()
        test_app.dependency_overrides.clear()


def _seed(cur, aid, level):
    cur.execute(
        """INSERT INTO analyses (id, title_pt, title_en, question_pt, question_en,
               x_label_pt, x_label_en, y_label_pt, y_label_en, x_method, y_method,
               answer_cell, uf_prefixes, level)
           VALUES (%s,'t','t','q','q','x','x','y','y','tertile','tertile',0,%s,%s)""",
        (aid, ["35"], level),
    )
    cur.execute(
        "INSERT INTO analysis_classes (analysis_id, ibge_code, cell) VALUES (%s,'3500001',4)",
        (aid,),
    )
    cur.execute(
        "INSERT INTO analysis_breaks (analysis_id, uf_prefix, axis, b1, b2)"
        " VALUES (%s,'35','x',1,2)",
        (aid,),
    )


@pytest.mark.database
def test_revoked_grant_hides_on_next_request(real_db, test_app):
    cur = real_db.cursor()
    uid = str(uuid.uuid4())
    cur.execute(
        """INSERT INTO auth_users (id, email, password_hash, full_name, role, clearance)
           VALUES (%s,%s,'x','T','autenticado',1)""",
        (uid, f"{uid}@t5.example.com"),
    )
    _seed(cur, "t5_open", 0)
    _seed(cur, "t5_secret", 3)
    _seed(cur, "t5_granted", 3)
    cur.execute(
        "INSERT INTO analysis_grants (analysis_id, user_id, expires_at)"
        " VALUES ('t5_granted', %s, %s)",
        (uid, datetime.now(timezone.utc) + timedelta(days=1)),
    )

    client = TestClient(test_app, base_url="http://testserver")
    user = _user(clearance=1, uid=uid)

    def ids(who):
        test_app.dependency_overrides[optional_auth] = lambda: who
        body = client.get(LIST).json()
        return {a["id"] for a in body["analyses"] if a["id"].startswith("t5_")}

    assert ids(None) == {"t5_open"}
    assert ids(user) == {"t5_open", "t5_granted"}
    detail = client.get(f"{LIST}/t5_granted")
    assert detail.status_code == 200
    assert detail.json()["counts"]["35"][4] == 1
    assert detail.json()["breaks"]["35"]["x"] == [1.0, 2.0]
    assert client.get(f"{LIST}/t5_secret").status_code == 404

    cur.execute("DELETE FROM analysis_grants WHERE analysis_id = 't5_granted'")
    assert ids(user) == {"t5_open"}
    assert client.get(f"{LIST}/t5_granted").status_code == 404
    assert client.get(f"{LIST}/t5_granted").json() == client.get(f"{LIST}/nope").json()

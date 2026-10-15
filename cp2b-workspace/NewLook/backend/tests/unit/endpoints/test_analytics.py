"""First-party page views: only the fields the statistics need, no query string,
no full referrer URL, retention enforced, and a summary for admins only. The
anonymous totals take no identifier at all and keep only daily sums."""

from datetime import date, datetime, timezone

import pytest
from fastapi.testclient import TestClient

from app.api.v1.endpoints import analytics
from app.middleware.auth import require_admin
from app.middleware.rate_limit import read_limiter
from app.models.auth import UserProfile

VISITOR = "0b6d9f2e-1c3a-4e5b-8f7a-9d0c1b2a3e4f"
SESSION = "6a7b8c9d-0e1f-4a2b-9c3d-4e5f6a7b8c9d"


def _view(**fields):
    view = {
        "visitor_id": VISITOR,
        "session_id": SESSION,
        "path": "/map",
        "locale": "pt-BR",
        "referrer_host": "www.google.com",
        "device": "desktop",
    }
    view.update(fields)
    return view


@pytest.fixture
def api(test_app, monkeypatch):
    read_limiter.reset()
    monkeypatch.setattr(analytics, "_last_purge", date.today())  # purge tested on its own
    yield TestClient(test_app, raise_server_exceptions=False)
    test_app.dependency_overrides.clear()


@pytest.fixture
def cursor(mock_db_connection):
    return mock_db_connection[1]


def _inserted(cursor):
    inserts = [c for c in cursor.execute.call_args_list if "INSERT" in str(c.args[0])]
    assert len(inserts) == 1
    return inserts[0].args[1]


def test_a_page_view_is_recorded(api, cursor):
    response = api.post("/api/v1/analytics/pageview", json=_view())

    assert response.status_code == 204
    assert _inserted(cursor) == (VISITOR, SESSION, "/map", "pt-BR", "www.google.com", "desktop")


def test_the_query_string_and_fragment_are_never_kept(api, cursor):
    api.post("/api/v1/analytics/pageview", json=_view(path="/login?email=ana@example.org#x"))

    assert _inserted(cursor)[2] == "/login"


def test_a_referrer_that_is_not_a_bare_host_is_dropped(api, cursor):
    api.post("/api/v1/analytics/pageview", json=_view(referrer_host="https://x.org/?q=ana"))

    assert _inserted(cursor)[4] is None


@pytest.mark.parametrize(
    "fields",
    [
        {"path": "javascript:alert(1)"},
        {"path": "/<script>"},
        {"device": "smart-fridge"},
        {"locale": "fr"},
        {"visitor_id": "not-a-uuid"},
    ],
)
def test_bad_input_is_rejected_before_the_database(api, cursor, fields):
    assert api.post("/api/v1/analytics/pageview", json=_view(**fields)).status_code == 422
    cursor.execute.assert_not_called()


def test_old_page_views_are_deleted_once_a_day(api, cursor, monkeypatch):
    monkeypatch.setattr(analytics, "_last_purge", None)

    api.post("/api/v1/analytics/pageview", json=_view())
    api.post("/api/v1/analytics/pageview", json=_view())

    deletes = [c for c in cursor.execute.call_args_list if "DELETE" in str(c.args[0])]
    assert len(deletes) == 1
    assert deletes[0].args[1] == (analytics.settings.ANALYTICS_RETENTION_DAYS,)


def test_a_database_error_answers_a_fixed_message(api, cursor):
    cursor.execute.side_effect = Exception('relation "analytics_pageviews" does not exist')

    response = api.post("/api/v1/analytics/pageview", json=_view())

    assert response.status_code == 500
    assert response.json() == {"detail": "Could not record the page view"}



# ── anonymous totals (every visitor, no identifier) ──────────────────────────
def _hit(**fields):
    hit = {
        "path": "/map",
        "locale": "pt-BR",
        "device": "desktop",
        "entry": True,
        "referrer_host": "www.google.com",
    }
    hit.update(fields)
    return hit


def _the_insert(cursor):
    inserts = [c for c in cursor.execute.call_args_list if "INSERT" in str(c.args[0])]
    assert len(inserts) == 1
    return inserts[0].args[0], inserts[0].args[1]


def test_an_anonymous_view_adds_one_to_the_day(api, cursor):
    response = api.post("/api/v1/analytics/hit", json=_hit())

    assert response.status_code == 204
    query, params = _the_insert(cursor)
    assert "INTO analytics_page_counts" in query
    assert "views = analytics_page_counts.views + 1" in query
    assert params == ("/map", "pt-BR", "desktop", True, "www.google.com")


def test_only_the_page_that_opened_the_visit_keeps_the_referring_site(api, cursor):
    api.post("/api/v1/analytics/hit", json=_hit(entry=False))

    assert _the_insert(cursor)[1][3:] == (False, "")


def test_an_anonymous_view_keeps_no_identifier_even_when_sent_one(api, cursor):
    api.post("/api/v1/analytics/hit", json=_hit(visitor_id=VISITOR, session_id=SESSION))

    query, params = _the_insert(cursor)
    assert "visitor" not in query and "session" not in query
    assert VISITOR not in params and SESSION not in params


def test_a_visit_with_no_referring_site_is_counted_as_direct(api, cursor):
    api.post("/api/v1/analytics/hit", json=_hit(referrer_host=None))
    assert _the_insert(cursor)[1][4] == ""

    cursor.execute.reset_mock()
    api.post("/api/v1/analytics/hit", json=_hit(referrer_host="https://x.org/?q=ana"))
    assert _the_insert(cursor)[1][4] == ""


def test_an_anonymous_view_drops_the_query_string(api, cursor):
    api.post("/api/v1/analytics/hit", json=_hit(path="/login?email=ana@example.org#x"))

    assert _the_insert(cursor)[1][0] == "/login"


@pytest.mark.parametrize(
    "fields",
    [{"path": "javascript:alert(1)"}, {"device": "smart-fridge"}, {"locale": "fr"}],
)
def test_bad_anonymous_input_is_rejected_before_the_database(api, cursor, fields):
    assert api.post("/api/v1/analytics/hit", json=_hit(**fields)).status_code == 422
    cursor.execute.assert_not_called()


def test_visible_time_adds_to_the_day(api, cursor):
    response = api.post("/api/v1/analytics/time", json={"path": "/map", "seconds": 42})

    assert response.status_code == 204
    query, params = _the_insert(cursor)
    assert "INTO analytics_page_time" in query
    assert "seconds = analytics_page_time.seconds + EXCLUDED.seconds" in query
    assert params == ("/map", 42)


def test_one_measurement_counts_at_most_half_an_hour(api, cursor):
    api.post("/api/v1/analytics/time", json={"path": "/map", "seconds": 2 * 60 * 60})

    assert _the_insert(cursor)[1] == ("/map", analytics.MAX_VISIBLE_SECONDS)


@pytest.mark.parametrize("seconds", [0, -5, 10**6])
def test_an_impossible_visible_time_is_rejected(api, cursor, seconds):
    response = api.post("/api/v1/analytics/time", json={"path": "/map", "seconds": seconds})

    assert response.status_code == 422
    cursor.execute.assert_not_called()


def test_an_anonymous_count_error_answers_a_fixed_message(api, cursor):
    cursor.execute.side_effect = Exception('relation "analytics_page_counts" does not exist')

    response = api.post("/api/v1/analytics/hit", json=_hit())

    assert response.status_code == 500
    assert response.json() == {"detail": "Could not count the page view"}

# ── admin summary ─────────────────────────────────────────────────────────────
def _admin():
    now = datetime.now(timezone.utc)
    return UserProfile(
        id="11111111-1111-1111-1111-111111111111",
        email="admin@cp2b.unicamp.br",
        full_name="CP2B Admin",
        role="admin",
        clearance=2,
        is_active=True,
        created_at=now,
        updated_at=now,
    )


def test_the_summary_needs_an_admin(api, cursor):
    assert api.get("/api/v1/analytics/summary").status_code in (401, 403)
    cursor.execute.assert_not_called()


def test_an_admin_reads_the_summary(api, cursor, test_app):
    test_app.dependency_overrides[require_admin] = _admin
    cursor.fetchone.return_value = {"views": 12, "visitors": 5, "sessions": 7}
    cursor.fetchall.side_effect = [
        [{"day": date(2026, 9, 24), "views": 12, "visitors": 5}],
        [{"key": "/map", "views": 9, "visitors": 5}],
        [{"key": "pt-BR", "views": 10, "visitors": 4}],
        [{"key": "desktop", "views": 12, "visitors": 5}],
        [],
    ]

    response = api.get("/api/v1/analytics/summary?days=7")

    assert response.status_code == 200
    body = response.json()
    assert (body["days"], body["views"], body["visitors"], body["sessions"]) == (7, 12, 5, 7)
    assert body["pages"] == [{"key": "/map", "views": 9, "visitors": 5}]
    assert body["per_day"][0]["day"] == "2026-09-24"
    assert body["referrers"] == []


def test_the_summary_window_is_bounded(api, cursor, test_app):
    test_app.dependency_overrides[require_admin] = _admin
    assert api.get("/api/v1/analytics/summary?days=0").status_code == 422
    assert api.get("/api/v1/analytics/summary?days=1000").status_code == 422

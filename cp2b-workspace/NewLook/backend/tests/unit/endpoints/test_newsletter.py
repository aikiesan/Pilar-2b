"""Newsletter sign-ups: stored only with consent, one answer for every address,
unsubscribe by token, and an admin export that is logged and spreadsheet-safe."""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.api.v1.endpoints import newsletter
from app.middleware.auth import require_admin
from app.middleware.rate_limit import auth_limiter, read_limiter
from app.models.auth import UserProfile

EMAIL = "ana@example.org"
TOKEN = "3f2b8c1e-6d4a-4f7e-9b1a-2c5d8e9f0a1b"


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


@pytest.fixture
def api(test_app):
    auth_limiter.reset()
    read_limiter.reset()
    yield TestClient(test_app, raise_server_exceptions=False)
    test_app.dependency_overrides.clear()


@pytest.fixture
def cursor(mock_db_connection):
    return mock_db_connection[1]


def _subscribe(api, **fields):
    body = {"email": EMAIL, "locale": "en", "source": "footer", "consent": True, **fields}
    return api.post("/api/v1/newsletter/subscribe", json=body)


# ── subscribe ─────────────────────────────────────────────────────────────────
def test_a_sign_up_is_stored_with_the_notice_version(api, cursor):
    response = _subscribe(api)

    assert response.status_code == 200
    assert response.json() == {"status": "subscribed"}
    sql, params = cursor.execute.call_args.args
    assert "INSERT INTO newsletter_subscribers" in sql
    assert params == (EMAIL, "en", "footer", newsletter.CONSENT_TEXT_VERSION)


def test_signing_up_again_renews_the_consent_and_undoes_an_unsubscribe(api, cursor):
    _subscribe(api)
    sql = cursor.execute.call_args.args[0]
    # Same answer for a new and a known address: the conflict is settled in SQL.
    assert "ON CONFLICT (email) DO UPDATE" in sql
    assert "consented_at = now()" in sql
    assert "unsubscribed_at = NULL" in sql


def test_nothing_is_stored_without_consent(api, cursor):
    response = _subscribe(api, consent=False)

    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "consent_required"
    cursor.execute.assert_not_called()


@pytest.mark.parametrize(
    "fields",
    [
        {"email": "not-an-email"},
        {"source": "somewhere"},
        {"locale": "fr"},
    ],
)
def test_bad_input_is_rejected_before_the_database(api, cursor, fields):
    assert _subscribe(api, **fields).status_code == 422
    cursor.execute.assert_not_called()


def test_a_database_error_answers_a_fixed_message(api, cursor):
    cursor.execute.side_effect = Exception('connection to "db.internal" failed for user "app"')

    response = _subscribe(api)

    assert response.status_code == 500
    assert response.json()["detail"] == {
        "code": "server_error",
        "message": "Could not save the sign-up",
    }


# ── unsubscribe ───────────────────────────────────────────────────────────────
def test_the_unsubscribe_token_takes_the_address_off_the_list(api, cursor):
    cursor.fetchone.return_value = {"id": 7}

    response = api.post("/api/v1/newsletter/unsubscribe", json={"token": TOKEN})

    assert response.status_code == 200
    assert response.json() == {"status": "unsubscribed"}
    sql, params = cursor.execute.call_args.args
    assert "COALESCE(unsubscribed_at, now())" in sql  # unsubscribing twice keeps the date
    assert params == (TOKEN,)


def test_an_unknown_token_is_a_404(api, cursor):
    cursor.fetchone.return_value = None

    response = api.post("/api/v1/newsletter/unsubscribe", json={"token": TOKEN})

    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "invalid_token"


def test_a_malformed_token_is_rejected(api, cursor):
    assert api.post("/api/v1/newsletter/unsubscribe", json={"token": "x"}).status_code == 422
    cursor.execute.assert_not_called()


# ── admin list and export ─────────────────────────────────────────────────────
ROWS = [
    {
        "email": "=HYPERLINK(1)@example.org",
        "locale": "pt-BR",
        "source": "about",
        "consent_text_version": "2026-09-25",
        "consented_at": datetime(2026, 9, 25, 12, tzinfo=timezone.utc),
        "unsubscribed_at": None,
    }
]


@pytest.fixture
def as_admin(api, test_app):
    test_app.dependency_overrides[require_admin] = _admin
    with patch.object(newsletter.auth_service, "log_access", new=AsyncMock()) as log_access:
        yield log_access


def test_the_list_needs_an_admin(api, cursor):
    assert api.get("/api/v1/newsletter/subscribers").status_code in (401, 403)
    cursor.execute.assert_not_called()


def test_an_admin_lists_the_active_addresses(api, cursor, as_admin):
    cursor.fetchone.return_value = {"active": 1, "unsubscribed": 2}
    cursor.fetchall.return_value = ROWS

    response = api.get("/api/v1/newsletter/subscribers")

    assert response.status_code == 200
    body = response.json()
    assert (body["active"], body["unsubscribed"]) == (1, 2)
    assert body["subscribers"][0]["source"] == "about"
    assert cursor.execute.call_args.args[1] == (False,)  # unsubscribed left out
    as_admin.assert_awaited_once()
    assert as_admin.await_args.kwargs["action"] == "list"


def test_the_csv_export_is_logged_and_safe_to_open_in_a_spreadsheet(api, cursor, as_admin):
    cursor.fetchone.return_value = {"active": 1, "unsubscribed": 0}
    cursor.fetchall.return_value = ROWS

    response = api.get("/api/v1/newsletter/subscribers?format=csv&include_unsubscribed=true")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert "attachment" in response.headers["content-disposition"]
    header, row = response.text.splitlines()[:2]
    assert header == "email,locale,source,consent_text_version,consented_at,unsubscribed_at"
    assert row.startswith("'=HYPERLINK(1)@example.org,")  # not run as a formula
    assert cursor.execute.call_args.args[1] == (True,)
    assert as_admin.await_args.kwargs["action"] == "export"

"""
Calculator router — HTTP endpoint tests.

Covers the lead-capture submit endpoint and the LGPD data-subject
access/erasure endpoints in app/routers/calculator.py, in particular the
e-mail verification requirement added after the Round 3 review found that
GET/DELETE /leads/{lead_id} were callable by anyone on any sequential id
(see IMPROVEMENT_BACKLOG.md).

calculator_leads.id is a UUID in the real schema — these tests use UUID ids
after a live run (2026-07-09) showed the DSR endpoints 422-ing on every real
lead_id because the path param was typed as int. Likewise activity_type values
here mirror the calculator_leads_activity_type_check DB constraint.

All DB access is intercepted by the autouse mock_db_connection fixture in
conftest.py, so no real Postgres connection is needed.
"""

from datetime import datetime, timezone

import pytest

LEAD_ID = "0a0302fb-506d-47a2-9279-d0e29ae6fc54"
OTHER_LEAD_ID = "9e107d9d-372b-4c81-a0d1-91f0e5a5e1a7"


def _lead_row(lead_id=LEAD_ID, email="maria@example.com"):
    """Dict row for calculator_leads as returned by RealDictCursor."""
    return {
        "id": lead_id,
        "nome": "Maria",
        "email": email,
        "municipality_id": 1,
        "municipality_name": "Campinas",
        "consent_lgpd": True,
        "consent_text_version": "2026-06-25",
        "consented_at": datetime(2026, 6, 25, tzinfo=timezone.utc),
        "activity_type": "cattle_dairy",
        "ip_address": "203.0.113.7",
        "user_agent": "test-agent",
        "referrer": "https://example.com",
        "created_at": datetime(2026, 6, 25, tzinfo=timezone.utc),
    }


def _submission(consent=True, activity_type="cattle_dairy"):
    return {
        "lead": {
            "nome": "Maria",
            "email": "maria@example.com",
            "municipality_id": 1,
            "municipality_name": "Campinas",
            "consent_lgpd": consent,
        },
        "activity_type": activity_type,
        "quantity_input": {"type": "heads", "value": 120},
        "active_months": [1, 2, 3],
        "outputs_selected": ["biogas"],
        "calc_results": {"biogas_m3_year": 1234.5},
    }


# ─── Submit ───────────────────────────────────────────────────────────────────


@pytest.mark.unit
class TestSubmitCalculator:

    def test_submit_without_consent_is_rejected(self, client, mock_db_connection):
        _, cursor = mock_db_connection
        response = client.post("/api/v1/calculator/submit", json=_submission(consent=False))
        assert response.status_code == 403
        assert response.json()["detail"]["code"] == "LGPD_CONSENT_REQUIRED"
        cursor.execute.assert_not_called()

    def test_submit_with_consent_persists_and_returns_lead_id(self, client, mock_db_connection):
        _, cursor = mock_db_connection
        cursor.fetchone.return_value = {
            "id": LEAD_ID,
            "created_at": datetime(2026, 6, 25, tzinfo=timezone.utc),
        }
        response = client.post("/api/v1/calculator/submit", json=_submission())
        assert response.status_code == 200
        data = response.json()
        assert data["lead_id"] == LEAD_ID
        cursor.execute.assert_called_once()

    def test_submit_with_unknown_activity_type_is_422(self, client, mock_db_connection):
        """Values outside the DB check constraint must fail schema validation,
        not surface as a 500 CheckViolation from Postgres (found live 2026-07-09)."""
        _, cursor = mock_db_connection
        response = client.post(
            "/api/v1/calculator/submit", json=_submission(activity_type="cattle")
        )
        assert response.status_code == 422
        cursor.execute.assert_not_called()


# ─── Data-subject ACCESS (GET /leads/{lead_id}) ──────────────────────────────


@pytest.mark.unit
class TestGetLead:

    def test_get_lead_without_email_is_rejected(self, client, mock_db_connection):
        """lead_id alone must never be enough to read a record."""
        _, cursor = mock_db_connection
        response = client.get(f"/api/v1/calculator/leads/{LEAD_ID}")
        assert response.status_code == 422
        cursor.execute.assert_not_called()

    def test_get_lead_with_non_uuid_id_is_rejected(self, client, mock_db_connection):
        """Regression: ids are UUIDs; malformed ids must 422 before any query."""
        _, cursor = mock_db_connection
        response = client.get("/api/v1/calculator/leads/42", params={"email": "maria@example.com"})
        assert response.status_code == 422
        cursor.execute.assert_not_called()

    def test_get_lead_with_matching_email_returns_record(self, client, mock_db_connection):
        _, cursor = mock_db_connection
        cursor.fetchone.return_value = _lead_row()
        response = client.get(
            f"/api/v1/calculator/leads/{LEAD_ID}", params={"email": "maria@example.com"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == LEAD_ID
        assert data["email"] == "maria@example.com"

    def test_get_lead_email_is_passed_to_sql_filter(self, client, mock_db_connection):
        """The e-mail must be part of the WHERE clause, not checked after the fact."""
        _, cursor = mock_db_connection
        cursor.fetchone.return_value = _lead_row()
        client.get(f"/api/v1/calculator/leads/{LEAD_ID}", params={"email": " Maria@Example.com "})
        sql, params = cursor.execute.call_args[0]
        assert "LOWER(email) = LOWER(%s)" in sql
        assert params == (LEAD_ID, "Maria@Example.com")

    def test_get_lead_with_wrong_email_returns_404(self, client, mock_db_connection):
        """Wrong e-mail must look exactly like a nonexistent lead_id."""
        _, cursor = mock_db_connection
        cursor.fetchone.return_value = None
        response = client.get(
            f"/api/v1/calculator/leads/{LEAD_ID}", params={"email": "attacker@evil.com"}
        )
        assert response.status_code == 404

    def test_get_lead_nonexistent_id_returns_404(self, client, mock_db_connection):
        _, cursor = mock_db_connection
        cursor.fetchone.return_value = None
        response = client.get(
            f"/api/v1/calculator/leads/{OTHER_LEAD_ID}", params={"email": "maria@example.com"}
        )
        assert response.status_code == 404


# ─── Data-subject ERASURE (DELETE /leads/{lead_id}) ──────────────────────────


@pytest.mark.unit
class TestDeleteLead:

    def test_delete_lead_without_email_is_rejected(self, client, mock_db_connection):
        _, cursor = mock_db_connection
        response = client.delete(f"/api/v1/calculator/leads/{LEAD_ID}")
        assert response.status_code == 422
        cursor.execute.assert_not_called()

    def test_delete_lead_with_non_uuid_id_is_rejected(self, client, mock_db_connection):
        """Regression: ids are UUIDs; malformed ids must 422 before any query."""
        _, cursor = mock_db_connection
        response = client.delete(
            "/api/v1/calculator/leads/42", params={"email": "maria@example.com"}
        )
        assert response.status_code == 422
        cursor.execute.assert_not_called()

    def test_delete_lead_with_matching_email_deletes(self, client, mock_db_connection):
        _, cursor = mock_db_connection
        cursor.fetchone.return_value = {"id": LEAD_ID}
        response = client.delete(
            f"/api/v1/calculator/leads/{LEAD_ID}", params={"email": "maria@example.com"}
        )
        assert response.status_code == 200
        assert response.json() == {"lead_id": LEAD_ID, "deleted": True}

    def test_delete_lead_email_is_part_of_delete_where_clause(self, client, mock_db_connection):
        _, cursor = mock_db_connection
        cursor.fetchone.return_value = {"id": LEAD_ID}
        client.delete(f"/api/v1/calculator/leads/{LEAD_ID}", params={"email": "maria@example.com"})
        sql, params = cursor.execute.call_args[0]
        assert "DELETE FROM calculator_leads" in sql
        assert "LOWER(email) = LOWER(%s)" in sql
        assert params == (LEAD_ID, "maria@example.com")

    def test_delete_lead_with_wrong_email_deletes_nothing(self, client, mock_db_connection):
        """Wrong e-mail must look exactly like a nonexistent lead_id."""
        _, cursor = mock_db_connection
        cursor.fetchone.return_value = None
        response = client.delete(
            f"/api/v1/calculator/leads/{LEAD_ID}", params={"email": "attacker@evil.com"}
        )
        assert response.status_code == 200
        assert response.json() == {"lead_id": LEAD_ID, "deleted": False}

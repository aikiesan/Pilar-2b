"""
Calculator router — HTTP endpoint tests.

Covers the lead-capture submit endpoint and the LGPD data-subject
access/erasure endpoints in app/routers/calculator.py, in particular the
e-mail verification requirement added after the Round 3 review found that
GET/DELETE /leads/{lead_id} were callable by anyone on any sequential id
(see IMPROVEMENT_BACKLOG.md).

All DB access is intercepted by the autouse mock_db_connection fixture in
conftest.py, so no real Postgres connection is needed.
"""

from datetime import datetime, timezone

import pytest


def _lead_row(lead_id=42, email="maria@example.com"):
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
        "activity_type": "dairy_cattle",
        "ip_address": "203.0.113.7",
        "user_agent": "test-agent",
        "referrer": "https://example.com",
        "created_at": datetime(2026, 6, 25, tzinfo=timezone.utc),
    }


def _submission(consent=True):
    return {
        "lead": {
            "nome": "Maria",
            "email": "maria@example.com",
            "municipality_id": 1,
            "municipality_name": "Campinas",
            "consent_lgpd": consent,
        },
        "activity_type": "dairy_cattle",
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
            "id": 42,
            "created_at": datetime(2026, 6, 25, tzinfo=timezone.utc),
        }
        response = client.post("/api/v1/calculator/submit", json=_submission())
        assert response.status_code == 200
        data = response.json()
        assert data["lead_id"] == "42"
        cursor.execute.assert_called_once()


# ─── Data-subject ACCESS (GET /leads/{lead_id}) ──────────────────────────────


@pytest.mark.unit
class TestGetLead:

    def test_get_lead_without_email_is_rejected(self, client, mock_db_connection):
        """lead_id alone must never be enough — it's an enumerable integer."""
        _, cursor = mock_db_connection
        response = client.get("/api/v1/calculator/leads/42")
        assert response.status_code == 422
        cursor.execute.assert_not_called()

    def test_get_lead_with_matching_email_returns_record(self, client, mock_db_connection):
        _, cursor = mock_db_connection
        cursor.fetchone.return_value = _lead_row()
        response = client.get("/api/v1/calculator/leads/42", params={"email": "maria@example.com"})
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == 42
        assert data["email"] == "maria@example.com"

    def test_get_lead_email_is_passed_to_sql_filter(self, client, mock_db_connection):
        """The e-mail must be part of the WHERE clause, not checked after the fact."""
        _, cursor = mock_db_connection
        cursor.fetchone.return_value = _lead_row()
        client.get("/api/v1/calculator/leads/42", params={"email": " Maria@Example.com "})
        sql, params = cursor.execute.call_args[0]
        assert "LOWER(email) = LOWER(%s)" in sql
        assert params == (42, "Maria@Example.com")

    def test_get_lead_with_wrong_email_returns_404(self, client, mock_db_connection):
        """Wrong e-mail must look exactly like a nonexistent lead_id."""
        _, cursor = mock_db_connection
        cursor.fetchone.return_value = None
        response = client.get("/api/v1/calculator/leads/42", params={"email": "attacker@evil.com"})
        assert response.status_code == 404

    def test_get_lead_nonexistent_id_returns_404(self, client, mock_db_connection):
        _, cursor = mock_db_connection
        cursor.fetchone.return_value = None
        response = client.get(
            "/api/v1/calculator/leads/999999", params={"email": "maria@example.com"}
        )
        assert response.status_code == 404


# ─── Data-subject ERASURE (DELETE /leads/{lead_id}) ──────────────────────────


@pytest.mark.unit
class TestDeleteLead:

    def test_delete_lead_without_email_is_rejected(self, client, mock_db_connection):
        _, cursor = mock_db_connection
        response = client.delete("/api/v1/calculator/leads/42")
        assert response.status_code == 422
        cursor.execute.assert_not_called()

    def test_delete_lead_with_matching_email_deletes(self, client, mock_db_connection):
        _, cursor = mock_db_connection
        cursor.fetchone.return_value = {"id": 42}
        response = client.delete(
            "/api/v1/calculator/leads/42", params={"email": "maria@example.com"}
        )
        assert response.status_code == 200
        assert response.json() == {"lead_id": "42", "deleted": True}

    def test_delete_lead_email_is_part_of_delete_where_clause(self, client, mock_db_connection):
        _, cursor = mock_db_connection
        cursor.fetchone.return_value = {"id": 42}
        client.delete("/api/v1/calculator/leads/42", params={"email": "maria@example.com"})
        sql, params = cursor.execute.call_args[0]
        assert "DELETE FROM calculator_leads" in sql
        assert "LOWER(email) = LOWER(%s)" in sql
        assert params == (42, "maria@example.com")

    def test_delete_lead_with_wrong_email_deletes_nothing(self, client, mock_db_connection):
        """Wrong e-mail must look exactly like a nonexistent lead_id."""
        _, cursor = mock_db_connection
        cursor.fetchone.return_value = None
        response = client.delete(
            "/api/v1/calculator/leads/42", params={"email": "attacker@evil.com"}
        )
        assert response.status_code == 200
        assert response.json() == {"lead_id": "42", "deleted": False}

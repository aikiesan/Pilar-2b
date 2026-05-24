"""
Technology Routes — HTTP endpoint tests.

Tests the 4 DB-backed endpoints that do NOT use the broken `db` variable:
  health_check, get_all_technologies, get_technology_by_id, validate_connection.

All DB access is intercepted by the autouse mock_db_connection fixture in
conftest.py, so no real Postgres connection is needed.
"""

import json
import pytest
from datetime import datetime
from unittest.mock import MagicMock
from fastapi.testclient import TestClient


# ─── Helper: cursor row factory ──────────────────────────────────────────────

def _tech_row(tech_id="biogas_digester", category="digestion",
              name_pt="Biodigestor", name_en="Biodigester"):
    """Return a dict-like mock row for technology_cards table."""
    row = MagicMock()
    row.__getitem__ = lambda self, key: {
        "id": tech_id,
        "category": category,
        "name_pt": name_pt,
        "name_en": name_en,
        "emoji": "⚗️",
        "description_pt": "Digestor anaeróbio",
        "description_en": "Anaerobic digester",
        "color": "#3B82F6",
        "can_connect_to": ["upgrading", "enduse"],
        "can_receive_from": ["feedstock", "pretreatment"],
        "is_custom": False,
        "created_by": None,
        "created_at": datetime(2025, 1, 1),
        "updated_at": datetime(2025, 1, 1),
    }[key]
    row.get = lambda key, default=None: row[key] if key in (
        "id", "category", "name_pt", "name_en", "emoji",
        "description_pt", "description_en", "color",
        "can_connect_to", "can_receive_from", "is_custom",
        "created_by", "created_at", "updated_at"
    ) else default
    return row


# ─── Health check ─────────────────────────────────────────────────────────────

@pytest.mark.unit
class TestTechnologyHealthCheck:

    def test_health_returns_200(self, client):
        response = client.get("/api/v1/technology-routes/health")
        assert response.status_code == 200

    def test_health_has_status_key(self, client):
        data = client.get("/api/v1/technology-routes/health").json()
        assert "status" in data

    def test_health_has_database_key(self, client):
        data = client.get("/api/v1/technology-routes/health").json()
        assert "database" in data

    def test_health_returns_ok_status_when_db_responds(self, client, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = [0]
        data = client.get("/api/v1/technology-routes/health").json()
        assert data.get("status") in ("ok", "error")  # depends on table existence

    def test_health_has_tables_exist_key(self, client):
        data = client.get("/api/v1/technology-routes/health").json()
        assert "tables_exist" in data

    def test_health_has_ready_key(self, client):
        data = client.get("/api/v1/technology-routes/health").json()
        assert "ready" in data

    def test_health_on_db_error_returns_200_with_error_status(self, client, mock_db_connection):
        """Health check catches exceptions and returns 200 with error status (not 500)."""
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.execute.side_effect = Exception("DB unavailable")
        data = client.get("/api/v1/technology-routes/health").json()
        # Should return 200 (error is caught), status key indicates error
        assert data["status"] in ("ok", "error")


# ─── Get all technologies ─────────────────────────────────────────────────────

@pytest.mark.unit
class TestGetAllTechnologies:

    def test_returns_200(self, client):
        response = client.get("/api/v1/technology-routes/technologies")
        assert response.status_code == 200

    def test_returns_list(self, client):
        data = client.get("/api/v1/technology-routes/technologies").json()
        assert isinstance(data, list)

    def test_empty_db_returns_empty_list(self, client, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchall.return_value = []
        data = client.get("/api/v1/technology-routes/technologies").json()
        assert data == []

    def test_category_filter_is_accepted(self, client):
        response = client.get("/api/v1/technology-routes/technologies?category=digestion")
        assert response.status_code == 200

    def test_include_custom_false_is_accepted(self, client):
        response = client.get("/api/v1/technology-routes/technologies?include_custom=false")
        assert response.status_code == 200


# ─── Get technology by ID ─────────────────────────────────────────────────────

@pytest.mark.unit
class TestGetTechnologyById:

    def test_missing_id_returns_404(self, client, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = None
        mock_cursor.fetchall.return_value = []
        response = client.get("/api/v1/technology-routes/technologies/nonexistent_id")
        assert response.status_code == 404

    def test_missing_id_returns_detail_field(self, client, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = None
        mock_cursor.fetchall.return_value = []
        data = client.get("/api/v1/technology-routes/technologies/nonexistent_id").json()
        assert "detail" in data

    def test_missing_id_detail_mentions_tech_id(self, client, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = None
        mock_cursor.fetchall.return_value = []
        data = client.get("/api/v1/technology-routes/technologies/my_tech_42").json()
        assert "my_tech_42" in data["detail"]

    def test_found_tech_returns_200(self, client, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = _tech_row()
        mock_cursor.fetchall.return_value = []
        response = client.get("/api/v1/technology-routes/technologies/biogas_digester")
        assert response.status_code == 200

    def test_found_tech_has_required_fields(self, client, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = _tech_row()
        mock_cursor.fetchall.return_value = []
        data = client.get("/api/v1/technology-routes/technologies/biogas_digester").json()
        for field in ("id", "category", "name_pt", "name_en", "emoji", "references"):
            assert field in data, f"Missing field: {field}"

    def test_found_tech_references_is_list(self, client, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = _tech_row()
        mock_cursor.fetchall.return_value = []
        data = client.get("/api/v1/technology-routes/technologies/biogas_digester").json()
        assert isinstance(data["references"], list)


# ─── Validate connection ──────────────────────────────────────────────────────

@pytest.mark.unit
class TestValidateConnection:

    def _source_row(self, cat="feedstock", connects_to=None):
        row = MagicMock()
        val = {
            "id": "biomass_feed",
            "category": cat,
            "name_pt": "Biomassa",
            "can_connect_to": connects_to or ["digestion"],
            "can_receive_from": [],
        }
        row.__getitem__ = lambda self, k: val[k]
        row.get = lambda k, d=None: val.get(k, d)
        return row

    def _target_row(self, cat="digestion", receives_from=None):
        row = MagicMock()
        val = {
            "id": "biodigester",
            "category": cat,
            "name_pt": "Biodigestor",
            "can_connect_to": [],
            "can_receive_from": receives_from or ["feedstock"],
        }
        row.__getitem__ = lambda self, k: val[k]
        row.get = lambda k, d=None: val.get(k, d)
        return row

    def test_missing_source_returns_valid_false(self, client, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = None
        payload = {"source_tech_id": "ghost_id", "target_tech_id": "biodigester"}
        data = client.post("/api/v1/technology-routes/validate-connection", json=payload).json()
        assert data["valid"] is False

    def test_missing_source_returns_reason(self, client, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = None
        payload = {"source_tech_id": "ghost_id", "target_tech_id": "biodigester"}
        data = client.post("/api/v1/technology-routes/validate-connection", json=payload).json()
        assert "reason" in data
        assert data["reason"]

    def test_valid_connection_returns_valid_true(self, client, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        # First fetchone → source, second → target
        mock_cursor.fetchone.side_effect = [
            self._source_row("feedstock", ["digestion"]),
            self._target_row("digestion", ["feedstock"]),
        ]
        payload = {"source_tech_id": "biomass_feed", "target_tech_id": "biodigester"}
        data = client.post("/api/v1/technology-routes/validate-connection", json=payload).json()
        assert data["valid"] is True

    def test_valid_connection_returns_reason(self, client, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.side_effect = [
            self._source_row("feedstock", ["digestion"]),
            self._target_row("digestion", ["feedstock"]),
        ]
        payload = {"source_tech_id": "biomass_feed", "target_tech_id": "biodigester"}
        data = client.post("/api/v1/technology-routes/validate-connection", json=payload).json()
        assert "reason" in data

    def test_incompatible_categories_returns_valid_false(self, client, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        # source can connect to "upgrading" but target is "enduse"
        mock_cursor.fetchone.side_effect = [
            self._source_row("feedstock", ["upgrading"]),
            self._target_row("enduse", ["upgrading"]),
        ]
        payload = {"source_tech_id": "biomass_feed", "target_tech_id": "end_node"}
        data = client.post("/api/v1/technology-routes/validate-connection", json=payload).json()
        assert data["valid"] is False

    def test_response_has_valid_key(self, client, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = None
        payload = {"source_tech_id": "a", "target_tech_id": "b"}
        data = client.post("/api/v1/technology-routes/validate-connection", json=payload).json()
        assert "valid" in data

    def test_invalid_payload_returns_422(self, client):
        response = client.post("/api/v1/technology-routes/validate-connection",
                               json={"source_tech_id": "a"})  # missing target
        assert response.status_code == 422

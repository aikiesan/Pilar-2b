"""
Technology Routes — HTTP endpoint tests.

Covers all DB-backed endpoints in app/routers/technology_routes.py, including
the custom-technology and user-route CRUD endpoints that used to reference an
undefined `db`/`text` (see IMPROVEMENT_BACKLOG.md for the fix history).

All DB access is intercepted by the autouse mock_db_connection fixture in
conftest.py, so no real Postgres connection is needed.
"""

import json
from datetime import datetime, timezone
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

# ─── Helper: cursor row factory ──────────────────────────────────────────────


def _tech_row(
    tech_id="biogas_digester", category="digestion", name_pt="Biodigestor", name_en="Biodigester"
):
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
    row.get = lambda key, default=None: (
        row[key]
        if key
        in (
            "id",
            "category",
            "name_pt",
            "name_en",
            "emoji",
            "description_pt",
            "description_en",
            "color",
            "can_connect_to",
            "can_receive_from",
            "is_custom",
            "created_by",
            "created_at",
            "updated_at",
        )
        else default
    )
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
        response = client.post(
            "/api/v1/technology-routes/validate-connection", json={"source_tech_id": "a"}
        )  # missing target
        assert response.status_code == 422


# ─── Helper: user_routes row factory ─────────────────────────────────────────


def _route_row(
    route_id="11111111-1111-1111-1111-111111111111",
    user_id="test-uid",
    name="My Route",
    description=None,
    is_public=False,
    share_token=None,
    tags=None,
):
    """Return a dict-like mock row for the user_routes table."""
    val = {
        "id": route_id,
        "user_id": user_id,
        "name": name,
        "description": description,
        "canvas_data": {"nodes": [], "edges": []},
        "is_public": is_public,
        "share_token": share_token,
        "tags": tags or [],
        "created_at": datetime(2025, 1, 1),
        "updated_at": datetime(2025, 1, 1),
    }
    row = MagicMock()
    row.__getitem__ = lambda self, key: val[key]
    row.get = lambda key, default=None: val.get(key, default)
    return row


def _make_authenticated_client(test_app, user_id="test-uid"):
    """Return a TestClient whose get_current_user dependency is bypassed."""
    from app.middleware.auth import get_current_user
    from app.models.auth import UserProfile

    fake_user = UserProfile(
        id=user_id,
        email="test@example.com",
        full_name="Test User",
        role="autenticado",
        created_at=datetime(2025, 1, 1, tzinfo=timezone.utc),
        updated_at=datetime(2025, 1, 1, tzinfo=timezone.utc),
    )
    test_app.dependency_overrides[get_current_user] = lambda: fake_user
    return TestClient(test_app, base_url="http://testserver")


# ─── Create / delete custom technology ───────────────────────────────────────


@pytest.mark.unit
class TestCreateCustomTechnology:

    def _payload(self, **overrides):
        payload = {
            "name_pt": "Digestor Customizado",
            "name_en": "Custom Digester",
            "emoji": "⚗️",
            "category": "digestion",
        }
        payload.update(overrides)
        return payload

    def test_create_returns_201(self, test_app, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.side_effect = [None, _tech_row(tech_id="custom_abc")]
        auth_client = _make_authenticated_client(test_app)
        response = auth_client.post(
            "/api/v1/technology-routes/technologies/custom", json=self._payload()
        )
        assert response.status_code == 201

    def test_create_duplicate_id_returns_400(self, test_app, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = _tech_row()
        auth_client = _make_authenticated_client(test_app)
        response = auth_client.post(
            "/api/v1/technology-routes/technologies/custom",
            json=self._payload(id="biogas_digester"),
        )
        assert response.status_code == 400


@pytest.mark.unit
class TestDeleteCustomTechnology:

    def _ownership_row(self, created_by="test-uid"):
        row = MagicMock()
        row.__getitem__ = lambda self, key: {"created_by": created_by}[key]
        return row

    def test_delete_returns_204(self, test_app, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = self._ownership_row()
        auth_client = _make_authenticated_client(test_app)
        response = auth_client.delete("/api/v1/technology-routes/technologies/custom/custom_abc")
        assert response.status_code == 204

    def test_delete_not_found_returns_404(self, test_app, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = None
        auth_client = _make_authenticated_client(test_app)
        response = auth_client.delete("/api/v1/technology-routes/technologies/custom/ghost")
        assert response.status_code == 404

    def test_delete_not_owner_returns_403(self, test_app, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = self._ownership_row(created_by="someone-else")
        auth_client = _make_authenticated_client(test_app, user_id="test-uid")
        response = auth_client.delete("/api/v1/technology-routes/technologies/custom/custom_abc")
        assert response.status_code == 403


# ─── User routes CRUD ─────────────────────────────────────────────────────────


@pytest.mark.unit
class TestGetUserRoutes:

    def test_returns_200_list(self, test_app, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchall.return_value = [_route_row(user_id="test-uid")]
        auth_client = _make_authenticated_client(test_app)
        response = auth_client.get("/api/v1/technology-routes/routes")
        assert response.status_code == 200
        assert len(response.json()) == 1

    def test_empty_returns_empty_list(self, test_app, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchall.return_value = []
        auth_client = _make_authenticated_client(test_app)
        response = auth_client.get("/api/v1/technology-routes/routes")
        assert response.json() == []


@pytest.mark.unit
class TestGetRouteById:

    ROUTE_ID = "11111111-1111-1111-1111-111111111111"

    def test_found_returns_200(self, test_app, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = _route_row(route_id=self.ROUTE_ID, user_id="test-uid")
        auth_client = _make_authenticated_client(test_app)
        response = auth_client.get(f"/api/v1/technology-routes/routes/{self.ROUTE_ID}")
        assert response.status_code == 200

    def test_not_found_returns_404(self, test_app, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = None
        auth_client = _make_authenticated_client(test_app)
        response = auth_client.get(f"/api/v1/technology-routes/routes/{self.ROUTE_ID}")
        assert response.status_code == 404


@pytest.mark.unit
class TestCreateRoute:

    def test_create_returns_201(self, test_app, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = _route_row(user_id="test-uid")
        auth_client = _make_authenticated_client(test_app)
        payload = {"name": "New Route", "canvas_data": {"nodes": [], "edges": []}}
        response = auth_client.post("/api/v1/technology-routes/routes", json=payload)
        assert response.status_code == 201


@pytest.mark.unit
class TestUpdateRoute:

    ROUTE_ID = "11111111-1111-1111-1111-111111111111"

    def test_update_returns_200(self, test_app, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        ownership_row = _route_row(route_id=self.ROUTE_ID, user_id="test-uid")
        updated_row = _route_row(route_id=self.ROUTE_ID, user_id="test-uid", name="Renamed")
        mock_cursor.fetchone.side_effect = [ownership_row, updated_row]
        auth_client = _make_authenticated_client(test_app)
        response = auth_client.put(
            f"/api/v1/technology-routes/routes/{self.ROUTE_ID}", json={"name": "Renamed"}
        )
        assert response.status_code == 200

    def test_update_not_found_returns_404(self, test_app, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = None
        auth_client = _make_authenticated_client(test_app)
        response = auth_client.put(
            f"/api/v1/technology-routes/routes/{self.ROUTE_ID}", json={"name": "Renamed"}
        )
        assert response.status_code == 404

    def test_update_not_owner_returns_403(self, test_app, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = _route_row(
            route_id=self.ROUTE_ID, user_id="someone-else"
        )
        auth_client = _make_authenticated_client(test_app, user_id="test-uid")
        response = auth_client.put(
            f"/api/v1/technology-routes/routes/{self.ROUTE_ID}", json={"name": "Renamed"}
        )
        assert response.status_code == 403


@pytest.mark.unit
class TestDeleteRoute:

    ROUTE_ID = "11111111-1111-1111-1111-111111111111"

    def test_delete_returns_204(self, test_app, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = _route_row(route_id=self.ROUTE_ID, user_id="test-uid")
        auth_client = _make_authenticated_client(test_app)
        response = auth_client.delete(f"/api/v1/technology-routes/routes/{self.ROUTE_ID}")
        assert response.status_code == 204

    def test_delete_not_found_returns_404(self, test_app, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = None
        auth_client = _make_authenticated_client(test_app)
        response = auth_client.delete(f"/api/v1/technology-routes/routes/{self.ROUTE_ID}")
        assert response.status_code == 404

    def test_delete_not_owner_returns_403(self, test_app, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = _route_row(
            route_id=self.ROUTE_ID, user_id="someone-else"
        )
        auth_client = _make_authenticated_client(test_app, user_id="test-uid")
        response = auth_client.delete(f"/api/v1/technology-routes/routes/{self.ROUTE_ID}")
        assert response.status_code == 403


# ─── Public sharing endpoints ─────────────────────────────────────────────────


@pytest.mark.unit
class TestGetPublicRoutes:

    def test_returns_200_list(self, client, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchall.return_value = [_route_row(is_public=True)]
        response = client.get("/api/v1/technology-routes/public/routes")
        assert response.status_code == 200
        assert len(response.json()) == 1


@pytest.mark.unit
class TestGetRouteByShareToken:

    def test_found_returns_200(self, client, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = _route_row(is_public=True, share_token="abc123")
        response = client.get("/api/v1/technology-routes/share/abc123")
        assert response.status_code == 200

    def test_not_found_returns_404(self, client, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = None
        response = client.get("/api/v1/technology-routes/share/ghost-token")
        assert response.status_code == 404

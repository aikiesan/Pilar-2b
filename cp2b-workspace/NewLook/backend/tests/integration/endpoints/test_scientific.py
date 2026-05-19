"""
Integration tests for Scientific API endpoints
Tests kinetic parameters endpoint with various filter combinations,
empty results, and error conditions.
"""
import json
import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
from app.main import app

client = TestClient(app)

# ─── Sample data ──────────────────────────────────────────────────────────────

SAMPLE_KINETICS_JSON = {
    "k_slow": 0.04,
    "k_med": 0.45,
    "k_fast": 4.8,
    "f_slow": 0.2,
    "f_med": 0.6,
    "f_fast": 0.2,
    "FQ": 0.93,
    "classification": "medium",
    "bmp_simulated": 280.5,
    "t50": 18,
    "t80": 32,
    "test_standard": "VDI 4630",
    "temperature": 35,
    "retention_time": 30,
}

SAMPLE_KINETICS_FAST_JSON = {
    "k_slow": 0.01,
    "k_med": 0.3,
    "k_fast": 6.5,
    "f_slow": 0.05,
    "f_med": 0.35,
    "f_fast": 0.60,
    "FQ": 0.97,
    "classification": "fast",
    "bmp_simulated": 340.0,
    "t50": 10,
    "t80": 20,
    "test_standard": "VDI 4630",
    "temperature": 37,
    "retention_time": 25,
}

SAMPLE_DB_ROW_1 = {
    "residue_id": 1,
    "residue_name": "Vinhaça",
    "sector": "AGR",
    "bmp_experimental": 275.0,
    "kinetics": SAMPLE_KINETICS_JSON,
    "references_list": ["Silva et al. (2020)", "Costa et al. (2021)"],
}

SAMPLE_DB_ROW_2 = {
    "residue_id": 2,
    "residue_name": "Cama de Aviário",
    "sector": "PEC",
    "bmp_experimental": 335.0,
    "kinetics": SAMPLE_KINETICS_FAST_JSON,
    "references_list": ["Oliveira et al. (2019)"],
}


def _make_mock_db(rows):
    """Return a (mock_conn, mock_cursor) pair whose fetchall returns *rows*."""
    mock_cursor = MagicMock()
    mock_cursor.fetchall.return_value = [dict(r) for r in rows]
    mock_conn = MagicMock()
    mock_conn.cursor.return_value = mock_cursor
    mock_conn.__enter__ = lambda s: s
    mock_conn.__exit__ = MagicMock(return_value=False)
    return mock_conn, mock_cursor


# ─── Tests ────────────────────────────────────────────────────────────────────

@pytest.mark.integration
class TestKineticsEndpoint:
    """Tests for GET /api/v1/scientific/kinetics"""

    def test_get_kinetics_happy_path(self):
        """Returns kinetics data for all residues when no filters applied."""
        mock_conn, mock_cursor = _make_mock_db([SAMPLE_DB_ROW_1, SAMPLE_DB_ROW_2])

        with patch("app.api.v1.endpoints.scientific.get_db") as mock_get_db:
            mock_get_db.return_value.__enter__ = lambda s: mock_conn
            mock_get_db.return_value.__exit__ = MagicMock(return_value=False)
            mock_conn.cursor.return_value = mock_cursor

            response = client.get("/api/v1/scientific/kinetics")

        assert response.status_code == 200
        body = response.json()
        assert body["success"] is True
        assert body["count"] == 2
        assert len(body["data"]) == 2

    def test_get_kinetics_response_fields(self):
        """Each kinetics item contains all required fields."""
        mock_conn, mock_cursor = _make_mock_db([SAMPLE_DB_ROW_1])

        with patch("app.api.v1.endpoints.scientific.get_db") as mock_get_db:
            mock_get_db.return_value.__enter__ = lambda s: mock_conn
            mock_get_db.return_value.__exit__ = MagicMock(return_value=False)
            mock_conn.cursor.return_value = mock_cursor

            response = client.get("/api/v1/scientific/kinetics")

        assert response.status_code == 200
        item = response.json()["data"][0]

        required_fields = [
            "residue_id", "residue_name", "sector",
            "k_slow", "k_med", "k_fast",
            "f_slow", "f_med", "f_fast", "fq",
            "classification",
            "bmp_experimental", "bmp_simulated",
            "t50", "t80", "test_standard", "temperature", "retention_time",
            "references",
        ]
        for field in required_fields:
            assert field in item, f"Missing field: {field}"

    def test_get_kinetics_numeric_values(self):
        """Kinetic constants are returned as floats with correct values."""
        mock_conn, mock_cursor = _make_mock_db([SAMPLE_DB_ROW_1])

        with patch("app.api.v1.endpoints.scientific.get_db") as mock_get_db:
            mock_get_db.return_value.__enter__ = lambda s: mock_conn
            mock_get_db.return_value.__exit__ = MagicMock(return_value=False)
            mock_conn.cursor.return_value = mock_cursor

            response = client.get("/api/v1/scientific/kinetics")

        item = response.json()["data"][0]
        assert item["k_slow"] == pytest.approx(0.04)
        assert item["k_med"] == pytest.approx(0.45)
        assert item["k_fast"] == pytest.approx(4.8)
        assert item["fq"] == pytest.approx(0.93)
        assert item["t50"] == 18
        assert item["t80"] == 32

    def test_get_kinetics_references_list(self):
        """References array is returned correctly per residue."""
        mock_conn, mock_cursor = _make_mock_db([SAMPLE_DB_ROW_1])

        with patch("app.api.v1.endpoints.scientific.get_db") as mock_get_db:
            mock_get_db.return_value.__enter__ = lambda s: mock_conn
            mock_get_db.return_value.__exit__ = MagicMock(return_value=False)
            mock_conn.cursor.return_value = mock_cursor

            response = client.get("/api/v1/scientific/kinetics")

        item = response.json()["data"][0]
        assert isinstance(item["references"], list)
        assert "Silva et al. (2020)" in item["references"]
        assert "Costa et al. (2021)" in item["references"]

    def test_get_kinetics_filter_by_sector(self):
        """sector_codigo query param is forwarded to the SQL query."""
        mock_conn, mock_cursor = _make_mock_db([SAMPLE_DB_ROW_1])

        with patch("app.api.v1.endpoints.scientific.get_db") as mock_get_db:
            mock_get_db.return_value.__enter__ = lambda s: mock_conn
            mock_get_db.return_value.__exit__ = MagicMock(return_value=False)
            mock_conn.cursor.return_value = mock_cursor

            response = client.get("/api/v1/scientific/kinetics?sector_codigo=AGR")

        assert response.status_code == 200
        # Verify the execute call included the sector filter param
        call_args = mock_cursor.execute.call_args
        sql, params = call_args[0]
        assert "sector_codigo" in sql
        assert "AGR" in params

    def test_get_kinetics_filter_by_classification(self):
        """classification query param is forwarded to SQL query."""
        mock_conn, mock_cursor = _make_mock_db([SAMPLE_DB_ROW_2])

        with patch("app.api.v1.endpoints.scientific.get_db") as mock_get_db:
            mock_get_db.return_value.__enter__ = lambda s: mock_conn
            mock_get_db.return_value.__exit__ = MagicMock(return_value=False)
            mock_conn.cursor.return_value = mock_cursor

            response = client.get("/api/v1/scientific/kinetics?classification=fast")

        assert response.status_code == 200
        call_args = mock_cursor.execute.call_args
        sql, params = call_args[0]
        assert "classification" in sql
        assert "fast" in params

    def test_get_kinetics_combined_filters(self):
        """Both sector and classification filters can be combined."""
        mock_conn, mock_cursor = _make_mock_db([SAMPLE_DB_ROW_2])

        with patch("app.api.v1.endpoints.scientific.get_db") as mock_get_db:
            mock_get_db.return_value.__enter__ = lambda s: mock_conn
            mock_get_db.return_value.__exit__ = MagicMock(return_value=False)
            mock_conn.cursor.return_value = mock_cursor

            response = client.get(
                "/api/v1/scientific/kinetics?sector_codigo=PEC&classification=fast"
            )

        assert response.status_code == 200
        call_args = mock_cursor.execute.call_args
        sql, params = call_args[0]
        assert "PEC" in params
        assert "fast" in params

    def test_get_kinetics_empty_result(self):
        """Returns success=True with empty data list when no records match."""
        mock_conn, mock_cursor = _make_mock_db([])

        with patch("app.api.v1.endpoints.scientific.get_db") as mock_get_db:
            mock_get_db.return_value.__enter__ = lambda s: mock_conn
            mock_get_db.return_value.__exit__ = MagicMock(return_value=False)
            mock_conn.cursor.return_value = mock_cursor

            response = client.get("/api/v1/scientific/kinetics?sector_codigo=NONEXISTENT")

        assert response.status_code == 200
        body = response.json()
        assert body["success"] is True
        assert body["count"] == 0
        assert body["data"] == []

    def test_get_kinetics_skips_null_kinetics(self):
        """Rows with falsy kinetics JSON are silently skipped."""
        null_row = {
            "residue_id": 99,
            "residue_name": "Orphan Residue",
            "sector": "TST",
            "bmp_experimental": 0,
            "kinetics": None,
            "references_list": [],
        }
        mock_conn, mock_cursor = _make_mock_db([null_row, SAMPLE_DB_ROW_1])

        with patch("app.api.v1.endpoints.scientific.get_db") as mock_get_db:
            mock_get_db.return_value.__enter__ = lambda s: mock_conn
            mock_get_db.return_value.__exit__ = MagicMock(return_value=False)
            mock_conn.cursor.return_value = mock_cursor

            response = client.get("/api/v1/scientific/kinetics")

        assert response.status_code == 200
        body = response.json()
        # Only the valid row is returned; null_row was skipped
        assert body["count"] == 1
        assert body["data"][0]["residue_id"] == 1

    def test_get_kinetics_kinetics_as_json_string(self):
        """Kinetics stored as a JSON string (not already a dict) is parsed correctly."""
        row_with_string_kinetics = dict(SAMPLE_DB_ROW_1)
        row_with_string_kinetics["kinetics"] = json.dumps(SAMPLE_KINETICS_JSON)

        mock_conn, mock_cursor = _make_mock_db([row_with_string_kinetics])

        with patch("app.api.v1.endpoints.scientific.get_db") as mock_get_db:
            mock_get_db.return_value.__enter__ = lambda s: mock_conn
            mock_get_db.return_value.__exit__ = MagicMock(return_value=False)
            mock_conn.cursor.return_value = mock_cursor

            response = client.get("/api/v1/scientific/kinetics")

        assert response.status_code == 200
        assert response.json()["count"] == 1

    def test_get_kinetics_defaults_for_missing_kinetics_fields(self):
        """Missing optional kinetics fields are replaced with safe defaults."""
        minimal_kinetics = {"classification": "slow"}
        row = {
            "residue_id": 5,
            "residue_name": "Minimal",
            "sector": "TST",
            "bmp_experimental": None,
            "kinetics": minimal_kinetics,
            "references_list": [],
        }
        mock_conn, mock_cursor = _make_mock_db([row])

        with patch("app.api.v1.endpoints.scientific.get_db") as mock_get_db:
            mock_get_db.return_value.__enter__ = lambda s: mock_conn
            mock_get_db.return_value.__exit__ = MagicMock(return_value=False)
            mock_conn.cursor.return_value = mock_cursor

            response = client.get("/api/v1/scientific/kinetics")

        assert response.status_code == 200
        item = response.json()["data"][0]
        # safe_float defaults
        assert item["k_slow"] == pytest.approx(0.05)
        assert item["k_med"] == pytest.approx(0.5)
        assert item["k_fast"] == pytest.approx(5.0)
        assert item["fq"] == pytest.approx(0.95)
        # safe_int defaults
        assert item["t50"] == 0
        assert item["t80"] == 0

    def test_get_kinetics_db_error_returns_500(self):
        """Database exception is converted to a 500 response."""
        with patch("app.api.v1.endpoints.scientific.get_db") as mock_get_db:
            mock_get_db.return_value.__enter__ = MagicMock(
                side_effect=Exception("connection refused")
            )
            mock_get_db.return_value.__exit__ = MagicMock(return_value=False)

            response = client.get("/api/v1/scientific/kinetics")

        assert response.status_code == 500

    def test_get_kinetics_multiple_residues_count(self):
        """Count field matches the actual length of the data list."""
        mock_conn, mock_cursor = _make_mock_db([SAMPLE_DB_ROW_1, SAMPLE_DB_ROW_2])

        with patch("app.api.v1.endpoints.scientific.get_db") as mock_get_db:
            mock_get_db.return_value.__enter__ = lambda s: mock_conn
            mock_get_db.return_value.__exit__ = MagicMock(return_value=False)
            mock_conn.cursor.return_value = mock_cursor

            response = client.get("/api/v1/scientific/kinetics")

        body = response.json()
        assert body["count"] == len(body["data"])

    def test_get_kinetics_classification_field_value(self):
        """Classification value from kinetics JSON is preserved in response."""
        mock_conn, mock_cursor = _make_mock_db([SAMPLE_DB_ROW_2])

        with patch("app.api.v1.endpoints.scientific.get_db") as mock_get_db:
            mock_get_db.return_value.__enter__ = lambda s: mock_conn
            mock_get_db.return_value.__exit__ = MagicMock(return_value=False)
            mock_conn.cursor.return_value = mock_cursor

            response = client.get("/api/v1/scientific/kinetics")

        item = response.json()["data"][0]
        assert item["classification"] == "fast"

    def test_get_kinetics_bmp_values(self):
        """BMP experimental and simulated are returned correctly."""
        mock_conn, mock_cursor = _make_mock_db([SAMPLE_DB_ROW_1])

        with patch("app.api.v1.endpoints.scientific.get_db") as mock_get_db:
            mock_get_db.return_value.__enter__ = lambda s: mock_conn
            mock_get_db.return_value.__exit__ = MagicMock(return_value=False)
            mock_conn.cursor.return_value = mock_cursor

            response = client.get("/api/v1/scientific/kinetics")

        item = response.json()["data"][0]
        assert item["bmp_experimental"] == pytest.approx(275.0)
        assert item["bmp_simulated"] == pytest.approx(280.5)

    def test_get_kinetics_string_numeric_values_parsed(self):
        """safe_float handles string-encoded numbers like '35-37' correctly."""
        row = dict(SAMPLE_DB_ROW_1)
        row["kinetics"] = dict(SAMPLE_KINETICS_JSON)
        row["kinetics"]["temperature"] = "mesophilic 35-37°C"
        row["kinetics"]["retention_time"] = "30 days"

        mock_conn, mock_cursor = _make_mock_db([row])

        with patch("app.api.v1.endpoints.scientific.get_db") as mock_get_db:
            mock_get_db.return_value.__enter__ = lambda s: mock_conn
            mock_get_db.return_value.__exit__ = MagicMock(return_value=False)
            mock_conn.cursor.return_value = mock_cursor

            response = client.get("/api/v1/scientific/kinetics")

        assert response.status_code == 200
        item = response.json()["data"][0]
        # First numeric value extracted from "mesophilic 35-37°C" is 35
        assert item["temperature"] == pytest.approx(35.0)
        # First numeric value from "30 days" is 30
        assert item["retention_time"] == pytest.approx(30.0)

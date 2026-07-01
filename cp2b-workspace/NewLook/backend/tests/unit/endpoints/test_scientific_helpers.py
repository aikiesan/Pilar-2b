"""
Scientific endpoint — unit tests for safe_float, safe_int helpers
and branch coverage for the /kinetics endpoint filter params.
"""

import json
from unittest.mock import MagicMock

import pytest

from app.api.v1.endpoints.scientific import safe_float, safe_int

# ─── Import helpers directly ──────────────────────────────────────────────────


# ─── safe_float ───────────────────────────────────────────────────────────────


@pytest.mark.unit
class TestSafeFloat:

    def test_none_returns_default(self):
        assert safe_float(None) == 0.0

    def test_none_with_custom_default(self):
        assert safe_float(None, default=99.9) == pytest.approx(99.9)

    def test_int_value_converted(self):
        assert safe_float(42) == pytest.approx(42.0)

    def test_float_value_passthrough(self):
        assert safe_float(3.14) == pytest.approx(3.14)

    def test_plain_numeric_string(self):
        assert safe_float("35") == pytest.approx(35.0)

    def test_decimal_string(self):
        assert safe_float("0.05") == pytest.approx(0.05)

    def test_string_with_unit(self):
        # "35-37°C" — first number wins
        result = safe_float("35-37°C")
        assert result == pytest.approx(35.0)

    def test_string_with_label(self):
        result = safe_float("mesophilic 35-37°C")
        assert result == pytest.approx(35.0)

    def test_non_numeric_string_returns_default(self):
        assert safe_float("abc") == 0.0

    def test_non_numeric_string_custom_default(self):
        assert safe_float("xyz", default=5.0) == pytest.approx(5.0)

    def test_zero_value(self):
        assert safe_float(0) == pytest.approx(0.0)

    def test_negative_float(self):
        assert safe_float(-1.5) == pytest.approx(-1.5)


# ─── safe_int ─────────────────────────────────────────────────────────────────


@pytest.mark.unit
class TestSafeInt:

    def test_none_returns_default(self):
        assert safe_int(None) == 0

    def test_none_custom_default(self):
        assert safe_int(None, default=7) == 7

    def test_int_passthrough(self):
        assert safe_int(10) == 10

    def test_float_truncated(self):
        assert safe_int(3.9) == 3

    def test_numeric_string(self):
        assert safe_int("42") == 42

    def test_float_string(self):
        assert safe_int("3.7") == 3

    def test_non_numeric_string_returns_default(self):
        assert safe_int("abc") == 0

    def test_non_numeric_custom_default(self):
        assert safe_int("bad", default=-1) == -1


# ─── /kinetics endpoint — branch coverage ─────────────────────────────────────


def _make_cursor(rows, mock_conn):
    cursor_mock = MagicMock()
    cursor_mock.fetchall.return_value = rows
    mock_conn.cursor.return_value = cursor_mock
    return cursor_mock


def _valid_db_row(kinetics=None):
    if kinetics is None:
        kinetics = {
            "k_slow": 0.05,
            "k_med": 0.5,
            "k_fast": 5.0,
            "f_slow": 0.3,
            "f_med": 0.5,
            "f_fast": 0.2,
            "FQ": 0.95,
            "bmp_simulated": 280.0,
            "t50": 18,
            "t80": 32,
            "temperature": 37.0,
            "retention_time": 21,
            "test_standard": "VDI 4630",
            "classification": "medium",
        }
    return {
        "residue_id": 1,
        "residue_name": "Test Residue",
        "sector": "AGR",
        "bmp_experimental": 275.0,
        "kinetics": kinetics,
        "references_list": [],
    }


@pytest.mark.unit
class TestKineticsEndpointBranches:

    def test_sector_filter_param_accepted(self, client, mock_db_connection):
        mock_conn, _ = mock_db_connection
        _make_cursor([_valid_db_row()], mock_conn)
        response = client.get("/api/v1/scientific/kinetics?sector_codigo=AGR")
        assert response.status_code == 200

    def test_classification_filter_param_accepted(self, client, mock_db_connection):
        mock_conn, _ = mock_db_connection
        _make_cursor([_valid_db_row()], mock_conn)
        response = client.get("/api/v1/scientific/kinetics?classification=medium")
        assert response.status_code == 200

    def test_both_filters_together(self, client, mock_db_connection):
        mock_conn, _ = mock_db_connection
        _make_cursor([_valid_db_row()], mock_conn)
        response = client.get("/api/v1/scientific/kinetics?sector_codigo=AGR&classification=fast")
        assert response.status_code == 200

    def test_empty_kinetics_row_skipped(self, client, mock_db_connection):
        mock_conn, _ = mock_db_connection
        # kinetics=None triggers the `if not kinetics_data: continue` branch
        row = _valid_db_row(kinetics=None)
        row["kinetics"] = None
        _make_cursor([row], mock_conn)
        response = client.get("/api/v1/scientific/kinetics")
        assert response.status_code == 200
        assert response.json()["count"] == 0

    def test_kinetics_as_json_string_is_parsed(self, client, mock_db_connection):
        mock_conn, _ = mock_db_connection
        valid_kinetics = {
            "k_slow": 0.05,
            "k_med": 0.5,
            "k_fast": 5.0,
            "f_slow": 0.3,
            "f_med": 0.5,
            "f_fast": 0.2,
            "FQ": 0.95,
            "bmp_simulated": 280.0,
            "t50": 18,
            "t80": 32,
            "temperature": 37.0,
            "retention_time": 21,
            "test_standard": "VDI 4630",
            "classification": "medium",
        }
        row = _valid_db_row(kinetics=json.dumps(valid_kinetics))
        _make_cursor([row], mock_conn)
        response = client.get("/api/v1/scientific/kinetics")
        assert response.status_code == 200
        assert response.json()["count"] == 1

    def test_no_filters_returns_all(self, client, mock_db_connection):
        mock_conn, _ = mock_db_connection
        _make_cursor([_valid_db_row(), _valid_db_row()], mock_conn)
        response = client.get("/api/v1/scientific/kinetics")
        assert response.status_code == 200
        assert response.json()["count"] == 2


# ─── maps.py endpoint coverage ────────────────────────────────────────────────


@pytest.mark.unit
class TestMapsEndpoints:

    def test_get_layers_returns_200(self, client):
        response = client.get("/api/v1/maps/layers")
        assert response.status_code == 200

    def test_get_layers_has_layers_key(self, client):
        data = client.get("/api/v1/maps/layers").json()
        assert "layers" in data
        assert len(data["layers"]) > 0

    def test_municipalities_geojson_returns_200(self, client):
        response = client.get("/api/v1/maps/layers/municipalities/geojson")
        assert response.status_code == 200

    def test_municipalities_geojson_is_feature_collection(self, client):
        data = client.get("/api/v1/maps/layers/municipalities/geojson").json()
        assert data["type"] == "FeatureCollection"

    def test_biomass_sources_geojson_returns_200(self, client):
        response = client.get("/api/v1/maps/layers/biomass_sources/geojson")
        assert response.status_code == 200

    def test_unknown_layer_returns_404(self, client):
        response = client.get("/api/v1/maps/layers/unknown_layer/geojson")
        assert response.status_code == 404

    def test_get_bounds_returns_200(self, client):
        response = client.get("/api/v1/maps/bounds")
        assert response.status_code == 200

    def test_get_bounds_has_center(self, client):
        data = client.get("/api/v1/maps/bounds").json()
        assert "center" in data
        assert "lat" in data["center"]
        assert "lng" in data["center"]

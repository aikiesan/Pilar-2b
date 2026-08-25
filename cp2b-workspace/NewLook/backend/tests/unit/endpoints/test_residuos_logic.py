"""
Residuos endpoint — filter/pagination/join logic tests.

The `_to_float`, `_rows` helpers and all the endpoint handlers are
exercised here via the TestClient fixture (backed by the autouse
mock_db_connection from conftest.py).

No real database is needed.
"""

from unittest.mock import MagicMock, patch

import pytest

# ─── Helpers ──────────────────────────────────────────────────────────────────


def _sector_rows():
    return [{"codigo": "AG", "nome": "Agrícola", "emoji": "🌾", "ordem": 1}]


def _residue_row(
    rid=1, codigo="palha_soja", nome="Palha de Soja", sector_codigo="AG", subsector_codigo=None
):
    return {
        "id": rid,
        "codigo": codigo,
        "nome": nome,
        "nome_en": "Soybean Straw",
        "sector_codigo": sector_codigo,
        "subsector_codigo": subsector_codigo,
        "categoria_nome": "Agrícola",
        "bmp_min": 150.0,
        "bmp_medio": 180.0,
        "bmp_max": 220.0,
        "bmp_unidade": "NmL CH4/g VS",
        "ts_min": 80.0,
        "ts_medio": 85.0,
        "ts_max": 90.0,
        "vs_min": 70.0,
        "vs_medio": 75.0,
        "vs_max": 82.0,
        "chemical_cn_ratio": 55.0,
        "chemical_ch4_content": 55.0,
        "fator_realista": 0.80,
        "icon": None,
    }


# ─── _to_float helper (imported directly) ─────────────────────────────────────


@pytest.mark.unit
class TestToFloatHelper:
    def test_none_returns_none(self):
        from app.api.v1.endpoints.residuos import _to_float

        assert _to_float(None) is None

    def test_int_returns_float(self):
        from app.api.v1.endpoints.residuos import _to_float

        result = _to_float(5)
        assert result == 5.0
        assert isinstance(result, float)

    def test_float_unchanged(self):
        from app.api.v1.endpoints.residuos import _to_float

        assert _to_float(3.14) == pytest.approx(3.14)

    def test_invalid_string_returns_none(self):
        from app.api.v1.endpoints.residuos import _to_float

        assert _to_float("not_a_number") is None

    def test_numeric_string_returns_float(self):
        from app.api.v1.endpoints.residuos import _to_float

        assert _to_float("42.5") == pytest.approx(42.5)

    def test_zero_returns_zero(self):
        from app.api.v1.endpoints.residuos import _to_float

        assert _to_float(0) == 0.0


# ─── Sectors endpoint ─────────────────────────────────────────────────────────


@pytest.mark.unit
class TestSectorsEndpoint:

    def test_returns_200(self, client):
        response = client.get("/api/v1/residuos/sectors")
        assert response.status_code == 200

    def test_response_has_sectors_key(self, client):
        data = client.get("/api/v1/residuos/sectors").json()
        assert "sectors" in data

    def test_response_has_success_true(self, client, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchall.return_value = []
        data = client.get("/api/v1/residuos/sectors").json()
        assert data.get("success") is True

    def test_empty_db_returns_empty_sectors(self, client, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchall.return_value = []
        data = client.get("/api/v1/residuos/sectors").json()
        assert data["sectors"] == []

    def test_count_matches_sectors_list_length(self, client, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchall.return_value = []
        data = client.get("/api/v1/residuos/sectors").json()
        assert data["count"] == len(data["sectors"])


# ─── Subsectors endpoint ──────────────────────────────────────────────────────


@pytest.mark.unit
class TestSubsectorsEndpoint:

    def test_returns_200(self, client):
        response = client.get("/api/v1/residuos/subsectors")
        assert response.status_code == 200

    def test_has_subsectors_key(self, client):
        data = client.get("/api/v1/residuos/subsectors").json()
        assert "subsectors" in data

    def test_sector_codigo_filter_accepted(self, client):
        response = client.get("/api/v1/residuos/subsectors?sector_codigo=AG")
        assert response.status_code == 200

    def test_empty_db_returns_empty_list(self, client, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchall.return_value = []
        data = client.get("/api/v1/residuos/subsectors").json()
        assert data["subsectors"] == []


# ─── Residuos list endpoint ───────────────────────────────────────────────────


@pytest.mark.unit
class TestGetResiduos:

    def test_returns_200(self, client):
        response = client.get("/api/v1/residuos/")
        assert response.status_code == 200

    def test_has_residuos_key(self, client):
        data = client.get("/api/v1/residuos/").json()
        assert "residuos" in data

    def test_has_total_key(self, client):
        data = client.get("/api/v1/residuos/").json()
        assert "total" in data

    def test_has_success_true(self, client, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchall.return_value = []
        data = client.get("/api/v1/residuos/").json()
        assert data.get("success") is True

    def test_sector_codigo_filter_accepted(self, client):
        response = client.get("/api/v1/residuos/?sector_codigo=AG")
        assert response.status_code == 200

    def test_subsector_codigo_filter_accepted(self, client):
        response = client.get("/api/v1/residuos/?subsector_codigo=AG_CULTURAS")
        assert response.status_code == 200

    def test_search_filter_accepted(self, client):
        response = client.get("/api/v1/residuos/?search=soja")
        assert response.status_code == 200

    def test_limit_param_accepted(self, client):
        response = client.get("/api/v1/residuos/?limit=10")
        assert response.status_code == 200

    def test_offset_param_accepted(self, client):
        response = client.get("/api/v1/residuos/?offset=5")
        assert response.status_code == 200

    def test_limit_and_offset_in_response(self, client, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchall.return_value = []
        data = client.get("/api/v1/residuos/?limit=10&offset=5").json()
        assert data["limit"] == 10
        assert data["offset"] == 5

    def test_empty_db_returns_empty_list(self, client, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchall.return_value = []
        data = client.get("/api/v1/residuos/").json()
        assert data["residuos"] == []

    def test_empty_db_total_is_zero(self, client, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchall.return_value = []
        data = client.get("/api/v1/residuos/").json()
        assert data["total"] == 0

    def test_limit_gt_500_is_rejected(self, client):
        response = client.get("/api/v1/residuos/?limit=501")
        assert response.status_code == 422

    def test_negative_offset_rejected(self, client):
        response = client.get("/api/v1/residuos/?offset=-1")
        assert response.status_code == 422

    def test_count_matches_residuos_list_length(self, client, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchall.return_value = []
        data = client.get("/api/v1/residuos/").json()
        assert data["count"] == len(data["residuos"])


# ─── Single residue endpoint ──────────────────────────────────────────────────


@pytest.mark.unit
class TestGetSingleResidue:

    def test_missing_id_returns_404(self, client, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchall.return_value = []
        response = client.get("/api/v1/residuos/9999")
        assert response.status_code == 404

    def test_missing_id_has_detail(self, client, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchall.return_value = []
        data = client.get("/api/v1/residuos/9999").json()
        assert "detail" in data

    def test_non_integer_id_rejected(self, client):
        # Routes are typed int — non-int should 422 (path param validation)
        # or 404 if FastAPI routes it elsewhere; both are acceptable rejections
        response = client.get("/api/v1/residuos/not_an_int")
        assert response.status_code in (404, 422)

    def test_found_residue_returns_200(self, client, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        row = _residue_row()
        mock_cursor.fetchall.side_effect = [
            [row],  # SELECT * FROM residuos WHERE id = %s
            [],  # SELECT sectors
            [],  # SELECT subsectors
            [],  # SELECT scientific_references
        ]
        response = client.get("/api/v1/residuos/1")
        assert response.status_code == 200

    def test_found_residue_has_residuo_key(self, client, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        row = _residue_row()
        mock_cursor.fetchall.side_effect = [
            [row],
            [],
            [],
            [],
        ]
        data = client.get("/api/v1/residuos/1").json()
        assert "residuo" in data

    def test_found_residue_has_success_true(self, client, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        row = _residue_row()
        mock_cursor.fetchall.side_effect = [
            [row],
            [],
            [],
            [],
        ]
        data = client.get("/api/v1/residuos/1").json()
        assert data.get("success") is True


# ─── Compare endpoint ─────────────────────────────────────────────────────────


@pytest.mark.unit
class TestCompareResiduos:

    def test_single_id_rejected(self, client):
        response = client.get("/api/v1/residuos/compare?ids=1")
        assert response.status_code == 400

    def test_too_many_ids_rejected(self, client):
        ids = ",".join(str(i) for i in range(1, 12))
        response = client.get(f"/api/v1/residuos/compare?ids={ids}")
        assert response.status_code == 400

    def test_invalid_ids_format_rejected(self, client):
        response = client.get("/api/v1/residuos/compare?ids=abc,def")
        assert response.status_code == 400

    def test_two_valid_ids_accepted(self, client, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        r1 = _residue_row(rid=1, codigo="r1", nome="Residue 1")
        r2 = _residue_row(rid=2, codigo="r2", nome="Residue 2")
        mock_cursor.fetchall.side_effect = [
            [r1, r2],  # residuos
            [],  # sectors
            [],  # refs
        ]
        response = client.get("/api/v1/residuos/compare?ids=1,2")
        assert response.status_code == 200

    def test_compare_returns_comparison_key(self, client, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        r1 = _residue_row(rid=1, codigo="r1", nome="Residue 1")
        r2 = _residue_row(rid=2, codigo="r2", nome="Residue 2")
        mock_cursor.fetchall.side_effect = [
            [r1, r2],
            [],
            [],
        ]
        data = client.get("/api/v1/residuos/compare?ids=1,2").json()
        assert "comparison" in data


# ─── All references endpoint ──────────────────────────────────────────────────


@pytest.mark.unit
class TestGetAllReferences:

    def test_returns_200(self, client):
        response = client.get("/api/v1/residuos/references/all")
        assert response.status_code == 200

    def test_has_references_key(self, client):
        data = client.get("/api/v1/residuos/references/all").json()
        assert "references" in data

    def test_empty_db_returns_empty_list(self, client, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchall.return_value = []
        data = client.get("/api/v1/residuos/references/all").json()
        assert data["references"] == []

    def test_limit_and_offset_params_accepted(self, client):
        response = client.get("/api/v1/residuos/references/all?limit=50&offset=0")
        assert response.status_code == 200


# ─── Conversion factors endpoint ──────────────────────────────────────────────


@pytest.mark.unit
class TestConversionFactors:

    def test_returns_200(self, client):
        response = client.get("/api/v1/residuos/conversion-factors/")
        assert response.status_code == 200

    def test_has_factors_key(self, client):
        data = client.get("/api/v1/residuos/conversion-factors/").json()
        assert "factors" in data

    def test_category_filter_accepted(self, client):
        response = client.get("/api/v1/residuos/conversion-factors/?category=agricultural")
        assert response.status_code == 200


# ─── Summary by sector endpoint ───────────────────────────────────────────────


@pytest.mark.unit
class TestSummaryBySector:

    def test_returns_200(self, client):
        response = client.get("/api/v1/residuos/summary/by-sector")
        assert response.status_code == 200

    def test_has_summary_key(self, client):
        data = client.get("/api/v1/residuos/summary/by-sector").json()
        assert "summary" in data

    def test_empty_db_returns_empty_summary(self, client, mock_db_connection):
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchall.return_value = []
        data = client.get("/api/v1/residuos/summary/by-sector").json()
        assert data["summary"] == []

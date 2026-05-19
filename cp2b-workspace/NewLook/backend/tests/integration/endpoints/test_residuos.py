"""
Integration tests for Residuos API endpoints.
Tests sectors, subsectors, residues list, references, conversion factors,
summary, compare, and single-residue endpoints.
"""
import pytest
from contextlib import contextmanager
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _make_db_patch(rows_by_call):
    """
    Return a context-manager patch for app.core.database.get_db.

    ``rows_by_call`` is a list of lists; each inner list is the value returned
    by the *n-th* call to ``cursor.fetchall()`` (or an exception to raise).
    If it is an Exception instance the cursor.execute() will raise it.
    """
    call_index = [0]

    @contextmanager
    def mock_get_db():
        mock_conn = MagicMock()
        mock_cursor = MagicMock()

        def _execute(sql, params=None):
            idx = call_index[0]
            if idx < len(rows_by_call):
                val = rows_by_call[idx]
                if isinstance(val, Exception):
                    call_index[0] += 1
                    raise val
            call_index[0] += 1

        def _fetchall():
            # call_index was already incremented by _execute
            idx = call_index[0] - 1
            if idx < len(rows_by_call):
                val = rows_by_call[idx]
                if isinstance(val, Exception):
                    return []
                return val
            return []

        mock_cursor.execute.side_effect = _execute
        mock_cursor.fetchall.side_effect = _fetchall
        mock_conn.cursor.return_value = mock_cursor
        yield mock_conn

    return mock_get_db


def _patch_db(rows_by_call):
    return patch("app.api.v1.endpoints.residuos.get_db", new=_make_db_patch(rows_by_call))


# ─── Sample data fixtures ──────────────────────────────────────────────────────

SECTOR_ROWS = [
    {"codigo": "AGR", "nome": "Agropecuária", "emoji": "🌾", "ordem": 1},
    {"codigo": "URB", "nome": "Urbano", "emoji": "🏙", "ordem": 2},
]

RESIDUO_ROWS = [
    {
        "id": 1, "codigo": "VNH", "nome": "Vinhaça", "sector_codigo": "AGR",
        "subsector_codigo": "SUB1",
        "bmp_medio": 200.0, "ts_medio": 5.0, "vs_medio": 4.0,
        "chemical_cn_ratio": 20.0, "chemical_ch4_content": 0.65,
        "fator_realista": 0.8,
    },
    {
        "id": 2, "codigo": "RSU", "nome": "Resíduo Sólido Urbano", "sector_codigo": "URB",
        "subsector_codigo": None,
        "bmp_medio": 150.0, "ts_medio": 30.0, "vs_medio": 25.0,
        "chemical_cn_ratio": 25.0, "chemical_ch4_content": 0.55,
        "fator_realista": 0.7,
    },
]

SUBSECTOR_ROWS = [
    {"codigo": "SUB1", "nome": "Cana-de-Açúcar", "sector_codigo": "AGR", "ordem": 1},
    {"codigo": "SUB2", "nome": "Bovinos", "sector_codigo": "AGR", "ordem": 2},
]

REF_ROWS = [
    {
        "id": 10, "primary_residue": "VNH", "authors": "Silva et al.",
        "publication_year": 2020, "title": "Biogas from Vinhaça",
        "journal": "Bioresource Technology", "doi": "10.1234/brt",
        "url": None, "reported_value": 210.0, "reported_unit": "mLCH4/gVS",
        "has_validated_params": True, "validation_status": "validated",
        "year": 2020,
    },
    {
        "id": 11, "primary_residue": "RSU", "authors": "Jones",
        "publication_year": 2019, "title": None,
        "journal": None, "doi": None, "url": None,
        "reported_value": None, "reported_unit": None,
        "has_validated_params": False, "validation_status": None,
        "year": 2019,
    },
]

CONVERSION_FACTOR_ROWS = [
    {
        "id": 1, "category": "energy", "subcategory": "electricity",
        "factor_value": 0.9, "unit": "kWh/m3",
        "literature_reference": "IEA 2022", "reference_url": None,
        "real_data_validation": True, "safety_margin_percent": 5.0,
        "final_factor": 0.855, "notes": "Conservative estimate",
    },
    {
        "id": 2, "category": "thermal", "subcategory": "heat",
        "factor_value": 0.7, "unit": "MJ/m3",
        "literature_reference": "ANEEL 2021", "reference_url": None,
        "real_data_validation": False, "safety_margin_percent": None,
        "final_factor": 0.7, "notes": None,
    },
]


# ─── Sectors ──────────────────────────────────────────────────────────────────

@pytest.mark.integration
class TestGetSectors:
    """Tests for GET /residuos/sectors"""

    def test_sectors_happy_path(self):
        """Returns sector list with aggregated residue stats."""
        with _patch_db([SECTOR_ROWS, RESIDUO_ROWS]):
            response = client.get("/api/v1/residuos/sectors")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["count"] == 2
        sectors = data["sectors"]
        assert len(sectors) == 2
        agr = next(s for s in sectors if s["codigo"] == "AGR")
        assert agr["num_residuos"] == 1
        assert agr["avg_bmp"] == 200.0

    def test_sectors_empty_residuos(self):
        """Gracefully handles sectors with no residues."""
        with _patch_db([SECTOR_ROWS, []]):
            response = client.get("/api/v1/residuos/sectors")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        for s in data["sectors"]:
            assert s["num_residuos"] == 0
            assert s["avg_bmp"] is None

    def test_sectors_empty_sectors(self):
        """Returns empty list when no sectors exist."""
        with _patch_db([[], []]):
            response = client.get("/api/v1/residuos/sectors")

        assert response.status_code == 200
        assert response.json()["count"] == 0

    def test_sectors_db_error(self):
        """Returns 500 on database failure."""
        with _patch_db([Exception("connection refused")]):
            response = client.get("/api/v1/residuos/sectors")

        assert response.status_code == 500


# ─── Subsectors ───────────────────────────────────────────────────────────────

@pytest.mark.integration
class TestGetSubsectors:
    """Tests for GET /residuos/subsectors"""

    def test_subsectors_all(self):
        """Returns all subsectors with sector names and residue counts."""
        residuo_subsector_rows = [
            {"subsector_codigo": "SUB1"},
            {"subsector_codigo": "SUB1"},
            {"subsector_codigo": "SUB2"},
        ]
        with _patch_db([SUBSECTOR_ROWS, SECTOR_ROWS, residuo_subsector_rows]):
            response = client.get("/api/v1/residuos/subsectors")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["count"] == 2
        sub1 = next(s for s in data["subsectors"] if s["codigo"] == "SUB1")
        assert sub1["sector_nome"] == "Agropecuária"
        assert sub1["num_residuos"] == 2

    def test_subsectors_filtered_by_sector(self):
        """Filters subsectors by sector_codigo query param."""
        filtered = [SUBSECTOR_ROWS[0]]
        with _patch_db([filtered, SECTOR_ROWS, []]):
            response = client.get("/api/v1/residuos/subsectors?sector_codigo=AGR")

        assert response.status_code == 200
        data = response.json()
        assert data["count"] == 1

    def test_subsectors_empty(self):
        """Returns empty list gracefully."""
        with _patch_db([[], SECTOR_ROWS, []]):
            response = client.get("/api/v1/residuos/subsectors")

        assert response.status_code == 200
        assert response.json()["count"] == 0

    def test_subsectors_db_error(self):
        """Returns 500 on database failure."""
        with _patch_db([Exception("db down")]):
            response = client.get("/api/v1/residuos/subsectors")

        assert response.status_code == 500


# ─── Residuos list ────────────────────────────────────────────────────────────

@pytest.mark.integration
class TestGetResiduos:
    """Tests for GET /residuos/"""

    def test_residuos_happy_path(self):
        """Returns paginated residue list with enriched fields."""
        with _patch_db([RESIDUO_ROWS, SECTOR_ROWS, SUBSECTOR_ROWS, REF_ROWS]):
            response = client.get("/api/v1/residuos/")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["total"] == 2
        assert data["count"] == 2
        assert data["limit"] == 100
        assert data["offset"] == 0
        residuos = data["residuos"]
        assert len(residuos) == 2
        # Check enriched fields exist
        assert "sector_nome" in residuos[0]
        assert "sector_emoji" in residuos[0]
        assert "subsector_nome" in residuos[0]
        assert "reference_count" in residuos[0]

    def test_residuos_pagination(self):
        """Pagination limit and offset are applied correctly."""
        with _patch_db([RESIDUO_ROWS, SECTOR_ROWS, SUBSECTOR_ROWS, REF_ROWS]):
            response = client.get("/api/v1/residuos/?limit=1&offset=0")

        assert response.status_code == 200
        data = response.json()
        assert data["count"] == 1
        assert data["total"] == 2

    def test_residuos_filter_by_sector(self):
        """Sector filter is passed through to the query."""
        agr_only = [RESIDUO_ROWS[0]]
        with _patch_db([agr_only, SECTOR_ROWS, SUBSECTOR_ROWS, REF_ROWS]):
            response = client.get("/api/v1/residuos/?sector_codigo=AGR")

        assert response.status_code == 200
        assert response.json()["count"] == 1

    def test_residuos_empty(self):
        """Returns empty list when no residues match."""
        with _patch_db([[], SECTOR_ROWS, SUBSECTOR_ROWS, REF_ROWS]):
            response = client.get("/api/v1/residuos/")

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
        assert data["residuos"] == []

    def test_residuos_db_error(self):
        """Returns 500 on database failure."""
        with _patch_db([Exception("timeout")]):
            response = client.get("/api/v1/residuos/")

        assert response.status_code == 500


# ─── All references ───────────────────────────────────────────────────────────

@pytest.mark.integration
class TestGetAllReferences:
    """Tests for GET /residuos/references/all"""

    def test_references_all_happy_path(self):
        """Returns paginated reference list with residue and sector enrichment."""
        with _patch_db([REF_ROWS, RESIDUO_ROWS, SECTOR_ROWS]):
            response = client.get("/api/v1/residuos/references/all")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["total"] == 2
        refs = data["references"]
        assert len(refs) == 2
        # Check required keys
        for key in ("id", "residuo_codigo", "citation", "authors", "year", "doi"):
            assert key in refs[0]

    def test_references_all_empty(self):
        """Returns empty list when no references exist."""
        with _patch_db([[], [], SECTOR_ROWS]):
            response = client.get("/api/v1/residuos/references/all")

        assert response.status_code == 200
        assert response.json()["total"] == 0

    def test_references_all_pagination(self):
        """Pagination params are respected."""
        with _patch_db([REF_ROWS, RESIDUO_ROWS, SECTOR_ROWS]):
            response = client.get("/api/v1/residuos/references/all?limit=1&offset=0")

        assert response.status_code == 200
        data = response.json()
        assert data["count"] == 1
        assert data["total"] == 2

    def test_references_all_db_error(self):
        """Returns 500 on database failure."""
        with _patch_db([Exception("db error")]):
            response = client.get("/api/v1/residuos/references/all")

        assert response.status_code == 500


# ─── Conversion factors ───────────────────────────────────────────────────────

@pytest.mark.integration
class TestGetConversionFactors:
    """Tests for GET /residuos/conversion-factors/"""

    def test_conversion_factors_happy_path(self):
        """Returns all conversion factors."""
        with _patch_db([CONVERSION_FACTOR_ROWS]):
            response = client.get("/api/v1/residuos/conversion-factors/")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["count"] == 2
        factors = data["factors"]
        assert len(factors) == 2
        assert factors[0]["category"] == "energy"
        assert isinstance(factors[0]["factor_value"], float)

    def test_conversion_factors_filtered_by_category(self):
        """Category filter reduces results to matching rows."""
        energy_only = [CONVERSION_FACTOR_ROWS[0]]
        with _patch_db([energy_only]):
            response = client.get("/api/v1/residuos/conversion-factors/?category=energy")

        assert response.status_code == 200
        data = response.json()
        assert data["count"] == 1
        assert data["factors"][0]["category"] == "energy"

    def test_conversion_factors_empty(self):
        """Handles empty result gracefully."""
        with _patch_db([[]]):
            response = client.get("/api/v1/residuos/conversion-factors/")

        assert response.status_code == 200
        assert response.json()["count"] == 0

    def test_conversion_factors_db_error(self):
        """Returns 500 on database failure."""
        with _patch_db([Exception("db error")]):
            response = client.get("/api/v1/residuos/conversion-factors/")

        assert response.status_code == 500


# ─── Summary by sector ────────────────────────────────────────────────────────

@pytest.mark.integration
class TestGetSummaryBySector:
    """Tests for GET /residuos/summary/by-sector"""

    def test_summary_by_sector_happy_path(self):
        """Returns sector summary with aggregate stats and reference counts."""
        with _patch_db([SECTOR_ROWS, RESIDUO_ROWS, REF_ROWS]):
            response = client.get("/api/v1/residuos/summary/by-sector")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["count"] == 2
        summary = data["summary"]
        agr = next(s for s in summary if s["codigo"] == "AGR")
        assert agr["num_residuos"] == 1
        assert agr["avg_bmp"] == 200.0
        assert "min_bmp" in agr
        assert "max_bmp" in agr
        assert "total_references" in agr

    def test_summary_by_sector_empty(self):
        """Returns empty summary when no sectors exist."""
        with _patch_db([[], [], []]):
            response = client.get("/api/v1/residuos/summary/by-sector")

        assert response.status_code == 200
        assert response.json()["count"] == 0

    def test_summary_by_sector_db_error(self):
        """Returns 500 on database failure."""
        with _patch_db([Exception("query failed")]):
            response = client.get("/api/v1/residuos/summary/by-sector")

        assert response.status_code == 500


# ─── Compare ──────────────────────────────────────────────────────────────────

@pytest.mark.integration
class TestCompareResiduos:
    """Tests for GET /residuos/compare"""

    def test_compare_happy_path(self):
        """Returns comparison data sorted by BMP descending."""
        with _patch_db([RESIDUO_ROWS, SECTOR_ROWS, REF_ROWS]):
            response = client.get("/api/v1/residuos/compare?ids=1,2")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["count"] == 2
        comparison = data["comparison"]
        assert len(comparison) == 2
        # Should be sorted descending by bmp_medio (VNH=200 > RSU=150)
        assert comparison[0]["nome"] == "Vinhaça"

    def test_compare_invalid_id_format(self):
        """Returns 400 for non-numeric IDs."""
        response = client.get("/api/v1/residuos/compare?ids=abc,def")
        assert response.status_code == 400
        assert "Invalid ID format" in response.json()["detail"]

    def test_compare_single_id(self):
        """Returns 400 when fewer than 2 IDs provided."""
        with _patch_db([]):
            response = client.get("/api/v1/residuos/compare?ids=1")
        assert response.status_code == 400

    def test_compare_too_many_ids(self):
        """Returns 400 when more than 10 IDs provided."""
        ids = ",".join(str(i) for i in range(1, 12))
        with _patch_db([]):
            response = client.get(f"/api/v1/residuos/compare?ids={ids}")
        assert response.status_code == 400

    def test_compare_missing_ids(self):
        """Returns 404 when not all IDs found in database."""
        # DB returns fewer rows than requested
        with _patch_db([[RESIDUO_ROWS[0]], SECTOR_ROWS, REF_ROWS]):
            response = client.get("/api/v1/residuos/compare?ids=1,999")
        assert response.status_code == 404

    def test_compare_db_error(self):
        """Returns 500 on database failure."""
        with _patch_db([Exception("db error")]):
            response = client.get("/api/v1/residuos/compare?ids=1,2")
        assert response.status_code == 500


# ─── Single residue ───────────────────────────────────────────────────────────

@pytest.mark.integration
class TestGetResiduoById:
    """Tests for GET /residuos/{residuo_id}"""

    def test_get_residuo_happy_path(self):
        """Returns full residue detail with sector, subsector, references."""
        with _patch_db(
            [[RESIDUO_ROWS[0]], SECTOR_ROWS, SUBSECTOR_ROWS, REF_ROWS]
        ):
            response = client.get("/api/v1/residuos/1")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        residuo = data["residuo"]
        assert residuo["nome"] == "Vinhaça"
        assert "sector_nome" in residuo
        assert "sector_emoji" in residuo
        assert "subsector_nome" in residuo
        assert "references" in residuo
        assert "total_references" in residuo

    def test_get_residuo_not_found(self):
        """Returns 404 when residue ID does not exist."""
        with _patch_db([[]]):
            response = client.get("/api/v1/residuos/99999")

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_get_residuo_db_error(self):
        """Returns 500 on database failure."""
        with _patch_db([Exception("db error")]):
            response = client.get("/api/v1/residuos/1")

        assert response.status_code == 500


# ─── References for one residue ───────────────────────────────────────────────

@pytest.mark.integration
class TestGetResiduoReferences:
    """Tests for GET /residuos/{residuo_id}/references"""

    def test_residuo_references_happy_path(self):
        """Returns reference list for a given residue ID."""
        residuo_nome_row = [{"nome": "Vinhaça", "codigo": "VNH"}]
        with _patch_db([residuo_nome_row, REF_ROWS]):
            response = client.get("/api/v1/residuos/1/references")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["residuo_name"] == "Vinhaça"
        assert data["count"] == 2
        ref = data["references"][0]
        for key in ("id", "citation", "authors", "year", "doi", "is_primary"):
            assert key in ref

    def test_residuo_references_empty(self):
        """Returns empty list when residue has no references."""
        residuo_nome_row = [{"nome": "Vinhaça", "codigo": "VNH"}]
        with _patch_db([residuo_nome_row, []]):
            response = client.get("/api/v1/residuos/1/references")

        assert response.status_code == 200
        assert response.json()["count"] == 0

    def test_residuo_references_not_found(self):
        """Returns 404 when residue does not exist."""
        with _patch_db([[]]):
            response = client.get("/api/v1/residuos/99999/references")

        assert response.status_code == 404

    def test_residuo_references_db_error(self):
        """Returns 500 on database failure."""
        with _patch_db([Exception("db error")]):
            response = client.get("/api/v1/residuos/1/references")

        assert response.status_code == 500

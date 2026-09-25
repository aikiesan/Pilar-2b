"""CP2b endpoints (migration 033): payload shape, column names, and degradation.

The column names are the contract between three places — the view in the
migration, the SELECT in municipalities.py and the frontend's
ch4_{tier}_{residue}_m3_year accessors. A typo in any one of them would serve
NULL for every municipality and the map would paint NO_DATA without failing.
"""

import re
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.api.v1.endpoints import cp2b
from app.api.v1.endpoints.geospatial import _cp2b_tiers
from app.api.v1.endpoints.municipalities import (
    _CP2B_DETAIL_COLUMNS,
    _CP2B_MAP_COLUMNS,
    _geojson_select_sql,
)
from app.main import app

MIGRATION = Path(__file__).resolve().parents[3] / "app" / "migrations" / "033_cp2b_potential.sql"


def _view_columns() -> set[str]:
    sql = MIGRATION.read_text(encoding="utf-8")
    view = sql.split("CREATE OR REPLACE VIEW municipality_cp2b_map AS", 1)[1].split(";", 1)[0]
    return set(re.findall(r"\bAS (\w+)", view))


def test_every_served_column_exists_in_the_view():
    view = _view_columns()
    missing = [c for c in (*_CP2B_MAP_COLUMNS, *_CP2B_DETAIL_COLUMNS) if c not in view]
    assert missing == []


def test_map_columns_follow_the_served_scenario_shape():
    # The frontend reads ch4_${tier}_${residue}_m3_year with tier cp2b_n3/cp2b_n4.
    assert "ch4_cp2b_n3_m3_year" in _CP2B_MAP_COLUMNS
    assert "ch4_cp2b_n4_sugarcane_m3_year" in _CP2B_MAP_COLUMNS
    assert all(re.fullmatch(r"ch4_cp2b_n[34](_\w+)?_m3_year", c) for c in _CP2B_MAP_COLUMNS)


def test_geojson_select_without_the_view_serves_nulls_not_a_join():
    sql = _geojson_select_sql(False, "geometry_overview", 4, has_limit=False, include_cp2b=False)
    assert "municipality_cp2b_map" not in sql
    assert "NULL::double precision AS ch4_cp2b_n3_m3_year" in sql


def test_geojson_select_with_the_view_joins_it():
    sql = _geojson_select_sql(False, "geometry_overview", 4, has_limit=False, include_cp2b=True)
    assert "LEFT JOIN municipality_cp2b_map cp" in sql
    assert "cp.ch4_cp2b_n4_rsu_m3_year" in sql


# ── /cp2b/summary shaping ────────────────────────────────────────────────────


def _scenario_row(scenario, n3):
    return {
        "scenario": scenario,
        "method_version": "CP2b v5.1 (24/09/2026)",
        "municipalities": 645,
        "n1_ch4": n3 * 3.4,
        "n2_ch4": n3 * 2.2,
        "n3_ch4": n3,
        "n4_ch4": n3 * 0.85,
        "n3_ch4_nl": n3 * 0.38,
        "n4_ch4_nl": n3 * 0.34,
        "n3_biogas": n3 * 1.78,
        "n3_biomethane": n3 * 1.03,
        "n4_biogas": n3 * 1.5,
        "n4_biomethane": n3 * 0.88,
        "existing_use": 2.3e8,
    }


def test_summary_carries_all_levels_and_scenarios_in_both_units():
    rows = [_scenario_row(s, v) for s, v in (("min", 2.8e9), ("med", 7.0e9), ("max", 1.6e10))]
    residues = [
        {
            "residue": "sugarcane",
            "sector": "agricultural",
            "n1_ch4": 1.9e10,
            "n3_ch4": 5.6e9,
            "n4_ch4": 4.9e9,
        }
    ]
    out = cp2b.build_summary(
        rows, residues, {"provisional_share": 0.576, "provisional_substrates": 11}
    )

    assert out["headline_level"] == "n3"
    assert out["basis"] == "CH4"
    assert set(out["scenarios"]) == {"min", "med", "max"}
    med = out["scenarios"]["med"]
    assert set(med) >= {"n1", "n2", "n3", "n4", "non_lignocellulosic", "equivalents"}
    assert med["n3"]["m3_day"] == round(7.0e9 / 365, 2)
    # Equivalents are served as the method computed them, never CH4 / 0.625.
    assert med["equivalents"]["n3_biogas"]["m3_year"] == round(7.0e9 * 1.78, 2)
    assert out["by_residue_med"][0]["share_of_n3"] == 0.8
    assert out["provisional_parameters"] == {"substrates": 11, "share_of_n3_med": 0.576}


def test_summary_refuses_a_table_missing_a_scenario():
    with pytest.raises(ValueError):
        cp2b.build_summary([_scenario_row("med", 7e9)], [], None)


# ── /cp2b/municipalities/{ibge} shaping ──────────────────────────────────────


def _level_row(substrate, scenario, n3):
    return {
        "substrate": substrate,
        "residue": "sugarcane",
        "sector": "agricultural",
        "lignocellulosic": substrate == "PALHA",
        "scenario": scenario,
        "n1_ch4_nm3_year": n3 * 3,
        "n2_ch4_nm3_year": n3 * 2,
        "n3_ch4_nm3_year": n3,
        "n4_ch4_nm3_year": n3 * 0.9,
        "existing_use_subtracted_ch4_nm3_year": 0.0,
        "n3_biogas_eq_nm3_year": n3 * 1.8,
        "n3_biomethane_eq_nm3_year": n3,
        "ch4_fraction_in_biogas": 0.55,
        "fs_x_fl": 0.9,
        "method_version": "CP2b v5.1 (24/09/2026)",
    }


def test_municipality_totals_sum_substrates_and_order_by_n3():
    rows = [
        _level_row(sub, sc, n3)
        for sub, n3 in (("VINHACA", 10.0), ("PALHA", 30.0))
        for sc in ("min", "med", "max")
    ]
    fl = [
        {
            "substrate": "PALHA",
            "scenario": "med",
            "fl_b_codigestion_allocated": 0.86,
            "fl_a_codigestion_coverage": 0.86,
            "fl_d_mono_allocated": 0.86,
        }
    ]
    out = cp2b.build_municipality("3517406", rows, fl)
    assert out["totals"]["med"]["n3"]["m3_year"] == 40.0
    assert [s["substrate"] for s in out["substrates"]] == ["PALHA", "VINHACA"]
    assert out["substrates"][0]["scenarios"]["med"]["spatial_fl"]["b_principal"] == 0.86
    # No FL row: None, not a made-up 1.0.
    assert out["substrates"][1]["scenarios"]["med"]["spatial_fl"] is None


# ── Statistics summary tiers ─────────────────────────────────────────────────


def test_cp2b_tiers_absent_when_nothing_is_loaded():
    assert _cp2b_tiers([]) == {}


def test_cp2b_tiers_use_the_method_equivalents():
    rows = [
        {
            "sector": s,
            "n3": v,
            "n4": v * 0.8,
            "n3_biogas": v * 1.8,
            "n4_biogas": v * 1.4,
            "n3_biomethane": v * 1.03,
            "n4_biomethane": v * 0.82,
            "method_version": "CP2b v5.1 (24/09/2026)",
        }
        for s, v in (("agricultural", 600.0), ("livestock", 50.0), ("urban", 25.0))
    ]
    tiers = _cp2b_tiers(rows)
    assert set(tiers) == {"cp2b_n3", "cp2b_n4"}
    n3 = tiers["cp2b_n3"]
    assert n3["ch4_m3_year"] == 675.0
    assert n3["raw_biogas_m3_year"] == round(675.0 * 1.8, 2)  # not 675 / 0.625
    assert n3["sector_breakdown"]["forestry"] == 0.0
    assert n3["method"] == "CP2b"


# ── Routes ───────────────────────────────────────────────────────────────────


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def test_summary_is_503_before_the_migration(client, mock_db_connection):
    _, cursor = mock_db_connection
    cursor.fetchone.return_value = None  # information_schema: table absent
    r = client.get("/api/v1/cp2b/summary")
    assert r.status_code == 503
    assert "load_cp2b_potential" in r.json()["detail"]


def test_municipality_code_is_validated(client):
    assert client.get("/api/v1/cp2b/municipalities/35abc").status_code == 422


def test_municipality_outside_scope_is_404(client, mock_db_connection):
    _, cursor = mock_db_connection
    cursor.fetchone.return_value = {"?column?": 1}  # table exists
    cursor.fetchall.return_value = []  # but no rows for this code
    r = client.get("/api/v1/cp2b/municipalities/3106200")
    assert r.status_code == 404
    assert "scope: SP" in r.json()["detail"]


def test_parameters_status_filter_is_constrained(client):
    assert client.get("/api/v1/cp2b/parameters?status=anything").status_code == 422

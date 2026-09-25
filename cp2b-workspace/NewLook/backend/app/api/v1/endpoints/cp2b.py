"""
CP2b method endpoints — resource potential at four levels (migration 034).

The CP2b cascade (N1 theoretical → N2 technical → N3 mobilisable → N4
accessible) is a different method from the Atlas SP 2020 Real/Ideal scenarios
served by /municipalities and /geospatial/statistics/summary. They live side by
side and are never summed or compared as one quantity.

* N3 (mobilisable) is the CP2b headline figure, comparable with DBFZ
  mobilisable potentials. N4 adds storage losses and the spatial logistic
  factor computed on the road network.
* Every volume is Nm³ of METHANE. Biogas and biomethane are served as the
  equivalents the method computed (substrate-specific CH₄ fraction; 1 %
  upgrading loss, 96 % CH₄ product), not re-derived with the platform's 0.625.
* Scope is São Paulo (645 municipalities).

Not cached in the response cache: the queries aggregate ~33k rows and run in
milliseconds, and the cache has eight slots the national GeoJSON needs more.
"""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.core.database import get_db

logger = logging.getLogger(__name__)
router = APIRouter()

DAYS_PER_YEAR = 365
LEVELS = ("n1", "n2", "n3", "n4")
SCENARIOS = ("min", "med", "max")

POTENTIAL_TABLE = "municipality_cp2b_potential"
PARAMETERS_TABLE = "cp2b_parameters"
FL_TABLE = "cp2b_spatial_fl"

NOT_LOADED = (
    "CP2b data not loaded. Apply migration 034_cp2b_potential.sql and run "
    "`python -m scripts.load_cp2b_potential`."
)

LEVEL_LABELS = {
    "n1": "Theoretical",
    "n2": "Technical",
    "n3": "Mobilisable",
    "n4": "Accessible",
}


def _table_exists(cursor, table_name: str) -> bool:
    cursor.execute(
        "SELECT 1 FROM information_schema.tables "
        "WHERE table_schema = 'public' AND table_name = %s LIMIT 1",
        (table_name,),
    )
    return cursor.fetchone() is not None


def _volume(m3_year) -> dict:
    """One volume in both units the platform shows. None stays None."""
    if m3_year is None:
        return {"m3_year": None, "m3_day": None}
    v = float(m3_year)
    return {"m3_year": round(v, 2), "m3_day": round(v / DAYS_PER_YEAR, 2)}


def _scenario_block(row: dict) -> dict:
    """Shape one aggregated row (one scenario) into the served structure."""
    block = {level: _volume(row.get(f"{level}_ch4")) for level in LEVELS}
    block["non_lignocellulosic"] = {
        level: _volume(row.get(f"{level}_ch4_nl")) for level in ("n3", "n4")
    }
    block["equivalents"] = {
        "n3_biogas": _volume(row.get("n3_biogas")),
        "n3_biomethane": _volume(row.get("n3_biomethane")),
        "n4_biogas": _volume(row.get("n4_biogas")),
        "n4_biomethane": _volume(row.get("n4_biomethane")),
    }
    block["existing_use_subtracted"] = _volume(row.get("existing_use"))
    return block


_SUMMARY_SQL = """
    SELECT scenario,
           max(method_version)                         AS method_version,
           count(DISTINCT ibge_code)                   AS municipalities,
           sum(n1_ch4_nm3_year)                        AS n1_ch4,
           sum(n2_ch4_nm3_year)                        AS n2_ch4,
           sum(n3_ch4_nm3_year)                        AS n3_ch4,
           sum(n4_ch4_nm3_year)                        AS n4_ch4,
           sum(n3_ch4_nm3_year) FILTER (WHERE NOT lignocellulosic) AS n3_ch4_nl,
           sum(n4_ch4_nm3_year) FILTER (WHERE NOT lignocellulosic) AS n4_ch4_nl,
           sum(n3_biogas_eq_nm3_year)                  AS n3_biogas,
           sum(n3_biomethane_eq_nm3_year)              AS n3_biomethane,
           sum(n4_biogas_eq_nm3_year)                  AS n4_biogas,
           sum(n4_biomethane_eq_nm3_year)              AS n4_biomethane,
           sum(existing_use_subtracted_ch4_nm3_year)   AS existing_use
    FROM municipality_cp2b_potential
    GROUP BY scenario
"""

_BY_RESIDUE_SQL = """
    SELECT residue, sector,
           sum(n1_ch4_nm3_year) AS n1_ch4,
           sum(n3_ch4_nm3_year) AS n3_ch4,
           sum(n4_ch4_nm3_year) AS n4_ch4
    FROM municipality_cp2b_potential
    WHERE scenario = 'med'
    GROUP BY residue, sector
    ORDER BY sum(n3_ch4_nm3_year) DESC
"""

# Share of N3 (med) held by substrates with at least one provisional element.
# Served so the interface can state it next to the number, as the article does.
_PROVISIONAL_SQL = """
    SELECT sum(p.n3_ch4_nm3_year) FILTER (
               WHERE p.substrate IN (SELECT substrate FROM cp2b_parameters
                                     WHERE status = 'provisorio')
           ) / NULLIF(sum(p.n3_ch4_nm3_year), 0) AS provisional_share,
           (SELECT count(DISTINCT substrate) FROM cp2b_parameters
             WHERE status = 'provisorio') AS provisional_substrates
    FROM municipality_cp2b_potential p
    WHERE p.scenario = 'med'
"""


def build_summary(scenario_rows: list, residue_rows: list, provisional: Optional[dict]) -> dict:
    """Pure: turn the three query results into the /summary payload."""
    by_scenario = {r["scenario"]: r for r in scenario_rows}
    missing = [s for s in SCENARIOS if s not in by_scenario]
    if missing:
        raise ValueError(f"CP2b table lacks scenarios {missing}")
    med = by_scenario["med"]
    n3_med = float(med["n3_ch4"] or 0)

    by_residue = []
    for r in residue_rows:
        n3 = float(r["n3_ch4"] or 0)
        by_residue.append(
            {
                "residue": r["residue"],
                "sector": r["sector"],
                "n1": _volume(r["n1_ch4"]),
                "n3": _volume(r["n3_ch4"]),
                "n4": _volume(r["n4_ch4"]),
                "share_of_n3": round(n3 / n3_med, 4) if n3_med else None,
            }
        )

    prov_share = provisional.get("provisional_share") if provisional else None
    return {
        "method": "CP2b",
        "method_version": med["method_version"],
        "scope": "SP",
        "scope_label": "São Paulo State",
        "total_municipalities": int(med["municipalities"] or 0),
        "basis": "CH4",
        "unit": "Nm3 CH4",
        "headline_level": "n3",
        "levels": {k: LEVEL_LABELS[k] for k in LEVELS},
        "scenarios": {s: _scenario_block(by_scenario[s]) for s in SCENARIOS},
        "by_residue_med": by_residue,
        "provisional_parameters": {
            "substrates": int(provisional["provisional_substrates"] or 0) if provisional else None,
            "share_of_n3_med": round(float(prov_share), 4) if prov_share is not None else None,
        },
        "notes": [
            "N3 (mobilisable) is the headline figure; N4 applies storage losses and the "
            "spatial logistic factor on the road network.",
            "Not comparable one-to-one with the Atlas Real/Ideal scenarios: different "
            "method, and sugarcane includes the surplus bagasse the Atlas excludes.",
            "Scenarios min/max take every element at the same end of its range: an "
            "envelope, not a probability interval.",
        ],
    }


@router.get(
    "/summary",
    summary="CP2b state totals",
    description="São Paulo totals at the four CP2b levels, per scenario, in Nm³ CH₄.",
)
async def get_cp2b_summary():
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            try:
                if not _table_exists(cursor, POTENTIAL_TABLE):
                    raise HTTPException(status_code=503, detail=NOT_LOADED)
                cursor.execute(_SUMMARY_SQL)
                scenario_rows = cursor.fetchall()
                if not scenario_rows:
                    raise HTTPException(status_code=503, detail=NOT_LOADED)
                cursor.execute(_BY_RESIDUE_SQL)
                residue_rows = cursor.fetchall()
                provisional = None
                if _table_exists(cursor, PARAMETERS_TABLE):
                    cursor.execute(_PROVISIONAL_SQL)
                    provisional = cursor.fetchone()
            finally:
                cursor.close()
        return build_summary(scenario_rows, residue_rows, provisional)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_cp2b_summary: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch CP2b summary")


def build_municipality(ibge_code: str, rows: list, fl_rows: list) -> dict:
    """Pure: per-substrate rows (all scenarios) → the municipality payload."""
    fl = {(r["substrate"], r["scenario"]): r for r in fl_rows}
    substrates: dict[str, dict] = {}
    totals = {s: {level: 0.0 for level in LEVELS} for s in SCENARIOS}
    for r in rows:
        entry = substrates.setdefault(
            r["substrate"],
            {
                "substrate": r["substrate"],
                "residue": r["residue"],
                "sector": r["sector"],
                "lignocellulosic": bool(r["lignocellulosic"]),
                "scenarios": {},
            },
        )
        f = fl.get((r["substrate"], r["scenario"]))
        entry["scenarios"][r["scenario"]] = {
            **{f"{level}_ch4_m3_year": r[f"{level}_ch4_nm3_year"] for level in LEVELS},
            "existing_use_subtracted_ch4_m3_year": r["existing_use_subtracted_ch4_nm3_year"],
            "n3_biogas_eq_m3_year": r["n3_biogas_eq_nm3_year"],
            "n3_biomethane_eq_m3_year": r["n3_biomethane_eq_nm3_year"],
            "ch4_fraction_in_biogas": r["ch4_fraction_in_biogas"],
            "fs_x_fl": r["fs_x_fl"],
            "spatial_fl": (
                {
                    "b_principal": f["fl_b_codigestion_allocated"],
                    "a_upper": f["fl_a_codigestion_coverage"],
                    "d_lower": f["fl_d_mono_allocated"],
                }
                if f
                else None
            ),
        }
        for level in LEVELS:
            totals[r["scenario"]][level] += float(r[f"{level}_ch4_nm3_year"] or 0)

    ordered = sorted(
        substrates.values(),
        key=lambda e: -(e["scenarios"].get("med", {}).get("n3_ch4_m3_year") or 0),
    )
    return {
        "ibge_code": ibge_code,
        "method": "CP2b",
        "method_version": rows[0]["method_version"],
        "basis": "CH4",
        "unit": "Nm3 CH4",
        "headline_level": "n3",
        "totals": {s: {level: _volume(totals[s][level]) for level in LEVELS} for s in SCENARIOS},
        "substrates": ordered,
    }


@router.get(
    "/municipalities/{ibge_code}",
    summary="CP2b potential for one municipality",
    description="N1–N4 per substrate and scenario, with the spatial logistic factor.",
)
async def get_cp2b_municipality(ibge_code: str):
    if not (ibge_code.isdigit() and len(ibge_code) == 7):
        raise HTTPException(status_code=422, detail="ibge_code must be 7 digits")
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            try:
                if not _table_exists(cursor, POTENTIAL_TABLE):
                    raise HTTPException(status_code=503, detail=NOT_LOADED)
                cursor.execute(
                    f"SELECT * FROM {POTENTIAL_TABLE} WHERE ibge_code = %s "
                    "ORDER BY substrate, scenario",
                    (int(ibge_code),),
                )
                rows = cursor.fetchall()
                fl_rows = []
                if rows and _table_exists(cursor, FL_TABLE):
                    cursor.execute(
                        f"SELECT * FROM {FL_TABLE} WHERE ibge_code = %s", (int(ibge_code),)
                    )
                    fl_rows = cursor.fetchall()
            finally:
                cursor.close()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_cp2b_municipality({ibge_code}): {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch CP2b municipality")

    if not rows:
        # Outside SP, or an SP code the method does not cover: say so, never 0.
        raise HTTPException(
            status_code=404, detail=f"No CP2b potential for municipality {ibge_code} (scope: SP)"
        )
    return build_municipality(ibge_code, rows, fl_rows)


@router.get(
    "/parameters",
    summary="CP2b calculation elements",
    description="min/med/max per substrate and element, with source and status "
    "(status = provisorio: no primary source for São Paulo yet).",
)
async def get_cp2b_parameters(
    substrate: Optional[str] = Query(None, max_length=32, description="CP2b substrate code"),
    status: Optional[str] = Query(None, pattern="^(cp2b|provisorio)$"),
):
    clauses, params = [], []
    if substrate:
        clauses.append("substrate = %s")
        params.append(substrate.upper())
    if status:
        clauses.append("status = %s")
        params.append(status)
    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            try:
                if not _table_exists(cursor, PARAMETERS_TABLE):
                    raise HTTPException(status_code=503, detail=NOT_LOADED)
                cursor.execute(
                    f"SELECT substrate, residue, element, min_value, med_value, max_value, "
                    f"unit, source, status, method_version FROM {PARAMETERS_TABLE} {where} "
                    "ORDER BY substrate, element",
                    tuple(params),
                )
                rows = [dict(r) for r in cursor.fetchall()]
            finally:
                cursor.close()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_cp2b_parameters: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch CP2b parameters")
    return {"count": len(rows), "parameters": rows}

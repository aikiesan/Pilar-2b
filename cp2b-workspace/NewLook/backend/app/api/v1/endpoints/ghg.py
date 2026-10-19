"""
Avoided-emissions endpoints (docs/data/ESPEC_MODULO_GEE.md).

* /parameters serves ghg.yaml's options so the interface never retypes them.
* /estimate is the calculator's engine: one plant, the user's own baseline.
* /municipalities/{ibge} applies each CP2b substrate's default baseline to the
  municipality's potential (migration 034).

Every result carries the GWP version and the parameters still marked
`conferir`, and says "potencial de redução", never "créditos" (spec §4).
"""

import logging
from dataclasses import asdict
from typing import Literal, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.api.v1.endpoints.cp2b import NOT_LOADED, POTENTIAL_TABLE, _table_exists
from app.core.database import get_db
from app.services.canonical_loader import load_ghg_params
from app.services.ghg_service import GhgInput, GhgResult, estimate, estimate_substrates

logger = logging.getLogger(__name__)
router = APIRouter()

BAD_INPUT = (
    "Invalid GHG input: baseline, route, slip_technology and gwp_version must be keys "
    "served by /ghg/parameters, and leak + flared_fraction must not exceed 1."
)
NOTE = (
    "Potencial de redução de emissões, não crédito: virar crédito exige "
    "adicionalidade, um único instrumento por volume e uma linha de base declarada."
)


class GhgEstimateRequest(BaseModel):
    ch4_produced_nm3_year: float = Field(..., ge=0, description="Methane the digester produces")
    baseline: str = "nao_informado"
    baseline_capture: float = Field(0.0, ge=0, le=1)
    route: str = "biometano_veicular"
    slip_technology: Optional[str] = None
    leak: Optional[float] = Field(None, ge=0, le=1)
    flared_fraction: float = Field(0.0, ge=0, le=1)
    flare_efficiency: Optional[float] = Field(None, ge=0, le=1)
    electrical_efficiency: Optional[float] = Field(None, gt=0, le=1)
    gwp_version: Optional[str] = None


def _serialize(r: GhgResult) -> dict:
    out = asdict(r)
    out["pe_total_t"] = r.pe_total_t
    out["unverified"] = list(r.unverified)
    return out


def _run(fn):
    """Call the engine, turning its ValueError into a 422 and anything else into a 500."""
    try:
        return fn()
    except ValueError:
        raise HTTPException(status_code=422, detail=BAD_INPUT)
    except FileNotFoundError as e:
        logger.error(f"GHG parameters missing: {e}")
        raise HTTPException(status_code=503, detail="GHG parameters not available")


@router.get("/parameters", summary="GHG parameters and options (ghg.yaml)")
async def get_ghg_parameters():
    return _run(load_ghg_params)


@router.post("/estimate", summary="Avoided emissions of one plant")
async def post_ghg_estimate(body: GhgEstimateRequest):
    result = _run(lambda: estimate(load_ghg_params(), GhgInput(**body.model_dump())))
    return {**_serialize(result), "note": NOTE}


_MUNICIPALITY_SQL = """
    SELECT substrate, residue, sector, {level}_ch4_nm3_year AS ch4
    FROM municipality_cp2b_potential
    WHERE ibge_code = %s AND scenario = %s
"""


def build_municipality(ibge_code: str, rows: list, results: dict[str, GhgResult]) -> dict:
    """Pure: per-substrate rows + their estimates → the municipality payload."""
    substrates = []
    for row in rows:
        r = results[row["substrate"]]
        substrates.append(
            {
                "substrate": row["substrate"],
                "residue": row["residue"],
                "sector": row["sector"],
                "ch4_nm3_year": float(row["ch4"] or 0),
                "baseline": r.assumptions["baseline"],
                **_serialize(r),
            }
        )
    substrates.sort(key=lambda s: -s["er_net_t"])
    keys = ("be_methane_t", "be_fossil_t", "pe_total_t", "er_net_t")
    totals = {k: sum(s[k] for s in substrates) for k in keys}
    unverified = sorted({u for s in substrates if s["ch4_nm3_year"] > 0 for u in s["unverified"]})
    first = next(iter(results.values()), None)
    return {
        "ibge_code": ibge_code,
        "gwp_version": first.gwp_version if first else None,
        "totals": totals,
        "substrates": substrates,
        "unverified": unverified,
        "note": NOTE,
    }


@router.get(
    "/municipalities/{ibge_code}",
    summary="Avoided-emissions potential of one municipality",
    description="Each CP2b substrate with its default baseline, at one level and scenario.",
)
async def get_ghg_municipality(
    ibge_code: str,
    level: Literal["n3", "n4"] = Query("n3", description="CP2b level used as produced methane"),
    scenario: Literal["min", "med", "max"] = "med",
    route: str = "biometano_veicular",
    gwp_version: Optional[str] = None,
):
    if not (ibge_code.isdigit() and len(ibge_code) == 7):
        raise HTTPException(status_code=422, detail="ibge_code must be 7 digits")
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            try:
                if not _table_exists(cursor, POTENTIAL_TABLE):
                    raise HTTPException(status_code=503, detail=NOT_LOADED)
                # level is a Literal, so formatting it into the SQL is safe.
                cursor.execute(_MUNICIPALITY_SQL.format(level=level), (int(ibge_code), scenario))
                rows = cursor.fetchall()
            finally:
                cursor.close()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_ghg_municipality: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch GHG potential")
    if not rows:
        raise HTTPException(status_code=404, detail=f"No CP2b potential for {ibge_code}")

    template = GhgInput(0.0, route=route, gwp_version=gwp_version)
    results = _run(
        lambda: estimate_substrates(
            load_ghg_params(), {r["substrate"]: float(r["ch4"] or 0) for r in rows}, template
        )
    )
    return {
        **build_municipality(ibge_code, rows, results),
        "level": level,
        "scenario": scenario,
        "route": route,
    }

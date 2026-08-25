"""
Intermediate Regions API Endpoints
133 IBGE intermediate regions (Regiões Geográficas Intermediárias, 2017)
Serves aggregated biogas/biomass data and GeoJSON for national map rendering.
"""

import json
import logging
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse

from app.core.database import get_db

logger = logging.getLogger(__name__)
router = APIRouter()

_GEOJSON_CANDIDATES = [
    Path(__file__).parent.parent.parent.parent.parent.parent
    / "frontend"
    / "public"
    / "data"
    / "br_intermediary_regions.geojson",
    Path(__file__).parent.parent.parent.parent.parent / "data" / "br_intermediary_regions.geojson",
]

_geojson_cache: dict | None = None


def _load_geojson() -> dict:
    global _geojson_cache
    if _geojson_cache is not None:
        return _geojson_cache
    for candidate in _GEOJSON_CANDIDATES:
        if candidate.exists():
            with open(candidate, encoding="utf-8") as f:
                _geojson_cache = json.load(f)
            logger.info(f"Loaded GeoJSON from {candidate}")
            return _geojson_cache
    raise FileNotFoundError(
        "br_intermediary_regions.geojson not found. "
        f"Checked: {[str(c) for c in _GEOJSON_CANDIDATES]}"
    )


def _normalize_code(code) -> str:
    return str(code).strip().lstrip("0").zfill(4) if code else ""


# ─── Endpoints ────────────────────────────────────────────────────────────────


@router.get("/geojson")
async def get_intermediate_regions_geojson(
    state_code: Optional[str] = Query(
        None, description="Filter by 2-digit IBGE state code (e.g. '35' for SP)"
    ),
    enrich: bool = Query(True, description="Merge biogas/biomass data into feature properties"),
):
    """
    GeoJSON FeatureCollection of all 133 IBGE intermediate regions.
    With enrich=true (default), merges aggregated biogas/biomass from the local DB.
    """
    try:
        geojson = _load_geojson()
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=str(e))

    features = list(geojson.get("features", []))

    if state_code:
        features = [
            f
            for f in features
            if str(f.get("properties", {}).get("cd_uf", "")).strip() == state_code.strip()
        ]

    if enrich:
        try:
            rows = _fetch_all_from_db(state_code=state_code)
            code_to_row = {_normalize_code(r["ibge_code"]): dict(r) for r in rows}

            enriched = []
            for feature in features:
                props = dict(feature.get("properties", {}))
                code = _normalize_code(props.get("cd_rgint") or props.get("cd_rgint_str"))
                db_row = code_to_row.get(code, {})
                props.update({k: v for k, v in db_row.items() if k != "ibge_code"})
                enriched.append({**feature, "properties": props})
            features = enriched
        except Exception as exc:
            logger.warning(f"Could not enrich GeoJSON from DB: {exc}. Returning raw geometry.")

    return JSONResponse(
        {
            "type": "FeatureCollection",
            "features": features,
            "metadata": {
                "total": len(features),
                "source": "IBGE Regiões Geográficas Intermediárias 2017",
                "enriched": enrich,
            },
        }
    )


@router.get("/rankings")
async def get_rankings(
    metric: str = Query("total_biogas_m3_year"),
    limit: int = Query(20, ge=1, le=133),
):
    """Top N regions by biogas or biomass potential."""
    allowed = {
        "total_biogas_m3_year",
        "agricultural_biogas_m3_year",
        "livestock_biogas_m3_year",
        "urban_biogas_m3_year",
        "total_biomass_tons_year",
    }
    if metric not in allowed:
        raise HTTPException(status_code=400, detail=f"metric must be one of {allowed}")

    try:
        rows = _fetch_all_from_db()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    rows.sort(key=lambda r: float(r.get(metric) or 0), reverse=True)

    return {
        "metric": metric,
        "rankings": [
            {
                "rank": i + 1,
                "ibge_code": r["ibge_code"],
                "name": r.get("name"),
                "state_code": r.get("state_code"),
                "value": r.get(metric, 0),
                "centroid_lat": r.get("centroid_lat"),
                "centroid_lng": r.get("centroid_lng"),
            }
            for i, r in enumerate(rows[:limit])
        ],
    }


@router.get("/")
async def list_intermediate_regions(
    state_code: Optional[str] = Query(None),
    sort_by: str = Query("total_biogas_m3_year"),
    order: str = Query("desc", pattern="^(asc|desc)$"),
    limit: int = Query(133, ge=1, le=133),
):
    """List all intermediate regions with summary stats."""
    try:
        rows = _fetch_all_from_db(state_code=state_code)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    rows.sort(key=lambda r: float(r.get(sort_by) or 0), reverse=(order == "desc"))

    return {
        "regions": rows[:limit],
        "total": len(rows),
        "filtered_by_state": state_code,
    }


@router.get("/{ibge_code}")
async def get_region_detail(ibge_code: str):
    """Full detail for a single intermediate region, including geometry."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM intermediate_regions WHERE ibge_code = %s", (ibge_code.strip(),)
            )
            row = cursor.fetchone()
            cursor.close()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    if not row:
        raise HTTPException(status_code=404, detail=f"Region {ibge_code} not found")

    region = dict(row)

    # Attach geometry from GeoJSON file
    try:
        geojson = _load_geojson()
        for feature in geojson.get("features", []):
            props = feature.get("properties", {})
            code = _normalize_code(props.get("cd_rgint") or props.get("cd_rgint_str"))
            if code == _normalize_code(ibge_code):
                region["geometry"] = feature.get("geometry")
                break
    except Exception:
        pass

    return region


@router.post("/cluster")
async def trigger_cluster_analysis(
    radius_km: float = Query(default=30.0, ge=10.0, le=150.0),
    min_biomass_tons: float = Query(default=1000.0, ge=0.0),
    max_clusters: int = Query(default=20, ge=1, le=50),
):
    """Trigger co-digestion cluster analysis (delegates to codigestion_service)."""
    try:
        from app.services.codigestion_service import find_codigestion_clusters

        return find_codigestion_clusters(
            radius_km=radius_km,
            min_biomass_tons=min_biomass_tons,
            max_clusters=max_clusters,
        )
    except Exception as exc:
        logger.error(f"Cluster analysis failed: {exc}")
        raise HTTPException(status_code=500, detail=f"Cluster analysis error: {exc}")


# ─── Internal helpers ─────────────────────────────────────────────────────────


def _fetch_all_from_db(state_code: Optional[str] = None) -> list[dict]:
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            if state_code:
                cursor.execute(
                    "SELECT * FROM intermediate_regions WHERE state_code = %s "
                    "ORDER BY total_biogas_m3_year DESC",
                    (state_code.strip(),),
                )
            else:
                cursor.execute(
                    "SELECT * FROM intermediate_regions ORDER BY total_biogas_m3_year DESC"
                )
            rows = cursor.fetchall()
            cursor.close()
        return [dict(r) for r in (rows or [])]
    except Exception as e:
        if "does not exist" in str(e) or "relation" in str(e).lower():
            logger.warning("intermediate_regions table not found — returning empty list")
            return []
        raise

"""
Intermediate Regions API Endpoints
133 IBGE intermediate regions (Regiões Geográficas Intermediárias, 2017)
Serves aggregated biogas/biomass data and GeoJSON for national map rendering.
"""

import json
import logging
from pathlib import Path
from functools import lru_cache
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)
router = APIRouter()

# Path to the GeoJSON file already present in the frontend public directory.
# The backend reads it directly to avoid duplicating the file.
_GEOJSON_CANDIDATES = [
    Path(__file__).parent.parent.parent.parent.parent.parent
    / "frontend" / "public" / "data" / "br_intermediary_regions.geojson",
    Path(__file__).parent.parent.parent.parent.parent
    / "data" / "br_intermediary_regions.geojson",
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


def _normalize_ibge_code(code) -> str:
    """Normalize region code to 4-char string (IBGE CSV uses 4 digits)."""
    return str(code).strip().lstrip("0").zfill(4) if code else ""


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/geojson")
async def get_intermediate_regions_geojson(
    state_code: Optional[str] = Query(None, description="Filter by 2-digit IBGE state code (e.g. '35' for SP)"),
    enrich: bool = Query(True, description="Merge Supabase biogas/biomass data into feature properties"),
):
    """
    GeoJSON FeatureCollection of all 133 IBGE intermediate regions.

    - `enrich=true` (default): merges aggregated biogas/biomass data from Supabase.
    - `enrich=false`: returns raw geometry + IBGE attributes only (faster).
    - `state_code=35`: filter to São Paulo only.
    """
    try:
        geojson = _load_geojson()
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=str(e))

    features = geojson.get("features", [])

    if state_code:
        features = [
            f for f in features
            if str(f.get("properties", {}).get("cd_uf", "")).strip() == state_code.strip()
        ]

    if enrich:
        try:
            db_rows = _fetch_all_regions_from_db()
            code_to_row = {_normalize_ibge_code(r["ibge_code"]): r for r in db_rows}

            enriched = []
            for feature in features:
                props = dict(feature.get("properties", {}))
                code = _normalize_ibge_code(props.get("cd_rgint") or props.get("cd_rgint_str"))
                row = code_to_row.get(code, {})
                props.update({k: v for k, v in row.items() if k != "ibge_code"})
                enriched.append({**feature, "properties": props})
            features = enriched
        except Exception as exc:
            logger.warning(f"Could not enrich GeoJSON from DB: {exc}. Returning raw geometry.")

    return JSONResponse({
        "type": "FeatureCollection",
        "features": features,
        "metadata": {
            "total": len(features),
            "source": "IBGE Regiões Geográficas Intermediárias 2017",
            "enriched": enrich,
        },
    })


@router.get("/")
async def list_intermediate_regions(
    state_code: Optional[str] = Query(None, description="Filter by 2-digit IBGE state code"),
    sort_by: str = Query("total_biogas_m3_year", description="Column to sort by"),
    order: str = Query("desc", regex="^(asc|desc)$"),
    limit: int = Query(133, ge=1, le=133),
):
    """List all (up to 133) intermediate regions with summary stats."""
    try:
        rows = _fetch_all_regions_from_db()
    except Exception as exc:
        logger.error(f"DB error in list_intermediate_regions: {exc}")
        raise HTTPException(status_code=500, detail="Failed to fetch regions from database")

    if state_code:
        rows = [r for r in rows if r.get("state_code") == state_code.strip()]

    reverse = order == "desc"
    try:
        rows.sort(key=lambda r: float(r.get(sort_by) or 0), reverse=reverse)
    except (TypeError, ValueError):
        pass

    return {
        "regions": rows[:limit],
        "total": len(rows),
        "filtered_by_state": state_code,
    }


@router.get("/rankings")
async def get_rankings(
    metric: str = Query("total_biogas_m3_year", description="biogas_m3_year or biomass_tons_year"),
    limit: int = Query(20, ge=1, le=133),
):
    """Top N regions by biogas or biomass potential."""
    allowed_metrics = {
        "total_biogas_m3_year", "agricultural_biogas_m3_year",
        "livestock_biogas_m3_year", "urban_biogas_m3_year",
        "total_biomass_tons_year",
    }
    if metric not in allowed_metrics:
        raise HTTPException(status_code=400, detail=f"metric must be one of {allowed_metrics}")

    try:
        rows = _fetch_all_regions_from_db()
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


@router.get("/{ibge_code}")
async def get_region_detail(ibge_code: str):
    """Full detail for a single intermediate region (stats + geometry)."""
    try:
        from app.services.supabase_client import get_supabase_client
        supabase = get_supabase_client()
        result = supabase.table("intermediate_regions").select("*").eq("ibge_code", ibge_code.strip()).execute()
        rows = result.data or []
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    if not rows:
        raise HTTPException(status_code=404, detail=f"Region {ibge_code} not found")

    region = rows[0]

    # Attach geometry from GeoJSON
    try:
        geojson = _load_geojson()
        for feature in geojson.get("features", []):
            props = feature.get("properties", {})
            code = _normalize_ibge_code(props.get("cd_rgint") or props.get("cd_rgint_str"))
            if code == _normalize_ibge_code(ibge_code):
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
    """
    Trigger co-digestion cluster analysis at the intermediate region level.
    Delegates to the existing codigestion_service.
    """
    try:
        from app.services.codigestion_service import find_codigestion_clusters
        result = find_codigestion_clusters(
            radius_km=radius_km,
            min_biomass_tons=min_biomass_tons,
            max_clusters=max_clusters,
        )
        return result
    except Exception as exc:
        logger.error(f"Cluster analysis failed: {exc}")
        raise HTTPException(status_code=500, detail=f"Cluster analysis error: {exc}")


# ─── Internal helpers ─────────────────────────────────────────────────────────

def _fetch_all_regions_from_db() -> list[dict]:
    """Fetch all rows from intermediate_regions table. Cached per-process."""
    from app.services.supabase_client import get_supabase_client
    supabase = get_supabase_client()
    result = supabase.table("intermediate_regions").select("*").execute()
    return result.data or []

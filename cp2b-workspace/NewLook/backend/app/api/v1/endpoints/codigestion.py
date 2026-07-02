"""
Co-digestion clustering API endpoints.
Identifies municipal clusters with spatially feasible co-digestion opportunities
based on C:N ratio complementarity. Results are for spatial screening only —
laboratory validation is required before implementation.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query

from app.middleware.auth import get_current_user
from app.models.auth import UserProfile
from app.services.cache_service import LRUCache

logger = logging.getLogger(__name__)
router = APIRouter()

# ─── Simple in-process cache (avoids repeated O(n²) computation) ─────────────

# Bounded LRU with TTL: the key is derived from caller-supplied query params,
# so an unbounded dict would let a client mint unlimited entries by varying
# the params. 64 entries comfortably covers the realistic param grid.
_cluster_cache = LRUCache(max_size=64, default_ttl=3600)
_cn_profile_cache: list[dict] | None = None

# Upper bound for min_biomass_tons: generous vs. any real SP cluster total,
# exists so the cache key space stays finite.
MAX_MIN_BIOMASS_TONS = 1_000_000.0


def _cache_key(radius_km: float, min_biomass_tons: float, max_clusters: int) -> str:
    return f"clusters:{round(radius_km, 1)}:{round(min_biomass_tons, 0)}:{max_clusters}"


# ─── Endpoints ────────────────────────────────────────────────────────────────


@router.get("/clusters")
async def get_codigestion_clusters(
    radius_km: float = Query(
        default=30.0,
        ge=10.0,
        le=150.0,
        description="Spatial proximity threshold for grouping municipalities (km)",
    ),
    min_biomass_tons: float = Query(
        default=1000.0,
        ge=0.0,
        le=MAX_MIN_BIOMASS_TONS,
        description="Minimum cluster-level biomass for a residue to qualify (t/yr)",
    ),
    max_clusters: int = Query(
        default=20,
        ge=1,
        le=50,
        description="Maximum number of clusters to return, ranked by improvement score",
    ),
):
    """
    Identify co-digestion opportunity clusters.

    Groups São Paulo municipalities within radius_km of each other, then finds
    residue pairs where combining their biomass streams moves the weighted C:N
    ratio toward the 20–30 optimal range for anaerobic digestion.

    **Important:** Results are a spatial feasibility screening tool.
    Chemical compatibility must be validated in laboratory before implementation.
    """
    key = _cache_key(radius_km, min_biomass_tons, max_clusters)
    cached = _cluster_cache.get(key)
    if cached is not None:
        logger.info(
            "Returning cached cluster result for %s",
            key.replace("\n", " ").replace("\r", " ")[:200],
        )
        return cached

    try:
        from app.services.codigestion_service import find_codigestion_clusters

        result = find_codigestion_clusters(
            radius_km=radius_km,
            min_biomass_tons=min_biomass_tons,
            max_clusters=max_clusters,
        )
        _cluster_cache.set(key, result)
        return result
    except Exception as e:
        logger.error(f"Error computing co-digestion clusters: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Clustering error: {str(e)}")


@router.get("/clusters/{cluster_id}")
async def get_cluster_detail(
    cluster_id: str,
    radius_km: float = Query(default=30.0, ge=10.0, le=150.0),
    min_biomass_tons: float = Query(default=1000.0, ge=0.0, le=MAX_MIN_BIOMASS_TONS),
):
    """
    Get full detail for a specific cluster by ID.
    Uses the same radius/min_biomass parameters as the parent list endpoint.
    """
    key = _cache_key(radius_km, min_biomass_tons, 50)
    result = _cluster_cache.get(key)
    if result is None:
        # Trigger full computation with max clusters to ensure target is included
        try:
            from app.services.codigestion_service import find_codigestion_clusters

            result = find_codigestion_clusters(
                radius_km=radius_km,
                min_biomass_tons=min_biomass_tons,
                max_clusters=50,
            )
            _cluster_cache.set(key, result)
        except Exception as e:
            logger.error(f"Error computing clusters for detail lookup: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Clustering error: {str(e)}")

    clusters = result.get("clusters", [])
    for cluster in clusters:
        if cluster["cluster_id"] == cluster_id:
            return cluster

    raise HTTPException(status_code=404, detail=f"Cluster '{cluster_id}' not found")


@router.get("/municipality-cn-profiles")
async def get_municipality_cn_profiles_endpoint():
    """
    Weighted C/N ratio for every São Paulo municipality.

    Computes Σ(biomass_tons × cn_ratio) / Σ(biomass_tons) across all residue
    streams. Used to drive the C/N choropleth layer on the map.
    Result is cached for the process lifetime (reset via DELETE /clusters/cache).
    """
    global _cn_profile_cache
    if _cn_profile_cache is None:
        try:
            from app.services.codigestion_service import get_municipality_cn_profiles

            _cn_profile_cache = get_municipality_cn_profiles()
        except Exception as e:
            logger.error(f"Error computing municipality C/N profiles: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Error computing C/N profiles: {str(e)}")
    return {"profiles": _cn_profile_cache, "count": len(_cn_profile_cache)}


@router.get("/pairing-candidates")
async def get_pairing_candidates_endpoint(
    ibge_code: str = Query(..., description="IBGE code of the target municipality"),
    radius_km: float = Query(default=50.0, ge=5.0, le=200.0, description="Search radius in km"),
):
    """
    Top-ranked co-digestion partners for a municipality within radius_km.

    Ranks candidate municipalities by improvement_score:
        |cn_target − 25| − |cn_blended − 25|
    Higher score = blending moves the mixture closer to the 20–30 optimal range.
    Returns up to 20 candidates sorted descending by score.
    """
    try:
        from app.services.codigestion_service import get_pairing_candidates

        candidates = get_pairing_candidates(ibge_code=ibge_code, radius_km=radius_km)
    except Exception as e:
        logger.error(f"Error computing pairing candidates: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error computing candidates: {str(e)}")

    if candidates is None:
        raise HTTPException(status_code=404, detail=f"Municipality '{ibge_code}' not found")
    return {"ibge_code": ibge_code, "radius_km": radius_km, "candidates": candidates}


@router.get("/residue-cn-matrix")
async def get_residue_cn_matrix():
    """
    C:N ratios for all 11 residue types with role classification.

    Used to populate C:N badges in the residue filter panel.
    Roles: carbon_donor (C:N > 30), nitrogen_donor (C:N < 20), balanced (20–30).
    Data is static (from residuos table) and cached for the process lifetime.
    """
    try:
        from app.services.codigestion_service import get_residue_cn_matrix

        return get_residue_cn_matrix()
    except Exception as e:
        logger.error(f"Error fetching C:N matrix: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error fetching C:N data: {str(e)}")


@router.delete("/clusters/cache")
async def clear_cluster_cache(current_user: UserProfile = Depends(get_current_user)):
    """
    Clear the in-process cluster cache. Call after updating biomass data
    (e.g., after running load_biomass_tons.py).

    Requires authentication — this is an operational endpoint, and letting
    anonymous callers flush the cache forces repeated O(n²) recomputation.
    """
    global _cn_profile_cache
    count = _cluster_cache.get_stats()["size"]
    _cluster_cache.clear()
    _cn_profile_cache = None
    return {"cleared_entries": count, "message": "Cluster and C/N profile caches cleared"}

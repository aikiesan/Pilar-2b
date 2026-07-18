"""
PILAR-2b V3 - Infrastructure Endpoints
Provides GeoJSON data for infrastructure layers from real shapefiles
"""

import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException, Query

from app.core.database import get_db
from app.utils.shapefile_loader import SHAPEFILE_DIR, get_shapefile_loader

router = APIRouter()
logger = logging.getLogger(__name__)

shapefile_loader = get_shapefile_loader()


def _sanitize_geojson_response(geojson: Dict[str, Any]) -> Dict[str, Any]:
    """
    Remove internal error details from GeoJSON metadata before sending to clients.
    """
    metadata = geojson.get("metadata")
    if isinstance(metadata, dict):
        metadata.pop("error", None)
    return geojson


REQUIRED_SHAPEFILES = {
    "railways": ["Rodovias_Estaduais_SP"],
    "pipelines": ["Gasodutos_Distribuicao_SP", "Gasodutos_Transporte_SP"],
    "substations": ["Subestacoes_Energia"],
    "biogas-plants": ["Plantas_Biogas_SP"],
    "transmission-lines": ["Linhas_De_Transmissao_Energia"],
    "etes": ["ETEs_2019_SP"],
}
REQUIRED_SIDECAR_EXTENSIONS = (".shp", ".shx", ".dbf", ".prj")


@router.get("/railways/geojson")
async def get_railways_geojson() -> Dict[str, Any]:
    """
    Get state highway GeoJSON for São Paulo state.

    The route name is kept as /railways for frontend/API compatibility, but
    the dataset served here is Rodovias_Estaduais_SP.

    Returns:
        GeoJSON FeatureCollection with highway lines from Rodovias_Estaduais_SP.shp
    """
    try:
        geojson = shapefile_loader.load_shapefile_as_geojson(
            "Rodovias_Estaduais_SP", simplify_tolerance=0.001
        )
        geojson["metadata"]["layer_type"] = "railways"
        return geojson
    except Exception as e:
        logger.error("Error loading railways shapefile: %s", e)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/pipelines/geojson")
async def get_pipelines_geojson() -> Dict[str, Any]:
    """
    Get pipeline network GeoJSON for São Paulo state

    Returns:
        GeoJSON FeatureCollection with gas pipeline lines from Gasodutos shapefiles
    """
    try:
        dist_geojson = shapefile_loader.load_shapefile_as_geojson(
            "Gasodutos_Distribuicao_SP", simplify_tolerance=0.001
        )
        transp_geojson = shapefile_loader.load_shapefile_as_geojson(
            "Gasodutos_Transporte_SP", simplify_tolerance=0.001
        )
        combined_features = dist_geojson["features"] + transp_geojson["features"]
        return {
            "type": "FeatureCollection",
            "features": combined_features,
            "metadata": {
                "source": "Gasodutos_Distribuicao_SP.shp + Gasodutos_Transporte_SP.shp",
                "total_features": len(combined_features),
                "layer_type": "pipelines",
                "note": f"Dados de gasodutos - {len(combined_features)} segmentos",
            },
        }
    except Exception as e:
        logger.error("Error loading pipelines shapefile: %s", e)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/substations/geojson")
async def get_substations_geojson() -> Dict[str, Any]:
    """
    Get electrical substations GeoJSON for São Paulo state

    Returns:
        GeoJSON FeatureCollection with substation points from Subestacoes_Energia.shp
    """
    try:
        geojson = shapefile_loader.load_shapefile_as_geojson("Subestacoes_Energia")
        geojson["metadata"]["layer_type"] = "substations"
        return geojson
    except Exception as e:
        logger.error("Error loading substations shapefile: %s", e)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/biogas-plants/geojson")
async def get_biogas_plants_geojson() -> Dict[str, Any]:
    """
    Get existing biogas plants GeoJSON for São Paulo state

    Returns:
        GeoJSON FeatureCollection with biogas plant points from Plantas_Biogas_SP.shp
    """
    try:
        geojson = shapefile_loader.load_shapefile_as_geojson("Plantas_Biogas_SP")
        geojson["metadata"]["layer_type"] = "biogas_plants"
        return _sanitize_geojson_response(geojson)
    except Exception as e:
        logger.error("Error loading biogas-plants shapefile: %s", e)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/transmission-lines/geojson")
async def get_transmission_lines_geojson() -> Dict[str, Any]:
    """
    Get electrical transmission lines GeoJSON for São Paulo state

    Returns:
        GeoJSON FeatureCollection with transmission line polylines
    """
    try:
        geojson = shapefile_loader.load_shapefile_as_geojson(
            "Linhas_De_Transmissao_Energia", simplify_tolerance=0.001
        )
        geojson["metadata"]["layer_type"] = "transmission_lines"
        return _sanitize_geojson_response(geojson)
    except Exception as e:
        logger.error("Error loading transmission-lines shapefile: %s", e)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/etes/geojson")
async def get_etes_geojson() -> Dict[str, Any]:
    """
    Get wastewater treatment plants (ETEs) GeoJSON for São Paulo state

    Returns:
        GeoJSON FeatureCollection with ETE points
    """
    try:
        geojson = shapefile_loader.load_shapefile_as_geojson("ETEs_2019_SP")
        geojson["metadata"]["layer_type"] = "etes"
        return _sanitize_geojson_response(geojson)
    except Exception as e:
        logger.error("Error loading ETEs shapefile: %s", e)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/administrative-regions/geojson")
async def get_admin_regions_geojson() -> Dict[str, Any]:
    """
    Get administrative regions GeoJSON for São Paulo state

    Returns:
        GeoJSON FeatureCollection with admin region polygons
    """
    try:
        geojson = shapefile_loader.load_shapefile_as_geojson(
            "Regiao_Adm_SP", simplify_tolerance=0.001
        )
        geojson["metadata"]["layer_type"] = "administrative_regions"
        return _sanitize_geojson_response(geojson)
    except Exception as e:
        logger.error("Error loading admin-regions shapefile: %s", e)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/intermediate-regions/geojson")
async def get_intermediate_regions_geojson() -> Dict[str, Any]:
    """
    Get intermediate geographic regions GeoJSON for São Paulo state

    Returns:
        GeoJSON FeatureCollection with intermediate region polygons
    """
    try:
        geojson = shapefile_loader.load_shapefile_as_geojson(
            "SP_RG_Intermediarias_2024", simplify_tolerance=0.001
        )
        geojson["metadata"]["layer_type"] = "intermediate_regions"
        return _sanitize_geojson_response(geojson)
    except Exception as e:
        logger.error("Error loading intermediate-regions shapefile: %s", e)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/immediate-regions/geojson")
async def get_immediate_regions_geojson() -> Dict[str, Any]:
    """
    Get immediate geographic regions GeoJSON for São Paulo state

    Returns:
        GeoJSON FeatureCollection with immediate region polygons
    """
    try:
        geojson = shapefile_loader.load_shapefile_as_geojson(
            "SP_RG_Imediatas_2024", simplify_tolerance=0.001
        )
        geojson["metadata"]["layer_type"] = "immediate_regions"
        return geojson
    except Exception as e:
        logger.error("Error loading immediate-regions shapefile: %s", e)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/sp-boundary/geojson")
async def get_sp_boundary_geojson() -> Dict[str, Any]:
    """
    Get São Paulo state boundary GeoJSON

    Returns:
        GeoJSON FeatureCollection with state boundary polygon
    """
    try:
        geojson = shapefile_loader.load_shapefile_as_geojson("Limite_SP", simplify_tolerance=0.002)
        geojson["metadata"]["layer_type"] = "state_boundary"
        return geojson
    except Exception as e:
        logger.error("Error loading SP-boundary shapefile: %s", e)
        raise HTTPException(status_code=500, detail="Internal server error")


# =============================================================================
# NATIONAL LAYERS (PostGIS-backed, MapBiomas 10.1 INFRAESTRUTURA)
# =============================================================================
# The endpoints above serve São Paulo shapefiles off disk and are kept as-is.
# These read `infrastructure_features` (migration 023), which is national and
# already keyed to municipalities, so it supports uf/bbox filtering and joins
# that a shapefile cannot. New layers land here as data, not as new endpoints.


@router.get(
    "/layers",
    summary="List national infrastructure layers",
    description="Catalog of layers in infrastructure_features with feature counts.",
)
async def list_infrastructure_layers() -> Dict[str, Any]:
    try:
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("""
                SELECT layer_id,
                       count(*)                     AS features,
                       count(ibge_code)             AS municipality_keyed,
                       min(source_file)             AS source_file,
                       count(DISTINCT uf)           AS ufs
                FROM infrastructure_features
                GROUP BY layer_id
                ORDER BY layer_id
                """)
            rows = cur.fetchall()
            cur.close()
    except Exception as e:
        logger.error("Error listing infrastructure layers: %s", e)
        raise HTTPException(status_code=500, detail="Internal server error")

    return {
        "layers": [dict(r) for r in rows],
        "total_features": sum(int(r["features"]) for r in rows),
        "source": "MapBiomas 10.1 — INFRAESTRUTURA (loaded via migration 023)",
    }


@router.get(
    "/features/{layer_id}/geojson",
    summary="Get a national infrastructure layer as GeoJSON",
    description="Serves one layer from PostGIS, optionally filtered by UF or bbox.",
)
async def get_infrastructure_layer_geojson(
    layer_id: str,
    uf: Optional[str] = Query(
        None, min_length=2, max_length=2, description="Filter by UF, e.g. SP"
    ),
    bbox: Optional[str] = Query(None, description="'min_lng,min_lat,max_lng,max_lat' (EPSG:4326)"),
    limit: Optional[int] = Query(None, ge=1, le=20000),
) -> Dict[str, Any]:
    # These layers are small — the largest is 1,712 transmission lines — so they
    # serve at full resolution with no LOD, unlike the 5,571 municipality polygons.
    where = ["layer_id = %s"]
    params: list = [layer_id]

    if uf:
        where.append("uf = %s")
        params.append(uf.upper())

    if bbox:
        try:
            min_lng, min_lat, max_lng, max_lat = (float(v) for v in bbox.split(","))
        except ValueError:
            raise HTTPException(
                status_code=422, detail="bbox must be 'min_lng,min_lat,max_lng,max_lat'"
            )
        if min_lng >= max_lng or min_lat >= max_lat:
            raise HTTPException(status_code=422, detail="bbox min must be less than max")
        # && rides the GIST index on geometry.
        where.append("geometry && ST_MakeEnvelope(%s, %s, %s, %s, 4326)")
        params.extend([min_lng, min_lat, max_lng, max_lat])

    sql = f"""
        SELECT jsonb_build_object(
            'type', 'FeatureCollection',
            'features', COALESCE(jsonb_agg(feature), '[]'::jsonb)
        ) AS geojson
        FROM (
            SELECT jsonb_build_object(
                'type', 'Feature',
                'id', id,
                'geometry', ST_AsGeoJSON(geometry, 6)::jsonb,
                'properties', jsonb_build_object(
                    'layer_id', layer_id,
                    'name', name,
                    'ibge_code', ibge_code,
                    'uf', uf
                ) || attributes
            ) AS feature
            FROM infrastructure_features
            WHERE {' AND '.join(where)}
            {'LIMIT %s' if limit is not None else ''}
        ) f
    """
    if limit is not None:
        params.append(limit)

    try:
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(sql, params)
            result = cur.fetchone()
            cur.close()
    except Exception as e:
        logger.error(
            "Error loading infrastructure layer %s: %s",
            layer_id.replace("\n", " ").replace("\r", " ")[:50],
            e,
        )
        raise HTTPException(status_code=500, detail="Internal server error")

    geojson = result["geojson"] if result else None
    if not geojson or not geojson.get("features"):
        raise HTTPException(status_code=404, detail=f"No features for layer '{layer_id}'")
    return geojson


@router.get("/health")
async def health_check() -> Dict[str, Any]:
    """Health check endpoint for infrastructure module"""
    layers = {}
    missing = []
    for layer_type, shapefile_names in REQUIRED_SHAPEFILES.items():
        layer_missing = []
        for shapefile_name in shapefile_names:
            missing_parts = [
                f"{shapefile_name}{extension}"
                for extension in REQUIRED_SIDECAR_EXTENSIONS
                if not (SHAPEFILE_DIR / f"{shapefile_name}{extension}").exists()
            ]
            layer_missing.extend(missing_parts)
        layers[layer_type] = {
            "status": "missing" if layer_missing else "ready",
            "missing_files": layer_missing,
        }
        missing.extend(layer_missing)

    return {
        "status": "degraded" if missing else "healthy",
        "module": "infrastructure",
        "shapefile_dir": str(SHAPEFILE_DIR),
        "layers": layers,
        "missing_files": missing,
    }

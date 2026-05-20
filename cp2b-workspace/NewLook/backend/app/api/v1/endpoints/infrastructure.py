"""
PILAR-2b V3 - Infrastructure Endpoints
Provides GeoJSON data for infrastructure layers from real shapefiles
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any
import logging
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
            "Rodovias_Estaduais_SP",
            simplify_tolerance=0.001
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
            "Gasodutos_Distribuicao_SP",
            simplify_tolerance=0.001
        )
        transp_geojson = shapefile_loader.load_shapefile_as_geojson(
            "Gasodutos_Transporte_SP",
            simplify_tolerance=0.001
        )
        combined_features = dist_geojson["features"] + transp_geojson["features"]
        return {
            "type": "FeatureCollection",
            "features": combined_features,
            "metadata": {
                "source": "Gasodutos_Distribuicao_SP.shp + Gasodutos_Transporte_SP.shp",
                "total_features": len(combined_features),
                "layer_type": "pipelines",
                "note": f"Dados de gasodutos - {len(combined_features)} segmentos"
            }
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
            "Linhas_De_Transmissao_Energia",
            simplify_tolerance=0.001
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
            "Regiao_Adm_SP",
            simplify_tolerance=0.001
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
            "SP_RG_Intermediarias_2024",
            simplify_tolerance=0.001
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
            "SP_RG_Imediatas_2024",
            simplify_tolerance=0.001
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
        geojson = shapefile_loader.load_shapefile_as_geojson(
            "Limite_SP",
            simplify_tolerance=0.002
        )
        geojson["metadata"]["layer_type"] = "state_boundary"
        return geojson
    except Exception as e:
        logger.error("Error loading SP-boundary shapefile: %s", e)
        raise HTTPException(status_code=500, detail="Internal server error")


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

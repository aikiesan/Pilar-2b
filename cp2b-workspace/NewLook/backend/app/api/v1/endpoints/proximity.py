"""
PILAR-2b V3 - Proximity Analysis API Endpoint
Comprehensive spatial analysis for biogas potential assessment
"""

import logging
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.services.cache_service import get_proximity_cache_key, proximity_cache
from app.services.mapbiomas_service import MapBiomasService
from app.services.proximity_service import ProximityService
from app.services.validation_service import ValidationError, ValidationService

logger = logging.getLogger(__name__)
router = APIRouter()


# =============================================================================
# PYDANTIC MODELS - Request and Response Schemas
# =============================================================================


class AnalysisOptions(BaseModel):
    """Options for selective analysis components"""

    include_mapbiomas: bool = Field(default=True, description="Include MapBiomas land use analysis")
    include_biogas_potential: bool = Field(
        default=True, description="Include biogas potential aggregation"
    )
    include_infrastructure: bool = Field(
        default=True, description="Include infrastructure proximity"
    )


class ProximityAnalysisRequest(BaseModel):
    """Request model for proximity analysis"""

    latitude: float = Field(
        ..., ge=-25.0, le=-19.0, description="Latitude of analysis point (São Paulo state bounds)"
    )
    longitude: float = Field(
        ..., ge=-54.0, le=-44.0, description="Longitude of analysis point (São Paulo state bounds)"
    )
    radius_km: float = Field(
        ..., gt=0, le=100, description="Analysis radius in kilometers (1-100 km)"
    )
    options: AnalysisOptions = Field(default_factory=AnalysisOptions)

    class Config:
        json_schema_extra = {
            "example": {
                "latitude": -22.5,
                "longitude": -47.3,
                "radius_km": 20,
                "options": {
                    "include_mapbiomas": True,
                    "include_biogas_potential": True,
                    "include_infrastructure": True,
                },
            }
        }


class MunicipalityResult(BaseModel):
    """Municipality found within analysis radius"""

    id: int
    name: str
    ibge_code: Optional[str] = None
    distance_km: float
    intersection_percent: Optional[float] = None
    population: Optional[int] = None
    area_km2: Optional[float] = None
    biogas_m3_year: Optional[float] = None


class BiogasPotentialResult(BaseModel):
    """Aggregated biogas potential by category"""

    total_m3_year: float
    by_category: Dict[str, float]  # urban, agricultural, livestock
    by_residue: Dict[str, float]  # specific residue types
    energy_potential_mwh_year: float
    co2_reduction_tons_year: float
    homes_powered_equivalent: int


class LandUseResult(BaseModel):
    """MapBiomas land use analysis result"""

    total_area_km2: float
    by_class: Dict[str, Dict[str, Any]]  # class_id -> {name, color, area_km2, percent}
    dominant_class: str
    agricultural_percent: float


class InfrastructureItem(BaseModel):
    """Nearest infrastructure item"""

    type: str
    name: Optional[str] = None
    distance_km: float
    found: bool = True
    properties: Optional[Dict[str, Any]] = None


class AnalysisSummary(BaseModel):
    """Summary statistics for the analysis"""

    total_area_km2: float
    total_municipalities: int
    total_population: int
    total_biogas_m3_year: float
    energy_potential_mwh_year: float
    radius_recommendation: str  # "optimal", "acceptable", "excessive"


class AnalysisMetadata(BaseModel):
    """Metadata about the analysis execution"""

    analysis_timestamp: str
    processing_time_ms: int
    coordinate_system: str = "WGS84 (EPSG:4326)"
    buffer_projection: str = "SIRGAS 2000 / UTM 23S (EPSG:31983)"


class ProximityAnalysisResponse(BaseModel):
    """Complete response for proximity analysis"""

    analysis_id: str
    request: ProximityAnalysisRequest
    results: Dict[str, Any]
    summary: AnalysisSummary
    metadata: AnalysisMetadata


# =============================================================================
# API ENDPOINTS
# =============================================================================


@router.post(
    "/analyze",
    response_model=ProximityAnalysisResponse,
    summary="Perform Proximity Analysis",
    description="""
    Analyze biogas potential and land use within a specified radius around a point.

    Returns:
    - Municipalities within radius with biogas potential
    - Aggregated biogas potential by category (urban, agricultural, livestock)
    - MapBiomas land use percentages
    - Nearest infrastructure (pipelines, substations, railways)
    """,
)
async def analyze_proximity(request: ProximityAnalysisRequest):
    """
    Main proximity analysis endpoint.

    Performs comprehensive spatial analysis including:
    1. Buffer creation in UTM projection for accurate distances
    2. Municipality intersection with distance calculation
    3. Biogas potential aggregation
    4. MapBiomas raster sampling for land use
    5. Infrastructure proximity analysis
    """
    start_time = time.time()
    analysis_id = str(uuid.uuid4())

    logger.info("Starting proximity analysis %s", analysis_id)

    # Sprint 4: Validate request (Task 4.2 - Error Handling & Edge Cases)
    try:
        validation_result = ValidationService.validate_analysis_request(
            request.latitude, request.longitude, request.radius_km
        )
        # Log warnings if any (without warning content to avoid sensitive data exposure)
        for warning_index, _ in enumerate(validation_result.get("warnings", []), start=1):
            logger.warning("Validation warning generated (index=%d)", warning_index)
    except ValidationError as e:
        logger.warning(f"Validation failed: {e.message}")
        raise HTTPException(
            status_code=400, detail={"error": e.message, "code": e.code, "suggestion": e.suggestion}
        )

    # Check cache first (Sprint 4: Performance Optimization)
    cache_key = get_proximity_cache_key(request.latitude, request.longitude, request.radius_km)
    cached_result = proximity_cache.get(cache_key)

    if cached_result is not None:
        logger.info(f"✅ Cache hit for proximity analysis {analysis_id}")
        # Add cache indicator to response
        cached_result["from_cache"] = True
        cached_result["analysis_id"] = analysis_id
        # Add validation warnings to cached result
        if validation_result.get("warnings"):
            cached_result["warnings"] = validation_result["warnings"]
        return cached_result

    try:
        # Initialize services
        proximity_service = ProximityService()

        # Determine radius recommendation
        if request.radius_km <= 20:
            radius_recommendation = "optimal"
        elif request.radius_km <= 30:
            radius_recommendation = "acceptable"
        else:
            radius_recommendation = "excessive"

        # 1. Create buffer and get municipalities
        buffer_geojson, municipalities = proximity_service.get_municipalities_in_radius(
            lat=request.latitude, lng=request.longitude, radius_km=request.radius_km
        )

        logger.info(
            "Found %s municipalities within %s km", len(municipalities), float(request.radius_km)
        )

        # 2. Calculate biogas potential aggregation
        biogas_result = None
        if request.options.include_biogas_potential and municipalities:
            biogas_result = proximity_service.aggregate_biogas_potential(
                lat=request.latitude, lng=request.longitude, radius_km=request.radius_km
            )

        # 3. MapBiomas land use analysis
        land_use_result = None
        if request.options.include_mapbiomas:
            try:
                mapbiomas_service = MapBiomasService()
                land_use_result = mapbiomas_service.analyze_buffer(
                    lat=request.latitude, lng=request.longitude, radius_km=request.radius_km
                )
            except Exception as e:
                logger.warning(f"MapBiomas analysis failed: {e}")
                land_use_result = {
                    "error": str(e),
                    "total_area_km2": 0,
                    "by_class": {},
                    "dominant_class": "unknown",
                    "agricultural_percent": 0,
                }

        # 4. Infrastructure proximity analysis
        infrastructure_result = None
        if request.options.include_infrastructure:
            infrastructure_result = proximity_service.find_nearest_infrastructure(
                lat=request.latitude, lng=request.longitude
            )

        # 5. Correlate MapBiomas land use with residuos database
        residuos_correlation = None
        if land_use_result and request.options.include_biogas_potential:
            residuos_correlation = proximity_service.correlate_mapbiomas_residuos(
                land_use_data=land_use_result
            )
            logger.info(
                f"Found {residuos_correlation.get('total_potential_sources', 0)} land use to residuos correlations"
            )

        # 6. Get detailed residuos data for analysis context
        residuos_data = None
        if municipalities and request.options.include_biogas_potential:
            muni_names = [m["name"] for m in municipalities]
            residuos_data = proximity_service.get_residuos_for_municipalities(muni_names)

        # Calculate summary statistics
        total_population = sum(m.get("population", 0) or 0 for m in municipalities)
        total_biogas = biogas_result["total_m3_year"] if biogas_result else 0
        total_energy = biogas_result["energy_potential_mwh_year"] if biogas_result else 0

        # Calculate buffer area
        buffer_area_km2 = 3.14159 * (request.radius_km**2)

        # Build response
        results = {
            "buffer_geometry": buffer_geojson,
            "municipalities": municipalities,
        }

        if biogas_result:
            results["biogas_potential"] = biogas_result

        if land_use_result:
            results["land_use"] = land_use_result

        if infrastructure_result:
            results["infrastructure"] = infrastructure_result

        if residuos_correlation:
            results["residuos_correlation"] = residuos_correlation

        if residuos_data:
            results["residuos_data"] = residuos_data

        processing_time = int((time.time() - start_time) * 1000)

        response = ProximityAnalysisResponse(
            analysis_id=analysis_id,
            request=request,
            results=results,
            summary=AnalysisSummary(
                total_area_km2=round(buffer_area_km2, 2),
                total_municipalities=len(municipalities),
                total_population=total_population,
                total_biogas_m3_year=round(total_biogas, 2),
                energy_potential_mwh_year=round(total_energy, 2),
                radius_recommendation=radius_recommendation,
            ),
            metadata=AnalysisMetadata(
                analysis_timestamp=datetime.now(timezone.utc).isoformat(),
                processing_time_ms=processing_time,
            ),
        )

        logger.info(f"Analysis {analysis_id} completed in {processing_time}ms")

        # Store in cache (Sprint 4: Performance Optimization - 5 min TTL)
        response_dict = response.dict()
        response_dict["from_cache"] = False
        proximity_cache.set(cache_key, response_dict, ttl=300)

        return response

    except Exception as e:
        logger.error(f"Proximity analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Proximity analysis failed: {str(e)}")


@router.get(
    "/validate-point",
    summary="Validate Analysis Point",
    description="Check if a point is within São Paulo state bounds",
)
async def validate_point(
    latitude: float = Query(..., ge=-90, le=90), longitude: float = Query(..., ge=-180, le=180)
):
    """
    Validate if a point is within São Paulo state and suitable for analysis.

    Returns validation status and any warnings.
    """
    # São Paulo state approximate bounds
    SP_BOUNDS = {"min_lat": -25.3, "max_lat": -19.8, "min_lng": -53.1, "max_lng": -44.2}

    within_sp = (
        SP_BOUNDS["min_lat"] <= latitude <= SP_BOUNDS["max_lat"]
        and SP_BOUNDS["min_lng"] <= longitude <= SP_BOUNDS["max_lng"]
    )

    warnings = []

    if not within_sp:
        warnings.append("Ponto fora dos limites do Estado de São Paulo")

    # Check for ocean/coastal areas (rough check)
    if longitude > -44.5 and latitude > -24:
        warnings.append("Ponto possivelmente em área oceânica")

    return {
        "valid": within_sp,
        "latitude": latitude,
        "longitude": longitude,
        "within_sao_paulo": within_sp,
        "warnings": warnings,
        "bounds": SP_BOUNDS,
    }


@router.get(
    "/radius-recommendations",
    summary="Get Radius Recommendations",
    description="Get recommended radius values for different analysis scenarios",
)
async def get_radius_recommendations():
    """
    Return radius recommendations based on CP2B methodology.

    Biomass collection economics vary significantly with distance.
    """
    return {
        "recommendations": [
            {
                "range_km": "10-20",
                "category": "optimal",
                "color": "#22C55E",  # green
                "description": "Raio ótimo para coleta de biomassa",
                "economic_viability": "Alta",
                "transport_cost": "Baixo",
            },
            {
                "range_km": "21-30",
                "category": "acceptable",
                "color": "#EAB308",  # yellow
                "description": "Máximo economicamente viável",
                "economic_viability": "Média",
                "transport_cost": "Moderado",
            },
            {
                "range_km": "31-50",
                "category": "excessive",
                "color": "#EF4444",  # red
                "description": "Apenas casos excepcionais",
                "economic_viability": "Baixa",
                "transport_cost": "Alto",
            },
        ],
        "default_radius_km": 20,
        "min_radius_km": 1,
        "max_radius_km": 100,
        "methodology_reference": "CP2B FAPESP Project 2025/08745-2",
    }


@router.get(
    "/infrastructure-types",
    summary="Get Infrastructure Types",
    description="List available infrastructure types for proximity analysis",
)
async def get_infrastructure_types():
    """
    Return list of infrastructure types available for analysis.
    """
    return {
        "infrastructure_types": [
            {
                "id": "gas_pipeline",
                "name": "Gasoduto",
                "icon": "🔥",
                "search_radius_km": 100,
                "description": "Gasodutos de distribuição e transporte",
            },
            {
                "id": "substation",
                "name": "Subestação Elétrica",
                "icon": "⚡",
                "search_radius_km": 50,
                "description": "Subestações de energia elétrica",
            },
            {
                "id": "railway",
                "name": "Rodovia",
                "icon": "🛣️",
                "search_radius_km": 50,
                "description": "Rodovias estaduais para transporte",
            },
            {
                "id": "transmission_line",
                "name": "Linha de Transmissão",
                "icon": "🔌",
                "search_radius_km": 50,
                "description": "Linhas de transmissão de energia",
            },
            {
                "id": "ete",
                "name": "ETE (Estação de Tratamento)",
                "icon": "🏭",
                "search_radius_km": 30,
                "description": "Estações de tratamento de esgoto",
            },
        ]
    }

"""
Main API router for PILAR-2b V3
"""

from fastapi import APIRouter

from app.api.v1.endpoints import (
    analysis,
    auth,
    codigestion,
    geospatial,
    infrastructure,
    intermediate_regions,
    mapbiomas,
    maps,
    mock_geospatial,
    municipalities,
    proximity,
    residuos,
    scientific,
    statistics,
)
from app.routers import calculator, technology_routes

api_router = APIRouter()

# Include endpoint routers
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])

api_router.include_router(municipalities.router, prefix="/municipalities", tags=["municipalities"])

api_router.include_router(analysis.router, prefix="/analysis", tags=["analysis"])

api_router.include_router(maps.router, prefix="/maps", tags=["maps"])

api_router.include_router(geospatial.router, prefix="/geospatial", tags=["geospatial", "postgis"])

api_router.include_router(
    infrastructure.router, prefix="/infrastructure", tags=["infrastructure", "geospatial"]
)

# Mock data endpoints for development (sample data)
api_router.include_router(mock_geospatial.router, prefix="/mock", tags=["mock-data", "development"])

# MapBiomas raster tile endpoints
api_router.include_router(
    mapbiomas.router, prefix="/mapbiomas", tags=["mapbiomas", "raster", "environmental"]
)

# Proximity analysis endpoints
api_router.include_router(
    proximity.router, prefix="/proximity", tags=["proximity", "spatial-analysis", "geospatial"]
)

# Residuos (residues) with chemical parameters and scientific references
api_router.include_router(
    residuos.router,
    prefix="/residuos",
    tags=["residuos", "chemical-parameters", "scientific-references"],
)

# Statistics endpoints
api_router.include_router(statistics.router, prefix="/statistics", tags=["statistics", "summary"])

# Scientific database endpoints (Kinetics, etc.)
api_router.include_router(
    scientific.router, prefix="/scientific", tags=["scientific", "kinetics", "database"]
)

# Technology Routes endpoints (Educational pathway builder)
api_router.include_router(
    technology_routes.router,
    prefix="/technology-routes",
    tags=["technology-routes", "educational", "biogas-pathways"],
)

# Co-digestion clustering and C:N analysis
api_router.include_router(
    codigestion.router,
    prefix="/codigestion",
    tags=["codigestion", "clustering", "spatial-analysis", "cn-ratio"],
)

# National intermediate regions (Phase 1 — 133 IBGE regions)
api_router.include_router(
    intermediate_regions.router,
    prefix="/intermediate-regions",
    tags=["intermediate-regions", "national", "geospatial"],
)

# CP2B Biogas Viability Calculator (lead capture)
api_router.include_router(
    calculator.router, prefix="/calculator", tags=["calculator", "leads", "viability"]
)

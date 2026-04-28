"""
Municipalities API endpoints
"""
from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional, Dict, Any, List
from app.services.supabase_client import get_supabase_client
from app.middleware.auth import optional_auth
from app.models.auth import UserProfile
import logging
import json
from pathlib import Path
import geopandas as gpd
from shapely.geometry import mapping

logger = logging.getLogger(__name__)

router = APIRouter()

# Path to municipalities shapefile (try both possible locations)
# Navigate from backend/app/api/v1/endpoints/ to backend/data/shapefiles/
SHAPEFILE_PATH = Path(__file__).parent.parent.parent.parent.parent / "data" / "shapefiles" / "SP_Municipios_2024.shp"
# Alternative: navigate to project_map/data/shapefile
SHAPEFILE_PATH_ALT = Path(__file__).parent.parent.parent.parent.parent.parent.parent / "project_map" / "data" / "shapefile" / "SP_Municipios_2024.shp"

# Cache for loaded shapefile (load once, reuse)
_municipalities_gdf = None

@router.get("/geojson")
async def get_municipalities_geojson(
    limit: int = Query(default=1000, le=1000),
    current_user: Optional[UserProfile] = Depends(optional_auth)
):
    """
    Get all municipalities as GeoJSON FeatureCollection with POLYGON boundaries (public access).
    Loads polygon geometries from local shapefile and merges with biogas data from Supabase.
    """
    global _municipalities_gdf
    
    try:
        # Load shapefile (cached after first load)
        if _municipalities_gdf is None:
            logger.info(f"🗺️ Loading municipality polygons from shapefile...")
            
            # Try primary path first, then alternative
            shapefile_to_use = None
            if SHAPEFILE_PATH.exists():
                shapefile_to_use = SHAPEFILE_PATH
                logger.info(f"Found shapefile at: {SHAPEFILE_PATH}")
            elif SHAPEFILE_PATH_ALT.exists():
                shapefile_to_use = SHAPEFILE_PATH_ALT
                logger.info(f"Found shapefile at alternative location: {SHAPEFILE_PATH_ALT}")
            else:
                raise HTTPException(
                    status_code=500,
                    detail=f"Shapefile not found at {SHAPEFILE_PATH} or {SHAPEFILE_PATH_ALT}"
                )
            
            _municipalities_gdf = gpd.read_file(shapefile_to_use)
            logger.info(f"✅ Loaded {len(_municipalities_gdf)} municipality polygons from shapefile")
        else:
            logger.info(f"✅ Using cached shapefile data ({len(_municipalities_gdf)} municipalities)")
        
        # Fetch biogas data from Supabase
        logger.info("📊 Fetching biogas data from Supabase...")
        supabase = get_supabase_client()
        result = supabase.table("municipalities").select("*").limit(limit).execute()
        
        # Create lookup dictionary by IBGE code for fast merging
        biogas_lookup = {}
        if result.data:
            for mun in result.data:
                ibge_code = str(mun.get("ibge_code", "")).strip()
                if ibge_code:
                    biogas_lookup[ibge_code] = mun
            logger.info(f"✅ Loaded biogas data for {len(biogas_lookup)} municipalities from Supabase")
        else:
            logger.warning("No biogas data found in Supabase")
        
        # Merge shapefile polygons with Supabase biogas data
        merged_features = []
        matched_count = 0
        
        for idx, row in _municipalities_gdf.iterrows():
            # Get IBGE code from shapefile (try different possible column names)
            ibge_code = None
            for col in ["CD_MUN", "GEOCODIGO", "geocodigo", "CD_GEOCMU", "cd_mun"]:
                if col in row and row[col]:
                    ibge_code = str(row[col]).strip()
                    break
            
            if not ibge_code:
                logger.warning(f"Could not find IBGE code in shapefile row {idx}")
                continue
            
            # Get biogas data for this municipality
            biogas_data = biogas_lookup.get(ibge_code, {})
            
            # Get municipality name from shapefile or Supabase
            mun_name = biogas_data.get("municipality_name")
            if not mun_name:
                # Try to get from shapefile
                for col in ["NM_MUN", "nome", "NOME_MUN", "nm_mun"]:
                    if col in row and row[col]:
                        mun_name = str(row[col])
                        break
            
            # Convert geometry to GeoJSON (simpler approach using shapely's mapping)
            try:
                geometry = mapping(row.geometry)
            except Exception as e:
                logger.error(f"Error converting geometry for {ibge_code}: {e}")
                continue
            
            # Create merged feature with polygon geometry + biogas data
            merged_feature = {
                "type": "Feature",
                "geometry": geometry,  # Polygon from shapefile
                "properties": {
                    # Basic info
                    "ibge_code": ibge_code,
                    "name": mun_name or "Unknown",

                    # Biogas data from Supabase (if available)
                    "id": biogas_data.get("id"),
                    "municipality_name": biogas_data.get("municipality_name"),
                    "population": biogas_data.get("population"),
                    "area_km2": biogas_data.get("area_km2"),
                    "total_biogas_m3_year": biogas_data.get("total_biogas_m3_year"),
                    "agricultural_biogas_m3_year": biogas_data.get("agricultural_biogas_m3_year"),
                    "livestock_biogas_m3_year": biogas_data.get("livestock_biogas_m3_year"),
                    "urban_biogas_m3_year": biogas_data.get("urban_biogas_m3_year"),
                    "energy_potential_mwh_year": biogas_data.get("energy_potential_mwh_year"),
                    "administrative_region": biogas_data.get("administrative_region"),
                    "immediate_region": biogas_data.get("immediate_region"),
                    "intermediate_region": biogas_data.get("intermediate_region"),
                    "potential_category": biogas_data.get("potential_category"),

                    # Detailed residue fields for filtering
                    "sugarcane_biogas_m3_year": biogas_data.get("sugarcane_biogas_m3_year", 0),
                    "soybean_biogas_m3_year": biogas_data.get("soybean_biogas_m3_year", 0),
                    "corn_biogas_m3_year": biogas_data.get("corn_biogas_m3_year", 0),
                    "coffee_biogas_m3_year": biogas_data.get("coffee_biogas_m3_year", 0),
                    "citrus_biogas_m3_year": biogas_data.get("citrus_biogas_m3_year", 0),
                    "cattle_biogas_m3_year": biogas_data.get("cattle_biogas_m3_year", 0),
                    "swine_biogas_m3_year": biogas_data.get("swine_biogas_m3_year", 0),
                    "poultry_biogas_m3_year": biogas_data.get("poultry_biogas_m3_year", 0),
                    "aquaculture_biogas_m3_year": biogas_data.get("aquaculture_biogas_m3_year", 0),
                    "rsu_biogas_m3_year": biogas_data.get("rsu_biogas_m3_year", 0),
                    "rpo_biogas_m3_year": biogas_data.get("rpo_biogas_m3_year", 0),

                    # Biomass availability (tons/year) — populated by scripts/load_biomass_tons.py
                    "total_biomass_tons_year": biogas_data.get("total_biomass_tons_year", 0),
                    "agricultural_biomass_tons_year": biogas_data.get("agricultural_biomass_tons_year", 0),
                    "livestock_biomass_tons_year": biogas_data.get("livestock_biomass_tons_year", 0),
                    "urban_biomass_tons_year": biogas_data.get("urban_biomass_tons_year", 0),
                    "sugarcane_biomass_tons_year": biogas_data.get("sugarcane_biomass_tons_year", 0),
                    "soybean_biomass_tons_year": biogas_data.get("soybean_biomass_tons_year", 0),
                    "corn_biomass_tons_year": biogas_data.get("corn_biomass_tons_year", 0),
                    "coffee_biomass_tons_year": biogas_data.get("coffee_biomass_tons_year", 0),
                    "citrus_biomass_tons_year": biogas_data.get("citrus_biomass_tons_year", 0),
                    "cattle_biomass_tons_year": biogas_data.get("cattle_biomass_tons_year", 0),
                    "swine_biomass_tons_year": biogas_data.get("swine_biomass_tons_year", 0),
                    "poultry_biomass_tons_year": biogas_data.get("poultry_biomass_tons_year", 0),
                    "aquaculture_biomass_tons_year": biogas_data.get("aquaculture_biomass_tons_year", 0),
                    "rsu_biomass_tons_year": biogas_data.get("rsu_biomass_tons_year", 0),
                    "rpo_biomass_tons_year": biogas_data.get("rpo_biomass_tons_year", 0),
                }
            }
            
            if biogas_data:
                matched_count += 1
            
            merged_features.append(merged_feature)
        
        result_geojson = {
            "type": "FeatureCollection",
            "features": merged_features,
            "metadata": {
                "total_municipalities": len(merged_features),
                "matched_with_biogas_data": matched_count,
                "source_geometry": "Local Shapefile (SP_Municipios_2024.shp)",
                "source_biogas_data": "Supabase CP2B Database",
                "timestamp": "2025-11-24T00:00:00Z"
            }
        }
        
        logger.info(f"✅ Returning {len(merged_features)} municipalities with POLYGON boundaries ({matched_count} with biogas data)")
        return result_geojson
        
    except Exception as e:
        import traceback
        error_msg = f"Error creating municipalities GeoJSON: {str(e)}\n{traceback.format_exc()}"
        logger.error(error_msg)
        raise HTTPException(status_code=500, detail=f"Error: {type(e).__name__}: {str(e)}")

@router.get("/test-shapefile")
async def test_shapefile():
    """Test endpoint to verify shapefile loading"""
    try:
        logger.info("Testing shapefile loading...")
        
        # Try primary path
        if SHAPEFILE_PATH.exists():
            gdf = gpd.read_file(SHAPEFILE_PATH)
            logger.info(f"✓ Loaded {len(gdf)} features from {SHAPEFILE_PATH}")
            
            # Test geometry conversion
            from shapely.geometry import mapping
            test_geom = mapping(gdf.iloc[0].geometry)
            
            return {
                "success": True,
                "path": str(SHAPEFILE_PATH),
                "count": len(gdf),
                "columns": list(gdf.columns),
                "first_municipality": gdf.iloc[0]['NM_MUN'],
                "geometry_type": test_geom['type']
            }
        else:
            return {
                "success": False,
                "error": f"Shapefile not found at {SHAPEFILE_PATH}"
            }
    except Exception as e:
        logger.error(f"Test failed: {str(e)}", exc_info=True)
        return {
            "success": False,
            "error": str(e),
            "type": type(e).__name__
        }

@router.get("/stats/summary")
async def get_municipalities_stats():
    """Get summary statistics for all municipalities"""
    try:
        supabase = get_supabase_client()

        # Get count of municipalities
        count_result = supabase.table("municipalities").select("id").execute()
        total_municipalities = len(count_result.data)

        # Get aggregated stats
        stats_result = supabase.table("municipalities").select("population, area_km2, total_biogas_m3_year").execute()

        total_population = 0
        total_area = 0.0
        total_biogas = 0.0

        if stats_result.data:
            for m in stats_result.data:
                if m.get("population"):
                    total_population += m["population"]
                if m.get("area_km2"):
                    total_area += float(m["area_km2"]) if m["area_km2"] else 0
                if m.get("total_biogas_m3_year"):
                    total_biogas += float(m["total_biogas_m3_year"]) if m["total_biogas_m3_year"] else 0

        return {
            "total_municipalities": total_municipalities,
            "total_population": total_population,
            "total_area_km2": round(total_area, 2),
            "total_biogas_m3_year": round(total_biogas, 2),
            "timestamp": "2025-11-24T00:00:00Z"
        }
    except Exception as e:
        logger.error(f"Error calculating stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error calculating stats: {str(e)}")

@router.get("/")
async def get_municipalities(
    limit: int = Query(default=100, le=1000),
    offset: int = Query(default=0, ge=0),
    search: Optional[str] = Query(default=None)
):
    """Get list of municipalities with optional filtering"""
    try:
        supabase = get_supabase_client()

        # Build query - try 'municipalities' table (correct name in Supabase)
        query = supabase.table("municipalities").select("*")

        # Apply search filter if provided
        if search:
            query = query.ilike("municipality_name", f"%{search}%")

        # Apply pagination
        query = query.range(offset, offset + limit - 1)

        # Execute query
        result = query.execute()

        # Get total count
        count_result = supabase.table("municipalities").select("id").execute()
        total = len(count_result.data)

        return {
            "data": result.data,
            "total": total,
            "limit": limit,
            "offset": offset,
            "has_more": offset + limit < total
        }
    except Exception as e:
        logger.error(f"Error fetching municipalities: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching municipalities: {str(e)}")

@router.get("/{municipality_id}")
async def get_municipality(
    municipality_id: str
):
    """Get specific municipality details by ID or IBGE code"""
    try:
        supabase = get_supabase_client()

        # Try by ID first, then by IBGE code
        try:
            # Try as integer ID
            result = supabase.table("municipalities").select("*").eq("id", int(municipality_id)).execute()
        except ValueError:
            # If not integer, try as IBGE code
            result = supabase.table("municipalities").select("*").eq("ibge_code", municipality_id).execute()

        if not result.data or len(result.data) == 0:
            raise HTTPException(
                status_code=404,
                detail=f"Municipality with ID {municipality_id} not found"
            )

        municipality = result.data[0]
        return municipality

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching municipality: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching municipality: {str(e)}")

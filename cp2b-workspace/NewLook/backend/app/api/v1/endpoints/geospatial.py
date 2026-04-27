"""
Geospatial API Endpoints
Serve PostGIS data for interactive maps and spatial analysis
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
import logging
import psycopg2

from app.core.database import get_db
from app.middleware.auth import optional_auth
from app.models.auth import UserProfile
from app.utils.shapefile_loader import get_shapefile_loader

# Initialize shapefile loader
shapefile_loader = get_shapefile_loader()

router = APIRouter()
logger = logging.getLogger(__name__)

# ============================================================================
# SECURITY: Input Validation Constants
# ============================================================================

# (VALID_REGIONS whitelist removed — administrative_region filter now accepts any value;
#  SQL injection is already prevented by parameterized queries below.)

# Whitelist for sort columns (prevents SQL injection)
ALLOWED_SORT_COLUMNS = {
    "biogas": "total_biogas_m3_year",
    "name": "municipality_name",
    "population": "population",
    "area": "area_km2"
}

# Whitelist for sort order (prevents SQL injection)
ALLOWED_ORDERS = {"asc": "ASC", "desc": "DESC"}

# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class GeoJSONFeature(BaseModel):
    """Single GeoJSON feature"""
    type: str = "Feature"
    geometry: Dict[str, Any]
    properties: Dict[str, Any]


class GeoJSONFeatureCollection(BaseModel):
    """GeoJSON Feature Collection"""
    type: str = "FeatureCollection"
    features: List[GeoJSONFeature]


class MunicipalityBasic(BaseModel):
    """Basic municipality information"""
    id: int
    municipality_name: str
    total_biogas_m3_year: float
    energy_potential_mwh_year: float
    ranking: Optional[int] = None


class MunicipalityDetail(BaseModel):
    """Detailed municipality information"""
    id: int
    municipality_name: str
    ibge_code: Optional[str]

    # Geographic data
    area_km2: Optional[float]
    population_density: Optional[float]

    # Biogas potential - Main sectors
    total_biogas_m3_year: float
    total_biogas_m3_day: float
    urban_biogas_m3_year: float
    agricultural_biogas_m3_year: float
    livestock_biogas_m3_year: float

    # Urban waste detail
    rsu_biogas_m3_year: float
    rpo_biogas_m3_year: float

    # Agricultural substrates
    sugarcane_biogas_m3_year: float
    soybean_biogas_m3_year: float
    corn_biogas_m3_year: float
    coffee_biogas_m3_year: float
    citrus_biogas_m3_year: float

    # Livestock substrates
    cattle_biogas_m3_year: float
    swine_biogas_m3_year: float
    poultry_biogas_m3_year: float
    aquaculture_biogas_m3_year: float

    # Energy and environmental
    energy_potential_kwh_day: float
    energy_potential_mwh_year: float
    co2_reduction_tons_year: float

    # Population
    population: Optional[int]
    urban_population: Optional[int]
    rural_population: Optional[int]

    # Economic
    gdp_total: Optional[float]
    gdp_per_capita: Optional[float]

    # Location
    centroid: Optional[Dict[str, Any]] = None
    administrative_region: Optional[str]
    immediate_region: Optional[str]
    intermediate_region: Optional[str]


class ProximityQuery(BaseModel):
    """Proximity analysis request"""
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    radius_km: float = Field(..., gt=0, le=500)


class MapBounds(BaseModel):
    """Map bounding box"""
    min_lat: float
    min_lng: float
    max_lat: float
    max_lng: float


# ============================================================================
# GEOJSON ENDPOINTS
# ============================================================================

@router.get(
    "/municipalities/geojson",
    response_model=GeoJSONFeatureCollection,
    summary="Get municipalities as GeoJSON",
    description="Returns all municipalities with boundaries and biogas data as GeoJSON FeatureCollection"
)
async def get_municipalities_geojson(
    limit: Optional[int] = Query(None, ge=1, le=1000, description="Limit number of features"),
    min_biogas: Optional[float] = Query(None, ge=0, description="Minimum biogas potential (m³/year)"),
    region: Optional[str] = Query(None, description="Filter by administrative region"),
    current_user: Optional[UserProfile] = Depends(optional_auth)
):
    """
    Get municipalities as GeoJSON FeatureCollection

    Returns polygon geometries with biogas potential data as properties.
    Suitable for rendering choropleth maps.
    """
    with get_db() as conn:
        cursor = conn.cursor()

        try:
            # Build query
            query = """
            SELECT jsonb_build_object(
                'type', 'FeatureCollection',
                'features', jsonb_agg(feature)
            ) as geojson
            FROM (
                SELECT jsonb_build_object(
                    'type', 'Feature',
                    'id', id,
                    'geometry', ST_AsGeoJSON(
                        COALESCE(geometry, ST_Buffer(centroid::geography, 5000)::geometry)
                    )::jsonb,
                    'properties', jsonb_build_object(
                        'id', id,
                        'name', municipality_name,
                        'ibge_code', ibge_code,
                        'area_km2', ROUND(area_km2::numeric, 2),
                        'population', population,
                        'population_density', ROUND((population / NULLIF(area_km2, 0))::numeric, 2),
                        'immediate_region', immediate_region,
                        'intermediate_region', intermediate_region,
                        'immediate_region_code', immediate_region_code,
                        'intermediate_region_code', intermediate_region_code,
                        'total_biogas_m3_year', ROUND(total_biogas_m3_year::numeric, 2),
                        'urban_biogas_m3_year', ROUND(urban_biogas_m3_year::numeric, 2),
                        'agricultural_biogas_m3_year', ROUND(agricultural_biogas_m3_year::numeric, 2),
                        'livestock_biogas_m3_year', ROUND(livestock_biogas_m3_year::numeric, 2),
                        'sugarcane_biogas_m3_year', ROUND(sugarcane_biogas_m3_year::numeric, 2),
                        'soybean_biogas_m3_year', ROUND(soybean_biogas_m3_year::numeric, 2),
                        'corn_biogas_m3_year', ROUND(corn_biogas_m3_year::numeric, 2),
                        'coffee_biogas_m3_year', ROUND(coffee_biogas_m3_year::numeric, 2),
                        'citrus_biogas_m3_year', ROUND(citrus_biogas_m3_year::numeric, 2),
                        'cattle_biogas_m3_year', ROUND(cattle_biogas_m3_year::numeric, 2),
                        'swine_biogas_m3_year', ROUND(swine_biogas_m3_year::numeric, 2),
                        'poultry_biogas_m3_year', ROUND(poultry_biogas_m3_year::numeric, 2),
                        'aquaculture_biogas_m3_year', ROUND(aquaculture_biogas_m3_year::numeric, 2),
                        'forestry_biogas_m3_year', ROUND(COALESCE(forestry_biogas_m3_year, 0)::numeric, 2),
                        'rsu_biogas_m3_year', ROUND(rsu_biogas_m3_year::numeric, 2),
                        'rpo_biogas_m3_year', ROUND(rpo_biogas_m3_year::numeric, 2),
                        'sugarcane_residues_tons_year', ROUND(COALESCE(sugarcane_residues_tons_year, 0)::numeric, 2),
                        'soybean_residues_tons_year', ROUND(COALESCE(soybean_residues_tons_year, 0)::numeric, 2),
                        'corn_residues_tons_year', ROUND(COALESCE(corn_residues_tons_year, 0)::numeric, 2),
                        'potential_category', potential_category,
                        'energy_potential_mwh_year', ROUND(energy_potential_mwh_year::numeric, 2),
                        'co2_reduction_tons_year', ROUND(co2_reduction_tons_year::numeric, 2),
                        'administrative_region', administrative_region
                    )
                ) as feature
                FROM municipalities
                WHERE 1=1
        """

            params = []

            if min_biogas is not None:
                query += " AND total_biogas_m3_year >= %s"
                params.append(min_biogas)

            if region:
                query += " AND administrative_region = %s"
                params.append(region)

            query += " ORDER BY total_biogas_m3_year DESC"

            # SECURITY: Use parameterized query for LIMIT instead of f-string
            if limit:
                query += " LIMIT %s"
                params.append(limit)

            query += " ) as features"

            cursor.execute(query, params)
            result = cursor.fetchone()

            if not result or not result.get('geojson'):
                return GeoJSONFeatureCollection(type="FeatureCollection", features=[])

            return result['geojson']

        except psycopg2.Error as e:
            logger.error(f"Database error in get_municipalities_geojson: {e}")
            raise HTTPException(status_code=500, detail="Database query failed")
        finally:
            cursor.close()


@router.get(
    "/municipalities/centroids",
    response_model=GeoJSONFeatureCollection,
    summary="Get municipality centroids",
    description="Returns municipality center points (faster than full polygons)"
)
async def get_municipality_centroids(
    limit: Optional[int] = Query(None, ge=1, le=1000),
    min_biogas: Optional[float] = Query(None, ge=0)
):
    """
    Get municipality centroids as GeoJSON points

    Faster alternative to full polygons for initial map rendering.
    """
    with get_db() as conn:
        cursor = conn.cursor()

        try:
            query = """
                SELECT jsonb_build_object(
                    'type', 'FeatureCollection',
                    'features', jsonb_agg(feature)
                ) as geojson
                FROM (
                    SELECT jsonb_build_object(
                        'type', 'Feature',
                        'id', id,
                        'geometry', ST_AsGeoJSON(centroid)::jsonb,
                        'properties', jsonb_build_object(
                            'id', id,
                            'name', municipality_name,
                            'biogas', ROUND(total_biogas_m3_year::numeric, 2)
                        )
                    ) as feature
                    FROM municipalities
                    WHERE centroid IS NOT NULL
            """

            params = []

            if min_biogas is not None:
                query += " AND total_biogas_m3_year >= %s"
                params.append(min_biogas)

            query += " ORDER BY total_biogas_m3_year DESC"

            # SECURITY: Use parameterized query for LIMIT
            if limit:
                query += " LIMIT %s"
                params.append(limit)

            query += " ) as features"

            cursor.execute(query, params)
            result = cursor.fetchone()

            return result['geojson'] if result and result.get('geojson') else {"type": "FeatureCollection", "features": []}

        except psycopg2.Error as e:
            logger.error(f"Database error in get_municipality_centroids: {e}")
            raise HTTPException(status_code=500, detail="Database query failed")
        finally:
            cursor.close()


@router.get(
    "/municipalities/polygons",
    summary="Get municipalities with polygon boundaries from shapefile",
    description="Returns municipality polygon boundaries from shapefile with biogas data from database"
)
async def get_municipalities_polygons():
    """
    Get municipality boundaries from shapefile joined with biogas data from database.

    This endpoint loads actual polygon boundaries from SP_Municipios_2024.shp
    and joins them with biogas potential data from the database.
    """
    # Load municipality boundaries from shapefile
    try:
        shapefile_geojson = shapefile_loader.load_shapefile_as_geojson(
            "SP_Municipios_2024",
            simplify_tolerance=0.001  # Simplify to reduce size
        )
    except Exception as e:
        logger.error(f"Error loading municipality shapefile: {e}")
        raise HTTPException(status_code=500, detail="Failed to load municipality boundaries")

    # Get biogas data from database
    with get_db() as conn:
        cursor = conn.cursor()

        try:
            # Get all biogas data keyed by IBGE code or name
            cursor.execute("""
                SELECT
                    ibge_code,
                    municipality_name,
                    total_biogas_m3_year,
                    urban_biogas_m3_year,
                    agricultural_biogas_m3_year,
                    livestock_biogas_m3_year,
                    energy_potential_mwh_year,
                    co2_reduction_tons_year,
                    population,
                    administrative_region,
                    immediate_region,
                    intermediate_region,
                    area_km2
                FROM municipalities
            """)
            rows = cursor.fetchall()

            # Create lookup dictionaries by IBGE code and name
            biogas_by_ibge = {}
            biogas_by_name = {}
            for row in rows:
                ibge_code = str(row.get('ibge_code', '')).strip()
                name = str(row.get('municipality_name', '')).strip().upper()

                data = {
                    'total_biogas_m3_year': row.get('total_biogas_m3_year', 0) or 0,
                    'urban_biogas_m3_year': row.get('urban_biogas_m3_year', 0) or 0,
                    'agricultural_biogas_m3_year': row.get('agricultural_biogas_m3_year', 0) or 0,
                    'livestock_biogas_m3_year': row.get('livestock_biogas_m3_year', 0) or 0,
                    'energy_potential_mwh_year': row.get('energy_potential_mwh_year', 0) or 0,
                    'co2_reduction_tons_year': row.get('co2_reduction_tons_year', 0) or 0,
                    'population': row.get('population', 0) or 0,
                    'administrative_region': row.get('administrative_region', ''),
                    'immediate_region': row.get('immediate_region', ''),
                    'intermediate_region': row.get('intermediate_region', ''),
                    'area_km2': row.get('area_km2', 0) or 0
                }

                if ibge_code:
                    biogas_by_ibge[ibge_code] = data
                if name:
                    biogas_by_name[name] = data

            cursor.close()

        except Exception as e:
            logger.error(f"Error fetching biogas data: {e}")
            raise HTTPException(status_code=500, detail="Failed to load biogas data")

    # Join shapefile features with biogas data
    enriched_features = []
    matched_count = 0

    for feature in shapefile_geojson.get('features', []):
        props = feature.get('properties', {})

        # Try to match by CD_MUN (IBGE code) or NM_MUN (municipality name)
        ibge_code = str(props.get('CD_MUN', props.get('cod_ibge', props.get('IBGE', '')))).strip()
        name = str(props.get('NM_MUN', props.get('nome', props.get('NAME', '')))).strip().upper()

        # Find biogas data
        biogas_data = None
        if ibge_code and ibge_code in biogas_by_ibge:
            biogas_data = biogas_by_ibge[ibge_code]
        elif name and name in biogas_by_name:
            biogas_data = biogas_by_name[name]

        # Create enriched properties
        enriched_props = {
            'id': ibge_code or name,
            'name': props.get('NM_MUN', props.get('nome', props.get('NAME', 'Unknown'))),
            'ibge_code': ibge_code,
        }

        if biogas_data:
            matched_count += 1
            area = biogas_data['area_km2'] or 0
            pop = biogas_data['population'] or 0
            total_biogas = biogas_data['total_biogas_m3_year']

            # Calculate potential category
            if total_biogas > 100000000:
                potential_category = 'ALTO'
            elif total_biogas > 10000000:
                potential_category = 'MEDIO'
            elif total_biogas > 0:
                potential_category = 'BAIXO'
            else:
                potential_category = 'SEM DADOS'

            enriched_props.update({
                'total_biogas': round(biogas_data['total_biogas_m3_year'], 2),
                'total_biogas_m3_year': round(biogas_data['total_biogas_m3_year'], 2),
                'urban_biogas': round(biogas_data['urban_biogas_m3_year'], 2),
                'urban_biogas_m3_year': round(biogas_data['urban_biogas_m3_year'], 2),
                'agricultural_biogas': round(biogas_data['agricultural_biogas_m3_year'], 2),
                'agricultural_biogas_m3_year': round(biogas_data['agricultural_biogas_m3_year'], 2),
                'livestock_biogas': round(biogas_data['livestock_biogas_m3_year'], 2),
                'livestock_biogas_m3_year': round(biogas_data['livestock_biogas_m3_year'], 2),
                'energy_mwh_year': round(biogas_data['energy_potential_mwh_year'], 2),
                'energy_potential_mwh_year': round(biogas_data['energy_potential_mwh_year'], 2),
                'co2_reduction': round(biogas_data['co2_reduction_tons_year'], 2),
                'co2_reduction_tons_year': round(biogas_data['co2_reduction_tons_year'], 2),
                'population': pop,
                'region': biogas_data['administrative_region'],
                'immediate_region': biogas_data['immediate_region'],
                'intermediate_region': biogas_data['intermediate_region'],
                'area_km2': round(area, 2),
                'population_density': round(pop / area, 2) if area > 0 else 0,
                'potential_category': potential_category
            })
        else:
            # No biogas data found - set defaults
            enriched_props.update({
                'total_biogas': 0,
                'total_biogas_m3_year': 0,
                'urban_biogas': 0,
                'urban_biogas_m3_year': 0,
                'agricultural_biogas': 0,
                'agricultural_biogas_m3_year': 0,
                'livestock_biogas': 0,
                'livestock_biogas_m3_year': 0,
                'energy_mwh_year': 0,
                'energy_potential_mwh_year': 0,
                'co2_reduction': 0,
                'co2_reduction_tons_year': 0,
                'population': 0,
                'region': '',
                'immediate_region': '',
                'intermediate_region': '',
                'area_km2': 0,
                'population_density': 0,
                'potential_category': 'SEM DADOS'
            })

        enriched_features.append({
            'type': 'Feature',
            'id': enriched_props['id'],
            'geometry': feature.get('geometry'),
            'properties': enriched_props
        })

    logger.info(f"Matched {matched_count}/{len(enriched_features)} municipalities with biogas data")

    return {
        'type': 'FeatureCollection',
        'features': enriched_features,
        'metadata': {
            'total_features': len(enriched_features),
            'matched_with_biogas': matched_count,
            'source': 'SP_Municipios_2024.shp + Supabase municipalities table',
            'note': f'{len(enriched_features)} municípios de São Paulo com dados de biogás'
        }
    }


# ============================================================================
# MUNICIPALITY DATA ENDPOINTS
# ============================================================================

@router.get(
    "/municipalities",
    response_model=List[MunicipalityBasic],
    summary="List municipalities",
    description="Get basic information for all municipalities"
)
async def list_municipalities(
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    sort_by: str = Query("biogas", enum=["biogas", "name", "population"]),
    order: str = Query("desc", enum=["asc", "desc"])
):
    """
    List municipalities with pagination
    """
    with get_db() as conn:
        cursor = conn.cursor()

        try:
            # SECURITY: Validate sort parameters against whitelist
            sort_column = ALLOWED_SORT_COLUMNS.get(sort_by, "total_biogas_m3_year")
            order_sql = ALLOWED_ORDERS.get(order.lower(), "DESC")

            # SECURITY: Use validated values in SQL (safe since from whitelist)
            query = f"""
                SELECT
                    id,
                    municipality_name,
                    total_biogas_m3_year,
                    energy_potential_mwh_year,
                    ROW_NUMBER() OVER (ORDER BY total_biogas_m3_year DESC) as ranking
                FROM municipalities
                WHERE total_biogas_m3_year > 0
                ORDER BY {sort_column} {order_sql}
                LIMIT %s OFFSET %s
            """

            cursor.execute(query, (limit, offset))
            rows = cursor.fetchall()

            return [
                MunicipalityBasic(
                    id=row['id'],
                    municipality_name=row['municipality_name'],
                    total_biogas_m3_year=row['total_biogas_m3_year'],
                    energy_potential_mwh_year=row['energy_potential_mwh_year'],
                    ranking=row['ranking']
                )
                for row in rows
            ]

        except psycopg2.Error as e:
            logger.error(f"Database error in list_municipalities: {e}")
            raise HTTPException(status_code=500, detail="Database query failed")
        finally:
            cursor.close()


@router.get(
    "/municipalities/{municipality_id}",
    response_model=MunicipalityDetail,
    summary="Get municipality details",
    description="Get detailed information for a specific municipality"
)
async def get_municipality(municipality_id: int):
    """
    Get detailed information for a single municipality
    """
    with get_db() as conn:
        cursor = conn.cursor()

        try:
            query = """
                SELECT
                    id, municipality_name, ibge_code,
                    area_km2,
                    CASE
                        WHEN area_km2 > 0 AND population IS NOT NULL
                        THEN population / area_km2
                        ELSE NULL
                    END as population_density,
                    total_biogas_m3_year, total_biogas_m3_day,
                    urban_biogas_m3_year, agricultural_biogas_m3_year, livestock_biogas_m3_year,
                    rsu_biogas_m3_year, rpo_biogas_m3_year,
                    sugarcane_biogas_m3_year, soybean_biogas_m3_year, corn_biogas_m3_year,
                    coffee_biogas_m3_year, citrus_biogas_m3_year,
                    cattle_biogas_m3_year, swine_biogas_m3_year, poultry_biogas_m3_year,
                    aquaculture_biogas_m3_year,
                    energy_potential_kwh_day, energy_potential_mwh_year, co2_reduction_tons_year,
                    population, urban_population, rural_population,
                    gdp_total, gdp_per_capita,
                    ST_AsGeoJSON(centroid)::json as centroid,
                    administrative_region, immediate_region, intermediate_region
                FROM municipalities
                WHERE id = %s
            """

            cursor.execute(query, (municipality_id,))
            row = cursor.fetchone()

            if not row:
                raise HTTPException(status_code=404, detail="Municipality not found")

            return MunicipalityDetail(
                id=row['id'],
                municipality_name=row['municipality_name'],
                ibge_code=row['ibge_code'],
                area_km2=row['area_km2'],
                population_density=row['population_density'],
                total_biogas_m3_year=row['total_biogas_m3_year'],
                total_biogas_m3_day=row['total_biogas_m3_day'],
                urban_biogas_m3_year=row['urban_biogas_m3_year'],
                agricultural_biogas_m3_year=row['agricultural_biogas_m3_year'],
                livestock_biogas_m3_year=row['livestock_biogas_m3_year'],
                rsu_biogas_m3_year=row['rsu_biogas_m3_year'],
                rpo_biogas_m3_year=row['rpo_biogas_m3_year'],
                sugarcane_biogas_m3_year=row['sugarcane_biogas_m3_year'],
                soybean_biogas_m3_year=row['soybean_biogas_m3_year'],
                corn_biogas_m3_year=row['corn_biogas_m3_year'],
                coffee_biogas_m3_year=row['coffee_biogas_m3_year'],
                citrus_biogas_m3_year=row['citrus_biogas_m3_year'],
                cattle_biogas_m3_year=row['cattle_biogas_m3_year'],
                swine_biogas_m3_year=row['swine_biogas_m3_year'],
                poultry_biogas_m3_year=row['poultry_biogas_m3_year'],
                aquaculture_biogas_m3_year=row['aquaculture_biogas_m3_year'],
                energy_potential_kwh_day=row['energy_potential_kwh_day'],
                energy_potential_mwh_year=row['energy_potential_mwh_year'],
                co2_reduction_tons_year=row['co2_reduction_tons_year'],
                population=row['population'],
                urban_population=row['urban_population'],
                rural_population=row['rural_population'],
                gdp_total=row['gdp_total'],
                gdp_per_capita=row['gdp_per_capita'],
                centroid=row['centroid'],
                administrative_region=row['administrative_region'],
                immediate_region=row['immediate_region'],
                intermediate_region=row['intermediate_region']
            )

        except HTTPException:
            raise
        except psycopg2.Error as e:
            logger.error(f"Database error in get_municipality: {e}")
            raise HTTPException(status_code=500, detail="Database query failed")
        finally:
            cursor.close()


# ============================================================================
# SPATIAL ANALYSIS ENDPOINTS
# ============================================================================

@router.post(
    "/proximity",
    summary="Proximity analysis",
    description="Find municipalities within radius of a point"
)
async def proximity_analysis(query: ProximityQuery):
    """
    Find municipalities within specified radius of a point

    Returns municipalities sorted by distance.
    """
    with get_db() as conn:
        cursor = conn.cursor()

        try:
            # Use the helper function we created in schema
            sql = """
                SELECT * FROM municipalities_within_radius(%s, %s, %s)
            """

            cursor.execute(sql, (query.latitude, query.longitude, query.radius_km))
            rows = cursor.fetchall()

            return {
                "query": {
                    "latitude": query.latitude,
                    "longitude": query.longitude,
                    "radius_km": query.radius_km
                },
                "results": [
                    {
                        "municipality_id": row['municipality_id'],
                        "municipality_name": row['municipality_name'],
                        "distance_km": float(row['distance_km'])
                    }
                    for row in rows
                ],
                "total_found": len(rows)
            }

        except psycopg2.Error as e:
            logger.error(f"Database error in proximity_analysis: {e}")
            raise HTTPException(status_code=500, detail="Database query failed")
        finally:
            cursor.close()


@router.get(
    "/rankings",
    summary="Municipality rankings",
    description="Get ranked municipalities by different criteria"
)
async def get_rankings(
    criteria: str = Query("total", enum=["total", "urban", "agricultural", "livestock"]),
    limit: int = Query(20, ge=1, le=100)
):
    """
    Get top municipalities ranked by biogas potential
    """
    with get_db() as conn:
        cursor = conn.cursor()

        try:
            # SECURITY: Validate criteria against whitelist
            column_map = {
                "total": "total_biogas_m3_year",
                "urban": "urban_biogas_m3_year",
                "agricultural": "agricultural_biogas_m3_year",
                "livestock": "livestock_biogas_m3_year"
            }

            # Get validated column (safe since from whitelist)
            column = column_map.get(criteria, "total_biogas_m3_year")

            # SECURITY: Use validated column name in SQL (safe since from whitelist)
            query = f"""
                SELECT
                    municipality_name,
                    {column} as biogas_potential,
                    energy_potential_mwh_year,
                    ROW_NUMBER() OVER (ORDER BY {column} DESC) as ranking
                FROM municipalities
                WHERE {column} > 0
                ORDER BY {column} DESC
                LIMIT %s
            """

            cursor.execute(query, (limit,))
            rows = cursor.fetchall()

            return {
                "criteria": criteria,
                "rankings": [
                    {
                        "rank": row['ranking'],
                        "municipality": row['municipality_name'],
                        "biogas_m3_year": float(row['biogas_potential']),
                        "energy_mwh_year": float(row['energy_potential_mwh_year'])
                    }
                    for row in rows
                ]
            }

        except psycopg2.Error as e:
            logger.error(f"Database error in get_rankings: {e}")
            raise HTTPException(status_code=500, detail="Database query failed")
        finally:
            cursor.close()


@router.get(
    "/statistics/summary",
    summary="Overall statistics",
    description="Get summary statistics for all municipalities"
)
async def get_summary_statistics():
    """
    Get overall statistics for the platform with proper NULL handling
    """
    logger.info("📊 Fetching summary statistics")

    try:
        with get_db() as conn:
            cursor = conn.cursor()

            try:
                # Get overall statistics with COALESCE to handle NULL values
                query_stats = """
                    SELECT
                        COUNT(*) as total_municipalities,
                        COALESCE(SUM(total_biogas_m3_year), 0) as total_biogas_potential,
                        COALESCE(AVG(total_biogas_m3_year), 0) as avg_biogas_potential,
                        COALESCE(SUM(energy_potential_mwh_year), 0) as total_energy_potential,
                        COALESCE(SUM(co2_reduction_tons_year), 0) as total_co2_reduction,
                        COALESCE(SUM(population), 0) as total_population,
                        COALESCE(SUM(agricultural_biogas_m3_year), 0) as total_agricultural,
                        COALESCE(SUM(livestock_biogas_m3_year), 0) as total_livestock,
                        COALESCE(SUM(urban_biogas_m3_year), 0) as total_urban
                    FROM municipalities
                    WHERE total_biogas_m3_year IS NOT NULL
                """

                cursor.execute(query_stats)
                row = cursor.fetchone()

                if not row:
                    logger.warning("⚠️ No data returned from summary statistics query")
                    return {
                        "total_municipalities": 0,
                        "total_biogas_m3_year": 0,
                        "average_biogas_m3_year": 0,
                        "error": "No data available"
                    }

                # Safely extract values with proper type conversion and defaults
                total_municipalities = int(row.get('total_municipalities', 0) or 0)
                total_biogas = float(row.get('total_biogas_potential', 0) or 0)
                total_agricultural = float(row.get('total_agricultural', 0) or 0)
                total_livestock = float(row.get('total_livestock', 0) or 0)
                total_urban = float(row.get('total_urban', 0) or 0)

                logger.debug(f"📈 Summary stats: {total_municipalities} municipalities, {total_biogas:.2e} m³/year biogas")

                # Get top 5 municipalities with NULL-safe query
                query_top = """
                    SELECT municipality_name, total_biogas_m3_year
                    FROM municipalities
                    WHERE total_biogas_m3_year > 0 AND total_biogas_m3_year IS NOT NULL
                    ORDER BY total_biogas_m3_year DESC
                    LIMIT 5
                """
                cursor.execute(query_top)
                top_municipalities = cursor.fetchall()

                logger.info(f"✅ Summary statistics generated successfully: {total_municipalities} municipalities")

                return {
                    "total_municipalities": total_municipalities,
                    "total_biogas_m3_year": total_biogas,
                    "average_biogas_m3_year": float(row.get('avg_biogas_potential', 0) or 0),
                    "total_energy_mwh_year": float(row.get('total_energy_potential', 0) or 0),
                    "total_co2_reduction_tons_year": float(row.get('total_co2_reduction', 0) or 0),
                    "total_population": int(row.get('total_population', 0) or 0),
                    "top_municipality": {
                        "name": top_municipalities[0]['municipality_name'] if top_municipalities else "N/A",
                        "biogas_m3_year": float(top_municipalities[0]['total_biogas_m3_year']) if top_municipalities else 0
                    },
                    "top_5_municipalities": [
                        {
                            "name": m['municipality_name'],
                            "biogas_m3_year": float(m['total_biogas_m3_year'])
                        }
                        for m in top_municipalities
                    ],
                    "categories": {},  # Can be expanded later
                    "sector_breakdown": {
                        "agricultural": total_agricultural,
                        "livestock": total_livestock,
                        "urban": total_urban
                    },
                    "sector_percentages": {
                        "agricultural": round((total_agricultural / total_biogas * 100) if total_biogas > 0 else 0, 2),
                        "livestock": round((total_livestock / total_biogas * 100) if total_biogas > 0 else 0, 2),
                        "urban": round((total_urban / total_biogas * 100) if total_biogas > 0 else 0, 2)
                    },
                    "note": f"Dados de {total_municipalities} municípios do estado de São Paulo"
                }

            except psycopg2.Error as e:
                logger.error(f"🔥 Database error in get_summary_statistics: {str(e)}", exc_info=True)
                raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")
            finally:
                cursor.close()

    except Exception as e:
        logger.error(f"🔥 CRITICAL ERROR in get_summary_statistics: {str(e)}", exc_info=True)
        # Return safe defaults instead of crashing
        return {
            "total_municipalities": 0,
            "total_biogas_m3_year": 0,
            "average_biogas_m3_year": 0,
            "total_energy_mwh_year": 0,
            "total_co2_reduction_tons_year": 0,
            "total_population": 0,
            "top_municipality": {"name": "N/A", "biogas_m3_year": 0},
            "top_5_municipalities": [],
            "categories": {},
            "sector_breakdown": {"agricultural": 0, "livestock": 0, "urban": 0},
            "sector_percentages": {"agricultural": 0, "livestock": 0, "urban": 0},
            "error": "Database connection or query failed",
            "detail": str(e),
            "note": "Erro ao carregar dados - usando valores padrão"
        }


# ============================================================================
# INFRASTRUCTURE LAYERS
# ============================================================================

@router.get(
    "/infrastructure/biogas-plants",
    response_model=GeoJSONFeatureCollection,
    summary="Get biogas plants",
    description="Returns existing biogas plants as GeoJSON points"
)
async def get_biogas_plants():
    """Get existing biogas plants"""
    with get_db() as conn:
        cursor = conn.cursor()

        try:
            query = """
                SELECT jsonb_build_object(
                    'type', 'FeatureCollection',
                    'features', jsonb_agg(feature)
                ) as geojson
                FROM (
                    SELECT jsonb_build_object(
                        'type', 'Feature',
                        'geometry', ST_AsGeoJSON(location)::jsonb,
                        'properties', jsonb_build_object(
                            'name', plant_name,
                            'type', plant_type,
                            'status', status,
                            'capacity', installed_capacity_m3_day
                        )
                    ) as feature
                    FROM biogas_plants
                    WHERE location IS NOT NULL
                ) as features
            """

            cursor.execute(query)
            result = cursor.fetchone()

            return result['geojson'] if result and result.get('geojson') else {"type": "FeatureCollection", "features": []}

        except psycopg2.Error as e:
            logger.error(f"Database error in get_biogas_plants: {e}")
            raise HTTPException(status_code=500, detail="Database query failed")
        finally:
            cursor.close()

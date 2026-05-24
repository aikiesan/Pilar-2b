"""
Geospatial API Endpoints
Serve spatial data for interactive maps and spatial analysis.
All geometry comes from local shapefiles; tabular data from local PostgreSQL.
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
import logging
import psycopg2
from pathlib import Path
import geopandas as gpd
from shapely.geometry import mapping, Point

from app.core.database import get_db
from app.middleware.auth import optional_auth
from app.models.auth import UserProfile
from app.utils.shapefile_loader import get_shapefile_loader

shapefile_loader = get_shapefile_loader()

SHAPEFILE_PATH = Path(__file__).parent.parent.parent.parent.parent / "data" / "shapefiles" / "SP_Municipios_2024.shp"
SHAPEFILE_PATH_ALT = Path(__file__).parent.parent.parent.parent.parent.parent.parent / "project_map" / "data" / "shapefile" / "SP_Municipios_2024.shp"

_geo_gdf = None

router = APIRouter()
logger = logging.getLogger(__name__)

# ============================================================================
# SECURITY: Input Validation Constants
# ============================================================================

VALID_REGIONS = {
    "Central", "Bauru", "Araçatuba", "Ribeirão Preto",
    "Campinas", "São José dos Campos", "Sorocaba",
    "Santos", "São Paulo", "Presidente Prudente",
    "Marília", "Registro", "Franca", "São José do Rio Preto"
}

ALLOWED_SORT_COLUMNS = {
    "biogas": "total_biogas_m3_year",
    "name": "municipality_name",
    "population": "population",
    "area": "area_km2"
}

ALLOWED_ORDERS = {"asc": "ASC", "desc": "DESC"}

# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class GeoJSONFeature(BaseModel):
    type: str = "Feature"
    geometry: Dict[str, Any]
    properties: Dict[str, Any]


class GeoJSONFeatureCollection(BaseModel):
    type: str = "FeatureCollection"
    features: List[GeoJSONFeature]


class MunicipalityBasic(BaseModel):
    id: int
    municipality_name: str
    total_biogas_m3_year: float
    energy_potential_mwh_year: float
    ranking: Optional[int] = None


class MunicipalityDetail(BaseModel):
    id: int
    municipality_name: str
    ibge_code: Optional[str]
    area_km2: Optional[float]
    population_density: Optional[float]
    total_biogas_m3_year: float
    total_biogas_m3_day: float
    urban_biogas_m3_year: float
    agricultural_biogas_m3_year: float
    livestock_biogas_m3_year: float
    rsu_biogas_m3_year: float
    rpo_biogas_m3_year: float
    sugarcane_biogas_m3_year: float
    soybean_biogas_m3_year: float
    corn_biogas_m3_year: float
    coffee_biogas_m3_year: float
    citrus_biogas_m3_year: float
    cattle_biogas_m3_year: float
    swine_biogas_m3_year: float
    poultry_biogas_m3_year: float
    aquaculture_biogas_m3_year: float
    energy_potential_kwh_day: float
    energy_potential_mwh_year: float
    co2_reduction_tons_year: float
    population: Optional[int]
    urban_population: Optional[int]
    rural_population: Optional[int]
    gdp_total: Optional[float]
    gdp_per_capita: Optional[float]
    centroid: Optional[Dict[str, Any]] = None
    administrative_region: Optional[str]
    immediate_region: Optional[str]
    intermediate_region: Optional[str]


class ProximityQuery(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    radius_km: float = Field(..., gt=0, le=500)


class MapBounds(BaseModel):
    min_lat: float
    min_lng: float
    max_lat: float
    max_lng: float


# ============================================================================
# HELPERS
# ============================================================================

def _load_geo_gdf():
    """Load and cache the municipalities GeoDataFrame."""
    global _geo_gdf
    if _geo_gdf is None:
        logger.info("🗺️ Loading municipality polygons from shapefile...")
        shapefile_to_use = None
        if SHAPEFILE_PATH.exists():
            shapefile_to_use = SHAPEFILE_PATH
        elif SHAPEFILE_PATH_ALT.exists():
            shapefile_to_use = SHAPEFILE_PATH_ALT
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Shapefile not found at {SHAPEFILE_PATH} or {SHAPEFILE_PATH_ALT}"
            )
        _geo_gdf = gpd.read_file(shapefile_to_use)
        logger.info(f"✅ Loaded {len(_geo_gdf)} municipality polygons from shapefile")
    return _geo_gdf


def _ibge_code_from_row(shp_row) -> Optional[str]:
    for col in ["CD_MUN", "GEOCODIGO", "geocodigo", "CD_GEOCMU", "cd_mun"]:
        if col in shp_row and shp_row[col]:
            return str(shp_row[col]).strip()
    return None


def _fetch_municipalities_db(columns: str) -> Dict[str, Dict]:
    """Fetch municipalities from PostgreSQL and return lookup dict keyed by ibge_code."""
    with get_db() as conn:
        cursor = conn.cursor()
        try:
            cursor.execute(f"SELECT {columns} FROM municipalities")
            rows = cursor.fetchall()
            lookup = {}
            for row in rows:
                code = str(row.get("ibge_code", "")).strip()
                if code:
                    lookup[code] = dict(row)
            return lookup
        finally:
            cursor.close()


# ============================================================================
# GEOJSON ENDPOINTS
# ============================================================================

@router.get(
    "/municipalities/geojson",
    summary="Get municipalities as GeoJSON",
    description="Returns all municipalities with boundaries and biogas data as GeoJSON FeatureCollection"
)
async def get_municipalities_geojson(
    limit: Optional[int] = Query(None, ge=1, le=1000, description="Limit number of features"),
    min_biogas: Optional[float] = Query(None, ge=0, description="Minimum biogas potential (m³/year)"),
    region: Optional[str] = Query(None, description="Filter by administrative region"),
    current_user: Optional[UserProfile] = Depends(optional_auth)
):
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
                    'geometry', ST_AsGeoJSON(
                        COALESCE(geometry, ST_Buffer(centroid::geography, 5000)::geometry)
                    )::jsonb,
                    'properties', jsonb_build_object(
                        'id', id,
                        'name', municipality_name,
                        'ibge_code', ibge_code,
                        'area_km2', ROUND(area_km2::numeric, 2),
                        'population', population,
                        'population_density', ROUND(COALESCE(population_density, population / NULLIF(area_km2, 0))::numeric, 2),
                        'population_year', population_year,
                        'area_year', area_year,
                        'gdp_total', ROUND(COALESCE(gdp_total, 0)::numeric, 2),
                        'gdp_per_capita', ROUND(COALESCE(gdp_per_capita, 0)::numeric, 2),
                        'gdp_year', gdp_year,
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
                        'total_biomass_tons_year', ROUND(COALESCE(total_biomass_tons_year, 0)::numeric, 2),
                        'agricultural_biomass_tons_year', ROUND(COALESCE(agricultural_biomass_tons_year, 0)::numeric, 2),
                        'livestock_biomass_tons_year', ROUND(COALESCE(livestock_biomass_tons_year, 0)::numeric, 2),
                        'urban_biomass_tons_year', ROUND(COALESCE(urban_biomass_tons_year, 0)::numeric, 2),
                        'sugarcane_biomass_tons_year', ROUND(COALESCE(sugarcane_biomass_tons_year, 0)::numeric, 2),
                        'soybean_biomass_tons_year', ROUND(COALESCE(soybean_biomass_tons_year, 0)::numeric, 2),
                        'corn_biomass_tons_year', ROUND(COALESCE(corn_biomass_tons_year, 0)::numeric, 2),
                        'coffee_biomass_tons_year', ROUND(COALESCE(coffee_biomass_tons_year, 0)::numeric, 2),
                        'citrus_biomass_tons_year', ROUND(COALESCE(citrus_biomass_tons_year, 0)::numeric, 2),
                        'cattle_biomass_tons_year', ROUND(COALESCE(cattle_biomass_tons_year, 0)::numeric, 2),
                        'swine_biomass_tons_year', ROUND(COALESCE(swine_biomass_tons_year, 0)::numeric, 2),
                        'poultry_biomass_tons_year', ROUND(COALESCE(poultry_biomass_tons_year, 0)::numeric, 2),
                        'aquaculture_biomass_tons_year', ROUND(COALESCE(aquaculture_biomass_tons_year, 0)::numeric, 2)
                    ) || jsonb_build_object(
                        'rsu_biomass_tons_year', ROUND(COALESCE(rsu_biomass_tons_year, 0)::numeric, 2),
                        'rpo_biomass_tons_year', ROUND(COALESCE(rpo_biomass_tons_year, 0)::numeric, 2),
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
    summary="Get municipality centroids",
    description="Returns municipality center points (faster than full polygons)"
)
async def get_municipality_centroids(
    limit: Optional[int] = Query(None, ge=1, le=1000),
    min_biogas: Optional[float] = Query(None, ge=0)
):
    try:
        gdf = _load_geo_gdf()

        biogas_lookup = _fetch_municipalities_db(
            "id, municipality_name, ibge_code, total_biogas_m3_year"
        )

        features = []
        for _, shp_row in gdf.iterrows():
            ibge_code = _ibge_code_from_row(shp_row)
            if not ibge_code:
                continue

            biogas_data = biogas_lookup.get(ibge_code, {})
            total_biogas = float(biogas_data.get("total_biogas_m3_year") or 0)

            if min_biogas is not None and total_biogas < min_biogas:
                continue

            centroid = shp_row.geometry.centroid
            geometry = {"type": "Point", "coordinates": [centroid.x, centroid.y]}

            features.append({
                "type": "Feature",
                "geometry": geometry,
                "properties": {
                    "id": biogas_data.get("id"),
                    "name": biogas_data.get("municipality_name") or "",
                    "biogas": round(total_biogas, 2),
                },
                "_sort_key": total_biogas
            })

        features.sort(key=lambda f: f["_sort_key"], reverse=True)
        if limit:
            features = features[:limit]
        for f in features:
            del f["_sort_key"]

        return {"type": "FeatureCollection", "features": features}

    except HTTPException:
        raise
    except Exception as e:
        import traceback as _tb
        logger.error(f"Error in get_municipality_centroids: {e}\n{_tb.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Error: {type(e).__name__}: {str(e)}")


@router.get(
    "/municipalities/polygons",
    summary="Get municipalities with polygon boundaries from shapefile",
    description="Returns municipality polygon boundaries from shapefile with biogas data"
)
async def get_municipalities_polygons():
    try:
        shapefile_geojson = shapefile_loader.load_shapefile_as_geojson(
            "SP_Municipios_2024",
            simplify_tolerance=0.001
        )
    except Exception as e:
        logger.error(f"Error loading municipality shapefile: {e}")
        raise HTTPException(status_code=500, detail="Failed to load municipality boundaries")

    biogas_by_ibge: Dict[str, Dict] = {}
    biogas_by_name: Dict[str, Dict] = {}

    with get_db() as conn:
        cursor = conn.cursor()
        try:
            cursor.execute("""
                SELECT ibge_code, municipality_name, total_biogas_m3_year,
                       urban_biogas_m3_year, agricultural_biogas_m3_year,
                       livestock_biogas_m3_year, energy_potential_mwh_year,
                       co2_reduction_tons_year, population, administrative_region,
                       immediate_region, intermediate_region, immediate_region_code,
                       intermediate_region_code, area_km2, population_density,
                       population_year, area_year, gdp_total, gdp_per_capita, gdp_year
                FROM municipalities
            """)
            rows = cursor.fetchall()
        finally:
            cursor.close()

    for row in rows:
        ibge_code = str(row.get("ibge_code", "")).strip()
        name = str(row.get("municipality_name", "")).strip().upper()
        data = {k: (row.get(k) or 0) for k in [
            "total_biogas_m3_year", "urban_biogas_m3_year", "agricultural_biogas_m3_year",
            "livestock_biogas_m3_year", "energy_potential_mwh_year", "co2_reduction_tons_year",
            "population", "area_km2"
        ]}
        data["population_density"] = row.get("population_density")
        data["population_year"] = row.get("population_year")
        data["area_year"] = row.get("area_year")
        data["gdp_total"] = row.get("gdp_total")
        data["gdp_per_capita"] = row.get("gdp_per_capita")
        data["gdp_year"] = row.get("gdp_year")
        data["administrative_region"] = row.get("administrative_region", "")
        data["immediate_region"] = row.get("immediate_region", "")
        data["intermediate_region"] = row.get("intermediate_region", "")
        data["immediate_region_code"] = row.get("immediate_region_code", "")
        data["intermediate_region_code"] = row.get("intermediate_region_code", "")
        if ibge_code:
            biogas_by_ibge[ibge_code] = data
        if name:
            biogas_by_name[name] = data

    enriched_features = []
    matched_count = 0

    for feature in shapefile_geojson.get("features", []):
        props = feature.get("properties", {})
        ibge_code = str(props.get("CD_MUN", props.get("cod_ibge", props.get("IBGE", "")))).strip()
        name = str(props.get("NM_MUN", props.get("nome", props.get("NAME", "")))).strip().upper()

        biogas_data = biogas_by_ibge.get(ibge_code) or biogas_by_name.get(name)
        enriched_props = {
            "id": ibge_code or name,
            "name": props.get("NM_MUN", props.get("nome", props.get("NAME", "Unknown"))),
            "ibge_code": ibge_code,
        }

        if biogas_data:
            matched_count += 1
            area = float(biogas_data["area_km2"] or 0)
            pop = int(biogas_data["population"] or 0)
            tb = float(biogas_data["total_biogas_m3_year"] or 0)
            if tb > 100_000_000:
                cat = "ALTO"
            elif tb > 10_000_000:
                cat = "MEDIO"
            elif tb > 0:
                cat = "BAIXO"
            else:
                cat = "SEM DADOS"
            enriched_props.update({
                "total_biogas": round(tb, 2),
                "total_biogas_m3_year": round(tb, 2),
                "urban_biogas_m3_year": round(float(biogas_data["urban_biogas_m3_year"] or 0), 2),
                "agricultural_biogas_m3_year": round(float(biogas_data["agricultural_biogas_m3_year"] or 0), 2),
                "livestock_biogas_m3_year": round(float(biogas_data["livestock_biogas_m3_year"] or 0), 2),
                "energy_potential_mwh_year": round(float(biogas_data["energy_potential_mwh_year"] or 0), 2),
                "co2_reduction_tons_year": round(float(biogas_data["co2_reduction_tons_year"] or 0), 2),
                "population": pop,
                "region": biogas_data["administrative_region"],
                "immediate_region": biogas_data["immediate_region"],
                "intermediate_region": biogas_data["intermediate_region"],
                "immediate_region_code": biogas_data["immediate_region_code"],
                "intermediate_region_code": biogas_data["intermediate_region_code"],
                "area_km2": round(area, 2),
                "population_density": round(
                    float(biogas_data.get("population_density") or (pop / area if area > 0 else 0)),
                    2
                ),
                "population_year": biogas_data.get("population_year"),
                "area_year": biogas_data.get("area_year"),
                "gdp_total": round(float(biogas_data.get("gdp_total") or 0), 2),
                "gdp_per_capita": round(float(biogas_data.get("gdp_per_capita") or 0), 2),
                "gdp_year": biogas_data.get("gdp_year"),
                "potential_category": cat,
            })
        else:
            enriched_props.update({k: 0 for k in [
                "total_biogas", "total_biogas_m3_year", "urban_biogas_m3_year",
                "agricultural_biogas_m3_year", "livestock_biogas_m3_year",
                "energy_potential_mwh_year", "co2_reduction_tons_year",
                "population", "area_km2", "population_density"
            ]})
            enriched_props.update({"region": "", "immediate_region": "", "intermediate_region": "", "potential_category": "SEM DADOS"})

        enriched_features.append({
            "type": "Feature",
            "id": enriched_props["id"],
            "geometry": feature.get("geometry"),
            "properties": enriched_props,
        })

    logger.info(f"Matched {matched_count}/{len(enriched_features)} municipalities with biogas data")

    return {
        "type": "FeatureCollection",
        "features": enriched_features,
        "metadata": {
            "total_features": len(enriched_features),
            "matched_with_biogas": matched_count,
            "source": "SP_Municipios_2024.shp + PostgreSQL municipalities table",
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
    sort_column = ALLOWED_SORT_COLUMNS.get(sort_by, "total_biogas_m3_year")
    sort_order = ALLOWED_ORDERS.get(order, "DESC")

    try:
        with get_db() as conn:
            cursor = conn.cursor()
            try:
                cursor.execute(f"""
                    SELECT id, municipality_name, total_biogas_m3_year, energy_potential_mwh_year,
                           ROW_NUMBER() OVER (ORDER BY total_biogas_m3_year DESC) AS ranking
                    FROM municipalities
                    WHERE total_biogas_m3_year > 0
                    ORDER BY {sort_column} {sort_order}
                    LIMIT %s OFFSET %s
                """, (limit, offset))
                rows = cursor.fetchall()
            finally:
                cursor.close()

        return [
            MunicipalityBasic(
                id=r["id"],
                municipality_name=r["municipality_name"],
                total_biogas_m3_year=float(r.get("total_biogas_m3_year") or 0),
                energy_potential_mwh_year=float(r.get("energy_potential_mwh_year") or 0),
                ranking=int(r["ranking"])
            )
            for r in rows
        ]

    except Exception as e:
        logger.error(f"Error in list_municipalities: {e}")
        raise HTTPException(status_code=500, detail="Failed to list municipalities")


@router.get(
    "/municipalities/{municipality_id}",
    response_model=MunicipalityDetail,
    summary="Get municipality details",
    description="Get detailed information for a specific municipality"
)
async def get_municipality(municipality_id: int):
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            try:
                cursor.execute("SELECT * FROM municipalities WHERE id = %s", (municipality_id,))
                row = cursor.fetchone()
            finally:
                cursor.close()

        if not row:
            raise HTTPException(status_code=404, detail="Municipality not found")

        def _f(key: str) -> float:
            return float(row.get(key) or 0)

        area = _f("area_km2")
        pop = row.get("population")
        pop_density = (float(pop) / area) if area > 0 and pop else None

        _lat = row.get("centroid_lat")
        _lng = row.get("centroid_lng")
        _centroid = {"lat": float(_lat), "lng": float(_lng)} if _lat is not None and _lng is not None else None

        return MunicipalityDetail(
            id=row["id"],
            municipality_name=row["municipality_name"],
            ibge_code=row.get("ibge_code"),
            area_km2=area or None,
            population_density=pop_density,
            total_biogas_m3_year=_f("total_biogas_m3_year"),
            total_biogas_m3_day=_f("total_biogas_m3_day"),
            urban_biogas_m3_year=_f("urban_biogas_m3_year"),
            agricultural_biogas_m3_year=_f("agricultural_biogas_m3_year"),
            livestock_biogas_m3_year=_f("livestock_biogas_m3_year"),
            rsu_biogas_m3_year=_f("rsu_biogas_m3_year"),
            rpo_biogas_m3_year=_f("rpo_biogas_m3_year"),
            sugarcane_biogas_m3_year=_f("sugarcane_biogas_m3_year"),
            soybean_biogas_m3_year=_f("soybean_biogas_m3_year"),
            corn_biogas_m3_year=_f("corn_biogas_m3_year"),
            coffee_biogas_m3_year=_f("coffee_biogas_m3_year"),
            citrus_biogas_m3_year=_f("citrus_biogas_m3_year"),
            cattle_biogas_m3_year=_f("cattle_biogas_m3_year"),
            swine_biogas_m3_year=_f("swine_biogas_m3_year"),
            poultry_biogas_m3_year=_f("poultry_biogas_m3_year"),
            aquaculture_biogas_m3_year=_f("aquaculture_biogas_m3_year"),
            energy_potential_kwh_day=_f("energy_potential_kwh_day"),
            energy_potential_mwh_year=_f("energy_potential_mwh_year"),
            co2_reduction_tons_year=_f("co2_reduction_tons_year"),
            population=int(pop) if pop is not None else None,
            urban_population=int(row["urban_population"]) if row.get("urban_population") is not None else None,
            rural_population=int(row["rural_population"]) if row.get("rural_population") is not None else None,
            gdp_total=_f("gdp_total") or None,
            gdp_per_capita=_f("gdp_per_capita") or None,
            centroid=_centroid,
            administrative_region=row.get("administrative_region"),
            immediate_region=row.get("immediate_region"),
            intermediate_region=row.get("intermediate_region"),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error in get_municipality %s: %s", str(municipality_id).replace('\n', ' ').replace('\r', ' ')[:50], e)
        raise HTTPException(status_code=500, detail="Failed to fetch municipality")


# ============================================================================
# SPATIAL ANALYSIS ENDPOINTS
# ============================================================================

@router.post(
    "/proximity",
    summary="Proximity analysis",
    description="Find municipalities within radius of a point"
)
async def proximity_analysis(query: ProximityQuery):
    try:
        gdf = _load_geo_gdf()
        biogas_lookup = _fetch_municipalities_db("id, municipality_name, ibge_code")

        gdf_proj = gdf.to_crs(epsg=3857)
        from pyproj import Transformer
        transformer = Transformer.from_crs("epsg:4326", "epsg:3857", always_xy=True)
        target_x, target_y = transformer.transform(query.longitude, query.latitude)
        target_pt = Point(target_x, target_y)
        radius_m = query.radius_km * 1000

        results = []
        for _, shp_row in gdf_proj.iterrows():
            ibge_code = _ibge_code_from_row(shp_row)
            if not ibge_code:
                continue
            dist = shp_row.geometry.centroid.distance(target_pt)
            if dist <= radius_m:
                biogas_data = biogas_lookup.get(ibge_code, {})
                results.append({
                    "municipality_id": biogas_data.get("id"),
                    "municipality_name": biogas_data.get("municipality_name") or ibge_code,
                    "distance_km": round(dist / 1000, 3),
                })

        results.sort(key=lambda r: r["distance_km"])

        return {
            "query": {
                "latitude": query.latitude,
                "longitude": query.longitude,
                "radius_km": query.radius_km,
            },
            "results": results,
            "total_found": len(results),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in proximity_analysis: {e}")
        raise HTTPException(status_code=500, detail=f"Proximity analysis failed: {str(e)}")


@router.get(
    "/rankings",
    summary="Municipality rankings",
    description="Get ranked municipalities by different criteria"
)
async def get_rankings(
    criteria: str = Query("total", enum=["total", "urban", "agricultural", "livestock"]),
    limit: int = Query(20, ge=1, le=100)
):
    column_map = {
        "total": "total_biogas_m3_year",
        "urban": "urban_biogas_m3_year",
        "agricultural": "agricultural_biogas_m3_year",
        "livestock": "livestock_biogas_m3_year",
    }
    column = column_map[criteria]

    try:
        with get_db() as conn:
            cursor = conn.cursor()
            try:
                cursor.execute(f"""
                    SELECT municipality_name, {column}, energy_potential_mwh_year
                    FROM municipalities
                    WHERE {column} > 0
                    ORDER BY {column} DESC
                    LIMIT %s
                """, (limit,))
                rows = cursor.fetchall()
            finally:
                cursor.close()

        return {
            "criteria": criteria,
            "rankings": [
                {
                    "rank": idx + 1,
                    "municipality": r["municipality_name"],
                    "biogas_m3_year": float(r.get(column) or 0),
                    "energy_mwh_year": float(r.get("energy_potential_mwh_year") or 0),
                }
                for idx, r in enumerate(rows)
            ]
        }

    except Exception as e:
        logger.error(f"Error in get_rankings: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch rankings")


@router.get(
    "/statistics/summary",
    summary="Overall statistics",
    description="Get summary statistics for all municipalities"
)
async def get_summary_statistics():
    logger.info("📊 Fetching summary statistics")

    try:
        with get_db() as conn:
            cursor = conn.cursor()
            try:
                cursor.execute("""
                    SELECT
                        COUNT(*) AS n,
                        COALESCE(SUM(total_biogas_m3_year), 0) AS total_biogas,
                        COALESCE(AVG(total_biogas_m3_year), 0) AS avg_biogas,
                        COALESCE(SUM(energy_potential_mwh_year), 0) AS total_energy,
                        COALESCE(SUM(co2_reduction_tons_year), 0) AS total_co2,
                        COALESCE(SUM(population), 0) AS total_pop,
                        COALESCE(SUM(agricultural_biogas_m3_year), 0) AS total_agri,
                        COALESCE(SUM(livestock_biogas_m3_year), 0) AS total_live,
                        COALESCE(SUM(urban_biogas_m3_year), 0) AS total_urban
                    FROM municipalities
                """)
                stats = cursor.fetchone()

                cursor.execute("""
                    SELECT municipality_name, total_biogas_m3_year
                    FROM municipalities
                    ORDER BY total_biogas_m3_year DESC
                    LIMIT 5
                """)
                top5 = cursor.fetchall()
            finally:
                cursor.close()

        n = int(stats["n"] or 0)
        total_biogas = float(stats["total_biogas"] or 0)
        avg_biogas = float(stats["avg_biogas"] or 0)
        total_energy = float(stats["total_energy"] or 0)
        total_co2 = float(stats["total_co2"] or 0)
        total_pop = int(stats["total_pop"] or 0)
        total_agri = float(stats["total_agri"] or 0)
        total_live = float(stats["total_live"] or 0)
        total_urban = float(stats["total_urban"] or 0)

        logger.info(f"✅ Summary statistics: {n} municipalities")

        return {
            "total_municipalities": n,
            "total_biogas_m3_year": total_biogas,
            "average_biogas_m3_year": round(avg_biogas, 2),
            "total_energy_mwh_year": round(total_energy, 2),
            "total_co2_reduction_tons_year": round(total_co2, 2),
            "total_population": total_pop,
            "top_municipality": {
                "name": top5[0]["municipality_name"] if top5 else "N/A",
                "biogas_m3_year": float(top5[0].get("total_biogas_m3_year") or 0) if top5 else 0,
            },
            "top_5_municipalities": [
                {"name": m["municipality_name"], "biogas_m3_year": float(m.get("total_biogas_m3_year") or 0)}
                for m in top5
            ],
            "categories": {},
            "sector_breakdown": {
                "agricultural": total_agri,
                "livestock": total_live,
                "urban": total_urban,
            },
            "sector_percentages": {
                "agricultural": round((total_agri / total_biogas * 100) if total_biogas > 0 else 0, 2),
                "livestock": round((total_live / total_biogas * 100) if total_biogas > 0 else 0, 2),
                "urban": round((total_urban / total_biogas * 100) if total_biogas > 0 else 0, 2),
            },
            "note": f"Dados de {n} municípios do estado de São Paulo",
        }

    except Exception as e:
        logger.error(f"🔥 Error in get_summary_statistics: {e}", exc_info=True)
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
            "error": "Failed to load data",
            "note": "Erro ao carregar dados - usando valores padrão",
        }


# ============================================================================
# INFRASTRUCTURE LAYERS
# ============================================================================

@router.get(
    "/infrastructure/biogas-plants",
    summary="Get biogas plants",
    description="Returns existing biogas plants as GeoJSON points"
)
async def get_biogas_plants():
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            try:
                cursor.execute("""
                    SELECT plant_name, plant_type, status,
                           installed_capacity_m3_day, latitude, longitude
                    FROM biogas_plants
                """)
                rows = cursor.fetchall()
            except psycopg2.errors.UndefinedTable:
                return {"type": "FeatureCollection", "features": []}
            finally:
                cursor.close()

        features = []
        for row in rows:
            lat = row.get("latitude")
            lng = row.get("longitude")
            if lat is None or lng is None:
                continue
            features.append({
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [float(lng), float(lat)]},
                "properties": {
                    "name": row.get("plant_name"),
                    "type": row.get("plant_type"),
                    "status": row.get("status"),
                    "capacity": row.get("installed_capacity_m3_day"),
                },
            })

        return {"type": "FeatureCollection", "features": features}

    except Exception as e:
        logger.error(f"Error in get_biogas_plants: {e}")
        return {"type": "FeatureCollection", "features": []}

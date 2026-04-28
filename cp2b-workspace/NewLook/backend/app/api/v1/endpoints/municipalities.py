"""
Municipalities API endpoints
Geometry from local shapefile, tabular data from local PostgreSQL.
"""
from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional, Dict, Any, List
from app.core.database import get_db
from app.middleware.auth import optional_auth
from app.models.auth import UserProfile
import logging
from pathlib import Path
import geopandas as gpd
from shapely.geometry import mapping

logger = logging.getLogger(__name__)
router = APIRouter()

SHAPEFILE_PATH = Path(__file__).parent.parent.parent.parent.parent / "data" / "shapefiles" / "SP_Municipios_2024.shp"
SHAPEFILE_PATH_ALT = (
    Path(__file__).parent.parent.parent.parent.parent.parent.parent
    / "project_map" / "data" / "shapefile" / "SP_Municipios_2024.shp"
)

_municipalities_gdf = None


def _load_gdf():
    global _municipalities_gdf
    if _municipalities_gdf is None:
        shapefile_to_use = None
        if SHAPEFILE_PATH.exists():
            shapefile_to_use = SHAPEFILE_PATH
        elif SHAPEFILE_PATH_ALT.exists():
            shapefile_to_use = SHAPEFILE_PATH_ALT
        else:
            raise HTTPException(status_code=500, detail=f"Shapefile not found at {SHAPEFILE_PATH}")
        _municipalities_gdf = gpd.read_file(shapefile_to_use)
        logger.info(f"Loaded {len(_municipalities_gdf)} municipality polygons from shapefile")
    return _municipalities_gdf


def _fetch_biogas_lookup(conn, columns: str = "*") -> Dict[str, Dict]:
    cursor = conn.cursor()
    cursor.execute(f"SELECT {columns} FROM municipalities")
    rows = cursor.fetchall()
    cursor.close()
    lookup = {}
    for row in (rows or []):
        code = str(row.get("ibge_code", "") or "").strip()
        if code:
            lookup[code] = dict(row)
    return lookup


@router.get("/geojson")
async def get_municipalities_geojson(
    limit: int = Query(default=1000, le=1000),
    current_user: Optional[UserProfile] = Depends(optional_auth),
):
    try:
        gdf = _load_gdf()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading shapefile: {e}")

    try:
        with get_db() as conn:
            biogas_lookup = _fetch_biogas_lookup(conn)
    except Exception as e:
        logger.error(f"Error fetching biogas data: {e}")
        biogas_lookup = {}

    merged_features = []
    matched_count   = 0

    for _, row in gdf.iterrows():
        ibge_code = None
        for col in ["CD_MUN", "GEOCODIGO", "geocodigo", "CD_GEOCMU", "cd_mun"]:
            if col in row and row[col]:
                ibge_code = str(row[col]).strip()
                break
        if not ibge_code:
            continue

        biogas_data = biogas_lookup.get(ibge_code, {})

        mun_name = biogas_data.get("municipality_name")
        if not mun_name:
            for col in ["NM_MUN", "nome", "NOME_MUN", "nm_mun"]:
                if col in row and row[col]:
                    mun_name = str(row[col])
                    break

        try:
            geometry = mapping(row.geometry)
        except Exception as e:
            logger.error(f"Error converting geometry for {ibge_code}: {e}")
            continue

        if biogas_data:
            matched_count += 1

        def _g(key, default=0):
            return biogas_data.get(key, default)

        merged_features.append({
            "type": "Feature",
            "geometry": geometry,
            "properties": {
                "ibge_code":        ibge_code,
                "name":             mun_name or "Unknown",
                "id":               _g("id"),
                "municipality_name": _g("municipality_name"),
                "population":       _g("population"),
                "area_km2":         _g("area_km2"),
                "population_density": _g("population_density"),
                "population_year":  _g("population_year"),
                "area_year":        _g("area_year"),
                "gdp_total":        _g("gdp_total"),
                "gdp_per_capita":   _g("gdp_per_capita"),
                "gdp_year":         _g("gdp_year"),
                "total_biogas_m3_year":          _g("total_biogas_m3_year"),
                "agricultural_biogas_m3_year":   _g("agricultural_biogas_m3_year"),
                "livestock_biogas_m3_year":       _g("livestock_biogas_m3_year"),
                "urban_biogas_m3_year":           _g("urban_biogas_m3_year"),
                "energy_potential_mwh_year":      _g("energy_potential_mwh_year"),
                "administrative_region":          _g("administrative_region"),
                "immediate_region":               _g("immediate_region"),
                "intermediate_region":            _g("intermediate_region"),
                "immediate_region_code":          _g("immediate_region_code"),
                "intermediate_region_code":       _g("intermediate_region_code"),
                "potential_category":             _g("potential_category"),
                "sugarcane_biogas_m3_year":  _g("sugarcane_biogas_m3_year", 0),
                "soybean_biogas_m3_year":    _g("soybean_biogas_m3_year", 0),
                "corn_biogas_m3_year":       _g("corn_biogas_m3_year", 0),
                "coffee_biogas_m3_year":     _g("coffee_biogas_m3_year", 0),
                "citrus_biogas_m3_year":     _g("citrus_biogas_m3_year", 0),
                "cattle_biogas_m3_year":     _g("cattle_biogas_m3_year", 0),
                "swine_biogas_m3_year":      _g("swine_biogas_m3_year", 0),
                "poultry_biogas_m3_year":    _g("poultry_biogas_m3_year", 0),
                "aquaculture_biogas_m3_year":_g("aquaculture_biogas_m3_year", 0),
                "rsu_biogas_m3_year":        _g("rsu_biogas_m3_year", 0),
                "rpo_biogas_m3_year":        _g("rpo_biogas_m3_year", 0),
                "total_biomass_tons_year":        _g("total_biomass_tons_year", 0),
                "agricultural_biomass_tons_year": _g("agricultural_biomass_tons_year", 0),
                "livestock_biomass_tons_year":    _g("livestock_biomass_tons_year", 0),
                "urban_biomass_tons_year":        _g("urban_biomass_tons_year", 0),
                "sugarcane_biomass_tons_year":    _g("sugarcane_biomass_tons_year", 0),
                "soybean_biomass_tons_year":      _g("soybean_biomass_tons_year", 0),
                "corn_biomass_tons_year":         _g("corn_biomass_tons_year", 0),
                "coffee_biomass_tons_year":       _g("coffee_biomass_tons_year", 0),
                "citrus_biomass_tons_year":       _g("citrus_biomass_tons_year", 0),
                "cattle_biomass_tons_year":       _g("cattle_biomass_tons_year", 0),
                "swine_biomass_tons_year":        _g("swine_biomass_tons_year", 0),
                "poultry_biomass_tons_year":      _g("poultry_biomass_tons_year", 0),
                "aquaculture_biomass_tons_year":  _g("aquaculture_biomass_tons_year", 0),
                "rsu_biomass_tons_year":          _g("rsu_biomass_tons_year", 0),
                "rpo_biomass_tons_year":          _g("rpo_biomass_tons_year", 0),
            },
        })

    logger.info(f"Returning {len(merged_features)} municipalities ({matched_count} with biogas data)")
    return {
        "type": "FeatureCollection",
        "features": merged_features,
        "metadata": {
            "total_municipalities":    len(merged_features),
            "matched_with_biogas_data": matched_count,
            "source_geometry":  "Local Shapefile (SP_Municipios_2024.shp)",
            "source_biogas_data": "Local PostgreSQL",
        },
    }


@router.get("/test-shapefile")
async def test_shapefile():
    try:
        if SHAPEFILE_PATH.exists():
            gdf = gpd.read_file(SHAPEFILE_PATH)
            test_geom = mapping(gdf.iloc[0].geometry)
            return {
                "success": True, "path": str(SHAPEFILE_PATH),
                "count": len(gdf), "columns": list(gdf.columns),
                "first_municipality": gdf.iloc[0]["NM_MUN"],
                "geometry_type": test_geom["type"],
            }
        return {"success": False, "error": f"Shapefile not found at {SHAPEFILE_PATH}"}
    except Exception as e:
        return {"success": False, "error": str(e), "type": type(e).__name__}


@router.get("/stats/summary")
async def get_municipalities_stats():
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT COUNT(*) AS total,
                       COALESCE(SUM(population), 0) AS total_population,
                       COALESCE(SUM(area_km2), 0) AS total_area,
                       COALESCE(SUM(total_biogas_m3_year), 0) AS total_biogas
                FROM municipalities
            """)
            row = cursor.fetchone()
            cursor.close()
        return {
            "total_municipalities": int(row["total"] or 0),
            "total_population":     int(row["total_population"] or 0),
            "total_area_km2":       round(float(row["total_area"] or 0), 2),
            "total_biogas_m3_year": round(float(row["total_biogas"] or 0), 2),
        }
    except Exception as e:
        logger.error(f"Error calculating stats: {e}")
        raise HTTPException(status_code=500, detail=f"Error calculating stats: {str(e)}")


@router.get("/")
async def get_municipalities(
    limit: int = Query(default=100, le=1000),
    offset: int = Query(default=0, ge=0),
    search: Optional[str] = Query(default=None),
):
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            if search:
                cursor.execute(
                    "SELECT * FROM municipalities WHERE municipality_name ILIKE %s LIMIT %s OFFSET %s",
                    [f"%{search}%", limit, offset],
                )
            else:
                cursor.execute("SELECT * FROM municipalities LIMIT %s OFFSET %s", [limit, offset])
            data = [dict(r) for r in cursor.fetchall()]

            cursor.execute("SELECT COUNT(*) AS total FROM municipalities" +
                           (" WHERE municipality_name ILIKE %s" if search else ""),
                           [f"%{search}%"] if search else [])
            total = cursor.fetchone()["total"]
            cursor.close()

        return {"data": data, "total": total, "limit": limit, "offset": offset,
                "has_more": offset + limit < total}
    except Exception as e:
        logger.error(f"Error fetching municipalities: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching municipalities: {str(e)}")


@router.get("/{municipality_id}")
async def get_municipality(municipality_id: str):
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            try:
                cursor.execute("SELECT * FROM municipalities WHERE id = %s", [int(municipality_id)])
            except ValueError:
                cursor.execute("SELECT * FROM municipalities WHERE ibge_code = %s", [municipality_id])
            row = cursor.fetchone()
            cursor.close()

        if not row:
            raise HTTPException(status_code=404, detail=f"Municipality {municipality_id} not found")
        return dict(row)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching municipality: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching municipality: {str(e)}")

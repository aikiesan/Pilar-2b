"""
Municipalities API endpoints
Geometry and tabular data both served from local PostgreSQL / PostGIS.
"""
import json
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Depends

from app.core.database import get_db
from app.middleware.auth import optional_auth
from app.models.auth import UserProfile
from app.services.biomass_availability import derive_biomass_fields

logger = logging.getLogger(__name__)
router = APIRouter()


def _table_exists(cursor, table_name: str, schema: str = "public") -> bool:
    cursor.execute(
        """
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = %s AND table_name = %s
        LIMIT 1
        """,
        (schema, table_name),
    )
    return cursor.fetchone() is not None


def _geojson_select_sql(include_municipality_summary: bool) -> str:
    """Build SELECT for GeoJSON rows; omit JOIN if municipality_summary is not deployed."""
    cluster_cols = (
        "ms.cluster_id, ms.cluster_label,\n"
        "                    ms.mun_total_gwh, ms.mun_n_streams, ms.mun_dominant_stream"
        if include_municipality_summary
        else (
            "NULL::integer AS cluster_id, NULL::text AS cluster_label,\n"
            "                    NULL::double precision AS mun_total_gwh, "
            "NULL::integer AS mun_n_streams, NULL::text AS mun_dominant_stream"
        )
    )
    join = (
        "\n                LEFT JOIN municipality_summary ms ON m.ibge_code::integer = ms.ibge_code"
        if include_municipality_summary
        else ""
    )
    return f"""
                SELECT
                    m.ibge_code, m.municipality_name, m.id,
                    ST_AsGeoJSON(ST_Simplify(m.geometry, 0.001)) AS geojson,
                    m.total_biogas_m3_year, m.urban_biogas_m3_year,
                    m.agricultural_biogas_m3_year, m.livestock_biogas_m3_year,
                    m.energy_potential_mwh_year, m.co2_reduction_tons_year,
                    m.population, m.area_km2, m.population_density,
                    m.population_year, m.area_year,
                    m.gdp_total, m.gdp_per_capita, m.gdp_year,
                    m.administrative_region, m.immediate_region, m.intermediate_region,
                    m.immediate_region_code, m.intermediate_region_code,
                    m.sugarcane_biogas_m3_year, m.soybean_biogas_m3_year,
                    m.corn_biogas_m3_year, m.coffee_biogas_m3_year, m.citrus_biogas_m3_year,
                    m.cattle_biogas_m3_year, m.swine_biogas_m3_year, m.poultry_biogas_m3_year,
                    m.aquaculture_biogas_m3_year, m.rsu_biogas_m3_year, m.rpo_biogas_m3_year,
                    m.total_biomass_tons_year, m.agricultural_biomass_tons_year,
                    m.livestock_biomass_tons_year, m.urban_biomass_tons_year,
                    m.sugarcane_biomass_tons_year, m.soybean_biomass_tons_year,
                    m.corn_biomass_tons_year, m.coffee_biomass_tons_year, m.citrus_biomass_tons_year,
                    m.cattle_biomass_tons_year, m.swine_biomass_tons_year, m.poultry_biomass_tons_year,
                    m.aquaculture_biomass_tons_year, m.rsu_biomass_tons_year, m.rpo_biomass_tons_year,
                    {cluster_cols}
                FROM municipalities m{join}
                WHERE m.geometry IS NOT NULL
                LIMIT %s
                """


def _cat(total_biogas: float) -> str:
    if total_biogas > 100_000_000:
        return "ALTO"
    if total_biogas > 10_000_000:
        return "MEDIO"
    if total_biogas > 0:
        return "BAIXO"
    return "SEM DADOS"


@router.get("/geojson")
async def get_municipalities_geojson(
    limit: int = Query(default=1000, le=1000),
    current_user: Optional[UserProfile] = Depends(optional_auth),
):
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            has_summary = _table_exists(cursor, "municipality_summary")
            if not has_summary:
                logger.warning(
                    "municipality_summary missing — GeoJSON served without cluster columns "
                    "(apply backend/migrations/013_cp2b_municipality_summary.sql)."
                )
            cursor.execute(_geojson_select_sql(has_summary), (limit,))
            rows = cursor.fetchall()
            cursor.close()
    except Exception as e:
        logger.error(f"Error fetching municipalities GeoJSON: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    def _f(row, key, default=0):
        v = row.get(key)
        return v if v is not None else default

    features = []
    for row in rows:
        ibge_code = str(_f(row, "ibge_code", ""))
        tb = float(_f(row, "total_biogas_m3_year"))
        biomass_fields = derive_biomass_fields(row)
        features.append({
            "type": "Feature",
            "geometry": json.loads(row["geojson"]),
            "properties": {
                "ibge_code":                     ibge_code,
                "name":                          _f(row, "municipality_name", "Unknown"),
                "id":                            _f(row, "id"),
                "municipality_name":             _f(row, "municipality_name"),
                "population":                    _f(row, "population"),
                "area_km2":                      _f(row, "area_km2"),
                "population_density":            _f(row, "population_density"),
                "population_year":               _f(row, "population_year"),
                "area_year":                     _f(row, "area_year"),
                "gdp_total":                     _f(row, "gdp_total"),
                "gdp_per_capita":                _f(row, "gdp_per_capita"),
                "gdp_year":                      _f(row, "gdp_year"),
                "total_biogas_m3_year":          tb,
                "agricultural_biogas_m3_year":   _f(row, "agricultural_biogas_m3_year"),
                "livestock_biogas_m3_year":      _f(row, "livestock_biogas_m3_year"),
                "urban_biogas_m3_year":          _f(row, "urban_biogas_m3_year"),
                "energy_potential_mwh_year":     _f(row, "energy_potential_mwh_year"),
                "co2_reduction_tons_year":       _f(row, "co2_reduction_tons_year"),
                "administrative_region":         _f(row, "administrative_region", ""),
                "immediate_region":              _f(row, "immediate_region", ""),
                "intermediate_region":           _f(row, "intermediate_region", ""),
                "immediate_region_code":         _f(row, "immediate_region_code", ""),
                "intermediate_region_code":      _f(row, "intermediate_region_code", ""),
                "potential_category":            _cat(tb),
                "sugarcane_biogas_m3_year":      _f(row, "sugarcane_biogas_m3_year"),
                "soybean_biogas_m3_year":        _f(row, "soybean_biogas_m3_year"),
                "corn_biogas_m3_year":           _f(row, "corn_biogas_m3_year"),
                "coffee_biogas_m3_year":         _f(row, "coffee_biogas_m3_year"),
                "citrus_biogas_m3_year":         _f(row, "citrus_biogas_m3_year"),
                "cattle_biogas_m3_year":         _f(row, "cattle_biogas_m3_year"),
                "swine_biogas_m3_year":          _f(row, "swine_biogas_m3_year"),
                "poultry_biogas_m3_year":        _f(row, "poultry_biogas_m3_year"),
                "aquaculture_biogas_m3_year":    _f(row, "aquaculture_biogas_m3_year"),
                "rsu_biogas_m3_year":            _f(row, "rsu_biogas_m3_year"),
                "rpo_biogas_m3_year":            _f(row, "rpo_biogas_m3_year"),
                "cluster_id":                    row.get("cluster_id"),
                "cluster_label":                 row.get("cluster_label"),
                "mun_total_GWh":                 row.get("mun_total_gwh"),
                "mun_n_streams":                 row.get("mun_n_streams"),
                "mun_dominant_stream":           row.get("mun_dominant_stream"),
                **biomass_fields,
            },
        })

    logger.info(f"Returning {len(features)} municipalities from PostGIS")
    return {
        "type": "FeatureCollection",
        "features": features,
        "metadata": {
            "total_municipalities":    len(features),
            "source_geometry":         "PostGIS municipalities.geometry",
            "source_biogas_data":      "PostGIS municipalities table",
            "source_biomass_data":     "Stored biomass columns with reverse-BMP fallback from biogas fields",
        },
    }


@router.get("/test-geometry")
async def test_geometry():
    """Sanity-check that PostGIS geometry is populated."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT COUNT(*) AS total,
                       COUNT(geometry) AS with_geometry,
                       ST_AsGeoJSON(ST_Envelope(ST_Collect(geometry))) AS bbox
                FROM municipalities
                """
            )
            row = cursor.fetchone()
            cursor.close()
        return {
            "total_rows":      int(row["total"] or 0),
            "with_geometry":   int(row["with_geometry"] or 0),
            "bounding_box":    json.loads(row["bbox"]) if row["bbox"] else None,
        }
    except Exception as e:
        return {"error": str(e)}


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

            cursor.execute(
                "SELECT COUNT(*) AS total FROM municipalities"
                + (" WHERE municipality_name ILIKE %s" if search else ""),
                [f"%{search}%"] if search else [],
            )
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

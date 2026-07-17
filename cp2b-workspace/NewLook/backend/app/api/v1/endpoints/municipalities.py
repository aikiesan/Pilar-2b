"""
Municipalities API endpoints
Geometry and tabular data both served from local PostgreSQL / PostGIS.
"""

import json
import logging
import os
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.database import get_db
from app.middleware.auth import optional_auth
from app.models.auth import UserProfile
from app.services.biomass_availability import derive_biomass_with_coverage
from app.services.map_metrics import compute_municipality_map_metrics

logger = logging.getLogger(__name__)
router = APIRouter()

# Back-calculating biomass from legacy V2 biogas (reverse-BMP) invents tonnage for
# streams we have no provenance for. On an availability map that is worse than an
# honest gap — it made SP show derived numbers while the rest of Brazil showed real
# zeros. Now defaults OFF; set BIOMASS_REVERSE_FALLBACK=true to restore the old
# behaviour, in which case the values are tagged 'estimated', never 'measured'.
_ALLOW_REVERSE_FALLBACK = os.getenv("BIOMASS_REVERSE_FALLBACK", "false").lower() == "true"


def _load_biomass_provenance(cursor, ibge_codes: list[str]) -> dict[str, dict[str, str]]:
    """ibge_code -> {stream: quality} for the rows being served.

    One query for the whole page rather than per-municipality: the national
    slice is 5,571 rows, and a per-row lookup there is 5,571 round trips.
    A stream absent from the result is no_data — that is the contract.
    """
    if not ibge_codes:
        return {}
    cursor.execute(
        """
        SELECT ibge_code, stream, quality
        FROM municipality_biomass_provenance
        WHERE ibge_code = ANY(%s)
        """,
        (ibge_codes,),
    )
    out: dict[str, dict[str, str]] = {}
    for r in cursor.fetchall():
        out.setdefault(str(r["ibge_code"]), {})[r["stream"]] = r["quality"]
    return out


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


# detail level -> (geometry column, ST_AsGeoJSON precision). Mirrors the
# geospatial.py endpoint so the two never drift. The LOD columns come from
# migration 022 and are pre-simplified with ST_SimplifyPreserveTopology, which
# — unlike the ST_Simplify this used to call inline — cannot self-intersect or
# collapse small municipalities (52 polygons self-intersected at national scale
# under the old ST_Simplify(geometry, 0.001)).
_GEOM_LOD = {
    "overview": ("geometry_overview", 4),  # ~2.2 km, ~1.9 MB nationally
    "detail": ("geometry_detail", 5),  # ~550 m,  ~6.7 MB nationally
    "full": ("geometry", 9),  # unsimplified; pair with a limit
}


def _geojson_select_sql(
    include_municipality_summary: bool, geom_column: str, geom_precision: int, has_limit: bool
) -> str:
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
    limit_clause = "LIMIT %s" if has_limit else ""
    return f"""
                SELECT
                    m.ibge_code, m.municipality_name, m.id,
                    ST_AsGeoJSON(
                        COALESCE(m.{geom_column}, ST_Buffer(m.centroid::geography, 5000)::geometry),
                        {geom_precision}
                    ) AS geojson,
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
                    m.corn_biomass_tons_year, m.coffee_biomass_tons_year,
                    m.citrus_biomass_tons_year,
                    m.cattle_biomass_tons_year, m.swine_biomass_tons_year,
                    m.poultry_biomass_tons_year,
                    m.aquaculture_biomass_tons_year, m.rsu_biomass_tons_year,
                    m.rpo_biomass_tons_year,
                    {cluster_cols}
                FROM municipalities m{join}
                WHERE m.geometry IS NOT NULL
                ORDER BY m.total_biogas_m3_year DESC NULLS LAST
                {limit_clause}
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
    limit: Optional[int] = Query(
        default=None,
        ge=1,
        le=6000,
        description="Max features. Default None serves all 5,571 (the old le=1000 "
        "cap silently truncated the national dataset to the first 1,000).",
    ),
    detail: str = Query(
        "overview",
        pattern="^(overview|detail|full)$",
        description="Geometry level of detail (migration 022). 'overview' ~2.2 km "
        "(default, national choropleth); 'detail' ~550 m; 'full' unsimplified "
        "(pair with limit — 471 MB exceeds PostgreSQL's jsonb ceiling nationally).",
    ),
    current_user: Optional[UserProfile] = Depends(optional_auth),
):
    geom_column, geom_precision = _GEOM_LOD[detail]
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            has_summary = _table_exists(cursor, "municipality_summary")
            if not has_summary:
                logger.warning(
                    "municipality_summary missing — GeoJSON served without cluster columns "
                    "(apply backend/migrations/013_cp2b_municipality_summary.sql)."
                )
            sql = _geojson_select_sql(
                has_summary, geom_column, geom_precision, has_limit=limit is not None
            )
            cursor.execute(sql, (limit,) if limit is not None else ())
            rows = cursor.fetchall()
            has_provenance = _table_exists(cursor, "municipality_biomass_provenance")
            provenance = (
                _load_biomass_provenance(cursor, [str(r["ibge_code"]) for r in rows])
                if has_provenance
                else {}
            )
            cursor.close()
    except Exception as e:
        logger.error(f"Error fetching municipalities GeoJSON: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    if not has_provenance:
        logger.error(
            "municipality_biomass_provenance missing — biomass coverage cannot be "
            "determined, so every municipality is served as no_data. Apply "
            "backend/app/migrations/025_biomass_provenance.sql."
        )

    def _f(row, key, default=0):
        v = row.get(key)
        return v if v is not None else default

    features = []
    # A systemic cause (e.g. feedstocks.yaml not reachable) fails on every row, so
    # logging per-municipality buries the signal under thousands of identical lines.
    # Count them and report once below.
    canonical_failures = 0
    first_canonical_error: Optional[str] = None
    for row in rows:
        ibge_code = str(_f(row, "ibge_code", ""))
        tb = float(_f(row, "total_biogas_m3_year"))
        # Coverage comes from provenance, never from the stored value: outside SP
        # every biomass column holds a seeded 0 that means "never loaded", which is
        # indistinguishable from a real zero. See migration 025.
        biomass_fields = derive_biomass_with_coverage(
            row,
            provenance=provenance.get(ibge_code, {}),
            allow_reverse_fallback=_ALLOW_REVERSE_FALLBACK,
        )
        try:
            canonical_metrics = compute_municipality_map_metrics(
                row, ibge_code=ibge_code
            ).to_flat_dict()
        except Exception as exc:
            canonical_failures += 1
            if first_canonical_error is None:
                first_canonical_error = f"{ibge_code}: {exc}"
            canonical_metrics = {}
        # Identity, geography, and cluster context: always present. Small, and
        # either non-zero or semantically meaningful when zero (a cluster_id of 0
        # is a real cluster), so these are never trimmed.
        properties = {
            "ibge_code": ibge_code,
            "name": _f(row, "municipality_name", "Unknown"),
            "id": _f(row, "id"),
            "municipality_name": _f(row, "municipality_name"),
            "area_km2": _f(row, "area_km2"),
            "population_year": _f(row, "population_year"),
            "area_year": _f(row, "area_year"),
            "administrative_region": _f(row, "administrative_region", ""),
            "immediate_region": _f(row, "immediate_region", ""),
            "intermediate_region": _f(row, "intermediate_region", ""),
            "immediate_region_code": _f(row, "immediate_region_code", ""),
            "intermediate_region_code": _f(row, "intermediate_region_code", ""),
            "potential_category": _cat(tb),
        }

        # Cluster context exists only for SP (LEFT JOIN on municipality_summary);
        # it is NULL for the 4,926 non-SP rows. Drop the NULLs — but keep a real
        # cluster_id of 0, which is a valid cluster, not missing data.
        cluster_fields = {
            "cluster_id": row.get("cluster_id"),
            "cluster_label": row.get("cluster_label"),
            "mun_total_GWh": row.get("mun_total_gwh"),
            "mun_n_streams": row.get("mun_n_streams"),
            "mun_dominant_stream": row.get("mun_dominant_stream"),
        }
        properties.update({k: v for k, v in cluster_fields.items() if v is not None})

        # Numeric metric fields: OMITTED when zero/None. At 5,571 municipalities,
        # 65% of these entries are zero (only SP's 645 rows carry biogas data yet),
        # which was ~5.8 MB of "field":0 pairs per national response. Every frontend
        # reader accesses these as `Number(props[key]) || 0` (verified in
        # MunicipalityLayer.getBiogasValue and the dashboard/municipality pages),
        # so an absent key is read as exactly 0 — same value, far less payload.
        metric_fields = {
            "population": _f(row, "population"),
            "population_density": _f(row, "population_density"),
            "gdp_total": _f(row, "gdp_total"),
            "gdp_per_capita": _f(row, "gdp_per_capita"),
            "gdp_year": _f(row, "gdp_year"),
            "total_biogas_m3_year": tb,
            "agricultural_biogas_m3_year": _f(row, "agricultural_biogas_m3_year"),
            "livestock_biogas_m3_year": _f(row, "livestock_biogas_m3_year"),
            "urban_biogas_m3_year": _f(row, "urban_biogas_m3_year"),
            "energy_potential_mwh_year": _f(row, "energy_potential_mwh_year"),
            "co2_reduction_tons_year": _f(row, "co2_reduction_tons_year"),
            "sugarcane_biogas_m3_year": _f(row, "sugarcane_biogas_m3_year"),
            "soybean_biogas_m3_year": _f(row, "soybean_biogas_m3_year"),
            "corn_biogas_m3_year": _f(row, "corn_biogas_m3_year"),
            "coffee_biogas_m3_year": _f(row, "coffee_biogas_m3_year"),
            "citrus_biogas_m3_year": _f(row, "citrus_biogas_m3_year"),
            "cattle_biogas_m3_year": _f(row, "cattle_biogas_m3_year"),
            "swine_biogas_m3_year": _f(row, "swine_biogas_m3_year"),
            "poultry_biogas_m3_year": _f(row, "poultry_biogas_m3_year"),
            "aquaculture_biogas_m3_year": _f(row, "aquaculture_biogas_m3_year"),
            "rsu_biogas_m3_year": _f(row, "rsu_biogas_m3_year"),
            "rpo_biogas_m3_year": _f(row, "rpo_biogas_m3_year"),
            **canonical_metrics,
        }
        properties.update({k: v for k, v in metric_fields.items() if v})

        # Biomass is emitted WHOLE — nulls and zeros included — and must never go
        # through the `if v` omission above. That optimisation is correct for biogas,
        # where the frontend's `Number(props[key]) || 0` reads an absent key as 0 and
        # 0 is what was meant. Biomass now distinguishes 0.0 ("we looked; there is
        # none") from null ("we never loaded this municipality"), and omitting either
        # collapses them straight back into the 0 that made a 77% data gap render as
        # a finding about Brazilian agriculture. Explicit costs bytes; implicit costs
        # correctness, and silently — any consumer that missed the memo defaults to
        # the wrong reading. See migration 025.
        properties.update(biomass_fields)

        features.append(
            {
                "type": "Feature",
                "geometry": json.loads(row["geojson"]),
                "properties": properties,
            }
        )

    if canonical_failures:
        logger.error(
            "canonical metrics failed for %d/%d municipalities (first: %s). Responses are "
            "missing their biomass_/biogas_/biomethane_ properties; check GET /health for "
            "canonical_parameters status.",
            canonical_failures,
            len(rows),
            first_canonical_error,
        )

    logger.info(f"Returning {len(features)} municipalities from PostGIS")
    return {
        "type": "FeatureCollection",
        "features": features,
        "metadata": {
            "total_municipalities": len(features),
            "source_geometry": "PostGIS municipalities.geometry",
            "source_biogas_data": "PostGIS municipalities table (legacy V2 import)",
            "source_biomass_data": (
                "Stored biomass columns (agricultural: authoritative from master CSV)"
            ),
            "canonical_metrics": (
                "Properties prefixed biomass_gross_, biomass_corrected_, biogas_ch4_, biomethane_ "
                "are canonical forward-calculated 4-metric × 3-scenario values. "
                "Agricultural streams use authoritative biomass tonnage. "
                "Livestock/urban streams without stored biomass use legacy biogas "
                "with ±FDE envelope."
            ),
        },
    }


@router.get("/test-geometry")
async def test_geometry():
    """Sanity-check that PostGIS geometry is populated."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT COUNT(*) AS total,
                       COUNT(geometry) AS with_geometry,
                       ST_AsGeoJSON(ST_Envelope(ST_Collect(geometry))) AS bbox
                FROM municipalities
                """)
            row = cursor.fetchone()
            cursor.close()
        return {
            "total_rows": int(row["total"] or 0),
            "with_geometry": int(row["with_geometry"] or 0),
            "bounding_box": json.loads(row["bbox"]) if row["bbox"] else None,
        }
    except Exception as e:
        logger.error("Error in municipalities stats: %s", e, exc_info=True)
        return {"error": "Internal server error"}


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
            "total_population": int(row["total_population"] or 0),
            "total_area_km2": round(float(row["total_area"] or 0), 2),
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
                    "SELECT * FROM municipalities WHERE municipality_name ILIKE %s "
                    "LIMIT %s OFFSET %s",
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

        return {
            "data": data,
            "total": total,
            "limit": limit,
            "offset": offset,
            "has_more": offset + limit < total,
        }
    except Exception as e:
        logger.error(f"Error fetching municipalities: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching municipalities: {str(e)}")


@router.get("/names")
async def get_municipality_names(
    limit: int = Query(default=1000, le=1000),
):
    """Lightweight list for typeahead — returns only id, name, ibge_code, no geometry."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT id, municipality_name, ibge_code
                FROM municipalities
                ORDER BY municipality_name
                LIMIT %s
                """,
                (limit,),
            )
            data = [dict(r) for r in cursor.fetchall()]
            cursor.close()
        return {"data": data}
    except Exception as e:
        logger.error(f"Error fetching municipality names: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.get("/{municipality_id}")
async def get_municipality(municipality_id: str):
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            try:
                cursor.execute("SELECT * FROM municipalities WHERE id = %s", [int(municipality_id)])
            except ValueError:
                cursor.execute(
                    "SELECT * FROM municipalities WHERE ibge_code = %s", [municipality_id]
                )
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

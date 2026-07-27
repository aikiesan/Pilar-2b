"""
Municipalities API endpoints
Geometry and tabular data both served from local PostgreSQL / PostGIS.
"""

import json
import logging
import os
import re
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.database import get_db
from app.middleware.auth import optional_auth
from app.models.auth import UserProfile
from app.services.biomass_availability import derive_biomass_with_coverage, raw_value
from app.services.canonical_loader import (
    biomass_tons_from_collected_waste,
    biomass_tons_from_units,
)
from app.services.map_metrics import compute_published_municipality_metrics

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


# Activity counts that drive derived tonnage, keyed by (source_id, variable).
# PPM counts animals; SNIS counts residents. The manure/waste tonnage they imply
# is derived, not stored (see migration 025 / canonical_loader). "population" is a
# synthetic key consumed by the urban streams, not a livestock stream itself.
_ACTIVITY_VARIABLES = {
    ("ibge_ppm", "bovino"): "cattle",
    ("ibge_ppm", "suino_total"): "swine",
    ("ibge_ppm", "galinaceos_total"): "poultry",
    ("snis", "populacao_total"): "population",
    # Household waste a municipality REPORTS collecting (SNIS CO111). ~5,060 of
    # 5,571 municipalities report it, and where they do it beats modelling the
    # tonnage from population — a measurement instead of an estimate.
    ("snis", "rdo_coletado"): "rdo_coletado",
}
# Properties served only for a single municipality (fields=detail), never across
# the whole collection. See the trim in get_municipalities_geojson for the
# measurements that motivated this.
_DETAIL_ONLY_KEYS = frozenset(
    {
        "municipality_name",  # duplicate of `name`
        "id",
        "population",
        "population_density",
        "population_year",
        "gdp_total",
        "gdp_per_capita",
        "gdp_year",
        "area_km2",
        "area_year",
        "administrative_region",
        "immediate_region_code",
        "intermediate_region_code",
        "energy_potential_mwh_year",
        "co2_reduction_tons_year",
        "biomass_gross_total_tons_yr",
    }
)

# {sector}_biogas_*/{sector}_biomethane_* (the tooltip/panel breakdown) and the
# legacy per-stream *_biogas_m3_year columns.
_DETAIL_ONLY_RE = re.compile(
    r"^(agricultural|livestock|urban)_(biogas|biomethane)_|^\w+_biogas_m3_year$"
)

# Livestock streams derived from PPM head counts (per-head generation).
_PPM_STREAMS = ("cattle", "swine", "poultry")
# Urban streams modelled from resident population (per-capita generation).
_URBAN_STREAMS = ("rsu", "rpo")


def _load_activity_counts(cursor, ibge_codes: list[str]) -> dict[str, dict[str, float]]:
    """ibge_code -> {stream|'population': count} from the latest year of each source.

    One batched query for the page, like _load_biomass_provenance. Counts are
    converted to tonnes at read time via the canonical generation factor — the
    `municipalities` columns cannot be used: the livestock ones hold these same
    head counts mislabelled as tonnes, and population is NULL nationally.
    """
    if not ibge_codes:
        return {}
    # Variable names are unique across the two sources, so filtering on variable
    # alone is unambiguous and avoids a fragile composite-tuple ANY().
    by_variable = {var: key for (_src, var), key in _ACTIVITY_VARIABLES.items()}
    cursor.execute(
        """
        SELECT DISTINCT ON (ibge_code, variable)
               ibge_code, variable, value
        FROM municipality_timeseries
        WHERE variable = ANY(%s)
          AND ibge_code = ANY(%s)
        ORDER BY ibge_code, variable, year DESC
        """,
        (list(by_variable), ibge_codes),
    )
    out: dict[str, dict[str, float]] = {}
    for r in cursor.fetchall():
        key = by_variable[r["variable"]]
        if r["value"] is not None:
            out.setdefault(str(r["ibge_code"]), {})[key] = float(r["value"])
    return out


def _derive_activity_biomass(
    *,
    head: dict[str, float],
    population: float | None,
    collected_waste: float | None = None,
) -> tuple[dict[str, float], dict[str, str]]:
    """Livestock/urban tonnage + provenance from activity counts.

    Livestock manure = head x generation, always modelled ('estimated') — IBGE
    counts animals, not manure.

    Urban waste prefers MEASUREMENT over modelling:
      * rsu, where SNIS reports collected household waste (CO111) -> that tonnage
        x the canonical organic fraction, tagged 'measured'. ~5,060 municipalities.
      * rsu elsewhere, and rpo always -> population x per-capita generation,
        tagged 'estimated'.

    rpo (urban pruning) stays modelled even where SNIS reports public-cleaning
    waste (CO115): RPU bundles street sweeping with pruning and there is no cited
    factor for the pruning share of it. Inventing one to reach a 'measured' tag
    would be worse than an honest estimate — the per-capita figure is at least
    grounded in ABRELPE's 3-5%-of-RSU characterization.

    Returns the 'medio' scenario for the displayed value. A stream with no
    activity data is simply absent -> no_data.
    """
    tons: dict[str, float] = {}
    prov: dict[str, str] = {}
    for stream, count in head.items():
        tons[stream] = biomass_tons_from_units(stream, count).medio
        prov[stream] = "estimated"

    if collected_waste is not None and collected_waste > 0:
        tons["rsu"] = biomass_tons_from_collected_waste("rsu", collected_waste).medio
        prov["rsu"] = "measured"

    if population is not None and population > 0:
        for stream in _URBAN_STREAMS:
            if stream in tons:
                continue  # a measured value already won
            tons[stream] = biomass_tons_from_units(stream, population).medio
            prov[stream] = "estimated"
    return tons, prov


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
    fields: str = Query(
        "map",
        pattern="^(map|full)$",
        description="Property set. 'map' (default) carries only what the choropleth "
        "paints — per-residue tonnage and coverage, sector tonnage, the four metric "
        "scenario bands, cluster context. 'full' adds the per-municipality detail "
        "(sector biogas/biomethane breakdown, demographics, legacy columns) that the "
        "tooltip and panel need; those are better fetched per municipality from "
        "/municipalities/{id}/metrics than 5,571 times up front.",
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
            page_ibge = [str(r["ibge_code"]) for r in rows]
            has_provenance = _table_exists(cursor, "municipality_biomass_provenance")
            provenance = _load_biomass_provenance(cursor, page_ibge) if has_provenance else {}
            has_timeseries = _table_exists(cursor, "municipality_timeseries")
            activity_counts = _load_activity_counts(cursor, page_ibge) if has_timeseries else {}
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
        # Livestock and urban tonnage are DERIVED, not stored: PPM head counts and
        # resident population times a canonical generation factor. This is what the
        # map was missing — it read head counts straight from the *_biomass columns
        # as though they were tonnes (205M birds -> 205M t; real 9.3M). Agricultural
        # tonnage still comes from the row's columns inside the helper.
        activity = activity_counts.get(ibge_code, {})
        derived_tons, derived_prov = _derive_activity_biomass(
            head={s: activity[s] for s in _PPM_STREAMS if s in activity},
            population=activity.get("population") or raw_value(row.get("population")),
            collected_waste=activity.get("rdo_coletado"),
        )
        # provenance: agricultural (measured, from the DB table) + livestock/urban
        # (estimated, synthesised here from activity data). Coverage never comes
        # from the stored value — outside SP every column holds a seeded 0 that
        # means "never loaded", indistinguishable from a real zero. See migration 025.
        row_provenance = {**provenance.get(ibge_code, {}), **derived_prov}
        biomass_fields = derive_biomass_with_coverage(
            row,
            provenance=row_provenance,
            derived_tons=derived_tons,
            allow_reverse_fallback=_ALLOW_REVERSE_FALLBACK,
        )
        try:
            computed_metrics = compute_published_municipality_metrics(
                row, activity=activity
            )
            canonical_metrics = computed_metrics.to_flat_dict()
            published_biogas = computed_metrics.to_published_biogas_dict()
        except Exception as exc:
            canonical_failures += 1
            if first_canonical_error is None:
                first_canonical_error = f"{ibge_code}: {exc}"
            canonical_metrics = {}
            published_biogas = {}
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
            "potential_category": _cat(
                float(published_biogas.get("total_biogas_m3_year", 0.0))
            ),
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
            **published_biogas,
            **canonical_metrics,
        }
        properties.update({k: v for k, v in metric_fields.items() if v})

        # ── Trim to what the choropleth actually paints (fields=map, default) ────
        #
        # Measured on the national payload: 106 keys × 5,571 features is 15.05 MB of
        # repeated KEY NAMES against 4.13 MB of actual values, and 590k property
        # slots for the browser to allocate. Gzip hides most of the bytes, but not
        # the parse and memory cost — that is what makes pan and zoom sluggish.
        #
        # These groups are read only when a single municipality is opened (hover
        # tooltip, click popup, profile panel), so they are served per-municipality
        # from /municipalities/{id}/metrics instead of 5,571 times up front:
        #   * {sector}_biogas/_biomethane bands — 6.18 MB, 35% of the payload
        #   * demographics (population, gdp, area, density)
        #   * the legacy *_biogas_m3_year columns, which nothing on the map reads
        #   * municipality_name, a byte-for-byte duplicate of name
        #
        # Everything the map itself needs stays: per-residue tonnage and coverage
        # (residue filtering), sector tonnage (biomass-type switching), the four
        # metric scenario bands, and cluster context.
        if fields == "map":
            properties = {
                k: v
                for k, v in properties.items()
                if k not in _DETAIL_ONLY_KEYS and not _DETAIL_ONLY_RE.match(k)
            }

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
            "source_biogas_data": (
                "Request-time map_metrics.py + canonical_loader.py (DEC-008); "
                "municipalities.*_biogas_m3_year columns are legacy inputs only"
            ),
            "source_biomass_data": (
                "Stored biomass columns (agricultural: authoritative from master CSV)"
            ),
            "canonical_metrics": (
                "Properties prefixed biomass_gross_, biomass_corrected_, biogas_ch4_, biomethane_ "
                "are canonical forward-calculated 4-metric × 3-scenario values. "
                "Agricultural streams use authoritative biomass tonnage. "
                "Livestock/urban streams use request-time activity-derived biomass."
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


@router.get("/{ibge_code}/metrics")
async def get_municipality_metrics(ibge_code: str):
    """Full computed properties for ONE municipality — the detail the collection omits.

    The choropleth payload carries only what it paints (`fields=map`). Everything
    the hover tooltip and profile panel additionally show — the sector
    biogas/biomethane breakdown, demographics, legacy columns — is served here,
    one municipality at a time, instead of 5,571 times up front. That trade is
    worth roughly 6.2 MB and ~340k property slots on the initial load.

    Deliberately reuses the same derivation the collection uses (provenance,
    activity-count conversion, canonical metrics) rather than re-deriving: the
    tooltip and the polygon under it must never disagree about a municipality.
    """
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM municipalities WHERE ibge_code = %s", (ibge_code,))
            row = cursor.fetchone()
            if not row:
                cursor.close()
                raise HTTPException(status_code=404, detail=f"Municipality {ibge_code} not found")

            has_provenance = _table_exists(cursor, "municipality_biomass_provenance")
            provenance = (
                _load_biomass_provenance(cursor, [ibge_code]).get(ibge_code, {})
                if has_provenance
                else {}
            )
            has_timeseries = _table_exists(cursor, "municipality_timeseries")
            activity = (
                _load_activity_counts(cursor, [ibge_code]).get(ibge_code, {})
                if has_timeseries
                else {}
            )
            cursor.close()

        derived_tons, derived_prov = _derive_activity_biomass(
            head={s: activity[s] for s in _PPM_STREAMS if s in activity},
            population=activity.get("population") or raw_value(row.get("population")),
            collected_waste=activity.get("rdo_coletado"),
        )
        biomass_fields = derive_biomass_with_coverage(
            row,
            provenance={**provenance, **derived_prov},
            derived_tons=derived_tons,
            allow_reverse_fallback=_ALLOW_REVERSE_FALLBACK,
        )
        try:
            computed = compute_published_municipality_metrics(row, activity=activity)
            canonical = computed.to_flat_dict()
            published_biogas = computed.to_published_biogas_dict()
        except Exception as exc:
            logger.error(f"canonical metrics failed for {ibge_code}: {exc}")
            canonical = {}
            published_biogas = {}

        return {
            "ibge_code": ibge_code,
            "name": row.get("municipality_name"),
            "uf": row.get("uf"),
            "population": row.get("population"),
            "population_density": row.get("population_density"),
            "population_year": row.get("population_year"),
            "area_km2": row.get("area_km2"),
            "area_year": row.get("area_year"),
            "gdp_total": row.get("gdp_total"),
            "gdp_per_capita": row.get("gdp_per_capita"),
            "gdp_year": row.get("gdp_year"),
            "immediate_region": row.get("immediate_region"),
            "intermediate_region": row.get("intermediate_region"),
            **biomass_fields,
            **published_biogas,
            **canonical,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching municipality metrics: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching metrics: {e}")


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

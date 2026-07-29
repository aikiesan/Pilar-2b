"""
Analysis API endpoints for biogas potential calculations
"""

from enum import Enum
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query

from app.core.database import get_db
from app.services.map_metrics import (
    SECTOR_STREAMS,
    compute_published_municipality_metrics,
    load_activity_counts,
)

router = APIRouter()


def _canonical_stream_key(stream: Optional[str]) -> Optional[str]:
    """Translate legacy 2023 stream names without reading their persisted values."""
    return {"rsu_organic": "rsu", "rpo_pruning": "rpo"}.get(stream or "", stream)


def _load_canonical_municipalities() -> list[tuple[dict[str, Any], Any]]:
    """Load rows, then run the same request-time canonical route as the main map."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM municipalities")
        rows = [dict(row) for row in cursor.fetchall()]
        activity = load_activity_counts(cursor, [str(row["ibge_code"]) for row in rows])
        cursor.close()
    return [
        (
            row,
            compute_published_municipality_metrics(
                row, activity=activity.get(str(row["ibge_code"]), {})
            ),
        )
        for row in rows
    ]


class ResidueCategory(str, Enum):
    agricultural = "agricultural"
    livestock = "livestock"
    urban = "urban"
    industrial = "industrial"


# Legacy column mapping (for backward-compat with old clients that pass stream names directly)
RESIDUE_COLUMNS = {
    "agricultural": {
        "sugarcane": "sugarcane_biogas_m3_year",
        "soybean": "soybean_biogas_m3_year",
        "corn": "corn_biogas_m3_year",
        "coffee": "coffee_biogas_m3_year",
        "citrus": "citrus_biogas_m3_year",
        "_total": "agricultural_biogas_m3_year",
    },
    "livestock": {
        "cattle": "cattle_biogas_m3_year",
        "swine": "swine_biogas_m3_year",
        "poultry": "poultry_biogas_m3_year",
        "aquaculture": "aquaculture_biogas_m3_year",
        "_total": "livestock_biogas_m3_year",
    },
    "urban": {
        "rsu": "rsu_biogas_m3_year",
        "_total": "urban_biogas_m3_year",
    },
    "industrial": {
        "forestry": "forestry_biogas_m3_year",
        "_total": "forestry_biogas_m3_year",
    },
}

# Legacy name aliases only. Public values are never read from residue_streams_sp2023
# after DEC-008; the names are normalized to map_metrics stream keys.
FRONTEND_CODE_TO_STREAM: Dict[str, Optional[str]] = {
    # Agricultural — Cana (4 sub-residues all map to the sugarcane stream)
    "AG_CANA_BAGACO": "sugarcane",
    "AG_CANA_PALHA": "sugarcane",
    "AG_CANA_TORTA_FILTRO": "sugarcane",
    "AG_CANA_VINHACA": "sugarcane",
    # Agricultural — other crops
    "AG_MILHO_PALHA": "corn",
    "AG_SOJA_PALHA": "soybean",
    "AG_CITROS_BAGACO": "citrus",
    "AG_CITROS_CASCAS": "citrus",
    "AG_CITROS_POLPA": "citrus",
    "AG_CAFE_POLPA": "coffee",
    "AG_CAFE_CASCA": "coffee",
    "AG_CAFE_MUCILAGEM": "coffee",
    # Livestock
    "PEC_DEJETOS_LIQUIDOS_SUINO": "swine",
    "PEC_ESTERCO_BOVINO": "cattle",
    "PEC_CAMA_AVIARIO": "poultry",
    # Urban
    "URB_LODO_PRIMARIO": "rsu_organic",
    "URB_LODO_SECUNDARIO": "rsu_organic",
    "URB_FORSU_SEPARADA": "rsu_organic",
    # Industrial — only eucalyptus bark maps to a DB stream
    "IND_CASCA_EUCALIPTO": "forestry",
    # Industrial — no DB stream yet
    "IND_BAGACO_MALTE": None,
    "IND_TRUB_CERVEJA": None,
    "IND_SORO_LATICINIOS": None,
    "IND_RESIDUO_ABATEDOURO": None,
    "IND_VISCERAS_NAO_COMESTIVEIS": None,
    "IND_RESIDUO_PROCESSAMENTO_VEGETAL": None,
}

# Duplicate legacy alias block retained for compatibility; not a value-source map.
FRONTEND_CODE_TO_STREAM: Dict[str, Optional[str]] = {
    # Agricultural — Cana (4 sub-residues all map to the sugarcane stream)
    "AG_CANA_BAGACO": "sugarcane",
    "AG_CANA_PALHA": "sugarcane",
    "AG_CANA_TORTA_FILTRO": "sugarcane",
    "AG_CANA_VINHACA": "sugarcane",
    # Agricultural — other crops
    "AG_MILHO_PALHA": "corn",
    "AG_SOJA_PALHA": "soybean",
    "AG_CITROS_BAGACO": "citrus",
    "AG_CITROS_CASCAS": "citrus",
    "AG_CITROS_POLPA": "citrus",
    "AG_CAFE_POLPA": "coffee",
    "AG_CAFE_CASCA": "coffee",
    "AG_CAFE_MUCILAGEM": "coffee",
    # Livestock
    "PEC_DEJETOS_LIQUIDOS_SUINO": "swine",
    "PEC_ESTERCO_BOVINO": "cattle",
    "PEC_CAMA_AVIARIO": "poultry",
    # Urban
    "URB_LODO_PRIMARIO": "rsu_organic",
    "URB_LODO_SECUNDARIO": "rsu_organic",
    "URB_FORSU_SEPARADA": "rsu_organic",
    # Industrial — only eucalyptus bark maps to a DB stream
    "IND_CASCA_EUCALIPTO": "forestry",
    # Industrial — no DB stream yet
    "IND_BAGACO_MALTE": None,
    "IND_TRUB_CERVEJA": None,
    "IND_SORO_LATICINIOS": None,
    "IND_RESIDUO_ABATEDOURO": None,
    "IND_VISCERAS_NAO_COMESTIVEIS": None,
    "IND_RESIDUO_PROCESSAMENTO_VEGETAL": None,
}


@router.get("/mcda")
async def get_mcda_analysis(
    municipality_ids: Optional[List[int]] = None,
    criteria_weights: Optional[Dict[str, float]] = None,
):
    return {
        "results": [
            {
                "municipality_id": 1,
                "municipality_name": "São Paulo",
                "mcda_score": 0.85,
                "ranking": 1,
                "criteria_scores": {
                    "biomass_availability": 0.9,
                    "transportation_cost": 0.7,
                    "land_availability": 0.8,
                    "grid_proximity": 0.95,
                },
            },
            {
                "municipality_id": 2,
                "municipality_name": "Guarulhos",
                "mcda_score": 0.72,
                "ranking": 2,
                "criteria_scores": {
                    "biomass_availability": 0.8,
                    "transportation_cost": 0.6,
                    "land_availability": 0.7,
                    "grid_proximity": 0.8,
                },
            },
        ],
        "criteria_weights": criteria_weights
        or {
            "biomass_availability": 0.3,
            "transportation_cost": 0.25,
            "land_availability": 0.25,
            "grid_proximity": 0.2,
        },
        "total_analyzed": 2,
    }


@router.get("/proximity")
async def get_proximity_analysis():
    return {
        "analysis": "proximity",
        "results": [
            {
                "location": {"lat": -23.5505, "lng": -46.6333},
                "proximity_score": 0.88,
                "nearby_facilities": 12,
                "transport_cost_index": 0.7,
            }
        ],
    }


@router.post("/custom")
async def run_custom_analysis(analysis_config: Dict[str, Any]):
    return {"message": "Custom analysis completed", "config": analysis_config, "status": "success"}


@router.get("/by-residue")
async def get_analysis_by_residue(
    category: ResidueCategory = Query(...),
    residue_types: Optional[List[str]] = Query(default=None),
    limit: int = Query(default=20, le=100),
    min_value: float = Query(default=0),
):
    # DEC-008: this older ranked-list implementation still contains two legacy
    # reads below. Suppress it until it is migrated to the canonical row helper.
    raise HTTPException(
        status_code=503,
        detail="Residue ranking temporarily unavailable during methodological review (DEC-008).",
    )

    # Detect if caller passed frontend codes (AG_CANA_BAGACO style) vs legacy stream
    # keys (sugarcane)
    use_streams = bool(residue_types and any(rt in FRONTEND_CODE_TO_STREAM for rt in residue_types))

    if use_streams:
        # Resolve frontend codes → DB stream names (deduplicate, skip codes with no mapping)
        streams = list(
            {
                FRONTEND_CODE_TO_STREAM[rt]
                for rt in residue_types  # type: ignore[union-attr]
                if rt in FRONTEND_CODE_TO_STREAM and FRONTEND_CODE_TO_STREAM[rt] is not None
            }
        )
        if not streams:
            return {
                "data": [],
                "total": 0,
                "category": category.value,
                "residue_types": residue_types,
                "note": "No DB stream mapping for selected residues",
            }

        placeholders = ", ".join("%s" for _ in streams)
        sql = f"""
            SELECT
                m.id,
                m.municipality_name,
                m.ibge_code,
                m.administrative_region,
                m.population,
                m.area_km2,
                COALESCE(SUM(rs.biogas_m3_yr), 0)      AS biogas_m3_year,
                COALESCE(SUM(rs.residue_tons_yr), 0)   AS residue_tons_yr
            FROM municipalities m
            LEFT JOIN residue_streams_sp2023 rs
                ON rs.ibge_code::text = m.ibge_code::text
               AND rs.residue_stream IN ({placeholders})
            GROUP BY m.id, m.municipality_name, m.ibge_code, m.administrative_region,
                     m.population, m.area_km2
            HAVING COALESCE(SUM(rs.biogas_m3_yr), 0) >= %s
            ORDER BY biogas_m3_year DESC
            LIMIT %s
        """
        params: list = streams + [min_value, limit]

        try:
            with get_db() as conn:
                cursor = conn.cursor()
                cursor.execute(sql, params)
                rows = [dict(r) for r in cursor.fetchall()]
                cursor.close()

            results = [
                {
                    "id": row["id"],
                    "municipality_name": row["municipality_name"],
                    "ibge_code": row["ibge_code"],
                    "administrative_region": row["administrative_region"],
                    "population": row["population"],
                    "area_km2": row["area_km2"],
                    "biogas_m3_year": round(float(row["biogas_m3_year"]), 2),
                    "residue_tons_yr": round(float(row["residue_tons_yr"]), 2),
                }
                for row in rows
            ]
            return {
                "data": results,
                "total": len(results),
                "category": category.value,
                "residue_types": residue_types,
                "streams_used": streams,
            }

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=500, detail=f"Error fetching residue analysis: {str(e)}"
            )

    else:
        # Legacy path: query municipalities aggregate columns
        category_columns = RESIDUE_COLUMNS.get(category.value, {})
        if residue_types:
            columns_to_sum = [
                category_columns[rt]
                for rt in residue_types
                if rt in category_columns and rt != "_total"
            ]
            if not columns_to_sum:
                raise HTTPException(
                    status_code=400, detail=f"No valid residue types for category {category.value}"
                )
        else:
            columns_to_sum = [category_columns["_total"]]

        select_fields = (
            "id, municipality_name, ibge_code, administrative_region, population, area_km2, "
            + ", ".join(c for c in columns_to_sum if c)
        )

        try:
            with get_db() as conn:
                cursor = conn.cursor()
                cursor.execute(f"SELECT {select_fields} FROM municipalities")
                rows = [dict(r) for r in cursor.fetchall()]
                cursor.close()

            results = []
            for row in rows:
                total_biogas = sum(float(row.get(c) or 0) for c in columns_to_sum if c)
                if total_biogas >= min_value:
                    results.append(
                        {
                            "id": row.get("id"),
                            "municipality_name": row.get("municipality_name"),
                            "ibge_code": row.get("ibge_code"),
                            "administrative_region": row.get("administrative_region"),
                            "population": row.get("population"),
                            "area_km2": row.get("area_km2"),
                            "biogas_m3_year": round(total_biogas, 2),
                        }
                    )

            results.sort(key=lambda x: x["biogas_m3_year"], reverse=True)
            return {
                "data": results[:limit],
                "total": len(results),
                "category": category.value,
                "residue_types": residue_types or ["_total"],
                "columns_used": columns_to_sum,
            }

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=500, detail=f"Error fetching residue analysis: {str(e)}"
            )


@router.get("/statistics/by-category")
async def get_statistics_by_category():
    """Return request-time canonical biogas totals per sector (DEC-008)."""
    try:
        canonical_rows = _load_canonical_municipalities()
        categories: Dict[str, Any] = {}
        for sector in SECTOR_STREAMS:
            values = []
            for _, metrics in canonical_rows:
                value = sum(
                    metrics.streams[stream].biogas_m3["medio"]
                    for stream in SECTOR_STREAMS[sector]
                    if stream in metrics.streams
                )
                values.append(value)
            categories[sector] = {
                "total": round(sum(values), 2),
                "average": round(sum(values) / len(values), 2) if values else 0,
                "min": round(min(values), 2) if values else 0,
                "max": round(max(values), 2) if values else 0,
                "count": len(values),
            }

        totals = [metrics.biogas_total["medio"] for _, metrics in canonical_rows]
        categories["total"] = {
            "total": round(sum(totals), 2),
            "average": round(sum(totals) / len(totals), 2) if totals else 0,
            "min": round(min(totals), 2) if totals else 0,
            "max": round(max(totals), 2) if totals else 0,
            "count": len(totals),
        }

        return {
            "categories": categories,
            "total_municipalities": len(canonical_rows),
            "source": "map_metrics.py + canonical_loader.py (DEC-008)",
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching category statistics: {str(e)}")


@router.get("/statistics/by-stream")
async def get_statistics_by_stream(
    residue_codes: List[str] = Query(...),
):
    """Return canonical biogas potential for a set of frontend residue codes."""
    streams = list(
        {
            _canonical_stream_key(FRONTEND_CODE_TO_STREAM[code])
            for code in residue_codes
            if code in FRONTEND_CODE_TO_STREAM and FRONTEND_CODE_TO_STREAM[code] is not None
        }
    )

    if not streams:
        return {
            "total": 0.0,
            "streams": {},
            "residue_codes": residue_codes,
            "note": "No DB stream mapping for requested codes",
        }

    try:
        canonical_rows = _load_canonical_municipalities()
        stream_totals = {
            stream: round(
                sum(
                    metrics.streams[stream].biogas_m3["medio"]
                    for _, metrics in canonical_rows
                    if stream in metrics.streams
                ),
                2,
            )
            for stream in streams
        }
        stream_tons = {
            stream: round(
                sum(
                    metrics.streams[stream].biomass_gross
                    for _, metrics in canonical_rows
                    if stream in metrics.streams
                ),
                2,
            )
            for stream in streams
        }
        grand_total = sum(stream_totals.values())
        return {
            "total": round(grand_total, 2),
            "streams": stream_totals,
            "stream_tons": stream_tons,
            "residue_codes": residue_codes,
            "source": "map_metrics.py + canonical_loader.py (DEC-008)",
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching stream statistics: {str(e)}")


@router.get("/statistics/by-region")
async def get_statistics_by_region(
    category: Optional[ResidueCategory] = Query(default=None),
):
    # DEC-008: do not publish the legacy regional aggregate.
    raise HTTPException(
        status_code=503,
        detail="Regional aggregate temporarily unavailable during methodological review (DEC-008).",
    )

    col = RESIDUE_COLUMNS[category.value]["_total"] if category else "total_biogas_m3_year"
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(f"""
                SELECT administrative_region, COALESCE(SUM({col}), 0) AS biogas
                FROM municipalities
                GROUP BY administrative_region
                ORDER BY biogas DESC
            """)
            rows = cursor.fetchall()
            cursor.close()

        total = sum(float(r["biogas"] or 0) for r in rows)
        regions = [
            {
                "region": r["administrative_region"] or "Não definido",
                "biogas_m3_year": round(float(r["biogas"] or 0), 2),
                "percentage": round(float(r["biogas"] or 0) / total * 100, 2) if total > 0 else 0,
            }
            for r in rows
        ]
        return {
            "regions": regions,
            "total": round(total, 2),
            "category": category.value if category else "total",
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching regional statistics: {str(e)}")


@router.get("/distribution")
async def get_distribution(
    category: Optional[ResidueCategory] = Query(default=None),
    bins: int = Query(default=10, ge=5, le=50),
):
    # DEC-008: do not publish the legacy distribution.
    raise HTTPException(
        status_code=503,
        detail="Distribution temporarily unavailable during methodological review (DEC-008).",
    )

    col = RESIDUE_COLUMNS[category.value]["_total"] if category else "total_biogas_m3_year"
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(f"SELECT {col} AS val FROM municipalities WHERE {col} > 0")
            values = [float(r["val"]) for r in cursor.fetchall()]
            cursor.close()

        if not values:
            return {"histogram": [], "statistics": {}}

        min_val, max_val = min(values), max(values)
        bin_width = (max_val - min_val) / bins
        histogram = []
        for i in range(bins):
            b_start = min_val + i * bin_width
            b_end = min_val + (i + 1) * bin_width
            count = len(
                [
                    v
                    for v in values
                    if (b_start <= v <= b_end if i == bins - 1 else b_start <= v < b_end)
                ]
            )
            histogram.append(
                {
                    "bin_start": round(b_start, 2),
                    "bin_end": round(b_end, 2),
                    "count": count,
                    "label": f"{round(b_start/1_000_000, 2)}-{round(b_end/1_000_000, 2)}M",
                }
            )

        n = len(values)
        sorted_v = sorted(values)
        return {
            "histogram": histogram,
            "statistics": {
                "count": n,
                "min": round(min_val, 2),
                "max": round(max_val, 2),
                "mean": round(sum(values) / n, 2),
                "median": round(sorted_v[n // 2], 2),
                "std": round((sum((v - sum(values) / n) ** 2 for v in values) / n) ** 0.5, 2),
            },
            "category": category.value if category else "total",
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating distribution: {str(e)}")


@router.get("/residue-config")
async def get_residue_config():
    return {
        "categories": {
            "agricultural": {
                "label": "Agrícola",
                "icon": "Wheat",
                "residues": [
                    {
                        "key": "sugarcane",
                        "label": "Cana-de-açúcar",
                        "column": "sugarcane_biogas_m3_year",
                    },
                    {"key": "soybean", "label": "Soja", "column": "soybean_biogas_m3_year"},
                    {"key": "corn", "label": "Milho", "column": "corn_biogas_m3_year"},
                    {"key": "coffee", "label": "Café", "column": "coffee_biogas_m3_year"},
                    {"key": "citrus", "label": "Citros", "column": "citrus_biogas_m3_year"},
                ],
            },
            "livestock": {
                "label": "Pecuário",
                "icon": "Beef",
                "residues": [
                    {"key": "cattle", "label": "Bovinos", "column": "cattle_biogas_m3_year"},
                    {"key": "swine", "label": "Suínos", "column": "swine_biogas_m3_year"},
                    {"key": "poultry", "label": "Aves", "column": "poultry_biogas_m3_year"},
                    {
                        "key": "aquaculture",
                        "label": "Piscicultura",
                        "column": "aquaculture_biogas_m3_year",
                    },
                ],
            },
            "urban": {
                "label": "Urbano",
                "icon": "Building2",
                "residues": [
                    {
                        "key": "rsu",
                        "label": "RSU (Resíduos Sólidos)",
                        "column": "rsu_biogas_m3_year",
                    },
                ],
            },
        }
    }

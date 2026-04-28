"""
Analysis API endpoints for biogas potential calculations
"""
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional, Dict, Any
from enum import Enum

from app.core.database import get_db

router = APIRouter()


class ResidueCategory(str, Enum):
    agricultural = "agricultural"
    livestock    = "livestock"
    urban        = "urban"


RESIDUE_COLUMNS = {
    "agricultural": {
        "sugarcane": "sugarcane_biogas_m3_year",
        "soybean":   "soybean_biogas_m3_year",
        "corn":      "corn_biogas_m3_year",
        "coffee":    "coffee_biogas_m3_year",
        "citrus":    "citrus_biogas_m3_year",
        "_total":    "agricultural_biogas_m3_year",
    },
    "livestock": {
        "cattle":      "cattle_biogas_m3_year",
        "swine":       "swine_biogas_m3_year",
        "poultry":     "poultry_biogas_m3_year",
        "aquaculture": "aquaculture_biogas_m3_year",
        "_total":      "livestock_biogas_m3_year",
    },
    "urban": {
        "rsu":    "rsu_biogas_m3_year",
        "rpo":    "rpo_biogas_m3_year",
        "_total": "urban_biogas_m3_year",
    },
}


@router.get("/mcda")
async def get_mcda_analysis(
    municipality_ids: Optional[List[int]] = None,
    criteria_weights: Optional[Dict[str, float]] = None,
):
    return {
        "results": [
            {"municipality_id": 1, "municipality_name": "São Paulo", "mcda_score": 0.85, "ranking": 1,
             "criteria_scores": {"biomass_availability": 0.9, "transportation_cost": 0.7, "land_availability": 0.8, "grid_proximity": 0.95}},
            {"municipality_id": 2, "municipality_name": "Guarulhos", "mcda_score": 0.72, "ranking": 2,
             "criteria_scores": {"biomass_availability": 0.8, "transportation_cost": 0.6, "land_availability": 0.7, "grid_proximity": 0.8}},
        ],
        "criteria_weights": criteria_weights or {
            "biomass_availability": 0.3, "transportation_cost": 0.25,
            "land_availability": 0.25, "grid_proximity": 0.2,
        },
        "total_analyzed": 2,
    }


@router.get("/proximity")
async def get_proximity_analysis():
    return {
        "analysis": "proximity",
        "results": [{"location": {"lat": -23.5505, "lng": -46.6333}, "proximity_score": 0.88,
                      "nearby_facilities": 12, "transport_cost_index": 0.7}],
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
    category_columns = RESIDUE_COLUMNS.get(category.value, {})

    if residue_types:
        columns_to_sum = [category_columns[rt] for rt in residue_types if rt in category_columns and rt != "_total"]
        if not columns_to_sum:
            raise HTTPException(status_code=400, detail=f"No valid residue types for category {category.value}")
    else:
        columns_to_sum = [category_columns["_total"]]

    select_fields = "id, municipality_name, ibge_code, administrative_region, population, area_km2, " + \
                    ", ".join(c for c in columns_to_sum if c)

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
                results.append({
                    "id": row.get("id"),
                    "municipality_name": row.get("municipality_name"),
                    "ibge_code": row.get("ibge_code"),
                    "administrative_region": row.get("administrative_region"),
                    "population": row.get("population"),
                    "area_km2": row.get("area_km2"),
                    "biogas_m3_year": round(total_biogas, 2),
                })

        results.sort(key=lambda x: x["biogas_m3_year"], reverse=True)
        return {"data": results[:limit], "total": len(results), "category": category.value,
                "residue_types": residue_types or ["_total"], "columns_used": columns_to_sum}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching residue analysis: {str(e)}")


@router.get("/statistics/by-category")
async def get_statistics_by_category():
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT
                    COALESCE(SUM(agricultural_biogas_m3_year), 0) AS agricultural,
                    COALESCE(SUM(livestock_biogas_m3_year), 0)    AS livestock,
                    COALESCE(SUM(urban_biogas_m3_year), 0)        AS urban,
                    COALESCE(SUM(total_biogas_m3_year), 0)        AS total,
                    COUNT(*)                                       AS n
                FROM municipalities
            """)
            row = cursor.fetchone()
            cursor.close()

        n = int(row["n"] or 0)

        def _stats(val_sum):
            return {"total": round(float(val_sum or 0), 2), "average": 0, "min": 0, "max": 0, "count": n}

        return {
            "categories": {
                "agricultural": _stats(row["agricultural"]),
                "livestock":    _stats(row["livestock"]),
                "urban":        _stats(row["urban"]),
                "total":        _stats(row["total"]),
            },
            "total_municipalities": n,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching category statistics: {str(e)}")


@router.get("/statistics/by-region")
async def get_statistics_by_region(
    category: Optional[ResidueCategory] = Query(default=None),
):
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
        return {"regions": regions, "total": round(total, 2), "category": category.value if category else "total"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching regional statistics: {str(e)}")


@router.get("/distribution")
async def get_distribution(
    category: Optional[ResidueCategory] = Query(default=None),
    bins: int = Query(default=10, ge=5, le=50),
):
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
            b_end   = min_val + (i + 1) * bin_width
            count = len([v for v in values if (b_start <= v <= b_end if i == bins - 1 else b_start <= v < b_end)])
            histogram.append({
                "bin_start": round(b_start, 2), "bin_end": round(b_end, 2), "count": count,
                "label": f"{round(b_start/1_000_000, 2)}-{round(b_end/1_000_000, 2)}M",
            })

        n = len(values)
        sorted_v = sorted(values)
        return {
            "histogram": histogram,
            "statistics": {
                "count": n, "min": round(min_val, 2), "max": round(max_val, 2),
                "mean": round(sum(values) / n, 2), "median": round(sorted_v[n // 2], 2),
                "std": round((sum((v - sum(values)/n)**2 for v in values) / n) ** 0.5, 2),
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
                "label": "Agrícola", "icon": "Wheat",
                "residues": [
                    {"key": "sugarcane", "label": "Cana-de-açúcar", "column": "sugarcane_biogas_m3_year"},
                    {"key": "soybean",   "label": "Soja",           "column": "soybean_biogas_m3_year"},
                    {"key": "corn",      "label": "Milho",           "column": "corn_biogas_m3_year"},
                    {"key": "coffee",    "label": "Café",            "column": "coffee_biogas_m3_year"},
                    {"key": "citrus",    "label": "Citros",          "column": "citrus_biogas_m3_year"},
                ],
            },
            "livestock": {
                "label": "Pecuário", "icon": "Beef",
                "residues": [
                    {"key": "cattle",      "label": "Bovinos",      "column": "cattle_biogas_m3_year"},
                    {"key": "swine",       "label": "Suínos",       "column": "swine_biogas_m3_year"},
                    {"key": "poultry",     "label": "Aves",         "column": "poultry_biogas_m3_year"},
                    {"key": "aquaculture", "label": "Piscicultura", "column": "aquaculture_biogas_m3_year"},
                ],
            },
            "urban": {
                "label": "Urbano", "icon": "Building2",
                "residues": [
                    {"key": "rsu", "label": "RSU (Resíduos Sólidos)", "column": "rsu_biogas_m3_year"},
                    {"key": "rpo", "label": "Resíduos Orgânicos",     "column": "rpo_biogas_m3_year"},
                ],
            },
        }
    }

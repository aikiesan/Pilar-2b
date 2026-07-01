"""
PILAR-2b V3 - Statistics API Endpoint
"""

import logging
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException

from app.core.database import get_db
from app.middleware.auth import require_authenticated
from app.models.auth import UserProfile

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/summary")
async def get_summary_statistics() -> Dict[str, Any]:
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT
                    COUNT(*)                                              AS total_municipalities,
                    COUNT(*) FILTER (WHERE total_biogas_m3_year > 0)
                        AS municipalities_with_data,
                    COALESCE(SUM(total_biogas_m3_year), 0)               AS total_biogas,
                    COALESCE(SUM(energy_potential_mwh_year), 0)          AS total_energy,
                    COALESCE(SUM(co2_reduction_tons_year), 0)            AS total_co2,
                    COALESCE(SUM(population), 0)                         AS total_population,
                    COALESCE(SUM(urban_biogas_m3_year), 0)               AS total_urban,
                    COALESCE(SUM(agricultural_biogas_m3_year), 0)        AS total_agricultural,
                    COALESCE(SUM(livestock_biogas_m3_year), 0)           AS total_livestock
                FROM municipalities
            """)
            row = cursor.fetchone()
            cursor.close()

        n = int(row["total_municipalities"] or 0)
        total_biogas = float(row["total_biogas"] or 0)
        total_urban = float(row["total_urban"] or 0)
        total_agri = float(row["total_agricultural"] or 0)
        total_live = float(row["total_livestock"] or 0)

        def _pct(val):
            return round(val / total_biogas * 100, 2) if total_biogas > 0 else 0

        return {
            "total_municipalities": n,
            "municipalities_with_biogas_data": int(row["municipalities_with_data"] or 0),
            "total_biogas_m3_year": round(total_biogas, 2),
            "total_energy_mwh_year": round(float(row["total_energy"] or 0), 2),
            "total_co2_reduction_tons_year": round(float(row["total_co2"] or 0), 2),
            "total_population": int(row["total_population"] or 0),
            "average_biogas_m3_year": round(total_biogas / n, 2) if n > 0 else 0,
            "by_category": {
                "urban": {"total_m3_year": round(total_urban, 2), "percentage": _pct(total_urban)},
                "agricultural": {
                    "total_m3_year": round(total_agri, 2),
                    "percentage": _pct(total_agri),
                },
                "livestock": {
                    "total_m3_year": round(total_live, 2),
                    "percentage": _pct(total_live),
                },
            },
            "metadata": {
                "source": "Local PostgreSQL",
                "note": "Statistics for São Paulo State municipalities",
            },
        }

    except Exception as e:
        logger.error(f"Failed to fetch summary statistics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch summary statistics: {str(e)}")


@router.get("/category/{category}")
async def get_category_statistics(
    category: str,
    current_user: UserProfile = Depends(require_authenticated),
) -> Dict[str, Any]:
    category_columns = {
        "urban": "urban_biogas_m3_year",
        "agricultural": "agricultural_biogas_m3_year",
        "livestock": "livestock_biogas_m3_year",
    }
    if category not in category_columns:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid category. Must be one of: {', '.join(category_columns)}",
        )

    col = category_columns[category]
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(f"""
                SELECT
                    COUNT(*) FILTER (WHERE {col} > 0)                  AS count,
                    COALESCE(SUM({col}), 0)                             AS total,
                    COALESCE(AVG({col}), 0)                             AS avg,
                    COALESCE(MAX({col}), 0)                             AS maximum,
                    COALESCE(MIN({col}) FILTER (WHERE {col} > 0), 0)   AS minimum
                FROM municipalities
            """)
            row = cursor.fetchone()
            cursor.close()

        return {
            "category": category,
            "municipalities_with_data": int(row["count"] or 0),
            "total_m3_year": round(float(row["total"] or 0), 2),
            "average_m3_year": round(float(row["avg"] or 0), 2),
            "max_m3_year": round(float(row["maximum"] or 0), 2),
            "min_m3_year": round(float(row["minimum"] or 0), 2),
        }

    except Exception as e:
        logger.error(f"Failed to fetch category statistics: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch category statistics: {str(e)}"
        )

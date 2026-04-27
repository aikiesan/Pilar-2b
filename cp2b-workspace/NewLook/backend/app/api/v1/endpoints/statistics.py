"""
PILAR-2b V3 - Statistics API Endpoint
Provides summary statistics for municipalities and biogas potential
"""

from fastapi import APIRouter, HTTPException, Depends
import logging
from typing import Dict, Any

from app.services.supabase_client import get_supabase_client
from app.middleware.auth import require_authenticated
from app.models.auth import UserProfile

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get(
    "/summary",
    summary="Get Summary Statistics",
    description="Get summary statistics for all municipalities including biogas potential"
)
async def get_summary_statistics() -> Dict[str, Any]:
    """
    Get summary statistics for the entire dataset.
    """
    try:
        supabase = get_supabase_client()
        result = supabase.table("municipalities").select(
            "total_biogas_m3_year, energy_potential_mwh_year, co2_reduction_tons_year, "
            "population, urban_biogas_m3_year, agricultural_biogas_m3_year, livestock_biogas_m3_year"
        ).execute()

        rows = result.data or []

        total_biogas = 0.0
        total_energy = 0.0
        total_co2 = 0.0
        total_population = 0
        total_urban = 0.0
        total_agricultural = 0.0
        total_livestock = 0.0
        municipalities_with_data = 0

        for row in rows:
            b = float(row.get("total_biogas_m3_year") or 0)
            total_biogas += b
            total_energy += float(row.get("energy_potential_mwh_year") or 0)
            total_co2 += float(row.get("co2_reduction_tons_year") or 0)
            total_population += int(row.get("population") or 0)
            total_urban += float(row.get("urban_biogas_m3_year") or 0)
            total_agricultural += float(row.get("agricultural_biogas_m3_year") or 0)
            total_livestock += float(row.get("livestock_biogas_m3_year") or 0)
            if b > 0:
                municipalities_with_data += 1

        total_municipalities = len(rows)
        avg_biogas = total_biogas / total_municipalities if total_municipalities > 0 else 0.0
        urban_pct = (total_urban / total_biogas * 100) if total_biogas > 0 else 0
        agri_pct = (total_agricultural / total_biogas * 100) if total_biogas > 0 else 0
        live_pct = (total_livestock / total_biogas * 100) if total_biogas > 0 else 0

        return {
            "total_municipalities": total_municipalities,
            "municipalities_with_biogas_data": municipalities_with_data,
            "total_biogas_m3_year": round(total_biogas, 2),
            "total_energy_mwh_year": round(total_energy, 2),
            "total_co2_reduction_tons_year": round(total_co2, 2),
            "total_population": total_population,
            "average_biogas_m3_year": round(avg_biogas, 2),
            "by_category": {
                "urban": {
                    "total_m3_year": round(total_urban, 2),
                    "percentage": round(urban_pct, 2)
                },
                "agricultural": {
                    "total_m3_year": round(total_agricultural, 2),
                    "percentage": round(agri_pct, 2)
                },
                "livestock": {
                    "total_m3_year": round(total_livestock, 2),
                    "percentage": round(live_pct, 2)
                }
            },
            "metadata": {
                "source": "Supabase REST API",
                "note": "Statistics for São Paulo State municipalities"
            }
        }

    except Exception as e:
        logger.error(f"Failed to fetch summary statistics: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch summary statistics: {str(e)}"
        )


@router.get(
    "/category/{category}",
    summary="Get Category Statistics",
    description="Get detailed statistics for a specific biogas category (requires authentication)"
)
async def get_category_statistics(
    category: str,
    current_user: UserProfile = Depends(require_authenticated)
) -> Dict[str, Any]:
    """
    Get statistics for a specific biogas category (requires authentication).
    """
    category_columns = {
        "urban": "urban_biogas_m3_year",
        "agricultural": "agricultural_biogas_m3_year",
        "livestock": "livestock_biogas_m3_year"
    }

    if category not in category_columns:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid category. Must be one of: {', '.join(category_columns.keys())}"
        )

    column_name = category_columns[category]

    try:
        supabase = get_supabase_client()
        result = supabase.table("municipalities").select(column_name).execute()
        rows = result.data or []

        values = [float(r.get(column_name) or 0) for r in rows]
        positive = [v for v in values if v > 0]

        total = sum(values)
        count = len(positive)
        avg = total / len(values) if values else 0.0
        maximum = max(positive) if positive else 0.0
        minimum = min(positive) if positive else 0.0

        return {
            "category": category,
            "municipalities_with_data": count,
            "total_m3_year": round(total, 2),
            "average_m3_year": round(avg, 2),
            "max_m3_year": round(maximum, 2),
            "min_m3_year": round(minimum, 2)
        }

    except Exception as e:
        logger.error(f"Failed to fetch category statistics: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch category statistics: {str(e)}"
        )

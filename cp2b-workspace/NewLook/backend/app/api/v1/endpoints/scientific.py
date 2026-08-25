import json
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException

from app.core.database import get_db

router = APIRouter()
logger = logging.getLogger(__name__)


def safe_float(value, default=0.0):
    """
    Safely convert a value to float, handling strings with units or ranges.
    Examples: "35", "35-37", "mesophilic 35-37°C" -> 35.0
    """
    if value is None:
        return default

    # If already a number, return it
    if isinstance(value, (int, float)):
        return float(value)

    # Convert to string and extract first number
    try:
        import re

        value_str = str(value)
        # Find first number (integer or decimal) in the string
        match = re.search(r"(\d+\.?\d*)", value_str)
        if match:
            return float(match.group(1))
        return default
    except (ValueError, TypeError, AttributeError):
        return default


def safe_int(value, default=0):
    """Safely convert a value to int, handling non-numeric values."""
    try:
        if value is None:
            return default
        if isinstance(value, (int, float)):
            return int(value)
        return int(float(str(value)))
    except (ValueError, TypeError):
        return default


@router.get("/kinetics")
async def get_kinetics(sector_codigo: Optional[str] = None, classification: Optional[str] = None):
    """
    Get kinetic parameters for residues (Methane Production Curves).

    Returns data derived from the 'kinetics' JSONB column in the residues table,
    joined with references.
    """
    try:
        with get_db() as conn:
            cursor = conn.cursor()

            # Base query
            query = """
                SELECT
                    r.id as residue_id,
                    r.nome as residue_name,
                    r.sector_codigo as sector,
                    r.bmp_medio as bmp_experimental,
                    r.kinetics,

                    -- Aggregated references
                    COALESCE(
                        (
                            SELECT array_agg(
                                DISTINCT CONCAT(sr.authors, ' (', sr.publication_year::text, ')')
                            )
                            FROM scientific_references sr
                            WHERE sr.primary_residue = r.codigo
                        ),
                        ARRAY[]::text[]
                    ) as references_list

                FROM residuos r
                WHERE r.kinetics IS NOT NULL
            """

            params = []

            if sector_codigo:
                query += " AND r.sector_codigo = %s"
                params.append(sector_codigo)

            # Note: filtering by classification inside JSONB requires specific operator
            if classification:
                query += " AND r.kinetics->>'classification' = %s"
                params.append(classification)

            query += " ORDER BY r.nome"

            cursor.execute(query, params)
            rows = cursor.fetchall()

            results = []
            for row in rows:
                # RealDictCursor returns dict-like objects
                row_dict = dict(row)
                kinetics_data = row_dict.get("kinetics")

                # If kinetics is null (shouldn't be due to WHERE clause) or empty string
                if not kinetics_data:
                    continue

                # Ensure kinetics is a dict (psycopg2 usually handles JSONB auto-conversion)
                if isinstance(kinetics_data, str):
                    try:
                        kinetics_data = json.loads(kinetics_data)
                    except json.JSONDecodeError:
                        logger.error(
                            f"Failed to parse kinetics JSON for residue {row_dict['residue_id']}"
                        )
                        continue

                # Map to frontend interface
                # Default values provided if missing in JSON
                # Use safe_float/safe_int to handle string values in database
                mapped_item = {
                    "residue_id": row_dict["residue_id"],
                    "residue_name": row_dict["residue_name"],
                    "sector": row_dict["sector"],
                    # Kinetic Constants
                    "k_slow": safe_float(kinetics_data.get("k_slow"), 0.05),
                    "k_med": safe_float(kinetics_data.get("k_med"), 0.5),
                    "k_fast": safe_float(kinetics_data.get("k_fast"), 5.0),
                    # Fractions
                    "f_slow": safe_float(kinetics_data.get("f_slow"), 0),
                    "f_med": safe_float(kinetics_data.get("f_med"), 0),
                    "f_fast": safe_float(kinetics_data.get("f_fast"), 0),
                    "fq": safe_float(kinetics_data.get("FQ", kinetics_data.get("fq")), 0.95),
                    "classification": kinetics_data.get("classification", "medium"),
                    # BMP
                    "bmp_experimental": safe_float(row_dict["bmp_experimental"], 0),
                    "bmp_simulated": safe_float(
                        kinetics_data.get("bmp_simulated", row_dict["bmp_experimental"]), 0
                    ),
                    # Test Parameters
                    "t50": safe_int(kinetics_data.get("t50"), 0),
                    "t80": safe_int(kinetics_data.get("t80"), 0),
                    "test_standard": kinetics_data.get("test_standard", "VDI 4630"),
                    "temperature": safe_float(kinetics_data.get("temperature"), 35),
                    "retention_time": safe_float(kinetics_data.get("retention_time"), 30),
                    "references": row_dict["references_list"],
                }
                results.append(mapped_item)

            return {"success": True, "count": len(results), "data": results}

    except Exception as e:
        logger.error(f"Error fetching kinetics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

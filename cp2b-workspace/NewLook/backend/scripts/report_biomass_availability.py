"""
Read-only biomass availability coverage report.

Run from backend/ or the backend Docker container:
    python scripts/report_biomass_availability.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.database import get_db  # noqa: E402
from app.services.biomass_availability import (  # noqa: E402
    RESIDUE_BIOMASS_CONFIGS,
    derive_biomass_fields,
)


def main() -> None:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM municipalities WHERE geometry IS NOT NULL")
        rows = [dict(row) for row in cursor.fetchall()]
        cursor.close()

    residue_stats = {
        config.key: {"nonzero_municipalities": 0, "total_tons_year": 0.0, "max_tons_year": 0.0}
        for config in RESIDUE_BIOMASS_CONFIGS
    }
    top_municipalities: list[dict] = []

    for row in rows:
        biomass = derive_biomass_fields(row)
        total = biomass["total_biomass_tons_year"]
        if total > 0:
            top_municipalities.append(
                {
                    "ibge_code": row.get("ibge_code"),
                    "name": row.get("municipality_name"),
                    "total_biomass_tons_year": round(total, 2),
                }
            )

        for config in RESIDUE_BIOMASS_CONFIGS:
            value = biomass[config.biomass_field]
            stats = residue_stats[config.key]
            if value > 0:
                stats["nonzero_municipalities"] += 1
            stats["total_tons_year"] += value
            stats["max_tons_year"] = max(stats["max_tons_year"], value)

    top_municipalities.sort(key=lambda item: item["total_biomass_tons_year"], reverse=True)
    report = {
        "municipality_count": len(rows),
        "nonzero_total_biomass_municipalities": sum(
            1 for row in rows if derive_biomass_fields(row)["total_biomass_tons_year"] > 0
        ),
        "total_biomass_tons_year": round(
            sum(derive_biomass_fields(row)["total_biomass_tons_year"] for row in rows),
            2,
        ),
        "residues": {
            key: {
                "nonzero_municipalities": value["nonzero_municipalities"],
                "total_tons_year": round(value["total_tons_year"], 2),
                "max_tons_year": round(value["max_tons_year"], 2),
            }
            for key, value in residue_stats.items()
        },
        "top_municipalities": top_municipalities[:10],
        "method": "Stored biomass columns when non-zero; otherwise reverse-BMP fallback from municipality biogas fields.",
    }

    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

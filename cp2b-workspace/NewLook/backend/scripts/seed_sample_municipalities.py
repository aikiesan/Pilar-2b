import json
import os
import sys
from pathlib import Path

import psycopg2

# Add backend to path to import settings
sys.path.insert(0, str(Path(__file__).parent))
from app.core.config import settings


def seed_data():
    sample_file = "data/sample_municipalities.json"
    if not os.path.exists(sample_file):
        print(f"Error: {sample_file} not found")
        return

    with open(sample_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    features = data.get("features", [])
    print(f"Found {len(features)} municipalities in sample file")

    conn = psycopg2.connect(settings.DATABASE_URL)
    cur = conn.cursor()

    for feature in features:
        p = feature["properties"]
        ibge_code = str(p["ibge_code"])
        name = p["name"]

        cur.execute(
            """
            INSERT INTO municipalities (
                ibge_code, municipality_name, area_km2, population, 
                total_biogas_m3_year, agricultural_biogas_m3_year, 
                livestock_biogas_m3_year, urban_biogas_m3_year,
                immediate_region, intermediate_region,
                immediate_region_code, intermediate_region_code
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (ibge_code) DO UPDATE SET
                total_biogas_m3_year = EXCLUDED.total_biogas_m3_year,
                population = EXCLUDED.population
        """,
            (
                ibge_code,
                name,
                p.get("area_km2"),
                p.get("population"),
                p.get("total_biogas_m3_year"),
                p.get("agricultural_biogas_m3_year"),
                p.get("livestock_biogas_m3_year"),
                p.get("urban_biogas_m3_year"),
                p.get("immediate_region"),
                p.get("intermediate_region"),
                p.get("immediate_region_code"),
                p.get("intermediate_region_code"),
            ),
        )

    conn.commit()
    cur.close()
    conn.close()
    print(f"Successfully seeded {len(features)} municipalities")


if __name__ == "__main__":
    seed_data()

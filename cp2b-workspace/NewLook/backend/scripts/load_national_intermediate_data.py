"""
load_national_intermediate_data.py
====================================
Loads 133 IBGE intermediate regions into the `intermediate_regions` table.

Steps:
  1. Reads centroids CSV: data/shapefiles/brazil/br_intermediary_regions_centroids.csv
  2. For all municipalities that have an intermediate_region field, aggregates
     biogas + biomass totals by intermediate_region name.
  3. For SP regions (state_code='35'), matches aggregated data to region rows.
  4. Non-SP regions get skeleton rows (0 values) awaiting national data.
  5. Upserts all 133 rows via INSERT ... ON CONFLICT DO UPDATE.

Prerequisites:
  - Run migration 007_intermediate_regions.sql first:
      psql -U <user> -d <dbname> -f backend/migrations/007_intermediate_regions.sql
  - DATABASE_URL must point to local PostgreSQL.

Usage (from backend/ directory):
  python scripts/load_national_intermediate_data.py

  # Dry run (no writes):
  DRY_RUN=true python scripts/load_national_intermediate_data.py
"""

import csv
import logging
import os
import sys
import unicodedata
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

CENTROIDS_CSV = str(
    Path(__file__).parent.parent
    / "data"
    / "shapefiles"
    / "brazil"
    / "br_intermediary_regions_centroids.csv"
)
LOG_FILE = str(Path(__file__).parent / "intermediate_regions_load_log.csv")
DRY_RUN = os.environ.get("DRY_RUN", "false").lower() == "true"

SP_STATE_CODE = "35"

BIOGAS_COLS = [
    "total_biogas_m3_year",
    "agricultural_biogas_m3_year",
    "livestock_biogas_m3_year",
    "urban_biogas_m3_year",
    "sugarcane_biogas_m3_year",
    "soybean_biogas_m3_year",
    "corn_biogas_m3_year",
    "coffee_biogas_m3_year",
    "citrus_biogas_m3_year",
    "cattle_biogas_m3_year",
    "swine_biogas_m3_year",
    "poultry_biogas_m3_year",
    "aquaculture_biogas_m3_year",
    "rsu_biogas_m3_year",
    "rpo_biogas_m3_year",
]
BIOMASS_COLS = [
    "total_biomass_tons_year",
    "agricultural_biomass_tons_year",
    "livestock_biomass_tons_year",
    "urban_biomass_tons_year",
    "sugarcane_biomass_tons_year",
    "soybean_biomass_tons_year",
    "corn_biomass_tons_year",
    "coffee_biomass_tons_year",
    "citrus_biomass_tons_year",
    "cattle_biomass_tons_year",
    "swine_biomass_tons_year",
    "poultry_biomass_tons_year",
    "aquaculture_biomass_tons_year",
    "rsu_biomass_tons_year",
    "rpo_biomass_tons_year",
]
ALL_NUMERIC_COLS = BIOGAS_COLS + BIOMASS_COLS


def normalize(name: str) -> str:
    nfkd = unicodedata.normalize("NFKD", name)
    return nfkd.encode("ASCII", "ignore").decode("ASCII").strip().lower()


def load_centroids(csv_path: str) -> list[dict]:
    if not Path(csv_path).exists():
        logger.error(f"Centroids CSV not found: {csv_path}")
        sys.exit(1)
    regions = []
    with open(csv_path, encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            regions.append(
                {
                    "ibge_code": str(row["cd_rgint"]).strip(),
                    "name": row["nm_rgint"].strip(),
                    "state_code": str(row["cd_uf"]).strip(),
                    "centroid_lat": float(row["centroid_lat"]),
                    "centroid_lng": float(row["centroid_lng"]),
                }
            )
    logger.info(f"Loaded {len(regions)} regions from CSV")
    return regions


def aggregate_municipalities(conn) -> dict[str, dict]:
    """
    Aggregate biogas + biomass from municipalities table grouped by
    intermediate_region name. Returns {normalized_name: {col: value, ...}}.
    """
    select_cols = ", ".join(
        [f"COALESCE({c}, 0)" for c in ALL_NUMERIC_COLS]
        + [
            "intermediate_region",
            "COALESCE(population, 0) as population",
            "COALESCE(area_km2, 0) as area_km2",
        ]
    )
    cursor = conn.cursor()
    cursor.execute(
        f"SELECT {select_cols} FROM municipalities WHERE intermediate_region IS NOT NULL"
    )
    rows = cursor.fetchall()
    cursor.close()

    logger.info(f"Fetched {len(rows)} municipalities with intermediate_region set")

    aggregated: dict[str, dict] = {}
    for row in rows:
        region_name = (row.get("intermediate_region") or "").strip()
        if not region_name:
            continue
        key = normalize(region_name)

        if key not in aggregated:
            aggregated[key] = {col: 0.0 for col in ALL_NUMERIC_COLS}
            aggregated[key]["municipality_count"] = 0
            aggregated[key]["population"] = 0
            aggregated[key]["area_km2"] = 0.0

        agg = aggregated[key]
        agg["municipality_count"] += 1
        for col in ALL_NUMERIC_COLS:
            agg[col] = round(agg[col] + float(row.get(col) or 0), 2)
        agg["population"] += int(row.get("population") or 0)
        agg["area_km2"] = round(agg["area_km2"] + float(row.get("area_km2") or 0), 2)

    logger.info(f"Aggregated into {len(aggregated)} intermediate region groups")
    return aggregated


def build_upsert_rows(
    regions: list[dict], aggregated: dict[str, dict]
) -> tuple[list[dict], list[dict]]:
    """Match centroids to aggregated data. Returns (rows_to_upsert, log_rows)."""
    rows, log = [], []

    for region in regions:
        ibge_code = region["ibge_code"]
        name = region["name"]
        state_code = region["state_code"]

        row: dict = {
            "ibge_code": ibge_code,
            "name": name,
            "state_code": state_code,
            "centroid_lat": region["centroid_lat"],
            "centroid_lng": region["centroid_lng"],
            "data_source": "skeleton_awaiting_national_data",
        }

        # Try exact then normalized name match
        agg = aggregated.get(name.lower()) or aggregated.get(normalize(name))
        if agg:
            row.update({k: v for k, v in agg.items()})
            row["data_source"] = "aggregated_from_municipalities"
            log.append(
                {
                    "ibge_code": ibge_code,
                    "name": name,
                    "status": "matched",
                    "municipalities": agg["municipality_count"],
                    "total_biogas_m3_year": agg["total_biogas_m3_year"],
                }
            )
        else:
            status = "sp_no_match" if state_code == SP_STATE_CODE else "skeleton"
            if state_code == SP_STATE_CODE:
                logger.warning(f"SP region not matched in municipalities: '{name}'")
            log.append(
                {
                    "ibge_code": ibge_code,
                    "name": name,
                    "status": status,
                    "municipalities": 0,
                    "total_biogas_m3_year": 0,
                }
            )

        rows.append(row)

    return rows, log


def upsert_rows(conn, rows: list[dict]):
    """
    Batch upsert into intermediate_regions using INSERT ... ON CONFLICT DO UPDATE.
    Uses psycopg2 executemany for efficiency.
    """
    all_cols = [
        "ibge_code",
        "name",
        "state_code",
        "centroid_lat",
        "centroid_lng",
        "data_source",
        "municipality_count",
        "population",
        "area_km2",
    ] + ALL_NUMERIC_COLS

    placeholders = ", ".join(["%s"] * len(all_cols))
    col_list = ", ".join(all_cols)
    update_set = ", ".join(f"{c} = EXCLUDED.{c}" for c in all_cols if c != "ibge_code")

    sql = f"""
        INSERT INTO intermediate_regions ({col_list})
        VALUES ({placeholders})
        ON CONFLICT (ibge_code) DO UPDATE SET {update_set}
    """

    cursor = conn.cursor()
    BATCH = 50
    total = 0
    for i in range(0, len(rows), BATCH):
        batch = rows[i : i + BATCH]
        values = [
            tuple(
                (
                    row.get(c, 0)
                    if c not in ("ibge_code", "name", "state_code", "data_source")
                    else row.get(c, "")
                )
                for c in all_cols
            )
            for row in batch
        ]
        cursor.executemany(sql, values)
        conn.commit()
        total += len(batch)
        logger.info(f"Upserted {total}/{len(rows)} rows")

    cursor.close()


def main():
    from app.core.database import get_db, get_db_transaction

    regions = load_centroids(CENTROIDS_CSV)

    with get_db() as conn:
        aggregated = aggregate_municipalities(conn)

    rows, log = build_upsert_rows(regions, aggregated)

    # Write log regardless of dry-run
    with open(LOG_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f, fieldnames=["ibge_code", "name", "status", "municipalities", "total_biogas_m3_year"]
        )
        writer.writeheader()
        writer.writerows(log)
    logger.info(f"Log → {LOG_FILE}")

    matched = sum(1 for r in log if r["status"] == "matched")
    skeletons = sum(1 for r in log if r["status"] == "skeleton")
    unmatched = sum(1 for r in log if r["status"] == "sp_no_match")

    if DRY_RUN:
        logger.info(f"[DRY RUN] Would upsert {len(rows)} rows — no writes performed.")
        logger.info(f"  Matched (have data): {matched}")
        logger.info(f"  Non-SP skeletons:    {skeletons}")
        logger.info(f"  SP unmatched:        {unmatched}")
        return

    with get_db_transaction() as conn:
        upsert_rows(conn, rows)

    logger.info("=" * 60)
    logger.info(f"Done. {len(rows)} rows upserted into intermediate_regions.")
    logger.info(f"  With data:    {matched}")
    logger.info(f"  Skeletons:    {skeletons}")
    logger.info(f"  SP unmatched: {unmatched} (check log)")
    logger.info("Next: run br_intermediary_regions_distances.sql against local PostgreSQL.")


if __name__ == "__main__":
    main()

"""
load_national_intermediate_data.py
====================================
Loads 133 IBGE intermediate regions into the `intermediate_regions` table.

Steps:
  1. Reads centroids CSV: data/shapefiles/brazil/br_intermediary_regions_centroids.csv
  2. For SP regions (state_code='35'), aggregates biogas + biomass totals
     from the `municipalities` table (intermediate_region column).
  3. For all other states, inserts geographic skeleton rows with 0 biogas/biomass
     (to be filled when national PAM/livestock data is loaded in future sprints).
  4. Logs a summary CSV (intermediate_regions_load_log.csv) next to this script.

Prerequisites:
  - Run migration 007_intermediate_regions.sql in Supabase first.
  - Run migration br_intermediary_regions_distances.sql to load the distance matrix.
  - Supabase env vars: SUPABASE_URL + SUPABASE_SERVICE_KEY (or SUPABASE_ANON_KEY).

Usage (from backend/ directory):
  python scripts/load_national_intermediate_data.py

  # Dry run (no writes):
  DRY_RUN=true python scripts/load_national_intermediate_data.py
"""

import os
import csv
import sys
import logging
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

CENTROIDS_CSV = str(
    Path(__file__).parent.parent
    / "data" / "shapefiles" / "brazil" / "br_intermediary_regions_centroids.csv"
)
LOG_FILE = str(Path(__file__).parent / "intermediate_regions_load_log.csv")
DRY_RUN = os.environ.get("DRY_RUN", "false").lower() == "true"

SP_STATE_CODE = "35"  # IBGE code for São Paulo state

BIOGAS_RESIDUE_COLS = [
    "sugarcane_biogas_m3_year", "soybean_biogas_m3_year", "corn_biogas_m3_year",
    "coffee_biogas_m3_year", "citrus_biogas_m3_year", "cattle_biogas_m3_year",
    "swine_biogas_m3_year", "poultry_biogas_m3_year", "aquaculture_biogas_m3_year",
    "rsu_biogas_m3_year", "rpo_biogas_m3_year",
]

BIOMASS_RESIDUE_COLS = [
    "sugarcane_biomass_tons_year", "soybean_biomass_tons_year", "corn_biomass_tons_year",
    "coffee_biomass_tons_year", "citrus_biomass_tons_year", "cattle_biomass_tons_year",
    "swine_biomass_tons_year", "poultry_biomass_tons_year", "aquaculture_biomass_tons_year",
    "rsu_biomass_tons_year", "rpo_biomass_tons_year",
]


def load_centroids(csv_path: str) -> list[dict]:
    """Read the centroids CSV. Returns list of region dicts."""
    if not Path(csv_path).exists():
        logger.error(f"Centroids CSV not found: {csv_path}")
        sys.exit(1)

    regions = []
    with open(csv_path, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            regions.append({
                "ibge_code":    str(row["cd_rgint"]).strip(),
                "name":         row["nm_rgint"].strip(),
                "state_code":   str(row["cd_uf"]).strip(),
                "centroid_lat": float(row["centroid_lat"]),
                "centroid_lng": float(row["centroid_lng"]),
            })

    logger.info(f"Loaded {len(regions)} intermediate regions from CSV")
    return regions


def aggregate_sp_from_municipalities(supabase) -> dict[str, dict]:
    """
    For each SP intermediate region, sum biogas and biomass from the
    municipalities table (using the intermediate_region name → ibge_code mapping).

    Returns: {intermediate_region_name_lower: {col: value, ..., municipality_count: n}}
    """
    logger.info("Aggregating SP municipalities by intermediate_region...")

    # Fetch all SP municipalities with biogas + biomass columns
    select_cols = (
        "intermediate_region, population, area_km2, "
        + ", ".join(BIOGAS_RESIDUE_COLS + BIOMASS_RESIDUE_COLS)
        + ", total_biogas_m3_year, agricultural_biogas_m3_year, "
        + "livestock_biogas_m3_year, urban_biogas_m3_year, "
        + "total_biomass_tons_year, agricultural_biomass_tons_year, "
        + "livestock_biomass_tons_year, urban_biomass_tons_year"
    )

    result = (
        supabase.table("municipalities")
        .select(select_cols)
        .execute()
    )
    municipalities = result.data or []
    logger.info(f"Fetched {len(municipalities)} municipalities from Supabase")

    aggregated: dict[str, dict] = {}

    for mun in municipalities:
        region_name = (mun.get("intermediate_region") or "").strip().lower()
        if not region_name:
            continue

        if region_name not in aggregated:
            aggregated[region_name] = {
                col: 0.0 for col in (
                    BIOGAS_RESIDUE_COLS + BIOMASS_RESIDUE_COLS + [
                        "total_biogas_m3_year", "agricultural_biogas_m3_year",
                        "livestock_biogas_m3_year", "urban_biogas_m3_year",
                        "total_biomass_tons_year", "agricultural_biomass_tons_year",
                        "livestock_biomass_tons_year", "urban_biomass_tons_year",
                    ]
                )
            }
            aggregated[region_name]["municipality_count"] = 0
            aggregated[region_name]["population"] = 0
            aggregated[region_name]["area_km2"] = 0.0

        agg = aggregated[region_name]
        agg["municipality_count"] += 1

        for col in BIOGAS_RESIDUE_COLS + BIOMASS_RESIDUE_COLS + [
            "total_biogas_m3_year", "agricultural_biogas_m3_year",
            "livestock_biogas_m3_year", "urban_biogas_m3_year",
            "total_biomass_tons_year", "agricultural_biomass_tons_year",
            "livestock_biomass_tons_year", "urban_biomass_tons_year",
        ]:
            agg[col] = round(agg[col] + float(mun.get(col) or 0), 2)

        agg["population"] += int(mun.get("population") or 0)
        agg["area_km2"] = round(agg["area_km2"] + float(mun.get("area_km2") or 0), 2)

    logger.info(f"Aggregated {len(aggregated)} SP intermediate regions")
    return aggregated


def normalize_name(name: str) -> str:
    """Lowercase + strip accents for fuzzy matching."""
    import unicodedata
    nfkd = unicodedata.normalize("NFKD", name)
    return nfkd.encode("ASCII", "ignore").decode("ASCII").strip().lower()


def main():
    from app.services.supabase_client import get_supabase_client

    supabase = get_supabase_client()

    regions = load_centroids(CENTROIDS_CSV)
    sp_aggregates = aggregate_sp_from_municipalities(supabase)

    # Build a lookup keyed by accent-stripped name for matching
    sp_lookup_normalized: dict[str, dict] = {
        normalize_name(k): v for k, v in sp_aggregates.items()
    }

    rows_to_upsert = []
    log_rows = []

    for region in regions:
        ibge_code  = region["ibge_code"]
        name       = region["name"]
        state_code = region["state_code"]
        is_sp      = (state_code == SP_STATE_CODE)

        row: dict = {
            "ibge_code":    ibge_code,
            "name":         name,
            "state_code":   state_code,
            "centroid_lat": region["centroid_lat"],
            "centroid_lng": region["centroid_lng"],
            "data_source":  "aggregated_from_municipalities" if is_sp else "skeleton_awaiting_national_data",
        }

        if is_sp:
            # Match by region name (try exact, then normalized)
            agg = sp_aggregates.get(name.lower()) or sp_lookup_normalized.get(normalize_name(name))
            if agg:
                row.update({k: v for k, v in agg.items()})
                log_rows.append({"ibge_code": ibge_code, "name": name, "status": "matched_sp",
                                  "municipalities": agg["municipality_count"],
                                  "total_biogas_m3_year": agg["total_biogas_m3_year"]})
            else:
                logger.warning(f"SP region not matched in municipalities: '{name}'")
                log_rows.append({"ibge_code": ibge_code, "name": name, "status": "sp_no_match",
                                  "municipalities": 0, "total_biogas_m3_year": 0})
        else:
            log_rows.append({"ibge_code": ibge_code, "name": name, "status": "skeleton",
                              "municipalities": 0, "total_biogas_m3_year": 0})

        rows_to_upsert.append(row)

    # Write log
    if log_rows:
        with open(LOG_FILE, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=["ibge_code", "name", "status", "municipalities", "total_biogas_m3_year"])
            writer.writeheader()
            writer.writerows(log_rows)
        logger.info(f"Log written to: {LOG_FILE}")

    if DRY_RUN:
        logger.info(f"[DRY RUN] Would upsert {len(rows_to_upsert)} rows — no writes performed.")
        matched = sum(1 for r in log_rows if r["status"] == "matched_sp")
        logger.info(f"  SP regions matched: {matched}")
        logger.info(f"  Non-SP skeletons:   {len(rows_to_upsert) - matched}")
        return

    # Upsert in batches of 50 (Supabase free tier row limit per call)
    BATCH = 50
    total_upserted = 0
    for i in range(0, len(rows_to_upsert), BATCH):
        batch = rows_to_upsert[i : i + BATCH]
        response = (
            supabase.table("intermediate_regions")
            .upsert(batch, on_conflict="ibge_code")
            .execute()
        )
        total_upserted += len(batch)
        logger.info(f"Upserted batch {i // BATCH + 1}: {total_upserted}/{len(rows_to_upsert)} rows")

    matched_sp  = sum(1 for r in log_rows if r["status"] == "matched_sp")
    skeleton    = sum(1 for r in log_rows if r["status"] == "skeleton")
    unmatched   = sum(1 for r in log_rows if r["status"] == "sp_no_match")

    logger.info("=" * 60)
    logger.info(f"Done. {total_upserted} rows upserted into intermediate_regions.")
    logger.info(f"  SP regions with data:  {matched_sp}")
    logger.info(f"  Non-SP skeletons:      {skeleton}")
    logger.info(f"  SP unmatched (check log): {unmatched}")
    logger.info("Next step: run backend/migrations/br_intermediary_regions_distances.sql in Supabase.")


if __name__ == "__main__":
    main()

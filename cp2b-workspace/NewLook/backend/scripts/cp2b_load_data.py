"""
cp2b_load_data.py — Load CP2B handoff CSVs into PostgreSQL.

Tables created by:
  migrations/012_cp2b_residue_streams.sql   → residue_streams_sp2023
  migrations/013_cp2b_municipality_summary.sql → municipality_summary

Run after applying both migrations:
  DATABASE_URL=postgresql://user:pass@host/db python scripts/cp2b_load_data.py

The script is idempotent: it TRUNCATEs each table before loading.
"""

import os
import sys
import csv
from pathlib import Path

import psycopg2
import psycopg2.extras

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
REPO_ROOT = Path(__file__).resolve().parents[4]   # Pilar2b/
DATA_DIR = REPO_ROOT / "analysis" / "data"

MASTER_CSV   = DATA_DIR / "01_master_residue_streams_SP_2023.csv"
SUMMARY_CSV  = DATA_DIR / "02_municipality_summary_SP_2023.csv"
CF_CSV       = DATA_DIR / "03_conversion_factors.csv"


def get_conn():
    url = os.environ.get("DATABASE_URL")
    if not url:
        sys.exit("ERROR: DATABASE_URL env var not set.")
    return psycopg2.connect(url)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _float(v):
    try:
        return float(v) if v not in ("", None) else None
    except ValueError:
        return None


def _int(v):
    try:
        return int(float(v)) if v not in ("", None) else None
    except ValueError:
        return None


# ---------------------------------------------------------------------------
# Load 01_master → residue_streams_sp2023
# ---------------------------------------------------------------------------
MASTER_COLS = (
    "ibge_code", "municipality_name", "lat", "lon", "area_km2",
    "populacao_2022", "densidade_demografica", "cd_rgi", "cd_rgint",
    "year", "residue_stream", "residue_stream_pt", "sector", "sector_pt",
    "residue_tons_yr", "biogas_m3_yr", "energy_GWh_yr", "energy_MWh_yr",
    "biogas_m3_per_capita", "biogas_m3_per_km2", "conversion_factor",
    "cf_unit", "bagaco_excluded_pct", "mun_total_GWh",
    "mun_potential_class", "mun_n_streams", "mun_dominant_stream",
    "source_dataset", "notes",
)

INSERT_MASTER = f"""
    INSERT INTO residue_streams_sp2023 ({", ".join(MASTER_COLS)})
    VALUES %s
"""


def load_master(cur):
    print(f"Loading {MASTER_CSV} …")
    rows = []
    with open(MASTER_CSV, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for r in reader:
            rows.append((
                _int(r["ibge_code"]),
                r["municipality_name"],
                _float(r["lat"]),
                _float(r["lon"]),
                _float(r["area_km2"]),
                _int(r["populacao_2022"]),
                _float(r["densidade_demografica"]),
                _int(r["cd_rgi"]),
                _int(r["cd_rgint"]),
                _int(r.get("year", 2023)),
                r["residue_stream"],
                r.get("residue_stream_pt"),
                r.get("sector"),
                r.get("sector_pt"),
                _float(r.get("residue_tons_yr")),
                _float(r.get("biogas_m3_yr")),
                _float(r.get("energy_GWh_yr")),
                _float(r.get("energy_MWh_yr")),
                _float(r.get("biogas_m3_per_capita")),
                _float(r.get("biogas_m3_per_km2")),
                _float(r.get("conversion_factor")),
                r.get("cf_unit"),
                _float(r.get("bagaco_excluded_pct")),
                _float(r.get("mun_total_GWh")),
                r.get("mun_potential_class"),
                _int(r.get("mun_n_streams")),
                r.get("mun_dominant_stream"),
                r.get("source_dataset"),
                r.get("notes"),
            ))

    cur.execute("TRUNCATE TABLE residue_streams_sp2023 RESTART IDENTITY;")
    psycopg2.extras.execute_values(cur, INSERT_MASTER, rows, page_size=500)
    print(f"  → {len(rows):,} rows inserted into residue_streams_sp2023")
    return len(rows)


# ---------------------------------------------------------------------------
# Load 02_summary → municipality_summary
# ---------------------------------------------------------------------------
SUMMARY_COLS = (
    "ibge_code",
    "ghw_aquaculture", "ghw_cattle", "ghw_citrus", "ghw_coffee",
    "ghw_corn", "ghw_forestry", "ghw_poultry", "ghw_rpo_pruning",
    "ghw_rsu_organic", "ghw_soybean", "ghw_sugarcane", "ghw_swine",
    "codigo_municipio", "populacao_2022", "area_km2",
    "densidade_demografica", "cd_rgi", "nm_rgi", "cd_rgint", "nm_rgint",
    "lat", "lon",
    "categoria_potencial", "mun_potential_class",
    "mun_total_GWh", "mun_n_streams", "mun_dominant_stream",
)

INSERT_SUMMARY = f"""
    INSERT INTO municipality_summary ({", ".join(SUMMARY_COLS)})
    VALUES %s
"""

# Map CSV header → DB column
GWH_MAP = {
    "GWh_aquaculture": "ghw_aquaculture",
    "GWh_cattle":      "ghw_cattle",
    "GWh_citrus":      "ghw_citrus",
    "GWh_coffee":      "ghw_coffee",
    "GWh_corn":        "ghw_corn",
    "GWh_forestry":    "ghw_forestry",
    "GWh_poultry":     "ghw_poultry",
    "GWh_rpo_pruning": "ghw_rpo_pruning",
    "GWh_rsu_organic": "ghw_rsu_organic",
    "GWh_soybean":     "ghw_soybean",
    "GWh_sugarcane":   "ghw_sugarcane",
    "GWh_swine":       "ghw_swine",
}


def load_summary(cur):
    print(f"Loading {SUMMARY_CSV} …")
    rows = []
    with open(SUMMARY_CSV, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for r in reader:
            rows.append((
                _int(r["ibge_code"]),
                _float(r.get("GWh_aquaculture", 0)),
                _float(r.get("GWh_cattle",      0)),
                _float(r.get("GWh_citrus",      0)),
                _float(r.get("GWh_coffee",      0)),
                _float(r.get("GWh_corn",        0)),
                _float(r.get("GWh_forestry",    0)),
                _float(r.get("GWh_poultry",     0)),
                _float(r.get("GWh_rpo_pruning", 0)),
                _float(r.get("GWh_rsu_organic", 0)),
                _float(r.get("GWh_soybean",     0)),
                _float(r.get("GWh_sugarcane",   0)),
                _float(r.get("GWh_swine",       0)),
                _int(r.get("codigo_municipio")),
                _int(r.get("populacao_2022")),
                _float(r.get("area_km2")),
                _float(r.get("densidade_demografica")),
                _int(r.get("cd_rgi")),
                r.get("nm_rgi"),
                _int(r.get("cd_rgint")),
                r.get("nm_rgint"),
                _float(r.get("lat")),
                _float(r.get("lon")),
                r.get("categoria_potencial"),
                r.get("mun_potential_class"),
                _float(r.get("mun_total_GWh")),
                _int(r.get("mun_n_streams")),
                r.get("mun_dominant_stream"),
            ))

    cur.execute("TRUNCATE TABLE municipality_summary RESTART IDENTITY;")
    psycopg2.extras.execute_values(cur, INSERT_SUMMARY, rows, page_size=500)
    print(f"  → {len(rows):,} rows inserted into municipality_summary")
    return len(rows)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    conn = get_conn()
    try:
        with conn:
            with conn.cursor() as cur:
                n_master  = load_master(cur)
                n_summary = load_summary(cur)

        print(f"\nDone. residue_streams_sp2023={n_master:,}  municipality_summary={n_summary:,}")
        print(f"Conversion factors ({CF_CSV.name}) logged only — schema differs from existing table.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()

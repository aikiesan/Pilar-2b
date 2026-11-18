"""
Seed the municipalities table from the V2 SQLite database.

Reads 645 SP municipalities from cp2b_maps.db (the V2 project database) and
upserts them into the PostgreSQL municipalities table used by the Docker stack.

Usage (from repo root or backend/):
  python scripts/import_v2_municipalities.py
  SQLITE_PATH=/path/to/cp2b_maps.db python scripts/import_v2_municipalities.py
  DATABASE_URL=postgresql://... python scripts/import_v2_municipalities.py

The V2 database is expected at A:/CP2B_Maps_V2/data/database/cp2b_maps.db by
default (Windows dev machine).  Override with the SQLITE_PATH env var.
"""

from __future__ import annotations

import os
import sqlite3
import sys
from pathlib import Path

import psycopg2
from psycopg2.extras import execute_values

SQLITE_PATH = os.environ.get(
    "SQLITE_PATH",
    "A:/CP2B_Maps_V2/data/database/cp2b_maps.db",
)
DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:password@localhost:5432/cp2b_maps",
)


def _potential_category(total_biogas: float) -> str:
    if total_biogas > 100_000_000:
        return "ALTO"
    if total_biogas > 10_000_000:
        return "MEDIO"
    if total_biogas > 0:
        return "BAIXO"
    return "SEM DADOS"


def main() -> None:
    if not Path(SQLITE_PATH).exists():
        print(f"ERROR: SQLite database not found at {SQLITE_PATH}", file=sys.stderr)
        print("Set SQLITE_PATH env var to the correct path.", file=sys.stderr)
        sys.exit(1)

    src = sqlite3.connect(SQLITE_PATH)
    src.row_factory = sqlite3.Row
    rows = src.execute("SELECT * FROM municipalities").fetchall()
    print(f"Read {len(rows)} municipalities from SQLite")

    dst = psycopg2.connect(DATABASE_URL)
    cur = dst.cursor()

    records = []
    for r in rows:
        ibge = str(int(r["cd_mun"])) if r["cd_mun"] else str(r["codigo_municipio"])
        total_biogas = float(r["total_final_m_ano"] or 0)
        records.append(
            (
                r["nome_municipio"],
                ibge,
                float(r["lat"]) if r["lat"] else None,
                float(r["lon"]) if r["lon"] else None,
                float(r["area_km2"]) if r["area_km2"] else None,
                int(r["populacao_2022"]) if r["populacao_2022"] else None,
                float(r["densidade_demografica"]) if r["densidade_demografica"] else None,
                r["nm_rgi"],
                r["nm_rgint"],
                str(r["cd_rgi"]) if r["cd_rgi"] else None,
                str(r["cd_rgint"]) if r["cd_rgint"] else None,
                total_biogas,
                float(r["total_agricola_m_ano"] or 0),
                float(r["total_pecuaria_m_ano"] or 0),
                float(r["total_urbano_m_ano"] or 0),
                float(r["rsu_potencial_m_ano"] or 0),
                float(r["rpo_potencial_m_ano"] or 0),
                float(r["biogas_cana_m_ano"] or 0),
                float(r["biogas_soja_m_ano"] or 0),
                float(r["biogas_milho_m_ano"] or 0),
                float(r["biogas_cafe_m_ano"] or 0),
                float(r["biogas_citros_m_ano"] or 0),
                float(r["biogas_bovinos_m_ano"] or 0),
                float(r["biogas_suino_m_ano"] or 0),
                float(r["biogas_aves_m_ano"] or 0),
                float(r["biogas_piscicultura_m_ano"] or 0),
                float(r["biogas_silvicultura_m_ano"] or 0),
                # residues (substrate quantities before conversion)
                float(r["residuos_cana_ton_ano"] or 0),
                float(r["residuos_soja_ton_ano"] or 0),
                float(r["residuos_milho_ton_ano"] or 0),
                _potential_category(total_biogas),
            )
        )

    execute_values(
        cur,
        """
        INSERT INTO municipalities (
            municipality_name, ibge_code,
            centroid_lat, centroid_lng,
            area_km2, population, population_density,
            immediate_region, intermediate_region,
            immediate_region_code, intermediate_region_code,
            total_biogas_m3_year,
            agricultural_biogas_m3_year, livestock_biogas_m3_year, urban_biogas_m3_year,
            rsu_biogas_m3_year, rpo_biogas_m3_year,
            sugarcane_biogas_m3_year, soybean_biogas_m3_year, corn_biogas_m3_year,
            coffee_biogas_m3_year, citrus_biogas_m3_year,
            cattle_biogas_m3_year, swine_biogas_m3_year, poultry_biogas_m3_year,
            aquaculture_biogas_m3_year, forestry_biogas_m3_year,
            sugarcane_residues_tons_year, soybean_residues_tons_year, corn_residues_tons_year,
            potential_category
        ) VALUES %s
        ON CONFLICT (ibge_code) DO UPDATE SET
            municipality_name          = EXCLUDED.municipality_name,
            centroid_lat               = EXCLUDED.centroid_lat,
            centroid_lng               = EXCLUDED.centroid_lng,
            area_km2                   = EXCLUDED.area_km2,
            population                 = EXCLUDED.population,
            population_density         = EXCLUDED.population_density,
            immediate_region           = EXCLUDED.immediate_region,
            intermediate_region        = EXCLUDED.intermediate_region,
            immediate_region_code      = EXCLUDED.immediate_region_code,
            intermediate_region_code   = EXCLUDED.intermediate_region_code,
            total_biogas_m3_year       = EXCLUDED.total_biogas_m3_year,
            agricultural_biogas_m3_year = EXCLUDED.agricultural_biogas_m3_year,
            livestock_biogas_m3_year   = EXCLUDED.livestock_biogas_m3_year,
            urban_biogas_m3_year       = EXCLUDED.urban_biogas_m3_year,
            rsu_biogas_m3_year         = EXCLUDED.rsu_biogas_m3_year,
            rpo_biogas_m3_year         = EXCLUDED.rpo_biogas_m3_year,
            sugarcane_biogas_m3_year   = EXCLUDED.sugarcane_biogas_m3_year,
            soybean_biogas_m3_year     = EXCLUDED.soybean_biogas_m3_year,
            corn_biogas_m3_year        = EXCLUDED.corn_biogas_m3_year,
            coffee_biogas_m3_year      = EXCLUDED.coffee_biogas_m3_year,
            citrus_biogas_m3_year      = EXCLUDED.citrus_biogas_m3_year,
            cattle_biogas_m3_year      = EXCLUDED.cattle_biogas_m3_year,
            swine_biogas_m3_year       = EXCLUDED.swine_biogas_m3_year,
            poultry_biogas_m3_year     = EXCLUDED.poultry_biogas_m3_year,
            aquaculture_biogas_m3_year = EXCLUDED.aquaculture_biogas_m3_year,
            forestry_biogas_m3_year    = EXCLUDED.forestry_biogas_m3_year,
            sugarcane_residues_tons_year = EXCLUDED.sugarcane_residues_tons_year,
            soybean_residues_tons_year = EXCLUDED.soybean_residues_tons_year,
            corn_residues_tons_year    = EXCLUDED.corn_residues_tons_year,
            potential_category         = EXCLUDED.potential_category
    """,
        records,
    )

    dst.commit()
    cur.execute("SELECT COUNT(*) FROM municipalities")
    print(f"Done. {cur.fetchone()[0]} rows in PostgreSQL municipalities table.")
    cur.close()
    dst.close()
    src.close()


if __name__ == "__main__":
    main()

"""
Imports all 645 SP municipalities from the V2 SQLite database into PostgreSQL.
Run from the project root:
    python backend/scripts/import_v2_municipalities.py

Source: A:/CP2B_Maps_V2/data/database/cp2b_maps.db
Target: PostgreSQL municipalities table (localhost:5432)
"""
import sqlite3
import sys
from pathlib import Path
import psycopg2
import psycopg2.extras

SQLITE_PATH = Path("A:/CP2B_Maps_V2/data/database/cp2b_maps.db")
DB_HOST = "localhost"
DB_PORT = 5432
DB_NAME = "cp2b_maps"
DB_USER = "postgres"
DB_PASS = "password"


def main():
    if not SQLITE_PATH.exists():
        print(f"ERROR: SQLite DB not found at {SQLITE_PATH}", file=sys.stderr)
        sys.exit(1)

    print(f"Reading SQLite: {SQLITE_PATH}")
    src = sqlite3.connect(str(SQLITE_PATH))
    src.row_factory = sqlite3.Row
    rows = src.execute("SELECT * FROM municipalities").fetchall()
    print(f"  {len(rows)} municipalities found")
    src.close()

    dst = psycopg2.connect(
        host=DB_HOST, port=DB_PORT, dbname=DB_NAME, user=DB_USER, password=DB_PASS
    )
    cur = dst.cursor()

    inserted = updated = skipped = 0

    for r in rows:
        ibge_code = str(r["cd_mun"] or r["codigo_municipio"] or "").strip()
        if not ibge_code:
            skipped += 1
            continue

        total_biogas = float(r["total_final_m_ano"] or 0)
        agri_biogas  = float(r["total_agricola_m_ano"] or 0)
        livst_biogas = float(r["total_pecuaria_m_ano"] or 0)
        urban_biogas = float(r["total_urbano_m_ano"] or 0)
        rsu          = float(r["rsu_potencial_m_ano"] or 0)
        rpo          = float(r["rpo_potencial_m_ano"] or 0)
        population   = int(r["populacao_2022"] or 0)

        # energy: 1 m³ CH4 ≈ 9.97 kWh → MWh/year
        energy_mwh = round(total_biogas * 9.97 / 1000, 2)
        # CO2: 1 m³ CH4 ≈ 0.717 kg → tons/year
        co2_tons = round(total_biogas * 0.717 / 1000, 2)

        cur.execute(
            """
            INSERT INTO municipalities (
                ibge_code, municipality_name,
                area_km2, population, population_year, population_density,
                centroid_lat, centroid_lng,
                immediate_region_code, immediate_region,
                intermediate_region_code, intermediate_region,
                total_biogas_m3_year, agricultural_biogas_m3_year,
                livestock_biogas_m3_year, urban_biogas_m3_year,
                rsu_biogas_m3_year, rpo_biogas_m3_year,
                sugarcane_biogas_m3_year, soybean_biogas_m3_year,
                corn_biogas_m3_year, coffee_biogas_m3_year,
                citrus_biogas_m3_year, cattle_biogas_m3_year,
                swine_biogas_m3_year, poultry_biogas_m3_year,
                aquaculture_biogas_m3_year,
                sugarcane_biomass_tons_year, soybean_biomass_tons_year,
                corn_biomass_tons_year,
                energy_potential_mwh_year, co2_reduction_tons_year
            ) VALUES (
                %(ibge_code)s, %(municipality_name)s,
                %(area_km2)s, %(population)s, 2022, %(population_density)s,
                %(lat)s, %(lon)s,
                %(cd_rgi)s, %(nm_rgi)s,
                %(cd_rgint)s, %(nm_rgint)s,
                %(total_biogas)s, %(agri_biogas)s,
                %(livst_biogas)s, %(urban_biogas)s,
                %(rsu)s, %(rpo)s,
                %(sugarcane_b)s, %(soybean_b)s,
                %(corn_b)s, %(coffee_b)s,
                %(citrus_b)s, %(cattle_b)s,
                %(swine_b)s, %(poultry_b)s,
                %(aqua_b)s,
                %(sugarcane_t)s, %(soybean_t)s,
                %(corn_t)s,
                %(energy_mwh)s, %(co2_tons)s
            )
            ON CONFLICT (ibge_code) DO UPDATE SET
                municipality_name           = EXCLUDED.municipality_name,
                area_km2                    = EXCLUDED.area_km2,
                population                  = EXCLUDED.population,
                population_year             = EXCLUDED.population_year,
                population_density          = EXCLUDED.population_density,
                centroid_lat                = EXCLUDED.centroid_lat,
                centroid_lng                = EXCLUDED.centroid_lng,
                immediate_region_code       = EXCLUDED.immediate_region_code,
                immediate_region            = EXCLUDED.immediate_region,
                intermediate_region_code    = EXCLUDED.intermediate_region_code,
                intermediate_region         = EXCLUDED.intermediate_region,
                total_biogas_m3_year        = EXCLUDED.total_biogas_m3_year,
                agricultural_biogas_m3_year = EXCLUDED.agricultural_biogas_m3_year,
                livestock_biogas_m3_year    = EXCLUDED.livestock_biogas_m3_year,
                urban_biogas_m3_year        = EXCLUDED.urban_biogas_m3_year,
                rsu_biogas_m3_year          = EXCLUDED.rsu_biogas_m3_year,
                rpo_biogas_m3_year          = EXCLUDED.rpo_biogas_m3_year,
                sugarcane_biogas_m3_year    = EXCLUDED.sugarcane_biogas_m3_year,
                soybean_biogas_m3_year      = EXCLUDED.soybean_biogas_m3_year,
                corn_biogas_m3_year         = EXCLUDED.corn_biogas_m3_year,
                coffee_biogas_m3_year       = EXCLUDED.coffee_biogas_m3_year,
                citrus_biogas_m3_year       = EXCLUDED.citrus_biogas_m3_year,
                cattle_biogas_m3_year       = EXCLUDED.cattle_biogas_m3_year,
                swine_biogas_m3_year        = EXCLUDED.swine_biogas_m3_year,
                poultry_biogas_m3_year      = EXCLUDED.poultry_biogas_m3_year,
                aquaculture_biogas_m3_year  = EXCLUDED.aquaculture_biogas_m3_year,
                sugarcane_biomass_tons_year = EXCLUDED.sugarcane_biomass_tons_year,
                soybean_biomass_tons_year   = EXCLUDED.soybean_biomass_tons_year,
                corn_biomass_tons_year      = EXCLUDED.corn_biomass_tons_year,
                energy_potential_mwh_year   = EXCLUDED.energy_potential_mwh_year,
                co2_reduction_tons_year     = EXCLUDED.co2_reduction_tons_year,
                updated_at                  = CURRENT_TIMESTAMP
            """,
            {
                "ibge_code":       ibge_code,
                "municipality_name": str(r["nome_municipio"] or "").strip(),
                "area_km2":        float(r["area_km2"] or 0),
                "population":      population,
                "population_density": float(r["densidade_demografica"] or 0),
                "lat":             float(r["lat"] or 0),
                "lon":             float(r["lon"] or 0),
                "cd_rgi":          str(r["cd_rgi"] or ""),
                "nm_rgi":          str(r["nm_rgi"] or ""),
                "cd_rgint":        str(r["cd_rgint"] or ""),
                "nm_rgint":        str(r["nm_rgint"] or ""),
                "total_biogas":    total_biogas,
                "agri_biogas":     agri_biogas,
                "livst_biogas":    livst_biogas,
                "urban_biogas":    urban_biogas,
                "rsu":             rsu,
                "rpo":             rpo,
                "sugarcane_b":     float(r["biogas_cana_m_ano"] or 0),
                "soybean_b":       float(r["biogas_soja_m_ano"] or 0),
                "corn_b":          float(r["biogas_milho_m_ano"] or 0),
                "coffee_b":        float(r["biogas_cafe_m_ano"] or 0),
                "citrus_b":        float(r["biogas_citros_m_ano"] or 0),
                "cattle_b":        float(r["biogas_bovinos_m_ano"] or 0),
                "swine_b":         float(r["biogas_suino_m_ano"] or 0),
                "poultry_b":       float(r["biogas_aves_m_ano"] or 0),
                "aqua_b":          float(r["biogas_piscicultura_m_ano"] or 0),
                "sugarcane_t":     float(r["residuos_cana_ton_ano"] or 0),
                "soybean_t":       float(r["residuos_soja_ton_ano"] or 0),
                "corn_t":          float(r["residuos_milho_ton_ano"] or 0),
                "energy_mwh":      energy_mwh,
                "co2_tons":        co2_tons,
            },
        )
        if cur.statusmessage.startswith("INSERT"):
            inserted += 1
        else:
            updated += 1

    dst.commit()
    cur.close()
    dst.close()

    print(f"\nDone — inserted={inserted}  updated={updated}  skipped={skipped}")


if __name__ == "__main__":
    main()

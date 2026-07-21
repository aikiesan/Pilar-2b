"""
Promote IBGE Censo 2022 population and IBGE PIB per capita, nationally.

    docker exec cp2b-backend-dev sh -c "cd /app && python scripts/promote_ibge_demographics.py --dry-run"
    docker exec cp2b-backend-dev sh -c "cd /app && python scripts/promote_ibge_demographics.py"

The municipality profile panel showed "N/A" for População, Densidade and PIB per
capita everywhere outside São Paulo: the columns exist but were populated for
exactly 645 of 5,571 municipalities by the old SP-only load. area_km2 was already
national (it comes from the 2025 mesh), which is why Área alone rendered.

Raw snapshots (gitignored — see data/raw/README.md):
    data/raw/ibge_censo2022/Agregados_por_municipios_basico_BR.csv
    data/raw/ibge_pib/PIB_Municipios_2010-2023.xlsx

SOURCES AND WHY THESE ONES
  * Population: Censo 2022 `v0001` (população residente). The census is a count,
    not an estimate, and its municipal sum reproduces IBGE's published national
    figure exactly (203,080,756) — which is the gate below.
  * PIB: IBGE "PIB dos Municípios", latest available year. Per-capita comes from
    the published column rather than being recomputed as PIB/population: IBGE
    divides by its own mid-year population estimate for the PIB reference year,
    not by the census count, and recomputing would silently mix the two bases.

DENSITY IS DERIVED, NOT READ
population_density = population / area_km2, using the mesh area already in the
table. Computing it here keeps one definition; the alternative (a second area
figure from the census file) would drift from the polygons the map draws.

WHAT IS DELIBERATELY NOT WRITTEN
`urban_population` / `rural_population`. The Censo básico file carries household
counts, not the urban/rural split, and SNIS `populacao_urbana` is a different
concept (service-area population, reported by the operator). Leaving them NULL
reads as "we do not have this" — writing a proxy would assert we did.
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

import pandas as pd
import psycopg2

sys.path.insert(0, "/app")

RAW_DIR = Path(os.environ.get("INGEST_RAW_DIR", "/app/data/raw"))
CENSO_FILE = RAW_DIR / "ibge_censo2022" / "Agregados_por_municipios_basico_BR.csv"
PIB_FILE = RAW_DIR / "ibge_pib" / "PIB_Municipios_2010-2023.xlsx"

CENSO_YEAR = 2022
# IBGE's published Censo 2022 total. The municipal rows must reproduce it — that
# is what validates the parse (separator, encoding, and that no aggregate row
# slipped in). https://censo2022.ibge.gov.br
PUBLISHED_CENSO_POPULATION = 203_080_756
POPULATION_TOLERANCE_PCT = 0.01

PIB_CODE_COL = "Código do Município"
PIB_YEAR_COL = "Ano"

UPDATE_SQL = """
UPDATE municipalities SET
    population = %(population)s,
    population_year = %(population_year)s,
    population_density = CASE
        WHEN area_km2 IS NULL OR area_km2 <= 0 THEN NULL
        ELSE ROUND((%(population)s::numeric / area_km2), 2)
    END,
    gdp_total = COALESCE(%(gdp_total)s, gdp_total),
    gdp_per_capita = COALESCE(%(gdp_per_capita)s, gdp_per_capita),
    gdp_year = COALESCE(%(gdp_year)s, gdp_year)
WHERE ibge_code = %(ibge_code)s
"""

TIMESERIES_SQL = """
INSERT INTO municipality_timeseries
    (ibge_code, year, source_id, variable, value, unit, quality)
VALUES (%(ibge_code)s, %(year)s, 'ibge_censo2022', 'populacao_residente',
        %(value)s, 'inhabitants', 'measured')
ON CONFLICT (ibge_code, year, source_id, variable) DO UPDATE
SET value = EXCLUDED.value, quality = EXCLUDED.quality
"""


def dsn() -> str:
    url = os.environ.get("DATABASE_URL")
    if url:
        return url
    return "postgresql://{u}:{p}@{h}:{port}/{db}".format(
        u=os.environ.get("POSTGRES_USER", "postgres"),
        p=os.environ.get("POSTGRES_PASSWORD", "password"),
        h=os.environ.get("POSTGRES_HOST", "db"),
        port=os.environ.get("POSTGRES_PORT", "5432"),
        db=os.environ.get("POSTGRES_DB", "cp2b_maps"),
    )


def load_censo() -> pd.DataFrame:
    frame = pd.read_csv(
        CENSO_FILE, sep=";", encoding="latin-1", low_memory=False, dtype={"CD_MUN": str}
    )
    frame = frame[["CD_MUN", "v0001"]].rename(
        columns={"CD_MUN": "ibge_code", "v0001": "population"}
    )
    frame["population"] = pd.to_numeric(frame["population"], errors="coerce")
    return frame.dropna(subset=["population"])


def load_pib() -> tuple[pd.DataFrame, int]:
    frame = pd.read_excel(PIB_FILE, sheet_name="PIB dos Municípios")
    # Column headers carry embedded newlines and unit suffixes; match on prefix.
    per_capita = next(c for c in frame.columns if "per capita" in c)
    total = next(c for c in frame.columns if c.strip().startswith("Produto Interno Bruto,"))
    year = int(frame[PIB_YEAR_COL].max())
    latest = frame[frame[PIB_YEAR_COL] == year]
    out = pd.DataFrame(
        {
            "ibge_code": latest[PIB_CODE_COL].astype(str).str.zfill(7),
            # Published in R$ 1.000; stored in reais so the two GDP columns share a unit.
            "gdp_total": pd.to_numeric(latest[total], errors="coerce") * 1000.0,
            "gdp_per_capita": pd.to_numeric(latest[per_capita], errors="coerce"),
        }
    )
    return out.dropna(subset=["gdp_per_capita"]), year


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    censo = load_censo()
    pib, pib_year = load_pib()

    total = float(censo["population"].sum())
    drift = abs(total - PUBLISHED_CENSO_POPULATION) / PUBLISHED_CENSO_POPULATION * 100
    status = "PASS" if drift <= POPULATION_TOLERANCE_PCT else "FAIL"
    print(
        f"[{status}] census total: {total:,.0f} vs {PUBLISHED_CENSO_POPULATION:,} "
        f"published ({drift:.4f}%)"
    )
    if status == "FAIL":
        print("refusing to promote — the parse does not reproduce IBGE's own total")
        return 1

    merged = censo.merge(pib, on="ibge_code", how="left")
    print(
        f"censo municipalities: {len(censo):,}   with PIB {pib_year}: {merged.gdp_per_capita.notna().sum():,}"
    )

    rows = [
        {
            "ibge_code": r.ibge_code,
            "population": int(r.population),
            "population_year": CENSO_YEAR,
            "gdp_total": None if pd.isna(r.gdp_total) else float(r.gdp_total),
            "gdp_per_capita": None if pd.isna(r.gdp_per_capita) else float(r.gdp_per_capita),
            "gdp_year": None if pd.isna(r.gdp_per_capita) else pib_year,
        }
        for r in merged.itertuples()
    ]

    if args.dry_run:
        print(f"dry run — {len(rows):,} municipalities would be updated")
        return 0

    connection = psycopg2.connect(dsn())
    try:
        with connection, connection.cursor() as cursor:
            cursor.executemany(UPDATE_SQL, rows)
            cursor.executemany(
                TIMESERIES_SQL,
                [
                    {"ibge_code": r["ibge_code"], "year": CENSO_YEAR, "value": r["population"]}
                    for r in rows
                ],
            )
        print(f"committed — {len(rows):,} municipalities updated (single transaction)")
    finally:
        connection.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

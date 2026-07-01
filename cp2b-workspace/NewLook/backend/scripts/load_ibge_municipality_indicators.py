"""
Load IBGE municipality indicators into the municipalities table.

Sources expected under IBGE_DATA_DIR (defaults to ../../Nova pasta from this repo):
  - BR_Municipios_2025/BR_Municipios_2025.shp
  - POP2025_20260113.xls
  - base_de_dados_2010_2023_xlsx/PIB dos Municipios - base de dados 2010-2023.xlsx

Updates municipalities by ibge_code with:
  area_km2, population, population_density, gdp_total, gdp_per_capita,
  immediate/intermediate region names and codes, centroid lat/lng, and source years.

Usage from backend/:
  python scripts/load_ibge_municipality_indicators.py
  DRY_RUN=true python scripts/load_ibge_municipality_indicators.py
  IBGE_DATA_DIR="/path/to/ibge/files" python scripts/load_ibge_municipality_indicators.py
"""

from __future__ import annotations

import csv
import logging
import os
import sys
from pathlib import Path
from typing import Any

import geopandas as gpd
import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent))

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

BACKEND_DIR = Path(__file__).resolve().parent.parent
DEFAULT_IBGE_DIR = BACKEND_DIR.parent.parent / "Nova pasta"
IBGE_DATA_DIR = Path(os.environ.get("IBGE_DATA_DIR", DEFAULT_IBGE_DIR)).resolve()
DRY_RUN = os.environ.get("DRY_RUN", "false").lower() == "true"

AREA_YEAR = int(os.environ.get("IBGE_AREA_YEAR", "2025"))
POPULATION_YEAR = int(os.environ.get("IBGE_POPULATION_YEAR", "2025"))
GDP_YEAR = int(os.environ.get("IBGE_GDP_YEAR", "2023"))
SP_UF_CODE = "35"

LOG_FILE = Path(__file__).with_name("ibge_municipality_indicators_load_log.csv")


def digits(value: Any) -> str:
    """Return only digits, preserving integer-looking floats from Excel."""
    if pd.isna(value):
        return ""
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return "".join(ch for ch in str(value) if ch.isdigit())


def money_or_none(value: Any) -> float | None:
    if pd.isna(value):
        return None
    try:
        return round(float(value), 2)
    except (TypeError, ValueError):
        return None


def load_area_rows(base_dir: Path) -> dict[str, dict[str, Any]]:
    shp_path = base_dir / "BR_Municipios_2025" / "BR_Municipios_2025.shp"
    if not shp_path.exists():
        raise FileNotFoundError(f"IBGE municipality shapefile not found: {shp_path}")

    logger.info("Loading municipality areas and regions from %s", shp_path)
    gdf = gpd.read_file(shp_path)
    gdf = gdf[gdf["CD_UF"].astype(str).str.zfill(2) == SP_UF_CODE].copy()

    # Projected centroids avoid geographic-CRS centroid distortion.
    projected = gdf.to_crs(epsg=5880) if gdf.crs else gdf
    centroids = gpd.GeoSeries(projected.geometry.centroid, crs=projected.crs)
    if gdf.crs:
        centroids = centroids.to_crs(gdf.crs)

    rows: dict[str, dict[str, Any]] = {}
    for idx, row in gdf.iterrows():
        ibge_code = str(row["CD_MUN"]).strip()
        centroid = centroids.loc[idx]
        rows[ibge_code] = {
            "ibge_code": ibge_code,
            "municipality_name": str(row["NM_MUN"]).strip(),
            "area_km2": round(float(row["AREA_KM2"]), 3),
            "immediate_region_code": str(row["CD_RGI"]).strip(),
            "immediate_region": str(row["NM_RGI"]).strip(),
            "intermediate_region_code": str(row["CD_RGINT"]).strip(),
            "intermediate_region": str(row["NM_RGINT"]).strip(),
            "centroid_lat": round(float(centroid.y), 6),
            "centroid_lng": round(float(centroid.x), 6),
        }

    logger.info("Loaded %s SP municipality area rows", len(rows))
    return rows


def load_population_rows(base_dir: Path) -> dict[str, int]:
    pop_path = base_dir / "POP2025_20260113.xls"
    if not pop_path.exists():
        raise FileNotFoundError(f"IBGE population workbook not found: {pop_path}")

    logger.info("Loading population estimates from %s", pop_path)
    df = pd.read_excel(pop_path, sheet_name=1, skiprows=1)
    uf_col = df.columns[1]
    mun_col = df.columns[2]
    population_col = df.columns[4]
    df["ibge_code"] = df[uf_col].map(lambda v: digits(v).zfill(2)) + df[mun_col].map(
        lambda v: digits(v).zfill(5)
    )

    rows: dict[str, int] = {}
    for _, row in df.iterrows():
        ibge_code = str(row["ibge_code"])
        if not ibge_code.startswith(SP_UF_CODE):
            continue
        if pd.isna(row[population_col]):
            continue
        rows[ibge_code] = int(row[population_col])

    logger.info("Loaded %s SP population rows", len(rows))
    return rows


def find_pib_workbook(base_dir: Path) -> Path:
    pib_dir = base_dir / "base_de_dados_2010_2023_xlsx"
    if not pib_dir.exists():
        raise FileNotFoundError(f"IBGE PIB directory not found: {pib_dir}")
    for candidate in pib_dir.iterdir():
        if candidate.suffix.lower() in {".xlsx", ".xls"}:
            return candidate
    raise FileNotFoundError(f"No PIB workbook found in {pib_dir}")


def find_pib_columns(columns: list[Any]) -> tuple[Any, Any, Any, Any]:
    year_col = next((c for c in columns if str(c).strip() == "Ano"), None)
    code_col = next(
        (c for c in columns if "Munic" in str(c) and "digo" in str(c)),
        None,
    )
    gdp_pc_col = next((c for c in columns if "per capita" in str(c)), None)
    gdp_col = next(
        (c for c in columns if "Produto Interno Bruto," in str(c) and "per capita" not in str(c)),
        None,
    )
    missing = [
        name
        for name, value in {
            "year": year_col,
            "municipality code": code_col,
            "gdp total": gdp_col,
            "gdp per capita": gdp_pc_col,
        }.items()
        if value is None
    ]
    if missing:
        raise ValueError(f"Could not detect PIB columns: {', '.join(missing)}")
    return year_col, code_col, gdp_col, gdp_pc_col


def load_gdp_rows(base_dir: Path) -> dict[str, dict[str, float | None]]:
    pib_path = find_pib_workbook(base_dir)
    logger.info("Loading GDP data from %s", pib_path)
    df = pd.read_excel(pib_path, sheet_name=0)
    year_col, code_col, gdp_col, gdp_pc_col = find_pib_columns(list(df.columns))
    df["ibge_code"] = df[code_col].map(digits).str.zfill(7)
    df = df[(df[year_col] == GDP_YEAR) & df["ibge_code"].str.startswith(SP_UF_CODE)]

    rows: dict[str, dict[str, float | None]] = {}
    for _, row in df.iterrows():
        gdp_thousand_brl = money_or_none(row[gdp_col])
        rows[str(row["ibge_code"])] = {
            "gdp_total": (
                round(gdp_thousand_brl * 1000, 2) if gdp_thousand_brl is not None else None
            ),
            "gdp_per_capita": money_or_none(row[gdp_pc_col]),
        }

    logger.info("Loaded %s SP GDP rows for %s", len(rows), GDP_YEAR)
    return rows


def build_rows(base_dir: Path) -> list[dict[str, Any]]:
    area_rows = load_area_rows(base_dir)
    population_rows = load_population_rows(base_dir)
    gdp_rows = load_gdp_rows(base_dir)

    rows: list[dict[str, Any]] = []
    for ibge_code, row in area_rows.items():
        population = population_rows.get(ibge_code)
        area_km2 = row.get("area_km2")
        gdp = gdp_rows.get(ibge_code, {})
        row.update(
            {
                "population": population,
                "population_density": (
                    round(population / area_km2, 4) if population is not None and area_km2 else None
                ),
                "gdp_total": gdp.get("gdp_total"),
                "gdp_per_capita": gdp.get("gdp_per_capita"),
                "population_year": POPULATION_YEAR if population is not None else None,
                "area_year": AREA_YEAR,
                "gdp_year": GDP_YEAR if gdp else None,
                "ibge_data_source": (
                    "IBGE BR_Municipios_2025; POP2025_20260113; " "PIB dos Municipios 2010-2023"
                ),
            }
        )
        rows.append(row)

    return rows


def ensure_columns(conn) -> None:
    """Keep the script idempotent if the SQL migration has not been run yet."""
    sql_path = BACKEND_DIR / "app" / "migrations" / "012_ibge_municipality_indicators.sql"
    with open(sql_path, encoding="utf-8") as f:
        sql = f.read()
    cursor = conn.cursor()
    try:
        cursor.execute(sql)
    finally:
        cursor.close()


def update_database(rows: list[dict[str, Any]]) -> tuple[int, list[dict[str, Any]]]:
    from app.core.database import get_db_transaction

    sql = """
        UPDATE municipalities SET
            municipality_name = COALESCE(%(municipality_name)s, municipality_name),
            area_km2 = %(area_km2)s,
            population = %(population)s,
            population_density = %(population_density)s,
            gdp_total = %(gdp_total)s,
            gdp_per_capita = %(gdp_per_capita)s,
            population_year = %(population_year)s,
            area_year = %(area_year)s,
            gdp_year = %(gdp_year)s,
            immediate_region = %(immediate_region)s,
            intermediate_region = %(intermediate_region)s,
            immediate_region_code = %(immediate_region_code)s,
            intermediate_region_code = %(intermediate_region_code)s,
            centroid_lat = %(centroid_lat)s,
            centroid_lng = %(centroid_lng)s,
            ibge_data_source = %(ibge_data_source)s,
            updated_at = CURRENT_TIMESTAMP
        WHERE ibge_code = %(ibge_code)s
    """

    updated = 0
    log_rows: list[dict[str, Any]] = []
    with get_db_transaction() as conn:
        ensure_columns(conn)
        cursor = conn.cursor()
        try:
            for row in rows:
                cursor.execute(sql, row)
                matched = cursor.rowcount
                updated += matched
                log_rows.append(
                    {
                        "ibge_code": row["ibge_code"],
                        "municipality_name": row["municipality_name"],
                        "matched": matched,
                        "area_km2": row["area_km2"],
                        "population": row["population"],
                        "population_density": row["population_density"],
                        "gdp_per_capita": row["gdp_per_capita"],
                    }
                )
        finally:
            cursor.close()

    return updated, log_rows


def write_log(rows: list[dict[str, Any]]) -> None:
    fieldnames = [
        "ibge_code",
        "municipality_name",
        "matched",
        "area_km2",
        "population",
        "population_density",
        "gdp_per_capita",
    ]
    with open(LOG_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)
    logger.info("Wrote load log to %s", LOG_FILE)


def main() -> None:
    logger.info("IBGE data directory: %s", IBGE_DATA_DIR)
    rows = build_rows(IBGE_DATA_DIR)
    if not rows:
        raise RuntimeError("No IBGE municipality rows were built")

    pedreira = next((r for r in rows if r["ibge_code"] == "3537107"), None)
    if pedreira:
        logger.info(
            "Pedreira check: area=%s population=%s density=%s gdp_per_capita=%s",
            pedreira["area_km2"],
            pedreira["population"],
            pedreira["population_density"],
            pedreira["gdp_per_capita"],
        )

    if DRY_RUN:
        write_log([{**row, "matched": ""} for row in rows])
        logger.info("Dry run complete. Built %s rows; database not modified.", len(rows))
        return

    updated, log_rows = update_database(rows)
    write_log(log_rows)
    unmatched = len([row for row in log_rows if not row["matched"]])
    logger.info("Done. Updated %s/%s municipalities (%s unmatched).", updated, len(rows), unmatched)


if __name__ == "__main__":
    main()

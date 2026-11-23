#!/usr/bin/env python3
"""
Load MapBiomas Collection 11 land cover per municipality (SP and MG) into
municipality_land_cover (migration 041).

Reads sheet COVERAGE_11 of MAPBIOMAS_BRAZIL-COL.11-BIOME_STATE_MUNICIPALITY.xlsx
in read-only mode, buckets each class row into eight groups (see GROUPS and
group_of), sums a municipality's rows across biomes, and upserts one row per
municipality, year and group, zeros included, so every municipality has all
eight groups in every year.

Usage:
    DATABASE_URL=postgresql://... python scripts/load_municipality_land_cover.py \\
        --xlsx /path/to/MAPBIOMAS_BRAZIL-COL.11-BIOME_STATE_MUNICIPALITY.xlsx

    --years 1985,2005,2025   years to load (default)
    --dry-run                read and report, write nothing

Idempotent: re-running replaces the loaded years.
"""

from __future__ import annotations

import argparse
import os
import sys
import time
from pathlib import Path

import openpyxl
import psycopg2
from psycopg2.extras import execute_values

SHEET = "COVERAGE_11"
UF_PREFIXES = ("35", "31")  # São Paulo, Minas Gerais
DEFAULT_YEARS = (1985, 2005, 2025)
GROUPS = ("forest", "pasture", "cane", "crops", "silviculture", "mosaic", "urban", "other")


def group_of(level_1: str | None, level_2: str | None, level_4: str | None) -> str:
    """The group a MapBiomas class row belongs to.

    Native vegetation is everything under class level 1 "1." (forest) or "2."
    (other natural formations); farming is split by level 2, with sugar cane
    picked out at level 4. Water, mining and other non-vegetated land, and
    "not observed", fall to "other".
    """
    l1, l2, l4 = level_1 or "", level_2 or "", level_4 or ""
    if l1.startswith("1.") or l1.startswith("2."):
        return "forest"
    if "Pasture" in l2:
        return "pasture"
    if "sugar cane" in l4.lower():
        return "cane"
    if "Agriculture" in l2:
        return "crops"
    if "Forest Plantation" in l2:
        return "silviculture"
    if "Mosaic" in l2:
        return "mosaic"
    if "Urban" in l2:
        return "urban"
    return "other"


def read_land_cover(
    xlsx: Path, years: tuple[int, ...]
) -> tuple[dict[str, dict[int, dict[str, float]]], int]:
    """{ibge: {year: {group: hectares}}} for SP and MG, and the source rows read."""
    wb = openpyxl.load_workbook(xlsx, read_only=True)
    try:
        ws = wb[SHEET]
        rows = ws.iter_rows(values_only=True)
        head = list(next(rows))
        col = {
            k: head.index(k) for k in ("geocode", "class_level_1", "class_level_2", "class_level_4")
        }
        year_col = {}
        for y in years:
            name = f"y{y}"
            if name not in head:
                raise SystemExit(f"Year {y} is not in {SHEET} (last column: {head[-1]})")
            year_col[y] = head.index(name)

        out: dict[str, dict[int, dict[str, float]]] = {}
        read = 0
        for r in rows:
            code = str(r[col["geocode"]] or "").strip()
            if not code.startswith(UF_PREFIXES):
                continue
            read += 1
            g = group_of(r[col["class_level_1"]], r[col["class_level_2"]], r[col["class_level_4"]])
            per_year = out.setdefault(code, {y: dict.fromkeys(GROUPS, 0.0) for y in years})
            for y, i in year_col.items():
                per_year[y][g] += float(r[i] or 0)
        return out, read
    finally:
        wb.close()


def write(conn, data: dict[str, dict[int, dict[str, float]]], years: tuple[int, ...]) -> int:
    rows = [
        (code, y, g, round(per_year[y][g], 2))
        for code, per_year in sorted(data.items())
        for y in years
        for g in GROUPS
    ]
    with conn.cursor() as cur:
        # Replace the loaded years whole, so a municipality the new file no
        # longer lists does not linger with old numbers.
        cur.execute("DELETE FROM municipality_land_cover WHERE year = ANY(%s)", (list(years),))
        execute_values(
            cur,
            "INSERT INTO municipality_land_cover (ibge_code, year, group_key, area_ha) VALUES %s",
            rows,
            page_size=2000,
        )
    conn.commit()
    return len(rows)


def main() -> int:
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("--xlsx", required=True, type=Path)
    ap.add_argument("--years", default=",".join(map(str, DEFAULT_YEARS)))
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    years = tuple(int(y) for y in args.years.split(","))
    if not args.xlsx.exists():
        print(f"ERROR: {args.xlsx} not found")
        return 1

    t0 = time.monotonic()
    data, read = read_land_cover(args.xlsx, years)
    t_read = time.monotonic() - t0
    by_uf = {uf: sum(1 for c in data if c.startswith(uf)) for uf in UF_PREFIXES}
    print(f"Read {read} source rows in {t_read:.1f} s: {len(data)} municipalities {by_uf}")

    if args.dry_run:
        return 0
    url = os.getenv("DATABASE_URL")
    if not url:
        print("ERROR: set DATABASE_URL")
        return 1
    t1 = time.monotonic()
    with psycopg2.connect(url) as conn:
        written = write(conn, data, years)
    print(
        f"Wrote {written} rows in {time.monotonic() - t1:.1f} s (total {time.monotonic() - t0:.1f} s)"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())

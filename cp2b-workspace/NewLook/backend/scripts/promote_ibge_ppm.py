"""
Promote IBGE PPM (herds / animal products / aquaculture) into municipality_timeseries.

    docker cp backend/scripts/promote_ibge_ppm.py cp2b-backend-dev:/tmp/
    docker exec -w /app cp2b-backend-dev python /tmp/promote_ibge_ppm.py --year 2024 --dry-run
    docker exec -w /app cp2b-backend-dev python /tmp/promote_ibge_ppm.py --years 2008-2024

    # from the bbp schema (Biomass Brasil Pipeline; see ingest/bbp.py)
    python scripts/promote_ibge_ppm.py --source bbp --year 2025

With --source bbp the frame comes from the current bbp release instead of
data/raw/ibge_ppm; same frame, same gates. Rows of a year IBGE still marks
preliminary are written with quality 'preliminary', which the map's
latest-year readers skip (migration 037) until the year is re-exported as final.

Melts the wide per-year frame from ingest.sources.ibge_ppm into the long shape
municipality_timeseries stores, and upserts it. Idempotent by construction: the
table's UNIQUE (ibge_code, year, source_id, variable) turns a re-run into an
UPDATE instead of a duplicate — the structural defence against the double-load
that inflated ABIOVE's TerraClass table 2.89x (D1 §5.7).

ON THE AGGREGATION GATE AND --accept-unfed-aggregation
------------------------------------------------------
The battery is fully green for 2024, where IBGE's published national figures are
recorded in source.PUBLISHED_NATIONAL and our municipal rows reproduce them to
0.01% (bovino 238,180,757 vs 238.2M published; galinhas 277,485,208 vs 277.5M).
That match validates the PARSER — the year forward-fill, the '-' vs '..' value
codes, and the column mapping — and every other year runs through exactly the
same code path.

For years with no recorded published figure the aggregation gate reports FAIL,
meaning "cannot test", not "found wrong". Promoting those years is therefore a
judgement call, and this script makes it an explicit, recorded one: it refuses
unless --accept-unfed-aggregation is passed, and it prints which years relied on
it. The honest fix is to add each year's figures from the IBGE PPM release to
PUBLISHED_NATIONAL, after which the gate bites on its own.
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

import pandas as pd
import psycopg2
from psycopg2.extras import execute_batch

sys.path.insert(0, "/app")

from ingest import bbp as bbp_source  # noqa: E402
from ingest.contract import IngestContext  # noqa: E402
from ingest.sources.ibge_ppm import source as ppm  # noqa: E402

RAW_DIR = Path(os.environ.get("INGEST_RAW_DIR", "/app/data/raw"))

UPSERT_SQL = """
INSERT INTO municipality_timeseries
    (ibge_code, year, source_id, variable, value, unit, quality)
VALUES
    (%(ibge_code)s, %(year)s, %(source_id)s, %(variable)s, %(value)s, %(unit)s, %(quality)s)
ON CONFLICT (ibge_code, year, source_id, variable) DO UPDATE
SET value = EXCLUDED.value,
    unit = EXCLUDED.unit,
    quality = EXCLUDED.quality
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


def melt(df: pd.DataFrame, year: int, quality: str = "measured") -> list[dict]:
    """Wide -> long. NULL values are dropped, not written as 0.

    A '..' in SIDRA means IBGE did not survey it; writing it as 0 would state
    that the municipality has no cattle, which is a different claim entirely.
    """
    rows: list[dict] = []
    for variable, unit in ppm.UNIT_BY_VARIABLE.items():
        if variable not in df.columns:
            continue
        series = pd.to_numeric(df[variable], errors="coerce")
        for code, value in zip(df["ibge_code"], series):
            if pd.isna(value):
                continue
            rows.append(
                {
                    "ibge_code": str(code),
                    "year": year,
                    "source_id": ppm.SPEC.source_id,
                    "variable": variable,
                    "value": float(value),
                    "unit": unit,
                    "quality": quality,
                }
            )
    return rows


def parse_years(spec: str) -> list[int]:
    if "-" in spec:
        lo, hi = spec.split("-", 1)
        return list(range(int(lo), int(hi) + 1))
    return [int(spec)]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--year", type=int)
    ap.add_argument("--years", help="inclusive range, e.g. 2008-2024")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument(
        "--accept-unfed-aggregation",
        action="store_true",
        help="promote years whose only failing gate is aggregation for want of "
        "recorded published totals (see module docstring)",
    )
    ap.add_argument(
        "--source",
        choices=("raw", "bbp"),
        default="raw",
        help="raw = SIDRA workbooks under data/raw/ibge_ppm; bbp = the current release in "
        "the bbp schema of this database (Biomass Brasil Pipeline, ingest/bbp.py)",
    )
    args = ap.parse_args()

    if not args.year and not args.years:
        raise SystemExit("pass --year or --years")
    years = parse_years(args.years) if args.years else [args.year]

    conn = None if args.dry_run else psycopg2.connect(dsn())
    read_conn = psycopg2.connect(dsn()) if args.source == "bbp" else None
    if read_conn is not None:
        print(f"source: bbp release {bbp_source.current_release(read_conn)}")
    total_rows = 0
    unfed: list[int] = []
    try:
        for year in years:
            quality = "measured"
            if read_conn is not None:
                df, preliminary, aquaculture = ppm.load_bbp(year, read_conn)
                quality = "preliminary" if preliminary else "measured"
                gate_inputs = {"aquaculture_reading": aquaculture}
            else:
                df = ppm.load(year, RAW_DIR)
                gate_inputs = {"raw_dir": RAW_DIR}
            ctx = IngestContext(spec=ppm.SPEC, year=year)
            results, ctx = ppm.validate(df, ctx, **gate_inputs)

            failed = [r for r in results if not r.passed]
            unfed_only = failed and all(
                r.gate == "aggregation" and "no published totals" in r.details for r in failed
            )
            if failed and not unfed_only:
                for r in failed:
                    print(f"  {r}")
                raise SystemExit(f"{year}: gates failed — refusing to promote")
            if unfed_only:
                if not args.accept_unfed_aggregation:
                    raise SystemExit(
                        f"{year}: aggregation gate unfed (no published totals recorded). "
                        "Add them to ingest.sources.ibge_ppm.PUBLISHED_NATIONAL, or re-run "
                        "with --accept-unfed-aggregation to promote on the strength of the "
                        "2024 parser validation."
                    )
                unfed.append(year)

            rows = melt(df, year, quality)
            total_rows += len(rows)
            flag = " [aggregation unfed]" if year in unfed else " [fully gated]"
            if quality == "preliminary":
                flag += " [IBGE preliminary]"
            print(f"{year}: {len(df):5d} municipalities -> {len(rows):7d} series rows{flag}")

            if not args.dry_run:
                with conn.cursor() as cur:
                    execute_batch(cur, UPSERT_SQL, rows, page_size=1000)
                conn.commit()

        if args.dry_run:
            print(f"\n[dry-run] would write {total_rows:,} rows; nothing committed")
        else:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT count(*), count(DISTINCT ibge_code), count(DISTINCT variable), "
                    "min(year), max(year) FROM municipality_timeseries WHERE source_id = %s",
                    (ppm.SPEC.source_id,),
                )
                n, muni, var, y0, y1 = cur.fetchone()
                print(
                    f"\npromoted: {n:,} rows | {muni:,} municipalities | {var} variables | {y0}-{y1}"
                )
        if unfed:
            print(f"NOTE: aggregation gate was unfed for {unfed} — promoted on the 2024 validation")
    finally:
        for c in (conn, read_conn):
            if c is not None:
                c.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())

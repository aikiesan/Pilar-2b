"""
Promote SNIS (solid waste + sewage + population) into municipality_timeseries.

    docker exec -w /app cp2b-backend-dev python /tmp/promote_snis.py --years 2008-2022 --dry-run
    docker exec -w /app cp2b-backend-dev python /tmp/promote_snis.py --years 2008-2022

Promotes ONLY what SNIS measured, as quality='measured'. Blank cells are dropped
rather than written as zero: SNIS reporting is voluntary and only ~24% of
municipalities report waste tonnage, so a zero would assert that three quarters
of Brazil generates no household waste. Organic mass and sewage sludge are
modelled separately (backend/scripts/derive_snis_estimates.py) and land as
quality='estimated'.

Idempotent: municipality_timeseries' UNIQUE (ibge_code, year, source_id,
variable) turns a re-run into an UPDATE.
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

from ingest.contract import IngestContext  # noqa: E402
from ingest.sources.snis import source as snis  # noqa: E402

RAW_DIR = Path(os.environ.get("INGEST_RAW_DIR", "/app/data/raw"))

UPSERT_SQL = """
INSERT INTO municipality_timeseries
    (ibge_code, year, source_id, variable, value, unit, quality)
VALUES
    (%(ibge_code)s, %(year)s, %(source_id)s, %(variable)s, %(value)s, %(unit)s, %(quality)s)
ON CONFLICT (ibge_code, year, source_id, variable) DO UPDATE
SET value = EXCLUDED.value, unit = EXCLUDED.unit, quality = EXCLUDED.quality
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


def melt(df: pd.DataFrame, year: int, valid: set[str]) -> tuple[list[dict], int]:
    rows: list[dict] = []
    skipped = 0
    for variable, unit in snis.UNIT_BY_VARIABLE.items():
        if variable not in df.columns:
            continue
        series = pd.to_numeric(df[variable], errors="coerce")
        for code, value in zip(df["ibge_code"], series):
            if pd.isna(value):
                continue  # not reported — never written as 0
            if code not in valid:
                skipped += 1
                continue
            rows.append(
                {
                    "ibge_code": str(code),
                    "year": year,
                    "source_id": snis.SPEC.source_id,
                    "variable": variable,
                    "value": float(value),
                    "unit": unit,
                    "quality": "measured",
                }
            )
    return rows, skipped


def parse_years(spec: str) -> list[int]:
    if "-" in spec:
        lo, hi = spec.split("-", 1)
        return list(range(int(lo), int(hi) + 1))
    return [int(spec)]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--year", type=int)
    ap.add_argument("--years", help="inclusive range, e.g. 2008-2022")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if not args.year and not args.years:
        raise SystemExit("pass --year or --years")
    years = parse_years(args.years) if args.years else [args.year]

    conn = psycopg2.connect(dsn())
    try:
        # The spine is the authority on which codes exist. SNIS rows for
        # municipalities we do not have are counted and reported, not inserted —
        # the FK would reject them anyway, and a silent skip would hide a
        # mapping bug.
        with conn.cursor() as cur:
            cur.execute("SELECT ibge_code FROM municipalities")
            valid = {r[0] for r in cur.fetchall()}

        total = 0
        for year in years:
            df = snis.load(year, RAW_DIR)
            ctx = IngestContext(spec=snis.SPEC, year=year)
            results, ctx = snis.validate(df, ctx, raw_dir=RAW_DIR)
            failed = [r for r in results if not r.passed]
            if failed:
                for r in failed:
                    print(f"  {r}")
                raise SystemExit(f"{year}: gates failed — refusing to promote")

            rows, skipped = melt(df, year, valid)
            total += len(rows)
            note = f", {skipped} rows for unknown municipalities skipped" if skipped else ""
            print(f"{year}: {len(df):5d} municipalities -> {len(rows):7d} measured values{note}")

            if not args.dry_run:
                with conn.cursor() as cur:
                    execute_batch(cur, UPSERT_SQL, rows, page_size=1000)
                conn.commit()

        if args.dry_run:
            print(f"\n[dry-run] would write {total:,} rows; nothing committed")
        else:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT count(*), count(DISTINCT ibge_code), count(DISTINCT variable), "
                    "min(year), max(year) FROM municipality_timeseries WHERE source_id = %s",
                    (snis.SPEC.source_id,),
                )
                n, muni, var, y0, y1 = cur.fetchone()
                print(f"\npromoted: {n:,} rows | {muni:,} municipalities | {var} variables | {y0}-{y1}")
    finally:
        conn.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""
Promote the municipality-profile data sources: fetch -> load -> validate -> report -> promote.

    python scripts/promote_profile_data.py --source ibge_censo_idade --year 2022 --dry-run
    python scripts/promote_profile_data.py --source ibge_censo_idade --year 2022
    python scripts/promote_profile_data.py --source ibge_censo_situacao --year 2022
    python scripts/promote_profile_data.py --source ibge_censo_historico --year 2022
    python scripts/promote_profile_data.py --source mapbiomas_cobertura --year 2025 --ufs 35,31

    # in the dev container
    docker exec -w /app cp2b-backend-dev python scripts/promote_profile_data.py --source ...

Sources (backend/ingest/sources/): the three Censo tables are national; the
land cover is loaded for the UFs in --ufs (default São Paulo and Minas Gerais).

ALL OR NOTHING. The report is always written (docs/data/ingest_reports/). If any
gate fails, or with --dry-run, nothing touches the database. Otherwise one
transaction records the load in staging.ingest_runs (the same snapshot again
touches the same row) and writes the data; any error rolls both back.

Raw snapshots live under $INGEST_RAW_DIR (default backend/data/raw). On the
production VM point it at /data/pilar2b_raw, never at the root disk.

Exit codes: 0 promoted (or dry run with every gate green), 1 a gate failed,
2 usage error.
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from ingest.contract import IngestContext  # noqa: E402
from ingest.ledger import record_run  # noqa: E402
from ingest.report import write_report  # noqa: E402
from ingest.runner import DEFAULT_RAW_DIR, DEFAULT_REPORTS_DIR, get_source  # noqa: E402

PROFILE_SOURCES = (
    "ibge_censo_idade",
    "ibge_censo_situacao",
    "ibge_censo_historico",
    "mapbiomas_cobertura",
)
UFS_SOURCES = ("mapbiomas_cobertura",)
METADATA_PATH = BACKEND_DIR.parent / "docs" / "data" / "METADATA.json"


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


def _connect():
    import psycopg2

    return psycopg2.connect(dsn())


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("--source", required=True)
    ap.add_argument("--year", type=int, required=True)
    ap.add_argument("--ufs", help="UF codes, comma-separated (land cover only), e.g. 35,31")
    ap.add_argument("--dry-run", action="store_true", help="validate and report, write nothing")
    ap.add_argument("--raw-dir", default=os.environ.get("INGEST_RAW_DIR", str(DEFAULT_RAW_DIR)))
    ap.add_argument("--reports-dir", default=str(DEFAULT_REPORTS_DIR))
    args = ap.parse_args(argv)

    if args.source not in PROFILE_SOURCES:
        print(f"ERROR: --source must be one of {', '.join(PROFILE_SOURCES)}")
        return 2
    if args.ufs and args.source not in UFS_SOURCES:
        print(
            f"ERROR: --ufs only applies to {', '.join(UFS_SOURCES)}; the Censo sources are national"
        )
        return 2

    source = get_source(args.source)
    raw_dir = Path(args.raw_dir)
    extra = {}
    if args.source in UFS_SOURCES:
        extra["ufs"] = tuple(u.strip() for u in (args.ufs or "35,31").split(",") if u.strip())

    if hasattr(source, "fetch"):
        source.fetch(args.year, raw_dir)
    df = source.load(args.year, raw_dir, **extra)
    print(f"load: {len(df)} rows")

    ctx = IngestContext(spec=source.SPEC, year=args.year, metadata_path=str(METADATA_PATH))
    results, ctx = source.validate(df, ctx)
    report = write_report(results, ctx, args.reports_dir)
    for r in results:
        print(str(r))
    print(f"report: {report}")

    passed = all(r.passed for r in results)
    if not passed:
        print("NOT PROMOTED: a gate failed")
        return 1
    if args.dry_run:
        print("dry run: every gate passed, nothing written")
        return 0

    conn = _connect()
    try:
        run_id = record_run(conn, args.source, args.year, df, passed, str(report))
        written = source.promote(df, conn, run_id, **extra)
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
    print(f"promoted: {written} rows, staging.ingest_runs id {run_id}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

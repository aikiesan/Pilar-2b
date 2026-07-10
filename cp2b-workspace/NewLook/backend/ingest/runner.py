"""
CLI entry point for the ingestion contract.

    python -m ingest.runner list
    python -m ingest.runner run aneel_siga --year 2025 [--step fetch|load|validate|all]

`run` executes fetch -> load -> validate and writes the ingest report.
Promote is deliberately NOT wired into the CLI yet: promotion touches the
real database and should stay a reviewed, manual step until the staging
schema (migration 021+) lands — see BRAZIL_EXPANSION_ROADMAP.md §3.1.
"""

from __future__ import annotations

import argparse
import importlib
import sys
from pathlib import Path

# Registered sources: id -> module path. Adding a source = one line here plus
# a sources/<id>/source.py implementing the contract (see contract.py).
SOURCES: dict[str, str] = {
    "aneel_siga": "ingest.sources.aneel_siga.source",
}

BACKEND_DIR = Path(__file__).resolve().parent.parent
DEFAULT_RAW_DIR = BACKEND_DIR / "data" / "raw"
DEFAULT_REPORTS_DIR = BACKEND_DIR.parent / "docs" / "data" / "ingest_reports"


def get_source(source_id: str):
    if source_id not in SOURCES:
        raise SystemExit(f"unknown source '{source_id}' — known: {', '.join(sorted(SOURCES))}")
    return importlib.import_module(SOURCES[source_id])


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="ingest", description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("list", help="list registered sources")

    run = sub.add_parser("run", help="run fetch/load/validate for one source")
    run.add_argument("source_id")
    run.add_argument("--year", type=int, required=True)
    run.add_argument(
        "--step",
        choices=["fetch", "load", "validate", "all"],
        default="all",
        help="stop after this step (default: all = fetch+load+validate)",
    )
    run.add_argument("--raw-dir", default=str(DEFAULT_RAW_DIR))
    run.add_argument("--reports-dir", default=str(DEFAULT_REPORTS_DIR))

    args = parser.parse_args(argv)

    if args.command == "list":
        for source_id, module in sorted(SOURCES.items()):
            print(f"{source_id:20s} {module}")
        return 0

    source = get_source(args.source_id)
    raw_dir = Path(args.raw_dir)

    if args.step in ("fetch", "all"):
        snapshot = source.fetch(args.year, raw_dir)
        print(f"fetch: snapshot at {snapshot}")
        if args.step == "fetch":
            return 0

    df = source.load(args.year, raw_dir)
    print(f"load: {len(df)} rows, columns: {list(df.columns)}")
    if args.step == "load":
        return 0

    # Build the default context here so it carries the real year — sources
    # fall back to IngestContext(year=0) when given None, which mislabels the
    # report filename (<source>_0.md instead of <source>_<year>.md).
    from ingest.contract import IngestContext  # local import keeps CLI startup cheap

    ctx = IngestContext(spec=source.SPEC, year=args.year)
    results, ctx = source.validate(df, ctx)
    from ingest.report import write_report

    report_path = write_report(results, ctx, args.reports_dir)
    for r in results:
        print(str(r))
    print(f"report: {report_path}")
    return 0 if all(r.passed for r in results) else 1


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""Export everything PILAR-2b holds about one municipality, as XLSX + JSON.

The golden-standard extraction: run it for Lençóis Paulista (3526803) and the
workbook is the reference for what a municipal report may contain.

    python -m scripts.export_municipality_dossier 3526803
    python -m scripts.export_municipality_dossier 3526803 --out-dir exports/

Reads through app.services.municipality_dossier, the same gatherer the download
buttons use, so the CLI output and the in-app export cannot diverge.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

import psycopg2

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.municipality_dossier import collect, geojson, identity, state_outline  # noqa: E402
from app.services.municipality_exports import ascii_slug, build_pdf, build_workbook  # noqa: E402


def _default_dsn() -> str:
    return os.environ.get(
        "DATABASE_URL", "postgresql://postgres:password@localhost:5432/cp2b_maps"
    )


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("ibge_code", help="7-digit IBGE municipality code, e.g. 3526803")
    ap.add_argument("--out-dir", default="exports", help="where to write (default: exports/)")
    ap.add_argument("--json", action="store_true", help="also write the raw sections as JSON")
    args = ap.parse_args()

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    with psycopg2.connect(_default_dsn()) as conn:
        who = identity(conn, args.ibge_code)
        if who is None:
            print(f"no municipality with ibge_code {args.ibge_code}", file=sys.stderr)
            return 1
        sections = collect(conn, args.ibge_code)
        shape = geojson(conn, args.ibge_code, "detail")
        outline = state_outline(conn, who["uf"])

    stem = f"{args.ibge_code}_{ascii_slug(who['municipality_name'])}"

    xlsx_path = out_dir / f"{stem}.xlsx"
    xlsx_path.write_bytes(build_workbook(sections, who))

    pdf_path = out_dir / f"{stem}.pdf"
    pdf_path.write_bytes(build_pdf(sections, who, shape, outline))

    print(f"{who['municipality_name']} ({who['uf']}) — {args.ibge_code}")
    for name, rows in sections.items():
        width = len(rows[0]) if rows else 0
        print(f"  {name:28s} {len(rows):4d} row(s) x {width:3d} column(s)")
    print(f"  {'geometry':28s} {'yes' if shape else 'MISSING':>4s}")
    print(f"\nwrote {xlsx_path}")
    print(f"wrote {pdf_path}")

    if args.json:
        json_path = out_dir / f"{stem}.json"
        payload = {"identity": who, "sections": sections, "geometry": json.loads(shape) if shape else None}
        json_path.write_text(json.dumps(payload, indent=2, default=str), encoding="utf-8")
        print(f"wrote {json_path}")

    return 0


if __name__ == "__main__":
    sys.exit(main())

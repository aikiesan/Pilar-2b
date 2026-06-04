#!/usr/bin/env python3
"""
load_biomass_from_master.py
===========================
Populate municipality biomass columns DIRECTLY from the authoritative
per-municipality residue tonnage table — no reverse-BMP backwards calculation.

Source:
  CP2B_HANDOFF/01_master_residue_streams_SP_2023.csv  (column residue_tons_yr)

This replaces the reverse-BMP approach in load_biomass_tons.py for the biomass
availability map: real residue tonnage is the source of record.

Always writes a reviewable artifact:
  <out>/municipality_biomass_tons.csv   (per municipality: per-residue + sector + total)

With --apply and Supabase credentials configured, also UPDATEs the
municipalities table biomass columns (biogas columns are never touched).

Usage:
  python scripts/load_biomass_from_master.py                 # write review CSV only
  python scripts/load_biomass_from_master.py --apply         # also update Supabase
  python scripts/load_biomass_from_master.py --csv X --out Y
"""

from __future__ import annotations

import argparse
import csv
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.biomass_availability import RESIDUE_BIOMASS_CONFIGS, SECTOR_FIELDS  # noqa: E402
from app.services.biomass_import import build_municipality_biomass  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

_DEFAULT_CSV = (
    Path(__file__).parent.parent.parent.parent.parent
    / "CP2B_HANDOFF"
    / "01_master_residue_streams_SP_2023.csv"
)

_BIOMASS_FIELDS = [c.biomass_field for c in RESIDUE_BIOMASS_CONFIGS]
_ALL_FIELDS = _BIOMASS_FIELDS + list(SECTOR_FIELDS.values()) + ["total_biomass_tons_year"]


def read_master(csv_path: Path) -> list[dict]:
    with open(csv_path, encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def write_review_csv(biomass: dict[str, dict[str, float]], names: dict[str, str], out_path: Path):
    out_path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = ["ibge_code", "municipality_name"] + _ALL_FIELDS
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for ibge in sorted(biomass):
            row = {"ibge_code": ibge, "municipality_name": names.get(ibge, "")}
            row.update({k: biomass[ibge].get(k, 0.0) for k in _ALL_FIELDS})
            writer.writerow(row)


def apply_to_supabase(biomass: dict[str, dict[str, float]]):
    from app.services.supabase_client import get_supabase_client  # lazy import

    supabase = get_supabase_client()
    updated = 0
    for ibge, rec in biomass.items():
        payload = {k: rec[k] for k in _ALL_FIELDS}
        # match on IBGE code column (adjust column name if the schema differs)
        supabase.table("municipalities").update(payload).eq("ibge_code", ibge).execute()
        updated += 1
        if updated % 100 == 0:
            logger.info(f"  updated {updated}/{len(biomass)}")
    logger.info(f"Applied biomass to {updated} municipalities (biogas columns untouched).")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--csv", default=str(_DEFAULT_CSV))
    parser.add_argument("--out", default=str(Path(__file__).parent / "canonical_recalc_output"))
    parser.add_argument("--apply", action="store_true", help="write to Supabase (needs creds)")
    args = parser.parse_args()

    csv_path = Path(args.csv)
    if not csv_path.exists():
        logger.error(f"master CSV not found: {csv_path}")
        sys.exit(1)

    rows = read_master(csv_path)
    names = {str(r.get("ibge_code", "")).strip(): r.get("municipality_name", "") for r in rows}
    biomass = build_municipality_biomass(rows)

    out_path = Path(args.out) / "municipality_biomass_tons.csv"
    write_review_csv(biomass, names, out_path)

    # state summary per residue
    totals = {k: sum(rec.get(k, 0.0) for rec in biomass.values()) for k in _ALL_FIELDS}
    print(f"\nDirect biomass import — {len(biomass)} municipalities (no reverse-BMP)")
    print("=" * 64)
    for cfg in RESIDUE_BIOMASS_CONFIGS:
        t = totals[cfg.biomass_field]
        flag = "" if t > 0 else "  (no tonnage in master table — supply later)"
        print(f"  {cfg.key:<12}{t:>18,.0f} t/yr{flag}")
    print("-" * 64)
    print(f"  {'TOTAL':<12}{totals['total_biomass_tons_year']:>18,.0f} t/yr")
    print(f"\nReview artifact: {out_path}")

    if args.apply:
        apply_to_supabase(biomass)
    else:
        print("\n(dry run — re-run with --apply and Supabase creds to update the map DB)")


if __name__ == "__main__":
    main()

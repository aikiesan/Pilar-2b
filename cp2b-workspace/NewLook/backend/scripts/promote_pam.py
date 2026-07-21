"""
Promote IBGE PAM crop production into the national biomass columns.

    docker cp backend/scripts/promote_pam.py cp2b-backend-dev:/tmp/
    docker exec cp2b-backend-dev sh -c "cd /app && python /tmp/promote_pam.py --year 2023 --dry-run"
    docker exec cp2b-backend-dev sh -c "cd /app && python /tmp/promote_pam.py --year 2023"

Closes the last national data gap: before this, all five crop streams were São
Paulo only (645 of 5,571 municipalities) while agriculture is ~77% of the
modelled potential, so Mato Grosso, Paraná and Goiás rendered as no_data.

WHAT IT WRITES, PER MUNICIPALITY PER CROP, IN ONE TRANSACTION
  1. municipality_timeseries — PAM production as reported, unit 't'
     (source_id 'pam_1612'/'pam_1613'). The audit trail: what IBGE published,
     unconverted, so any future change of factors can be re-derived from it.
  2. municipalities.{crop}_biomass_tons_year — RESIDUE tonnes, = production × RPR
  3. municipality_biomass_provenance — one row, quality 'measured'
  4. rollups: agricultural_biomass_tons_year, total_biomass_tons_year

WHY THE COLUMN STORES RESIDUE, NOT PRODUCTION
The map reads {crop}_biomass_tons_year and feeds it straight into the FDE/BMP
chain as the substrate — it applies no residue step. Storing production there
would silently claim every tonne of grain is digestible feedstock.

Before this script the five columns disagreed with each other: sugarcane and
citrus held raw production (with residue fractions applied downstream, in
compute_sp_canonical_totals.py only) while soybean, corn and coffee held residue.
The same column therefore meant different things depending on which code path
read it, and the two could not both be right. All five now mean the same thing:
RESIDUE, wet tonnes/year, with the ratio taken from feedstocks.yaml `rpr` via
canonical_loader.residue_tons_from_production — one cited home, read by every
path.

RPR IS GROSS, FDE IS SEPARATE
`rpr` is physical generation per tonne of crop. Collectability, soil-cover
retention and competing uses live in the fde block and are applied downstream.
Folding either into the other double-discounts the residue — the bug that made
cana palha 0.053 instead of its gross 0.14 t DM/t.

SUGARCANE IS DELIBERATELY EXCLUDED (--include-sugarcane to override)
Cane does not have one denominator. Its sub-streams are physically generated at
different stages:
    bagaço, torta   <- cane CRUSHED at a mill (UNICA moagem)
    vinhaça         <- ETHANOL distilled (m³ × 12 m³/m³)
    palha           <- cane HARVESTED in the field (PAM production)
PAM production overstates the milled fraction by ~15% (17-year UNICA series:
moagem/production = 0.76–0.92, mean ~0.85), so driving bagaço and vinhaça off it
inflates the largest stream on the platform. Cane lands in a follow-up once the
moagem and ethanol series are ingested.

CONFIDENTIAL VALUES ARE NOT ZERO
IBGE withholds ('X') ~19.8k municipality-years to protect informants, heavily
concentrated in café and laranja. Those arrive as NULL and are DROPPED here — no
column value, no provenance row, so the map shows no_data. Writing 0 would assert
the municipality grows no coffee, which is exactly false.
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

import pandas as pd
import psycopg2

sys.path.insert(0, "/app")

from app.services.canonical_loader import residue_tons_from_production  # noqa: E402
from ingest.contract import IngestContext  # noqa: E402
from ingest.sources.pam_1612 import source as pam1612  # noqa: E402
from ingest.sources.pam_1613 import source as pam1613  # noqa: E402

RAW_DIR = Path(os.environ.get("INGEST_RAW_DIR", "/app/data/raw"))

# stream -> (module, production column, source_id)
CROPS: dict[str, tuple[object, str, str]] = {
    "soybean": (pam1612, "soybean_production_t", "pam_1612"),
    "corn": (pam1612, "corn_production_t", "pam_1612"),
    "coffee": (pam1613, "coffee_production_t", "pam_1613"),
    "citrus": (pam1613, "citrus_production_t", "pam_1613"),
    "sugarcane": (pam1612, "sugarcane_production_t", "pam_1612"),
}
DEFAULT_CROPS = ("soybean", "corn", "coffee", "citrus")

TIMESERIES_SQL = """
INSERT INTO municipality_timeseries
    (ibge_code, year, source_id, variable, value, unit, quality)
VALUES (%(ibge_code)s, %(year)s, %(source_id)s, %(variable)s, %(value)s, 't', 'measured')
ON CONFLICT (ibge_code, year, source_id, variable) DO UPDATE
SET value = EXCLUDED.value, unit = EXCLUDED.unit, quality = EXCLUDED.quality
"""

PROVENANCE_SQL = """
INSERT INTO municipality_biomass_provenance
    (ibge_code, stream, source_id, reference_year, quality)
VALUES (%(ibge_code)s, %(stream)s, %(source_id)s, %(year)s, 'measured')
ON CONFLICT (ibge_code, stream) DO UPDATE
SET source_id = EXCLUDED.source_id,
    reference_year = EXCLUDED.reference_year,
    quality = EXCLUDED.quality
"""

ROLLUP_SQL = """
UPDATE municipalities SET
    agricultural_biomass_tons_year = COALESCE(sugarcane_biomass_tons_year, 0)
        + COALESCE(soybean_biomass_tons_year, 0) + COALESCE(corn_biomass_tons_year, 0)
        + COALESCE(coffee_biomass_tons_year, 0) + COALESCE(citrus_biomass_tons_year, 0),
    total_biomass_tons_year = COALESCE(sugarcane_biomass_tons_year, 0)
        + COALESCE(soybean_biomass_tons_year, 0) + COALESCE(corn_biomass_tons_year, 0)
        + COALESCE(coffee_biomass_tons_year, 0) + COALESCE(citrus_biomass_tons_year, 0)
        + COALESCE(livestock_biomass_tons_year, 0) + COALESCE(urban_biomass_tons_year, 0)
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


def build_rows(year: int, crops: tuple[str, ...]) -> tuple[list[dict], list[dict], dict]:
    """Load each PAM table once, then derive timeseries/column/provenance rows."""
    frames: dict[object, pd.DataFrame] = {}
    timeseries: list[dict] = []
    columns: list[dict] = []
    summary: dict[str, dict[str, float]] = {}

    for stream in crops:
        module, production_column, source_id = CROPS[stream]
        if module not in frames:
            frames[module] = module.load(year, RAW_DIR)
        frame = frames[module]

        produced = residue = 0.0
        written = 0
        for code, value in zip(frame["ibge_code"], frame[production_column]):
            if pd.isna(value):
                continue  # '..' not surveyed, or 'X' withheld — never a zero
            production = float(value)
            residue_tons = residue_tons_from_production(stream, production).medio

            timeseries.append(
                {
                    "ibge_code": str(code),
                    "year": year,
                    "source_id": source_id,
                    "variable": f"{stream}_producao",
                    "value": production,
                }
            )
            columns.append(
                {
                    "ibge_code": str(code),
                    "stream": stream,
                    "source_id": source_id,
                    "year": year,
                    "residue": residue_tons,
                }
            )
            produced += production
            residue += residue_tons
            written += 1

        summary[stream] = {
            "municipalities": written,
            "production_Mt": produced / 1e6,
            "residue_Mt": residue / 1e6,
        }
    return timeseries, columns, summary


def promote(year: int, crops: tuple[str, ...], dry_run: bool) -> int:
    timeseries, columns, summary = build_rows(year, crops)

    print(f"\nPAM {year} — {'DRY RUN' if dry_run else 'PROMOTING'}")
    print(f"{'crop':10s} {'municipalities':>15s} {'production Mt':>15s} {'residue Mt':>13s}")
    for stream, s in summary.items():
        print(
            f"{stream:10s} {s['municipalities']:15,.0f} "
            f"{s['production_Mt']:15,.2f} {s['residue_Mt']:13,.2f}"
        )
    print(f"\ntimeseries rows: {len(timeseries):,}   column/provenance rows: {len(columns):,}")

    if dry_run:
        print("\ndry run — nothing written")
        return 0

    connection = psycopg2.connect(dsn())
    try:
        with connection, connection.cursor() as cursor:
            cursor.executemany(TIMESERIES_SQL, timeseries)
            # One UPDATE per crop, not per row: psycopg2 cannot parameterise a
            # column name, so the crop is interpolated from the CROPS keys above
            # (never from user input) and the values are bound normally.
            for stream in crops:
                rows = [c for c in columns if c["stream"] == stream]
                cursor.executemany(
                    f"UPDATE municipalities SET {stream}_biomass_tons_year = %(residue)s "
                    "WHERE ibge_code = %(ibge_code)s",
                    rows,
                )
            cursor.executemany(PROVENANCE_SQL, columns)
            cursor.execute(ROLLUP_SQL)
        print("\ncommitted (single transaction)")
    finally:
        connection.close()
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--year", type=int, required=True)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument(
        "--include-sugarcane",
        action="store_true",
        help="promote cane off PAM production too — see the module docstring for why "
        "its sub-streams need moagem and ethanol denominators instead",
    )
    args = parser.parse_args()

    crops = DEFAULT_CROPS + (("sugarcane",) if args.include_sugarcane else ())

    # Gates must pass before anything is written — the promote step never
    # revalidates on its own (ingest/README.md).
    for module in {CROPS[c][0] for c in crops}:
        ctx = IngestContext(spec=module.SPEC, year=args.year)
        frame = module.load(args.year, RAW_DIR)
        results, _ = module.validate(frame, ctx)
        failed = [r for r in results if not r.passed]
        if failed:
            print(f"GATES FAILED for {module.SPEC.source_id}:", file=sys.stderr)
            for r in failed:
                print(f"  {r}", file=sys.stderr)
            return 1
        print(f"gates green: {module.SPEC.source_id}")

    return promote(args.year, crops, args.dry_run)


if __name__ == "__main__":
    raise SystemExit(main())

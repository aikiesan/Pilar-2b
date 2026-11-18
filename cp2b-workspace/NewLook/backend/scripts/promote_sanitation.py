"""
Promote municipal sanitation data (SNIS to 2022, SINISA from 2023) from the bbp schema.

    docker compose run --rm --no-deps backend python scripts/promote_sanitation.py --survey SNIS --years 2008-2022 --parity
    docker compose run --rm --no-deps backend python scripts/promote_sanitation.py --survey SINISA --years 2023-2024 --impact
    docker compose run --rm --no-deps backend python scripts/promote_sanitation.py --survey SINISA --years 2023-2024 --dry-run
    docker compose run --rm --no-deps backend python scripts/promote_sanitation.py --survey SINISA --years 2023-2024

The Biomass Brasil Pipeline (bbp) reads both surveys, checks every year against
the survey's own published totals, and maps their fields onto ONE set of
harmonised variables (bbp config/sanitation.yaml — SNIS CO119 and SINISA GTR1028
are both `msw_collected_t`, with the glossary evidence for each pair). Here
those variables get the platform's existing timeseries names, so the series runs
on across the 2023 system change; `source_id` ('snis' / 'sinisa') says which
survey measured each row.

MODES
  --parity  read-only. Compares bbp's SNIS rows with the rows promote_snis.py
            already wrote. Zero differences means bbp's parser IS the platform's.
  --impact  read-only. What promoting SINISA would change in the map's
            latest-year reader (_load_activity_counts reads the newest
            non-preliminary year of a variable, whatever its source): how many
            municipalities change value and how the totals move.
  (none)    upserts the rows, quality 'measured'. Blank is not zero: a variable a
            municipality did not report is simply absent.

Idempotent: UNIQUE (ibge_code, year, source_id, variable) turns a re-run into an UPDATE.
"""

from __future__ import annotations

import argparse
import os
import sys

import psycopg2
from psycopg2.extras import execute_batch

sys.path.insert(0, "/app")

from ingest import bbp as bbp_source  # noqa: E402

# bbp harmonised variable -> (municipality_timeseries variable, unit). The names
# are the ones promote_snis.py has always written, so SNIS and SINISA rows of
# the same quantity share a variable and differ only in source_id.
VARIABLES: dict[str, tuple[str, str]] = {
    "msw_collected_t": ("rdo_rpu_coletado", "t"),
    "household_collected_t": ("rdo_coletado", "t"),
    "public_cleaning_collected_t": ("rpu_coletado", "t"),
    "selective_collected_t": ("coleta_seletiva", "t"),
    "recovered_t": ("reciclaveis_total", "t"),
    "recovered_paper_t": ("reciclaveis_papel", "t"),
    "recovered_plastic_t": ("reciclaveis_plastico", "t"),
    "recovered_metal_t": ("reciclaveis_metal", "t"),
    "recovered_glass_t": ("reciclaveis_vidro", "t"),
    "sewage_collected_1000m3": ("esgoto_coletado", "mil_m3"),
    "sewage_treated_1000m3": ("esgoto_tratado", "mil_m3"),
    "population_total": ("populacao_total", "inhabitants"),
    "population_urban": ("populacao_urbana", "inhabitants"),
}
SOURCE_ID = {"SNIS": "snis", "SINISA": "sinisa"}

# Variables the map reads as "latest year, any source" (municipalities.py
# _ACTIVITY_VARIABLES). Promoting a newer survey year moves these.
MAP_VARIABLES = ("rdo_coletado", "populacao_total")

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


def parse_years(spec: str) -> list[int]:
    if "-" in spec:
        lo, hi = spec.split("-", 1)
        return list(range(int(lo), int(hi) + 1))
    return [int(spec)]


def to_rows(
    reading: dict[str, dict[str, float]], year: int, survey: str, valid: set[str]
) -> tuple[list[dict], int, list[str]]:
    """bbp reading -> timeseries rows. Returns (rows, skipped unknown municipalities, unmapped variables)."""
    rows, skipped, unmapped = [], 0, set()
    for code, values in reading.items():
        if code not in valid:
            skipped += 1
            continue
        for variable, value in values.items():
            if variable not in VARIABLES:
                unmapped.add(variable)
                continue
            name, unit = VARIABLES[variable]
            rows.append(
                {
                    "ibge_code": code,
                    "year": year,
                    "source_id": SOURCE_ID[survey],
                    "variable": name,
                    "value": value,
                    "unit": unit,
                    "quality": "measured",
                }
            )
    return rows, skipped, sorted(unmapped)


def parity(cur, rows: list[dict], year: int) -> dict[str, int]:
    """bbp rows vs the 'snis' rows already in municipality_timeseries for that year."""
    cur.execute(
        "SELECT ibge_code, variable, value FROM municipality_timeseries "
        "WHERE source_id = 'snis' AND year = %s",
        (year,),
    )
    have = {(c, v): val for c, v, val in cur.fetchall()}
    ours = {(r["ibge_code"], r["variable"]): r["value"] for r in rows}
    diff = [
        k
        for k in ours.keys() & have.keys()
        if abs(ours[k] - have[k]) > 1e-6 * max(1.0, abs(have[k]))
    ]
    return {
        "both": len(ours.keys() & have.keys()),
        "different": len(diff),
        "only_bbp": len(ours.keys() - have.keys()),
        "only_db": len(have.keys() - ours.keys()),
    }


def latest(cur, variable: str, extra: list[dict] | None = None) -> dict[str, float]:
    """Latest non-preliminary value per municipality — the map's reader — optionally with `extra` rows."""
    cur.execute(
        "SELECT DISTINCT ON (ibge_code) ibge_code, year, value FROM municipality_timeseries "
        "WHERE variable = %s AND quality <> 'preliminary' AND value IS NOT NULL "
        "ORDER BY ibge_code, year DESC",
        (variable,),
    )
    best = {c: (y, float(v)) for c, y, v in cur.fetchall()}
    for r in extra or []:
        if r["variable"] == variable and (
            r["ibge_code"] not in best or r["year"] >= best[r["ibge_code"]][0]
        ):
            best[r["ibge_code"]] = (r["year"], r["value"])
    return {c: v for c, (_, v) in best.items()}


def impact(cur, rows: list[dict]) -> None:
    for variable in MAP_VARIABLES:
        before, after = latest(cur, variable), latest(cur, variable, rows)
        changed = [
            c
            for c in after
            if c in before and abs(after[c] - before[c]) > 1e-6 * max(1.0, before[c])
        ]
        new = [c for c in after if c not in before]
        tb = sum(before.values())
        ta = sum(after.values())
        print(
            f"  {variable:16s} municipalities {len(before):,} -> {len(after):,} "
            f"(+{len(new):,} new, {len(changed):,} change value); "
            f"sum {tb:,.0f} -> {ta:,.0f} ({(ta / tb - 1) if tb else 0:+.1%})"
        )


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--survey", choices=sorted(SOURCE_ID), required=True)
    ap.add_argument("--years", required=True, help="a year or an inclusive range, e.g. 2023-2024")
    mode = ap.add_mutually_exclusive_group()
    mode.add_argument(
        "--parity", action="store_true", help="compare with the 'snis' rows already in the DB"
    )
    mode.add_argument(
        "--impact", action="store_true", help="what the map's latest-year reader would change"
    )
    mode.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    if args.parity and args.survey != "SNIS":
        raise SystemExit(
            "--parity compares against promote_snis.py rows: use it with --survey SNIS"
        )

    conn = psycopg2.connect(dsn())
    try:
        print(f"source: bbp release {bbp_source.current_release(conn)}")
        with conn.cursor() as cur:
            cur.execute("SELECT ibge_code FROM municipalities")
            valid = {r[0] for r in cur.fetchall()}

        all_rows, total = [], {"both": 0, "different": 0, "only_bbp": 0, "only_db": 0}
        for year in parse_years(args.years):
            reading = bbp_source.read_sanitation(conn, year, args.survey)
            if not reading:
                raise SystemExit(f"{args.survey} {year}: nothing in bbp.v_sanitation for this year")
            rows, skipped, unmapped = to_rows(reading, year, args.survey, valid)
            if unmapped:
                raise SystemExit(
                    f"{year}: bbp variables with no platform name: {unmapped} — add them to VARIABLES"
                )
            note = f", {skipped} unknown municipalities skipped" if skipped else ""
            print(
                f"{args.survey} {year}: {len(reading):5d} municipalities -> {len(rows):7d} values{note}"
            )
            if args.parity:
                with conn.cursor() as cur:
                    p = parity(cur, rows, year)
                total = {k: total[k] + p[k] for k in total}
                print(f"    parity: {p}")
            all_rows.extend(rows)

        if args.parity:
            print(f"\nparity {args.years}: {total}")
            return 0 if total["different"] == total["only_bbp"] == total["only_db"] == 0 else 1
        if args.impact:
            print("\nmap latest-year reader, before -> after promoting:")
            with conn.cursor() as cur:
                impact(cur, all_rows)
            return 0
        if args.dry_run:
            print(f"\n[dry-run] would write {len(all_rows):,} rows; nothing committed")
            return 0
        with conn.cursor() as cur:
            execute_batch(cur, UPSERT_SQL, all_rows, page_size=1000)
        conn.commit()
        print(f"\npromoted {len(all_rows):,} rows (source_id '{SOURCE_ID[args.survey]}')")
    finally:
        conn.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())

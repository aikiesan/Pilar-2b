#!/usr/bin/env python3
"""
Load truck reach (scripts/build_truck_reach.py output) into the truck_* tables
of migration 042.

Usage:
    DATABASE_URL=postgresql://... python scripts/load_truck_reach.py \\
        --file /path/to/truck_reach.json.gz

    --dry-run   read and report, write nothing

Idempotent: one transaction replaces every site, reach row, route and the
build row, so a site a new build leaves out (closed since) does not linger.
"""

from __future__ import annotations

import argparse
import gzip
import json
import os
import sys
import time
from pathlib import Path

import psycopg2
from psycopg2.extras import Json, execute_values

# Never loaded, whatever the file holds: unpublished per-site model results.
SITE_FIELDS = (
    "site_id",
    "name",
    "tipo",
    "ibge_code",
    "municipio",
    "lon",
    "lat",
    "snap_m",
    "at_town_centre",
)


def read_build(path: Path) -> dict:
    with gzip.open(path, "rt", encoding="utf-8") as fh:
        data = json.load(fh)
    for key in ("meta", "sites", "reach", "routes"):
        if key not in data:
            raise SystemExit(f"{path} has no '{key}': not a build_truck_reach.py output")
    ids = {s["site_id"] for s in data["sites"]}
    missing = ids - set(data["routes"])
    if missing:
        raise SystemExit(f"{len(missing)} sites have no route, e.g. {sorted(missing)[0]}")
    return data


def site_rows(data: dict) -> list[tuple]:
    return [tuple(s[k] for k in SITE_FIELDS) for s in data["sites"]]


def write(conn, data: dict) -> dict:
    meta = data["meta"]
    with conn.cursor() as cur:
        cur.execute("DELETE FROM truck_site")  # cascades to truck_reach and truck_route
        execute_values(
            cur,
            "INSERT INTO truck_site (site_id, name, tipo, ibge_code, municipio, geom, snap_m, "
            "at_town_centre) VALUES %s",
            site_rows(data),
            template="(%s, %s, %s, %s, %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326), %s, %s)",
        )
        execute_values(
            cur,
            "INSERT INTO truck_reach (site_id, ibge_code, minutes, km) VALUES %s",
            [tuple(r) for r in data["reach"]],
            page_size=5000,
        )
        execute_values(
            cur,
            "INSERT INTO truck_route (site_id, tree, pipeline, built_at, graph_source) VALUES %s",
            [
                (
                    sid,
                    Json(r["tree"]),
                    # No pipeline within reach: SQL NULL, not the JSON value null.
                    Json(r["pipeline"]) if r["pipeline"] is not None else None,
                    meta["built_at"],
                    meta["graph_source"],
                )
                for sid, r in data["routes"].items()
            ],
            page_size=50,
        )
        cur.execute(
            """
            INSERT INTO truck_build (id, built_at, graph_source, caps, other_cap,
                                     town_limit_min, pipeline_limit_min, grid_m)
            VALUES (TRUE, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                built_at = EXCLUDED.built_at, graph_source = EXCLUDED.graph_source,
                caps = EXCLUDED.caps, other_cap = EXCLUDED.other_cap,
                town_limit_min = EXCLUDED.town_limit_min,
                pipeline_limit_min = EXCLUDED.pipeline_limit_min, grid_m = EXCLUDED.grid_m
            """,
            (
                meta["built_at"],
                meta["graph_source"],
                Json(meta["caps"]),
                meta["other_cap"],
                meta["town_limit_min"],
                meta["pipeline_limit_min"],
                meta["grid_m"],
            ),
        )
    conn.commit()
    return {"sites": len(data["sites"]), "reach": len(data["reach"]), "routes": len(data["routes"])}


def main() -> int:
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("--file", required=True, type=Path)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    if not args.file.exists():
        print(f"ERROR: {args.file} not found")
        return 1

    t0 = time.monotonic()
    data = read_build(args.file)
    print(
        f"Read {len(data['sites'])} sites, {len(data['reach'])} town routes, "
        f"built {data['meta']['built_at']}"
    )
    if args.dry_run:
        return 0
    url = os.getenv("DATABASE_URL")
    if not url:
        print("ERROR: set DATABASE_URL")
        return 1
    with psycopg2.connect(url) as conn:
        written = write(conn, data)
    print(f"Wrote {written} in {time.monotonic() - t0:.1f} s")
    return 0


if __name__ == "__main__":
    sys.exit(main())

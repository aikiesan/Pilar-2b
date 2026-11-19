#!/usr/bin/env python3
"""Fill municipalities.geometry_map (migration 039): outlines for the map.

The full outline of each municipality is simplified with mapshaper, which
keeps the borders neighbours share as single arcs: each border is simplified
once, so two neighbours still meet on the same line, with no slivers or
overlaps. PostGIS could do the same with ST_CoverageSimplify, but that needs
GEOS >= 3.12 and production runs 3.11.

    DATABASE_URL=postgresql://... .venv/bin/python scripts/build_map_geometry.py
    ... --ufs 35,31 --interval 120 --dry-run

Needs Node (npx downloads the pinned mapshaper the first time). Writes inside a
single transaction and only commits if every outline came back valid and
non-empty; a failure leaves the column as it was. Safe to re-run: it rebuilds
the column for the states asked for. After it, restart the backend so the
GeoJSON cache is rebuilt.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import psycopg2
from psycopg2.extras import execute_values

MAPSHAPER = "mapshaper@0.6.102"

# Measured on SP+MG, 19/11/2026: 120 m gives ~235 vertices per municipality
# (overview had 12, detail 36), ~2.5 MB gzipped for the map, and borders that
# follow the real outline at the zooms /map is used at. 60 m doubles the size
# for a difference that is hard to see; 200 m starts to cut corners again.
DEFAULT_INTERVAL_M = 120


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument(
        "--ufs",
        default=os.getenv("MAP_ENABLED_UF_PREFIXES", "35,31"),
        help="IBGE state prefixes to build, comma-separated (default: the map's, 35,31)",
    )
    parser.add_argument(
        "--interval",
        type=int,
        default=DEFAULT_INTERVAL_M,
        help=f"mapshaper simplification interval in metres (default {DEFAULT_INTERVAL_M})",
    )
    parser.add_argument(
        "--dry-run", action="store_true", help="build and check, but roll back instead of saving"
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    url = os.environ.get("DATABASE_URL")
    if not url:
        # No development default here: this script writes, and the wrong
        # database would be silently rewritten.
        print("DATABASE_URL is not set.", file=sys.stderr)
        return 2
    ufs = [u.strip() for u in args.ufs.split(",") if re.fullmatch(r"\d{2}", u.strip())]
    if not ufs:
        print(f"--ufs has no valid two-digit prefix: {args.ufs!r}", file=sys.stderr)
        return 2
    npx = shutil.which("npx")
    if not npx:
        print("npx not found: mapshaper runs on Node.", file=sys.stderr)
        return 2

    conn = psycopg2.connect(url)
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' "
                "AND table_name = 'municipalities' AND column_name = 'geometry_map'"
            )
            if cur.fetchone() is None:
                print("Column geometry_map missing: apply migration 039 first.", file=sys.stderr)
                return 2

            with tempfile.TemporaryDirectory(prefix="pilar-map-geom-") as tmp:
                src, out = Path(tmp) / "full.geojson", Path(tmp) / "map.geojson"
                cur.execute(
                    """
                    SELECT json_build_object(
                        'type', 'FeatureCollection',
                        'features', json_agg(json_build_object(
                            'type', 'Feature',
                            'properties', json_build_object('ibge_code', ibge_code),
                            'geometry', ST_AsGeoJSON(geometry, 6)::json)))
                    FROM municipalities
                    WHERE geometry IS NOT NULL AND LEFT(ibge_code::text, 2) = ANY(%s)
                    """,
                    (ufs,),
                )
                collection = cur.fetchone()[0]
                features = (collection or {}).get("features") or []
                if not features:
                    print(f"No municipality with geometry for {ufs}.", file=sys.stderr)
                    return 1
                src.write_text(json.dumps(collection), encoding="utf-8")
                print(f"exported {len(features)} outlines for {','.join(ufs)}")

                # snap: joins vertices a hair apart so shared borders become one
                # arc; keep-shapes: never lets a small municipality vanish.
                env = {**os.environ, "NODE_OPTIONS": "--max-old-space-size=4096"}
                subprocess.run(
                    [
                        npx,
                        "-y",
                        MAPSHAPER,
                        "-i",
                        str(src),
                        "snap",
                        "-simplify",
                        f"interval={args.interval}",
                        "keep-shapes",
                        "-o",
                        str(out),
                        # No precision= here: rounding after simplifying can make a
                        # ring touch itself, and the repair below would then redraw
                        # one side of a shared border. The API rounds on output.
                        "format=geojson",
                    ],
                    check=True,
                    env=env,
                )
                simplified = json.loads(out.read_text(encoding="utf-8"))["features"]

            expected = {str(f["properties"]["ibge_code"]) for f in features}
            got = {str(f["properties"]["ibge_code"]) for f in simplified}
            if got != expected:
                print(
                    f"mapshaper lost or added outlines: {sorted(expected ^ got)[:10]}",
                    file=sys.stderr,
                )
                return 1

            # One round-trip: load every outline into a temp table, then a single
            # UPDATE ... FROM.
            cur.execute(
                "CREATE TEMP TABLE map_geom (ibge_code text PRIMARY KEY, geom geometry) "
                "ON COMMIT DROP"
            )
            execute_values(
                cur,
                "INSERT INTO map_geom (ibge_code, geom) VALUES %s",
                [
                    (str(f["properties"]["ibge_code"]), json.dumps(f["geometry"]))
                    for f in simplified
                ],
                template="(%s, ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326))",
                page_size=500,
            )
            # ST_MakeValid repairs each outline on its own, so a repaired one may no
            # longer meet its neighbours on the same line. Name them, so the border
            # can be looked at; it does not block the save.
            cur.execute("SELECT ibge_code FROM map_geom WHERE NOT ST_IsValid(geom) ORDER BY 1")
            repaired = [r[0] for r in cur.fetchall()]
            if repaired:
                print(
                    f"warning: {len(repaired)} outlines came back invalid from mapshaper and "
                    f"were repaired with ST_MakeValid; check their borders: {repaired[:20]}",
                    file=sys.stderr,
                )
            cur.execute("""
                UPDATE municipalities m SET geometry_map = ST_Multi(ST_CollectionExtract(
                    ST_MakeValid(t.geom), 3))
                FROM map_geom t
                WHERE m.ibge_code::text = t.ibge_code
                """)

            cur.execute(
                """
                SELECT count(*) FILTER (WHERE geometry_map IS NOT NULL),
                       count(*) FILTER (WHERE geometry_map IS NULL OR ST_IsEmpty(geometry_map)
                                          OR NOT ST_IsValid(geometry_map)),
                       round(avg(ST_NPoints(geometry_map)))
                FROM municipalities
                WHERE geometry IS NOT NULL AND LEFT(ibge_code::text, 2) = ANY(%s)
                """,
                (ufs,),
            )
            built, bad, avg_vertices = cur.fetchone()
            print(f"built {built}, invalid or empty {bad}, average {avg_vertices} vertices")
            if bad:
                conn.rollback()
                print("Rolled back: some outlines came back invalid or empty.", file=sys.stderr)
                return 1
            if args.dry_run:
                conn.rollback()
                print("Dry run: rolled back, nothing saved.")
                return 0
        conn.commit()
        print("saved. Restart the backend (pm2 restart pilar-backend) to rebuild the map cache.")
        return 0
    finally:
        conn.close()


if __name__ == "__main__":
    sys.exit(main())

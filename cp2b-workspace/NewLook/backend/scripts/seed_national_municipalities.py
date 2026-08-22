"""
Seed the national municipality spine from the IBGE Malha Municipal Digital 2025.

Takes `municipalities` from 645 (São Paulo only) to 5,571 (national), which is
the August-2026 roadmap item (BRAZIL_EXPANSION_ROADMAP.md §3.1 / §6). Run this
AFTER app/migrations/021_national_spine_staging.sql — it depends on `states`
and on `municipalities.uf` / `data_confidence` existing.

    docker cp backend/scripts/seed_national_municipalities.py cp2b-backend-dev:/tmp/
    docker exec cp2b-backend-dev python /tmp/seed_national_municipalities.py --dry-run
    docker exec cp2b-backend-dev python /tmp/seed_national_municipalities.py

WHAT THIS DOES NOT DO BY DEFAULT (deliberately)
-----------------------------------------------
It never touches rows that already exist (`ON CONFLICT (ibge_code) DO NOTHING`).
The 645 SP rows carry validated FDE parameters, biogas potentials, and geometry
from SP_Municipios_2024 — overwriting their geometry/area/centroid from a
different mesh would shift the platform's published SP headline numbers with no
explanation, which the regression gate (gates.py #8) exists to prevent. The
result is a deliberate mixed-mesh state (SP=2024, rest=2025); unifying SP onto
MMD 2025 is a separate, regression-gated change.

For a reviewed, UF-scoped mesh refresh, `--update-existing` updates only the
municipality identity, geometry, centroid, area and IBGE region metadata. It
does not touch biomass, scenario, provenance or economic columns. The flag is
rejected without `--uf` so a national overwrite cannot happen accidentally.

THE TWO MESH TRAPS (both are real; both are handled here)
--------------------------------------------------------
1. The mesh ships 5,573 records, not 5,571. Two are `Área Operacional` lagoon
   polygons that belong to no municipality (see ingest.ibge.NON_MUNICIPAL_MESH_CODES).
   They carry valid-looking 7-digit RS codes and a blank CD_RGINT, so they must be
   filtered by code — no structural heuristic catches them. They also appear as
   phantom "municipalities" in MapBiomas' municipal exports.
2. MT holds 142 municipalities, not DTB 2022's 141: Boa Esperança do Norte
   (5101837) was split off Nova Ubiratã and lands in RGint 5103 (Sinop). Sources
   keyed to the IBGE 2017 composition — the entire ABIOVE deliverable — have no
   row for it; that belongs in each source's `missing_allowlist`.
"""

from __future__ import annotations

import argparse
import os
import sys

import geopandas as gpd
import psycopg2
from psycopg2.extras import execute_batch

sys.path.insert(0, "/app")

from ingest.ibge import MUNICIPALITY_COUNT_BY_UF, TOTAL_MUNICIPALITIES  # noqa: E402

# Mirrors ingest.ibge.NON_MUNICIPAL_MESH_CODES. Duplicated rather than imported
# so this script runs standalone inside the container (where `ingest` may not be
# on sys.path); the test suite asserts the canonical set in ingest/ibge.py.
NON_MUNICIPAL_MESH_CODES = {"4300001", "4300002"}

MESH_PATH = os.environ.get("MESH_PATH", "/app/data/shapefiles/BR_Municipios_2025.shp")
MESH_YEAR = int(os.environ.get("MESH_YEAR", "2025"))
TARGET_SRID = 4326  # municipalities.geometry is GEOMETRY(MultiPolygon, 4326)

INSERT_VALUES_SQL = """
INSERT INTO municipalities (
    municipality_name, ibge_code, uf,
    geometry, centroid, centroid_lat, centroid_lng,
    area_km2, area_year,
    immediate_region, immediate_region_code,
    intermediate_region, intermediate_region_code,
    data_confidence
)
VALUES (
    %(name)s, %(code)s, %(uf)s,
    ST_Multi(ST_MakeValid(ST_GeomFromWKB(%(wkb)s::bytea, 4326))),
    ST_PointOnSurface(ST_MakeValid(ST_GeomFromWKB(%(wkb)s::bytea, 4326))),
    ST_Y(ST_PointOnSurface(ST_MakeValid(ST_GeomFromWKB(%(wkb)s::bytea, 4326)))),
    ST_X(ST_PointOnSurface(ST_MakeValid(ST_GeomFromWKB(%(wkb)s::bytea, 4326)))),
    %(area_km2)s, %(area_year)s,
    %(rgi_name)s, %(rgi_code)s,
    %(rgint_name)s, %(rgint_code)s,
    'provisional'
)
"""

INSERT_SQL = INSERT_VALUES_SQL + "ON CONFLICT (ibge_code) DO NOTHING"

UPSERT_MESH_SQL = INSERT_VALUES_SQL + """
ON CONFLICT (ibge_code) DO UPDATE SET
    municipality_name = EXCLUDED.municipality_name,
    uf = EXCLUDED.uf,
    geometry = EXCLUDED.geometry,
    centroid = EXCLUDED.centroid,
    centroid_lat = EXCLUDED.centroid_lat,
    centroid_lng = EXCLUDED.centroid_lng,
    area_km2 = EXCLUDED.area_km2,
    area_year = EXCLUDED.area_year,
    immediate_region = EXCLUDED.immediate_region,
    immediate_region_code = EXCLUDED.immediate_region_code,
    intermediate_region = EXCLUDED.intermediate_region,
    intermediate_region_code = EXCLUDED.intermediate_region_code
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


def load_mesh(mesh_path: str, uf: str | None = None) -> gpd.GeoDataFrame:
    gdf = gpd.read_file(mesh_path, engine="pyogrio")
    print(f"mesh records read           : {len(gdf)}")

    dropped = gdf[gdf["CD_MUN"].isin(NON_MUNICIPAL_MESH_CODES)]
    for _, r in dropped.iterrows():
        print(f"  dropping non-municipal    : {r['CD_MUN']} {r['NM_MUN']!r} ({r['AREA_KM2']} km2)")
    gdf = gdf[~gdf["CD_MUN"].isin(NON_MUNICIPAL_MESH_CODES)].copy()

    if uf:
        gdf = gdf[gdf["SIGLA_UF"].astype(str).str.upper() == uf].copy()

    # Fail loudly rather than seed a wrong spine: the coverage gate stands on this.
    expected = MUNICIPALITY_COUNT_BY_UF[uf] if uf else TOTAL_MUNICIPALITIES
    if len(gdf) != expected:
        scope = uf or "Brazil"
        raise SystemExit(
            f"expected {expected:,} municipalities for {scope} after filtering, got {len(gdf):,}"
        )
    if gdf["CD_MUN"].duplicated().any():
        raise SystemExit("duplicate CD_MUN in mesh — refusing to seed")
    if gdf["CD_RGINT"].str.strip().eq("").any():
        raise SystemExit("blank CD_RGINT survived the filter — refusing to seed")

    # SIRGAS 2000 (4674) -> WGS 84 (4326). Sub-metre shift, but make it explicit
    # rather than relying on the two being 'close enough'.
    print(f"mesh CRS                    : {gdf.crs}")
    gdf = gdf.to_crs(epsg=TARGET_SRID)
    return gdf


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="validate + report, write nothing")
    ap.add_argument("--uf", type=str.upper, choices=sorted(MUNICIPALITY_COUNT_BY_UF))
    ap.add_argument("--mesh-path", default=MESH_PATH)
    ap.add_argument("--mesh-year", type=int, default=MESH_YEAR)
    ap.add_argument(
        "--update-existing",
        action="store_true",
        help="refresh existing mesh metadata for one --uf; never touches biomass/scenarios",
    )
    args = ap.parse_args()

    if args.update_existing and not args.uf:
        ap.error("--update-existing requires an explicit --uf")

    gdf = load_mesh(args.mesh_path, args.uf)
    print(f"municipalities to consider  : {len(gdf)}")

    rows = [
        {
            "name": r["NM_MUN"],
            "code": r["CD_MUN"],
            "uf": r["SIGLA_UF"],
            "wkb": r["geometry"].wkb,
            "area_km2": float(r["AREA_KM2"]),
            "area_year": args.mesh_year,
            "rgi_name": r["NM_RGI"],
            "rgi_code": r["CD_RGI"],
            "rgint_name": r["NM_RGINT"],
            "rgint_code": r["CD_RGINT"],
        }
        for _, r in gdf.iterrows()
    ]

    conn = psycopg2.connect(dsn())
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT count(*) FROM municipalities")
            before = cur.fetchone()[0]
            print(f"municipalities before       : {before}")

            if args.dry_run:
                cur.execute("SELECT ibge_code FROM municipalities")
                existing = {r[0] for r in cur.fetchall()}
                new = [r for r in rows if r["code"] not in existing]
                print(f"[dry-run] would insert      : {len(new)}")
                existing_count = len(rows) - len(new)
                if args.update_existing:
                    print(f"[dry-run] would refresh     : {existing_count} existing {args.uf} rows")
                else:
                    print(f"[dry-run] would skip        : {existing_count} (already present)")
                conn.rollback()
                return 0

            execute_batch(cur, UPSERT_MESH_SQL if args.update_existing else INSERT_SQL, rows, page_size=200)
            cur.execute("SELECT count(*) FROM municipalities")
            after = cur.fetchone()[0]
        conn.commit()
        print(f"municipalities after        : {after}  (+{after - before})")
        if args.update_existing:
            print(f"mesh rows refreshed         : {len(rows)} ({args.uf}, {args.mesh_year})")
    finally:
        conn.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())

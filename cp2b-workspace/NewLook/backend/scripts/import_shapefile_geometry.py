"""
One-time script: imports SP municipality polygon geometry from the local shapefile
into the municipalities.geometry (and centroid) columns in PostgreSQL.

Run from the project root:
    python backend/scripts/import_shapefile_geometry.py

Requirements (on host): geopandas, psycopg2-binary, shapely
"""
import sys
from pathlib import Path
import psycopg2
import geopandas as gpd
from shapely.geometry import mapping

SHAPEFILE = Path("A:/CP2B_Maps_V2/data/shapefile/SP_Municipios_2024.shp")
DB_HOST = "localhost"
DB_PORT = 5432
DB_NAME = "cp2b_maps"
DB_USER = "postgres"
DB_PASS = "password"


def main():
    if not SHAPEFILE.exists():
        print(f"ERROR: shapefile not found at {SHAPEFILE}", file=sys.stderr)
        sys.exit(1)

    print(f"Reading shapefile: {SHAPEFILE}")
    gdf = gpd.read_file(SHAPEFILE)
    print(f"  {len(gdf)} features, CRS={gdf.crs}")

    if gdf.crs is None or gdf.crs.to_epsg() != 4326:
        print("  Reprojecting to EPSG:4326 …")
        gdf = gdf.to_crs(epsg=4326)

    conn = psycopg2.connect(
        host=DB_HOST, port=DB_PORT, dbname=DB_NAME, user=DB_USER, password=DB_PASS
    )
    cur = conn.cursor()

    updated = skipped = unmatched = 0

    for _, row in gdf.iterrows():
        ibge_code = str(row.get("CD_MUN") or "").strip()
        if not ibge_code:
            skipped += 1
            continue

        geom = row.geometry
        if geom is None or geom.is_empty:
            skipped += 1
            continue

        wkt = geom.wkt
        centroid = geom.centroid

        cur.execute(
            """
            UPDATE municipalities
            SET
                geometry     = ST_SetSRID(ST_GeomFromText(%s), 4326),
                centroid     = ST_SetSRID(ST_MakePoint(%s, %s), 4326),
                centroid_lng = %s,
                centroid_lat = %s
            WHERE ibge_code = %s
            """,
            (wkt, centroid.x, centroid.y, centroid.x, centroid.y, ibge_code),
        )
        if cur.rowcount:
            updated += 1
        else:
            unmatched += 1

    conn.commit()
    cur.close()
    conn.close()

    print(f"\nDone — updated={updated}  unmatched={unmatched}  skipped={skipped}")
    if unmatched:
        print(
            "  Unmatched means the ibge_code from the shapefile had no row in the DB.\n"
            "  Re-run import_v2_municipalities.py first if this is more than a handful."
        )


if __name__ == "__main__":
    main()

-- =============================================================================
-- Migration 039: municipality outlines for the map, with shared borders
-- =============================================================================
-- The /map choropleth painted geometry_overview (migration 022): ~2.2 km,
-- about 12 vertices per São Paulo municipality, so the state read as a field of
-- sharp polygons. geometry_detail (~550 m) is better but has the deeper flaw of
-- both LOD columns: ST_SimplifyPreserveTopology simplifies each municipality on
-- its own, so the border two neighbours share is simplified twice, differently
-- on each side — slivers, overlaps and corners that do not meet.
--
-- geometry_map is simplified once per shared border (mapshaper, which keeps the
-- arcs neighbours have in common), at ~120 m. Measured on SP+MG (1,498
-- municipalities): ~235 vertices each, all valid, ~3 MB gzipped for the map.
--
-- PostGIS cannot do this here: ST_CoverageSimplify needs GEOS >= 3.12, and
-- production runs GEOS 3.11 (local Docker 3.9). So this migration only adds the
-- column; scripts/build_map_geometry.py fills it.
--
-- Apply with:  psql "$DATABASE_URL" -f app/migrations/039_municipality_geometry_map.sql
-- Then:        DATABASE_URL=... .venv/bin/python scripts/build_map_geometry.py
-- Idempotent: safe to re-run. Until the script runs, the API falls back to
-- geometry_detail for every row, so applying this alone changes nothing.
-- =============================================================================

ALTER TABLE municipalities
    ADD COLUMN IF NOT EXISTS geometry_map GEOMETRY(MultiPolygon, 4326);

COMMENT ON COLUMN municipalities.geometry_map IS
    'Map outline: simplified once per shared border with mapshaper (~120 m), so '
    'neighbours meet on the same line. Built by scripts/build_map_geometry.py; '
    'derived, never edit directly.';

CREATE INDEX IF NOT EXISTS idx_municipalities_geom_map
    ON municipalities USING GIST (geometry_map);

-- =============================================================================
-- Verification (after the script):
--   SELECT count(*) FILTER (WHERE geometry_map IS NOT NULL) AS built,
--          count(*) FILTER (WHERE NOT ST_IsValid(geometry_map)) AS invalid,
--          round(avg(ST_NPoints(geometry_map))) AS avg_vertices
--   FROM municipalities WHERE LEFT(ibge_code, 2) IN ('35', '31');
--   -- built 1498, invalid 0, avg_vertices ~235
-- =============================================================================

-- =============================================================================
-- Migration 022: municipality geometry at 2 levels of detail (LOD)
-- =============================================================================
-- Roadmap: BRAZIL_EXPANSION_ROADMAP.md §3.2 / §6 (August — "national geometry
-- import at 2 simplification levels"). Prerequisite: 021 + the national spine
-- seed (backend/scripts/seed_national_municipalities.py).
--
-- WHY THIS EXISTS — measured, not guessed. At 5,571 municipalities:
--
--   ST_AsGeoJSON(geometry, 9)  -> 471 MB  => /municipalities/geojson returns 500:
--        "total size of jsonb array elements exceeds the maximum of 268435455
--         bytes" — a HARD PostgreSQL jsonb ceiling (256 MB), not slowness.
--   tol 0.005 / 5 decimals    -> 6.7 MB   (~550 m; regional detail)
--   tol 0.02  / 4 decimals    -> 1.9 MB   (~2.2 km; national overview)
--
-- Simplifying per-request costs ~15 s of CPU on every call. Geometry is static
-- (yearly refresh at most), so we pay it once here and read it forever after.
--
-- ST_SimplifyPreserveTopology (not ST_Simplify) is deliberate: it cannot punch
-- holes, self-intersect, or collapse a polygon to empty. Verified on this data:
-- 0 collapsed at both tolerances, smallest municipality being Águas de São
-- Pedro/SP at 3.38 km². Plain ST_Simplify would drop small municipalities
-- outright and leave gaps in the choropleth.
--
-- Apply with:  psql "$DATABASE_URL" -f app/migrations/022_municipality_geometry_lod.sql
-- Idempotent: safe to re-run (columns are IF NOT EXISTS; backfill only fills NULLs).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. LOD columns
-- -----------------------------------------------------------------------------
ALTER TABLE municipalities
    ADD COLUMN IF NOT EXISTS geometry_detail   GEOMETRY(MultiPolygon, 4326),
    ADD COLUMN IF NOT EXISTS geometry_overview GEOMETRY(MultiPolygon, 4326);

COMMENT ON COLUMN municipalities.geometry_detail IS
    'ST_SimplifyPreserveTopology(geometry, 0.005) — ~550 m. Regional/zoomed-in '
    'choropleth (~6.7 MB nationally). Derived; never edit directly.';
COMMENT ON COLUMN municipalities.geometry_overview IS
    'ST_SimplifyPreserveTopology(geometry, 0.02) — ~2.2 km. National overview '
    '(~1.9 MB nationally). Derived; never edit directly.';

-- -----------------------------------------------------------------------------
-- 2. Backfill (only NULLs, so re-runs are cheap)
-- -----------------------------------------------------------------------------
UPDATE municipalities
SET geometry_detail = ST_Multi(ST_MakeValid(ST_SimplifyPreserveTopology(geometry, 0.005)))
WHERE geometry IS NOT NULL AND geometry_detail IS NULL;

UPDATE municipalities
SET geometry_overview = ST_Multi(ST_MakeValid(ST_SimplifyPreserveTopology(geometry, 0.02)))
WHERE geometry IS NOT NULL AND geometry_overview IS NULL;

-- Safety net: ST_MakeValid can hand back a GeometryCollection when the input is
-- pathological. Anything that failed to land as a MultiPolygon falls back to the
-- full-resolution geometry — a heavier payload for that one row beats a hole in
-- the map or a type error at read time.
UPDATE municipalities
SET geometry_detail = ST_Multi(geometry)
WHERE geometry IS NOT NULL AND (geometry_detail IS NULL OR ST_IsEmpty(geometry_detail));

UPDATE municipalities
SET geometry_overview = ST_Multi(geometry)
WHERE geometry IS NOT NULL AND (geometry_overview IS NULL OR ST_IsEmpty(geometry_overview));

-- -----------------------------------------------------------------------------
-- 3. Spatial indexes — bbox/viewport filtering reads these, not `geometry`
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_municipalities_geom_detail
    ON municipalities USING GIST (geometry_detail);
CREATE INDEX IF NOT EXISTS idx_municipalities_geom_overview
    ON municipalities USING GIST (geometry_overview);

-- =============================================================================
-- Verification (run after applying):
--   SELECT count(*) FROM municipalities WHERE geometry_detail IS NULL;    -- 0
--   SELECT count(*) FROM municipalities WHERE geometry_overview IS NULL;  -- 0
--   SELECT count(*) FROM municipalities WHERE NOT ST_IsValid(geometry_detail); -- 0
--   -- payload sanity: overview ~1.9 MB, detail ~6.7 MB
--   SELECT pg_size_pretty(sum(length(ST_AsGeoJSON(geometry_overview,4)))::bigint)
--     FROM municipalities;
-- =============================================================================

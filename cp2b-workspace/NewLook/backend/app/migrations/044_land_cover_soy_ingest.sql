-- =============================================================================
-- Migration 044: land cover by year, with soy apart, loaded through ingest/
-- =============================================================================
-- The municipality profile draws land use 1985–2025 and says when soy passed
-- pasture. Migration 041 kept three years in eight groups for SP and MG only,
-- loaded by scripts/load_municipality_land_cover.py. From now on the table is
-- loaded by the ingest source `mapbiomas_cobertura`
-- (scripts/promote_profile_data.py), which:
--   * loads every year 1985–2025;
--   * splits `soy` out of `crops` (crops = every other crop, without soy and
--     sugar cane);
--   * records each load in staging.ingest_runs and stamps its rows with it.
--
-- So this migration:
--   1. lets the group check accept 'soy';
--   2. drops the SP/MG-only check, so another state can be loaded later
--      without a migration (which UFs are loaded is a loader parameter);
--   3. adds ingest_run_id, pointing to the ledger row of the load;
--   4. lets municipality_timeseries hold years from 1970 (it started at 1985,
--      MapBiomas' first year): the profile's population line stores the
--      Censos of 1970 and 1980 there (ingest source ibge_censo_historico).
--
-- Requires migration 021 (staging.ingest_runs).
-- Apply with:  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f app/migrations/044_land_cover_soy_ingest.sql
-- Runs in its own BEGIN/COMMIT (no -1 needed). Idempotent: safe to re-run. Rows already loaded stay valid (their groups are
-- a subset of the new list); reload with the ingest source to get soy and the
-- yearly series.
-- =============================================================================

BEGIN;

ALTER TABLE municipality_land_cover
    DROP CONSTRAINT IF EXISTS municipality_land_cover_uf;

ALTER TABLE municipality_land_cover
    DROP CONSTRAINT IF EXISTS municipality_land_cover_group;
ALTER TABLE municipality_land_cover
    ADD CONSTRAINT municipality_land_cover_group CHECK (group_key IN (
        'forest', 'pasture', 'cane', 'soy', 'crops', 'silviculture', 'mosaic', 'urban', 'other'
    ));

ALTER TABLE municipality_land_cover
    ADD COLUMN IF NOT EXISTS ingest_run_id INTEGER REFERENCES staging.ingest_runs(id);

ALTER TABLE municipality_timeseries
    DROP CONSTRAINT IF EXISTS municipality_timeseries_year_check;
ALTER TABLE municipality_timeseries
    ADD CONSTRAINT municipality_timeseries_year_check CHECK (year BETWEEN 1970 AND 2100);

COMMENT ON TABLE municipality_land_cover IS
    'Land cover per municipality and year, 1985–2025, in nine groups (hectares). '
    'Source: MapBiomas Collection 11 (COVERAGE_11). Loaded by the ingest source '
    'mapbiomas_cobertura (scripts/promote_profile_data.py); derived, never edit directly.';
COMMENT ON COLUMN municipality_land_cover.group_key IS
    'forest, pasture, cane, soy, crops (other crops, without soy and cane), '
    'silviculture, mosaic, urban, other; see migrations 041 and 044.';
COMMENT ON COLUMN municipality_land_cover.ingest_run_id IS
    'staging.ingest_runs row of the load that wrote this row (NULL for the old 041 loader).';

COMMIT;

-- =============================================================================
-- Verification (after the ingest load):
--   SELECT count(DISTINCT year) AS years, count(DISTINCT ibge_code) AS municipalities,
--          count(*) AS rows
--   FROM municipality_land_cover;
--   -- SP+MG: 41 years, 1,498 municipalities, 552,762 rows (1,498 x 41 x 9)
--   SELECT year, group_key, round(area_ha) FROM municipality_land_cover
--   WHERE ibge_code = '3521705' AND year IN (1985, 2025) AND group_key IN ('pasture', 'soy');
--   -- Itaberá (rounded): pasture 58,142 -> 8,798; soy 4,241 -> 57,547
-- =============================================================================

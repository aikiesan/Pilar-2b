-- =============================================================================
-- Migration 041: land cover per municipality (MapBiomas Collection 11)
-- =============================================================================
-- What each São Paulo and Minas Gerais municipality's land is used for, in
-- eight groups, for 1985, 2005 and 2025. The map's Compare and Find similar
-- tools read it through GET /api/v1/municipalities/land-cover (signed-in only).
--
-- Land around's raster (Collection 10, 2024) maps farming in São Paulo only, so
-- it cannot describe a whole municipality, nor any in Minas Gerais. This table
-- is the official per-municipality statistic instead: every hectare is counted,
-- native vegetation and water included.
--
-- Source: MapBiomas Collection 11, MAPBIOMAS_BRAZIL-COL.11-BIOME_STATE_MUNICIPALITY.xlsx,
-- sheet COVERAGE_11 (hectares). A municipality spanning two biomes has one
-- source row per biome and class; the loader sums them.
--
-- Groups (group_key):
--   forest        forest and other native vegetation (class level 1: 1. and 2.)
--   pasture       pasture
--   cane          sugar cane
--   crops         every other crop (soy, coffee, citrus, ...)
--   silviculture  planted forest
--   mosaic        mosaic of uses (mixed farm use)
--   urban         urban area
--   other         water, mining, other non-vegetated, not observed
--
-- Migration 040 is reserved for sign-in with approval (Part 2).
--
-- Apply with:  psql "$DATABASE_URL" -f app/migrations/041_municipality_land_cover.sql
-- Then:        python scripts/load_municipality_land_cover.py --xlsx <path to the xlsx>
-- Idempotent: safe to re-run. Until the loader runs the table is empty and the
-- endpoint answers {"available": false}.
-- =============================================================================

CREATE TABLE IF NOT EXISTS municipality_land_cover (
    ibge_code  TEXT             NOT NULL,
    year       SMALLINT         NOT NULL,
    group_key  TEXT             NOT NULL,
    area_ha    DOUBLE PRECISION NOT NULL,
    PRIMARY KEY (ibge_code, year, group_key),
    CONSTRAINT municipality_land_cover_uf CHECK (LEFT(ibge_code, 2) IN ('35', '31')),
    CONSTRAINT municipality_land_cover_group CHECK (group_key IN (
        'forest', 'pasture', 'cane', 'crops', 'silviculture', 'mosaic', 'urban', 'other'
    )),
    CONSTRAINT municipality_land_cover_area CHECK (area_ha >= 0)
);

COMMENT ON TABLE municipality_land_cover IS
    'Land cover per municipality, SP and MG, in eight groups (hectares). '
    'Source: MapBiomas Collection 11 (COVERAGE_11). Loaded by '
    'scripts/load_municipality_land_cover.py; derived, never edit directly.';
COMMENT ON COLUMN municipality_land_cover.group_key IS
    'forest, pasture, cane, crops, silviculture, mosaic, urban, other; see migration 041.';
COMMENT ON COLUMN municipality_land_cover.area_ha IS
    'Hectares of the municipality in this group and year, MapBiomas Collection 11.';

-- The endpoint reads one year for every municipality.
CREATE INDEX IF NOT EXISTS idx_municipality_land_cover_year
    ON municipality_land_cover (year);

-- =============================================================================
-- Verification (after the loader):
--   SELECT year, count(DISTINCT ibge_code) AS municipalities, count(*) AS rows
--   FROM municipality_land_cover GROUP BY year ORDER BY year;
--   -- expect 1,498 municipalities (645 SP + 853 MG) and 11,984 rows per year
-- =============================================================================

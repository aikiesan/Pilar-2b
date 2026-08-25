-- =============================================================================
-- Migration 024: municipality time series (2008–2024)
-- =============================================================================
-- Roadmap: BRAZIL_EXPANSION_ROADMAP.md §3.1. Prerequisite: the national spine
-- (021 + seed_national_municipalities.py).
--
-- WHY THIS EXISTS
--   `municipalities` is a FLAT table: one row per municipality, and its
--   `population_year` / `area_year` columns are scalar labels, not a time
--   dimension. Every dataset now arriving is a series:
--       MapBiomas 10.1   5,571 mun x 17 yr x ~15 classes  ~= 1.4M rows
--       PAM 1612/1613    5,571 mun x 17 yr x ~72 crops    ~= 6.8M rows
--       LAPIG vigor      5,571 mun x 16 yr x 3 classes    ~= 0.27M rows
--   ...roughly 8.5M rows. That is unremarkable for Postgres and impossible in a
--   flat table. Without this, "Culturas Perenes"/"Outras culturas" and any time
--   slider have nowhere to land.
--
-- WHY LONG FORMAT (mun, year, source, variable, value) AND NOT A WIDE TABLE
--   A column per crop-year would be ~1,200 columns and a DDL change per new
--   crop or year. Long format means new sources and new years are INSERTs, and
--   it is the shape the ingestion contract already produces. The cost is that
--   callers must pivot — acceptable, because the map only ever asks for one
--   (variable, year) slice at a time, which is exactly what the indexes serve.
--
-- UNITS ARE NOT OPTIONAL
--   This table deliberately mixes hectares, tonnes and head counts, so `unit`
--   is NOT NULL. The FDE work has already been bitten once by a unit slip
--   (the ANEEL kW/MW/GW audit, see ingest/sources/aneel_siga/source.py); a
--   nullable unit column invites the same class of silent error.
--
-- Apply with:  psql "$DATABASE_URL" -f app/migrations/024_municipality_timeseries.sql
-- Idempotent: safe to re-run.
-- =============================================================================

CREATE TABLE IF NOT EXISTS municipality_timeseries (
    id            BIGSERIAL   PRIMARY KEY,
    -- FK to the spine. ON DELETE CASCADE: a municipality's series is worthless
    -- without the municipality.
    ibge_code     VARCHAR(7)  NOT NULL REFERENCES municipalities(ibge_code) ON DELETE CASCADE,
    year          SMALLINT    NOT NULL CHECK (year BETWEEN 1985 AND 2100),
    -- ingest.runner SOURCES key: 'mapbiomas_lulc' | 'pam_1612' | 'pam_1613' |
    -- 'lapig_vigor' | 'ibge_ppm' | 'snis' ...
    source_id     VARCHAR(40) NOT NULL,
    -- Series name within the source: a crop ('soja'), an LULC class ('3'),
    -- a vigor class ('severa'), an indicator ('populacao').
    variable      VARCHAR(80) NOT NULL,
    value         DOUBLE PRECISION,
    -- 'ha' | 't' | 'head' | 'inhabitants' | 'm3' ... Never NULL: this table
    -- mixes units by design (see header).
    unit          VARCHAR(16) NOT NULL,
    -- Per-row lineage. 'measured' = observed in the source; 'interpolated' =
    -- filled between observations (TerraClass odd years); 'proxy' = carried
    -- from another year (LAPIG has no 2024, so 2023 is used); 'estimated' =
    -- derived. The ABIOVE delivery proved why this must travel WITH the row and
    -- not in a footnote: their HARVEX M2 annual series is a flat 1/16th split of
    -- a 2008->2024 total, and only a per-row stamp keeps that from being read as
    -- a measurement.
    quality       VARCHAR(12) NOT NULL DEFAULT 'measured'
                  CHECK (quality IN ('measured','interpolated','proxy','estimated')),
    ingest_run_id INTEGER     REFERENCES staging.ingest_runs(id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- One value per municipality/year/source/variable. This is what makes the
    -- loaders idempotent (ON CONFLICT DO UPDATE) and what stops the TerraClass
    -- 2.89x duplicate-load bug (ABIOVE D1 §5.7) from being possible here at all.
    UNIQUE (ibge_code, year, source_id, variable)
);

COMMENT ON TABLE municipality_timeseries IS
    'Long-format municipal series, 2008-2024. One row per '
    '(ibge_code, year, source_id, variable). Written only by the ingestion '
    'contract (backend/ingest/); see docs/data/INGESTION_GUIDE.md.';

-- ── Indexes: shaped to the two real access patterns ──────────────────────────
-- 1. The map asks for one national slice: WHERE source_id/variable/year.
CREATE INDEX IF NOT EXISTS idx_mts_slice
    ON municipality_timeseries (source_id, variable, year) INCLUDE (ibge_code, value);
-- 2. The municipality profile page asks for one municipality's whole history.
CREATE INDEX IF NOT EXISTS idx_mts_municipality
    ON municipality_timeseries (ibge_code, year);
-- 3. Coverage/QA sweeps ("which years does source X have?").
CREATE INDEX IF NOT EXISTS idx_mts_source_year
    ON municipality_timeseries (source_id, year);

-- ── Read helper for the map: one (source, variable, year) slice, pivoted ─────
CREATE OR REPLACE VIEW municipality_timeseries_latest AS
SELECT DISTINCT ON (ibge_code, source_id, variable)
       ibge_code, source_id, variable, year, value, unit, quality
FROM municipality_timeseries
ORDER BY ibge_code, source_id, variable, year DESC;

COMMENT ON VIEW municipality_timeseries_latest IS
    'Most recent year available per (municipality, source, variable). Note the '
    'sources end in different years — MapBiomas/PAM reach 2024, LAPIG stops at '
    '2023 — so this view mixes reference years by construction. Use it for '
    '"current state" displays; never sum across it and call the total a year.';

-- =============================================================================
-- Verification (run after applying):
--   \d municipality_timeseries
--   -- FK must reject an unknown municipality:
--   INSERT INTO municipality_timeseries (ibge_code, year, source_id, variable, unit)
--   VALUES ('9999999', 2024, 't', 'v', 'ha');   -- expect: FK violation
--   -- UNIQUE must reject a duplicate series point:
--   SELECT count(*) FROM municipality_timeseries;   -- 0 until the first ingest
-- =============================================================================

-- =============================================================================
-- Migration 025: biomass provenance — record what we actually know
-- =============================================================================
-- Roadmap: BRAZIL_EXPANSION_ROADMAP.md §2 (paper-grade traceability).
-- Prerequisite: the national spine (021 + seed_national_municipalities.py).
--
-- WHY THIS EXISTS
--   The `municipalities` biomass columns cannot express "we have no data".
--   Verified against the live DB (2026-07-17):
--
--       sugarcane_biomass_tons_year   IS NULL :     0
--                                     = 0     : 5,059
--                                     > 0     :   512
--
--   There is not a single NULL. Every municipality outside São Paulo was seeded
--   with a DEFAULT 0, so a 0 in Mato Grosso ("never loaded") is byte-identical
--   to a 0 in a São Paulo municipality that genuinely grows no sugarcane
--   (133 of SP's 645 are exactly that). The API then reads both as 0.0 and the
--   map paints both at the bottom of the colour ramp — rendering a data gap as
--   a finding. Agricultural is 77% of the modelled potential, so this is not a
--   cosmetic problem: it makes Mato Grosso, Paraná and Goiás look empty.
--
--   Coverage therefore cannot be derived from the value. It has to be recorded.
--   That is this table: presence = we have a number and know where it came from;
--   absence = no_data. Never infer coverage from a zero again.
--
-- THE BACKFILL, AND WHY UF 35 IS A FACT AND NOT A GUESS
--   The only biomass ever loaded is docs/data/municipality_biomass_tons.csv
--   (SP 2023, read by scripts/compute_sp_canonical_totals.py). Its ibge_code set
--   was compared against the DB's UF-35 set on 2026-07-17: 645 vs 645, zero
--   difference in either direction — an exact match. It covers all 11 streams
--   uniformly, so SP is fully loaded and nothing else is loaded at all.
--
--   When PPM livestock and PAM crops are promoted nationally they insert their
--   own rows here with their own source_id/quality, and this SP-shaped backfill
--   stops being the whole story. That is the intended path — do not extend the
--   UF-35 predicate below; let each ingest record its own provenance.
--
-- `quality` reuses the municipality_timeseries vocabulary verbatim, including
-- its CHECK, so the two tables stay readable together. 'estimated' is the state
-- for values modelled rather than reported (e.g. urban waste derived from
-- population where SNIS has no tonnage — 76% of municipalities).
-- =============================================================================

CREATE TABLE IF NOT EXISTS municipality_biomass_provenance (
    ibge_code      VARCHAR(7)  NOT NULL,
    stream         VARCHAR(32) NOT NULL,
    source_id      VARCHAR(40) NOT NULL,
    reference_year SMALLINT    NOT NULL,
    quality        VARCHAR(12) NOT NULL DEFAULT 'measured'
        CHECK (quality IN ('measured', 'interpolated', 'proxy', 'estimated')),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (ibge_code, stream)
);

COMMENT ON TABLE municipality_biomass_provenance IS
    'One row per (municipality, biomass stream) that we actually have a number '
    'for. Absence means no_data — the API must emit null, not 0. Written by the '
    'biomass loaders/promoters, never by hand.';

COMMENT ON COLUMN municipality_biomass_provenance.quality IS
    'measured = reported by the source; estimated = modelled (e.g. from '
    'population or head count); interpolated/proxy as in municipality_timeseries.';

-- The map fetches every stream for the rows it returns, so the PK covers the
-- join. This index serves the other direction: one stream across the nation.
CREATE INDEX IF NOT EXISTS idx_mbp_stream
    ON municipality_biomass_provenance (stream) INCLUDE (ibge_code, quality);

-- ── Backfill: São Paulo, AGRICULTURAL streams only, from the master CSV ──────
--
-- Only the crop columns hold biomass. The livestock columns
-- ({cattle,swine,poultry}_biomass_tons_year) hold IBGE HEAD COUNTS despite their
-- name — verified 2026-07-17: they track PPM head at ratios 1.040 / 1.003 /
-- 1.072, the CSV loads verbatim without conversion, and as tonnes they would
-- imply every species excreting an identical 2.74 kg/day (a laying hen weighs
-- ~2 kg). scripts/compute_sp_canonical_totals.py reads the same columns as
-- `count` and converts them with EMBRAPA factors; only the map ever mistook them
-- for tonnage.
--
-- So livestock is NOT backfilled here: its tonnage does not exist in any column
-- and is derived at read time from PPM head counts via
-- canonical_loader.biomass_tons_from_units(). Same for urban — those columns are
-- 0 for all 645 SP municipalities despite 46M residents. Marking either
-- 'measured' from these columns would assert we had measured something we never
-- did, which is the exact failure this table exists to prevent.
INSERT INTO municipality_biomass_provenance (ibge_code, stream, source_id, reference_year, quality)
SELECT m.ibge_code, s.stream, 'sp_master_csv', 2023, 'measured'
FROM municipalities m
CROSS JOIN (VALUES
    ('sugarcane'), ('soybean'), ('corn'), ('coffee'), ('citrus')
) AS s(stream)
WHERE left(m.ibge_code, 2) = '35'
ON CONFLICT (ibge_code, stream) DO NOTHING;

-- Undo the first cut of this migration, which backfilled all 11 streams before
-- the head-count discovery. Harmless on a fresh database; required on any that
-- already applied it (including the local dev DB).
DELETE FROM municipality_biomass_provenance
WHERE source_id = 'sp_master_csv'
  AND stream IN ('cattle', 'swine', 'poultry', 'aquaculture', 'rsu', 'rpo');

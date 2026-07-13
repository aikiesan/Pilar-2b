-- =============================================================================
-- Migration 021: National spine + staging schema + validation_plants_registry
-- =============================================================================
-- Prepared in advance (2026-07-03) for the August-2026 national expansion —
-- see docs/planning/BRAZIL_EXPANSION_ROADMAP.md §3.1/§6 and the August
-- playbook (docs/planning/playbooks/2026-08_AUGUST.md).
--
-- What it does:
--   1. states                — reference table for the 27 UFs (seeded here)
--   2. municipalities.uf     — UF column, backfilled from the ibge_code prefix
--   3. staging schema        — landing zone for the ingestion contract
--   4. staging.ingest_runs   — bookkeeping: every promote is recorded
--   5. validation_plants_registry — real-world plant registry (ANEEL SIGA/GD, ANP)
--
-- Safe to apply BEFORE the national data exists: it only adds structures and
-- backfills uf for the 645 SP rows already present. Idempotent: safe to re-run.
-- Apply with:  psql "$DATABASE_URL" -f app/migrations/021_national_spine_staging.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. states — the 27 federative units (IBGE codes; static reference data)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS states (
    code        CHAR(2)  PRIMARY KEY,          -- IBGE numeric UF code ('35')
    uf          CHAR(2)  UNIQUE NOT NULL,      -- sigla ('SP')
    name        VARCHAR(30) NOT NULL,
    region      VARCHAR(12) NOT NULL           -- macrorregião
                  CHECK (region IN ('Norte','Nordeste','Sudeste','Sul','Centro-Oeste')),
    -- Official municipality count (IBGE DTB 2022) — mirrors
    -- backend/ingest/ibge.py; the coverage gate depends on both staying in sync.
    municipality_count INTEGER NOT NULL
);

INSERT INTO states (code, uf, name, region, municipality_count) VALUES
    ('11','RO','Rondônia',           'Norte',         52),
    ('12','AC','Acre',               'Norte',         22),
    ('13','AM','Amazonas',           'Norte',         62),
    ('14','RR','Roraima',            'Norte',         15),
    ('15','PA','Pará',               'Norte',        144),
    ('16','AP','Amapá',              'Norte',         16),
    ('17','TO','Tocantins',          'Norte',        139),
    ('21','MA','Maranhão',           'Nordeste',     217),
    ('22','PI','Piauí',              'Nordeste',     224),
    ('23','CE','Ceará',              'Nordeste',     184),
    ('24','RN','Rio Grande do Norte','Nordeste',     167),
    ('25','PB','Paraíba',            'Nordeste',     223),
    ('26','PE','Pernambuco',         'Nordeste',     185),
    ('27','AL','Alagoas',            'Nordeste',     102),
    ('28','SE','Sergipe',            'Nordeste',      75),
    ('29','BA','Bahia',              'Nordeste',     417),
    ('31','MG','Minas Gerais',       'Sudeste',      853),
    ('32','ES','Espírito Santo',     'Sudeste',       78),
    ('33','RJ','Rio de Janeiro',     'Sudeste',       92),
    ('35','SP','São Paulo',          'Sudeste',      645),
    ('41','PR','Paraná',             'Sul',          399),
    ('42','SC','Santa Catarina',     'Sul',          295),
    ('43','RS','Rio Grande do Sul',  'Sul',          497),
    ('50','MS','Mato Grosso do Sul', 'Centro-Oeste',  79),
    ('51','MT','Mato Grosso',        'Centro-Oeste', 141),
    ('52','GO','Goiás',              'Centro-Oeste', 246),
    ('53','DF','Distrito Federal',   'Centro-Oeste',   1)
ON CONFLICT (code) DO UPDATE
    SET uf = EXCLUDED.uf,
        name = EXCLUDED.name,
        region = EXCLUDED.region,
        municipality_count = EXCLUDED.municipality_count;

-- -----------------------------------------------------------------------------
-- 2. municipalities.uf — derived from the ibge_code prefix, indexed for the
--    per-UF query patterns national scale brings (roadmap §3.1)
-- -----------------------------------------------------------------------------
ALTER TABLE municipalities ADD COLUMN IF NOT EXISTS uf CHAR(2) REFERENCES states(uf);

UPDATE municipalities m
SET uf = s.uf
FROM states s
WHERE m.uf IS NULL
  AND m.ibge_code IS NOT NULL
  AND s.code = LEFT(m.ibge_code, 2);

CREATE INDEX IF NOT EXISTS idx_municipalities_uf ON municipalities (uf);

-- Confidence flag for nationally expanded rows: SP rows carry validated FDE
-- parameters; other states start lower until per-state parameters are sourced
-- (roadmap §6 October). Values: 'validated' | 'provisional' | 'low'.
ALTER TABLE municipalities
    ADD COLUMN IF NOT EXISTS data_confidence VARCHAR(12) NOT NULL DEFAULT 'validated'
    CHECK (data_confidence IN ('validated','provisional','low'));

-- -----------------------------------------------------------------------------
-- 3. staging schema — every ingest lands here first; promotion to public.*
--    happens in one reviewed transaction (backend/ingest contract, step 5)
-- -----------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS staging;

COMMENT ON SCHEMA staging IS
    'Ingestion-contract landing zone. Tables are named <source_id>_<subject>. '
    'Rows only move to public.* after the 8-gate battery passes '
    '(backend/ingest/gates.py); see docs/data/INGESTION_GUIDE.md.';

-- -----------------------------------------------------------------------------
-- 4. staging.ingest_runs — the promote ledger (idempotency + audit)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS staging.ingest_runs (
    id              SERIAL PRIMARY KEY,
    source_id       VARCHAR(40)  NOT NULL,     -- ingest.runner.SOURCES key
    reference_year  INTEGER      NOT NULL,
    frame_checksum  CHAR(64)     NOT NULL,     -- ingest.gates.frame_checksum
    gates_passed    BOOLEAN      NOT NULL,
    report_path     TEXT         NOT NULL,     -- docs/data/ingest_reports/...
    row_count       INTEGER      NOT NULL,
    promoted_at     TIMESTAMPTZ,               -- NULL until promoted
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (source_id, reference_year, frame_checksum)
);

-- -----------------------------------------------------------------------------
-- 5. validation_plants_registry — real-world registry for cross-checking model
--    outputs (ANEEL SIGA + ANEEL GD + ANP biometano; roadmap §4.1 / METADATA P0)
--    NOTE: named *_registry to avoid colliding with the pre-existing
--    `validation_plants` table (backend/migrations/010_create_validation_plants.sql
--    — a richer 42-column table with geometry + FDE params that holds real data).
--    `CREATE TABLE IF NOT EXISTS validation_plants` would silently skip against that
--    table, then the index build on the missing `uf` column would abort the whole
--    migration. These are two different concerns; keep the names distinct.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS validation_plants_registry (
    id                SERIAL PRIMARY KEY,
    source_id         VARCHAR(40) NOT NULL,    -- 'aneel_siga' | 'aneel_gd' | 'anp_biometano'
    registry_code     VARCHAR(60) NOT NULL,    -- CEG code / ANP plant id
    plant_name        VARCHAR(200) NOT NULL,
    uf                CHAR(2) REFERENCES states(uf),
    municipality_name VARCHAR(120),
    ibge_code         VARCHAR(7),              -- resolved from name+UF; NULL until matched
    fuel_origin       VARCHAR(60),             -- SIGA DscOrigemCombustivel ('Biomassa')
    fuel_source       VARCHAR(120),            -- SIGA DscFonteCombustivel ('Biogás - RU', ...)
    -- Electrical capacity in MW — converted ONCE in the loader (kW/1000; see
    -- ingest/sources/aneel_siga/source.py). Biomethane volumetric capacity is
    -- a separate column so units are never mixed (aneel_gd note in METADATA).
    capacity_mw       NUMERIC(10, 3),
    biomethane_nm3_day NUMERIC(12, 2),
    reference_year    INTEGER NOT NULL,
    ingest_run_id     INTEGER REFERENCES staging.ingest_runs(id),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (source_id, registry_code, reference_year)
);

CREATE INDEX IF NOT EXISTS idx_validation_plants_registry_uf ON validation_plants_registry (uf);
CREATE INDEX IF NOT EXISTS idx_validation_plants_registry_ibge ON validation_plants_registry (ibge_code);
CREATE INDEX IF NOT EXISTS idx_validation_plants_registry_source ON validation_plants_registry (source_id);

-- =============================================================================
-- Verification queries (run after applying):
--   SELECT count(*) FROM states;                          -- 27
--   SELECT sum(municipality_count) FROM states;           -- 5570
--   SELECT count(*) FROM municipalities WHERE uf = 'SP';  -- 645
--   SELECT count(*) FROM municipalities WHERE uf IS NULL; -- 0
-- =============================================================================

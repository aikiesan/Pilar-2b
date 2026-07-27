-- Migration 012: LEGACY CP2B 2023 long-format residue streams.
-- DEC-020: historical/research snapshot only; never a source of published values.
-- Source: 01_master_residue_streams_SP_2023.csv (5,769 rows)
-- Run: psql $DATABASE_URL -f migrations/012_cp2b_residue_streams.sql

CREATE TABLE IF NOT EXISTS residue_streams_sp2023 (
    id                      SERIAL PRIMARY KEY,
    ibge_code               INTEGER NOT NULL,
    municipality_name       TEXT NOT NULL,
    lat                     DOUBLE PRECISION,
    lon                     DOUBLE PRECISION,
    area_km2                DOUBLE PRECISION,
    populacao_2022          INTEGER,
    densidade_demografica   DOUBLE PRECISION,
    cd_rgi                  INTEGER,
    cd_rgint                INTEGER,
    year                    INTEGER DEFAULT 2023,
    residue_stream          TEXT NOT NULL,
    residue_stream_pt       TEXT,
    sector                  TEXT,
    sector_pt               TEXT,
    residue_tons_yr         DOUBLE PRECISION,
    biogas_m3_yr            DOUBLE PRECISION,
    energy_GWh_yr           DOUBLE PRECISION,
    energy_MWh_yr           DOUBLE PRECISION,
    biogas_m3_per_capita    DOUBLE PRECISION,
    biogas_m3_per_km2       DOUBLE PRECISION,
    conversion_factor       DOUBLE PRECISION,
    cf_unit                 TEXT,
    bagaco_excluded_pct     DOUBLE PRECISION,
    mun_total_GWh           DOUBLE PRECISION,
    mun_potential_class     TEXT,
    mun_n_streams           INTEGER,
    mun_dominant_stream     TEXT,
    source_dataset          TEXT,
    notes                   TEXT,
    created_at              TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE residue_streams_sp2023 IS
  'LEGACY 2023 snapshot. Historical/research use only; not a source of published values (DEC-020).';

CREATE INDEX IF NOT EXISTS idx_rss_ibge    ON residue_streams_sp2023 (ibge_code);
CREATE INDEX IF NOT EXISTS idx_rss_stream  ON residue_streams_sp2023 (residue_stream);
CREATE INDEX IF NOT EXISTS idx_rss_class   ON residue_streams_sp2023 (mun_potential_class);
CREATE INDEX IF NOT EXISTS idx_rss_rgint   ON residue_streams_sp2023 (cd_rgint);

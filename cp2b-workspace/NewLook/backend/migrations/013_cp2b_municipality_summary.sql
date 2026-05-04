-- Migration 013: CP2B 2023 wide-format municipality summary + clustering columns
-- Source: 02_municipality_summary_SP_2023.csv (645 rows)
-- Run: psql $DATABASE_URL -f migrations/013_cp2b_municipality_summary.sql

CREATE TABLE IF NOT EXISTS municipality_summary (
    id                      SERIAL PRIMARY KEY,
    ibge_code               INTEGER UNIQUE NOT NULL,

    -- 12 GWh stream columns (column names use ghw_ prefix; source header is GWh_*)
    ghw_aquaculture         DOUBLE PRECISION DEFAULT 0,
    ghw_cattle              DOUBLE PRECISION DEFAULT 0,
    ghw_citrus              DOUBLE PRECISION DEFAULT 0,
    ghw_coffee              DOUBLE PRECISION DEFAULT 0,
    ghw_corn                DOUBLE PRECISION DEFAULT 0,
    ghw_forestry            DOUBLE PRECISION DEFAULT 0,
    ghw_poultry             DOUBLE PRECISION DEFAULT 0,
    ghw_rpo_pruning         DOUBLE PRECISION DEFAULT 0,
    ghw_rsu_organic         DOUBLE PRECISION DEFAULT 0,
    ghw_soybean             DOUBLE PRECISION DEFAULT 0,
    ghw_sugarcane           DOUBLE PRECISION DEFAULT 0,
    ghw_swine               DOUBLE PRECISION DEFAULT 0,

    -- geographic / demographic
    codigo_municipio        INTEGER,
    populacao_2022          INTEGER,
    area_km2                DOUBLE PRECISION,
    densidade_demografica   DOUBLE PRECISION,
    cd_rgi                  INTEGER,
    nm_rgi                  TEXT,
    cd_rgint                INTEGER,
    nm_rgint                TEXT,
    lat                     DOUBLE PRECISION,
    lon                     DOUBLE PRECISION,

    -- potential metadata
    categoria_potencial     TEXT,
    mun_potential_class     TEXT,
    mun_total_GWh           DOUBLE PRECISION,
    mun_n_streams           INTEGER,
    mun_dominant_stream     TEXT,

    -- clustering columns — populated by cp2b_clustering.py
    cluster_id              INTEGER,
    cluster_label           TEXT,
    cluster_k               INTEGER,

    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ms_ibge      ON municipality_summary (ibge_code);
CREATE INDEX IF NOT EXISTS idx_ms_cluster   ON municipality_summary (cluster_id);
CREATE INDEX IF NOT EXISTS idx_ms_rgint     ON municipality_summary (cd_rgint);
CREATE INDEX IF NOT EXISTS idx_ms_class     ON municipality_summary (mun_potential_class);

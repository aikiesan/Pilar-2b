-- ============================================================================
-- PILAR-2b V3 - Intermediate Regions Table
-- 133 IBGE intermediate regions (Regiões Geográficas Intermediárias, 2017)
-- Run this in Supabase SQL editor BEFORE executing load_national_intermediate_data.py
-- ============================================================================

-- Main table
CREATE TABLE IF NOT EXISTS intermediate_regions (
    ibge_code          VARCHAR(6) PRIMARY KEY,  -- cd_rgint (4-digit string from IBGE CSV)
    name               TEXT NOT NULL,
    state_code         VARCHAR(2) NOT NULL,     -- cd_uf (IBGE UF code, e.g. '35' for SP)
    centroid_lat       NUMERIC(10,6),
    centroid_lng       NUMERIC(10,6),
    area_km2           NUMERIC(12,2),
    population         INTEGER,
    municipality_count INTEGER DEFAULT 0,

    -- Biogas potential (m³/year) — aggregated from municipalities
    total_biogas_m3_year            NUMERIC(15,2) DEFAULT 0,
    agricultural_biogas_m3_year     NUMERIC(15,2) DEFAULT 0,
    livestock_biogas_m3_year        NUMERIC(15,2) DEFAULT 0,
    urban_biogas_m3_year            NUMERIC(15,2) DEFAULT 0,

    -- Per-residue biogas
    sugarcane_biogas_m3_year        NUMERIC(15,2) DEFAULT 0,
    soybean_biogas_m3_year          NUMERIC(15,2) DEFAULT 0,
    corn_biogas_m3_year             NUMERIC(15,2) DEFAULT 0,
    coffee_biogas_m3_year           NUMERIC(15,2) DEFAULT 0,
    citrus_biogas_m3_year           NUMERIC(15,2) DEFAULT 0,
    cattle_biogas_m3_year           NUMERIC(15,2) DEFAULT 0,
    swine_biogas_m3_year            NUMERIC(15,2) DEFAULT 0,
    poultry_biogas_m3_year          NUMERIC(15,2) DEFAULT 0,
    aquaculture_biogas_m3_year      NUMERIC(15,2) DEFAULT 0,
    rsu_biogas_m3_year              NUMERIC(15,2) DEFAULT 0,
    rpo_biogas_m3_year              NUMERIC(15,2) DEFAULT 0,

    -- Biomass availability (tons/year) — aggregated from municipalities
    total_biomass_tons_year         NUMERIC(15,2) DEFAULT 0,
    agricultural_biomass_tons_year  NUMERIC(15,2) DEFAULT 0,
    livestock_biomass_tons_year     NUMERIC(15,2) DEFAULT 0,
    urban_biomass_tons_year         NUMERIC(15,2) DEFAULT 0,

    -- Per-residue biomass
    sugarcane_biomass_tons_year     NUMERIC(15,2) DEFAULT 0,
    soybean_biomass_tons_year       NUMERIC(15,2) DEFAULT 0,
    corn_biomass_tons_year          NUMERIC(15,2) DEFAULT 0,
    coffee_biomass_tons_year        NUMERIC(15,2) DEFAULT 0,
    citrus_biomass_tons_year        NUMERIC(15,2) DEFAULT 0,
    cattle_biomass_tons_year        NUMERIC(15,2) DEFAULT 0,
    swine_biomass_tons_year         NUMERIC(15,2) DEFAULT 0,
    poultry_biomass_tons_year       NUMERIC(15,2) DEFAULT 0,
    aquaculture_biomass_tons_year   NUMERIC(15,2) DEFAULT 0,
    rsu_biomass_tons_year           NUMERIC(15,2) DEFAULT 0,
    rpo_biomass_tons_year           NUMERIC(15,2) DEFAULT 0,

    -- Metadata
    data_source        TEXT DEFAULT 'aggregated_from_municipalities',
    last_updated       TIMESTAMPTZ DEFAULT now()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_intermediate_regions_state ON intermediate_regions(state_code);
CREATE INDEX IF NOT EXISTS idx_intermediate_regions_biogas ON intermediate_regions(total_biogas_m3_year DESC);
CREATE INDEX IF NOT EXISTS idx_intermediate_regions_biomass ON intermediate_regions(total_biomass_tons_year DESC);

-- The br_region_distances table (referenced by br_intermediary_regions_distances.sql)
CREATE TABLE IF NOT EXISTS br_region_distances (
    origin_cd_rgint  VARCHAR(6) NOT NULL,
    target_cd_rgint  VARCHAR(6) NOT NULL,
    distance_km      NUMERIC(10,2),
    distance_squared NUMERIC(20,4),
    distance_cubed   NUMERIC(30,6),
    PRIMARY KEY (origin_cd_rgint, target_cd_rgint)
);

CREATE INDEX IF NOT EXISTS idx_br_region_distances_origin ON br_region_distances(origin_cd_rgint);

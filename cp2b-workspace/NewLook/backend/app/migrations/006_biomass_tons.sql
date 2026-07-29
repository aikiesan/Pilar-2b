-- Migration 006: Add biomass availability columns (tons/year) to municipalities
-- These columns store the raw feedstock quantity BEFORE BMP conversion.
-- Populated by backend/scripts/load_biomass_tons.py using MapBiomas 2024
-- land-use areas × yield factors (crops) and reverse-BMP formula (livestock/urban).

ALTER TABLE municipalities
  ADD COLUMN IF NOT EXISTS total_biomass_tons_year         NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS agricultural_biomass_tons_year  NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS livestock_biomass_tons_year     NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS urban_biomass_tons_year         NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sugarcane_biomass_tons_year     NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS soybean_biomass_tons_year       NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS corn_biomass_tons_year          NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coffee_biomass_tons_year        NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS citrus_biomass_tons_year        NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cattle_biomass_tons_year        NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS swine_biomass_tons_year         NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS poultry_biomass_tons_year       NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS aquaculture_biomass_tons_year   NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rsu_biomass_tons_year           NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rpo_biomass_tons_year           NUMERIC(15,2) DEFAULT 0;

COMMENT ON COLUMN municipalities.total_biomass_tons_year        IS 'Total raw biomass availability (t/yr) — sum of all residue streams';
COMMENT ON COLUMN municipalities.agricultural_biomass_tons_year IS 'Agricultural crop residues (t/yr): sugarcane + soybean + corn + coffee + citrus';
COMMENT ON COLUMN municipalities.livestock_biomass_tons_year    IS 'Livestock manure/residues (t/yr): cattle + swine + poultry + aquaculture';
COMMENT ON COLUMN municipalities.urban_biomass_tons_year        IS 'LEGACY 2023 semantics: urban organic residues (t/yr), including the former rpo/sludge association; not a published-value definition';
COMMENT ON COLUMN municipalities.sugarcane_biomass_tons_year    IS 'Sugarcane straw (palhiço) t/yr — MapBiomas area × 12 t/ha yield factor';
COMMENT ON COLUMN municipalities.soybean_biomass_tons_year      IS 'Soybean crop residues (stalks+pods) t/yr — MapBiomas area × 4 t/ha';
COMMENT ON COLUMN municipalities.corn_biomass_tons_year         IS 'Corn stover t/yr — MapBiomas Other Temp. Crops area × 4.5 t/ha (estimated)';
COMMENT ON COLUMN municipalities.coffee_biomass_tons_year       IS 'Coffee husks/pulp t/yr — MapBiomas area × 0.6 t/ha';
COMMENT ON COLUMN municipalities.citrus_biomass_tons_year       IS 'Citrus peel/bagasse t/yr — MapBiomas area × 5 t/ha processing residue';
COMMENT ON COLUMN municipalities.cattle_biomass_tons_year       IS 'Cattle manure t/yr — reverse BMP from cattle_biogas_m3_year';
COMMENT ON COLUMN municipalities.swine_biomass_tons_year        IS 'Swine manure t/yr — reverse BMP from swine_biogas_m3_year';
COMMENT ON COLUMN municipalities.poultry_biomass_tons_year      IS 'Poultry litter/manure t/yr — reverse BMP from poultry_biogas_m3_year';
COMMENT ON COLUMN municipalities.aquaculture_biomass_tons_year  IS 'Aquaculture organic residue t/yr — reverse BMP from aquaculture_biogas_m3_year';
COMMENT ON COLUMN municipalities.rsu_biomass_tons_year          IS 'RSU organic fraction (FORSU) t/yr — reverse BMP from rsu_biogas_m3_year';
COMMENT ON COLUMN municipalities.rpo_biomass_tons_year          IS 'LEGACY: former rpo/sewage-sludge association. B-URG-4c defines public rpo as urban pruning waste; do not use this comment as a published-value definition';

-- Verify migration:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'municipalities' AND column_name LIKE '%biomass%'
-- ORDER BY column_name;

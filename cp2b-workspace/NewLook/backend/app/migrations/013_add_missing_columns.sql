-- Migration 013: Add columns referenced by the GeoJSON endpoint but missing from
-- the initial schema. These were originally in the V2 data model and the backend
-- code expects them.  Safe to run on an existing database (all statements use
-- ADD COLUMN IF NOT EXISTS / CREATE INDEX IF NOT EXISTS).

-- Residues (tons/year) — raw substrate quantities before biogas conversion
ALTER TABLE municipalities
    ADD COLUMN IF NOT EXISTS sugarcane_residues_tons_year NUMERIC(15,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS soybean_residues_tons_year   NUMERIC(15,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS corn_residues_tons_year      NUMERIC(15,2) DEFAULT 0;

-- Forestry biogas — stubbed to 0 (silviculture data not yet collected)
ALTER TABLE municipalities
    ADD COLUMN IF NOT EXISTS forestry_biogas_m3_year NUMERIC(15,2) DEFAULT 0;

-- Potential category — derived tier label used by the map legend.
-- Populated on insert/update by application logic; also updated by the
-- trigger below so it stays consistent when total_biogas_m3_year changes.
ALTER TABLE municipalities
    ADD COLUMN IF NOT EXISTS potential_category VARCHAR(20);

-- Back-fill for rows already in the table
UPDATE municipalities
SET potential_category = CASE
    WHEN COALESCE(total_biogas_m3_year, 0) > 100000000 THEN 'ALTO'
    WHEN COALESCE(total_biogas_m3_year, 0) > 10000000  THEN 'MEDIO'
    WHEN COALESCE(total_biogas_m3_year, 0) > 0         THEN 'BAIXO'
    ELSE 'SEM DADOS'
END
WHERE potential_category IS NULL;

CREATE INDEX IF NOT EXISTS idx_municipalities_potential_category
    ON municipalities (potential_category);

-- PILAR-2b - IBGE municipality indicators
-- Adds source/versioned demographic, territorial, and GDP fields used by map
-- municipality profiles and future calculations.

ALTER TABLE municipalities
    ADD COLUMN IF NOT EXISTS population_density NUMERIC(12, 4),
    ADD COLUMN IF NOT EXISTS population_year INTEGER,
    ADD COLUMN IF NOT EXISTS area_year INTEGER,
    ADD COLUMN IF NOT EXISTS gdp_year INTEGER,
    ADD COLUMN IF NOT EXISTS immediate_region_code VARCHAR(6),
    ADD COLUMN IF NOT EXISTS intermediate_region_code VARCHAR(4),
    ADD COLUMN IF NOT EXISTS centroid_lat NUMERIC(10, 6),
    ADD COLUMN IF NOT EXISTS centroid_lng NUMERIC(10, 6),
    ADD COLUMN IF NOT EXISTS ibge_data_source TEXT;

CREATE INDEX IF NOT EXISTS idx_municipalities_immediate_region_code
    ON municipalities (immediate_region_code);

CREATE INDEX IF NOT EXISTS idx_municipalities_intermediate_region_code
    ON municipalities (intermediate_region_code);

CREATE INDEX IF NOT EXISTS idx_municipalities_centroid_lat_lng
    ON municipalities (centroid_lat, centroid_lng);

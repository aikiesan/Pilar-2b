-- PILAR-2b V3 - Initial Database Schema
-- PostgreSQL + PostGIS for geospatial biogas analysis
-- Run this script in Supabase SQL Editor

-- ============================================================================
-- ENABLE POSTGIS EXTENSION
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- ============================================================================
-- MUNICIPALITIES TABLE
-- Core table with biogas potential data for 645 São Paulo municipalities
-- ============================================================================

CREATE TABLE IF NOT EXISTS municipalities (
    id SERIAL PRIMARY KEY,

    -- Basic Information
    municipality_name VARCHAR(100) NOT NULL,
    ibge_code VARCHAR(7) UNIQUE,

    -- Geographic Data
    geometry GEOMETRY(MultiPolygon, 4326),  -- Municipality boundaries
    centroid GEOMETRY(Point, 4326),          -- Municipality center point
    centroid_lat NUMERIC(10, 6),
    centroid_lng NUMERIC(10, 6),
    area_km2 NUMERIC(10, 2),
    area_year INTEGER,

    -- Regional Classification
    administrative_region VARCHAR(100),
    immediate_region VARCHAR(100),
    immediate_region_code VARCHAR(6),
    intermediate_region VARCHAR(100),
    intermediate_region_code VARCHAR(4),

    -- Total Biogas Potential (m³/year)
    total_biogas_m3_year NUMERIC(15, 2) DEFAULT 0,
    total_biogas_m3_day NUMERIC(15, 2) DEFAULT 0,

    -- Biogas by Sector (m³/year)
    urban_biogas_m3_year NUMERIC(15, 2) DEFAULT 0,
    agricultural_biogas_m3_year NUMERIC(15, 2) DEFAULT 0,
    livestock_biogas_m3_year NUMERIC(15, 2) DEFAULT 0,

    -- Urban Waste Detail
    rsu_biogas_m3_year NUMERIC(15, 2) DEFAULT 0,  -- Municipal Solid Waste
    rpo_biogas_m3_year NUMERIC(15, 2) DEFAULT 0,  -- Organic Waste

    -- Agricultural Substrates (m³/year)
    sugarcane_biogas_m3_year NUMERIC(15, 2) DEFAULT 0,
    soybean_biogas_m3_year NUMERIC(15, 2) DEFAULT 0,
    corn_biogas_m3_year NUMERIC(15, 2) DEFAULT 0,
    coffee_biogas_m3_year NUMERIC(15, 2) DEFAULT 0,
    citrus_biogas_m3_year NUMERIC(15, 2) DEFAULT 0,

    -- Livestock Substrates (m³/year)
    cattle_biogas_m3_year NUMERIC(15, 2) DEFAULT 0,
    swine_biogas_m3_year NUMERIC(15, 2) DEFAULT 0,
    poultry_biogas_m3_year NUMERIC(15, 2) DEFAULT 0,
    aquaculture_biogas_m3_year NUMERIC(15, 2) DEFAULT 0,

    -- Energy Potential
    energy_potential_kwh_day NUMERIC(15, 2) DEFAULT 0,
    energy_potential_mwh_year NUMERIC(15, 2) DEFAULT 0,

    -- Environmental Impact
    co2_reduction_tons_year NUMERIC(15, 2) DEFAULT 0,

    -- Population Data
    population INTEGER,
    population_density NUMERIC(12, 4),
    population_year INTEGER,
    urban_population INTEGER,
    rural_population INTEGER,

    -- Economic Data
    gdp_total NUMERIC(15, 2),
    gdp_per_capita NUMERIC(10, 2),
    gdp_year INTEGER,
    ibge_data_source TEXT,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT valid_biogas_values CHECK (total_biogas_m3_year >= 0),
    CONSTRAINT valid_geometry CHECK (ST_IsValid(geometry) OR geometry IS NULL)
);

-- Create spatial index for fast geographic queries
CREATE INDEX idx_municipalities_geometry ON municipalities USING GIST (geometry);
CREATE INDEX idx_municipalities_centroid ON municipalities USING GIST (centroid);
CREATE INDEX idx_municipalities_name ON municipalities (municipality_name);
CREATE INDEX idx_municipalities_ibge ON municipalities (ibge_code);

-- Create index for ranking queries
CREATE INDEX idx_municipalities_total_biogas ON municipalities (total_biogas_m3_year DESC);

-- ============================================================================
-- BIOGAS PLANTS TABLE
-- Existing biogas plants in São Paulo state
-- ============================================================================

CREATE TABLE IF NOT EXISTS biogas_plants (
    id SERIAL PRIMARY KEY,

    -- Basic Information
    plant_name VARCHAR(200),
    plant_type VARCHAR(100),  -- Industrial, Agricultural, Urban, etc.
    status VARCHAR(50),       -- Operational, Under Construction, Planned

    -- Location
    municipality_id INTEGER REFERENCES municipalities(id),
    location GEOMETRY(Point, 4326) NOT NULL,
    address TEXT,

    -- Technical Data
    installed_capacity_m3_day NUMERIC(10, 2),
    substrate_type VARCHAR(100),
    technology VARCHAR(100),

    -- Operational Data
    start_date DATE,
    operator VARCHAR(200),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_biogas_plants_location ON biogas_plants USING GIST (location);
CREATE INDEX idx_biogas_plants_municipality ON biogas_plants (municipality_id);

-- ============================================================================
-- INFRASTRUCTURE LAYERS
-- Gas pipelines, power lines, substations, etc.
-- ============================================================================

CREATE TABLE IF NOT EXISTS gas_pipelines (
    id SERIAL PRIMARY KEY,

    -- Basic Information
    pipeline_name VARCHAR(200),
    pipeline_type VARCHAR(50),  -- Distribution, Transport
    operator VARCHAR(200),

    -- Geometry
    geometry GEOMETRY(MultiLineString, 4326) NOT NULL,
    length_km NUMERIC(10, 2),

    -- Technical Data
    diameter_mm INTEGER,
    pressure_bar NUMERIC(10, 2),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_gas_pipelines_geometry ON gas_pipelines USING GIST (geometry);
CREATE INDEX idx_gas_pipelines_type ON gas_pipelines (pipeline_type);

CREATE TABLE IF NOT EXISTS power_transmission_lines (
    id SERIAL PRIMARY KEY,

    -- Basic Information
    line_name VARCHAR(200),
    voltage_kv INTEGER,
    operator VARCHAR(200),

    -- Geometry
    geometry GEOMETRY(MultiLineString, 4326) NOT NULL,
    length_km NUMERIC(10, 2),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_power_lines_geometry ON power_transmission_lines USING GIST (geometry);

CREATE TABLE IF NOT EXISTS power_substations (
    id SERIAL PRIMARY KEY,

    -- Basic Information
    substation_name VARCHAR(200),
    voltage_kv INTEGER,
    operator VARCHAR(200),

    -- Location
    location GEOMETRY(Point, 4326) NOT NULL,
    municipality_id INTEGER REFERENCES municipalities(id),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_substations_location ON power_substations USING GIST (location);

CREATE TABLE IF NOT EXISTS wastewater_treatment_plants (
    id SERIAL PRIMARY KEY,

    -- Basic Information
    ete_name VARCHAR(200),
    capacity_m3_day NUMERIC(10, 2),
    operator VARCHAR(200),

    -- Location
    location GEOMETRY(Point, 4326) NOT NULL,
    municipality_id INTEGER REFERENCES municipalities(id),

    -- Technical Data
    population_served INTEGER,
    treatment_type VARCHAR(100),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_etes_location ON wastewater_treatment_plants USING GIST (location);

-- ============================================================================
-- SCIENTIFIC REFERENCES TABLE
-- 58 scientific papers for RAG AI system
-- ============================================================================

CREATE TABLE IF NOT EXISTS scientific_references (
    id SERIAL PRIMARY KEY,

    -- Paper Identification
    paper_id INTEGER UNIQUE,
    doi VARCHAR(200),
    title TEXT NOT NULL,
    authors TEXT,

    -- Publication Info
    journal VARCHAR(300),
    publisher VARCHAR(200),
    publication_year INTEGER,

    -- Content
    abstract TEXT,
    keywords TEXT,

    -- Classification
    sector VARCHAR(100),
    sector_full VARCHAR(200),
    primary_residue VARCHAR(100),

    -- Metadata
    pdf_filename VARCHAR(300),
    codename_short VARCHAR(100),
    external_url TEXT,
    validation_status VARCHAR(50),
    has_validated_params BOOLEAN DEFAULT FALSE,
    metadata_confidence VARCHAR(20),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_references_sector ON scientific_references (sector);
CREATE INDEX idx_references_year ON scientific_references (publication_year DESC);
CREATE INDEX idx_references_validation ON scientific_references (validation_status);

-- ============================================================================
-- ANALYSIS RESULTS TABLE
-- Store MCDA analysis results and custom user analyses
-- ============================================================================

CREATE TABLE IF NOT EXISTS analysis_results (
    id SERIAL PRIMARY KEY,

    -- Analysis Metadata
    analysis_name VARCHAR(200) NOT NULL,
    analysis_type VARCHAR(50),  -- MCDA, Proximity, Custom
    user_id UUID REFERENCES auth.users(id),

    -- Analysis Configuration
    parameters JSONB,  -- Store weights, criteria, filters

    -- Results
    municipality_id INTEGER REFERENCES municipalities(id),
    score NUMERIC(10, 4),
    ranking INTEGER,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_analysis_results_user ON analysis_results (user_id);
CREATE INDEX idx_analysis_results_type ON analysis_results (analysis_type);
CREATE INDEX idx_analysis_results_score ON analysis_results (score DESC);

-- ============================================================================
-- USER PREFERENCES TABLE
-- Store user settings and saved configurations
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,

    user_id UUID REFERENCES auth.users(id) UNIQUE,

    -- Preferences
    default_map_center GEOMETRY(Point, 4326),
    default_zoom_level INTEGER DEFAULT 7,
    favorite_municipalities INTEGER[] DEFAULT ARRAY[]::INTEGER[],

    -- Saved Filters
    saved_filters JSONB,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_preferences_user ON user_preferences (user_id);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_municipalities_updated_at
    BEFORE UPDATE ON municipalities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_biogas_plants_updated_at
    BEFORE UPDATE ON biogas_plants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SPATIAL QUERY HELPER FUNCTIONS
-- ============================================================================

-- Function to find municipalities within radius of a point
CREATE OR REPLACE FUNCTION municipalities_within_radius(
    lat NUMERIC,
    lng NUMERIC,
    radius_km NUMERIC
)
RETURNS TABLE (
    municipality_id INTEGER,
    municipality_name VARCHAR(100),
    distance_km NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.id,
        m.municipality_name,
        ROUND(ST_Distance(
            ST_Transform(m.centroid, 3857),
            ST_Transform(ST_SetSRID(ST_MakePoint(lng, lat), 4326), 3857)
        )::NUMERIC / 1000, 2) as distance_km
    FROM municipalities m
    WHERE ST_DWithin(
        ST_Transform(m.centroid, 3857),
        ST_Transform(ST_SetSRID(ST_MakePoint(lng, lat), 4326), 3857),
        radius_km * 1000
    )
    ORDER BY distance_km;
END;
$$ LANGUAGE plpgsql;

-- Function to get top N municipalities by biogas potential
CREATE OR REPLACE FUNCTION top_biogas_municipalities(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
    municipality_name VARCHAR(100),
    total_biogas_m3_year NUMERIC,
    energy_potential_mwh_year NUMERIC,
    ranking INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.municipality_name,
        m.total_biogas_m3_year,
        m.energy_potential_mwh_year,
        ROW_NUMBER() OVER (ORDER BY m.total_biogas_m3_year DESC)::INTEGER as ranking
    FROM municipalities m
    WHERE m.total_biogas_m3_year > 0
    ORDER BY m.total_biogas_m3_year DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View for municipality summary with rankings
CREATE OR REPLACE VIEW municipality_rankings AS
SELECT
    m.id,
    m.municipality_name,
    m.ibge_code,
    m.total_biogas_m3_year,
    m.energy_potential_mwh_year,
    m.co2_reduction_tons_year,
    ROW_NUMBER() OVER (ORDER BY m.total_biogas_m3_year DESC) as total_ranking,
    ROW_NUMBER() OVER (ORDER BY m.urban_biogas_m3_year DESC) as urban_ranking,
    ROW_NUMBER() OVER (ORDER BY m.agricultural_biogas_m3_year DESC) as agricultural_ranking,
    ROW_NUMBER() OVER (ORDER BY m.livestock_biogas_m3_year DESC) as livestock_ranking,
    ST_AsGeoJSON(m.centroid)::json as centroid_geojson
FROM municipalities m
WHERE m.total_biogas_m3_year > 0;

-- View for infrastructure proximity analysis
CREATE OR REPLACE VIEW municipalities_with_infrastructure AS
SELECT
    m.id,
    m.municipality_name,
    m.total_biogas_m3_year,
    COUNT(DISTINCT bp.id) as biogas_plants_count,
    COUNT(DISTINCT ps.id) as substations_count,
    COUNT(DISTINCT ete.id) as etes_count
FROM municipalities m
LEFT JOIN biogas_plants bp ON bp.municipality_id = m.id
LEFT JOIN power_substations ps ON ps.municipality_id = m.id
LEFT JOIN wastewater_treatment_plants ete ON ete.municipality_id = m.id
GROUP BY m.id, m.municipality_name, m.total_biogas_m3_year;

-- ============================================================================
-- GRANTS AND PERMISSIONS
-- ============================================================================

-- Grant read access to authenticated users
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Grant write access to authenticated users for their own data
GRANT INSERT, UPDATE, DELETE ON analysis_results TO authenticated;
GRANT INSERT, UPDATE, DELETE ON user_preferences TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE municipalities IS '645 São Paulo municipalities with biogas potential data and geographic boundaries';
COMMENT ON TABLE biogas_plants IS 'Existing biogas plants in São Paulo state';
COMMENT ON TABLE gas_pipelines IS 'Gas distribution and transport pipeline network';
COMMENT ON TABLE power_transmission_lines IS 'Electrical transmission lines';
COMMENT ON TABLE power_substations IS 'Electrical substations';
COMMENT ON TABLE wastewater_treatment_plants IS 'Wastewater treatment plants (ETEs)';
COMMENT ON TABLE scientific_references IS '58 scientific papers for RAG AI assistant';
COMMENT ON TABLE analysis_results IS 'MCDA and custom analysis results';
COMMENT ON TABLE user_preferences IS 'User settings and saved configurations';

COMMENT ON FUNCTION municipalities_within_radius IS 'Find municipalities within specified radius (km) of a point';
COMMENT ON FUNCTION top_biogas_municipalities IS 'Get top N municipalities ranked by biogas potential';

-- ============================================================================
-- SAMPLE QUERY EXAMPLES (FOR DOCUMENTATION)
-- ============================================================================

/*
-- Example 1: Get top 10 municipalities by biogas potential
SELECT * FROM top_biogas_municipalities(10);

-- Example 2: Find municipalities within 50km of São Paulo city center
SELECT * FROM municipalities_within_radius(-23.5505, -46.6333, 50);

-- Example 3: Get municipality with infrastructure count
SELECT * FROM municipalities_with_infrastructure
WHERE total_biogas_m3_year > 1000000
ORDER BY biogas_plants_count DESC
LIMIT 20;

-- Example 4: Spatial query - municipalities intersecting with gas pipeline
SELECT DISTINCT m.municipality_name, m.total_biogas_m3_year
FROM municipalities m
JOIN gas_pipelines gp ON ST_Intersects(m.geometry, gp.geometry)
WHERE gp.pipeline_type = 'Transport'
ORDER BY m.total_biogas_m3_year DESC;

-- Example 5: Get GeoJSON for all municipalities
SELECT jsonb_build_object(
    'type', 'FeatureCollection',
    'features', jsonb_agg(
        jsonb_build_object(
            'type', 'Feature',
            'geometry', ST_AsGeoJSON(geometry)::jsonb,
            'properties', jsonb_build_object(
                'name', municipality_name,
                'biogas', total_biogas_m3_year
            )
        )
    )
) FROM municipalities;
*/

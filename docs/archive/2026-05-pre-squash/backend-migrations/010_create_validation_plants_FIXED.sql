-- =====================================================================
-- PILAR-2b V3 - Validation Plants Table (FIXED VERSION)
-- Migration: 010_create_validation_plants_FIXED.sql
-- Purpose: Store operational biogas plant data for model validation
-- Author: CP2B Project Team
-- Date: 2025-12-09
-- =====================================================================

-- Enable PostGIS extension if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- =====================================================================
-- TABLE: validation_plants
-- Stores operational biogas plants used to validate correction factors
-- =====================================================================

CREATE TABLE IF NOT EXISTS validation_plants (
    -- Primary identification
    plant_id SERIAL PRIMARY KEY,
    plant_name VARCHAR(255) NOT NULL,

    -- Geographic location
    municipality_id INT, -- Optional FK - can be NULL if municipality not in main table
    municipality_name VARCHAR(255),
    state VARCHAR(2) DEFAULT 'SP',
    lat DECIMAL(10,8) NOT NULL,
    lon DECIMAL(11,8) NOT NULL,
    geom GEOMETRY(Point, 4326), -- PostGIS point geometry

    -- Plant characteristics
    plant_type VARCHAR(50) NOT NULL CHECK (plant_type IN (
        'sugarcane',           -- Sucroenergético
        'livestock',           -- Pecuária
        'urban_waste',         -- RSU (aterro sanitário)
        'agroindustrial',      -- Agroindústria
        'wastewater'           -- Estação de tratamento
    )),
    operational_status VARCHAR(20) DEFAULT 'operational' CHECK (operational_status IN (
        'operational',         -- Em operação
        'under_construction',  -- Em construção
        'planned',             -- Planejado
        'deactivated'          -- Desativado
    )),
    start_date DATE,           -- Data de início de operação
    installed_capacity_mw DECIMAL(10,4), -- Capacidade instalada elétrica (MW)

    -- Feedstock composition (JSONB for flexible structure)
    -- Example: {"sugarcane_straw": 0.70, "vinasse": 0.30}
    feedstock_mix JSONB NOT NULL,
    primary_feedstock VARCHAR(100) NOT NULL,

    -- Operational data
    annual_throughput_tons DECIMAL(12,2), -- Throughput total anual (toneladas)
    annual_biogas_production_nm3 DECIMAL(15,2), -- Produção de biogás (Nm³/ano)
    operational_months_per_year INT DEFAULT 12 CHECK (operational_months_per_year BETWEEN 1 AND 12),

    -- Catchment area analysis
    catchment_radius_km INT DEFAULT 30 CHECK (catchment_radius_km > 0),
    catchment_area_ha DECIMAL(12,2), -- Área do buffer de captação (hectares)

    -- Google Earth Engine validation results
    gee_land_use_distribution JSONB,
    /* Example structure:
    {
        "sugarcane_ha": 8542,
        "pasture_ha": 3201,
        "urban_ha": 580,
        "forest_ha": 243,
        "analysis_year": 2023
    }
    */
    gee_analysis_date DATE,
    gee_mapbiomas_collection VARCHAR(20), -- e.g., "Collection 10.0"

    -- Validation calculations
    theoretical_potential_nm3 DECIMAL(15,2), -- Potencial teórico calculado
    predicted_available_nm3 DECIMAL(15,2),   -- Potencial disponível (com FDE)
    actual_throughput_nm3 DECIMAL(15,2),     -- Throughput real convertido para Nm³

    -- Correction factors applied
    fc_collection DECIMAL(4,3), -- Fator de coleta aplicado
    fcp_competition DECIMAL(4,3), -- Fator de competição aplicado
    fs_seasonality DECIMAL(4,3), -- Fator de sazonalidade aplicado
    fl_logistics DECIMAL(4,3), -- Fator logístico aplicado
    fde_effective DECIMAL(4,3), -- FDE efetivo calculado

    -- Validation metrics
    prediction_error_pct DECIMAL(6,2), -- Erro de predição (%)
    utilization_rate_pct DECIMAL(6,2), -- Taxa de utilização (actual/available)

    -- Data provenance
    data_source VARCHAR(255) NOT NULL, -- e.g., "ANEEL", "CETESB", "Direct contact"
    data_source_url TEXT,
    data_year INT NOT NULL,
    data_quality VARCHAR(20) DEFAULT 'medium' CHECK (data_quality IN (
        'high',    -- Dados auditados/oficiais
        'medium',  -- Dados de licenças/relatórios
        'low'      -- Dados auto-reportados
    )),
    verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN (
        'verified',   -- Dados verificados
        'pending',    -- Aguardando verificação
        'disputed'    -- Dados com inconsistências
    )),

    -- Notes and metadata
    notes TEXT,
    validation_notes TEXT, -- Notas específicas da validação

    -- Audit fields
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(100),

    -- Constraints
    CONSTRAINT positive_throughput CHECK (annual_throughput_tons IS NULL OR annual_throughput_tons > 0),
    CONSTRAINT valid_prediction_error CHECK (prediction_error_pct IS NULL OR prediction_error_pct BETWEEN -100 AND 1000),
    CONSTRAINT valid_utilization CHECK (utilization_rate_pct IS NULL OR utilization_rate_pct >= 0)
);

-- =====================================================================
-- INDEXES for performance
-- =====================================================================

-- Spatial index
CREATE INDEX IF NOT EXISTS idx_validation_plants_geom ON validation_plants USING GIST(geom);

-- Location indexes
CREATE INDEX IF NOT EXISTS idx_validation_plants_municipality ON validation_plants(municipality_id);
CREATE INDEX IF NOT EXISTS idx_validation_plants_municipality_name ON validation_plants(municipality_name);

-- Type and status indexes
CREATE INDEX IF NOT EXISTS idx_validation_plants_type ON validation_plants(plant_type);
CREATE INDEX IF NOT EXISTS idx_validation_plants_status ON validation_plants(operational_status);
CREATE INDEX IF NOT EXISTS idx_validation_plants_source ON validation_plants(data_source);

-- JSONB indexes for feedstock and GEE data
CREATE INDEX IF NOT EXISTS idx_validation_plants_feedstock_gin ON validation_plants USING GIN(feedstock_mix);
CREATE INDEX IF NOT EXISTS idx_validation_plants_gee_gin ON validation_plants USING GIN(gee_land_use_distribution);

-- =====================================================================
-- TRIGGER: Update geometry from lat/lon
-- =====================================================================

CREATE OR REPLACE FUNCTION update_validation_plant_geom()
RETURNS TRIGGER AS $$
BEGIN
    -- Update geometry whenever lat/lon changes
    NEW.geom = ST_SetSRID(ST_MakePoint(NEW.lon, NEW.lat), 4326);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validation_plant_geom ON validation_plants;
CREATE TRIGGER trg_validation_plant_geom
    BEFORE INSERT OR UPDATE OF lat, lon ON validation_plants
    FOR EACH ROW
    EXECUTE FUNCTION update_validation_plant_geom();

-- =====================================================================
-- TRIGGER: Update timestamp
-- =====================================================================

CREATE OR REPLACE FUNCTION update_validation_plant_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validation_plant_timestamp ON validation_plants;
CREATE TRIGGER trg_validation_plant_timestamp
    BEFORE UPDATE ON validation_plants
    FOR EACH ROW
    EXECUTE FUNCTION update_validation_plant_timestamp();

-- =====================================================================
-- VIEW: validation_summary
-- Aggregated validation metrics
-- =====================================================================

CREATE OR REPLACE VIEW validation_summary AS
SELECT
    plant_type,
    operational_status,
    COUNT(*) as plant_count,
    ROUND(AVG(prediction_error_pct)::numeric, 2) as avg_error_pct,
    ROUND(STDDEV(prediction_error_pct)::numeric, 2) as stddev_error_pct,
    ROUND(AVG(utilization_rate_pct)::numeric, 2) as avg_utilization_pct,
    ROUND(AVG(fde_effective)::numeric, 3) as avg_fde,
    ROUND(SUM(annual_biogas_production_nm3)::numeric, 0) as total_production_nm3,
    ROUND(SUM(predicted_available_nm3)::numeric, 0) as total_predicted_nm3
FROM validation_plants
WHERE operational_status = 'operational'
  AND annual_biogas_production_nm3 IS NOT NULL
GROUP BY plant_type, operational_status
ORDER BY plant_type, operational_status;

-- =====================================================================
-- VIEW: validation_plants_detailed (FIXED - no municipalities join)
-- Full plant information with GeoJSON
-- =====================================================================

CREATE OR REPLACE VIEW validation_plants_detailed AS
SELECT
    vp.*,
    ST_AsGeoJSON(vp.geom) as geojson,
    ROUND((vp.predicted_available_nm3 / NULLIF(vp.theoretical_potential_nm3, 0) * 100)::numeric, 1) as availability_pct,
    CASE
        WHEN vp.utilization_rate_pct <= 10 THEN 'Very Low'
        WHEN vp.utilization_rate_pct <= 25 THEN 'Low'
        WHEN vp.utilization_rate_pct <= 50 THEN 'Medium'
        WHEN vp.utilization_rate_pct <= 75 THEN 'High'
        ELSE 'Very High'
    END as utilization_category
FROM validation_plants vp;

-- =====================================================================
-- SAMPLE DATA: Insert 6 existing validation plants with UNICA calibration
-- =====================================================================

-- Note: Using UNICA 2024/2025 calibration (36.1 L ethanol/ton cane for SP)

INSERT INTO validation_plants (
    plant_name, municipality_name, lat, lon, plant_type, operational_status,
    start_date, primary_feedstock, feedstock_mix,
    annual_throughput_tons, annual_biogas_production_nm3,
    catchment_radius_km, data_source, data_year, data_quality,
    fcp_competition, fde_effective,
    notes
) VALUES
-- Sugarcane plants (UNICA calibrated)
(
    'Cocal Narandiba',
    'Narandiba',
    -22.2500, -51.5000,
    'sugarcane',
    'operational',
    '2019-01-01',
    'vinasse',
    '{"vinasse": 0.85, "filter_cake": 0.15}'::jsonb,
    NULL, -- Will be calculated from vinasse volume
    8900000, -- 8.9M Nm³/year (real data)
    30,
    'ANEEL/EPE 2023',
    2023,
    'high',
    0.801, -- Weighted FCp after UNICA calibration
    0.143, -- FDE effective
    'UNICA calibration applied: 36.1 L ethanol/ton cane (SP 2024/2025). Utilization: 43.4% (vs 38.8% before calibration). Dedicated biogas facility with vinasse biodigesters.'
),
(
    'Raízen Geo Biogás Bonfim',
    'Guariba',
    -21.3500, -48.2500,
    'sugarcane',
    'operational',
    '2020-01-01',
    'vinasse',
    '{"vinasse": 0.80, "filter_cake": 0.20}'::jsonb,
    NULL,
    19000000, -- 19M Nm³/year (real data)
    30,
    'ANEEL/EPE 2023',
    2023,
    'high',
    0.801, -- Weighted FCp after UNICA calibration
    0.143, -- FDE effective
    'UNICA calibration applied: 36.1 L ethanol/ton cane. Utilization: 40.9% (vs 36.5% before). Largest sugarcane biogas plant in Brazil. Co-located with Raízen Bonfim ethanol mill.'
),

-- Urban waste plants (validated ✅)
(
    'CTL Sapopemba',
    'São Paulo',
    -23.6200, -46.4800,
    'urban_waste',
    'operational',
    '2022-01-01',
    'urban_solid_waste',
    '{"urban_solid_waste": 1.0}'::jsonb,
    450000, -- 450k tons/year MSW
    10000000, -- 10M Nm³/year
    30,
    'CETESB License',
    2023,
    'medium',
    0.20, -- FCp for urban waste
    0.612, -- FDE for urban waste
    'Metropolitan landfill - early operation phase. Utilization: 6.9% (ramp-up expected).'
),
(
    'UTGR Jambeiro',
    'Jambeiro',
    -23.2500, -45.6800,
    'urban_waste',
    'operational',
    '2021-01-01',
    'urban_solid_waste',
    '{"urban_solid_waste": 1.0}'::jsonb,
    180000, -- 180k tons/year MSW
    9500000, -- 9.5M Nm³/year
    20,
    'CETESB License',
    2023,
    'medium',
    0.20,
    0.612,
    'Regional landfill - Vale do Paraíba. Utilization: 42.2% (mature regional facility).'
),
(
    'CDR Pedreira',
    'São Paulo',
    -23.5500, -46.6300,
    'urban_waste',
    'operational',
    '2022-01-01',
    'urban_solid_waste',
    '{"urban_solid_waste": 1.0}'::jsonb,
    520000, -- 520k tons/year MSW
    10000000, -- 10M Nm³/year
    30,
    'CETESB License',
    2023,
    'medium',
    0.20,
    0.612,
    'Metropolitan landfill - early operation phase. Utilization: 6.0% (ramp-up expected).'
),
(
    'Lara Central Tratamento de Resíduos',
    'Mauá',
    -23.6700, -46.4600,
    'urban_waste',
    'operational',
    '2015-01-01',
    'urban_solid_waste',
    '{"urban_solid_waste": 1.0}'::jsonb,
    600000, -- 600k tons/year MSW
    16000000, -- 16M Nm³/year
    30,
    'CETESB License',
    2023,
    'high',
    0.20,
    0.612,
    'Mature landfill plant - operational since 2015. Utilization: 12.1% (validates FDE=0.612 for urban waste).'
);

-- =====================================================================
-- COMMENTS for documentation
-- =====================================================================

COMMENT ON TABLE validation_plants IS
'Operational biogas plants used to validate CP2B correction factor model with UNICA 2024/2025 calibration';

COMMENT ON COLUMN validation_plants.fcp_competition IS
'Competition factor: 0.801 for sugarcane (UNICA calibrated), 0.20 for urban waste';

COMMENT ON COLUMN validation_plants.fde_effective IS
'Effective Surplus Availability Factor: FDE = FC × (1 - FCp) × FS × FL. Sugarcane: 0.143, Urban waste: 0.612';

-- =====================================================================
-- GRANT permissions (adjust based on your Supabase roles)
-- =====================================================================

-- Grant read access to authenticated users
GRANT SELECT ON validation_plants TO authenticated;
GRANT SELECT ON validation_summary TO authenticated;
GRANT SELECT ON validation_plants_detailed TO authenticated;

-- Grant full access to service role
GRANT ALL ON validation_plants TO service_role;

-- =====================================================================
-- VERIFICATION QUERIES
-- =====================================================================

-- Check table was created
SELECT COUNT(*) as plant_count FROM validation_plants;

-- View validation summary
SELECT * FROM validation_summary;

-- Check UNICA calibration data
SELECT
    plant_name,
    plant_type,
    ROUND(fcp_competition::numeric, 3) as fcp,
    ROUND(fde_effective::numeric, 3) as fde,
    ROUND((annual_biogas_production_nm3 / 1000000.0)::numeric, 1) as production_millions_nm3
FROM validation_plants
WHERE plant_type = 'sugarcane'
ORDER BY plant_name;

-- =====================================================================
-- END OF MIGRATION
-- =====================================================================

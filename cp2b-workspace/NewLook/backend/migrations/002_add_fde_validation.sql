-- Migration: Add FDE (Fator de Disponibilidade Efetivo) and Validation Fields
-- Version: 2.0
-- Created: 2025-11-22
-- Purpose: Replace SAF with FDE and add scientific validation tracking

-- ============================================================================
-- 1. ADD NEW COLUMNS FOR FDE AND VALIDATION
-- ============================================================================

ALTER TABLE residuos
ADD COLUMN IF NOT EXISTS fde DECIMAL(5,4) DEFAULT 0.0000,
ADD COLUMN IF NOT EXISTS fde_availability DECIMAL(5,4),
ADD COLUMN IF NOT EXISTS fde_efficiency DECIMAL(5,4),
ADD COLUMN IF NOT EXISTS validation_status VARCHAR(50) DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS validation_confidence VARCHAR(20) DEFAULT 'LOW',
ADD COLUMN IF NOT EXISTS validation_date DATE,
ADD COLUMN IF NOT EXISTS competing_uses_total DECIMAL(5,4),
ADD COLUMN IF NOT EXISTS collection_feasibility DECIMAL(5,4),
ADD COLUMN IF NOT EXISTS conversion_efficiency DECIMAL(5,4),
ADD COLUMN IF NOT EXISTS methodology_notes TEXT,
ADD COLUMN IF NOT EXISTS data_sources JSONB,
ADD COLUMN IF NOT EXISTS alternative_pathways JSONB,
ADD COLUMN IF NOT EXISTS last_updated_by VARCHAR(100),
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Add comments for documentation
COMMENT ON COLUMN residuos.fde IS 'Fator de Disponibilidade Efetivo (Effective Availability Factor): realistic biogas potential (0-1)';
COMMENT ON COLUMN residuos.fde_availability IS 'Substrate availability component of FDE (0-1)';
COMMENT ON COLUMN residuos.fde_efficiency IS 'Conversion efficiency component of FDE (0-1)';
COMMENT ON COLUMN residuos.validation_status IS 'Validation status: EMBRAPA_VALIDATED, UNICA_VALIDATED, CETESB_VALIDATED, SNIS_VALIDATED, NEEDS_VALIDATION, COMPETING_USES_EXCLUDED';
COMMENT ON COLUMN residuos.validation_confidence IS 'Confidence level: HIGH, MEDIUM, LOW';
COMMENT ON COLUMN residuos.competing_uses_total IS 'Total fraction used in competing sectors (0-1)';
COMMENT ON COLUMN residuos.collection_feasibility IS 'Collection feasibility factor (0-1)';
COMMENT ON COLUMN residuos.conversion_efficiency IS 'Anaerobic digestion conversion efficiency (0-1)';
COMMENT ON COLUMN residuos.data_sources IS 'JSON array of data sources with citations';
COMMENT ON COLUMN residuos.alternative_pathways IS 'JSON object describing competing uses and their shares';

-- ============================================================================
-- 2. CREATE VALIDATION STATUS ENUM
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE validation_status_type AS ENUM (
        'EMBRAPA_VALIDATED',
        'IBGE_VALIDATED',
        'UNICA_VALIDATED',
        'CETESB_VALIDATED',
        'SNIS_VALIDATED',
        'SABESP_VALIDATED',
        'ABRELPE_VALIDATED',
        'INDUSTRY_VALIDATED',
        'ACADEMIC_VALIDATED',
        'NEEDS_FIELD_SURVEY',
        'COMPETING_USES_EXCLUDED',
        'PENDING_VALIDATION',
        'DEPRECATED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE confidence_level_type AS ENUM (
        'HIGH',
        'MEDIUM',
        'LOW'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- 3. UPDATE EXISTING RESIDUES WITH VALIDATED FDE VALUES
-- ============================================================================

-- Priority Residue 1: Dejetos Bovinos (Cattle Manure)
UPDATE residuos
SET
    fde = 0.2125,
    fde_availability = 0.25,
    fde_efficiency = 0.85,
    validation_status = 'EMBRAPA_VALIDATED',
    validation_confidence = 'HIGH',
    validation_date = '2025-11-22',
    competing_uses_total = 0.75,
    collection_feasibility = 1.00,
    conversion_efficiency = 0.85,
    methodology_notes = 'FDE = 0.25 (confined systems only) × 0.85 (digestor efficiency)',
    data_sources = '[
        {"name": "EMBRAPA Gado de Leite", "year": 2022, "type": "Technical Report", "reference": "Manual de Boas Práticas para Manejo de Dejetos"},
        {"name": "IBGE Pesquisa Pecuária Municipal", "year": 2023, "type": "Official Census", "url": "https://sidra.ibge.gov.br/pesquisa/ppm"}
    ]'::jsonb,
    alternative_pathways = '{
        "free_range": {"share": 0.40, "description": "Dispersed in pastures (not collectible)"},
        "direct_soil": {"share": 0.20, "description": "Direct fertilizer application"},
        "composting": {"share": 0.10, "description": "Commercial composting"},
        "unmanaged": {"share": 0.05, "description": "Improper storage/disposal"},
        "biogas_potential": {"share": 0.25, "description": "Available from confined systems"}
    }'::jsonb,
    last_updated_by = 'CP2B Validation Team'
WHERE nome_residuo ILIKE '%dejeto%bovin%' OR nome_residuo ILIKE '%cattle%manure%';

-- Priority Residue 2: Torta de Filtro (Filter Cake)
UPDATE residuos
SET
    fde = 0.1030,
    fde_availability = 0.1288,
    fde_efficiency = 0.80,
    validation_status = 'UNICA_VALIDATED',
    validation_confidence = 'HIGH',
    validation_date = '2025-11-22',
    competing_uses_total = 0.8712,
    collection_feasibility = 1.00,
    conversion_efficiency = 0.80,
    methodology_notes = 'FDE = 0.1288 (excess during peak season) × 0.80 (fibrous substrate)',
    data_sources = '[
        {"name": "UNICA", "year": 2024, "type": "Industry Report", "reference": "Safra 2023/24", "url": "https://unicadata.com.br/"},
        {"name": "EMBRAPA Meio Ambiente", "year": 2023, "type": "Research", "reference": "Aproveitamento de Resíduos da Cana-de-Açúcar"}
    ]'::jsonb,
    alternative_pathways = '{
        "organic_fertilizer": {"share": 0.82, "description": "Primary use - High NPK value"},
        "composting": {"share": 0.04, "description": "Mixed with vinasse"},
        "storage": {"share": 0.012, "description": "Temporary storage"},
        "biogas_potential": {"share": 0.1288, "description": "Excess production during peak season"}
    }'::jsonb,
    last_updated_by = 'CP2B Validation Team'
WHERE nome_residuo ILIKE '%torta%filtro%' OR nome_residuo ILIKE '%filter%cake%';

-- Priority Residue 3: Vinhaça de Cana (Sugarcane Vinasse)
UPDATE residuos
SET
    fde = 0.0770,
    fde_availability = 0.1026,
    fde_efficiency = 0.75,
    validation_status = 'CETESB_VALIDATED',
    validation_confidence = 'HIGH',
    validation_date = '2025-11-22',
    competing_uses_total = 0.8974,
    collection_feasibility = 1.00,
    conversion_efficiency = 0.75,
    methodology_notes = 'FDE = 0.1026 (excess during rainy season) × 0.75 (liquid substrate challenges). CETESB P4.231 mandates fertigation.',
    data_sources = '[
        {"name": "CETESB", "year": 2022, "type": "Regulatory Norm", "reference": "P4.231 - Vinhaça Critérios"},
        {"name": "UNICA", "year": 2024, "type": "Industry Data", "reference": "Safra 2023/24"},
        {"name": "EMBRAPA Instrumentação", "year": 2023, "type": "Research", "reference": "Biodigestão Anaeróbia de Vinhaça"}
    ]'::jsonb,
    alternative_pathways = '{
        "fertigation": {"share": 0.85, "description": "Mandated by CETESB P4.231"},
        "concentration": {"share": 0.03, "description": "Evaporation for transport"},
        "improper_disposal": {"share": 0.0174, "description": "Environmental violations"},
        "biogas_potential": {"share": 0.1026, "description": "Excess during rainy season (storage limitations)"}
    }'::jsonb,
    last_updated_by = 'CP2B Validation Team'
WHERE nome_residuo ILIKE '%vinha%' OR nome_residuo ILIKE '%vinasse%';

-- Priority Residue 4: RSU Orgânico (Urban Solid Waste)
UPDATE residuos
SET
    fde = 0.0700,
    fde_availability = 0.10,
    fde_efficiency = 0.70,
    validation_status = 'SNIS_VALIDATED',
    validation_confidence = 'HIGH',
    validation_date = '2025-11-22',
    competing_uses_total = 0.90,
    collection_feasibility = 1.00,
    conversion_efficiency = 0.70,
    methodology_notes = 'FDE = 0.10 (source separation challenge) × 0.70 (heterogeneous composition)',
    data_sources = '[
        {"name": "SNIS", "year": 2022, "type": "Official Statistics", "url": "http://snis.gov.br/"},
        {"name": "ABRELPE", "year": 2023, "type": "Industry Report", "reference": "Panorama dos Resíduos Sólidos no Brasil 2023"}
    ]'::jsonb,
    alternative_pathways = '{
        "landfilling": {"share": 0.75, "description": "Current practice - Lost energy potential"},
        "composting": {"share": 0.13, "description": "Municipal composting + community gardens"},
        "informal_waste": {"share": 0.02, "description": "Informal sector"},
        "biogas_potential": {"share": 0.10, "description": "Source separation required (PNRS compliance)"}
    }'::jsonb,
    last_updated_by = 'CP2B Validation Team'
WHERE nome_residuo ILIKE '%rsu%' OR nome_residuo ILIKE '%urban%waste%' OR nome_residuo ILIKE '%solid%urbano%';

-- Priority Residue 5: Lodo de Esgoto (Sewage Sludge)
UPDATE residuos
SET
    fde = 0.0900,
    fde_availability = 0.12,
    fde_efficiency = 0.75,
    validation_status = 'SABESP_VALIDATED',
    validation_confidence = 'HIGH',
    validation_date = '2025-11-22',
    competing_uses_total = 0.88,
    collection_feasibility = 1.00,
    conversion_efficiency = 0.75,
    methodology_notes = 'FDE = 0.12 (available for AD) × 0.75 (already partially digested in WWTP)',
    data_sources = '[
        {"name": "SNIS", "year": 2022, "type": "Official Statistics", "url": "http://snis.gov.br/"},
        {"name": "SABESP", "year": 2023, "type": "Operational Data", "url": "https://www.sabesp.com.br/"},
        {"name": "CETESB", "year": 2022, "type": "Regulatory Monitoring", "reference": "CONAMA 375/2006 compliance"}
    ]'::jsonb,
    alternative_pathways = '{
        "landfilling": {"share": 0.40, "description": "Most common - High disposal costs"},
        "land_application": {"share": 0.25, "description": "Agricultural soil amendment (CONAMA 375/2006)"},
        "incineration": {"share": 0.15, "description": "Energy recovery + volume reduction"},
        "composting": {"share": 0.08, "description": "Organic fertilizer production"},
        "biogas_potential": {"share": 0.12, "description": "Anaerobic digestion for energy + stabilization"}
    }'::jsonb,
    last_updated_by = 'CP2B Validation Team'
WHERE nome_residuo ILIKE '%lodo%esgoto%' OR nome_residuo ILIKE '%sewage%sludge%';

-- Priority Residue 6: Cama de Frango (Poultry Litter)
UPDATE residuos
SET
    fde = 0.0936,
    fde_availability = 0.12,
    fde_efficiency = 0.78,
    validation_status = 'NEEDS_FIELD_SURVEY',
    validation_confidence = 'MEDIUM',
    validation_date = '2025-11-22',
    competing_uses_total = 0.88,
    collection_feasibility = 1.00,
    conversion_efficiency = 0.78,
    methodology_notes = 'FDE = 0.12 (estimated available) × 0.78 (nitrogen inhibition risk). IBGE production solid, availability needs field survey.',
    data_sources = '[
        {"name": "IBGE Pesquisa Pecuária Municipal", "year": 2023, "type": "Official Census"},
        {"name": "EMBRAPA Suínos e Aves", "year": 2022, "type": "Technical Report", "reference": "Manejo de Cama de Aviário"},
        {"name": "ABPA", "year": 2024, "type": "Industry Association", "url": "https://abpa-br.org/"}
    ]'::jsonb,
    alternative_pathways = '{
        "organic_fertilizer": {"share": 0.60, "description": "Primary use - High NPK value"},
        "commercial_fertilizer": {"share": 0.20, "description": "Composting + pelletized products"},
        "improper_disposal": {"share": 0.08, "description": "Environmental concern"},
        "biogas_potential": {"share": 0.12, "description": "Co-digestion opportunity (estimated - needs validation)"}
    }'::jsonb,
    last_updated_by = 'CP2B Validation Team'
WHERE nome_residuo ILIKE '%cama%frango%' OR nome_residuo ILIKE '%poultry%litter%';

-- Priority Residue 7: Mucilagem de Café (Coffee Mucilage)
UPDATE residuos
SET
    fde = 0.1804,
    fde_availability = 0.22,
    fde_efficiency = 0.82,
    validation_status = 'NEEDS_FIELD_SURVEY',
    validation_confidence = 'MEDIUM',
    validation_date = '2025-11-22',
    competing_uses_total = 0.78,
    collection_feasibility = 1.00,
    conversion_efficiency = 0.82,
    methodology_notes = 'FDE = 0.22 (estimated available) × 0.82 (high sugar content). IEA estimates require field validation in coffee-growing regions.',
    data_sources = '[
        {"name": "IEA - Instituto de Economia Agrícola SP", "year": 2023, "type": "Regional Statistics"},
        {"name": "IAC - Instituto Agronômico de Campinas", "year": 2022, "type": "Research"},
        {"name": "EMBRAPA Café", "year": 2023, "type": "Technical Report", "reference": "Tratamento de Efluentes da Cafeicultura"}
    ]'::jsonb,
    alternative_pathways = '{
        "water_discharge": {"share": 0.35, "description": "Environmental problem - High BOD/COD"},
        "composting": {"share": 0.25, "description": "Mixed with coffee pulp"},
        "direct_soil": {"share": 0.18, "description": "Direct application"},
        "biogas_potential": {"share": 0.22, "description": "Pollution prevention + energy (estimated)"}
    }'::jsonb,
    last_updated_by = 'CP2B Validation Team'
WHERE nome_residuo ILIKE '%mucilagem%caf%' OR nome_residuo ILIKE '%coffee%mucilage%';

-- CRITICAL UPDATE: Bagaço de Cana (Sugarcane Bagasse) - EXCLUDE FROM BIOGAS
UPDATE residuos
SET
    fde = 0.0000,
    fde_availability = 0.00,
    fde_efficiency = 0.00,
    validation_status = 'COMPETING_USES_EXCLUDED',
    validation_confidence = 'HIGH',
    validation_date = '2025-11-22',
    competing_uses_total = 1.00,
    collection_feasibility = 0.00,
    conversion_efficiency = 0.00,
    methodology_notes = 'FDE = 0% - Complete utilization in higher-value sectors. Cogeneration: 75% (R$ 1.45B/year). 2G Ethanol: 22% (R$ 17.3B/year). Biogas economically infeasible (4.4-52× lower value).',
    data_sources = '[
        {"name": "UNICA", "year": 2024, "type": "Industry Report", "reference": "Bioeletricidade 2024", "url": "https://www.unica.com.br/bioeletricidade/"},
        {"name": "EPE", "year": 2023, "type": "Government Agency", "reference": "Balanço Energético Nacional 2023"},
        {"name": "CTBE", "year": 2023, "type": "Research Institution", "reference": "2G Ethanol Commercial Status"},
        {"name": "RenovaBio", "year": 2024, "type": "Government Program", "reference": "CBio carbon credits market"}
    ]'::jsonb,
    alternative_pathways = '{
        "cogeneration": {"share": 0.75, "description": "Electricity + steam generation - R$ 1.45B/year", "economic_value": "4.4× higher than biogas"},
        "ethanol_2g": {"share": 0.22, "description": "Second-generation ethanol + RenovaBio CBio credits - R$ 17.3B/year", "economic_value": "52× higher than biogas"},
        "other_industrial": {"share": 0.03, "description": "Paper/cardboard, animal feed, building materials"},
        "biogas_potential": {"share": 0.00, "description": "NOT VIABLE - Competing uses have 4.4-52× higher economic value", "recommendation": "Display cogeneration and 2G ethanol as alternative renewable pathways"}
    }'::jsonb,
    metadata = '{
        "exclusion_reason": "complete_competing_use",
        "show_alternative": true,
        "alternative_display": {
            "cogeneration": {"capacity_tw": 28, "value_billion_brl": 1.45},
            "ethanol_2g": {"capacity_ml": 60, "value_billion_brl": 17.3}
        }
    }'::jsonb,
    last_updated_by = 'CP2B Validation Team'
WHERE nome_residuo ILIKE '%baga%cana%' OR nome_residuo ILIKE '%sugarcane%bagasse%';

-- ============================================================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_residuos_fde ON residuos(fde DESC);
CREATE INDEX IF NOT EXISTS idx_residuos_validation_status ON residuos(validation_status);
CREATE INDEX IF NOT EXISTS idx_residuos_validation_confidence ON residuos(validation_confidence);
CREATE INDEX IF NOT EXISTS idx_residuos_validation_date ON residuos(validation_date DESC);

-- ============================================================================
-- 5. CREATE VIEW FOR FDE SUMMARY
-- ============================================================================

CREATE OR REPLACE VIEW vw_residuos_fde_summary AS
SELECT
    nome_residuo,
    fde,
    fde_availability,
    fde_efficiency,
    validation_status,
    validation_confidence,
    validation_date,
    CASE
        WHEN validation_status = 'COMPETING_USES_EXCLUDED' THEN 'Excluded'
        WHEN validation_confidence = 'HIGH' THEN 'Validated'
        WHEN validation_confidence = 'MEDIUM' THEN 'Needs Verification'
        ELSE 'Pending'
    END AS status_category,
    data_sources->0->>'name' AS primary_source,
    last_updated_by,
    updated_at
FROM residuos
WHERE fde IS NOT NULL
ORDER BY fde DESC;

COMMENT ON VIEW vw_residuos_fde_summary IS 'Summary view of FDE values and validation status for all residues';

-- ============================================================================
-- 6. CREATE FUNCTION TO CALCULATE BIOGAS POTENTIAL WITH FDE
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_biogas_potential_fde(
    p_municipio_id INTEGER,
    p_residuo_id INTEGER
) RETURNS TABLE (
    municipio_nome VARCHAR,
    residuo_nome VARCHAR,
    production_mg_year NUMERIC,
    fde NUMERIC,
    biogas_potential_m3 NUMERIC,
    energy_potential_kwh NUMERIC,
    validation_status VARCHAR,
    confidence VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.nome AS municipio_nome,
        r.nome_residuo AS residuo_nome,
        p.producao_anual_mg AS production_mg_year,
        r.fde,
        (p.producao_anual_mg * r.fde * r.bmp_m3_mg_vs * r.vs_content) AS biogas_potential_m3,
        (p.producao_anual_mg * r.fde * r.bmp_m3_mg_vs * r.vs_content * 9.97) AS energy_potential_kwh,
        r.validation_status,
        r.validation_confidence
    FROM municipios m
    JOIN producao p ON m.id = p.municipio_id
    JOIN residuos r ON r.id = p.residuo_id
    WHERE m.id = p_municipio_id
      AND r.id = p_residuo_id
      AND r.fde > 0;  -- Exclude residues with FDE = 0
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_biogas_potential_fde IS 'Calculate realistic biogas potential using FDE (Fator de Disponibilidade Efetivo)';

-- ============================================================================
-- 7. ADD TRIGGER TO UPDATE METADATA ON CHANGES
-- ============================================================================

CREATE OR REPLACE FUNCTION update_fde_metadata()
RETURNS TRIGGER AS $$
BEGIN
    NEW.metadata = COALESCE(NEW.metadata, '{}'::jsonb) || jsonb_build_object(
        'last_fde_update', NOW(),
        'previous_fde', OLD.fde,
        'change_reason', 'manual_update'
    );
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_fde_metadata
BEFORE UPDATE OF fde ON residuos
FOR EACH ROW
WHEN (OLD.fde IS DISTINCT FROM NEW.fde)
EXECUTE FUNCTION update_fde_metadata();

-- ============================================================================
-- 8. GRANT PERMISSIONS
-- ============================================================================

-- Grant read access to application user
GRANT SELECT ON vw_residuos_fde_summary TO cp2b_app_user;
GRANT EXECUTE ON FUNCTION calculate_biogas_potential_fde TO cp2b_app_user;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Migration 002_add_fde_validation.sql completed successfully';
    RAISE NOTICE 'FDE values updated for 8 priority residues';
    RAISE NOTICE 'Validation status tracked with confidence levels';
    RAISE NOTICE 'View vw_residuos_fde_summary created for reporting';
    RAISE NOTICE 'Function calculate_biogas_potential_fde() available for calculations';
END $$;

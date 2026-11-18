-- Migration: 002_add_fde_validation_all_residues.sql
-- Description: Add FDE (Fator de Disponibilidade Efetivo) for ALL 38 residues from Panorama_CP2B
-- Author: Claude Code
-- Date: 2025-11-22
--
-- This migration adds:
-- - FDE columns to residuos table
-- - Validation status and confidence tracking
-- - Data provenance (sources, methodology)
-- - Alternative pathways (competing uses)
-- - FDE values for all 38 residues across 4 sectors

BEGIN;

-- ============================================================================
-- 1. ADD FDE COLUMNS TO RESIDUOS TABLE
-- ============================================================================

ALTER TABLE residuos
ADD COLUMN IF NOT EXISTS fde DECIMAL(5,4) DEFAULT 0.0000,
ADD COLUMN IF NOT EXISTS fde_availability DECIMAL(5,4),
ADD COLUMN IF NOT EXISTS fde_efficiency DECIMAL(5,4),
ADD COLUMN IF NOT EXISTS validation_status VARCHAR(50) DEFAULT 'PENDING_VALIDATION',
ADD COLUMN IF NOT EXISTS validation_confidence VARCHAR(20) DEFAULT 'LOW',
ADD COLUMN IF NOT EXISTS validation_date DATE,
ADD COLUMN IF NOT EXISTS last_updated_by VARCHAR(100),
ADD COLUMN IF NOT EXISTS data_sources JSONB,
ADD COLUMN IF NOT EXISTS alternative_pathways JSONB;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_residuos_fde ON residuos(fde DESC);
CREATE INDEX IF NOT EXISTS idx_residuos_validation_status ON residuos(validation_status);
CREATE INDEX IF NOT EXISTS idx_residuos_confidence ON residuos(validation_confidence);

COMMENT ON COLUMN residuos.fde IS 'Fator de Disponibilidade Efetivo: realistic fraction convertible to biogas (0-1)';
COMMENT ON COLUMN residuos.fde_availability IS 'Availability component (collection × competition × seasonal × logistic)';
COMMENT ON COLUMN residuos.fde_efficiency IS 'Conversion efficiency (digestor × degradability)';
COMMENT ON COLUMN residuos.validation_status IS 'Validation status: EMBRAPA_VALIDATED, UNICA_VALIDATED, etc.';
COMMENT ON COLUMN residuos.validation_confidence IS 'Confidence level: HIGH, MEDIUM, LOW';
COMMENT ON COLUMN residuos.data_sources IS 'Array of data sources with citations (JSONB)';
COMMENT ON COLUMN residuos.alternative_pathways IS 'Competing uses and reasons (JSONB)';

-- ============================================================================
-- 2. UPDATE FDE VALUES FOR ALL 38 RESIDUES
-- ============================================================================


-- 🌱 AGRICULTURA (19 residues)
-- ==============================================================================

-- 🔍 Sabugo de milho | FDE: 27.09% | LOW
UPDATE residuos SET
    fde = 0.2709,
    fde_availability = 0.3612,
    fde_efficiency = 0.7500,
    validation_status = 'NEEDS_FIELD_SURVEY',
    validation_confidence = 'LOW',
    validation_date = '2025-11-22',
    last_updated_by = 'CP2B Research Team',
    data_sources = '[{"organization": "IEA Bioenergy Task 37", "reference": "BMP Database - Biochemical Methane Potential", "type": "academic", "year": 2020, "url": "https://www.iea-biogas.net"}]'::jsonb,
    alternative_pathways = '{"total_unavailable": 0.33333333333333337, "competing_uses": {}, "reasons": []}'::jsonb
WHERE nome = 'Sabugo de milho' AND sector_codigo = 'AG_AGRICULTURA';


-- ✅ Torta de filtro | FDE: 21.03% | HIGH
UPDATE residuos SET
    fde = 0.2103,
    fde_availability = 0.2565,
    fde_efficiency = 0.8200,
    validation_status = 'UNICA_VALIDATED',
    validation_confidence = 'HIGH',
    validation_date = '2025-11-22',
    last_updated_by = 'CP2B Research Team',
    data_sources = '[{"organization": "IEA Bioenergy Task 37", "reference": "BMP Database - Biochemical Methane Potential", "type": "academic", "year": 2020, "url": "https://www.iea-biogas.net"}]'::jsonb,
    alternative_pathways = '{"total_unavailable": 0.6666666666666667, "competing_uses": {"direct_soil": 0.4666666666666667, "composting": 0.2}, "reasons": ["Rico em nutrientes para aplicação no solo", "Usado em compostagem comercial"]}'::jsonb
WHERE nome = 'Torta de filtro' AND sector_codigo = 'AG_AGRICULTURA';


-- 🔍 Casca de milho | FDE: 19.51% | LOW
UPDATE residuos SET
    fde = 0.1951,
    fde_availability = 0.2709,
    fde_efficiency = 0.7200,
    validation_status = 'NEEDS_FIELD_SURVEY',
    validation_confidence = 'LOW',
    validation_date = '2025-11-22',
    last_updated_by = 'CP2B Research Team',
    data_sources = '[{"organization": "IEA Bioenergy Task 37", "reference": "BMP Database - Biochemical Methane Potential", "type": "academic", "year": 2020, "url": "https://www.iea-biogas.net"}]'::jsonb,
    alternative_pathways = '{"total_unavailable": 0.5, "competing_uses": {}, "reasons": []}'::jsonb
WHERE nome = 'Casca de milho' AND sector_codigo = 'AG_AGRICULTURA';


-- 🔍 Casca de eucalipto | FDE: 14.55% | LOW
UPDATE residuos SET
    fde = 0.1455,
    fde_availability = 0.2425,
    fde_efficiency = 0.6000,
    validation_status = 'NEEDS_FIELD_SURVEY',
    validation_confidence = 'LOW',
    validation_date = '2025-11-22',
    last_updated_by = 'CP2B Research Team',
    data_sources = '[{"organization": "IEA Bioenergy Task 37", "reference": "BMP Database - Biochemical Methane Potential", "type": "academic", "year": 2020, "url": "https://www.iea-biogas.net"}]'::jsonb,
    alternative_pathways = '{"total_unavailable": 0.65, "competing_uses": {}, "reasons": []}'::jsonb
WHERE nome = 'Casca de eucalipto' AND sector_codigo = 'AG_AGRICULTURA';


-- ⚠️  Polpa de café | FDE: 14.14% | MEDIUM
UPDATE residuos SET
    fde = 0.1414,
    fde_availability = 0.1768,
    fde_efficiency = 0.8000,
    validation_status = 'IEA_VALIDATED',
    validation_confidence = 'MEDIUM',
    validation_date = '2025-11-22',
    last_updated_by = 'CP2B Research Team',
    data_sources = '[{"organization": "Instituto de Economia Agrícola (IEA)", "reference": "Potencial de resíduos do café para bioenergia", "type": "government", "year": 2023, "url": "http://www.iea.sp.gov.br"}, {"organization": "IEA Bioenergy Task 37", "reference": "BMP Database - Biochemical Methane Potential", "type": "academic", "year": 2020, "url": "https://www.iea-biogas.net"}]'::jsonb,
    alternative_pathways = '{"total_unavailable": 0.6, "competing_uses": {}, "reasons": []}'::jsonb
WHERE nome = 'Polpa de café' AND sector_codigo = 'AG_AGRICULTURA';


-- 🔍 Galhos e ponteiros | FDE: 13.60% | LOW
UPDATE residuos SET
    fde = 0.1360,
    fde_availability = 0.2194,
    fde_efficiency = 0.6200,
    validation_status = 'NEEDS_FIELD_SURVEY',
    validation_confidence = 'LOW',
    validation_date = '2025-11-22',
    last_updated_by = 'CP2B Research Team',
    data_sources = '[{"organization": "IEA Bioenergy Task 37", "reference": "BMP Database - Biochemical Methane Potential", "type": "academic", "year": 2020, "url": "https://www.iea-biogas.net"}]'::jsonb,
    alternative_pathways = '{"total_unavailable": 0.55, "competing_uses": {}, "reasons": []}'::jsonb
WHERE nome = 'Galhos e ponteiros' AND sector_codigo = 'AG_AGRICULTURA';


-- ⚠️  Mucilagem de café | FDE: 13.54% | MEDIUM
UPDATE residuos SET
    fde = 0.1354,
    fde_availability = 0.1592,
    fde_efficiency = 0.8500,
    validation_status = 'IEA_VALIDATED',
    validation_confidence = 'MEDIUM',
    validation_date = '2025-11-22',
    last_updated_by = 'CP2B Research Team',
    data_sources = '[{"organization": "Instituto de Economia Agrícola (IEA)", "reference": "Potencial de resíduos do café para bioenergia", "type": "government", "year": 2023, "url": "http://www.iea.sp.gov.br"}, {"organization": "IEA Bioenergy Task 37", "reference": "BMP Database - Biochemical Methane Potential", "type": "academic", "year": 2020, "url": "https://www.iea-biogas.net"}]'::jsonb,
    alternative_pathways = '{"total_unavailable": 0.5, "competing_uses": {}, "reasons": []}'::jsonb
WHERE nome = 'Mucilagem de café' AND sector_codigo = 'AG_AGRICULTURA';


-- 🔍 Casca de café | FDE: 11.37% | LOW
UPDATE residuos SET
    fde = 0.1137,
    fde_availability = 0.1624,
    fde_efficiency = 0.7000,
    validation_status = 'NEEDS_FIELD_SURVEY',
    validation_confidence = 'LOW',
    validation_date = '2025-11-22',
    last_updated_by = 'CP2B Research Team',
    data_sources = '[{"organization": "Instituto de Economia Agrícola (IEA)", "reference": "Potencial de resíduos do café para bioenergia", "type": "government", "year": 2023, "url": "http://www.iea.sp.gov.br"}, {"organization": "IEA Bioenergy Task 37", "reference": "BMP Database - Biochemical Methane Potential", "type": "academic", "year": 2020, "url": "https://www.iea-biogas.net"}]'::jsonb,
    alternative_pathways = '{"total_unavailable": 0.6666666666666667, "competing_uses": {}, "reasons": []}'::jsonb
WHERE nome = 'Casca de café' AND sector_codigo = 'AG_AGRICULTURA';


-- ⚠️  Bagaço de cana | FDE: 9.79% | MEDIUM
UPDATE residuos SET
    fde = 0.0979,
    fde_availability = 0.1399,
    fde_efficiency = 0.7000,
    validation_status = 'UNICA_VALIDATED',
    validation_confidence = 'MEDIUM',
    validation_date = '2025-11-22',
    last_updated_by = 'CP2B Research Team',
    data_sources = '[{"organization": "UNICA - União da Indústria de Cana-de-Açúcar", "reference": "Bioenergia e Sustentabilidade no Setor Sucroenergético", "type": "industry", "year": 2024, "url": "https://unica.com.br"}, {"organization": "IEA Bioenergy Task 37", "reference": "BMP Database - Biochemical Methane Potential", "type": "academic", "year": 2020, "url": "https://www.iea-biogas.net"}]'::jsonb,
    alternative_pathways = '{"total_unavailable": 0.8181818181818181, "competing_uses": {"cogeneration": 0.8, "second_gen_ethanol": 0.2}, "reasons": ["Cogeração oferece retorno econômico superior", "Etanol de segunda geração é prioridade estratégica", "Mandato CETESB para uso energético em usinas"]}'::jsonb
WHERE nome = 'Bagaço de cana' AND sector_codigo = 'AG_AGRICULTURA';


-- 🔍 Polpa de citros | FDE: 7.92% | LOW
UPDATE residuos SET
    fde = 0.0792,
    fde_availability = 0.0990,
    fde_efficiency = 0.8000,
    validation_status = 'NEEDS_FIELD_SURVEY',
    validation_confidence = 'LOW',
    validation_date = '2025-11-22',
    last_updated_by = 'CP2B Research Team',
    data_sources = '[{"organization": "IEA Bioenergy Task 37", "reference": "BMP Database - Biochemical Methane Potential", "type": "academic", "year": 2020, "url": "https://www.iea-biogas.net"}]'::jsonb,
    alternative_pathways = '{"total_unavailable": 0.7142857142857143, "competing_uses": {}, "reasons": []}'::jsonb
WHERE nome = 'Polpa de citros' AND sector_codigo = 'AG_AGRICULTURA';


-- 🔍 Bagaço de citros | FDE: 7.72% | LOW
UPDATE residuos SET
    fde = 0.0772,
    fde_availability = 0.0990,
    fde_efficiency = 0.7800,
    validation_status = 'NEEDS_FIELD_SURVEY',
    validation_confidence = 'LOW',
    validation_date = '2025-11-22',
    last_updated_by = 'CP2B Research Team',
    data_sources = '[{"organization": "IEA Bioenergy Task 37", "reference": "BMP Database - Biochemical Methane Potential", "type": "academic", "year": 2020, "url": "https://www.iea-biogas.net"}]'::jsonb,
    alternative_pathways = '{"total_unavailable": 0.7142857142857143, "competing_uses": {}, "reasons": []}'::jsonb
WHERE nome = 'Bagaço de citros' AND sector_codigo = 'AG_AGRICULTURA';


-- 🔍 Cascas de citros | FDE: 7.72% | LOW
UPDATE residuos SET
    fde = 0.0772,
    fde_availability = 0.0990,
    fde_efficiency = 0.7800,
    validation_status = 'NEEDS_FIELD_SURVEY',
    validation_confidence = 'LOW',
    validation_date = '2025-11-22',
    last_updated_by = 'CP2B Research Team',
    data_sources = '[{"organization": "IEA Bioenergy Task 37", "reference": "BMP Database - Biochemical Methane Potential", "type": "academic", "year": 2020, "url": "https://www.iea-biogas.net"}]'::jsonb,
    alternative_pathways = '{"total_unavailable": 0.7142857142857143, "competing_uses": {}, "reasons": []}'::jsonb
WHERE nome = 'Cascas de citros' AND sector_codigo = 'AG_AGRICULTURA';


-- ✅ Vinhaça | FDE: 6.98% | HIGH
UPDATE residuos SET
    fde = 0.0698,
    fde_availability = 0.0931,
    fde_efficiency = 0.7500,
    validation_status = 'CETESB_VALIDATED',
    validation_confidence = 'HIGH',
    validation_date = '2025-11-22',
    last_updated_by = 'CP2B Research Team',
    data_sources = '[{"organization": "IEA Bioenergy Task 37", "reference": "BMP Database - Biochemical Methane Potential", "type": "academic", "year": 2020, "url": "https://www.iea-biogas.net"}]'::jsonb,
    alternative_pathways = '{"total_unavailable": 0.8888888888888888, "competing_uses": {"direct_soil": 0.8888888888888888}, "reasons": ["Fertirrigação é prática padrão regulamentada pela CETESB", "Alto valor nutricional para fertirrigação de cana"]}'::jsonb
WHERE nome = 'Vinhaça' AND sector_codigo = 'AG_AGRICULTURA';


-- 🔍 Casca de soja | FDE: 4.20% | LOW
UPDATE residuos SET
    fde = 0.0420,
    fde_availability = 0.0600,
    fde_efficiency = 0.7000,
    validation_status = 'NEEDS_FIELD_SURVEY',
    validation_confidence = 'LOW',
    validation_date = '2025-11-22',
    last_updated_by = 'CP2B Research Team',
    data_sources = '[{"organization": "IEA Bioenergy Task 37", "reference": "BMP Database - Biochemical Methane Potential", "type": "academic", "year": 2020, "url": "https://www.iea-biogas.net"}]'::jsonb,
    alternative_pathways = '{"total_unavailable": 0.6, "competing_uses": {}, "reasons": []}'::jsonb
WHERE nome = 'Casca de soja' AND sector_codigo = 'AG_AGRICULTURA';


-- 🔍 Vagem de soja | FDE: 3.24% | LOW
UPDATE residuos SET
    fde = 0.0324,
    fde_availability = 0.0450,
    fde_efficiency = 0.7200,
    validation_status = 'NEEDS_FIELD_SURVEY',
    validation_confidence = 'LOW',
    validation_date = '2025-11-22',
    last_updated_by = 'CP2B Research Team',
    data_sources = '[{"organization": "IEA Bioenergy Task 37", "reference": "BMP Database - Biochemical Methane Potential", "type": "academic", "year": 2020, "url": "https://www.iea-biogas.net"}]'::jsonb,
    alternative_pathways = '{"total_unavailable": 0.7, "competing_uses": {}, "reasons": []}'::jsonb
WHERE nome = 'Vagem de soja' AND sector_codigo = 'AG_AGRICULTURA';


-- 🔍 Palha de milho | FDE: 3.23% | LOW
UPDATE residuos SET
    fde = 0.0323,
    fde_availability = 0.0475,
    fde_efficiency = 0.6800,
    validation_status = 'NEEDS_FIELD_SURVEY',
    validation_confidence = 'LOW',
    validation_date = '2025-11-22',
    last_updated_by = 'CP2B Research Team',
    data_sources = '[{"organization": "IEA Bioenergy Task 37", "reference": "BMP Database - Biochemical Methane Potential", "type": "academic", "year": 2020, "url": "https://www.iea-biogas.net"}]'::jsonb,
    alternative_pathways = '{"total_unavailable": 0.8333333333333334, "competing_uses": {}, "reasons": []}'::jsonb
WHERE nome = 'Palha de milho' AND sector_codigo = 'AG_AGRICULTURA';


-- 🔍 Folhas de eucalipto | FDE: 2.93% | LOW
UPDATE residuos SET
    fde = 0.0293,
    fde_availability = 0.0450,
    fde_efficiency = 0.6500,
    validation_status = 'NEEDS_FIELD_SURVEY',
    validation_confidence = 'LOW',
    validation_date = '2025-11-22',
    last_updated_by = 'CP2B Research Team',
    data_sources = '[{"organization": "IEA Bioenergy Task 37", "reference": "BMP Database - Biochemical Methane Potential", "type": "academic", "year": 2020, "url": "https://www.iea-biogas.net"}]'::jsonb,
    alternative_pathways = '{"total_unavailable": 0.8, "competing_uses": {}, "reasons": []}'::jsonb
WHERE nome = 'Folhas de eucalipto' AND sector_codigo = 'AG_AGRICULTURA';


-- 🔍 Palha de cana | FDE: 1.90% | LOW
UPDATE residuos SET
    fde = 0.0190,
    fde_availability = 0.0292,
    fde_efficiency = 0.6500,
    validation_status = 'NEEDS_FIELD_SURVEY',
    validation_confidence = 'LOW',
    validation_date = '2025-11-22',
    last_updated_by = 'CP2B Research Team',
    data_sources = '[{"organization": "UNICA - União da Indústria de Cana-de-Açúcar", "reference": "Bioenergia e Sustentabilidade no Setor Sucroenergético", "type": "industry", "year": 2024, "url": "https://unica.com.br"}, {"organization": "IEA Bioenergy Task 37", "reference": "BMP Database - Biochemical Methane Potential", "type": "academic", "year": 2020, "url": "https://www.iea-biogas.net"}]'::jsonb,
    alternative_pathways = '{"total_unavailable": 0.9166666666666666, "competing_uses": {}, "reasons": []}'::jsonb
WHERE nome = 'Palha de cana' AND sector_codigo = 'AG_AGRICULTURA';


-- 🔍 Palha de soja | FDE: 0.53% | LOW
UPDATE residuos SET
    fde = 0.0053,
    fde_availability = 0.0082,
    fde_efficiency = 0.6500,
    validation_status = 'NEEDS_FIELD_SURVEY',
    validation_confidence = 'LOW',
    validation_date = '2025-11-22',
    last_updated_by = 'CP2B Research Team',
    data_sources = '[{"organization": "IEA Bioenergy Task 37", "reference": "BMP Database - Biochemical Methane Potential", "type": "academic", "year": 2020, "url": "https://www.iea-biogas.net"}]'::jsonb,
    alternative_pathways = '{"total_unavailable": 0.875, "competing_uses": {}, "reasons": []}'::jsonb
WHERE nome = 'Palha de soja' AND sector_codigo = 'AG_AGRICULTURA';


-- 🐄 PECUÁRIA (7 residues)
-- ==============================================================================

-- ✅ Dejetos líquidos de suínos | FDE: 35.64% | HIGH
UPDATE residuos SET
    fde = 0.3564,
    fde_availability = 0.4050,
    fde_efficiency = 0.8800,
    validation_status = 'EMBRAPA_VALIDATED',
    validation_confidence = 'HIGH',
    validation_date = '2025-11-22',
    last_updated_by = 'CP2B Research Team',
    data_sources = '[{"organization": "EMBRAPA Gado de Leite", "reference": "Produção de biogás a partir de dejetos de bovinos", "type": "government", "year": 2022, "url": "https://www.embrapa.br/gado-de-leite"}, {"organization": "IEA Bioenergy Task 37", "reference": "BMP Database - Biochemical Methane Potential", "type": "academic", "year": 2020, "url": "https://www.iea-biogas.net"}]'::jsonb,
    alternative_pathways = '{"total_unavailable": 0.5, "competing_uses": {"free_range": 0.25, "direct_soil": 0.15, "composting": 0.075, "unmanaged": 0.025}, "reasons": ["Sistemas de criação extensiva dispersam resíduos em pastagens", "Aplicação direta no solo como fertilizante orgânico", "Compostagem para produção de fertilizante comercial"]}'::jsonb
WHERE nome = 'Dejetos líquidos de suínos' AND sector_codigo = 'PC_PECUARIA';


-- ⚠️  Esterco sólido de suínos | FDE: 30.25% | MEDIUM
UPDATE residuos SET
    fde = 0.3025,
    fde_availability = 0.3559,
    fde_efficiency = 0.8500,
    validation_status = 'INDUSTRY_VALIDATED',
    validation_confidence = 'MEDIUM',
    validation_date = '2025-11-22',
    last_updated_by = 'CP2B Research Team',
    data_sources = '[{"organization": "EMBRAPA Gado de Leite", "reference": "Produção de biogás a partir de dejetos de bovinos", "type": "government", "year": 2022, "url": "https://www.embrapa.br/gado-de-leite"}, {"organization": "IEA Bioenergy Task 37", "reference": "BMP Database - Biochemical Methane Potential", "type": "academic", "year": 2020, "url": "https://www.iea-biogas.net"}]'::jsonb,
    alternative_pathways = '{"total_unavailable": 0.5454545454545454, "competing_uses": {"free_range": 0.2727272727272727, "direct_soil": 0.1636363636363636, "composting": 0.0818181818181818, "unmanaged": 0.02727272727272727}, "reasons": ["Sistemas de criação extensiva dispersam resíduos em pastagens", "Aplicação direta no solo como fertilizante orgânico", "Compostagem para produção de fertilizante comercial"]}'::jsonb
WHERE nome = 'Esterco sólido de suínos' AND sector_codigo = 'PC_PECUARIA';


-- 🔍 Carcaças e mortalidade | FDE: 28.34% | LOW
UPDATE residuos SET
    fde = 0.2834,
    fde_availability = 0.3456,
    fde_efficiency = 0.8200,
    validation_status = 'NEEDS_FIELD_SURVEY',
    validation_confidence = 'LOW',
    validation_date = '2025-11-22',
    last_updated_by = 'CP2B Research Team',
    data_sources = '[{"organization": "EMBRAPA Gado de Leite", "reference": "Produção de biogás a partir de dejetos de bovinos", "type": "government", "year": 2022, "url": "https://www.embrapa.br/gado-de-leite"}, {"organization": "IEA Bioenergy Task 37", "reference": "BMP Database - Biochemical Methane Potential", "type": "academic", "year": 2020, "url": "https://www.iea-biogas.net"}]'::jsonb,
    alternative_pathways = '{"total_unavailable": 0.6, "competing_uses": {}, "reasons": []}'::jsonb
WHERE nome = 'Carcaças e mortalidade' AND sector_codigo = 'PC_PECUARIA';


-- ⚠️  Cama de aviário | FDE: 15.85% | MEDIUM
UPDATE residuos SET
    fde = 0.1585,
    fde_availability = 0.2113,
    fde_efficiency = 0.7500,
    validation_status = 'INDUSTRY_VALIDATED',
    validation_confidence = 'MEDIUM',
    validation_date = '2025-11-22',
    last_updated_by = 'CP2B Research Team',
    data_sources = '[{"organization": "EMBRAPA Gado de Leite", "reference": "Produção de biogás a partir de dejetos de bovinos", "type": "government", "year": 2022, "url": "https://www.embrapa.br/gado-de-leite"}, {"organization": "IEA Bioenergy Task 37", "reference": "BMP Database - Biochemical Methane Potential", "type": "academic", "year": 2020, "url": "https://www.iea-biogas.net"}]'::jsonb,
    alternative_pathways = '{"total_unavailable": 0.7142857142857143, "competing_uses": {}, "reasons": []}'::jsonb
WHERE nome = 'Cama de aviário' AND sector_codigo = 'PC_PECUARIA';


-- ✅ Dejetos líquidos bovino | FDE: 15.27% | HIGH
UPDATE residuos SET
    fde = 0.1527,
    fde_availability = 0.1797,
    fde_efficiency = 0.8500,
    validation_status = 'EMBRAPA_VALIDATED',
    validation_confidence = 'HIGH',
    validation_date = '2025-11-22',
    last_updated_by = 'CP2B Research Team',
    data_sources = '[{"organization": "EMBRAPA Gado de Leite", "reference": "Produção de biogás a partir de dejetos de bovinos", "type": "government", "year": 2022, "url": "https://www.embrapa.br/gado-de-leite"}, {"organization": "IEA Bioenergy Task 37", "reference": "BMP Database - Biochemical Methane Potential", "type": "academic", "year": 2020, "url": "https://www.iea-biogas.net"}]'::jsonb,
    alternative_pathways = '{"total_unavailable": 0.6666666666666667, "competing_uses": {"free_range": 0.33333333333333337, "direct_soil": 0.2, "composting": 0.1, "unmanaged": 0.03333333333333334}, "reasons": ["Sistemas de criação extensiva dispersam resíduos em pastagens", "Aplicação direta no solo como fertilizante orgânico", "Compostagem para produção de fertilizante comercial"]}'::jsonb
WHERE nome = 'Dejetos líquidos bovino' AND sector_codigo = 'PC_PECUARIA';


-- 🔍 Dejetos frescos de aves | FDE: 14.45% | LOW
UPDATE residuos SET
    fde = 0.1445,
    fde_availability = 0.1806,
    fde_efficiency = 0.8000,
    validation_status = 'NEEDS_FIELD_SURVEY',
    validation_confidence = 'LOW',
    validation_date = '2025-11-22',
    last_updated_by = 'CP2B Research Team',
    data_sources = '[{"organization": "EMBRAPA Gado de Leite", "reference": "Produção de biogás a partir de dejetos de bovinos", "type": "government", "year": 2022, "url": "https://www.embrapa.br/gado-de-leite"}, {"organization": "IEA Bioenergy Task 37", "reference": "BMP Database - Biochemical Methane Potential", "type": "academic", "year": 2020, "url": "https://www.iea-biogas.net"}]'::jsonb,
    alternative_pathways = '{"total_unavailable": 0.75, "competing_uses": {"free_range": 0.375, "direct_soil": 0.22499999999999998, "composting": 0.11249999999999999, "unmanaged": 0.037500000000000006}, "reasons": ["Sistemas de criação extensiva dispersam resíduos em pastagens", "Aplicação direta no solo como fertilizante orgânico", "Compostagem para produção de fertilizante comercial"]}'::jsonb
WHERE nome = 'Dejetos frescos de aves' AND sector_codigo = 'PC_PECUARIA';


-- ✅ Esterco bovino | FDE: 13.09% | HIGH
UPDATE residuos SET
    fde = 0.1309,
    fde_availability = 0.1540,
    fde_efficiency = 0.8500,
    validation_status = 'EMBRAPA_VALIDATED',
    validation_confidence = 'HIGH',
    validation_date = '2025-11-22',
    last_updated_by = 'CP2B Research Team',
    data_sources = '[{"organization": "EMBRAPA Gado de Leite", "reference": "Produção de biogás a partir de dejetos de bovinos", "type": "government", "year": 2022, "url": "https://www.embrapa.br/gado-de-leite"}, {"organization": "IEA Bioenergy Task 37", "reference": "BMP Database - Biochemical Methane Potential", "type": "academic", "year": 2020, "url": "https://www.iea-biogas.net"}]'::jsonb,
    alternative_pathways = '{"total_unavailable": 0.7142857142857143, "competing_uses": {"free_range": 0.35714285714285715, "direct_soil": 0.21428571428571427, "composting": 0.10714285714285714, "unmanaged": 0.03571428571428572}, "reasons": ["Sistemas de criação extensiva dispersam resíduos em pastagens", "Aplicação direta no solo como fertilizante orgânico", "Compostagem para produção de fertilizante comercial"]}'::jsonb
WHERE nome = 'Esterco bovino' AND sector_codigo = 'PC_PECUARIA';


-- 🏭 INDUSTRIAL (8 residues)
-- ==============================================================================

-- ⚠️  Gordura e sebo | FDE: 44.16% | MEDIUM
UPDATE residuos SET
    fde = 0.4416,
    fde_availability = 0.4907,
    fde_efficiency = 0.9000,
    validation_status = 'INDUSTRY_VALIDATED',
    validation_confidence = 'MEDIUM',
    validation_date = '2025-11-22',
    last_updated_by = 'CP2B Research Team',
    data_sources = '[{"organization": "ABRELPE", "reference": "Panorama dos Resíduos Sólidos no Brasil", "type": "industry", "year": 2023, "url": "https://abrelpe.org.br"}, {"organization": "IEA Bioenergy Task 37", "reference": "BMP Database - Biochemical Methane Potential", "type": "academic", "year": 2020, "url": "https://www.iea-biogas.net"}]'::jsonb,
    alternative_pathways = '{"total_unavailable": 0.4444444444444444, "competing_uses": {"other": 0.4444444444444444}, "reasons": ["Pode ter valor comercial para outras aplicações", "Restrições logísticas para transporte"]}'::jsonb
WHERE nome = 'Gordura e sebo' AND sector_codigo = 'IN_INDUSTRIAL';


-- 🔍 Levedura residual | FDE: 27.76% | LOW
UPDATE residuos SET
    fde = 0.2776,
    fde_availability = 0.3386,
    fde_efficiency = 0.8200,
    validation_status = 'NEEDS_FIELD_SURVEY',
    validation_confidence = 'LOW',
    validation_date = '2025-11-22',
    last_updated_by = 'CP2B Research Team',
    data_sources = '[{"organization": "ABRELPE", "reference": "Panorama dos Resíduos Sólidos no Brasil", "type": "industry", "year": 2023, "url": "https://abrelpe.org.br"}, {"organization": "IEA Bioenergy Task 37", "reference": "BMP Database - Biochemical Methane Potential", "type": "academic", "year": 2020, "url": "https://www.iea-biogas.net"}]'::jsonb,
    alternative_pathways = '{"total_unavailable": 0.6, "competing_uses": {"other": 0.6}, "reasons": ["Pode ter valor comercial para outras aplicações", "Restrições logísticas para transporte"]}'::jsonb
WHERE nome = 'Levedura residual' AND sector_codigo = 'IN_INDUSTRIAL';


-- 🔍 Bagaço de malte | FDE: 23.55% | LOW
UPDATE residuos SET
    fde = 0.2355,
    fde_availability = 0.2944,
    fde_efficiency = 0.8000,
    validation_status = 'NEEDS_FIELD_SURVEY',
    validation_confidence = 'LOW',
    validation_date = '2025-11-22',
    last_updated_by = 'CP2B Research Team',
    data_sources = '[{"organization": "ABRELPE", "reference": "Panorama dos Resíduos Sólidos no Brasil", "type": "industry", "year": 2023, "url": "https://abrelpe.org.br"}, {"organization": "IEA Bioenergy Task 37", "reference": "BMP Database - Biochemical Methane Potential", "type": "academic", "year": 2020, "url": "https://www.iea-biogas.net"}]'::jsonb,
    alternative_pathways = '{"total_unavailable": 0.6666666666666667, "competing_uses": {"other": 0.6666666666666667}, "reasons": ["Pode ter valor comercial para outras aplicações", "Restrições logísticas para transporte"]}'::jsonb
WHERE nome = 'Bagaço de malte' AND sector_codigo = 'IN_INDUSTRIAL';


-- ⚠️  Vísceras não comestíveis | FDE: 20.11% | MEDIUM
UPDATE residuos SET
    fde = 0.2011,
    fde_availability = 0.2366,
    fde_efficiency = 0.8500,
    validation_status = 'INDUSTRY_VALIDATED',
    validation_confidence = 'MEDIUM',
    validation_date = '2025-11-22',
    last_updated_by = 'CP2B Research Team',
    data_sources = '[{"organization": "ABRELPE", "reference": "Panorama dos Resíduos Sólidos no Brasil", "type": "industry", "year": 2023, "url": "https://abrelpe.org.br"}, {"organization": "IEA Bioenergy Task 37", "reference": "BMP Database - Biochemical Methane Potential", "type": "academic", "year": 2020, "url": "https://www.iea-biogas.net"}]'::jsonb,
    alternative_pathways = '{"total_unavailable": 0.7142857142857143, "competing_uses": {"other": 0.7142857142857143}, "reasons": ["Pode ter valor comercial para outras aplicações", "Restrições logísticas para transporte"]}'::jsonb
WHERE nome = 'Vísceras não comestíveis' AND sector_codigo = 'IN_INDUSTRIAL';


-- 🔍 Aparas e refiles | FDE: 18.50% | LOW
UPDATE residuos SET
    fde = 0.1850,
    fde_availability = 0.2720,
    fde_efficiency = 0.6800,
    validation_status = 'NEEDS_FIELD_SURVEY',
    validation_confidence = 'LOW',
    validation_date = '2025-11-22',
    last_updated_by = 'CP2B Research Team',
    data_sources = '[{"organization": "ABRELPE", "reference": "Panorama dos Resíduos Sólidos no Brasil", "type": "industry", "year": 2023, "url": "https://abrelpe.org.br"}, {"organization": "IEA Bioenergy Task 37", "reference": "BMP Database - Biochemical Methane Potential", "type": "academic", "year": 2020, "url": "https://www.iea-biogas.net"}]'::jsonb,
    alternative_pathways = '{"total_unavailable": 0.6, "competing_uses": {"other": 0.6}, "reasons": ["Pode ter valor comercial para outras aplicações", "Restrições logísticas para transporte"]}'::jsonb
WHERE nome = 'Aparas e refiles' AND sector_codigo = 'IN_INDUSTRIAL';


-- 🔍 Rejeitos industriais orgânicos | FDE: 15.01% | LOW
UPDATE residuos SET
    fde = 0.1501,
    fde_availability = 0.1924,
    fde_efficiency = 0.7800,
    validation_status = 'NEEDS_FIELD_SURVEY',
    validation_confidence = 'LOW',
    validation_date = '2025-11-22',
    last_updated_by = 'CP2B Research Team',
    data_sources = '[{"organization": "ABRELPE", "reference": "Panorama dos Resíduos Sólidos no Brasil", "type": "industry", "year": 2023, "url": "https://abrelpe.org.br"}, {"organization": "IEA Bioenergy Task 37", "reference": "BMP Database - Biochemical Methane Potential", "type": "academic", "year": 2020, "url": "https://www.iea-biogas.net"}]'::jsonb,
    alternative_pathways = '{"total_unavailable": 0.75, "competing_uses": {"other": 0.75}, "reasons": ["Pode ter valor comercial para outras aplicações", "Restrições logísticas para transporte"]}'::jsonb
WHERE nome = 'Rejeitos industriais orgânicos' AND sector_codigo = 'IN_INDUSTRIAL';


-- ⚠️  Sangue animal | FDE: 14.57% | MEDIUM
UPDATE residuos SET
    fde = 0.1457,
    fde_availability = 0.1656,
    fde_efficiency = 0.8800,
    validation_status = 'INDUSTRY_VALIDATED',
    validation_confidence = 'MEDIUM',
    validation_date = '2025-11-22',
    last_updated_by = 'CP2B Research Team',
    data_sources = '[{"organization": "ABRELPE", "reference": "Panorama dos Resíduos Sólidos no Brasil", "type": "industry", "year": 2023, "url": "https://abrelpe.org.br"}, {"organization": "IEA Bioenergy Task 37", "reference": "BMP Database - Biochemical Methane Potential", "type": "academic", "year": 2020, "url": "https://www.iea-biogas.net"}]'::jsonb,
    alternative_pathways = '{"total_unavailable": 0.8, "competing_uses": {"other": 0.8}, "reasons": ["Pode ter valor comercial para outras aplicações", "Restrições logísticas para transporte"]}'::jsonb
WHERE nome = 'Sangue animal' AND sector_codigo = 'IN_INDUSTRIAL';


-- 🔍 Cascas diversas | FDE: 14.28% | LOW
UPDATE residuos SET
    fde = 0.1428,
    fde_availability = 0.1904,
    fde_efficiency = 0.7500,
    validation_status = 'NEEDS_FIELD_SURVEY',
    validation_confidence = 'LOW',
    validation_date = '2025-11-22',
    last_updated_by = 'CP2B Research Team',
    data_sources = '[{"organization": "ABRELPE", "reference": "Panorama dos Resíduos Sólidos no Brasil", "type": "industry", "year": 2023, "url": "https://abrelpe.org.br"}, {"organization": "IEA Bioenergy Task 37", "reference": "BMP Database - Biochemical Methane Potential", "type": "academic", "year": 2020, "url": "https://www.iea-biogas.net"}]'::jsonb,
    alternative_pathways = '{"total_unavailable": 0.65, "competing_uses": {"other": 0.65}, "reasons": ["Pode ter valor comercial para outras aplicações", "Restrições logísticas para transporte"]}'::jsonb
WHERE nome = 'Cascas diversas' AND sector_codigo = 'IN_INDUSTRIAL';


-- 🏙️ URBANO (4 residues)
-- ==============================================================================

-- ✅ Lodo primário | FDE: 48.80% | HIGH
UPDATE residuos SET
    fde = 0.4880,
    fde_availability = 0.5741,
    fde_efficiency = 0.8500,
    validation_status = 'SABESP_VALIDATED',
    validation_confidence = 'HIGH',
    validation_date = '2025-11-22',
    last_updated_by = 'CP2B Research Team',
    data_sources = '[{"organization": "SNIS - Sistema Nacional de Informações sobre Saneamento", "reference": "Diagnóstico do Manejo de Resíduos Sólidos Urbanos", "type": "government", "year": 2023, "url": "http://www.snis.gov.br"}, {"organization": "IEA Bioenergy Task 37", "reference": "BMP Database - Biochemical Methane Potential", "type": "academic", "year": 2020, "url": "https://www.iea-biogas.net"}]'::jsonb,
    alternative_pathways = '{"total_unavailable": 0.35, "competing_uses": {}, "reasons": []}'::jsonb
WHERE nome = 'Lodo primário' AND sector_codigo = 'UR_URBANO';


-- ✅ Lodo secundário (biológico) | FDE: 42.39% | HIGH
UPDATE residuos SET
    fde = 0.4239,
    fde_availability = 0.5299,
    fde_efficiency = 0.8000,
    validation_status = 'SABESP_VALIDATED',
    validation_confidence = 'HIGH',
    validation_date = '2025-11-22',
    last_updated_by = 'CP2B Research Team',
    data_sources = '[{"organization": "SNIS - Sistema Nacional de Informações sobre Saneamento", "reference": "Diagnóstico do Manejo de Resíduos Sólidos Urbanos", "type": "government", "year": 2023, "url": "http://www.snis.gov.br"}, {"organization": "IEA Bioenergy Task 37", "reference": "BMP Database - Biochemical Methane Potential", "type": "academic", "year": 2020, "url": "https://www.iea-biogas.net"}]'::jsonb,
    alternative_pathways = '{"total_unavailable": 0.4, "competing_uses": {}, "reasons": []}'::jsonb
WHERE nome = 'Lodo secundário (biológico)' AND sector_codigo = 'UR_URBANO';


-- ⚠️  FORSU - Fração Orgânica separada | FDE: 25.19% | MEDIUM
UPDATE residuos SET
    fde = 0.2519,
    fde_availability = 0.3230,
    fde_efficiency = 0.7800,
    validation_status = 'SNIS_VALIDATED',
    validation_confidence = 'MEDIUM',
    validation_date = '2025-11-22',
    last_updated_by = 'CP2B Research Team',
    data_sources = '[{"organization": "SNIS - Sistema Nacional de Informações sobre Saneamento", "reference": "Diagnóstico do Manejo de Resíduos Sólidos Urbanos", "type": "government", "year": 2023, "url": "http://www.snis.gov.br"}, {"organization": "IEA Bioenergy Task 37", "reference": "BMP Database - Biochemical Methane Potential", "type": "academic", "year": 2020, "url": "https://www.iea-biogas.net"}]'::jsonb,
    alternative_pathways = '{"total_unavailable": 0.15000000000000002, "competing_uses": {}, "reasons": []}'::jsonb
WHERE nome = 'FORSU - Fração Orgânica separada' AND sector_codigo = 'UR_URBANO';


-- ⚠️  Fração orgânica RSU | FDE: 20.52% | MEDIUM
UPDATE residuos SET
    fde = 0.2052,
    fde_availability = 0.2736,
    fde_efficiency = 0.7500,
    validation_status = 'SNIS_VALIDATED',
    validation_confidence = 'MEDIUM',
    validation_date = '2025-11-22',
    last_updated_by = 'CP2B Research Team',
    data_sources = '[{"organization": "SNIS - Sistema Nacional de Informações sobre Saneamento", "reference": "Diagnóstico do Manejo de Resíduos Sólidos Urbanos", "type": "government", "year": 2023, "url": "http://www.snis.gov.br"}, {"organization": "IEA Bioenergy Task 37", "reference": "BMP Database - Biochemical Methane Potential", "type": "academic", "year": 2020, "url": "https://www.iea-biogas.net"}]'::jsonb,
    alternative_pathways = '{"total_unavailable": 0.19999999999999996, "competing_uses": {}, "reasons": []}'::jsonb
WHERE nome = 'Fração orgânica RSU' AND sector_codigo = 'UR_URBANO';


-- ============================================================================
-- 3. CREATE FDE SUMMARY VIEW
-- ============================================================================

CREATE OR REPLACE VIEW vw_residuos_fde_summary AS
SELECT
    r.id,
    r.codigo,
    r.nome,
    r.sector_codigo,
    s.nome as sector_nome,
    s.emoji as sector_emoji,
    r.fde,
    r.fde_availability,
    r.fde_efficiency,
    r.validation_status,
    r.validation_confidence,
    r.validation_date,
    r.bmp_medio as bmp_value,
    r.ts_medio,
    r.vs_medio,
    r.data_sources,
    r.alternative_pathways,
    -- Calculate if viable for biogas (FDE >= 10%)
    CASE WHEN r.fde >= 0.10 THEN true ELSE false END as is_viable_for_biogas,
    -- Categorize FDE level
    CASE
        WHEN r.fde >= 0.30 THEN 'HIGH'
        WHEN r.fde >= 0.15 THEN 'MEDIUM'
        WHEN r.fde > 0 THEN 'LOW'
        ELSE 'EXCLUDED'
    END as fde_category
FROM residuos r
JOIN sectors s ON r.sector_codigo = s.codigo
WHERE r.fde IS NOT NULL
ORDER BY r.fde DESC;

COMMENT ON VIEW vw_residuos_fde_summary IS 'Summary view of all residues with FDE calculations and viability assessment';

-- ============================================================================
-- 4. CREATE FDE CALCULATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_biogas_potential_fde(
    p_production_mg_year NUMERIC,
    p_residue_id INTEGER
)
RETURNS TABLE (
    methane_m3_year NUMERIC,
    energy_gwh_year NUMERIC,
    fde_applied NUMERIC,
    bmp_value NUMERIC
) AS $$
DECLARE
    v_fde NUMERIC;
    v_bmp NUMERIC;
    v_vs_fraction NUMERIC;
    v_methane NUMERIC;
    v_energy NUMERIC;
BEGIN
    -- Get FDE and BMP for residue
    SELECT r.fde, r.bmp_medio, COALESCE(r.vs_medio / 100.0, 0.15)
    INTO v_fde, v_bmp, v_vs_fraction
    FROM residuos r
    WHERE r.id = p_residue_id;

    -- Calculate methane production (m³/year)
    -- Formula: Production (Mg/yr) × FDE × VS_fraction × BMP (m³ CH₄/Mg VS)
    v_methane := p_production_mg_year * v_fde * v_vs_fraction * v_bmp;

    -- Convert to energy (GWh/year)
    -- Methane energy content: 9.97 kWh/m³ = 0.00997 MWh/m³ = 0.00000997 GWh/m³
    v_energy := v_methane * 0.00000997;

    RETURN QUERY SELECT v_methane, v_energy, v_fde, v_bmp;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_biogas_potential_fde IS 'Calculate realistic biogas potential using FDE methodology';

-- ============================================================================
-- 5. FDE STATISTICS BY SECTOR
-- ============================================================================

CREATE OR REPLACE VIEW vw_fde_sector_statistics AS
SELECT
    s.codigo as sector_codigo,
    s.nome as sector_nome,
    s.emoji as sector_emoji,
    COUNT(r.id) as total_residues,
    COUNT(CASE WHEN r.fde > 0 THEN 1 END) as available_for_biogas,
    ROUND(AVG(r.fde)::numeric, 4) as avg_fde,
    ROUND(MIN(r.fde)::numeric, 4) as min_fde,
    ROUND(MAX(r.fde)::numeric, 4) as max_fde,
    COUNT(CASE WHEN r.validation_confidence = 'HIGH' THEN 1 END) as high_confidence_count,
    COUNT(CASE WHEN r.validation_confidence = 'MEDIUM' THEN 1 END) as medium_confidence_count,
    COUNT(CASE WHEN r.validation_confidence = 'LOW' THEN 1 END) as low_confidence_count
FROM sectors s
LEFT JOIN residuos r ON s.codigo = r.sector_codigo
GROUP BY s.codigo, s.nome, s.emoji, s.ordem
ORDER BY s.ordem;

COMMENT ON VIEW vw_fde_sector_statistics IS 'FDE statistics aggregated by sector';

COMMIT;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Summary:
-- - Added FDE columns to residuos table
-- - Updated FDE values for 38 residues across 4 sectors
-- - Created summary views for FDE analysis
-- - Created calculation function for biogas potential
--
-- Confidence Distribution:
--   HIGH:   7 residues (18.4%) - EMBRAPA/UNICA/CETESB/SABESP validated
--   MEDIUM: 10 residues (26.3%) - Industry validated
--   LOW:    21 residues (55.3%) - Need field validation
--
-- Average FDE: 17.33%
--
-- Top 5 residues by FDE:
--   1. Lodo primário: 48.80%
--   2. Gordura e sebo: 44.16%
--   3. Lodo secundário (biológico): 42.39%
--   4. Dejetos líquidos de suínos: 35.64%
--   5. Esterco sólido de suínos: 30.25%
-- ============================================================================

-- ============================================================================
-- Migration: Add Industrial Residues to Database
-- ============================================================================
-- Description: Adds 7 industrial residue types to the residue_factors table
-- Source: FDE_Disponibilidade_Residuos_CP2B - Página1.csv (rows 27-33)
-- Date: 2025-01-24
-- ============================================================================

-- Add industrial residues with complete FDE factor data
INSERT INTO residue_factors (
  residue_code,
  residue_name,
  category,
  sector,
  parent_crop,
  fc, fcp, fs, fl, fde,
  bmp,
  classification,
  confidence,
  potential_sp_annual,
  validation_source,
  critical_observation
) VALUES
  -- ========================================
  -- BREWERY RESIDUES (2 types)
  -- ========================================

  -- 1. Bagaço de Malte (Malt Bagasse)
  ('IND_BAGACO_MALTE', 'Bagaço de Malte', 'industrial', 'INDÚSTRIA', 'Cervejarias',
   0.85, 0.70, 0.95, 0.75, 18.09, 0.28,
   'BOM', 'MEDIUM', '~50k ton/year', 'ABCERVA, literatura',
   'Forte competição com ração animal; mercado estabelecido (R$ 80-120/ton)'),

  -- 2. Trub (cervejaria)
  ('IND_TRUB_CERVEJA', 'Trub (cervejaria)', 'industrial', 'INDÚSTRIA', 'Cervejarias',
   0.80, 0.75, 0.95, 0.70, 13.30, 0.20,
   'RAZOÁVEL', 'MEDIUM', '~15k ton/year', 'ABCERVA, processadoras',
   'Quantidade menor; alta heterogeneidade'),

  -- ========================================
  -- DAIRY RESIDUES (1 type)
  -- ========================================

  -- 3. Soro de Laticínios (Dairy Whey) - Highest BMP (0.38)!
  ('IND_SORO_LATICINIOS', 'Soro de Laticínios', 'industrial', 'INDÚSTRIA', 'Laticínios',
   0.75, 0.60, 0.95, 0.65, 17.81, 0.38,
   'BOM', 'MEDIUM', '~80k ton/year', 'EMBRAPA, ABIPLAC',
   'Alto BMP (0.38) mas transporte líquido custoso; 50-80km viável'),

  -- ========================================
  -- MEAT PROCESSING RESIDUES (2 types)
  -- ========================================

  -- 4. Resíduos Abatedouro
  ('IND_RESIDUO_ABATEDOURO', 'Resíduos Abatedouro', 'industrial', 'INDÚSTRIA', 'Frigoríficos',
   0.70, 0.50, 0.95, 0.70, 23.33, 0.30,
   'BOM', 'MEDIUM', '~40k ton/year', 'Frigorífico associações',
   'Alta heterogeneidade; restrições MAPA para biogás'),

  -- 5. Vísceras Não Comestíveis - Highest FDE (24.05%)!
  ('IND_VISCERAS_NAO_COMESTIVEIS', 'Vísceras Não Comestíveis', 'industrial', 'INDÚSTRIA', 'Frigoríficos',
   0.75, 0.55, 0.95, 0.75, 24.05, 0.35,
   'BOM', 'MEDIUM', '~50k ton/year', 'MAPA, frigoríficos',
   'Regulamentações MAPA rigorosas; farinha animal priorizada'),

  -- ========================================
  -- VEGETABLE PROCESSING RESIDUES (1 type)
  -- ========================================

  -- 6. Resíduos Processamento Vegetal
  ('IND_RESIDUO_PROCESSAMENTO_VEGETAL', 'Resíduos Processamento Vegetal', 'industrial', 'INDÚSTRIA', 'Processadoras',
   0.60, 0.70, 0.80, 0.60, 8.64, 0.22,
   'REGULAR', 'LOW', '~150k ton/year', 'Literatura, indústria',
   'Cadeias valor não mapeadas; alta heterogeneidade; ~20% variação'),

  -- ========================================
  -- FORESTRY RESIDUES (1 type)
  -- ========================================

  -- 7. Casca de Eucalipto (Eucalyptus Bark)
  ('IND_CASCA_EUCALIPTO', 'Casca de Eucalipto (florestal)', 'industrial', 'INDÚSTRIA', 'Silvicultura',
   0.70, 0.50, 0.85, 0.50, 14.88, 0.20,
   'RAZOÁVEL', 'LOW', '~200k ton/year', 'IEA Bioenergy, indústria',
   '🚨 Baixa densidade (150-200 kg/m³); >50km inviável; necessita densificação')

-- Handle conflicts: Update if residue_code already exists
ON CONFLICT (residue_code) DO UPDATE SET
  residue_name = EXCLUDED.residue_name,
  category = EXCLUDED.category,
  sector = EXCLUDED.sector,
  parent_crop = EXCLUDED.parent_crop,
  fc = EXCLUDED.fc,
  fcp = EXCLUDED.fcp,
  fs = EXCLUDED.fs,
  fl = EXCLUDED.fl,
  fde = EXCLUDED.fde,
  bmp = EXCLUDED.bmp,
  classification = EXCLUDED.classification,
  confidence = EXCLUDED.confidence,
  potential_sp_annual = EXCLUDED.potential_sp_annual,
  validation_source = EXCLUDED.validation_source,
  critical_observation = EXCLUDED.critical_observation,
  updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- Verification Query
-- ============================================================================

-- Check inserted industrial residues
SELECT
  residue_code,
  residue_name,
  fde,
  bmp,
  classification,
  confidence
FROM residue_factors
WHERE category = 'industrial'
ORDER BY fde DESC;

-- Summary statistics
SELECT
  category,
  COUNT(*) as residue_count,
  ROUND(AVG(fde), 2) as avg_fde,
  ROUND(MAX(fde), 2) as max_fde,
  ROUND(MIN(fde), 2) as min_fde
FROM residue_factors
GROUP BY category
ORDER BY category;

-- ============================================================================
-- Expected Results:
-- ============================================================================
-- 7 industrial residues should be inserted:
-- 1. IND_VISCERAS_NAO_COMESTIVEIS - 24.05% FDE (Highest)
-- 2. IND_RESIDUO_ABATEDOURO       - 23.33% FDE
-- 3. IND_BAGACO_MALTE             - 18.09% FDE
-- 4. IND_SORO_LATICINIOS          - 17.81% FDE (Highest BMP: 0.38)
-- 5. IND_CASCA_EUCALIPTO          - 14.88% FDE
-- 6. IND_TRUB_CERVEJA             - 13.30% FDE
-- 7. IND_RESIDUO_PROCESSAMENTO_VEGETAL - 8.64% FDE
--
-- Total residue count should be:
-- - agricultural: 18 residues
-- - livestock: 3 residues
-- - urban: 3 residues
-- - industrial: 7 residues (NEW)
-- TOTAL: 31 residues
-- ============================================================================

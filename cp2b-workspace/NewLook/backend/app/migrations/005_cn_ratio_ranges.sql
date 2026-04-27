-- Migration 005: Add C:N ratio min/max range columns to residuos
-- The existing chemical_cn_ratio column has median values.
-- This migration adds cn_ratio_min and cn_ratio_max for range display
-- in the co-digestion UI and range-aware pair scoring.
--
-- Run in Supabase SQL Editor. Values are SP-context literature ranges
-- calibrated around the existing chemical_cn_ratio medians.

ALTER TABLE residuos
  ADD COLUMN IF NOT EXISTS cn_ratio_min  REAL,
  ADD COLUMN IF NOT EXISTS cn_ratio_max  REAL;

COMMENT ON COLUMN residuos.cn_ratio_min IS 'Minimum C:N ratio from literature range (SP agricultural context)';
COMMENT ON COLUMN residuos.cn_ratio_max IS 'Maximum C:N ratio from literature range (SP agricultural context)';

-- ─── Agricultural residues ───────────────────────────────────────────────────

UPDATE residuos SET cn_ratio_min = 60,  cn_ratio_max = 100
  WHERE codigo = 'bagaco_cana';         -- chemical_cn_ratio = 78

UPDATE residuos SET cn_ratio_min = 50,  cn_ratio_max = 80
  WHERE codigo = 'palha_cana';          -- chemical_cn_ratio = 60

UPDATE residuos SET cn_ratio_min = 22,  cn_ratio_max = 40
  WHERE codigo = 'vinhaca_cana';        -- chemical_cn_ratio = 30

UPDATE residuos SET cn_ratio_min = 14,  cn_ratio_max = 26
  WHERE codigo = 'torta_filtro';        -- chemical_cn_ratio = 19

UPDATE residuos SET cn_ratio_min = 25,  cn_ratio_max = 45
  WHERE codigo = 'casca_soja';          -- chemical_cn_ratio = 33

UPDATE residuos SET cn_ratio_min = 25,  cn_ratio_max = 50
  WHERE codigo = 'palha_soja';          -- chemical_cn_ratio = 35

UPDATE residuos SET cn_ratio_min = 18,  cn_ratio_max = 35
  WHERE codigo = 'vagem_soja';          -- chemical_cn_ratio = 25

UPDATE residuos SET cn_ratio_min = 100, cn_ratio_max = 170
  WHERE codigo = 'casca_milho';         -- chemical_cn_ratio = 135

UPDATE residuos SET cn_ratio_min = 50,  cn_ratio_max = 85
  WHERE codigo = 'palha_milho';         -- chemical_cn_ratio = 65.5

UPDATE residuos SET cn_ratio_min = 38,  cn_ratio_max = 65
  WHERE codigo = 'sabugo_milho';        -- chemical_cn_ratio = 50

UPDATE residuos SET cn_ratio_min = 30,  cn_ratio_max = 55
  WHERE codigo = 'casca_cafe';          -- chemical_cn_ratio = 40

UPDATE residuos SET cn_ratio_min = 18,  cn_ratio_max = 35
  WHERE codigo = 'polpa_cafe';          -- chemical_cn_ratio = 25

UPDATE residuos SET cn_ratio_min = 5,   cn_ratio_max = 12
  WHERE codigo = 'mucilagem_cafe';      -- chemical_cn_ratio = 8

UPDATE residuos SET cn_ratio_min = 30,  cn_ratio_max = 55
  WHERE codigo = 'bagaco_citros';       -- chemical_cn_ratio = 40

UPDATE residuos SET cn_ratio_min = 15,  cn_ratio_max = 28
  WHERE codigo = 'cascas_citros';       -- chemical_cn_ratio = 20

UPDATE residuos SET cn_ratio_min = 15,  cn_ratio_max = 28
  WHERE codigo = 'cascas_citros_ind';   -- chemical_cn_ratio = 20

UPDATE residuos SET cn_ratio_min = 150, cn_ratio_max = 250
  WHERE codigo = 'casca_eucalipto';     -- chemical_cn_ratio = 200

-- ─── Livestock residues ───────────────────────────────────────────────────────

UPDATE residuos SET cn_ratio_min = 8,   cn_ratio_max = 15
  WHERE codigo = 'cama_aviario';        -- chemical_cn_ratio = 11

UPDATE residuos SET cn_ratio_min = 7,   cn_ratio_max = 15
  WHERE codigo = 'dejetos_aves_frescos'; -- chemical_cn_ratio = 10.5

UPDATE residuos SET cn_ratio_min = 10,  cn_ratio_max = 20
  WHERE codigo = 'dejetos_bovinos_liquidos'; -- chemical_cn_ratio = 14

UPDATE residuos SET cn_ratio_min = 12,  cn_ratio_max = 22
  WHERE codigo = 'esterco_bovino_fresco'; -- chemical_cn_ratio = 16

UPDATE residuos SET cn_ratio_min = 5,   cn_ratio_max = 12
  WHERE codigo = 'dejetos_suinos';      -- chemical_cn_ratio = 7.5

UPDATE residuos SET cn_ratio_min = 8,   cn_ratio_max = 18
  WHERE codigo = 'dejetos_suinos_liquidos'; -- chemical_cn_ratio = 13

-- ─── Industrial residues ─────────────────────────────────────────────────────

UPDATE residuos SET cn_ratio_min = 100, cn_ratio_max = 200
  WHERE codigo = 'gordura_sebo';        -- chemical_cn_ratio = 150

UPDATE residuos SET cn_ratio_min = 5,   cn_ratio_max = 12
  WHERE codigo = 'levedura_residual';   -- chemical_cn_ratio = 8

UPDATE residuos SET cn_ratio_min = 3,   cn_ratio_max = 6
  WHERE codigo = 'sangue_animal';       -- chemical_cn_ratio = 4

UPDATE residuos SET cn_ratio_min = 12,  cn_ratio_max = 25
  WHERE codigo = 'soro_queijo';         -- chemical_cn_ratio = 18

UPDATE residuos SET cn_ratio_min = 4,   cn_ratio_max = 9
  WHERE codigo = 'visceras_abatedouro'; -- chemical_cn_ratio = 6

-- ─── Urban residues ───────────────────────────────────────────────────────────

UPDATE residuos SET cn_ratio_min = 15,  cn_ratio_max = 30
  WHERE codigo = 'forsu_ur_rsu';        -- chemical_cn_ratio = 22

UPDATE residuos SET cn_ratio_min = 10,  cn_ratio_max = 18
  WHERE codigo = 'lodo_primario_ete';   -- chemical_cn_ratio = 13.6

UPDATE residuos SET cn_ratio_min = 5,   cn_ratio_max = 12
  WHERE codigo = 'lodo_secundario_ete'; -- chemical_cn_ratio = 8

-- Verify: check that all 31 residuos now have ranges set
-- SELECT codigo, chemical_cn_ratio, cn_ratio_min, cn_ratio_max
-- FROM residuos
-- WHERE cn_ratio_min IS NULL OR cn_ratio_max IS NULL
-- ORDER BY sector_codigo, codigo;

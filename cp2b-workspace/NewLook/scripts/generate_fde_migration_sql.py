#!/usr/bin/env python3
"""
Generate SQL migration to add FDE data for all 38 residues.

Reads from: data/fde_all_residues.json
Generates: backend/migrations/002_add_fde_validation_all_residues.sql

Author: Claude Code
Date: 2025-11-22
"""

import json
import os

# Paths
FDE_JSON = '/home/user/NewLook/cp2b-workspace/NewLook/data/fde_all_residues.json'
OUTPUT_SQL = '/home/user/NewLook/cp2b-workspace/NewLook/backend/migrations/002_add_fde_validation_all_residues.sql'

def main():
    # Read FDE results
    with open(FDE_JSON, 'r', encoding='utf-8') as f:
        residues = json.load(f)

    # Generate SQL migration
    sql_parts = []

    sql_parts.append("""-- Migration: 002_add_fde_validation_all_residues.sql
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
""")

    # Group by sector for organization
    by_sector = {}
    for r in residues:
        sector = r['setor']
        if sector not in by_sector:
            by_sector[sector] = []
        by_sector[sector].append(r)

    sector_names = {
        'AG_AGRICULTURA': '🌱 AGRICULTURA',
        'PC_PECUARIA': '🐄 PECUÁRIA',
        'IN_INDUSTRIAL': '🏭 INDUSTRIAL',
        'UR_URBANO': '🏙️ URBANO'
    }

    for sector_code in ['AG_AGRICULTURA', 'PC_PECUARIA', 'IN_INDUSTRIAL', 'UR_URBANO']:
        if sector_code not in by_sector:
            continue

        sector_residues = sorted(by_sector[sector_code], key=lambda x: x['fde'], reverse=True)

        sql_parts.append(f"\n-- {sector_names[sector_code]} ({len(sector_residues)} residues)")
        sql_parts.append("-- " + "=" * 78)

        for r in sector_residues:
            # Escape single quotes in nome
            nome_escaped = r['nome'].replace("'", "''")

            # Convert data sources to JSON string
            sources_json = json.dumps(r['data_sources'], ensure_ascii=False).replace("'", "''")

            # Convert alternative pathways to JSON string
            pathways_json = json.dumps(r['alternative_pathways'], ensure_ascii=False).replace("'", "''")

            confidence_emoji = {'HIGH': '✅', 'MEDIUM': '⚠️ ', 'LOW': '🔍'}[r['validation_confidence']]

            sql_parts.append(f"""
-- {confidence_emoji} {r['nome']} | FDE: {r['fde']:.2%} | {r['validation_confidence']}
UPDATE residuos SET
    fde = {r['fde']:.4f},
    fde_availability = {r['fde_availability']:.4f},
    fde_efficiency = {r['fde_efficiency']:.4f},
    validation_status = '{r['validation_status']}',
    validation_confidence = '{r['validation_confidence']}',
    validation_date = '2025-11-22',
    last_updated_by = 'CP2B Research Team',
    data_sources = '{sources_json}'::jsonb,
    alternative_pathways = '{pathways_json}'::jsonb
WHERE nome = '{nome_escaped}' AND sector_codigo = '{sector_code}';
""")

    sql_parts.append("""
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
""")

    # Write SQL file
    sql_content = '\n'.join(sql_parts)
    with open(OUTPUT_SQL, 'w', encoding='utf-8') as f:
        f.write(sql_content)

    print(f"✅ Generated migration SQL: {OUTPUT_SQL}")
    print(f"📊 Total SQL length: {len(sql_content)} characters")
    print(f"🔢 Total residues: {len(residues)}")

    # Summary by confidence
    high = len([r for r in residues if r['validation_confidence'] == 'HIGH'])
    medium = len([r for r in residues if r['validation_confidence'] == 'MEDIUM'])
    low = len([r for r in residues if r['validation_confidence'] == 'LOW'])

    print(f"\n📋 Confidence Distribution:")
    print(f"   HIGH:   {high} residues")
    print(f"   MEDIUM: {medium} residues")
    print(f"   LOW:    {low} residues")

if __name__ == '__main__':
    main()

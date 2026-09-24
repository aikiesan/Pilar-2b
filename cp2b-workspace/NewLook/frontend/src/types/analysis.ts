/**
 * PILAR-2b V3 - Analysis TypeScript Types
 * Correction factors, scenarios and methodology notes for the FDE analysis
 * Based on the FDE (effective availability factor) methodology
 */

import type { Messages } from '@/types/i18n'

// Correction Factors for FDE (effective availability factor)
export interface CorrectionFactors {
  fc: number   // Collection Factor (0.55 - 0.95)
  fcp: number  // Competition Factor (0 - 1) - goes to other uses
  fs: number   // Seasonality Factor (0.70 - 1.00)
  fl: number   // Logistics Factor (0.65 - 1.00)
}

// Default correction factor values — calibrated to approach FIESP ~16B m³ CH₄/year benchmark
// FDE = 0.90 × (1−0.20) × 0.88 × 0.84 ≈ 0.532 (53.2%)
// Available biogas ≈ 44.84B × 0.532 ≈ 23.9B m³/year × 0.625 CH₄ ≈ 14.9B m³ CH₄/year
export const DEFAULT_FACTORS: CorrectionFactors = {
  fc: 0.90,
  fcp: 0.20,
  fs: 0.88,
  fl: 0.84
}

// Factor range limits
export const FACTOR_RANGES = {
  fc:  { min: 0.55, max: 0.95, step: 0.01 },
  fcp: { min: 0,    max: 1,    step: 0.01 },
  fs:  { min: 0.70, max: 1.00, step: 0.01 },
  fl:  { min: 0.65, max: 1.00, step: 0.01 }
} as const

// Calculate FDE from correction factors
export function calculateFDE(factors: CorrectionFactors): number {
  return factors.fc * (1 - factors.fcp) * factors.fs * factors.fl
}

/** A key under analysis.scenarios — checked against the catalog. */
export type ScenarioTextKey = `scenarios.${keyof Messages['analysis']['scenarios']}`

/** A key under analysis.factor_docs — checked against the catalog. */
export type FactorDocKey = `factor_docs.${keyof Messages['analysis']['factor_docs']}`

// Scenario types. Name and description are copy: read them with
// useTranslations('analysis') and the keys below.
export interface Scenario {
  id: string
  nameKey: ScenarioTextKey
  descKey: ScenarioTextKey
  factors: CorrectionFactors
  color: string
}

// Pre-defined scenarios
export const PREDEFINED_SCENARIOS: Scenario[] = [
  {
    id: 'optimistic',
    nameKey: 'scenarios.optimistic_name',
    descKey: 'scenarios.optimistic_desc',
    // FDE = 0.95 × 0.90 × 0.95 × 0.92 = 0.748 → 74.8% → ~20.1B m³ CH₄/year
    factors: { fc: 0.95, fcp: 0.10, fs: 0.95, fl: 0.92 },
    color: '#22C55E'
  },
  {
    id: 'realistic',
    nameKey: 'scenarios.realistic_name',
    descKey: 'scenarios.realistic_desc',
    // FDE = 0.90 × 0.80 × 0.90 × 0.88 = 0.570 → 57.0% → ~15.3B m³ CH₄/year (near FIESP ~16B)
    factors: { fc: 0.90, fcp: 0.20, fs: 0.90, fl: 0.88 },
    color: '#3B82F6'
  },
  {
    id: 'frontier',
    nameKey: 'scenarios.frontier_name',
    descKey: 'scenarios.frontier_desc',
    // FDE = 0.92 × (1-0.15) × 0.92 × 0.90 = 0.648 → entre Realista (0.570) e Otimista (0.748)
    factors: { fc: 0.92, fcp: 0.15, fs: 0.92, fl: 0.90 },
    color: '#059669'
  },
  {
    id: 'conservative',
    nameKey: 'scenarios.conservative_name',
    descKey: 'scenarios.conservative_desc',
    // FDE = 0.75 × 0.65 × 0.80 × 0.75 = 0.293 → 29.3%
    factors: { fc: 0.75, fcp: 0.35, fs: 0.80, fl: 0.75 },
    color: '#F59E0B'
  },
  {
    id: 'pessimistic',
    nameKey: 'scenarios.pessimistic_name',
    descKey: 'scenarios.pessimistic_desc',
    // FDE = 0.60 × 0.50 × 0.72 × 0.65 = 0.140 → 14.0%
    factors: { fc: 0.60, fcp: 0.50, fs: 0.72, fl: 0.65 },
    color: '#EF4444'
  }
]

// Methodology documentation. Name, description and context are copy under
// analysis.factor_docs; `references` are citations and stay as published.
export interface FactorDocumentation {
  factor: keyof CorrectionFactors
  nameKey: FactorDocKey
  descKey: FactorDocKey
  contextKey: FactorDocKey
  typicalRange: { min: number; max: number }
  references: string[]
}

export const FACTOR_DOCUMENTATION: FactorDocumentation[] = [
  {
    factor: 'fc',
    nameKey: 'factor_docs.fc_title',
    descKey: 'factor_docs.fc_desc',
    contextKey: 'factor_docs.fc_context',
    typicalRange: { min: 0.55, max: 0.95 },
    references: [
      'UNICA (2023) - Relatorio Tecnico sobre Gestao de Bagaco', // i18n-exempt: citation
      'Silva et al. (2021) - Eficiencia de coleta em usinas de SP' // i18n-exempt: citation
    ]
  },
  {
    factor: 'fcp',
    nameKey: 'factor_docs.fcp_title',
    descKey: 'factor_docs.fcp_desc',
    contextKey: 'factor_docs.fcp_context',
    typicalRange: { min: 0, max: 1 },
    references: [
      'CEPEA/ESALQ - Precos de mercado para subprodutos', // i18n-exempt: citation
      'Scarlat et al. (2010) - Metodologia RPR europeia' // i18n-exempt: citation
    ]
  },
  {
    factor: 'fs',
    nameKey: 'factor_docs.fs_title',
    descKey: 'factor_docs.fs_desc',
    contextKey: 'factor_docs.fs_context',
    typicalRange: { min: 0.70, max: 1.00 },
    references: [
      'CONAB - Calendario agricola e periodos de safra', // i18n-exempt: citation
      'Gonzalez-Salazar et al. (2014) - Analise Monte Carlo' // i18n-exempt: citation
    ]
  },
  {
    factor: 'fl',
    nameKey: 'factor_docs.fl_title',
    descKey: 'factor_docs.fl_desc',
    contextKey: 'factor_docs.fl_context',
    typicalRange: { min: 0.65, max: 1.00 },
    references: [
      'ANTT - Tabelas de custo de frete', // i18n-exempt: citation
      'ABiogas (2020) - Potencial nacional de biogas' // i18n-exempt: citation
    ]
  }
]

// View mode for tabs
export type AnalysisViewMode = 'cascade' | 'flow' | 'scenarios' | 'table'

// ============================================================================
// PER-RESIDUE CUSTOMIZATION TYPES
// ============================================================================

// Scenario type for the new scenario system
export type ScenarioType = 'baseline' | 'conservative' | 'optimistic' | 'frontier' | 'custom'

// Per-residue factor overrides
// Maps residue code (e.g., "AG_CANA_TORTA_FILTRO") to custom correction factors
// null or undefined means "use default factors from CSV"
export interface ResidueFactorOverrides {
  [residueCode: string]: CorrectionFactors | null | undefined
}

/** A scenario's name or description, under analysis.residue_scenarios. */
export type ResidueScenarioTextKey = `residue_scenarios.${keyof Messages['analysis']['residue_scenarios']}`

// Scenario configuration with per-residue factors
export interface ResidueScenario {
  type: ScenarioType
  nameKey: ResidueScenarioTextKey
  descKey: ResidueScenarioTextKey
  color: string
  // For baseline: uses default factors from residueFactors.ts
  // For conservative/optimistic: applies multiplier to all factors
  // For custom: uses residueFactorOverrides
  factorOverrides?: ResidueFactorOverrides
  multiplier?: number  // For conservative/optimistic scenarios
}

// Default scenarios for the new system
export const RESIDUE_SCENARIOS: Record<ScenarioType, Omit<ResidueScenario, 'type'>> = {
  baseline: {
    nameKey: 'residue_scenarios.baseline_name',
    descKey: 'residue_scenarios.baseline_desc',
    color: '#3B82F6',
    multiplier: 1.0
  },
  conservative: {
    nameKey: 'residue_scenarios.conservative_name',
    descKey: 'residue_scenarios.conservative_desc',
    color: '#F59E0B',
    multiplier: 0.8
  },
  optimistic: {
    nameKey: 'residue_scenarios.optimistic_name',
    descKey: 'residue_scenarios.optimistic_desc',
    color: '#22C55E',
    multiplier: 1.15
  },
  frontier: {
    // "Fronteira do Biogás" — realistic-high mobilisation across all 31 residues:
    // relaxes the competing-use/collection constraints under dedicated public policy.
    // Sits between Médio Prazo and the technical ceiling; surpasses the FIESP benchmark
    // (~6.4 Mm³/d biometano) by leveraging the residues FIESP does not count.
    nameKey: 'residue_scenarios.frontier_name',
    descKey: 'residue_scenarios.frontier_desc',
    color: '#059669',
    multiplier: 1.3
  },
  custom: {
    nameKey: 'residue_scenarios.custom_name',
    descKey: 'residue_scenarios.custom_desc',
    color: '#8B5CF6'
  }
}

// Weighted FDE calculation result for multiple residues
export interface WeightedFDEResult {
  overallFDE: number  // Weighted average FDE (0-1)
  totalTheoretical: number  // Total theoretical potential (m3/year)
  totalAvailable: number  // Total available after FDE (m3/year)
  residueContributions: ResidueContribution[]
}

// Individual residue contribution to weighted FDE
export interface ResidueContribution {
  residueCode: string
  residueName: string
  theoretical: number  // m3/year for this residue
  fde: number  // 0-1
  available: number  // theoretical * fde
  weight: number  // Contribution to weighted average (0-1)
  factors: CorrectionFactors  // Factors used (default or custom)
}

// Calculate weighted FDE for multiple residues
export function calculateWeightedFDE(
  residuePotentials: Array<{ code: string; name: string; theoretical: number }>,
  factorOverrides: ResidueFactorOverrides,
  defaultFactorsMap: Map<string, CorrectionFactors>
): WeightedFDEResult {
  const contributions: ResidueContribution[] = []
  let totalTheoretical = 0
  let totalAvailable = 0

  residuePotentials.forEach(({ code, name, theoretical }) => {
    // Use override factors if available, otherwise use defaults
    const factors = factorOverrides[code] || defaultFactorsMap.get(code) || DEFAULT_FACTORS
    const fde = calculateFDE(factors)
    const available = theoretical * fde

    totalTheoretical += theoretical
    totalAvailable += available

    contributions.push({
      residueCode: code,
      residueName: name,
      theoretical,
      fde,
      available,
      weight: 0,  // Will be calculated after totals
      factors
    })
  })

  // Calculate weights (contribution to weighted average)
  contributions.forEach(contrib => {
    contrib.weight = totalTheoretical > 0 ? contrib.theoretical / totalTheoretical : 0
  })

  const overallFDE = totalTheoretical > 0 ? totalAvailable / totalTheoretical : 0

  return {
    overallFDE,
    totalTheoretical,
    totalAvailable,
    residueContributions: contributions
  }
}

// Apply scenario multiplier to factors
export function applyScenarioMultiplier(
  factors: CorrectionFactors,
  multiplier: number
): CorrectionFactors {
  return {
    fc: Math.min(1, Math.max(0, factors.fc * multiplier)),
    fcp: Math.min(1, Math.max(0, factors.fcp * multiplier)),
    fs: Math.min(1, Math.max(0, factors.fs * multiplier)),
    fl: Math.min(1, Math.max(0, factors.fl * multiplier))
  }
}

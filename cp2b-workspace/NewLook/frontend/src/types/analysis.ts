/**
 * PILAR-2b V3 - Analysis TypeScript Types
 * Type definitions for correction factors, cascade analysis, and scenario planning
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
// FDE = 0.90 × (1−0.20) × 0.88 × 0.84 ≈ 0.534 (53.4%)
// Available biogas ≈ 44.84B × 0.534 = 23.9B m³/year × 0.60 CH₄ ≈ 14.3B m³ CH₄/year
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

// Cascade stage for waterfall chart
export interface CascadeStage {
  stage: string
  value: number
  loss?: number
  cumulative: number
  color: string
  description: string
}

// Calculate FDE from correction factors
export function calculateFDE(factors: CorrectionFactors): number {
  return factors.fc * (1 - factors.fcp) * factors.fs * factors.fl
}

// Optional i18n labels for cascade stages
export interface CascadeLabels {
  theoretical: string
  lossCollection: string
  afterFC: string
  lossCompetition: string
  afterFCp: string
  lossSeasonal: string
  afterFS: string
  lossLogistics: string
  finalFDE: string
  descTheoretical: string
  descAfterFC: string
  descAfterFCp: string
  descAfterFS: string
  descAvailability: string
}

// Generate cascade data from theoretical potential
// Pass `labels` (from useTranslations) to get translated stage names
export function generateCascadeData(
  theoretical: number,
  factors: CorrectionFactors,
  labels?: CascadeLabels
): CascadeStage[] {
  const afterFC = theoretical * factors.fc
  const afterFCp = afterFC * (1 - factors.fcp)
  const afterFS = afterFCp * factors.fs
  const finalFDE = afterFS * factors.fl

  const l = labels ?? {
    theoretical: 'Theoretical Potential',
    lossCollection: 'Collection Loss',
    afterFC: 'After FC',
    lossCompetition: 'Competition Loss',
    afterFCp: 'After FCp',
    lossSeasonal: 'Seasonal Loss',
    afterFS: 'After FS',
    lossLogistics: 'Logistics Loss',
    finalFDE: 'FDE FINAL',
    descTheoretical: 'Total residue production',
    descAfterFC: 'After collection factor',
    descAfterFCp: 'After competition',
    descAfterFS: 'After seasonality',
    descAvailability: 'Effective Availability'
  }

  return [
    {
      stage: l.theoretical,
      value: theoretical,
      cumulative: theoretical,
      color: '#FFD700',
      description: l.descTheoretical
    },
    {
      stage: l.lossCollection,
      value: -(theoretical - afterFC),
      loss: theoretical - afterFC,
      cumulative: afterFC,
      color: '#DC143C',
      description: `FC = ${(factors.fc * 100).toFixed(0)}%`
    },
    {
      stage: l.afterFC,
      value: afterFC,
      cumulative: afterFC,
      color: '#FFA500',
      description: l.descAfterFC
    },
    {
      stage: l.lossCompetition,
      value: -(afterFC - afterFCp),
      loss: afterFC - afterFCp,
      cumulative: afterFCp,
      color: '#DC143C',
      description: `FCp = ${(factors.fcp * 100).toFixed(0)}%`
    },
    {
      stage: l.afterFCp,
      value: afterFCp,
      cumulative: afterFCp,
      color: '#228B22',
      description: l.descAfterFCp
    },
    {
      stage: l.lossSeasonal,
      value: -(afterFCp - afterFS),
      loss: afterFCp - afterFS,
      cumulative: afterFS,
      color: '#DC143C',
      description: `FS = ${(factors.fs * 100).toFixed(0)}%`
    },
    {
      stage: l.afterFS,
      value: afterFS,
      cumulative: afterFS,
      color: '#32CD32',
      description: l.descAfterFS
    },
    {
      stage: l.lossLogistics,
      value: -(afterFS - finalFDE),
      loss: afterFS - finalFDE,
      cumulative: finalFDE,
      color: '#DC143C',
      description: `FL = ${(factors.fl * 100).toFixed(0)}%`
    },
    {
      stage: l.finalFDE,
      value: finalFDE,
      cumulative: finalFDE,
      color: '#006400',
      description: `${l.descAvailability}: ${(calculateFDE(factors) * 100).toFixed(1)}%`
    }
  ]
}

// Sankey diagram types
export interface SankeyNode {
  name: string
  color: string
}

export interface SankeyLink {
  source: number
  target: number
  value: number
}

export interface SankeyData {
  nodes: SankeyNode[]
  links: SankeyLink[]
}

// Optional i18n node names for Sankey diagram
export interface SankeyNodeNames {
  theoretical: string
  collectionLoss: string
  collected: string
  competition: string
  available: string
  seasonalLoss: string
  adjusted: string
  logisticsLoss: string
  biogas: string
}

// Generate Sankey data for biomass flow
// Pass `nodeNames` (from useTranslations) to get translated node labels
export function generateSankeyData(
  theoretical: number,
  factors: CorrectionFactors,
  nodeNames?: SankeyNodeNames
): SankeyData {
  const collectionLoss = theoretical * (1 - factors.fc)
  const afterCollection = theoretical * factors.fc
  const competitionUse = afterCollection * factors.fcp
  const afterCompetition = afterCollection * (1 - factors.fcp)
  const seasonalLoss = afterCompetition * (1 - factors.fs)
  const afterSeasonal = afterCompetition * factors.fs
  const logisticsLoss = afterSeasonal * (1 - factors.fl)
  const finalAvailable = afterSeasonal * factors.fl

  const n = nodeNames ?? {
    theoretical: 'Theoretical Potential',
    collectionLoss: 'Collection Losses',
    collected: 'Collected',
    competition: 'Competing Uses',
    available: 'Available',
    seasonalLoss: 'Seasonal Losses',
    adjusted: 'Adjusted',
    logisticsLoss: 'Logistics Losses',
    biogas: 'Biogas Potential'
  }

  const nodes: SankeyNode[] = [
    { name: n.theoretical,    color: '#FFD700' },
    { name: n.collectionLoss, color: '#DC143C' },
    { name: n.collected,      color: '#FFA500' },
    { name: n.competition,    color: '#8B4513' },
    { name: n.available,      color: '#228B22' },
    { name: n.seasonalLoss,   color: '#CD853F' },
    { name: n.adjusted,       color: '#32CD32' },
    { name: n.logisticsLoss,  color: '#A0522D' },
    { name: n.biogas,         color: '#006400' }
  ]

  const links: SankeyLink[] = [
    { source: 0, target: 1, value: Math.max(collectionLoss, 1) },   // Theoretical -> Collection losses
    { source: 0, target: 2, value: Math.max(afterCollection, 1) },  // Theoretical -> Collected
    { source: 2, target: 3, value: Math.max(competitionUse, 1) },   // Collected -> Competition
    { source: 2, target: 4, value: Math.max(afterCompetition, 1) }, // Collected -> Available
    { source: 4, target: 5, value: Math.max(seasonalLoss, 1) },     // Available -> Seasonal losses
    { source: 4, target: 6, value: Math.max(afterSeasonal, 1) },    // Available -> Adjusted
    { source: 6, target: 7, value: Math.max(logisticsLoss, 1) },    // Adjusted -> Logistics losses
    { source: 6, target: 8, value: Math.max(finalAvailable, 1) }    // Adjusted -> Biogas potential
  ]

  return { nodes, links }
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

// Scenario comparison result
export interface ScenarioResult {
  scenario: Scenario
  fde: number
  availableVolume: number
  biogasPotential: number
  percentage: number
}

// Calculate scenario results
export const CH4_FRACTION = 0.60  // ~60% methane content in biogas

export function calculateScenarioResults(
  scenarios: Scenario[],
  theoreticalVolume: number,  // m³ biogas/year (pre-FDE)
  ch4Fraction: number = CH4_FRACTION
): ScenarioResult[] {
  return scenarios.map(scenario => {
    const fde = calculateFDE(scenario.factors)
    const availableVolume = theoreticalVolume * fde  // m³ biogas/year
    const biogasPotential = availableVolume * ch4Fraction  // m³ CH₄/year

    return {
      scenario,
      fde,
      availableVolume,
      biogasPotential,
      percentage: fde * 100
    }
  })
}

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

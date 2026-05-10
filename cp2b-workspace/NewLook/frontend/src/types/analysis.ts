/**
 * PILAR-2b V3 - Analysis TypeScript Types
 * Type definitions for correction factors, cascade analysis, and scenario planning
 * Based on FDE (Fator de Disponibilidade Efetiva) methodology
 */

// Correction Factors for FDE (Factor de Disponibilidade Efetiva)
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
  fc:  { min: 0.55, max: 0.95, step: 0.01, labelKey: 'analysis.factors.fc_label' },
  fcp: { min: 0,    max: 1,    step: 0.01, labelKey: 'analysis.factors.fcp_label' },
  fs:  { min: 0.70, max: 1.00, step: 0.01, labelKey: 'analysis.factors.fs_label' },
  fl:  { min: 0.65, max: 1.00, step: 0.01, labelKey: 'analysis.factors.fl_label' }
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

// Scenario types
export interface Scenario {
  id: string
  name: string       // legacy fallback (PT); prefer nameKey
  description: string // legacy fallback (PT); prefer descKey
  nameKey: string    // i18n key for translated name
  descKey: string    // i18n key for translated description
  factors: CorrectionFactors
  color: string
}

// Pre-defined scenarios
export const PREDEFINED_SCENARIOS: Scenario[] = [
  {
    id: 'optimistic',
    name: 'Otimista',
    description: 'Alta eficiencia de coleta, baixa competicao, disponibilidade constante',
    nameKey: 'scenarios.optimistic_name',
    descKey: 'scenarios.optimistic_desc',
    // FDE = 0.95 × 0.90 × 0.95 × 0.92 = 0.748 → 74.8% → ~20.1B m³ CH₄/year
    factors: { fc: 0.95, fcp: 0.10, fs: 0.95, fl: 0.92 },
    color: '#22C55E'
  },
  {
    id: 'realistic',
    name: 'Realista',
    description: 'Valores baseados em evidencias de literatura e validacao de campo',
    nameKey: 'scenarios.realistic_name',
    descKey: 'scenarios.realistic_desc',
    // FDE = 0.90 × 0.80 × 0.90 × 0.88 = 0.570 → 57.0% → ~15.3B m³ CH₄/year (near FIESP ~16B)
    factors: { fc: 0.90, fcp: 0.20, fs: 0.90, fl: 0.88 },
    color: '#3B82F6'
  },
  {
    id: 'conservative',
    name: 'Conservador',
    description: 'Considera todas as restricoes praticas de forma conservadora',
    nameKey: 'scenarios.conservative_name',
    descKey: 'scenarios.conservative_desc',
    // FDE = 0.75 × 0.65 × 0.80 × 0.75 = 0.293 → 29.3%
    factors: { fc: 0.75, fcp: 0.35, fs: 0.80, fl: 0.75 },
    color: '#F59E0B'
  },
  {
    id: 'pessimistic',
    name: 'Pessimista',
    description: 'Cenario com maiores perdas e competicao',
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

// Methodology documentation
export interface FactorDocumentation {
  factor: keyof CorrectionFactors
  name: string         // legacy PT fallback
  nameKey: string      // i18n key
  description: string  // legacy PT fallback
  descKey: string      // i18n key
  context: string      // legacy PT fallback
  contextKey: string   // i18n key
  typicalRange: { min: number; max: number }
  references: string[]
}

export const FACTOR_DOCUMENTATION: FactorDocumentation[] = [
  {
    factor: 'fc',
    name: 'Fator de Coleta (FC)',
    nameKey: 'factor_docs.fc_title',
    description: 'Eficiencia de coleta do residuo desde a geracao ate o ponto de processamento',
    descKey: 'factor_docs.fc_desc',
    context: 'Depende da infraestrutura de coleta, mecanizacao e dispersao geografica da fonte',
    contextKey: 'factor_docs.fc_context',
    typicalRange: { min: 0.55, max: 0.95 },
    references: [
      'UNICA (2023) - Relatorio Tecnico sobre Gestao de Bagaco',
      'Silva et al. (2021) - Eficiencia de coleta em usinas de SP'
    ]
  },
  {
    factor: 'fcp',
    name: 'Fator de Competicao (FCp)',
    nameKey: 'factor_docs.fcp_title',
    description: 'Fracao do residuo coletado que vai para usos alternativos ao biogas',
    descKey: 'factor_docs.fcp_desc',
    context: 'Inclui uso como racao animal, fertilizante, material industrial ou combustivel de caldeira',
    contextKey: 'factor_docs.fcp_context',
    typicalRange: { min: 0, max: 1 },
    references: [
      'CEPEA/ESALQ - Precos de mercado para subprodutos',
      'Scarlat et al. (2010) - Metodologia RPR europeia'
    ]
  },
  {
    factor: 'fs',
    name: 'Fator de Sazonalidade (FS)',
    nameKey: 'factor_docs.fs_title',
    description: 'Ajuste pela disponibilidade variavel ao longo do ano',
    descKey: 'factor_docs.fs_desc',
    context: 'Culturas sazonais como cana (abril-novembro) vs. pecuaria (constante)',
    contextKey: 'factor_docs.fs_context',
    typicalRange: { min: 0.70, max: 1.00 },
    references: [
      'CONAB - Calendario agricola e periodos de safra',
      'Gonzalez-Salazar et al. (2014) - Analise Monte Carlo'
    ]
  },
  {
    factor: 'fl',
    name: 'Fator de Logistica (FL)',
    nameKey: 'factor_docs.fl_title',
    description: 'Viabilidade economica do transporte ate a planta de biogas',
    descKey: 'factor_docs.fl_desc',
    context: 'Baseado em distancia tipica, custo de frete e valor do biogas',
    contextKey: 'factor_docs.fl_context',
    typicalRange: { min: 0.65, max: 1.00 },
    references: [
      'ANTT - Tabelas de custo de frete',
      'ABiogas (2020) - Potencial nacional de biogas'
    ]
  }
]

// View mode for tabs
export type AnalysisViewMode = 'cascade' | 'flow' | 'scenarios' | 'table'

// Export format options
export type ExportFormat = 'csv' | 'xlsx' | 'pdf' | 'geojson' | 'json'

export interface ExportOption {
  format: ExportFormat
  icon: string
  label: string
  description: string  // legacy PT fallback
  descKey: string      // i18n key
}

export const EXPORT_OPTIONS: ExportOption[] = [
  { format: 'csv',     icon: 'FileSpreadsheet', label: 'CSV',     description: 'Dados tabulares para Excel',      descKey: 'analysis.export_options.csv_label' },
  { format: 'xlsx',    icon: 'FileSpreadsheet', label: 'Excel',   description: 'Planilha com multiplas abas',     descKey: 'analysis.export_options.xlsx_label' },
  { format: 'pdf',     icon: 'FileText',        label: 'PDF',     description: 'Relatorio com graficos',          descKey: 'analysis.export_options.pdf_label' },
  { format: 'geojson', icon: 'Map',             label: 'GeoJSON', description: 'Para software GIS',              descKey: 'analysis.export_options.geojson_label' },
  { format: 'json',    icon: 'Braces',          label: 'JSON',    description: 'Dados estruturados para API',     descKey: 'analysis.export_options.json_label' }
]

// ============================================================================
// PER-RESIDUE CUSTOMIZATION TYPES
// ============================================================================

// Scenario type for the new scenario system
export type ScenarioType = 'baseline' | 'conservative' | 'optimistic' | 'custom'

// Per-residue factor overrides
// Maps residue code (e.g., "AG_CANA_TORTA_FILTRO") to custom correction factors
// null or undefined means "use default factors from CSV"
export interface ResidueFactorOverrides {
  [residueCode: string]: CorrectionFactors | null | undefined
}

// Scenario configuration with per-residue factors
export interface ResidueScenario {
  type: ScenarioType
  name: string        // legacy PT fallback
  nameKey: string     // i18n key
  description: string // legacy PT fallback
  descKey: string     // i18n key
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
    name: 'Baseline',
    nameKey: 'residue_scenarios.baseline_name',
    description: 'Fatores padrão baseados em dados da literatura (CSV)',
    descKey: 'residue_scenarios.baseline_desc',
    color: '#3B82F6',
    multiplier: 1.0
  },
  conservative: {
    name: 'Conservador',
    nameKey: 'residue_scenarios.conservative_name',
    description: 'Reduz todos os fatores em 20% (pior cenário)',
    descKey: 'residue_scenarios.conservative_desc',
    color: '#F59E0B',
    multiplier: 0.8
  },
  optimistic: {
    name: 'Otimista',
    nameKey: 'residue_scenarios.optimistic_name',
    description: 'Aumenta fatores em 15% (melhor cenário)',
    descKey: 'residue_scenarios.optimistic_desc',
    color: '#22C55E',
    multiplier: 1.15
  },
  custom: {
    name: 'Personalizado',
    nameKey: 'residue_scenarios.custom_name',
    description: 'Fatores ajustados manualmente por resíduo',
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

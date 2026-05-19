/**
 * PILAR-2b V3 - Scientific References & Biokinetics TypeScript Types
 * Type definitions for kinetic parameters, chemical data, and scientific references
 * Based on DBFZ three-fraction kinetic model and PanoramaCP2B data
 */

// ==========================================
// KINETIC PARAMETERS (DBFZ-inspired)
// ==========================================

export type KineticClassification = 'slow' | 'medium' | 'medium-fast' | 'fast'

export interface KineticData {
  residue_id: number
  residue_name: string
  sector: string

  // Three-fraction model parameters (fixed rate constants)
  k_slow: number    // d⁻¹ (default: 0.05)
  k_med: number     // d⁻¹ (default: 0.5)
  k_fast: number    // d⁻¹ (default: 5.0)

  // Fractions (variable per residue)
  f_slow: number    // fraction of VS degrading slowly
  f_med: number     // fraction of VS degrading at medium rate
  f_fast: number    // fraction of VS degrading fast

  // Derived metrics
  fq: number        // Fermentability Quotient = f_slow + f_med + f_fast
  classification: KineticClassification

  // BMP comparison
  bmp_experimental: number   // L CH₄/kg VS (lab measured)
  bmp_simulated: number      // L CH₄/kg VS (model predicted)

  // Time metrics
  t50: number       // days to 50% BMP
  t80: number       // days to 80% BMP

  // Test conditions
  test_standard?: string     // VDI4630, ISO, etc.
  temperature?: number       // °C
  retention_time?: number    // days

  // References
  references?: string[]
}

// Kinetic curve point for chart
export interface KineticCurvePoint {
  time: number              // days
  yield: number             // L CH₄/kg VS
  cumulative_fraction: number  // fraction of FQ reached
}

// ==========================================
// CHEMICAL DATA (PanoramaCP2B)
// ==========================================

export type DataQuality = 'excellent' | 'good' | 'moderate' | 'poor'
export type SectorType = 'agricultural' | 'livestock' | 'industrial' | 'urban'

export interface ChemicalData {
  residue_id: number
  residue_name: string
  sector: SectorType

  // Basic composition
  moisture: number          // %
  ts: number                // Total Solids (%)
  vs: number                // Volatile Solids (% of TS)
  ash?: number              // %

  // Biogas potential
  bmp: number               // L CH₄/kg VS
  bmp_range_min?: number
  bmp_range_max?: number
  bmp_n_studies?: number
  ch4_content?: number      // % CH₄ in biogas

  // Nutrient ratios
  cn_ratio: number          // C:N ratio
  carbon_pct?: number
  nitrogen_pct?: number
  phosphorus_pct?: number
  potassium_pct?: number

  // Physical-chemical
  ph?: number
  cod?: number              // g O₂/L
  bod?: number              // g O₂/L
  alkalinity?: number
  vfa?: number              // volatile fatty acids (mg/L)

  // FDE factor
  fde?: number              // Effective availability factor (0-100%)
  fde_classification?: string  // EXCEPCIONAL, EXCELENTE, etc.

  // Metadata
  data_quality: DataQuality
  source_type: string       // laboratory, literature, estimated
}

// Range data for literature comparison
export interface LiteratureRange {
  parameter: string
  value: number
  min: number
  max: number
  n_studies: number
  unit: string
}

// ==========================================
// SCIENTIFIC REFERENCES
// ==========================================

export type ReferenceType = 'journal' | 'conference' | 'thesis' | 'report' | 'book'
export type ParameterType = 'bmp' | 'kinetics' | 'cn' | 'ph' | 'codigestion' | 'fde' | 'cod' | 'vs'

export interface ScientificReference {
  id: number

  // Citation info
  authors: string
  title: string
  journal?: string
  year: number
  volume?: string
  issue?: string
  pages?: string

  doi?: string
  url?: string
  pdf_url?: string

  // Classification
  reference_type: ReferenceType
  peer_reviewed: boolean
  sector: SectorType

  // Content
  abstract?: string
  keywords?: string[]
  methodology?: string
  key_findings?: string[]

  // Linked data
  residues_studied: string[]
  parameters_measured: ParameterType[]
  extracted_data?: Record<string, any>

  // Impact metrics
  cited_by?: number
  relevance_score?: number
  data_quality?: DataQuality

  // Context
  geographic_scope?: string
  sample_size?: number
}

// ==========================================
// CO-DIGESTION
// ==========================================

export interface CoDigestionMix {
  primary_residue: string
  co_substrate: string
  ratio: [number, number]    // [primary%, coSubstrate%]
  final_cn: number
  bmp_mix: number
  improvement_pct: number
  feasibility: CoDigestionFeasibility
}

export interface CoDigestionFeasibility {
  score: number              // 0-10
  viable: boolean
  logistics: string
  seasonality: string
  cost: string
}

// ==========================================
// API RESPONSE TYPES
// ==========================================

export interface KineticsResponse {
  data: KineticData[]
  total: number
  filters_applied: {
    sector?: string
    classification?: KineticClassification
    residues?: string[]
  }
}

export interface ChemicalDataResponse {
  data: ChemicalData[]
  total: number
  coverage: {
    bmp: number
    moisture: number
    ts: number
    vs: number
    cn_ratio: number
    ch4_content: number
    ph: number
    cod: number
  }
}

export interface ReferencesResponse {
  data: ScientificReference[]
  total: number
  filters_applied: {
    sector?: SectorType[]
    residue?: string[]
    parameter?: ParameterType[]
    year_range?: [number, number]
    peer_reviewed?: boolean
    has_data?: boolean
  }
}

export interface CoDigestionResponse {
  recommendations: CoDigestionMix[]
  primary_residue: ChemicalData
  target_cn: number
}

// ==========================================
// FILTER TYPES
// ==========================================

export interface KineticsFilter {
  sector?: SectorType
  classification?: KineticClassification
  residues?: string[]
}

export interface ReferencesFilter {
  sector?: SectorType[]
  residue?: string[]
  parameter?: ParameterType[]
  year_range?: [number, number]
  peer_reviewed?: boolean
  has_data?: boolean
}

// ==========================================
// VIEW MODES
// ==========================================

export type ScientificViewMode = 'kinetics' | 'chemical' | 'references' | 'comparison'

// ==========================================
// CONSTANTS
// ==========================================

// Stoichiometric potential
export const Y_CH4_STOICHIOMETRIC = 420  // L CH₄/kg DVS

// Fixed kinetic rate constants (DBFZ model)
export const KINETIC_CONSTANTS = {
  k_slow: 0.05,   // d⁻¹
  k_med: 0.5,     // d⁻¹
  k_fast: 5.0     // d⁻¹
}

// Classification thresholds
export const KINETIC_CLASSIFICATION_RULES = {
  slow: { f_fast_max: 0.1, f_med_max: 0.3 },
  medium: { f_fast_max: 0.2, f_med_min: 0.3 },
  'medium-fast': { f_fast_min: 0.2, f_med_min: 0.3 },
  fast: { f_fast_min: 0.5 }
}

// Sector labels (Portuguese)
export const SECTOR_LABELS: Record<SectorType, string> = {
  agricultural: 'Agrícola',
  livestock: 'Pecuária',
  industrial: 'Industrial',
  urban: 'Urbano'
}

// Parameter labels (Portuguese)
export const PARAMETER_LABELS: Record<ParameterType, string> = {
  bmp: 'BMP',
  kinetics: 'Cinética',
  cn: 'C:N',
  ph: 'pH',
  codigestion: 'Co-digestão',
  fde: 'FDE/SAF',
  cod: 'COD',
  vs: 'Sólidos Voláteis'
}

// Classification colors
export const KINETIC_COLORS: Record<KineticClassification, string> = {
  slow: '#1E3A8A',       // dark blue
  medium: '#16A34A',     // green
  'medium-fast': '#F59E0B', // amber
  fast: '#DC2626'        // red
}

// Quality colors
export const QUALITY_COLORS: Record<DataQuality, string> = {
  excellent: '#22C55E',
  good: '#3B82F6',
  moderate: '#F59E0B',
  poor: '#EF4444'
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Calculate methane yield at time t using three-fraction model
 */
export function calculateKineticYield(
  kinetics: KineticData,
  t: number
): number {
  const slowComponent = kinetics.f_slow * (1 - Math.exp(-kinetics.k_slow * t))
  const medComponent = kinetics.f_med * (1 - Math.exp(-kinetics.k_med * t))
  const fastComponent = kinetics.f_fast * (1 - Math.exp(-kinetics.k_fast * t))

  return Y_CH4_STOICHIOMETRIC * (slowComponent + medComponent + fastComponent)
}

/**
 * Generate curve data points for a residue
 */
export function generateKineticCurve(
  kinetics: KineticData,
  maxDays: number = 30
): KineticCurvePoint[] {
  const points: KineticCurvePoint[] = []

  for (let t = 0; t <= maxDays; t++) {
    const yieldValue = calculateKineticYield(kinetics, t)
    const maxYield = Y_CH4_STOICHIOMETRIC * kinetics.fq

    points.push({
      time: t,
      yield: yieldValue,
      cumulative_fraction: maxYield > 0 ? yieldValue / maxYield : 0
    })
  }

  return points
}

/**
 * Calculate C:N ratio status
 */
export function getCNStatus(cn: number): { status: string; color: string; recommendation: string } {
  if (cn >= 20 && cn <= 30) {
    return {
      status: 'Ótimo',
      color: '#22C55E',
      recommendation: 'Relação ideal para digestão anaeróbia'
    }
  } else if (cn < 20) {
    return {
      status: 'Baixo',
      color: '#F59E0B',
      recommendation: 'Considerar co-digestão com material rico em carbono'
    }
  } else if (cn > 30 && cn <= 40) {
    return {
      status: 'Alto',
      color: '#F59E0B',
      recommendation: 'Considerar co-digestão com material rico em nitrogênio'
    }
  } else {
    return {
      status: 'Muito Alto',
      color: '#EF4444',
      recommendation: 'Necessária co-digestão com material rico em nitrogênio'
    }
  }
}

/**
 * Calculate optimal mix ratio for target C:N
 */
export function calculateMixRatio(
  primary: ChemicalData,
  coSubstrate: ChemicalData,
  targetCN: number
): [number, number] {
  // Linear interpolation to find mix ratio
  // targetCN = r1 * cn1 + r2 * cn2, where r1 + r2 = 1
  const cn1 = primary.cn_ratio
  const cn2 = coSubstrate.cn_ratio

  if (cn1 === cn2) return [50, 50]

  const r2 = (targetCN - cn1) / (cn2 - cn1)
  const r1 = 1 - r2

  // Clamp to valid range
  const clampedR1 = Math.max(0.1, Math.min(0.9, r1))
  const clampedR2 = 1 - clampedR1

  return [
    Math.round(clampedR1 * 100),
    Math.round(clampedR2 * 100)
  ]
}

/**
 * Get classification badge color
 */
export function getClassificationColor(classification: KineticClassification): string {
  return KINETIC_COLORS[classification]
}

/**
 * Format BMP error percentage
 */
export function formatBMPError(experimental: number, simulated: number): string {
  if (experimental === 0) return 'N/A'
  const error = ((simulated - experimental) / experimental * 100)
  return `${error >= 0 ? '+' : ''}${error.toFixed(1)}%`
}

/**
 * Types and model helpers of the scientific database: residues with their
 * chemical parameters, the literature behind them, and degradation kinetics
 * (DBFZ three-fraction model).
 *
 * The records mirror the backend's residue database (/api/v1/residuos,
 * /api/v1/scientific), whose field names are Portuguese identifiers.
 */

// ==========================================
// RESIDUES
// ==========================================

/** Sector codes as the backend's residue database writes them (identifiers, not copy). */
export type SectorCode = 'AG_AGRICULTURA' | 'PC_PECUARIA' | 'UR_URBANO' | 'IN_INDUSTRIAL'

export const SECTOR_CODES: readonly SectorCode[] = ['AG_AGRICULTURA', 'PC_PECUARIA', 'UR_URBANO', 'IN_INDUSTRIAL']

/** A residue's name as the database stores it: Portuguese, and English once translated. */
export interface ResidueName {
  nome: string
  nome_en?: string | null
}

/** A residue with its chemical characterization (GET /residuos/). */
export interface ResidueRecord extends ResidueName {
  id: number
  codigo: string
  sector_codigo: SectorCode
  icon?: string | null
  /** BMP in L CH₄/kg VS. */
  bmp_medio?: number | null
  bmp_min?: number | null
  bmp_max?: number | null
  bmp_n_studies?: number | null
  /** Total solids, % of fresh mass. */
  ts_medio?: number | null
  ts_min?: number | null
  ts_max?: number | null
  /** Volatile solids, % of TS. */
  vs_medio?: number | null
  vs_min?: number | null
  vs_max?: number | null
  chemical_cn_ratio?: number | null
  /** CH₄ share of the biogas, %. */
  chemical_ch4_content?: number | null
  ph?: number | null
  /** FDE factors; a residue with all four has a validated availability. */
  fc_medio?: number | null
  fcp_medio?: number | null
  fs_medio?: number | null
  fl_medio?: number | null
  reference_count?: number | null
  /** "Authors (year)" of the residue's main reference. */
  main_reference?: string | null
  primary_doi?: string | null
}

/** One sector of the residue database (GET /residuos/summary/by-sector). */
export interface SectorSummary {
  codigo: SectorCode
  emoji?: string | null
  ordem?: number | null
  num_residuos: number
  total_references: number
}

/** Whether a residue's four FDE factors are all in the database. */
export function hasCompleteFde(residue: ResidueRecord): boolean {
  return [residue.fc_medio, residue.fcp_medio, residue.fs_medio, residue.fl_medio].every(
    (factor) => factor !== null && factor !== undefined
  )
}

// ==========================================
// LITERATURE
// ==========================================

/** A paper of the knowledge base. Bibliographic fields are cited as published, never translated. */
export interface LiteratureReference {
  id: number
  authors: string | null
  title: string
  journal: string | null
  year: number | null
  doi: string | null
  url: string | null
  /** The paper's parameters were checked against the database (`has_validated_params`). */
  validated: boolean
  sector: SectorCode | null
  /** The residue the paper is filed under. */
  residue: ResidueName | null
}

// ==========================================
// KINETIC PARAMETERS (DBFZ-inspired)
// ==========================================

export type KineticClassification = 'slow' | 'medium' | 'medium-fast' | 'fast'

export interface KineticData {
  residue_id: number
  residue_name: string
  /** English name, once the database has one (migration 032). */
  residue_name_en?: string | null
  sector: string

  // Kinetic constants (fixed in DBFZ model)
  k_slow: number    // d⁻¹ (default: 0.05)
  k_med: number     // d⁻¹ (default: 0.5)
  k_fast: number    // d⁻¹ (default: 5.0)

  // Degradable fractions
  f_slow: number    // fraction of VS degrading slowly
  f_med: number     // fraction of VS degrading at medium rate
  f_fast: number    // fraction of VS degrading fast

  // Fermentability Quotient
  fq: number        // Fermentability Quotient = f_slow + f_med + f_fast
  classification: KineticClassification

  // BMP values
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
  yield: number             // L CH₄/kg VS (mean fit)
  cumulative_fraction: number  // fraction of FQ reached
  yield_low?: number        // lower bound of experimental-variability band
  yield_high?: number       // upper bound of experimental-variability band
}

// ==========================================
// VIEW MODES
// ==========================================

export const SCIENTIFIC_VIEWS = ['residues', 'kinetics', 'chemical', 'references', 'comparison'] as const
export type ScientificViewMode = (typeof SCIENTIFIC_VIEWS)[number]

export function isScientificView(value: string | null | undefined): value is ScientificViewMode {
  return (SCIENTIFIC_VIEWS as readonly string[]).includes(value ?? '')
}

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

// Classification colors
export const KINETIC_COLORS: Record<KineticClassification, string> = {
  slow: '#1E3A8A',       // dark blue
  medium: '#16A34A',     // green
  'medium-fast': '#F59E0B', // amber
  fast: '#DC2626'        // red
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

// Typical replicate variability of cumulative BMP assays (coefficient of variation).
// Anaerobic BMP round-robins report CV ≈ 8–15% between labs/replicates
// (Holliger et al., 2016, Water Sci. Technol. 74:2515). We use 12% as the
// shaded experimental-variability band — this is an explicit assay-uncertainty
// envelope, NOT fabricated data points.
export const BMP_REPLICATE_CV = 0.12

/**
 * Generate a cumulative methane curve for a residue.
 *
 * The mean curve is a **modified Gompertz** model fitted to the residue's own
 * reported half-life (t50) and t80 — so each residue's curve reflects its actual
 * degradation speed (lag → exponential rise → plateau) instead of a shared,
 * artificially-identical shape. A ±CV band (BMP_REPLICATE_CV) communicates the
 * real experimental variability of BMP assays.
 *
 * Falls back to the three-fraction model when t50/t80 are unavailable.
 */
export function generateKineticCurve(
  kinetics: KineticData,
  maxDays: number = 30
): KineticCurvePoint[] {
  const points: KineticCurvePoint[] = []
  const maxYield = Y_CH4_STOICHIOMETRIC * kinetics.fq

  const t50 = kinetics.t50
  const t80 = kinetics.t80
  const haveGompertz = typeof t50 === 'number' && typeof t80 === 'number' && t80 > t50 && t50 > 0

  // Modified-Gompertz shape parameters derived from t50/t80:
  //   F(t) = exp(-exp(a*(λ - t) + 1)),  with F(t50)=0.5, F(t80)=0.8
  //   a = 1.13343 / (t80 - t50);  λ = t50 - 1.36651/a  (clamped ≥ 0)
  let a = 0
  let lag = 0
  if (haveGompertz) {
    a = 1.13343 / (t80 - t50)
    lag = t50 - 1.36651 / a
    if (lag < 0) {
      lag = 0
      a = 1.36651 / t50 // re-anchor so F(t50)=0.5 with zero lag
    }
  }

  for (let t = 0; t <= maxDays; t++) {
    let frac: number
    if (haveGompertz) {
      frac = Math.exp(-Math.exp(a * (lag - t) + 1))
    } else {
      const y = calculateKineticYield(kinetics, t)
      frac = maxYield > 0 ? y / maxYield : 0
    }
    frac = Math.min(Math.max(frac, 0), 1)
    const yieldValue = maxYield * frac

    points.push({
      time: t,
      yield: yieldValue,
      cumulative_fraction: frac,
      yield_low: yieldValue * (1 - BMP_REPLICATE_CV),
      yield_high: yieldValue * (1 + BMP_REPLICATE_CV),
    })
  }

  return points
}

/** Where a C:N ratio sits for anaerobic digestion; texts: pages.scientific_database.cn.<level>. */
export type CnLevel = 'optimal' | 'low' | 'high' | 'very_high'

export const CN_LEVEL_COLORS: Record<CnLevel, string> = {
  optimal: '#22C55E',
  low: '#F59E0B',
  high: '#F59E0B',
  very_high: '#EF4444',
}

/** 20–30 is the optimal band; null when the ratio is unknown. */
export function cnLevel(cn: number | null | undefined): CnLevel | null {
  if (cn === null || cn === undefined || !Number.isFinite(cn) || cn <= 0) return null
  if (cn < 20) return 'low'
  if (cn <= 30) return 'optimal'
  if (cn <= 40) return 'high'
  return 'very_high'
}

/** Relative error of the simulated BMP, in percent; null without an experimental value. */
export function bmpErrorPercent(experimental: number, simulated: number): number | null {
  if (!experimental) return null
  return ((simulated - experimental) / experimental) * 100
}

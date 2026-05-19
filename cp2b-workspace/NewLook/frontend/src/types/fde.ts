/**
 * FDE (Fator de Disponibilidade Efetivo) Types
 * Effective Availability Factor for biogas potential calculations
 */

export type ValidationStatus =
  | 'EMBRAPA_VALIDATED'
  | 'IBGE_VALIDATED'
  | 'UNICA_VALIDATED'
  | 'CETESB_VALIDATED'
  | 'SNIS_VALIDATED'
  | 'SABESP_VALIDATED'
  | 'ABRELPE_VALIDATED'
  | 'INDUSTRY_VALIDATED'
  | 'ACADEMIC_VALIDATED'
  | 'NEEDS_FIELD_SURVEY'
  | 'COMPETING_USES_EXCLUDED'
  | 'PENDING_VALIDATION'
  | 'DEPRECATED'

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW'

export interface DataSource {
  name: string
  year: number
  type: 'Official Census' | 'Technical Report' | 'Industry Report' | 'Research' | 'Regulatory Norm' | 'Operational Data' | 'Government Agency' | 'Government Program' | 'Industry Association' | 'Regional Statistics'
  organization?: string
  reference?: string
  url?: string
}

export interface AlternativePathway {
  share: number // 0-1
  description: string
  economic_value?: string
  recommendation?: string
}

export interface AlternativePathways {
  competing_uses: Record<string, number>
  total_unavailable: number
  reasons: string[]
  [key: string]: any // Allow additional pathway data
}

export interface FDEMetadata {
  last_fde_update?: string
  previous_fde?: number
  change_reason?: string
  exclusion_reason?: string
  show_alternative?: boolean
  alternative_display?: {
    cogeneration?: {
      capacity_twh: number
      value_billion_brl: number
    }
    ethanol_2g?: {
      capacity_ml: number
      value_billion_brl: number
    }
  }
}

export interface FDEData {
  // FDE Components
  fde: number // 0-1: Fator de Disponibilidade Efetivo
  fde_availability: number // 0-1: Availability component
  fde_efficiency: number // 0-1: Efficiency component

  // Validation
  validation_status: ValidationStatus
  validation_confidence: ConfidenceLevel
  validation_date: string | null

  // Competing Uses Analysis
  competing_uses_total: number // 0-1
  collection_feasibility: number // 0-1
  conversion_efficiency: number // 0-1

  // Technical Data
  bmp_value?: number // Biochemical Methane Potential (m³ CH₄/Mg VS)

  // Documentation
  methodology_notes: string | null
  data_sources: DataSource[]
  alternative_pathways: AlternativePathways | null

  // Metadata
  last_updated_by: string | null
  metadata: FDEMetadata | null
}

export interface ResidueWithFDE {
  id: number
  nome_residuo: string
  categoria: string
  producao_anual_mg?: number

  // Biogas characteristics
  bmp_m3_mg_vs: number // Biochemical Methane Potential
  vs_content: number // Volatile Solids content

  // FDE data
  fde_data: FDEData

  // Calculated potentials
  biogas_potential_m3?: number
  energy_potential_kwh?: number
  energy_potential_twh?: number
}

export interface FDESummary {
  total_residues: number
  validated_residues: number
  high_confidence: number
  medium_confidence: number
  low_confidence: number
  excluded_residues: number
  total_energy_potential_twh: number
}

export interface ValidationBadgeProps {
  status: ValidationStatus
  confidence: ConfidenceLevel
  date?: string | null
  size?: 'sm' | 'md' | 'lg'
  showTooltip?: boolean
}

export interface DataProvenanceProps {
  sources: DataSource[]
  validationDate?: string | null
  lastUpdatedBy?: string | null
  methodologyLink?: string
  compact?: boolean
}

export interface AlternativePathwaysProps {
  pathways: AlternativePathways
  totalProduction: number
  metadata?: FDEMetadata | null
}

export interface FDEBreakdownProps {
  fde: number
  availability: number
  efficiency: number
  competingUsesTotal: number
  collectionFeasibility: number
  conversionEfficiency: number
  methodologyNotes?: string | null
  showCalculation?: boolean
}

/**
 * Helper function to get status badge color
 */
export function getValidationStatusColor(status: ValidationStatus): string {
  const colors: Record<ValidationStatus, string> = {
    EMBRAPA_VALIDATED: 'green',
    IBGE_VALIDATED: 'green',
    UNICA_VALIDATED: 'green',
    CETESB_VALIDATED: 'green',
    SNIS_VALIDATED: 'green',
    SABESP_VALIDATED: 'green',
    ABRELPE_VALIDATED: 'green',
    INDUSTRY_VALIDATED: 'blue',
    ACADEMIC_VALIDATED: 'blue',
    NEEDS_FIELD_SURVEY: 'yellow',
    COMPETING_USES_EXCLUDED: 'red',
    PENDING_VALIDATION: 'gray',
    DEPRECATED: 'gray',
  }
  return colors[status] || 'gray'
}

/**
 * Helper function to get human-readable status label
 */
export function getValidationStatusLabel(status: ValidationStatus): string {
  const labels: Record<ValidationStatus, string> = {
    EMBRAPA_VALIDATED: 'Validado EMBRAPA',
    IBGE_VALIDATED: 'Validado IBGE',
    UNICA_VALIDATED: 'Validado UNICA',
    CETESB_VALIDATED: 'Validado CETESB',
    SNIS_VALIDATED: 'Validado SNIS',
    SABESP_VALIDATED: 'Validado SABESP',
    ABRELPE_VALIDATED: 'Validado ABRELPE',
    INDUSTRY_VALIDATED: 'Validado Indústria',
    ACADEMIC_VALIDATED: 'Validado Acadêmico',
    NEEDS_FIELD_SURVEY: 'Requer Validação de Campo',
    COMPETING_USES_EXCLUDED: 'Não Disponível para Biogás',
    PENDING_VALIDATION: 'Validação Pendente',
    DEPRECATED: 'Descontinuado',
  }
  return labels[status] || status
}

/**
 * Helper function to get confidence level label
 */
export function getConfidenceLevelLabel(confidence: ConfidenceLevel): string {
  const labels: Record<ConfidenceLevel, string> = {
    HIGH: 'Alta Confiança',
    MEDIUM: 'Confiança Média',
    LOW: 'Baixa Confiança',
  }
  return labels[confidence] || confidence
}

/**
 * Helper function to get confidence level color
 */
export function getConfidenceLevelColor(confidence: ConfidenceLevel): string {
  const colors: Record<ConfidenceLevel, string> = {
    HIGH: 'green',
    MEDIUM: 'yellow',
    LOW: 'orange',
  }
  return colors[confidence] || 'gray'
}

/**
 * Helper function to format FDE percentage
 */
export function formatFDE(fde: number, decimals: number = 2): string {
  return `${(fde * 100).toFixed(decimals)}%`
}

/**
 * Alias for formatFDE for backward compatibility
 */
export const formatPercentage = formatFDE

/**
 * Helper function to calculate energy potential
 */
export function calculateEnergyPotential(
  production_mg: number,
  fde: number,
  bmp_m3_mg_vs: number,
  vs_content: number
): { biogas_m3: number; energy_kwh: number; energy_twh: number } {
  const biogas_m3 = production_mg * fde * bmp_m3_mg_vs * vs_content
  const energy_kwh = biogas_m3 * 9.97 // Methane energy content
  const energy_twh = energy_kwh / 1_000_000_000

  return {
    biogas_m3,
    energy_kwh,
    energy_twh,
  }
}

/**
 * Helper function to determine if residue is viable for biogas
 */
export function isViableForBiogas(fde: number, status: ValidationStatus): boolean {
  return fde > 0 && status !== 'COMPETING_USES_EXCLUDED' && status !== 'DEPRECATED'
}

/**
 * Helper function to get FDE category
 */
export function getFDECategory(fde: number): 'High' | 'Medium' | 'Low' | 'Excluded' {
  if (fde === 0) return 'Excluded'
  if (fde >= 0.15) return 'High'
  if (fde >= 0.08) return 'Medium'
  return 'Low'
}

/**
 * Helper function to sort residues by FDE
 */
export function sortByFDE(residues: ResidueWithFDE[]): ResidueWithFDE[] {
  return [...residues].sort((a, b) => b.fde_data.fde - a.fde_data.fde)
}

/**
 * Helper function to filter viable residues
 */
export function filterViableResidues(residues: ResidueWithFDE[]): ResidueWithFDE[] {
  return residues.filter((r) =>
    isViableForBiogas(r.fde_data.fde, r.fde_data.validation_status)
  )
}

/**
 * Helper function to get total energy potential
 */
export function getTotalEnergyPotential(residues: ResidueWithFDE[]): number {
  return residues.reduce((total, residue) => {
    if (!residue.energy_potential_twh) return total
    if (!isViableForBiogas(residue.fde_data.fde, residue.fde_data.validation_status)) {
      return total
    }
    return total + residue.energy_potential_twh
  }, 0)
}

/**
 * PILAR-2b V3 - Unified References Types
 * Type definitions for referencias_unificadas and FDE factor references
 * Based on Supabase database structure
 */

// ==========================================
// REFERENCE TYPES
// ==========================================

export type ReferenceValidationStatus =
  | 'VALIDATED'
  | 'PENDING'
  | 'NEEDS_REVIEW'
  | 'DEPRECATED'

export type ReferenceSource =
  | 'CP2B'
  | 'WEBAPP'
  | 'LITERATURA'
  | 'MANUAL'

/**
 * Unified Reference from referencias_unificadas table
 */
export interface UnifiedReference {
  id: number
  codigo_residuo: string | null  // FK to residuos_cp2b.codigo

  // Citation (ABNT format)
  referencia_texto: string
  doi?: string | null
  url?: string | null
  ano?: number | null

  // Classification
  tipo?: string | null  // journal, conference, thesis, report, book
  parametro_relacionado?: string | null  // bmp, fde, kinetics, etc.

  // Validation
  validation_status?: ReferenceValidationStatus
  validation_date?: string | null

  // Source tracking
  fonte?: ReferenceSource
  notas?: string | null

  // Metadata
  created_at?: string
  updated_at?: string
}

/**
 * Reference with residue details (joined data)
 */
export interface ReferenceWithResidue extends UnifiedReference {
  residuo_nome?: string
  residuo_setor?: string
  residuo_classificacao?: string
}

// ==========================================
// FDE FACTOR REFERENCE TYPES
// ==========================================

/**
 * Factor type for FDE calculation
 * FC = Fator de Competição
 * FCP = Fator de Coleta e Prazo
 * FS = Fator de Sazonalidade
 * FL = Fator de Logística
 */
export type FDEFactorType = 'FC' | 'FCP' | 'FS' | 'FL'

/**
 * Base interface for FDE factor references
 */
export interface FDEFactorReference {
  id: number
  codigo_residuo: string  // FK to residuos_cp2b.codigo
  factor_type: FDEFactorType
  factor_value: number  // The calculated factor value (0-1)

  // References
  referencia_principal?: string | null
  referencias_adicionais?: string[] | null
  doi?: string | null
  url?: string | null

  // Justification
  justificativa?: string | null
  metodologia?: string | null

  // Metadata
  updated_at?: string
  updated_by?: string | null
}

/**
 * Fator de Competição (FC)
 * Competing uses that reduce availability for biogas
 */
export interface FatorCompeticao extends FDEFactorReference {
  factor_type: 'FC'

  // Competing uses breakdown
  uso_alimentacao_animal?: number | null
  uso_compostagem?: number | null
  uso_energia_termica?: number | null
  uso_etanol_2g?: number | null
  uso_cogeneracao?: number | null
  outros_usos?: number | null

  // Total competing uses (sum of above)
  total_competicao: number  // 0-1
}

/**
 * Fator de Coleta e Prazo (FCP)
 * Collection feasibility and timing constraints
 */
export interface FatorColetaPrazo extends FDEFactorReference {
  factor_type: 'FCP'

  // Collection logistics
  distancia_media_km?: number | null
  tempo_coleta_dias?: number | null
  dispersao_geografica?: 'BAIXA' | 'MEDIA' | 'ALTA' | null

  // Infrastructure
  infraestrutura_existente?: boolean | null
  custo_coleta_estimado?: number | null  // R$/ton

  // Viability
  viabilidade_economica?: 'ALTA' | 'MEDIA' | 'BAIXA' | null
}

/**
 * Fator de Sazonalidade (FS)
 * Seasonal availability variations
 */
export interface FatorSazonalidade extends FDEFactorReference {
  factor_type: 'FS'

  // Seasonal distribution (% of annual production)
  disponibilidade_jan_mar?: number | null
  disponibilidade_abr_jun?: number | null
  disponibilidade_jul_set?: number | null
  disponibilidade_out_dez?: number | null

  // Seasonality metrics
  variacao_sazonal?: 'BAIXA' | 'MEDIA' | 'ALTA' | null
  meses_pico?: string[] | null
  meses_escassez?: string[] | null

  // Storage requirements
  necessita_armazenamento?: boolean | null
}

/**
 * Fator de Logística (FL)
 * Logistics and transportation constraints
 */
export interface FatorLogistica extends FDEFactorReference {
  factor_type: 'FL'

  // Transportation
  modal_transporte?: string | null  // truck, rail, pipeline
  distancia_maxima_viavel_km?: number | null
  custo_transporte_r_ton_km?: number | null

  // Physical characteristics affecting logistics
  densidade_kg_m3?: number | null
  umidade_media_pct?: number | null
  requer_refrigeracao?: boolean | null

  // Constraints
  restricoes_transporte?: string[] | null
  tempo_maximo_transporte_h?: number | null
}

// ==========================================
// AGGREGATED TYPES
// ==========================================

/**
 * Complete FDE breakdown with all factors and references
 */
export interface FDEBreakdownWithReferences {
  codigo_residuo: string
  residuo_nome: string

  // FDE calculation
  fde_final: number  // 0-100%
  fde_classificacao: string  // EXCEPCIONAL, EXCELENTE, etc.

  // Individual factors
  fator_competicao: FatorCompeticao
  fator_coleta_prazo: FatorColetaPrazo
  fator_sazonalidade: FatorSazonalidade
  fator_logistica: FatorLogistica

  // Calculation
  fde_formula: string  // e.g., "FDE = (1 - FC) × FCP × FS × FL"

  // General references
  referencias_gerais: UnifiedReference[]
}

/**
 * Reference statistics for a residue
 */
export interface ReferenceStatistics {
  codigo_residuo: string
  total_referencias: number
  referencias_validadas: number
  referencias_com_doi: number
  anos_cobertura: number[]
  parametros_cobertos: string[]
  fontes_utilizadas: ReferenceSource[]
}

// ==========================================
// API RESPONSE TYPES
// ==========================================

export interface ReferencesResponse {
  references: UnifiedReference[]
  total: number
  statistics?: ReferenceStatistics
}

export interface FDEFactorsResponse {
  fator_competicao?: FatorCompeticao
  fator_coleta_prazo?: FatorColetaPrazo
  fator_sazonalidade?: FatorSazonalidade
  fator_logistica?: FatorLogistica
}

export interface ReferenceSearchFilters {
  codigo_residuo?: string
  parametro?: string
  validation_status?: ReferenceValidationStatus
  fonte?: ReferenceSource
  ano_min?: number
  ano_max?: number
  tem_doi?: boolean
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Get validation status badge color
 */
export function getValidationStatusColor(status: ReferenceValidationStatus): string {
  const colors: Record<ReferenceValidationStatus, string> = {
    VALIDATED: '#22C55E',      // green
    PENDING: '#F59E0B',        // amber
    NEEDS_REVIEW: '#EF4444',   // red
    DEPRECATED: '#9CA3AF'      // gray
  }
  return colors[status]
}

/**
 * Get validation status label (Portuguese)
 */
export function getValidationStatusLabel(status: ReferenceValidationStatus): string {
  const labels: Record<ReferenceValidationStatus, string> = {
    VALIDATED: 'Validada',
    PENDING: 'Pendente',
    NEEDS_REVIEW: 'Requer Revisão',
    DEPRECATED: 'Descontinuada'
  }
  return labels[status]
}

/**
 * Get factor type label (Portuguese)
 */
export function getFactorTypeLabel(factorType: FDEFactorType): string {
  const labels: Record<FDEFactorType, string> = {
    FC: 'Fator de Competição',
    FCP: 'Fator de Coleta e Prazo',
    FS: 'Fator de Sazonalidade',
    FL: 'Fator de Logística'
  }
  return labels[factorType]
}

/**
 * Get factor type description
 */
export function getFactorTypeDescription(factorType: FDEFactorType): string {
  const descriptions: Record<FDEFactorType, string> = {
    FC: 'Usos alternativos que reduzem disponibilidade para biogás',
    FCP: 'Viabilidade de coleta e restrições de tempo',
    FS: 'Variações sazonais na disponibilidade',
    FL: 'Restrições de transporte e logística'
  }
  return descriptions[factorType]
}

/**
 * Calculate FDE from factors
 */
export function calculateFDE(
  fc: number,
  fcp: number,
  fs: number,
  fl: number
): number {
  // FDE = (1 - FC) × FCP × FS × FL
  return (1 - fc) * fcp * fs * fl
}

/**
 * Get FDE classification from value
 */
export function getFDEClassification(fde: number): string {
  if (fde >= 0.50) return 'EXCEPCIONAL'
  if (fde >= 0.30) return 'EXCELENTE'
  if (fde >= 0.15) return 'BOM'
  if (fde >= 0.08) return 'MODERADO'
  if (fde >= 0.03) return 'BAIXO'
  return 'INVIÁVEL'
}

/**
 * Format reference citation (ABNT)
 */
export function formatABNTCitation(ref: UnifiedReference): string {
  return ref.referencia_texto
}

/**
 * Extract year from ABNT citation
 */
export function extractYearFromCitation(citation: string): number | null {
  const yearMatch = citation.match(/\((\d{4})\)/)
  return yearMatch ? parseInt(yearMatch[1]) : null
}

/**
 * PILAR-2b V3 - Residuos API Service
 * API calls for residues with chemical parameters and scientific references
 * Source: Panorama_CP2B validated data with 189 scientific references
 */

import { logger } from '@/lib/logger'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

// ==========================================
// TYPE DEFINITIONS
// ==========================================

export type SectorCode = 'AG_AGRICULTURA' | 'PC_PECUARIA' | 'UR_URBANO' | 'IN_INDUSTRIAL'

export interface Sector {
  codigo: SectorCode
  nome: string
  nome_en: string | null
  emoji: string
  ordem: number
  descricao: string | null
  num_residuos: number
  avg_bmp: number | null
  avg_ts: number | null
  avg_vs: number | null
  avg_cn_ratio: number | null
  avg_ch4_content: number | null
}

export interface Subsector {
  codigo: string
  nome: string
  nome_en: string | null
  sector_codigo: SectorCode
  emoji: string | null
  ordem: number
  sector_nome: string
  num_residuos: number
}

export interface Residuo {
  id: number
  codigo: string
  nome: string
  nome_en: string | null
  sector_codigo: SectorCode
  subsector_codigo: string | null
  categoria_codigo: string | null
  categoria_nome: string | null

  // BMP (Biochemical Methane Potential)
  bmp_min: number | null
  bmp_medio: number
  bmp_max: number | null
  bmp_unidade: string

  // Total Solids
  ts_min: number | null
  ts_medio: number | null
  ts_max: number | null

  // Volatile Solids
  vs_min: number | null
  vs_medio: number | null
  vs_max: number | null

  // Chemical composition
  chemical_cn_ratio: number | null
  chemical_ch4_content: number | null

  // Availability factors
  fc_medio: number | null
  fcp_medio: number | null
  fs_medio: number | null
  fl_medio: number | null

  // Scenario factors
  fator_pessimista: number | null
  fator_realista: number | null
  fator_otimista: number | null

  // Metadata
  generation: string | null
  destination: string | null
  icon: string | null

  // Joined data
  sector_nome: string
  sector_emoji: string
  subsector_nome: string | null
  reference_count: number
}

export interface ResiduoDetail extends Residuo {
  references: ResiduoReference[]
  references_by_type: Record<string, ResiduoReference[]>
  total_references: number
}

export interface ResiduoReference {
  id: number
  parameter_type: 'bmp' | 'ts' | 'vs' | 'cn_ratio' | 'ch4_content' | 'general'
  citation: string
  authors: string | null
  title: string | null
  journal: string | null
  year: number | null
  volume: string | null
  pages: string | null
  doi: string | null
  url: string | null
  reported_value: number | null
  reported_unit: string | null
  is_primary: boolean
  validation_status: string
}

export interface ConversionFactor {
  id: number
  category: string
  subcategory: string
  factor_value: number
  unit: string
  literature_reference: string | null
  reference_url: string | null
  real_data_validation: string | null
  safety_margin_percent: number | null
  final_factor: number | null
  notes: string | null
}

export interface SectorSummary {
  codigo: SectorCode
  nome: string
  emoji: string
  ordem: number
  num_residuos: number
  avg_bmp: number | null
  min_bmp: number | null
  max_bmp: number | null
  avg_ts: number | null
  avg_vs: number | null
  avg_cn_ratio: number | null
  avg_ch4_content: number | null
  total_references: number
}

// ==========================================
// API RESPONSE TYPES
// ==========================================

interface ApiResponse<T> {
  success: boolean
  count?: number
  total?: number
  [key: string]: T | boolean | number | undefined
}

// ==========================================
// API FUNCTIONS
// ==========================================

/**
 * Get all biogas sectors with statistics
 */
export async function getSectors(): Promise<Sector[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/residuos/sectors`)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data.sectors || []
  } catch (error) {
    logger.error('Error fetching sectors:', error)
    throw error
  }
}

/**
 * Get subsectors, optionally filtered by sector
 */
export async function getSubsectors(sectorCodigo?: SectorCode): Promise<Subsector[]> {
  try {
    const url = sectorCodigo
      ? `${API_BASE_URL}/api/v1/residuos/subsectors?sector_codigo=${sectorCodigo}`
      : `${API_BASE_URL}/api/v1/residuos/subsectors`

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data.subsectors || []
  } catch (error) {
    logger.error('Error fetching subsectors:', error)
    throw error
  }
}

/**
 * Get residuos with optional filters
 */
export async function getResiduos(options?: {
  sector_codigo?: SectorCode
  subsector_codigo?: string
  search?: string
  limit?: number
  offset?: number
}): Promise<{ residuos: Residuo[], total: number }> {
  try {
    const params = new URLSearchParams()

    if (options?.sector_codigo) {
      params.append('sector_codigo', options.sector_codigo)
    }
    if (options?.subsector_codigo) {
      params.append('subsector_codigo', options.subsector_codigo)
    }
    if (options?.search) {
      params.append('search', options.search)
    }
    if (options?.limit) {
      params.append('limit', options.limit.toString())
    }
    if (options?.offset) {
      params.append('offset', options.offset.toString())
    }

    const url = `${API_BASE_URL}/api/v1/residuos/?${params.toString()}`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return {
      residuos: data.residuos || [],
      total: data.total || 0
    }
  } catch (error) {
    logger.error('Error fetching residuos:', error)
    throw error
  }
}

/**
 * Get a specific residue with all details and references
 */
export async function getResiduo(residuoId: number): Promise<ResiduoDetail> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/residuos/${residuoId}`)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data.residuo
  } catch (error) {
    logger.error('Error fetching residuo:', error)
    throw error
  }
}

/**
 * Get scientific references for a specific residue
 */
export async function getResiduoReferences(
  residuoId: number,
  parameterType?: string
): Promise<{ residuo_name: string, references: ResiduoReference[] }> {
  try {
    const url = parameterType
      ? `${API_BASE_URL}/api/v1/residuos/${residuoId}/references?parameter_type=${parameterType}`
      : `${API_BASE_URL}/api/v1/residuos/${residuoId}/references`

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return {
      residuo_name: data.residuo_name,
      references: data.references || []
    }
  } catch (error) {
    logger.error('Error fetching residuo references:', error)
    throw error
  }
}

/**
 * Get conversion factors with literature backing
 */
export async function getConversionFactors(category?: string): Promise<ConversionFactor[]> {
  try {
    const url = category
      ? `${API_BASE_URL}/api/v1/residuos/conversion-factors/?category=${encodeURIComponent(category)}`
      : `${API_BASE_URL}/api/v1/residuos/conversion-factors/`

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data.factors || []
  } catch (error) {
    logger.error('Error fetching conversion factors:', error)
    throw error
  }
}

/**
 * Get summary statistics by sector
 */
export async function getSectorSummary(): Promise<SectorSummary[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/residuos/summary/by-sector`)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data.summary || []
  } catch (error) {
    logger.error('Error fetching sector summary:', error)
    throw error
  }
}

/**
 * Compare multiple residues
 */
export async function compareResiduos(ids: number[]): Promise<Residuo[]> {
  try {
    const idsParam = ids.join(',')
    const response = await fetch(`${API_BASE_URL}/api/v1/residuos/compare?ids=${idsParam}`)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data.comparison || []
  } catch (error) {
    logger.error('Error comparing residuos:', error)
    throw error
  }
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Map sector code to display name
 */
export function getSectorDisplayName(codigo: SectorCode): string {
  const names: Record<SectorCode, string> = {
    'AG_AGRICULTURA': 'Agricultura',
    'PC_PECUARIA': 'Pecuária',
    'UR_URBANO': 'Urbano',
    'IN_INDUSTRIAL': 'Industrial'
  }
  return names[codigo] || codigo
}

/**
 * Map sector code to English name
 */
export function getSectorEnglishName(codigo: SectorCode): string {
  const names: Record<SectorCode, string> = {
    'AG_AGRICULTURA': 'Agriculture',
    'PC_PECUARIA': 'Livestock',
    'UR_URBANO': 'Urban',
    'IN_INDUSTRIAL': 'Industrial'
  }
  return names[codigo] || codigo
}

/**
 * Get sector emoji
 */
export function getSectorEmoji(codigo: SectorCode): string {
  const emojis: Record<SectorCode, string> = {
    'AG_AGRICULTURA': '🌱',
    'PC_PECUARIA': '🐄',
    'UR_URBANO': '🏙️',
    'IN_INDUSTRIAL': '🏭'
  }
  return emojis[codigo] || '📊'
}

/**
 * Format parameter type for display
 */
export function formatParameterType(type: string): string {
  const labels: Record<string, string> = {
    'bmp': 'BMP (Potencial Bioquímico de Metano)',
    'ts': 'TS (Sólidos Totais)',
    'vs': 'VS (Sólidos Voláteis)',
    'cn_ratio': 'Relação C:N',
    'ch4_content': 'Teor de CH₄',
    'general': 'Geral'
  }
  return labels[type] || type
}

/**
 * Get C:N ratio status (optimal range is 20-30)
 */
export function getCNRatioStatus(ratio: number | null): {
  status: 'optimal' | 'low' | 'high' | 'unknown'
  label: string
  color: string
} {
  if (ratio === null) {
    return { status: 'unknown', label: 'N/A', color: 'gray' }
  }

  if (ratio >= 20 && ratio <= 30) {
    return { status: 'optimal', label: 'Ótimo', color: 'green' }
  } else if (ratio < 20) {
    return { status: 'low', label: 'Baixo (rico em N)', color: 'yellow' }
  } else {
    return { status: 'high', label: 'Alto (rico em C)', color: 'orange' }
  }
}

/**
 * Calculate FDE (Fator de Disponibilidade Efetiva) from availability factors
 */
export function calculateFDE(residuo: Residuo): number | null {
  const { fc_medio, fcp_medio, fs_medio, fl_medio } = residuo

  if (fc_medio === null || fcp_medio === null || fs_medio === null || fl_medio === null) {
    return null
  }

  return fc_medio * fcp_medio * fs_medio * fl_medio * 100
}

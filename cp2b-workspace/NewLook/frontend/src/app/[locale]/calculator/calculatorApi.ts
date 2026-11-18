/**
 * CP2B Calculator API — fire-and-forget lead submission
 */

import type { ActivityType, OutputType, LivestockSpecies, CalculationResult } from './calculatorEngine'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''

export interface LeadData {
  nome: string
  email: string
  municipality_id?: number
  municipality_name?: string
  consent_lgpd: boolean
}

export interface SubmitPayload {
  lead: LeadData
  activity_type: ActivityType
  quantity_input: {
    type: 'tons' | 'hectares' | 'heads'
    value: number
    species_breakdown?: Partial<Record<LivestockSpecies, number>>
  }
  active_months: number[]
  outputs_selected: OutputType[]
  calc_results: CalculationResult
}

export async function submitLead(payload: SubmitPayload): Promise<{ lead_id: string } | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/calculator/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export interface MunicipalityOption {
  id: number
  municipality_name: string
  ibge_code: string
}

export async function fetchSpMunicipalities(): Promise<MunicipalityOption[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/municipalities/names?limit=1000`)
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : (data.data ?? [])
  } catch {
    return []
  }
}

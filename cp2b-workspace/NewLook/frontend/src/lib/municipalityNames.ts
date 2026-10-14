/**
 * The municipality names the browser's search reads: every municipality the
 * public platform covers (São Paulo and the Minas Gerais pilot, lib/mapScope),
 * from the light /municipalities/names list (no geometry).
 *
 * The API lists all 5,571 in alphabetical order, so a capped read (1000) used to
 * stop part-way through the alphabet and the search never found "Sorocaba".
 */
import { isPublicMapMunicipality } from '@/lib/mapScope'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''
const ALL = 6000

export interface MunicipalityName {
  municipality_name: string
  ibge_code: string
}

export async function fetchMunicipalityNames(): Promise<MunicipalityName[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/municipalities/names?limit=${ALL}`)
    if (!res.ok) return []
    const body = await res.json()
    const rows: unknown = Array.isArray(body) ? body : body?.data
    if (!Array.isArray(rows)) return []
    return rows
      .filter(
        (r): r is { municipality_name: string; ibge_code: string | number } =>
          typeof r?.municipality_name === 'string' && isPublicMapMunicipality(r?.ibge_code),
      )
      .map((r) => ({ municipality_name: r.municipality_name, ibge_code: String(r.ibge_code) }))
  } catch {
    return []
  }
}

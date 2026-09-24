/**
 * Scientific database API: residues with their chemical parameters, the
 * literature behind them, and degradation kinetics.
 *
 * Everything is read from the backend. Nothing falls back to data bundled with
 * the frontend: such a snapshot drifts from the database (the last one had
 * different residue names, and sample entries with made-up DOIs) and would be
 * shown as if it were current. A failed request rejects, so the page can say
 * the data could not be loaded and offer to retry.
 */

import { authenticatedFetch } from '@/lib/apiClient'
import {
  SECTOR_CODES,
  type KineticData,
  type LiteratureReference,
  type ResidueRecord,
  type SectorCode,
  type SectorSummary,
} from '@/types/scientific'

const API_BASE_URL = `${process.env.NEXT_PUBLIC_API_URL || ''}/api/v1`

/** A reference as GET /residuos/references/all returns it. */
interface ApiReference {
  id: number
  authors?: string | null
  title?: string | null
  citation?: string | null
  journal?: string | null
  year?: number | null
  doi?: string | null
  url?: string | null
  is_primary?: boolean
  sector_codigo?: string | null
  residuo_nome?: string | null
  residuo_nome_en?: string | null
}

async function getJson<T>(path: string): Promise<T> {
  const response = await authenticatedFetch(`${API_BASE_URL}${path}`)
  if (!response.ok) throw new Error(`GET ${path} failed: HTTP ${response.status}`)
  return (await response.json()) as T
}

/** The first record per key: the residue tables have held duplicate rows before. */
function uniqueBy<T, K>(items: T[], key: (item: T) => K): T[] {
  const seen = new Set<K>()
  return items.filter((item) => {
    const k = key(item)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

function asSectorCode(value: string | null | undefined): SectorCode | null {
  return SECTOR_CODES.find((code) => code === value) ?? null
}

/** Every residue with its chemical characterization, in the database's sector order. */
export async function getResidues(): Promise<ResidueRecord[]> {
  const body = await getJson<{ residuos?: ResidueRecord[] }>('/residuos/?limit=500')
  return uniqueBy(body.residuos ?? [], (residue) => residue.id)
}

/** Residue and reference counts per sector. */
export async function getSectorSummary(): Promise<SectorSummary[]> {
  const body = await getJson<{ summary?: SectorSummary[] }>('/residuos/summary/by-sector')
  return uniqueBy(body.summary ?? [], (sector) => sector.codigo)
}

/** Three-fraction kinetic parameters of the residues that have them. */
export async function getKinetics(): Promise<KineticData[]> {
  const body = await getJson<{ data?: KineticData[] }>('/scientific/kinetics')
  return body.data ?? []
}

export function toLiteratureReference(ref: ApiReference): LiteratureReference {
  return {
    id: ref.id,
    authors: ref.authors || null,
    title: ref.title || ref.citation || '',
    journal: ref.journal || null,
    year: ref.year || null,
    doi: ref.doi || null,
    url: ref.url || null,
    validated: Boolean(ref.is_primary),
    sector: asSectorCode(ref.sector_codigo),
    residue: ref.residuo_nome ? { nome: ref.residuo_nome, nome_en: ref.residuo_nome_en } : null,
  }
}

/** The whole knowledge base, newest first. */
export async function getReferences(): Promise<LiteratureReference[]> {
  const body = await getJson<{ references?: ApiReference[] }>('/residuos/references/all?limit=5000')
  return (body.references ?? []).map(toLiteratureReference)
}

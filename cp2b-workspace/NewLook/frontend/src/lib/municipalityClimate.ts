/**
 * The municipality page's climate card, from /ghg/municipalities/{ibge}: the
 * avoided emissions if its N4 methane became vehicle biomethane, each substrate
 * with its typical destination today (ghg.yaml `substratos_linha_de_base`).
 *
 * A potential, never a credit (docs/data/ESPEC_MODULO_GEE.md §4). The backend
 * computes every figure; here the 17 substrates are only summed into the
 * eleven residues the page already names.
 */
import { serverGetJson } from '@/lib/serverApi'
import { servedNumber } from '@/lib/municipalityProfile'

export interface MunicipalityClimate {
  /** tCO₂e per year. */
  methaneT: number
  fossilT: number
  projectT: number
  netT: number
  gwpVersion: string | null
  /** Some factor behind the figure is still marked `conferir` in ghg.yaml. */
  unverified: boolean
  /** Net reduction by residue (map vocabulary), largest first; zeros dropped. */
  residues: { key: string; netT: number }[]
}

interface ServedSubstrate {
  residue?: unknown
  er_net_t?: unknown
}

export function climateFrom(body: Record<string, unknown> | null): MunicipalityClimate | null {
  const totals = body?.totals as Record<string, unknown> | undefined
  const net = servedNumber(totals?.er_net_t)
  if (!body || !totals || net === null) return null
  const byResidue = new Map<string, number>()
  for (const s of (body.substrates as ServedSubstrate[] | undefined) ?? []) {
    const value = servedNumber(s.er_net_t)
    if (typeof s.residue !== 'string' || value === null) continue
    byResidue.set(s.residue, (byResidue.get(s.residue) ?? 0) + value)
  }
  return {
    methaneT: servedNumber(totals.be_methane_t) ?? 0,
    fossilT: servedNumber(totals.be_fossil_t) ?? 0,
    projectT: servedNumber(totals.pe_total_t) ?? 0,
    netT: net,
    gwpVersion: typeof body.gwp_version === 'string' ? body.gwp_version : null,
    unverified: Array.isArray(body.unverified) && body.unverified.length > 0,
    residues: [...byResidue]
      .filter(([, v]) => v !== 0)
      .sort((a, b) => b[1] - a[1])
      .map(([key, netT]) => ({ key, netT })),
  }
}

export async function loadMunicipalityClimate(ibge: string): Promise<MunicipalityClimate | null> {
  return climateFrom(await serverGetJson<Record<string, unknown>>(`/ghg/municipalities/${ibge}?level=n4`))
}

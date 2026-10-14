/**
 * One municipality's page, read on the server from three API answers:
 *
 *  - /municipalities/{ibge}/metrics: name, regions, population, and the CP2b
 *    totals by sector and residue (Cenário Real = N4, Ideal = N3);
 *  - /municipalities/{ibge}/context: rank in the state on N4, the bordering
 *    municipalities, the centroid;
 *  - /cp2b/municipalities/{ibge}: the method's min–max envelope of the totals.
 *    Only the totals are read from it.
 *
 * Absent is not zero: a figure the API did not serve is `null`, and the page
 * says "sem dado CP2b"; a served 0 is a modelled result and stays 0.
 */
import { serverGetJson } from '@/lib/serverApi'
import { SERVED_SCENARIO_FIELD, SERVED_SCENARIO_RESIDUE_FIELD } from '@/data/scenarioFactors'

export const PROFILE_SECTORS = ['agricultural', 'livestock', 'urban'] as const
export type ProfileSector = (typeof PROFILE_SECTORS)[number]

/**
 * The eleven CP2b residues by sector, as the backend names them in the
 * ch4_cp2b_{n3,n4}_{residue}_m3_year columns. Every one of the method's 17
 * substrates falls under one of these, so they add up to the total.
 */
export const PROFILE_RESIDUES: Record<ProfileSector, readonly string[]> = {
  agricultural: ['sugarcane', 'soybean', 'corn', 'coffee', 'citrus'],
  livestock: ['cattle', 'swine', 'poultry'],
  urban: ['rsu', 'rpo', 'sewage'],
}

export interface Range {
  min: number
  max: number
}

export interface Neighbour {
  ibge: string
  name: string
  n4: number | null
}

export interface MunicipalityProfile {
  ibge: string
  name: string
  immediateRegion: string | null
  intermediateRegion: string | null
  population: number | null
  populationYear: number | null
  methodVersion: string | null
  /** CP2b N4 (Cenário Real) and N3 (Ideal), Nm³ CH₄ per year. */
  n4: number | null
  n3: number | null
  sectors: Record<ProfileSector, number | null>
  residues: { key: string; sector: ProfileSector; n4: number | null }[]
  envelope: { n3: Range | null; n4: Range | null } | null
  /**
   * The method's levels before N3: theoretical (N1) and available (N2), central
   * value and range. Pages show them only while METHOD_PAGES_ENABLED is on: with
   * N3 beside them they let a reader back out the availability factors that are
   * held until the paper is submitted.
   */
  upstream: { n1: Level | null; n2: Level | null } | null
  rank: { position: number; of: number } | null
  neighbours: Neighbour[] | null
  centroid: { lat: number; lng: number } | null
}

export interface Level {
  value: number
  range: Range | null
}

type Body = Record<string, unknown>

/** A served number, or null when the field is absent, empty or not a number. */
export function servedNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null

function envelopeFrom(body: Body | null): MunicipalityProfile['envelope'] {
  const totals = body?.totals as Record<string, Record<string, { m3_year?: unknown }>> | undefined
  if (!totals) return null
  const range = (level: 'n3' | 'n4'): Range | null => {
    const min = servedNumber(totals.min?.[level]?.m3_year)
    const max = servedNumber(totals.max?.[level]?.m3_year)
    return min === null || max === null ? null : { min, max }
  }
  const out = { n3: range('n3'), n4: range('n4') }
  return out.n3 || out.n4 ? out : null
}

function upstreamFrom(body: Body | null): MunicipalityProfile['upstream'] {
  const totals = body?.totals as Record<string, Record<string, { m3_year?: unknown }>> | undefined
  if (!totals) return null
  const level = (key: 'n1' | 'n2'): Level | null => {
    const value = servedNumber(totals.med?.[key]?.m3_year)
    if (value === null) return null
    const min = servedNumber(totals.min?.[key]?.m3_year)
    const max = servedNumber(totals.max?.[key]?.m3_year)
    return { value, range: min === null || max === null ? null : { min, max } }
  }
  const out = { n1: level('n1'), n2: level('n2') }
  return out.n1 || out.n2 ? out : null
}

function contextFrom(body: Body | null) {
  const rank = body?.rank_in_state as { position?: unknown; of?: unknown } | null | undefined
  const position = servedNumber(rank?.position)
  const of = servedNumber(rank?.of)
  const centroid = body?.centroid as { lat?: unknown; lng?: unknown } | null | undefined
  const lat = servedNumber(centroid?.lat)
  const lng = servedNumber(centroid?.lng)
  const neighbours = Array.isArray(body?.neighbours)
    ? (body.neighbours as Body[])
        .filter((n) => typeof n.name === 'string' && /^\d{7}$/.test(String(n.ibge_code)))
        .map((n) => ({ ibge: String(n.ibge_code), name: n.name as string, n4: servedNumber(n.ch4_cp2b_n4_m3_year) }))
    : null
  return {
    rank: position !== null && of !== null && of > 0 ? { position, of } : null,
    centroid: lat !== null && lng !== null ? { lat, lng } : null,
    neighbours: body ? neighbours : null,
  }
}

/** Pure: the three API bodies → the page's figures. `null` when metrics is missing. */
export function profileFrom(
  ibge: string,
  metrics: Body | null,
  context: Body | null,
  cp2b: Body | null,
  fallbackName?: string,
): MunicipalityProfile | null {
  if (!metrics) return null
  const n4 = servedNumber(metrics[SERVED_SCENARIO_FIELD.real])
  const n3 = servedNumber(metrics[SERVED_SCENARIO_FIELD.ideal])
  // Shares are read only when the total is served; then an absent share is 0.
  const share = (residue: string) =>
    n4 === null ? null : (servedNumber(metrics[SERVED_SCENARIO_RESIDUE_FIELD('real', residue)]) ?? 0)
  const sector = (s: ProfileSector) =>
    n4 === null ? null : (servedNumber(metrics[`ch4_cp2b_n4_${s}_m3_year`]) ?? 0)

  return {
    ibge,
    name: text(metrics.name) ?? fallbackName ?? ibge,
    immediateRegion: text(metrics.immediate_region),
    intermediateRegion: text(metrics.intermediate_region),
    population: servedNumber(metrics.population),
    populationYear: servedNumber(metrics.population_year),
    methodVersion: text(metrics.cp2b_method_version),
    n4,
    n3,
    sectors: { agricultural: sector('agricultural'), livestock: sector('livestock'), urban: sector('urban') },
    residues: PROFILE_SECTORS.flatMap((s) => PROFILE_RESIDUES[s].map((key) => ({ key, sector: s, n4: share(key) }))),
    envelope: n4 === null ? null : envelopeFrom(cp2b),
    upstream: n4 === null ? null : upstreamFrom(cp2b),
    ...contextFrom(context),
  }
}

export async function loadMunicipalityProfile(ibge: string, fallbackName?: string) {
  const [metrics, context, cp2b] = await Promise.all([
    serverGetJson<Body>(`/municipalities/${ibge}/metrics`),
    serverGetJson<Body>(`/municipalities/${ibge}/context`),
    serverGetJson<Body>(`/cp2b/municipalities/${ibge}`),
  ])
  return profileFrom(ibge, metrics, context, cp2b, fallbackName)
}

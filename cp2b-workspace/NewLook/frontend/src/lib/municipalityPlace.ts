/**
 * Where a municipality is, for a reader who searched its name ("Taciba onde
 * fica"): the town its region looks to and how far away it is, its main
 * residue in plain words, and the catalog pages for that residue.
 *
 * Nothing here is typed in: the regions and centroids come from the API
 * (IBGE 2017 regions, municipality centroids). IBGE names each immediate and
 * intermediate region after its seat, so the seat is found by name in the
 * same state; a region named otherwise finds no seat and no distance is said.
 */
import { ufOf } from '@/data/brazilStates'
import { DETAILED_RESIDUES, type DetailedResidue } from '@/data/residueFactors'
import { municipalityDirectory, type DirectoryEntry } from '@/lib/municipalityDirectory'
import type { MunicipalityProfile } from '@/lib/municipalityProfile'
import { serverGetJson } from '@/lib/serverApi'

export interface RegionSeat {
  name: string
  ibge: string
  /** Straight line between the two centroids, whole kilometres. */
  km: number
}

type Located = Pick<MunicipalityProfile, 'name' | 'immediateRegion' | 'intermediateRegion'>

/**
 * The seat a municipality looks to: its immediate region's, or, for that seat
 * itself, its intermediate region's. Null for the seat of both (Campinas).
 */
export function seatName(p: Located): string | null {
  if (p.immediateRegion && p.immediateRegion !== p.name) return p.immediateRegion
  if (p.intermediateRegion && p.intermediateRegion !== p.name) return p.intermediateRegion
  return null
}

/** Great-circle distance in kilometres (haversine, mean Earth radius). */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (d: number) => (d * Math.PI) / 180
  const h =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}

/** The seat's directory entry: same name, same state. */
export function findSeat(
  p: Located & Pick<MunicipalityProfile, 'ibge'>,
  directory: DirectoryEntry[],
): DirectoryEntry | null {
  const name = seatName(p)
  if (!name) return null
  return directory.find((e) => e.name === name && ufOf(e.ibge) === ufOf(p.ibge)) ?? null
}

/** The seat and its distance, or null when any piece is missing. Never a guess. */
export async function loadRegionSeat(p: MunicipalityProfile): Promise<RegionSeat | null> {
  if (!p.centroid) return null
  const directory = await municipalityDirectory()
  const seat = directory ? findSeat(p, directory) : null
  if (!seat) return null
  const context = await serverGetJson<{ centroid?: { lat?: unknown; lng?: unknown } | null }>(
    `/municipalities/${seat.ibge}/context`,
  )
  const lat = Number(context?.centroid?.lat)
  const lng = Number(context?.centroid?.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || context?.centroid?.lat == null) return null
  return { name: seat.name, ibge: seat.ibge, km: Math.round(distanceKm(p.centroid, { lat, lng })) }
}

/** The residue with the most accessible methane, and its share of the total. */
export function mainResidue(p: Pick<MunicipalityProfile, 'n4' | 'residues'>): { key: string; share: number } | null {
  if (!p.n4) return null
  const top = [...p.residues].sort((a, b) => (b.n4 ?? 0) - (a.n4 ?? 0))[0]
  return top?.n4 ? { key: top.key, share: top.n4 / p.n4 } : null
}

/**
 * The data catalog's residues behind each profile residue (the profile adds up
 * a crop's streams: sugarcane is bagasse, straw, filter cake and vinasse).
 * Urban pruning has no catalog page.
 */
const CATALOG_PREFIX: Record<string, string[]> = {
  sugarcane: ['AG_CANA_'],
  soybean: ['AG_SOJA_'],
  corn: ['AG_MILHO_'],
  coffee: ['AG_CAFE_'],
  citrus: ['AG_CITROS_'],
  cattle: ['PEC_ESTERCO_BOVINO'],
  swine: ['PEC_DEJETOS_LIQUIDOS_SUINO'],
  poultry: ['PEC_CAMA_AVIARIO'],
  rsu: ['URB_FORSU_'],
  sewage: ['URB_LODO_'],
  rpo: [],
}

export function catalogResidues(profileKey: string): DetailedResidue[] {
  const prefixes = CATALOG_PREFIX[profileKey] ?? []
  return DETAILED_RESIDUES.filter((r) => prefixes.some((prefix) => r.code.startsWith(prefix)))
}

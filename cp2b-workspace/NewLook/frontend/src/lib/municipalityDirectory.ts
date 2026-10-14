/**
 * The name, IBGE code and readable slug of every municipality the public
 * platform covers (São Paulo and the Minas Gerais pilot, lib/mapScope), read
 * once from the API (/municipalities/names) on the server and kept for an hour.
 * The API lists all 5,571; the other states have no page, as on the map.
 *
 * The proxy (old /municipality/3509502 links → 301), the profile page (slug →
 * code) and the sitemap all resolve through this one list. When the API cannot
 * be reached it is `null`: callers fall back to the IBGE code, never to a guess.
 */
import { serverGetJson } from '@/lib/serverApi'
import { isPublicMapMunicipality } from '@/lib/mapScope'
import { municipalitySlug } from '@/lib/municipalitySlug'

export interface DirectoryEntry {
  name: string
  ibge: string
  slug: string
}

// Brazil has 5,571 municipalities; the API's cap for a whole-list read.
const ALL = 6000
// What an API from before that cap allows (it refuses ALL with a 422).
const OLD_CAP = 1000
const TTL_MS = 60 * 60 * 1000
// A failed read is tried again after a minute, not on every request.
const RETRY_MS = 60 * 1000

interface NameRow {
  municipality_name?: unknown
  ibge_code?: unknown
}

let cache: { at: number; ttl: number; entries: DirectoryEntry[] | null } | null = null

function rowsOf(body: unknown): unknown[] | null {
  const rows = Array.isArray(body) ? body : (body as { data?: unknown } | null)?.data
  return Array.isArray(rows) ? rows : null
}

/** Shapes the API body: public-scope rows with a name and a 7-digit code, A to Z. */
export function directoryFrom(body: unknown): DirectoryEntry[] | null {
  const rows = rowsOf(body)
  if (!rows) return null
  return (rows as NameRow[])
    .filter(
      (r): r is { municipality_name: string; ibge_code: string | number } =>
        typeof r.municipality_name === 'string' &&
        /^\d{7}$/.test(String(r.ibge_code)) &&
        isPublicMapMunicipality(String(r.ibge_code)),
    )
    .map((r) => ({
      name: r.municipality_name,
      ibge: String(r.ibge_code),
      slug: municipalitySlug(r.municipality_name, r.ibge_code),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}

export async function municipalityDirectory(): Promise<DirectoryEntry[] | null> {
  const now = Date.now()
  if (cache && now - cache.at < cache.ttl) return cache.entries
  const entries = directoryFrom(await readWholeList())
  cache = { at: now, ttl: entries ? TTL_MS : RETRY_MS, entries }
  return entries
}

/**
 * The whole list, or null. An API deployed before the cap was raised answers
 * ALL with a 422; it is then asked for OLD_CAP names, A to Z across Brazil, and
 * the answer is used only when it comes back short of the cap, which proves it
 * is the whole list (a database with São Paulo alone). A full page may have
 * been cut, and a cut list would answer 404 for real municipalities.
 */
async function readWholeList(): Promise<unknown> {
  const body = await serverGetJson(`/municipalities/names?limit=${ALL}`)
  if (body) return body
  const page = await serverGetJson(`/municipalities/names?limit=${OLD_CAP}`)
  const rows = rowsOf(page)
  return rows && rows.length < OLD_CAP ? page : null
}

/**
 * The municipality a slug or IBGE code names: an entry, `null` when the list has
 * no such municipality, or `undefined` when the list is unavailable.
 */
export async function findMunicipality(slugOrCode: string): Promise<DirectoryEntry | null | undefined> {
  const entries = await municipalityDirectory()
  if (!entries) return undefined
  const key = slugOrCode.toLowerCase()
  return entries.find((e) => e.slug === key || e.ibge === key) ?? null
}

/** For tests: forget the cached list. */
export function resetMunicipalityDirectory() {
  cache = null
}

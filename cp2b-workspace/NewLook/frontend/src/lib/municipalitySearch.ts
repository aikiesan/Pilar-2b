/**
 * The one way the site finds a municipality: by its name or its IBGE code,
 * nothing else. Every search box (header, landing, 404, comparison, map) reads
 * this, so "sao paulo", "São Paulo", "SAO-PAULO" and "3550308" behave the same
 * everywhere.
 *
 * Names ignore case, accents, hyphens and apostrophes ("santa barbara doeste"
 * finds "Santa Bárbara d'Oeste"), and may end in the state ("Campinas SP",
 * "Itajubá/MG"). Digits look up the IBGE code from its start. Results come back
 * best first: the exact name, then names that start with the query, then names
 * with a word that does, then the rest, each A to Z.
 */
import { MG_UF_CODE, SP_UF_CODE } from '@/lib/mapScope'

/** The states the public platform covers, by abbreviation. */
const UF_CODES: Record<string, string> = { sp: SP_UF_CODE, mg: MG_UF_CODE }
const UF_ABBREVIATIONS: Record<string, string> = { [SP_UF_CODE]: 'SP', [MG_UF_CODE]: 'MG' }

/** Lower case, no accents, words split on anything that is not a letter or digit. */
const words = (text: string): string[] =>
  text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/['’`´]/g, '')
    .split(/[^a-z0-9]+/)
    .filter(Boolean)

export type MunicipalityQuery =
  | { kind: 'code'; code: string }
  | { kind: 'name'; name: string; uf?: string }

/** What the visitor typed, read as a code or a name; null when there is nothing to look for. */
export function parseMunicipalityQuery(raw: string): MunicipalityQuery | null {
  const parts = words(raw)
  if (parts.length === 0) return null
  const joined = parts.join('')
  if (/^\d+$/.test(joined)) return { kind: 'code', code: joined }
  const last = parts[parts.length - 1]
  if (parts.length > 1 && UF_CODES[last]) {
    return { kind: 'name', name: parts.slice(0, -1).join(''), uf: UF_CODES[last] }
  }
  return { kind: 'name', name: joined }
}

/** How well a municipality answers the query: 0 is best, null is no match. */
export function municipalityRank(
  query: MunicipalityQuery,
  name: string,
  code: string | number,
): number | null {
  const ibge = String(code)
  if (query.kind === 'code') return ibge.startsWith(query.code) ? 0 : null
  if (query.uf && !ibge.startsWith(query.uf)) return null
  const parts = words(name)
  const compact = parts.join('')
  if (compact === query.name) return 0
  if (compact.startsWith(query.name)) return 1
  if (parts.some((_, i) => parts.slice(i).join('').startsWith(query.name))) return 2
  return compact.includes(query.name) ? 3 : null
}

/** The municipalities that answer the query, best first, at most `limit`. */
export function searchMunicipalities<T>(
  items: readonly T[],
  raw: string,
  read: (item: T) => { name: string; code: string | number },
  limit = 8,
): T[] {
  const query = parseMunicipalityQuery(raw)
  if (!query) return []
  return items
    .flatMap((item) => {
      const { name, code } = read(item)
      const rank = municipalityRank(query, name, code)
      return rank === null ? [] : [{ item, rank, name, code: String(code) }]
    })
    .sort((a, b) =>
      a.rank - b.rank ||
      (query.kind === 'code' ? a.code.localeCompare(b.code) : a.name.localeCompare(b.name, 'pt-BR')),
    )
    .slice(0, limit)
    .map(({ item }) => item)
}

/** True when the municipality answers the query (for filters that keep their own order). */
export function matchesMunicipality(raw: string, name: string, code: string | number): boolean {
  const query = parseMunicipalityQuery(raw)
  return !query || municipalityRank(query, name, code) !== null
}

/** "SP" or "MG" for a code the platform covers, otherwise undefined. */
export const ufAbbreviation = (code: string | number): string | undefined =>
  UF_ABBREVIATIONS[String(code).slice(0, 2)]

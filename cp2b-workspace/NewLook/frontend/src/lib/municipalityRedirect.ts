/**
 * Where an old or code-based municipality address moves to, for the proxy's
 * 301s. Pure apart from the lookup it is given, so it is tested without a server.
 *
 *  /pt-BR/municipality/3509502    → /pt-BR/municipalities/campinas-sp
 *  /pt-BR/municipalities/3509502  → /pt-BR/municipalities/campinas-sp
 *  /pt-BR/municipalities/Campinas-SP → /pt-BR/municipalities/campinas-sp
 *
 * When the list of municipalities cannot be read, the old address still moves,
 * to /municipalities/3509502, which the page renders by its code: an old link
 * never ends in a 404 because the API was down.
 */
import type { DirectoryEntry } from '@/lib/municipalityDirectory'
import { isIbgeCode } from '@/lib/municipalitySlug'

const OLD = /^\/(en|pt-BR)\/municipality(?:\/([^/]*))?\/?$/
const NEW = /^\/(en|pt-BR)\/municipalities\/([^/]+)\/?$/

type Find = (code: string) => Promise<DirectoryEntry | null | undefined>

export async function municipalityRedirectTarget(pathname: string, find: Find): Promise<string | null> {
  const old = pathname.match(OLD)
  if (old) {
    const [, locale, segment] = old
    if (!segment) return `/${locale}/municipalities`
    const entry = isIbgeCode(segment) ? await find(segment) : undefined
    return `/${locale}/municipalities/${entry ? entry.slug : segment}`
  }
  const current = pathname.match(NEW)
  if (!current) return null
  const [, locale, segment] = current
  if (isIbgeCode(segment)) {
    const entry = await find(segment)
    return entry ? `/${locale}/municipalities/${entry.slug}` : null
  }
  const lower = segment.toLowerCase()
  return lower !== segment ? `/${locale}/municipalities/${lower}` : null
}

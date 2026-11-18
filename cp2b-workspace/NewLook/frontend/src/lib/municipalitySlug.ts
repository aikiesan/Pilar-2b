/**
 * Readable municipality addresses: /municipalities/campinas-sp.
 *
 * The slug is the name without accents, every run of anything that is not a
 * letter or digit turned into one hyphen, then the state's two letters:
 * "Santa Bárbara d'Oeste" (SP) → "santa-barbara-d-oeste-sp". Brazilian law
 * forbids two municipalities of the same name in one state, so name + UF is
 * unique and needs no code; the IBGE code stays in the old address
 * (/municipality/3509502), which answers with a 301 to this one.
 *
 * Pure and shared by the browser (search, map panel) and the server (proxy,
 * page, sitemap), so every link and every redirect agree.
 */
import { getState, ufOf } from '@/data/brazilStates'

const IBGE_CODE = /^\d{7}$/

export function isIbgeCode(value: string): boolean {
  return IBGE_CODE.test(value)
}

function slugPart(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** "campinas-sp"; falls back to the IBGE code when the state is unknown. */
export function municipalitySlug(name: string, ibgeCode: string | number): string {
  const code = String(ibgeCode)
  const sigla = getState(ufOf(code))?.sigla
  const base = slugPart(name)
  return sigla && base ? `${base}-${sigla.toLowerCase()}` : code
}

/** The locale-free path of a municipality's page, for `Link` and `router.push`. */
export function municipalityPath(name: string, ibgeCode: string | number): string {
  return `/municipalities/${municipalitySlug(name, ibgeCode)}`
}

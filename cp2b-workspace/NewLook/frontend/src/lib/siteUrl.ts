/**
 * The public address of the platform, for links that leave the site: share
 * buttons, citations, canonical URLs and Open Graph images. Production serves
 * under /pilar2b (next.config basePath).
 */
export const SITE_ORIGIN = 'https://cp2b.unicamp.br'
export const SITE_URL = `${SITE_ORIGIN}/pilar2b`

/** The absolute public URL of a locale-prefixed path: "/pt-BR/map" → "https://…/pilar2b/pt-BR/map". */
export function publicUrl(path: string): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

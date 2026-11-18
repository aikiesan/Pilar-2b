/**
 * Where a visitor goes after signing in: back to the page that sent them to
 * the login, or to the map. Only a path inside the app counts, so a crafted
 * "?next=//evil.example" link cannot bounce anyone off the site.
 */
export const AFTER_LOGIN_FALLBACK = '/map'

/** The login page's href, remembering the page the visitor is on. */
export function loginHref(fromPath?: string | null): string {
  const next = safeNext(fromPath)
  return next === AFTER_LOGIN_FALLBACK ? '/login' : `/login?next=${encodeURIComponent(next)}`
}

/** A locale-free path inside the app, or the fallback. */
export function safeNext(next?: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return AFTER_LOGIN_FALLBACK
  // The login and the retired account pages are never a destination.
  if (/^\/(login|register|dashboard)(\/|\?|#|$)/.test(next)) return AFTER_LOGIN_FALLBACK
  return next
}

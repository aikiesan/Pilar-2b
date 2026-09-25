/**
 * First-party page-view statistics, stored on the UNICAMP VM
 * (backend: /api/v1/analytics). No third-party service.
 *
 * Nothing is sent, and no cookie is written, unless the visitor chose "Accept
 * all" in the cookie banner. A page view then carries:
 * - a random visitor id, kept in the `pilar2b_vid` cookie of this site's path
 *   for about 13 months from the first visit (not renewed on later visits);
 * - a random id for the browser tab's session (sessionStorage);
 * - the page path without query string, the language and a device class;
 * - on a session's first page only, the host of the site that linked here.
 *
 * "Essential only" deletes the cookie and the session id (forgetVisitor).
 */
import type { Locale } from '@/config/i18n'
import { BASE_PATH } from '@/lib/basePath'
import { readConsent } from '@/lib/consent'

const API = `${process.env.NEXT_PUBLIC_API_URL || ''}/api/v1/analytics/pageview`

export const VISITOR_COOKIE = 'pilar2b_vid'
/** About 13 months, the same period the server keeps page views for. */
const VISITOR_MAX_AGE_SECONDS = 395 * 24 * 60 * 60
const SESSION_KEY = 'pilar2b-analytics-session'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type Device = 'mobile' | 'tablet' | 'desktop'

function randomId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  // Outside a secure context randomUUID is missing: a version 4 UUID by hand.
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function cookieAttributes(maxAge: number): string {
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  return `; Max-Age=${maxAge}; Path=${BASE_PATH || '/'}; SameSite=Lax${secure}`
}

function readCookie(name: string): string | null {
  const prefix = `${name}=`
  const entry = document.cookie.split('; ').find((part) => part.startsWith(prefix))
  return entry ? decodeURIComponent(entry.slice(prefix.length)) : null
}

function visitorId(): string {
  const existing = readCookie(VISITOR_COOKIE)
  if (existing && UUID.test(existing)) return existing
  const id = randomId()
  document.cookie = `${VISITOR_COOKIE}=${id}${cookieAttributes(VISITOR_MAX_AGE_SECONDS)}`
  return id
}

/** The tab's session id, and whether this page view opened the session. */
function session(): { id: string; isNew: boolean } {
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY)
    if (existing && UUID.test(existing)) return { id: existing, isNew: false }
    const id = randomId()
    window.sessionStorage.setItem(SESSION_KEY, id)
    return { id, isNew: true }
  } catch {
    return { id: randomId(), isNew: true }
  }
}

export function deviceClass(width: number): Device {
  if (width < 768) return 'mobile'
  if (width < 1280) return 'tablet'
  return 'desktop'
}

/** The referring site's host, when it is another site. */
function referrerHost(): string | null {
  if (!document.referrer) return null
  try {
    const host = new URL(document.referrer).hostname
    return host && host !== window.location.hostname ? host : null
  } catch {
    return null
  }
}

/**
 * Record a view of `path` (a pathname without the language prefix), if the
 * visitor accepted statistics. Fire and forget: a lost page view never
 * affects the page.
 */
export function trackPageview(path: string, locale: Locale): void {
  if (readConsent() !== 'all') return
  const { id: sessionId, isNew } = session()
  const view = {
    visitor_id: visitorId(),
    session_id: sessionId,
    path: encodeURI(path.split(/[?#]/)[0] || '/'),
    locale,
    device: deviceClass(window.innerWidth),
    referrer_host: isNew ? referrerHost() : null,
  }
  void fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(view),
    keepalive: true,
  }).catch(() => {})
}

/** Delete the statistics cookie and the session id ("Essential only"). */
export function forgetVisitor(): void {
  document.cookie = `${VISITOR_COOKIE}=${cookieAttributes(0)}`
  try {
    window.sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // nothing stored
  }
}

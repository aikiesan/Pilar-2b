/**
 * The visitor's cookie choice, kept in localStorage.
 *
 * - "all": the essential cookies plus the statistics cookie (lib/analytics).
 * - "essential": only what the site needs to work (language, theme, sign-in).
 *
 * A choice saved under an older banner (CONSENT_VERSION) counts as no choice,
 * so the banner asks again: consent is to the text the visitor actually read.
 * The footer's "Cookie preferences" reopens the banner at any time (LGPD art.
 * 8 §5: withdrawing is as easy as giving).
 */

export type ConsentChoice = 'all' | 'essential'

/** Bump when the banner's description of the cookies changes. */
export const CONSENT_VERSION = '2026-09-25'

const STORAGE_KEY = 'pilar2b-cookie-consent'
const CHANGED_EVENT = 'pilar2b-consent-changed'
const OPEN_EVENT = 'pilar2b-open-consent'

interface StoredConsent {
  consent: ConsentChoice
  version: string
  timestamp: string
}

/** The current choice, or null when the visitor has not chosen under this banner. */
export function readConsent(): ConsentChoice | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const stored = JSON.parse(raw) as Partial<StoredConsent>
    if (stored.version !== CONSENT_VERSION) return null
    return stored.consent === 'all' || stored.consent === 'essential' ? stored.consent : null
  } catch {
    return null // no storage (private mode, SSR) or a value this code did not write
  }
}

export function saveConsent(choice: ConsentChoice): void {
  const stored: StoredConsent = {
    consent: choice,
    version: CONSENT_VERSION,
    timestamp: new Date().toISOString(),
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
  } catch {
    // Unsaved, the banner asks again on the next page load; the choice still
    // applies to this one.
  }
  window.dispatchEvent(new Event(CHANGED_EVENT))
}

/** Calls `listener` when the choice changes, in this tab or another. */
export function onConsentChange(listener: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener()
  }
  window.addEventListener(CHANGED_EVENT, listener)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(CHANGED_EVENT, listener)
    window.removeEventListener('storage', onStorage)
  }
}

/** Reopen the cookie banner (the footer's "Cookie preferences"). */
export function openConsentPreferences(): void {
  window.dispatchEvent(new Event(OPEN_EVENT))
}

export function onOpenConsentPreferences(listener: () => void): () => void {
  window.addEventListener(OPEN_EVENT, listener)
  return () => window.removeEventListener(OPEN_EVENT, listener)
}

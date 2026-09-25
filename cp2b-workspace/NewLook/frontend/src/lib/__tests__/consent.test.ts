import {
  CONSENT_VERSION,
  onConsentChange,
  onOpenConsentPreferences,
  openConsentPreferences,
  readConsent,
  saveConsent,
} from '../consent'

const KEY = 'pilar2b-cookie-consent'

beforeEach(() => localStorage.clear())

describe('cookie consent store', () => {
  it('has no choice until the visitor makes one', () => {
    expect(readConsent()).toBeNull()
  })

  it('keeps the choice with the banner version', () => {
    saveConsent('essential')
    expect(readConsent()).toBe('essential')
    expect(JSON.parse(localStorage.getItem(KEY)!)).toMatchObject({ consent: 'essential', version: CONSENT_VERSION })
  })

  it('asks again when the choice was made under another banner text', () => {
    // What the old banner stored: no version, and the newsletter address too.
    localStorage.setItem(KEY, JSON.stringify({ consent: 'all', email: 'ana@example.org', timestamp: 'x' }))
    expect(readConsent()).toBeNull()
  })

  it('ignores a stored value it does not recognise', () => {
    localStorage.setItem(KEY, '{not json')
    expect(readConsent()).toBeNull()
    localStorage.setItem(KEY, JSON.stringify({ consent: 'marketing', version: CONSENT_VERSION }))
    expect(readConsent()).toBeNull()
  })

  it('tells listeners when the choice changes, here or in another tab', () => {
    const listener = jest.fn()
    const stop = onConsentChange(listener)
    saveConsent('all')
    window.dispatchEvent(new StorageEvent('storage', { key: KEY }))
    window.dispatchEvent(new StorageEvent('storage', { key: 'another-key' }))
    expect(listener).toHaveBeenCalledTimes(2)
    stop()
    saveConsent('essential')
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('reopens the banner on request', () => {
    const listener = jest.fn()
    const stop = onOpenConsentPreferences(listener)
    openConsentPreferences()
    expect(listener).toHaveBeenCalledTimes(1)
    stop()
  })
})

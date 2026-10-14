import { AFTER_LOGIN_FALLBACK, loginHref, safeNext } from '../authRedirect'

describe('safeNext', () => {
  it('keeps a path inside the app', () => {
    expect(safeNext('/proximity')).toBe('/proximity')
    expect(safeNext('/municipalities/campinas-sp?tab=1')).toBe('/municipalities/campinas-sp?tab=1')
  })

  it.each([null, undefined, '', 'proximity', '//evil.example', '/\\evil.example', 'https://evil.example'])(
    'falls back to the map for %p',
    (next) => {
      expect(safeNext(next)).toBe(AFTER_LOGIN_FALLBACK)
    },
  )

  it('never sends a visitor back to the login or the retired account pages', () => {
    expect(safeNext('/login')).toBe(AFTER_LOGIN_FALLBACK)
    expect(safeNext('/register')).toBe(AFTER_LOGIN_FALLBACK)
    expect(safeNext('/dashboard')).toBe(AFTER_LOGIN_FALLBACK)
    expect(safeNext('/loginhelp')).toBe('/loginhelp')
  })
})

describe('loginHref', () => {
  it('remembers the page the visitor came from', () => {
    expect(loginHref('/method/science-base')).toBe('/login?next=%2Fmethod%2Fscience-base')
  })

  it('stays plain when there is nothing to return to', () => {
    expect(loginHref(undefined)).toBe('/login')
    expect(loginHref('/login')).toBe('/login')
  })
})

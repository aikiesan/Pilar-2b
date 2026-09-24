import { localize, type Localized } from './localized'
import { isLocale } from '@/config/i18n'

describe('localize', () => {
  const name: Localized = { 'pt-BR': 'Bagaço de cana', en: 'Sugarcane bagasse' }

  it('returns the value for the requested locale', () => {
    expect(localize(name, 'en')).toBe('Sugarcane bagasse')
    expect(localize(name, 'pt-BR')).toBe('Bagaço de cana')
  })

  it('works for non-string payloads', () => {
    const bullets: Localized<string[]> = { 'pt-BR': ['um', 'dois'], en: ['one', 'two'] }
    expect(localize(bullets, 'en')).toEqual(['one', 'two'])
  })

  it('falls back to the default locale when a value is absent at runtime', () => {
    // The type forbids this; data arriving from JSON can still be incomplete.
    const partial = { 'pt-BR': 'Somente português' } as unknown as Localized
    expect(localize(partial, 'en')).toBe('Somente português')
  })
})

describe('isLocale', () => {
  it.each(['en', 'pt-BR'])('accepts %p', (value) => {
    expect(isLocale(value)).toBe(true)
  })

  it.each(['pt', 'es', 'EN', '', undefined, null, 42])('rejects %p', (value) => {
    expect(isLocale(value)).toBe(false)
  })
})

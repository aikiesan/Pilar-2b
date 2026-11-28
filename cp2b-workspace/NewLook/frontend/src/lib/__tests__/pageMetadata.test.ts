jest.mock('next-intl/server', () => ({
  getLocale: jest.fn(async () => 'en'),
  getTranslations: jest.fn(),
}))

import { NOT_INDEXED, canonical, localeAlternates } from '../pageMetadata'

const BASE = 'https://cp2b.unicamp.br/pilar2b'

describe('localeAlternates', () => {
  it('points a page at its own clean address and its twin in the other locale', () => {
    expect(localeAlternates('pt-BR', '/map')).toEqual({
      canonical: `${BASE}/pt-BR/map`,
      languages: {
        'pt-BR': `${BASE}/pt-BR/map`,
        en: `${BASE}/en/map`,
        'x-default': `${BASE}/pt-BR/map`,
      },
    })
  })

  it('gives the home its locale root, with no trailing slash', () => {
    const { canonical: url, languages } = localeAlternates('en', '/')
    expect(url).toBe(`${BASE}/en`)
    expect(languages).toMatchObject({ 'pt-BR': `${BASE}/pt-BR`, en: `${BASE}/en` })
  })
})

describe('canonical', () => {
  it('reads the locale of the request', async () => {
    await expect(canonical('/data')).resolves.toEqual({
      alternates: expect.objectContaining({ canonical: `${BASE}/en/data` }),
    })
  })
})

describe('NOT_INDEXED', () => {
  it('keeps a page out of the index but lets its links be followed', () => {
    expect(NOT_INDEXED).toEqual({ index: false, follow: true })
  })
})

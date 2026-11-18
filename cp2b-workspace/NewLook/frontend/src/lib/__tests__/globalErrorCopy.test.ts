/**
 * app/global-error.tsx carries its own copy of a few strings (it renders without
 * the intl provider and must stay light). They must not drift from the catalogs.
 */
import ptBR from '../../../messages/pt-BR.json'
import en from '../../../messages/en.json'
import { GLOBAL_ERROR_COPY } from '../globalErrorCopy'

describe('global-error copy', () => {
  it.each([
    ['pt-BR', ptBR],
    ['en', en],
  ] as const)('%s matches the catalog', (locale, catalog) => {
    const { home, ...error } = GLOBAL_ERROR_COPY[locale]
    expect(error).toEqual(catalog.wayfinding.error)
    expect(home).toBe(catalog.common.nav.home)
  })
})

/**
 * Readable municipality addresses: the slug, the directory it is resolved
 * through, and the 301s from the old /municipality/{ibge} links.
 */
import { isIbgeCode, municipalityPath, municipalitySlug } from '../municipalitySlug'
import { municipalityRedirectTarget } from '../municipalityRedirect'
import {
  directoryFrom,
  findMunicipality,
  municipalityDirectory,
  resetMunicipalityDirectory,
  type DirectoryEntry,
} from '../municipalityDirectory'
import { serverGetJson } from '../serverApi'

jest.mock('../serverApi', () => ({ serverGetJson: jest.fn() }))
const getJson = serverGetJson as jest.MockedFunction<typeof serverGetJson>

describe('municipalitySlug', () => {
  it.each([
    ['Campinas', '3509502', 'campinas-sp'],
    ['São Paulo', '3550308', 'sao-paulo-sp'],
    ["Santa Bárbara d'Oeste", '3545803', 'santa-barbara-d-oeste-sp'],
    ['Embu das Artes', 3515004, 'embu-das-artes-sp'],
    ['Belo Horizonte', '3106200', 'belo-horizonte-mg'],
    ['  Mogi-Guaçu ', '3530706', 'mogi-guacu-sp'],
  ])('%s → %s', (name, code, slug) => {
    expect(municipalitySlug(name, code)).toBe(slug)
  })

  it('falls back to the IBGE code when the state is unknown', () => {
    expect(municipalitySlug('Somewhere', '9900001')).toBe('9900001')
  })

  it('builds the locale-free path', () => {
    expect(municipalityPath('Campinas', '3509502')).toBe('/municipalities/campinas-sp')
  })

  it('tells a 7-digit code from a slug', () => {
    expect(isIbgeCode('3509502')).toBe(true)
    expect(isIbgeCode('campinas-sp')).toBe(false)
    expect(isIbgeCode('350950')).toBe(false)
  })
})

describe('directoryFrom', () => {
  it('keeps São Paulo and the Minas Gerais pilot, A to Z, with slugs', () => {
    const entries = directoryFrom({
      data: [
        { municipality_name: 'Campinas', ibge_code: '3509502' },
        { municipality_name: 'Salvador', ibge_code: '2927408' },
        { municipality_name: 'Belo Horizonte', ibge_code: 3106200 },
        { municipality_name: 'Águas de Lindóia', ibge_code: '3500501' },
        { municipality_name: null, ibge_code: '3550308' },
        { municipality_name: 'Bad', ibge_code: '35' },
      ],
    })
    expect(entries?.map((e) => e.slug)).toEqual(['aguas-de-lindoia-sp', 'belo-horizonte-mg', 'campinas-sp'])
  })

  it('is null when the body is not a list', () => {
    expect(directoryFrom(null)).toBeNull()
    expect(directoryFrom({ detail: 'error' })).toBeNull()
  })
})

describe('municipalityDirectory', () => {
  beforeEach(() => {
    resetMunicipalityDirectory()
    getJson.mockReset()
  })

  it('reads the whole list once and keeps it', async () => {
    getJson.mockResolvedValue({ data: [{ municipality_name: 'Campinas', ibge_code: '3509502' }] })
    await municipalityDirectory()
    await municipalityDirectory()
    expect(getJson).toHaveBeenCalledTimes(1)
    expect(getJson.mock.calls[0][0]).toBe('/municipalities/names?limit=6000')
  })

  it('finds by slug or code, says null for an unknown one and undefined without the list', async () => {
    getJson.mockResolvedValue({ data: [{ municipality_name: 'Campinas', ibge_code: '3509502' }] })
    expect((await findMunicipality('campinas-sp'))?.ibge).toBe('3509502')
    expect((await findMunicipality('Campinas-SP'))?.ibge).toBe('3509502')
    expect((await findMunicipality('3509502'))?.slug).toBe('campinas-sp')
    expect(await findMunicipality('nowhere-sp')).toBeNull()

    resetMunicipalityDirectory()
    getJson.mockResolvedValue(null)
    expect(await findMunicipality('campinas-sp')).toBeUndefined()
  })
})

describe('municipalityRedirectTarget', () => {
  const campinas: DirectoryEntry = { name: 'Campinas', ibge: '3509502', slug: 'campinas-sp' }
  const known = async (code: string) => (code === campinas.ibge ? campinas : null)
  const down = async () => undefined

  it.each([
    ['/pt-BR/municipality/3509502', '/pt-BR/municipalities/campinas-sp'],
    ['/en/municipality/3509502/', '/en/municipalities/campinas-sp'],
    ['/pt-BR/municipalities/3509502', '/pt-BR/municipalities/campinas-sp'],
    ['/pt-BR/municipality', '/pt-BR/municipalities'],
    ['/pt-BR/municipalities/Campinas-SP', '/pt-BR/municipalities/campinas-sp'],
  ])('%s → %s', async (from, to) => {
    expect(await municipalityRedirectTarget(from, known)).toBe(to)
  })

  it.each(['/pt-BR/municipalities', '/pt-BR/municipalities/campinas-sp', '/pt-BR/map', '/pt-BR/municipalities/campinas-sp/share-image'])(
    'leaves %s alone',
    async (path) => {
      expect(await municipalityRedirectTarget(path, known)).toBeNull()
    },
  )

  it('still moves an old link when the list is unavailable, to the code the page can render', async () => {
    expect(await municipalityRedirectTarget('/pt-BR/municipality/3509502', down)).toBe('/pt-BR/municipalities/3509502')
    expect(await municipalityRedirectTarget('/pt-BR/municipalities/3509502', down)).toBeNull()
  })
})

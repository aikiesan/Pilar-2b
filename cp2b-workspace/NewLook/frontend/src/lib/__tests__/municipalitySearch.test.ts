import {
  matchesMunicipality,
  parseMunicipalityQuery,
  searchMunicipalities,
  ufAbbreviation,
} from '../municipalitySearch'

const PLACES = [
  { name: 'São Paulo', code: '3550308' },
  { name: 'São Paulo do Potengi', code: '2412906' }, // outside the public scope; the matcher does not care
  { name: 'Campinas', code: '3509502' },
  { name: "Santa Bárbara d'Oeste", code: '3545803' },
  { name: 'Embu-Guaçu', code: '3515103' },
  { name: 'Itajubá', code: '3132404' },
  { name: 'Guaratinguetá', code: '3518404' },
  { name: 'Bom Jesus dos Perdões', code: '3507100' },
  { name: 'São José dos Campos', code: '3549904' },
]

const names = (query: string, limit?: number) =>
  searchMunicipalities(PLACES, query, (p) => p, limit).map((p) => p.name)

describe('parseMunicipalityQuery', () => {
  it('reads digits as an IBGE code and anything else as a name', () => {
    expect(parseMunicipalityQuery('3509502')).toEqual({ kind: 'code', code: '3509502' })
    expect(parseMunicipalityQuery(' 35 09 ')).toEqual({ kind: 'code', code: '3509' })
    expect(parseMunicipalityQuery('Campinas')).toEqual({ kind: 'name', name: 'campinas' })
  })

  it('takes a trailing state as a filter', () => {
    expect(parseMunicipalityQuery('Campinas SP')).toEqual({ kind: 'name', name: 'campinas', uf: '35' })
    expect(parseMunicipalityQuery('Itajubá/MG')).toEqual({ kind: 'name', name: 'itajuba', uf: '31' })
    expect(parseMunicipalityQuery('Campinas - sp')).toEqual({ kind: 'name', name: 'campinas', uf: '35' })
  })

  it('reads "sp" alone as a name, and an empty query as nothing', () => {
    expect(parseMunicipalityQuery('sp')).toEqual({ kind: 'name', name: 'sp' })
    expect(parseMunicipalityQuery('   ')).toBeNull()
    expect(parseMunicipalityQuery("-'-")).toBeNull()
  })
})

describe('searchMunicipalities', () => {
  it('ignores case and accents', () => {
    expect(names('sao paulo')).toEqual(['São Paulo', 'São Paulo do Potengi'])
    expect(names('SÃO PAULO')).toEqual(['São Paulo', 'São Paulo do Potengi'])
    expect(names('itajuba')).toEqual(['Itajubá'])
  })

  it('ignores hyphens, apostrophes and spaces', () => {
    expect(names('santa barbara doeste')).toEqual(["Santa Bárbara d'Oeste"])
    expect(names("santa barbara d'oeste")).toEqual(["Santa Bárbara d'Oeste"])
    expect(names('embu guacu')).toEqual(['Embu-Guaçu'])
    expect(names('embuguacu')).toEqual(['Embu-Guaçu'])
  })

  it('puts the exact name first, then names that start with the query, then words, then the rest', () => {
    // "campos" is a word of São José dos Campos; "campinas" starts with "camp".
    expect(names('camp')).toEqual(['Campinas', 'São José dos Campos'])
    expect(names('paulo')).toEqual(['São Paulo', 'São Paulo do Potengi'])
    // Inside a word only: "guara" starts Guaratinguetá; "tingueta" sits inside it.
    expect(names('tingueta')).toEqual(['Guaratinguetá'])
  })

  it('finds a code from its start, never from its middle', () => {
    expect(names('3509502')).toEqual(['Campinas'])
    expect(names('3550')).toEqual(['São Paulo'])
    expect(names('9502')).toEqual([])
  })

  it('narrows to the state named after the municipality', () => {
    expect(names('sao paulo sp')).toEqual(['São Paulo'])
    expect(names('itajuba sp')).toEqual([])
    expect(names('itajuba mg')).toEqual(['Itajubá'])
  })

  it('searches the name and the code only', () => {
    // Words from nowhere else (a region, a page, a residue) find nothing.
    expect(names('mapa')).toEqual([])
    expect(names('cana')).toEqual([])
  })

  it('stops at the limit', () => {
    expect(names('s', 2)).toHaveLength(2)
  })
})

describe('matchesMunicipality', () => {
  it('keeps everything for an empty query', () => {
    expect(matchesMunicipality('', 'Campinas', '3509502')).toBe(true)
  })

  it('agrees with the search', () => {
    expect(matchesMunicipality('sao jose', 'São José dos Campos', '3549904')).toBe(true)
    expect(matchesMunicipality('3549', 'São José dos Campos', 3549904)).toBe(true)
    expect(matchesMunicipality('rio', 'São José dos Campos', '3549904')).toBe(false)
  })
})

it('names the state of a code the platform covers', () => {
  expect(ufAbbreviation('3509502')).toBe('SP')
  expect(ufAbbreviation(3132404)).toBe('MG')
  expect(ufAbbreviation('3304557')).toBeUndefined()
})

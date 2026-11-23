import { LAND_COVER_GROUPS, landCoverOf, type LandCoverResponse } from '../landCover'
import { geospatialClient } from '../api/geospatialClient'

const mockAuthFetch = jest.fn()
jest.mock('../apiClient', () => ({
  ...jest.requireActual('../apiClient'),
  authenticatedFetch: (...args: unknown[]) => mockAuthFetch(...args),
}))

const response: LandCoverResponse = {
  available: true,
  source: 'MapBiomas Collection 11',
  unit: 'ha',
  year: 2025,
  years: [1985, 2005, 2025],
  groups: [...LAND_COVER_GROUPS],
  data: { '3543402': [4788.8, 1430.7, 29859.9, 3138.4, 9.6, 9725.9, 15722.7, 417.8] },
}

describe('landCoverOf', () => {
  it('names each hectare figure by its group', () => {
    expect(landCoverOf(response, '3543402')).toEqual({
      forest: 4788.8, pasture: 1430.7, cane: 29859.9, crops: 3138.4,
      silviculture: 9.6, mosaic: 9725.9, urban: 15722.7, other: 417.8,
    })
  })

  it('is null for an unknown municipality, no data, or a table not loaded', () => {
    expect(landCoverOf(response, '9999999')).toBeNull()
    expect(landCoverOf(undefined, '3543402')).toBeNull()
    expect(landCoverOf({ available: false }, '3543402')).toBeNull()
  })
})

describe('geospatialClient.getMunicipalityLandCover', () => {
  beforeEach(() => mockAuthFetch.mockReset())

  it('asks for one year with the session token', async () => {
    mockAuthFetch.mockResolvedValue({ ok: true, json: async () => response })
    await expect(geospatialClient.getMunicipalityLandCover(2025)).resolves.toEqual(response)
    expect(mockAuthFetch).toHaveBeenCalledWith(expect.stringMatching(/\/api\/v1\/municipalities\/land-cover\?year=2025$/))
  })

  it('fails on a refused request, so the tool can say so', async () => {
    mockAuthFetch.mockResolvedValue({ ok: false, status: 401 })
    await expect(geospatialClient.getMunicipalityLandCover(2025)).rejects.toThrow('HTTP 401')
  })
})

import { BASEMAPS, BASEMAP_ORDER, DEFAULT_BASEMAP } from './basemaps'

// Tile providers that need an API key or token. CARTO (basemaps.cartocdn.com)
// started answering keyless requests with an "API KEY REQUIRED" image, which
// covered the whole map in production.
const KEYED_PROVIDER = /cartocdn\.com|carto\.com|stadiamaps\.com|thunderforest\.com|mapbox\.com|maptiler\.com|jawg\.io|here\.com/i
const KEY_PARAM = /[?&](api_?key|access_token|key|token)=/i

describe('basemaps', () => {
  it('opens on the OpenStreetMap "Mapa"', () => {
    expect(DEFAULT_BASEMAP).toBe('mapa')
    expect(BASEMAPS[DEFAULT_BASEMAP].url).toContain('tile.openstreetmap.org')
  })

  it('lists every basemap in the switcher, and only those', () => {
    expect([...BASEMAP_ORDER].sort()).toEqual(Object.keys(BASEMAPS).sort())
  })

  it.each(Object.values(BASEMAPS))('$id needs no API key', (basemap) => {
    for (const url of [basemap.url, basemap.refUrl].filter((u): u is string => !!u)) {
      expect(url).not.toMatch(KEYED_PROVIDER)
      expect(url).not.toMatch(KEY_PARAM)
    }
  })
})

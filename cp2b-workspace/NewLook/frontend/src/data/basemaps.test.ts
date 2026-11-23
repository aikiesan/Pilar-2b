import { BASEMAPS, BASEMAP_ORDER, DEFAULT_BASEMAP } from './basemaps'

// Tile providers that need an API key or token. CARTO (basemaps.cartocdn.com)
// started answering keyless requests with an "API KEY REQUIRED" image, which
// covered the whole map in production.
const KEYED_DOMAINS = [
  'cartocdn.com',
  'carto.com',
  'stadiamaps.com',
  'thunderforest.com',
  'mapbox.com',
  'maptiler.com',
  'jawg.io',
  'here.com',
]
const KEY_PARAMS = ['apikey', 'api_key', 'access_token', 'key', 'token']

/** A tile URL template as a URL: placeholders filled with sample values. */
function tileUrl(template: string): URL {
  return new URL(template.replace('{s}', 'a').replace('{r}', '').replace(/\{[xyz]\}/g, '0'))
}

function onDomain(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`)
}

describe('basemaps', () => {
  it('opens on the OpenStreetMap "Mapa"', () => {
    expect(DEFAULT_BASEMAP).toBe('mapa')
    expect(onDomain(tileUrl(BASEMAPS[DEFAULT_BASEMAP].url).hostname, 'tile.openstreetmap.org')).toBe(true)
  })

  it('lists every basemap in the switcher, and only those', () => {
    expect([...BASEMAP_ORDER].sort()).toEqual(Object.keys(BASEMAPS).sort())
  })

  it.each(Object.values(BASEMAPS))('$id needs no API key', (basemap) => {
    for (const template of [basemap.url, basemap.labelsUrl].filter((u): u is string => !!u)) {
      const url = tileUrl(template)
      expect(KEYED_DOMAINS.filter((domain) => onDomain(url.hostname, domain))).toEqual([])
      expect(KEY_PARAMS.filter((param) => url.searchParams.has(param))).toEqual([])
    }
  })

  // A base that prints its own names gets no overlay: a second set from
  // another source lands a few pixels off and every town reads twice.
  it.each([BASEMAPS.mapa, BASEMAPS.terreno])('$id keeps its own names, with no overlay', (basemap) => {
    expect(basemap.labelsUrl).toBeUndefined()
    expect(basemap.attribution).not.toContain('Labels')
  })

  it('satellite, whose imagery has no names, draws Esri names above it', () => {
    expect(BASEMAPS.satelite.labelsUrl).toMatch(/^https:\/\/server\.arcgisonline\.com\//)
    expect(BASEMAPS.satelite.labelsUrl).not.toBe(BASEMAPS.satelite.url)
    expect(BASEMAPS.satelite.attribution).toContain('Esri')
  })

  it('would catch the CARTO basemap it replaced', () => {
    const carto = tileUrl('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png')
    expect(KEYED_DOMAINS.some((domain) => onDomain(carto.hostname, domain))).toBe(true)
  })
})

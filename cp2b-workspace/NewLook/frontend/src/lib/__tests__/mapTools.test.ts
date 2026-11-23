import {
  availableMapTools,
  initialMapSearch,
  isMapToolAvailable,
  parseMapToolParams,
  writeMapToolParams,
  emptyMapToolState,
  type MapToolUrlState,
} from '../mapTools'

describe('availableMapTools', () => {
  it('offers Land around and Cruzar while the analyses are held back', () => {
    expect(availableMapTools(false)).toEqual(['land', 'cross'])
    expect(isMapToolAvailable('compare', false)).toBe(false)
  })

  it('offers only tools that are built, even with the analyses on', () => {
    expect(availableMapTools(true)).toEqual(['land', 'compare', 'cross', 'gather', 'similar', 'truck'])
    expect(isMapToolAvailable('compare', true)).toBe(true)
    expect(isMapToolAvailable('gather', true)).toBe(true)
    expect(isMapToolAvailable('gather', false)).toBe(false)
    expect(isMapToolAvailable('similar', true)).toBe(true)
    expect(isMapToolAvailable('similar', false)).toBe(false)
    expect(isMapToolAvailable('truck', true)).toBe(true)
    expect(isMapToolAvailable('truck', false)).toBe(false)
    expect(isMapToolAvailable(null, true)).toBe(false)
  })
})

describe('parseMapToolParams', () => {
  it('reads an old Land around link', () => {
    expect(parseMapToolParams('?tool=land&lat=-21.18&lng=-47.81&radius=50')).toMatchObject({
      tool: 'land', land: { point: { lat: -21.18, lng: -47.81 }, radius: 50 },
    })
  })

  it('opens no tool for a missing or unknown tool, and reads no point then', () => {
    expect(parseMapToolParams('?lat=-21.18&lng=-47.81&radius=50')).toEqual(emptyMapToolState())
    expect(parseMapToolParams('?tool=ruler&lat=-21')).toEqual(emptyMapToolState())
    expect(parseMapToolParams('')).toEqual(emptyMapToolState())
  })

  it('opens Land around without a point when lat or lng is missing or malformed', () => {
    expect(parseMapToolParams('?tool=land').land).toEqual({ point: null, radius: 20 })
    expect(parseMapToolParams('?tool=land&lat=abc&lng=-47').land.point).toBeNull()
    expect(parseMapToolParams('?tool=land&lat=&lng=-47').land.point).toBeNull()
    expect(parseMapToolParams('?tool=land&lat=-95&lng=-47').land.point).toBeNull()
  })

  it('falls back to 20 km for a radius the tool does not offer', () => {
    expect(parseMapToolParams('?tool=land&radius=35').land.radius).toBe(20)
    expect(parseMapToolParams('?tool=land&radius=-10').land.radius).toBe(20)
  })

  it('keeps two distinct IBGE codes for Compare and drops the rest', () => {
    expect(parseMapToolParams('?tool=compare&pair=3509502,3550308,3543402').compare.pair).toEqual(['3509502', '3550308'])
    expect(parseMapToolParams('?tool=compare&pair=3509502,3509502').compare.pair).toEqual(['3509502'])
    expect(parseMapToolParams('?tool=compare&pair=abc,123').compare.pair).toEqual([])
  })

  it('reads Find similar without taking the map\'s own scope param', () => {
    expect(parseMapToolParams('?tool=similar&of=3509502&scope=31&within=both').similar).toEqual({ of: '3509502', within: 'both' })
    expect(parseMapToolParams('?tool=similar&of=x').similar).toEqual({ of: null, within: 'state' })
  })

  it('reads Truck reach, falling back to 60 minutes and no site', () => {
    expect(parseMapToolParams('?tool=truck&site=ITB_SP_0005&t=30').truck).toEqual({ site: 'ITB_SP_0005', limit: 30 })
    expect(parseMapToolParams('?tool=truck&site=a/b&t=45').truck).toEqual({ site: null, limit: 60 })
  })
})

describe('Cruzar in the URL', () => {
  it('opens from ?tool=cross and keeps the analysis in ?a=', () => {
    expect(parseMapToolParams('?tool=cross&a=lacuna').tool).toBe('cross')
    const params = writeMapToolParams('?a=lacuna&mode=choropleth', { tool: 'cross' })
    expect(params.get('tool')).toBe('cross')
    expect(params.get('a')).toBe('lacuna')
  })
})

describe('writeMapToolParams', () => {
  it('writes the tool, a rounded point and the radius, and keeps the map\'s own params', () => {
    const params = writeMapToolParams('?mode=choropleth&m=3543402&a=lacuna&scope=31', {
      tool: 'land', land: { point: { lat: -21.181234, lng: -47.810987 }, radius: 10 },
    })
    expect(params.toString()).toBe('mode=choropleth&m=3543402&a=lacuna&scope=31&tool=land&lat=-21.1812&lng=-47.8110&radius=10')
  })

  it('removes every tool param when no tool is open', () => {
    const params = writeMapToolParams('?mode=choropleth&tool=land&lat=-21&lng=-47&radius=50&pair=1&hub=2&of=3&within=both&site=S&t=30', { tool: null })
    expect(params.toString()).toBe('mode=choropleth')
  })

  it('drops the last tool\'s params when another opens', () => {
    const params = writeMapToolParams('?tool=land&lat=-21&lng=-47&radius=50', { tool: 'compare', compare: { pair: ['3509502'] } })
    expect(params.toString()).toBe('tool=compare&pair=3509502')
  })

  it.each<MapToolUrlState>([
    { ...emptyMapToolState(), tool: 'land', land: { point: { lat: -22.9056, lng: -47.0608 }, radius: 50 } },
    { ...emptyMapToolState(), tool: 'compare', compare: { pair: ['3509502', '3550308'] } },
    { ...emptyMapToolState(), tool: 'gather', gather: { point: { lat: -22.9056, lng: -47.0608 }, radius: 100, hub: null } },
    { ...emptyMapToolState(), tool: 'gather', gather: { point: null, radius: 50, hub: '3509502' } },
    { ...emptyMapToolState(), tool: 'similar', similar: { of: '3509502', within: 'both' } },
    { ...emptyMapToolState(), tool: 'truck', truck: { site: 'ITB_SP_0005', limit: 90 } },
  ])('round-trips $tool', (state) => {
    expect(parseMapToolParams(writeMapToolParams('', state))).toEqual(state)
  })
})

describe('initialMapSearch: back on the map after sign-in', () => {
  afterEach(() => window.history.replaceState(null, '', '/'))

  // A client-side navigation renders the map before the address bar changes:
  // window.location still holds the sign-in page and its ?next=.
  const signInPage = '/en/login?next=%2Fmap%3Ftool%3Dsimilar%26of%3D3543402%26within%3Dboth'

  it("reads the router's query, not the sign-in page still in the address bar", () => {
    window.history.replaceState(null, '', signInPage)
    const route = new URLSearchParams('tool=similar&of=3543402&within=both')
    expect(parseMapToolParams(initialMapSearch(route)).similar).toEqual({ of: '3543402', within: 'both' })
    expect(parseMapToolParams(initialMapSearch(route)).tool).toBe('similar')
  })

  it("keeps Truck reach's site and limit through the round trip", () => {
    window.history.replaceState(null, '', '/en/login?next=%2Fmap%3Ftool%3Dtruck%26site%3DITB_SP_0005%26t%3D60')
    const state = parseMapToolParams(initialMapSearch(new URLSearchParams('tool=truck&site=ITB_SP_0005&t=60')))
    expect(state.tool).toBe('truck')
    expect(state.truck).toEqual({ site: 'ITB_SP_0005', limit: 60 })
  })

  it('the sign-in link carries the tool in next, and that next opens it again', () => {
    const mapSearch = '?scope=35&tool=similar&of=3543402'
    const next = `/map?${writeMapToolParams(mapSearch, parseMapToolParams(mapSearch)).toString()}`
    const back = new URL(next, 'http://localhost').search
    expect(parseMapToolParams(initialMapSearch(new URLSearchParams(back)))).toEqual(parseMapToolParams(mapSearch))
  })

  it('reads the address bar only outside the app router', () => {
    window.history.replaceState(null, '', '/en/map?tool=land&lat=-21.18&lng=-47.81')
    expect(initialMapSearch(null)).toBe('tool=land&lat=-21.18&lng=-47.81')
  })
})

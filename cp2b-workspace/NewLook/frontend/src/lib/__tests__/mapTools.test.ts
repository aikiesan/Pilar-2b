import {
  availableMapTools,
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
    expect(availableMapTools(true)).toEqual(['land', 'compare', 'cross', 'gather'])
    expect(isMapToolAvailable('compare', true)).toBe(true)
    expect(isMapToolAvailable('gather', true)).toBe(true)
    expect(isMapToolAvailable('gather', false)).toBe(false)
    expect(isMapToolAvailable('similar', true)).toBe(false)
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
    const params = writeMapToolParams('?mode=choropleth&tool=land&lat=-21&lng=-47&radius=50&pair=1&hub=2&of=3&within=both', { tool: null })
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
  ])('round-trips $tool', (state) => {
    expect(parseMapToolParams(writeMapToolParams('', state))).toEqual(state)
  })
})

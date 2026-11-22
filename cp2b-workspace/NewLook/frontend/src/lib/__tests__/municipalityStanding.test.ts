import { municipalityStanding, curvePath, sqrtY } from '../municipalityStanding'

const FIELD = 'ch4_cp2b_n4_m3_year'

const feature = (code: string, name: string, region: string, value: number | null) => ({
  properties: { ibge_code: code, name, immediate_region: region, [FIELD]: value },
})

// Six São Paulo municipalities in two regions, one with no value, and one in MG.
const FEATURES = [
  feature('3500001', 'Alfa', 'Norte', 50),
  feature('3500002', 'Beta', 'Norte', 30),
  feature('3500003', 'Gama', 'Sul', 30),
  feature('3500004', 'Delta', 'Sul', 10),
  feature('3500005', 'Épsilon', 'Sul', 0),
  feature('3500006', 'Zeta', 'Sul', null),
  feature('3100001', 'Mineira', 'Sul', 999),
]

describe('municipalityStanding', () => {
  it('ranks within the state, counting only municipalities with a value', () => {
    const s = municipalityStanding(FEATURES, '3500004', FIELD)!
    expect(s.stateRank).toBe(4)
    expect(s.stateCount).toBe(5)
    expect(s.leader).toEqual({ name: 'Alfa', value: 50 })
    expect(s.stateTotal).toBe(120)
    expect(s.share).toBeCloseTo(10 / 120)
    expect(s.median).toBe(30)
  })

  it('gives ties the same rank', () => {
    expect(municipalityStanding(FEATURES, '3500002', FIELD)!.stateRank).toBe(2)
    expect(municipalityStanding(FEATURES, '3500003', FIELD)!.stateRank).toBe(2)
  })

  it('ranks within the immediate region of the same state', () => {
    const s = municipalityStanding(FEATURES, '3500004', FIELD)!
    expect(s.region).toBe('Sul')
    expect(s.regionRank).toBe(2)
    expect(s.regionCount).toBe(3)
    expect(s.regionRows.map((r) => [r.name, r.rank, r.self])).toEqual([
      ['Gama', 1, false],
      ['Delta', 2, true],
      ['Épsilon', 3, false],
    ])
  })

  it('keeps the municipality in the region list when it is outside the top rows', () => {
    const s = municipalityStanding(FEATURES, '3500005', FIELD, 2)!
    expect(s.regionRows.map((r) => r.name)).toEqual(['Gama', 'Épsilon'])
    expect(s.regionRows[1]).toMatchObject({ rank: 3, self: true })
  })

  it('returns the state values from largest to smallest, for the curve', () => {
    expect(municipalityStanding(FEATURES, '3500001', FIELD)!.curve).toEqual([50, 30, 30, 10, 0])
  })

  it('returns null when the municipality has no value', () => {
    expect(municipalityStanding(FEATURES, '3500006', FIELD)).toBeNull()
    expect(municipalityStanding(FEATURES, '9999999', FIELD)).toBeNull()
  })
})

describe('curvePath', () => {
  it('draws the values on a square-root scale and closes the area', () => {
    const d = curvePath([100, 25, 0], 100, 200, 100)
    // 100 → top, 25 → half height (sqrt), 0 → bottom.
    expect(d).toBe('M0,100 L0,0 L100,50 L200,100 L200,100 Z')
  })

  it('thins long curves to at most the given number of points', () => {
    const values = Array.from({ length: 645 }, (_, i) => 645 - i)
    const points = curvePath(values, 645, 300, 104, 120).match(/L/g)!.length
    expect(points).toBeLessThanOrEqual(122)
  })
})

describe('sqrtY', () => {
  it('puts every value on the baseline when the state has no methane at all', () => {
    expect(sqrtY(0, 0, 104)).toBe(104)
  })
  it('puts the maximum at the top', () => {
    expect(sqrtY(9, 9, 104)).toBe(0)
  })
})

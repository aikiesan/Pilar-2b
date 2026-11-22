import { ANALYSES, axisBreaks, axisClassOf, classifyAnalysis, isAnalysisId } from '../mapAnalyses'

const TIER = 'ch4_cp2b_n4_m3_year'

const f = (code: string, props: Record<string, unknown>) => ({ properties: { ibge_code: code, ...props } })

describe('axisBreaks', () => {
  it('cuts tertiles over the values above zero', () => {
    expect(axisBreaks([0, 0, 1, 2, 3, 4, 5, 6], 'tertile_nonzero')).toEqual([3, 5])
  })
  it('keeps zero in a plain tertile, tied zeros filling class 0', () => {
    // The raw low tertile is 0; on the break it would push every zero to class 1.
    expect(axisBreaks([0, 0, 0, 3, 6, 9], 'tertile')).toEqual([3, 6])
    expect(axisClassOf(0, [3, 6], { method: 'tertile' })).toBe(0)
  })
  it('moves a tied high break above the low one', () => {
    expect(axisBreaks([0, 0, 0, 0, 0, 7], 'tertile')).toEqual([7, 7])
  })
  it('refuses to cut when every value is the same', () => {
    expect(axisBreaks([4, 4, 4, 4], 'tertile')).toBeNull()
  })
  it('uses 0 · 1 · 2+ for counts', () => {
    expect(axisBreaks([0, 0, 5], 'fixed_count')).toEqual([1, 2])
  })
  it('refuses to cut fewer than three values', () => {
    expect(axisBreaks([1, 2], 'tertile')).toBeNull()
  })
})

describe('axisClassOf', () => {
  const axis = { method: 'tertile_nonzero' as const }
  it('puts a value on a break in the class above', () => {
    expect(axisClassOf(3, [3, 5], axis)).toBe(1)
    expect(axisClassOf(5, [3, 5], axis)).toBe(2)
  })
  it('keeps a measured zero as class 0 and a gap as no data', () => {
    expect(axisClassOf(0, [3, 5], axis)).toBe(0)
    expect(axisClassOf(null, [3, 5], axis)).toBeNull()
  })
  it('flips an inverted axis, so near is the strongest class', () => {
    expect(axisClassOf(1, [10, 50], { method: 'tertile', invert: true })).toBe(2)
    expect(axisClassOf(80, [10, 50], { method: 'tertile', invert: true })).toBe(0)
  })
})

describe('classifyAnalysis', () => {
  const features = [
    f('3500001', { [TIER]: 900, agricultural_biomass_tons_year: 9, livestock_biomass_tons_year: 9 }),
    f('3500002', { [TIER]: 500, agricultural_biomass_tons_year: 5, livestock_biomass_tons_year: 1 }),
    f('3500003', { [TIER]: 100, agricultural_biomass_tons_year: 1, livestock_biomass_tons_year: 5 }),
    f('3500004', { [TIER]: null, agricultural_biomass_tons_year: null, livestock_biomass_tons_year: 3 }),
    f('3100001', { [TIER]: 99999, agricultural_biomass_tons_year: 99, livestock_biomass_tons_year: 99 }),
  ]
  const siting = {
    '3500001': { biogas_plants: 0, pipeline_km: 2 },
    '3500002': { biogas_plants: 1, pipeline_km: 40 },
    '3500003': { biogas_plants: 3, pipeline_km: 90 },
  }

  it('reads one state only, and counts the cells', () => {
    const r = classifyAnalysis(ANALYSES.codigestao, features, '35', null, TIER)
    expect(r.byCode.has('3100001')).toBe(false)
    expect(r.byCode.get('3500001')!.cell).toBe(8)
    expect(r.byCode.get('3500004')!.cell).toBeNull()
    expect(r.noData).toBe(1)
    expect(r.counts.reduce((a, b) => a + b, 0)).toBe(3)
  })

  it('marks much methane with no plant as the gap', () => {
    const r = classifyAnalysis(ANALYSES.lacuna, features, '35', siting, TIER)
    expect(r.byCode.get('3500001')!.cell).toBe(ANALYSES.lacuna.answerCell)
    expect(r.byCode.get('3500003')!.cell).toBe(6)
  })

  it('has no cell for the infrastructure analyses until the indicators arrive', () => {
    const r = classifyAnalysis(ANALYSES.siting, features, '35', null, TIER)
    expect(r.counts.every((n) => n === 0)).toBe(true)
  })

  it('puts much methane near a pipeline in the answer cell', () => {
    const r = classifyAnalysis(ANALYSES.siting, features, '35', siting, TIER)
    expect(r.byCode.get('3500001')!.cell).toBe(ANALYSES.siting.answerCell)
  })

  it('measures the collection loss as the share of Ideal that misses Real', () => {
    const loss = ANALYSES.coleta.y.value({ ch4_cp2b_n3_m3_year: 200, ch4_cp2b_n4_m3_year: 50 }, null, TIER)
    expect(loss).toBeCloseTo(0.75)
    expect(ANALYSES.coleta.y.value({ ch4_cp2b_n3_m3_year: 0, ch4_cp2b_n4_m3_year: 0 }, null, TIER)).toBe(0)
  })
})

it('recognises analysis ids from the URL', () => {
  expect(isAnalysisId('lacuna')).toBe(true)
  expect(isAnalysisId('nope')).toBe(false)
})

import {
  ALL_OUTPUT_TYPES,
  PAYBACK_UNKNOWN,
  SCENARIO_CAPEX_TIERS,
  SCENARIO_FACTORS,
  applyScenario,
  calcBiogasFromCrop,
  calcBiogasFromLivestock,
  calcBiogasFromSugarcane,
  calcFinancials,
  calcOutputs,
  calcPaybackRange,
  getCapexTier,
  hectaresToCane,
  isLivestockActivity,
  isPaybackKnown,
  runCalculation,
  spreadToMonths,
} from './calculatorEngine'

const sum = (values: number[]) => values.reduce((total, v) => total + v, 0)

describe('feedstock → biogas', () => {
  it('converts planted hectares to cane at 75 t/ha', () => {
    expect(hectaresToCane(10)).toBe(750)
  })

  it('sums the four sugarcane streams', () => {
    const r = calcBiogasFromSugarcane(1000)
    // bagasse 56 t, straw 56 t, vinasse 108 t, filter cake 10.5 t available
    expect(r.biomassTotal).toBeCloseTo(230.5, 6)
    expect(r.strawTons).toBeCloseTo(56, 6)
    // 10 538.2 + 17 533.1 + 8 972.3 + 3 920.0 m³
    expect(r.biogasM3).toBeCloseTo(40963.58, 1)
    expect(r.ch4Weighted).toBeGreaterThan(0.55)
    expect(r.ch4Weighted).toBeLessThan(0.65)
  })

  it('weights livestock biogas and methane by head count', () => {
    const r = calcBiogasFromLivestock({ swine: 100, cattle_dairy: 10 })
    expect(r.biogasM3).toBe(100 * 200 + 10 * 500)
    expect(r.ch4Weighted).toBeCloseTo((20_000 * 0.65 + 5_000 * 0.6) / 25_000, 10)
    expect(r.biomassTotal).toBeCloseTo(100 * 1.2 + 10 * 18, 10)
  })

  it('ignores empty or negative head counts, and defaults CH₄ to 60%', () => {
    const r = calcBiogasFromLivestock({ swine: 0, cattle_beef: -5 })
    expect(r.biogasM3).toBe(0)
    expect(r.ch4Weighted).toBe(0.6)
  })

  it('applies the crop availability before the BMP', () => {
    const r = calcBiogasFromCrop('corn', 100)
    expect(r.biomassTotal).toBe(50)
    expect(r.biogasM3).toBeCloseTo(50 * 0.86 * (230 / 0.55), 6)
    expect(r.ch4Weighted).toBe(0.55)
  })
})

describe('spreadToMonths', () => {
  it('spreads the year evenly over the active months, all twelve listed', () => {
    const months = spreadToMonths(1200, [1, 2, 3])
    expect(months.map((m) => m.month)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    expect(months.slice(0, 3).map((m) => m.biogas)).toEqual([400, 400, 400])
    expect(sum(months.map((m) => m.biogas))).toBe(1200)
  })

  it('produces nothing when no month is active', () => {
    expect(sum(spreadToMonths(1200, []).map((m) => m.biogas))).toBe(0)
  })
})

describe('calcOutputs', () => {
  const outputs = calcOutputs(100_000, 0.6, 500, 200, [1, 2, 3, 4, 5, 6])

  it('derives every product from the methane volume', () => {
    const ch4 = 100_000 * 0.6
    expect(outputs.biomethaneM3Year).toBe(ch4)
    expect(outputs.energyKwhYear).toBeCloseTo((ch4 * 35.8 * 0.35) / 3.6, 6)
    expect(outputs.thermalMjYear).toBeCloseTo(ch4 * 35.8 * 0.5, 6)
    expect(outputs.digestateTonsYear).toBe(375)
    expect(outputs.co2TonsYear).toBeCloseTo((ch4 * 0.657 * (44 / 16)) / 1000, 6)
  })

  it('keeps the monthly energy consistent with the yearly total', () => {
    expect(sum(outputs.monthly.map((m) => m.energy))).toBeCloseTo(outputs.energyKwhYear, 6)
  })
})

describe('applyScenario', () => {
  const base = calcOutputs(100_000, 0.6, 500, 200, [1, 2, 3])

  it('is the identity for the reference (ideal) scenario', () => {
    expect(applyScenario(base, SCENARIO_FACTORS.avg)).toEqual(base)
  })

  it('scales biogas by the scenario BMP factor', () => {
    expect(applyScenario(base, SCENARIO_FACTORS.min).totalBiogasM3Year).toBeCloseTo(75_000, 6)
    expect(applyScenario(base, SCENARIO_FACTORS.max).totalBiogasM3Year).toBeCloseTo(120_000, 6)
  })
})

describe('getCapexTier', () => {
  it('picks the tier by plant scale', () => {
    expect(getCapexTier(50_000).level).toBe('low')
    expect(getCapexTier(500_000).level).toBe('medium')
    expect(getCapexTier(5_000_000).level).toBe('high')
  })

  it('uses the technology scenario’s own table', () => {
    expect(getCapexTier(50_000, 'min')).toBe(SCENARIO_CAPEX_TIERS.min[0])
    expect(getCapexTier(50_000, 'max')).toBe(SCENARIO_CAPEX_TIERS.max[0])
  })

  it('keeps each tier’s midpoint inside its range', () => {
    for (const tiers of Object.values(SCENARIO_CAPEX_TIERS)) {
      for (const tier of tiers) {
        expect(tier.mid).toBeGreaterThanOrEqual(tier.low)
        expect(tier.mid).toBeLessThanOrEqual(tier.high)
      }
    }
  })
})

describe('calcPaybackRange', () => {
  const tier = SCENARIO_CAPEX_TIERS.avg[1] // mid 2,000,000

  it('cannot estimate a payback without revenue', () => {
    expect(calcPaybackRange(0, tier)).toEqual({ min: PAYBACK_UNKNOWN, avg: PAYBACK_UNKNOWN, max: PAYBACK_UNKNOWN })
  })

  it('orders the cases optimistic ≤ expected ≤ conservative', () => {
    const r = calcPaybackRange(1_500_000, tier)
    expect(isPaybackKnown(r.min) && isPaybackKnown(r.avg) && isPaybackKnown(r.max)).toBe(true)
    expect(r.min).toBeLessThanOrEqual(r.avg)
    expect(r.avg).toBeLessThanOrEqual(r.max)
  })

  it('never promises less than half a year', () => {
    expect(calcPaybackRange(1e12, tier).min).toBe(0.5)
  })

  it('reports a conservative case past the horizon as not estimable', () => {
    expect(calcPaybackRange(250_000, tier).max).toBe(PAYBACK_UNKNOWN)
  })
})

describe('calcFinancials', () => {
  const outputs = calcOutputs(1_000_000, 0.6, 5_000, 0, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])

  it('bases payback on the full potential, whatever is selected', () => {
    const all = calcFinancials(outputs, ALL_OUTPUT_TYPES)
    const digestateOnly = calcFinancials(outputs, ['digestate'])
    expect(digestateOnly.payback).toEqual(all.payback)
    expect(digestateOnly.energySavingsBrlYear).toBe(0)
    expect(all.energySavingsBrlYear).toBeGreaterThan(0)
  })

  it('expects 75% of the nominal revenue', () => {
    const f = calcFinancials(outputs)
    expect(f.annualRevenueAvgBRL).toBeCloseTo(f.annualRevenueMaxBRL * 0.75, 6)
  })

  it('follows the prices it is given', () => {
    const cheap = calcFinancials(outputs, ALL_OUTPUT_TYPES, {
      energyTariffBrlKwh: 0.5, biomethaneM3: 1, co2CreditBrlTon: 10, dieselBrlLiter: 4,
    })
    expect(cheap.annualRevenueMaxBRL).toBeLessThan(calcFinancials(outputs).annualRevenueMaxBRL)
  })
})

describe('runCalculation', () => {
  it('summarizes sugarcane by the unit the user entered', () => {
    const byArea = runCalculation('sugarcane', { type: 'hectares', value: 10 }, null, [4, 5, 6], ['energy'])
    expect(byArea.inputSummary.quantity).toEqual({ value: 10, unit: 'ha' })
    const byMass = runCalculation('sugarcane', { type: 'tons', value: 750 }, null, [4, 5, 6], ['energy'])
    expect(byMass.inputSummary.quantity).toEqual({ value: 750, unit: 't' })
    // 10 ha is 750 t of cane: the same plant either way.
    expect(byArea.outputs.totalBiogasM3Year).toBeCloseTo(byMass.outputs.totalBiogasM3Year, 6)
  })

  it('counts only the chosen livestock category', () => {
    const r = runCalculation('swine', null, { heads: { swine: 120, cattle_beef: 40 } }, [1, 2], ['energy'])
    expect(r.inputSummary.quantity).toEqual({ value: 120, unit: 'heads' })
    expect(r.outputs.totalBiogasM3Year).toBe(120 * 200)
  })

  it('handles crop residues', () => {
    const r = runCalculation('coffee', null, null, [6, 7], ['biochar'], { tonnes: 300 })
    expect(r.inputSummary.quantity).toEqual({ value: 300, unit: 't' })
    expect(r.inputSummary.activityType).toBe('coffee')
    expect(r.outputs.biocharTonsYear).toBeGreaterThan(0)
  })

  it('returns data only — no display text in either language', () => {
    const r = runCalculation('sugarcane', { type: 'tons', value: 1000 }, null, [4, 5, 6], ALL_OUTPUT_TYPES)
    expect(JSON.stringify(r)).not.toMatch(/[ãõçáéíóúâêô]/i)
    expect(r.outputs.monthly[0]).toEqual(expect.not.objectContaining({ monthLabel: expect.anything() }))
  })
})

describe('guards', () => {
  it('recognizes every livestock activity', () => {
    for (const type of ['livestock', 'swine', 'cattle', 'poultry'] as const) {
      expect(isLivestockActivity(type)).toBe(true)
    }
    expect(isLivestockActivity('sugarcane')).toBe(false)
    expect(isLivestockActivity(null)).toBe(false)
  })

  it('treats the sentinel as an unknown payback', () => {
    expect(isPaybackKnown(PAYBACK_UNKNOWN)).toBe(false)
    expect(isPaybackKnown(3.2)).toBe(true)
  })
})

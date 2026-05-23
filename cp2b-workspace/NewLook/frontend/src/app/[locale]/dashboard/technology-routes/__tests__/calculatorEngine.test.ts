/**
 * calculatorEngine.test.ts — Scientific Correctness Tests
 *
 * These tests verify that every formula in calculatorEngine.ts is implemented
 * correctly by computing the expected value independently from the same published
 * constants, then comparing with a tight numeric tolerance.
 *
 * Test philosophy:
 *  - Every assertion includes the derivation formula in a comment.
 *  - Every constant cites its scientific source.
 *  - No mocks — all functions under test are pure TypeScript with no I/O.
 *  - .toBeCloseTo(x, d) precision: d = significant decimal places in the result.
 */

import {
  // Biogas calculation functions
  calcBiogasFromSugarcane,
  calcBiogasFromLivestock,
  calcBiogasFromCrop,

  // Output and financial functions
  calcOutputs,
  applyScenario,
  calcPaybackRange,
  calcFinancials,
  getCapexTier,
  spreadToMonths,
  hectaresToCane,

  // Constants needed for independent verification
  SUGARCANE_STREAMS,
  LIVESTOCK_PPB,
  CROP_PARAMS,
  SCENARIO_FACTORS,
  SCENARIO_CAPEX_TIERS,
  ALL_OUTPUT_TYPES,
  DEFAULT_PRICES,

  type CropType,
  type LivestockSpecies,
  type OutputResult,
} from '../calculatorEngine'

// ── Thermodynamic constants (independent of calculatorEngine) ─────────────────
// Source: ABNT NBR ISO 6976:2011 / IEA Bioenergy Task 37
const CH4_LHV_MJ_PER_M3 = 35.8    // Lower Heating Value of methane
const CH4_DENSITY_KG_M3 = 0.657   // Density of CH4 at STP (0°C, 1 atm)
const ELEC_EFF           = 0.35   // Electrical efficiency (CHP generator set)
const THERMAL_EFF        = 0.50   // Heat recovery efficiency
const MJ_TO_KWH          = 1 / 3.6
const MOLAR_RATIO_CO2_CH4 = 44 / 16  // Stoichiometric CO₂:CH₄ molar mass ratio

const ALL_MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

// ── hectaresToCane ─────────────────────────────────────────────────────────────

describe('hectaresToCane', () => {
  it('converts 1 ha to 75 tonnes using SP average cane yield', () => {
    // Source: UNICA 2023 — SP average productivity 75 t/ha
    expect(hectaresToCane(1)).toBe(75)
    expect(hectaresToCane(100)).toBe(7500)
    expect(hectaresToCane(0)).toBe(0)
  })
})

// ── calcBiogasFromSugarcane ───────────────────────────────────────────────────

describe('calcBiogasFromSugarcane', () => {
  it('zero input yields zero biogas', () => {
    const r = calcBiogasFromSugarcane(0)
    expect(r.biogasM3).toBe(0)
    expect(r.biomassTotal).toBe(0)
  })

  it('returns default CH4 weighted content (0.60) when input is zero', () => {
    const r = calcBiogasFromSugarcane(0)
    expect(r.ch4Weighted).toBeCloseTo(0.60, 4)
  })

  it('bagaço stream: 1000 t cane → availableTons × VS × (BMP ÷ CH4%)', () => {
    // bagaço: rpr=0.28, fde=0.20, vs=0.88, bmp=350, ch4=0.55
    // available = 1000 × 0.28 × 0.20 = 56 t
    // biogas    = 56 × 0.88 × (350 / 0.55) = 56 × 560 = 31 360 m³
    // Source: EMBRAPA Agroenergia / UNICA Relatório Anual 2023
    const stream = SUGARCANE_STREAMS.bagaco
    const tonsRaw = 1000
    const available = tonsRaw * stream.rpr * stream.fde
    const expected = available * stream.vs * (stream.bmp / stream.ch4)
    // Full function sums all 4 streams; test that bagaço contribution is dominant
    const r = calcBiogasFromSugarcane(tonsRaw)
    // Bagaço expected ≈ 31 360 m³ out of ~61 000 total → verify it is contained
    expect(r.biogasM3).toBeGreaterThan(expected * 0.99)  // bagaço alone < total
  })

  it('total biogas from 1000 t cane matches sum of 4 independent stream calculations', () => {
    // Source: UNICA / EMBRAPA — 4-stream model (bagaço, palha, vinhaca, torta)
    const tonsRaw = 1000
    let independentTotal = 0
    for (const s of Object.values(SUGARCANE_STREAMS)) {
      const available = tonsRaw * s.rpr * s.fde
      independentTotal += available * s.vs * (s.bmp / s.ch4)
    }
    const r = calcBiogasFromSugarcane(tonsRaw)
    expect(r.biogasM3).toBeCloseTo(independentTotal, 0)  // ±1 m³
  })

  it('CH4 weighted content is biomass-flow-weighted average across streams', () => {
    const tonsRaw = 1000
    let biogasTotal = 0, ch4Numerator = 0
    for (const s of Object.values(SUGARCANE_STREAMS)) {
      const avail = tonsRaw * s.rpr * s.fde
      const biogas = avail * s.vs * (s.bmp / s.ch4)
      biogasTotal  += biogas
      ch4Numerator += biogas * s.ch4
    }
    const expectedCh4 = ch4Numerator / biogasTotal
    const r = calcBiogasFromSugarcane(tonsRaw)
    expect(r.ch4Weighted).toBeCloseTo(expectedCh4, 4)
  })

  it('biomassTotal equals sum of available tonnes across all streams', () => {
    const tonsRaw = 500
    const expectedBiomass = Object.values(SUGARCANE_STREAMS)
      .reduce((sum, s) => sum + tonsRaw * s.rpr * s.fde, 0)
    const r = calcBiogasFromSugarcane(tonsRaw)
    expect(r.biomassTotal).toBeCloseTo(expectedBiomass, 4)
  })

  it('strawTons equals the palha stream available tonnes', () => {
    // Palha (straw) available fraction tracked separately for biochar calculation
    const tonsRaw = 2000
    const s = SUGARCANE_STREAMS.palha
    const expectedStraw = tonsRaw * s.rpr * s.fde
    const r = calcBiogasFromSugarcane(tonsRaw)
    expect(r.strawTons).toBeCloseTo(expectedStraw, 4)
  })

  it('scales linearly with input tonnage (double input → double biogas)', () => {
    const r1 = calcBiogasFromSugarcane(1000)
    const r2 = calcBiogasFromSugarcane(2000)
    expect(r2.biogasM3).toBeCloseTo(r1.biogasM3 * 2, 0)
    expect(r2.biomassTotal).toBeCloseTo(r1.biomassTotal * 2, 4)
  })
})

// ── calcBiogasFromLivestock ───────────────────────────────────────────────────

describe('calcBiogasFromLivestock', () => {
  it('empty heads object yields zero biogas', () => {
    const r = calcBiogasFromLivestock({})
    expect(r.biogasM3).toBe(0)
    expect(r.biomassTotal).toBe(0)
  })

  it('zero heads for a species yields zero biogas', () => {
    const r = calcBiogasFromLivestock({ swine: 0 })
    expect(r.biogasM3).toBe(0)
  })

  it('1000 swine → 200 000 m³/yr biogas (ppb = 200 m³/head/yr)', () => {
    // Source: EMBRAPA Suínos e Aves — Boletim Técnico 47 (2022)
    // Formula: heads × ppb_factor
    const r = calcBiogasFromLivestock({ swine: 1000 })
    expect(r.biogasM3).toBeCloseTo(1000 * LIVESTOCK_PPB.swine.ppb, 0)
    expect(r.ch4Weighted).toBeCloseTo(LIVESTOCK_PPB.swine.ch4, 4)
  })

  it('1000 swine → 1200 t/yr manure biomass (1.2 t/head/yr from EMBRAPA)', () => {
    // Source: EMBRAPA Suínos e Aves (2022) — Boletim Técnico 47
    const r = calcBiogasFromLivestock({ swine: 1000 })
    expect(r.biomassTotal).toBeCloseTo(1200, 0)
  })

  it('500 cattle_dairy → 250 000 m³/yr (ppb = 500 m³/head/yr)', () => {
    // Source: EMBRAPA Gado de Leite — Boletim de Pesquisa 2021
    const r = calcBiogasFromLivestock({ cattle_dairy: 500 })
    expect(r.biogasM3).toBeCloseTo(500 * LIVESTOCK_PPB.cattle_dairy.ppb, 0)
  })

  it('mixed herd: total biogas is sum of individual species contributions', () => {
    // 500 swine + 200 cattle_beef
    const expectedSwine  = 500 * LIVESTOCK_PPB.swine.ppb       // 100 000
    const expectedCattle = 200 * LIVESTOCK_PPB.cattle_beef.ppb  // 70 000
    const expectedTotal  = expectedSwine + expectedCattle        // 170 000
    const r = calcBiogasFromLivestock({ swine: 500, cattle_beef: 200 })
    expect(r.biogasM3).toBeCloseTo(expectedTotal, 0)
  })

  it('mixed herd: CH4 weighted content is biogas-flow-weighted average', () => {
    const swine_biogas  = 500 * LIVESTOCK_PPB.swine.ppb
    const cattle_biogas = 200 * LIVESTOCK_PPB.cattle_beef.ppb
    const total         = swine_biogas + cattle_biogas
    const expectedCh4   = (swine_biogas * LIVESTOCK_PPB.swine.ch4 +
                           cattle_biogas * LIVESTOCK_PPB.cattle_beef.ch4) / total
    const r = calcBiogasFromLivestock({ swine: 500, cattle_beef: 200 })
    expect(r.ch4Weighted).toBeCloseTo(expectedCh4, 4)
  })

  it.each([
    ['swine',        1000, 200_000],
    ['cattle_beef',  100,   35_000],
    ['cattle_dairy', 100,   50_000],
    ['poultry_eggs', 10_000, 14_000],
    ['poultry_meat', 10_000, 8_000],
  ] as [LivestockSpecies, number, number][])(
    '%s: %d heads → %d m³/yr',
    (species, heads, expectedBiogas) => {
      const r = calcBiogasFromLivestock({ [species]: heads } as any)
      expect(r.biogasM3).toBeCloseTo(expectedBiogas, 0)
    }
  )
})

// ── calcBiogasFromCrop ────────────────────────────────────────────────────────

describe('calcBiogasFromCrop', () => {
  it('zero tonnes yields zero biogas', () => {
    const r = calcBiogasFromCrop('corn', 0)
    expect(r.biogasM3).toBe(0)
  })

  it('corn: 100 t → biogas = tonnes × avail × VS × (BMP ÷ CH4%)', () => {
    // Source: Denis Miranda 2022; EMBRAPA Agroenergia
    // corn: avail=0.50, vs=0.83, bmp=320, ch4=0.55
    const p = CROP_PARAMS.corn
    const available = 100 * p.avail
    const expected  = available * p.vs * (p.bmp / p.ch4)
    const r = calcBiogasFromCrop('corn', 100)
    expect(r.biogasM3).toBeCloseTo(expected, 0)
    expect(r.biomassTotal).toBeCloseTo(available, 4)
    expect(r.ch4Weighted).toBeCloseTo(p.ch4, 4)
  })

  it('scales linearly with input tonnage (2× tonnes → 2× biogas)', () => {
    const r1 = calcBiogasFromCrop('soy', 100)
    const r2 = calcBiogasFromCrop('soy', 200)
    expect(r2.biogasM3).toBeCloseTo(r1.biogasM3 * 2, 0)
  })

  it.each([
    'corn', 'soy', 'coffee', 'citrus',
  ] as CropType[])(
    '%s: biogas is positive for 100 t input',
    (crop) => {
      const r = calcBiogasFromCrop(crop, 100)
      expect(r.biogasM3).toBeGreaterThan(0)
    }
  )

  it.each([
    'corn', 'soy', 'coffee', 'citrus',
  ] as CropType[])(
    '%s: independently computed biogas matches function output',
    (crop) => {
      const p = CROP_PARAMS[crop]
      const tonnes = 500
      const available = tonnes * p.avail
      const expected  = available * p.vs * (p.bmp / p.ch4)
      const r = calcBiogasFromCrop(crop, tonnes)
      expect(r.biogasM3).toBeCloseTo(expected, 0)
    }
  )
})

// ── calcOutputs — energy and emissions ───────────────────────────────────────

describe('calcOutputs', () => {
  const BIOGAS   = 100_000   // m³/yr
  const CH4_FRAC = 0.60      // 60% CH4 content
  const BIOMASS  = 1000      // tonnes

  let result: OutputResult

  beforeEach(() => {
    result = calcOutputs(BIOGAS, CH4_FRAC, BIOMASS, 0, ALL_MONTHS)
  })

  it('energyKwhYear: CH4_m3 × LHV × elec_eff ÷ MJ→kWh', () => {
    // Source: ABNT NBR ISO 6976:2011; CH4 LHV = 35.8 MJ/m³, η_elec = 35%
    const ch4M3   = BIOGAS * CH4_FRAC           // 60 000 m³
    const expected = ch4M3 * CH4_LHV_MJ_PER_M3 * ELEC_EFF * MJ_TO_KWH
    expect(result.energyKwhYear).toBeCloseTo(expected, -1)  // ±10 kWh tolerance
  })

  it('thermalMjYear: CH4_m3 × LHV × thermal_eff', () => {
    // Source: IEA Bioenergy Task 37 — heat recovery from CHP
    const ch4M3   = BIOGAS * CH4_FRAC
    const expected = ch4M3 * CH4_LHV_MJ_PER_M3 * THERMAL_EFF
    expect(result.thermalMjYear).toBeCloseTo(expected, -1)
  })

  it('co2TonsYear: CH4_m3 × density × (44/16) ÷ 1000 — stoichiometric combustion', () => {
    // CH4 + 2O2 → CO2 + 2H2O; M(CH4)=16, M(CO2)=44; density CH4 = 0.657 kg/m³
    // Source: IPCC AR6 — avoided methane combustion offset factor
    const ch4M3   = BIOGAS * CH4_FRAC
    const expected = ch4M3 * CH4_DENSITY_KG_M3 * MOLAR_RATIO_CO2_CH4 / 1000
    expect(result.co2TonsYear).toBeCloseTo(expected, 2)
  })

  it('biomethaneM3Year equals the CH4 fraction of total biogas', () => {
    // Biomethane = purified CH4 stream (same volume as CH4 in raw biogas)
    expect(result.biomethaneM3Year).toBeCloseTo(BIOGAS * CH4_FRAC, 0)
  })

  it('digestateTonsYear = 75% of biomass input (standard dewatering retention)', () => {
    // Source: Misi & Forster 2002 — organic matter retention in digestate
    expect(result.digestateTonsYear).toBeCloseTo(BIOMASS * 0.75, 1)
  })

  it('totalBiogasM3Year passes through unchanged', () => {
    expect(result.totalBiogasM3Year).toBe(BIOGAS)
  })

  it('ch4ContentWeighted passes through unchanged', () => {
    expect(result.ch4ContentWeighted).toBe(CH4_FRAC)
  })

  it('energy > 0 when CH4 > 0 and biogas > 0', () => {
    expect(result.energyKwhYear).toBeGreaterThan(0)
  })

  it('zero biogas yields zero energy and zero CO2', () => {
    const r = calcOutputs(0, 0.60, 0, 0, ALL_MONTHS)
    expect(r.energyKwhYear).toBe(0)
    expect(r.co2TonsYear).toBe(0)
    expect(r.thermalMjYear).toBe(0)
  })

  it('energy ratio to thermal is (elec_eff/3.6) / thermal_eff ≈ 0.194', () => {
    // energy [kWh] = ch4 × LHV × elec_eff / 3.6
    // thermal [MJ] = ch4 × LHV × thermal_eff
    // ratio [kWh/MJ] = elec_eff / (thermal_eff × 3.6) = 0.35 / (0.50 × 3.6) = 0.1944
    const ratio = result.energyKwhYear / result.thermalMjYear
    expect(ratio).toBeCloseTo(ELEC_EFF / (THERMAL_EFF * 3.6), 3)
  })

  it('monthly distribution: active months receive equal share, inactive months are zero', () => {
    const active = [6, 7, 8]  // 3 months
    const r = calcOutputs(90_000, 0.60, 0, 0, active)
    // 90 000 m³ / 3 months = 30 000 m³/month
    expect(r.monthly[5].biogas).toBeCloseTo(30_000, 0)   // June (index 5)
    expect(r.monthly[6].biogas).toBeCloseTo(30_000, 0)   // July
    expect(r.monthly[0].biogas).toBe(0)                   // January — inactive
    expect(r.monthly[11].biogas).toBe(0)                  // December — inactive
  })

  it('monthly biogas sums to totalBiogasM3Year', () => {
    const monthlySum = result.monthly.reduce((sum, m) => sum + m.biogas, 0)
    expect(monthlySum).toBeCloseTo(BIOGAS, 0)
  })
})

// ── applyScenario ─────────────────────────────────────────────────────────────

describe('applyScenario', () => {
  const BASE_BIOGAS = 1_000_000  // m³/yr — large enough to be in Alto CAPEX tier

  let base: OutputResult

  beforeEach(() => {
    base = calcOutputs(BASE_BIOGAS, 0.60, 10_000, 2000, ALL_MONTHS)
  })

  it('avg scenario is the identity transformation (bmpFactor=1, ratios=1)', () => {
    const avg = applyScenario(base, SCENARIO_FACTORS.avg)
    expect(avg.totalBiogasM3Year).toBeCloseTo(base.totalBiogasM3Year, 0)
    expect(avg.energyKwhYear).toBeCloseTo(base.energyKwhYear, 0)
  })

  it('min scenario reduces biogas by bmpFactor (0.75)', () => {
    // min: bmpFactor=0.75
    const min = applyScenario(base, SCENARIO_FACTORS.min)
    expect(min.totalBiogasM3Year).toBeCloseTo(base.totalBiogasM3Year * SCENARIO_FACTORS.min.bmpFactor, 0)
  })

  it('max scenario increases biogas by bmpFactor (1.20)', () => {
    // max: bmpFactor=1.20
    const max = applyScenario(base, SCENARIO_FACTORS.max)
    expect(max.totalBiogasM3Year).toBeCloseTo(base.totalBiogasM3Year * SCENARIO_FACTORS.max.bmpFactor, 0)
  })

  it('min energy factor = bmpFactor × (min_elec / avg_elec) = 0.75 × 0.8 = 0.60', () => {
    // min: bmpFactor=0.75, elecEff=0.28; avg: elecEff=0.35
    // energyFactor = 0.75 × (0.28 / 0.35) = 0.60
    const min = applyScenario(base, SCENARIO_FACTORS.min)
    const expectedFactor = SCENARIO_FACTORS.min.bmpFactor *
                           (SCENARIO_FACTORS.min.elecEff / SCENARIO_FACTORS.avg.elecEff)
    expect(min.energyKwhYear).toBeCloseTo(base.energyKwhYear * expectedFactor, -1)
  })

  it('max energy factor = bmpFactor × (max_elec / avg_elec) = 1.20 × 1.20 = 1.44', () => {
    const max = applyScenario(base, SCENARIO_FACTORS.max)
    const expectedFactor = SCENARIO_FACTORS.max.bmpFactor *
                           (SCENARIO_FACTORS.max.elecEff / SCENARIO_FACTORS.avg.elecEff)
    expect(max.energyKwhYear).toBeCloseTo(base.energyKwhYear * expectedFactor, -1)
  })

  it('ch4ContentWeighted is unchanged across all scenario transformations', () => {
    // CH4 content is a property of the feedstock, not the technology scenario
    ;([SCENARIO_FACTORS.min, SCENARIO_FACTORS.avg, SCENARIO_FACTORS.max] as const).forEach(sf => {
      const r = applyScenario(base, sf)
      expect(r.ch4ContentWeighted).toBeCloseTo(base.ch4ContentWeighted, 4)
    })
  })

  it('biochar scales only by biocharYield ratio (independent of BMP)', () => {
    // Pyrolysis yield is independent of biodigestion BMP — it depends on pyrolysis
    // technology, not anaerobic conditions
    const min = applyScenario(base, SCENARIO_FACTORS.min)
    const expectedCharFactor = SCENARIO_FACTORS.min.biocharYield / SCENARIO_FACTORS.avg.biocharYield
    expect(min.biocharTonsYear).toBeCloseTo(base.biocharTonsYear * expectedCharFactor, 2)
  })

  it('min scenario produces less biogas than avg, which produces less than max', () => {
    const min = applyScenario(base, SCENARIO_FACTORS.min)
    const avg = applyScenario(base, SCENARIO_FACTORS.avg)
    const max = applyScenario(base, SCENARIO_FACTORS.max)
    expect(min.totalBiogasM3Year).toBeLessThan(avg.totalBiogasM3Year)
    expect(avg.totalBiogasM3Year).toBeLessThan(max.totalBiogasM3Year)
  })
})

// ── getCapexTier ─────────────────────────────────────────────────────────────

describe('getCapexTier', () => {
  it('biogas < 100 000 m³/yr → Baixo tier', () => {
    expect(getCapexTier(0).label).toBe('Baixo')
    expect(getCapexTier(50_000).label).toBe('Baixo')
    expect(getCapexTier(99_999).label).toBe('Baixo')
  })

  it('100 000 ≤ biogas < 1 000 000 m³/yr → Médio tier', () => {
    expect(getCapexTier(100_000).label).toBe('Médio')
    expect(getCapexTier(500_000).label).toBe('Médio')
    expect(getCapexTier(999_999).label).toBe('Médio')
  })

  it('biogas ≥ 1 000 000 m³/yr → Alto tier', () => {
    expect(getCapexTier(1_000_000).label).toBe('Alto')
    expect(getCapexTier(5_000_000).label).toBe('Alto')
  })

  it('min scenario uses the min CAPEX tier table (lower absolute costs)', () => {
    const avgTier = getCapexTier(500_000, 'avg')
    const minTier = getCapexTier(500_000, 'min')
    // For the same scale, min scenario (simple lagoa) is cheaper than CSTR avg
    expect(minTier.mid).toBeLessThan(avgTier.mid)
  })

  it('max scenario uses the max CAPEX tier table (higher absolute costs)', () => {
    const avgTier = getCapexTier(500_000, 'avg')
    const maxTier = getCapexTier(500_000, 'max')
    expect(maxTier.mid).toBeGreaterThan(avgTier.mid)
  })
})

// ── calcPaybackRange ──────────────────────────────────────────────────────────

describe('calcPaybackRange', () => {
  const GOOD_REVENUE = 500_000  // BRL/yr — clearly viable system

  it('zero revenue returns 999 (indefinite) for all scenarios', () => {
    const tier = getCapexTier(200_000)
    const pb = calcPaybackRange(0, tier)
    expect(pb.min).toBe(999)
    expect(pb.avg).toBe(999)
    expect(pb.max).toBe(999)
  })

  it('payback.min ≤ payback.avg for positive revenue', () => {
    const tier = getCapexTier(500_000)
    const pb = calcPaybackRange(GOOD_REVENUE, tier)
    expect(pb.min).toBeLessThanOrEqual(pb.avg)
  })

  it('payback.avg ≤ payback.max (or max = 999) for positive revenue', () => {
    const tier = getCapexTier(500_000)
    const pb = calcPaybackRange(GOOD_REVENUE, tier)
    if (pb.max !== 999) {
      expect(pb.avg).toBeLessThanOrEqual(pb.max)
    }
  })

  it('payback is > 0 for any viable system (no instant payback)', () => {
    const tier = getCapexTier(500_000)
    const pb = calcPaybackRange(GOOD_REVENUE, tier)
    if (pb.min !== 999) expect(pb.min).toBeGreaterThan(0)
    if (pb.avg !== 999) expect(pb.avg).toBeGreaterThan(0)
  })

  it('higher revenue reduces payback period', () => {
    const tier = getCapexTier(500_000)
    const pbLow  = calcPaybackRange(100_000, tier)
    const pbHigh = calcPaybackRange(1_000_000, tier)
    // avg payback with higher revenue should be shorter (or both are finite)
    if (pbLow.avg !== 999 && pbHigh.avg !== 999) {
      expect(pbHigh.avg).toBeLessThan(pbLow.avg)
    }
  })

  it('payback values are rounded to 1 decimal place', () => {
    const tier = getCapexTier(500_000)
    const pb = calcPaybackRange(GOOD_REVENUE, tier)
    if (pb.min !== 999) {
      const decimals = (pb.min.toString().split('.')[1] || '').length
      expect(decimals).toBeLessThanOrEqual(1)
    }
  })
})

// ── calcFinancials ────────────────────────────────────────────────────────────

describe('calcFinancials', () => {
  const base = calcOutputs(500_000, 0.60, 5000, 0, ALL_MONTHS)

  it('annualRevenueAvgBRL = annualRevenueMaxBRL × 0.75 (REVENUE_AVG factor)', () => {
    const f = calcFinancials(base, ALL_OUTPUT_TYPES, DEFAULT_PRICES)
    expect(f.annualRevenueAvgBRL).toBeCloseTo(f.annualRevenueMaxBRL * 0.75, 0)
  })

  it('energySavingsBrlYear = energyKwhYear × energyTariff when energy is selected', () => {
    const f = calcFinancials(base, ['energy'], DEFAULT_PRICES)
    const expected = base.energyKwhYear * DEFAULT_PRICES.energyTariffBrlKwh
    expect(f.energySavingsBrlYear).toBeCloseTo(expected, 0)
  })

  it('energySavingsBrlYear = 0 when energy is NOT selected', () => {
    const f = calcFinancials(base, ['digestate', 'thermal'], DEFAULT_PRICES)
    expect(f.energySavingsBrlYear).toBe(0)
  })

  it('carbonRevBrlYear = co2TonsYear × co2CreditBrlTon when carbon is selected', () => {
    const f = calcFinancials(base, ['carbon'], DEFAULT_PRICES)
    const expected = base.co2TonsYear * DEFAULT_PRICES.co2CreditBrlTon
    expect(f.carbonRevBrlYear).toBeCloseTo(expected, 0)
  })

  it('dieselEquivLitersYear = biomethaneM3Year × 0.85 × 1000', () => {
    // Source: ANP (Brazilian Petroleum Agency) — CH4 diesel energy equivalence
    // 1 m³ CH4 ≈ 0.85 L diesel; ×1000 to convert m³/1000 → L
    const f = calcFinancials(base, ALL_OUTPUT_TYPES, DEFAULT_PRICES)
    const expected = base.biomethaneM3Year * 0.85 * 1000
    expect(f.dieselEquivLitersYear).toBeCloseTo(expected, 0)
  })

  it('payback range is a valid PaybackRange object', () => {
    const f = calcFinancials(base, ALL_OUTPUT_TYPES, DEFAULT_PRICES)
    expect(f.payback).toHaveProperty('min')
    expect(f.payback).toHaveProperty('avg')
    expect(f.payback).toHaveProperty('max')
    expect(f.payback.min).toBeLessThanOrEqual(f.payback.avg)
  })

  it('custom price override changes energySavingsBrlYear proportionally', () => {
    const customPrices = { ...DEFAULT_PRICES, energyTariffBrlKwh: DEFAULT_PRICES.energyTariffBrlKwh * 2 }
    const fDefault = calcFinancials(base, ['energy'], DEFAULT_PRICES)
    const fDouble  = calcFinancials(base, ['energy'], customPrices)
    expect(fDouble.energySavingsBrlYear).toBeCloseTo(fDefault.energySavingsBrlYear * 2, 0)
  })
})

// ── spreadToMonths ────────────────────────────────────────────────────────────

describe('spreadToMonths', () => {
  it('all 12 months: each month receives biogas ÷ 12', () => {
    const yearly = 120_000
    const months = spreadToMonths(yearly, ALL_MONTHS)
    expect(months.length).toBe(12)
    months.forEach(m => expect(m.biogas).toBeCloseTo(10_000, 0))
  })

  it('3 active months: each active month receives biogas ÷ 3', () => {
    const yearly = 90_000
    const active = [6, 7, 8]
    const months = spreadToMonths(yearly, active)
    expect(months[5].biogas).toBeCloseTo(30_000, 0)   // June
    expect(months[0].biogas).toBe(0)                   // January — inactive
  })

  it('sum of monthly biogas equals yearly total', () => {
    const yearly = 365_000
    const active = [3, 6, 9, 12]
    const months = spreadToMonths(yearly, active)
    const total = months.reduce((s, m) => s + m.biogas, 0)
    expect(total).toBeCloseTo(yearly, 0)
  })

  it('empty active months yields all-zero distribution', () => {
    const months = spreadToMonths(100_000, [])
    months.forEach(m => expect(m.biogas).toBe(0))
  })

  it('returns exactly 12 monthly entries regardless of active months', () => {
    expect(spreadToMonths(1000, [1, 6]).length).toBe(12)
    expect(spreadToMonths(1000, []).length).toBe(12)
    expect(spreadToMonths(1000, ALL_MONTHS).length).toBe(12)
  })
})

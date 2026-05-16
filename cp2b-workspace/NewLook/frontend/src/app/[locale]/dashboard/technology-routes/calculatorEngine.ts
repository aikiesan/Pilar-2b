/**
 * CP2B Biogas Viability Calculator — Pure Calculation Engine
 *
 * All functions are pure TS with no React/DOM dependencies.
 * Coefficients sourced from:
 *   - EMBRAPA, UNICA, NBR 15.527
 *   - Denis Miranda 2022 (cross-validation: cattle + corn straw BMP, Amazon context)
 *   - MAPA, CEPEA for citrus/coffee/soy residue availability factors
 *
 * Unit conventions throughout:
 *   biomass  → tonnes (metric tons)
 *   biogas   → m³/year
 *   energy   → kWh/year  (MWh/year = kWh / 1000)
 *   volume   → m³/year
 *   CO₂eq    → tCO₂eq/year
 *   money    → BRL/year
 */

// ── SP tariff constants (update periodically) ────────────────────────────────
export const SP_ENERGY_TARIFF_BRL_KWH   = 0.85   // CPFL/Enel residential avg 2025
export const SP_DIESEL_BRL_LITER        = 6.50   // SP diesel pump price 2025
export const BIOMETANO_BRL_M3           = 4.50   // indicative biomethane price SP
export const CH4_DIESEL_EQUIV_RATIO     = 0.85   // 1 m³ CH4 ≈ 0.85 L diesel
export const CO2_CREDIT_BRL_TON         = 35.0   // VCM voluntary market 2025

// ── Price configuration (used by sliders) ────────────────────────────────────
export interface PriceConfig {
  energyTariffBrlKwh: number
  biomethaneM3: number
  co2CreditBrlTon: number
  dieselBrlLiter: number
}

export const DEFAULT_PRICES: PriceConfig = {
  energyTariffBrlKwh: SP_ENERGY_TARIFF_BRL_KWH,
  biomethaneM3: BIOMETANO_BRL_M3,
  co2CreditBrlTon: CO2_CREDIT_BRL_TON,
  dieselBrlLiter: SP_DIESEL_BRL_LITER,
}

// ── Conversion constants ──────────────────────────────────────────────────────
const CH4_LHV_MJ_PER_M3   = 35.8   // Lower Heating Value of CH4, MJ/m³
const ELEC_EFFICIENCY      = 0.35   // generator set electrical efficiency
const THERMAL_EFFICIENCY   = 0.50   // heat recovery efficiency
const MJ_TO_KWH            = 1 / 3.6

// ── CAPEX reference tiers (R$, mid-point) ────────────────────────────────────
export interface CapexTier {
  label: 'Baixo' | 'Médio' | 'Alto'
  range: string
  mid: number
}
export const CAPEX_TIERS: CapexTier[] = [
  { label: 'Baixo', range: 'R$ 80k – 300k',  mid: 190_000   },
  { label: 'Médio', range: 'R$ 300k – 2M',   mid: 1_150_000 },
  { label: 'Alto',  range: 'R$ 2M – 10M+',  mid: 6_000_000 },
]

// ── Sugarcane residue streams ─────────────────────────────────────────────────
// rpr  = mass fraction of residue per tonne of raw cane input
// bmp  = Biochemical Methane Potential (m³ CH4 / tonne VS)
// vs   = volatile solids fraction (0–1)
// fde  = practical farm-level availability fraction
// ch4  = CH4 content in raw biogas (vol fraction)
export const SUGARCANE_STREAMS = {
  bagaco:  { rpr: 0.28, bmp: 350, vs: 0.88, fde: 0.20, ch4: 0.55 },
  palha:   { rpr: 0.14, bmp: 300, vs: 0.82, fde: 0.40, ch4: 0.55 },
  vinhaca: { rpr: 0.12, bmp: 350, vs: 0.02, fde: 0.90, ch4: 0.65 },
  torta:   { rpr: 0.03, bmp: 280, vs: 0.75, fde: 0.35, ch4: 0.60 },
} as const

// ── Livestock PPB (m³ biogas / head / year) ───────────────────────────────────
export const LIVESTOCK_PPB: Record<LivestockSpecies, { ppb: number; ch4: number }> = {
  swine:          { ppb: 200,  ch4: 0.65 },
  cattle_beef:    { ppb: 350,  ch4: 0.60 },
  cattle_dairy:   { ppb: 500,  ch4: 0.60 },
  poultry_eggs:   { ppb: 1.4,  ch4: 0.60 },
  poultry_meat:   { ppb: 0.8,  ch4: 0.60 },
}

// ── Livestock manure production (wet tonnes / head / year) ───────────────────
// Source: EMBRAPA Suínos e Aves (2022) — Boletim Técnico 47
// Used for digestate calculation (replaces circular biogas × 0.08 proxy)
const MANURE_TONS_PER_HEAD_YEAR: Record<LivestockSpecies, number> = {
  swine:          1.2,
  cattle_beef:    8.0,
  cattle_dairy:   18.0,
  poultry_eggs:   0.04,
  poultry_meat:   0.005,  // ~0.6 kg/cycle × 8 cycles/year; EMBRAPA Suínos e Aves 2022
}

export const LIVESTOCK_CATEGORY_SPECIES: Record<'swine' | 'cattle' | 'poultry', LivestockSpecies[]> = {
  swine:   ['swine'],
  cattle:  ['cattle_beef', 'cattle_dairy'],
  poultry: ['poultry_eggs', 'poultry_meat'],
}

// ── Crop residue params (single-stream BMP method) ───────────────────────────
// Sources: Denis Miranda 2022 (corn), EMBRAPA/MAPA (soy, coffee, citrus)
// bmp: m³ CH4 / tonne VS  |  vs: volatile solids fraction
// avail: farm-level availability fraction  |  ch4: CH4 content in biogas
export type CropType = 'corn' | 'soy' | 'coffee' | 'citrus'

export const CROP_PARAMS: Record<CropType, {
  bmp: number; vs: number; avail: number; ch4: number
  label: string; descLabel: string; source: string
}> = {
  corn:   { bmp: 320, vs: 0.83, avail: 0.50, ch4: 0.55,
            label: 'Milho (palha+sabugo)', descLabel: 'Palha e sabugo de milho',
            source: 'Denis Miranda 2022; EMBRAPA Agroenergia' },
  soy:    { bmp: 270, vs: 0.80, avail: 0.45, ch4: 0.55,
            label: 'Soja (palha)', descLabel: 'Palha de soja pós-colheita',
            source: 'MAPA 2021; Luca et al. 2020' },
  coffee: { bmp: 380, vs: 0.78, avail: 0.70, ch4: 0.58,
            label: 'Café (borra/casca)', descLabel: 'Casca e borra de café',
            source: 'EMBRAPA Café 2022; Rocha et al. 2019' },
  citrus: { bmp: 340, vs: 0.85, avail: 0.60, ch4: 0.56,
            label: 'Citros (bagaço)', descLabel: 'Bagaço de laranja/limão',
            source: 'CEPEA/USP 2021; Silveira et al. 2020' },
}

// Default harvest months per crop (used to pre-fill StepSazonalidade)
export const CROP_DEFAULT_MONTHS: Record<CropType, number[]> = {
  corn:   [7, 8, 9],           // safrinha SP
  soy:    [2, 3, 4],           // verão SP
  coffee: [6, 7, 8, 9],        // safra principal SP
  citrus: [6, 7, 8, 9, 10],   // temporada de processamento
}

// ── Types ─────────────────────────────────────────────────────────────────────
export type LivestockSpecies =
  | 'swine'
  | 'cattle_beef'
  | 'cattle_dairy'
  | 'poultry_eggs'
  | 'poultry_meat'

export type ActivityType = 'sugarcane' | 'livestock' | 'swine' | 'cattle' | 'poultry' | CropType

export type OutputType = 'energy' | 'biomethane' | 'digestate' | 'thermal' | 'biochar' | 'carbon'
export const ALL_OUTPUT_TYPES: OutputType[] = ['energy', 'biomethane', 'digestate', 'thermal', 'biochar', 'carbon']

// ── Scenario tiers ────────────────────────────────────────────────────────────
export type ScenarioTier = 'min' | 'avg' | 'max'

export interface ScenarioFactor {
  labelPt: string
  technology: string
  utilization: number   // fraction of biomass effectively processed
  startupMonths: number // months to reach full operation (kinetics curve)
  bmpFactor: number
  elecEff: number
  thermalEff: number
  biocharYield: number
}

export const SCENARIO_FACTORS: Record<ScenarioTier, ScenarioFactor> = {
  min: { labelPt: 'Básico',   technology: 'Lagoa coberta / tubular PVC',   utilization: 0.55, startupMonths: 4,  bmpFactor: 0.75, elecEff: 0.28, thermalEff: 0.40, biocharYield: 0.20 },
  avg: { labelPt: 'Ideal',    technology: 'Biodigestor CSTR',               utilization: 0.75, startupMonths: 6,  bmpFactor: 1.00, elecEff: 0.35, thermalEff: 0.50, biocharYield: 0.28 },
  max: { labelPt: 'Avançado', technology: 'CSTR + upgrading / CHP premium', utilization: 0.90, startupMonths: 10, bmpFactor: 1.20, elecEff: 0.42, thermalEff: 0.60, biocharYield: 0.35 },
}

// ── Realistic payback factors ─────────────────────────────────────────────────
// Consultancy, kinetics ramp-up, year-1 learning curve, and maintenance
// create a significant gap between theoretical and actual revenue.
const STARTUP_COST_FACTOR = 0.12     // consultancy + startup adds ~12% to effective CAPEX
const REVENUE_BEST  = 1.10           // optimistic: good tariffs, smooth operation
const REVENUE_AVG   = 0.75           // realistic: typical losses, downtime, seasonal variation
const REVENUE_WORST = 0.45           // conservative: year-1-2 learning curve, bad market
const MAINT_LOW  = 0.03              // annual maintenance as % of CAPEX (simple system)
const MAINT_MID  = 0.05              // mid-tier
const MAINT_HIGH = 0.08              // complex system with upgrading
const CAPEX_LOW_FACTOR  = 0.65       // CAPEX range bottom around tier mid
const CAPEX_HIGH_FACTOR = 1.50       // CAPEX range top around tier mid

export interface PaybackRange {
  min: number   // best case (anos)
  avg: number   // expected realistic (anos)
  max: number   // conservative (anos); 999 = Indeterminado
}

export interface SugarcaneInput {
  type: 'tons' | 'hectares'
  value: number
}

export interface LivestockInput {
  heads: Partial<Record<LivestockSpecies, number>>
}

export interface MonthlyDistribution {
  month: number
  monthLabel: string
  biogas: number
  energy: number
}

export interface OutputResult {
  totalBiogasM3Year: number
  ch4ContentWeighted: number
  energyKwhYear: number
  biomethaneM3Year: number
  digestateTonsYear: number
  thermalMjYear: number
  biocharTonsYear: number
  co2TonsYear: number
  monthly: MonthlyDistribution[]
}

export interface FinancialResult {
  annualRevenueMaxBRL: number    // nominal theoretical max
  annualRevenueAvgBRL: number    // realistic expected (REVENUE_AVG × nominal)
  capexTier: CapexTier
  payback: PaybackRange          // replaces single paybackYears
  dieselEquivLitersYear: number
  energySavingsBrlYear: number
  biomethaneRevBrlYear: number
  carbonRevBrlYear: number
}

export interface CalculationResult {
  outputs: OutputResult
  financials: FinancialResult
  selectedOutputs: OutputType[]
  inputSummary: {
    activityLabel: string
    biomassEstimateTons: number
    activeMonths: number
    activityType: ActivityType
  }
}

const MONTH_LABELS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

// ── Core functions ────────────────────────────────────────────────────────────

export function hectaresToCane(ha: number): number {
  return ha * 75
}

export function calcBiogasFromSugarcane(tonsCanaBruta: number): {
  biogasM3: number; ch4Weighted: number; biomassTotal: number; strawTons: number
} {
  let totalBiogas = 0, ch4Numerator = 0, biomassTotal = 0, strawTons = 0

  for (const [key, s] of Object.entries(SUGARCANE_STREAMS)) {
    const availableTons = tonsCanaBruta * s.rpr * s.fde
    const biogasRaw     = availableTons * s.vs * (s.bmp / s.ch4)
    totalBiogas  += biogasRaw
    ch4Numerator += biogasRaw * s.ch4
    biomassTotal += availableTons
    if (key === 'palha') strawTons = availableTons
  }

  return {
    biogasM3: totalBiogas,
    ch4Weighted: totalBiogas > 0 ? ch4Numerator / totalBiogas : 0.60,
    biomassTotal,
    strawTons,
  }
}

export function calcBiogasFromLivestock(heads: Partial<Record<LivestockSpecies, number>>): {
  biogasM3: number; ch4Weighted: number; biomassTotal: number
} {
  let totalBiogas = 0, ch4Numerator = 0, manureTotal = 0

  for (const [species, count] of Object.entries(heads) as [LivestockSpecies, number][]) {
    if (!count || count <= 0) continue
    const coeff = LIVESTOCK_PPB[species]
    const biogas = count * coeff.ppb
    totalBiogas  += biogas
    ch4Numerator += biogas * coeff.ch4
    manureTotal  += count * MANURE_TONS_PER_HEAD_YEAR[species]
  }

  return {
    biogasM3: totalBiogas,
    ch4Weighted: totalBiogas > 0 ? ch4Numerator / totalBiogas : 0.60,
    biomassTotal: manureTotal,
  }
}

export function calcBiogasFromCrop(cropType: CropType, tonnes: number): {
  biogasM3: number; ch4Weighted: number; biomassTotal: number
} {
  const p = CROP_PARAMS[cropType]
  const availTons = tonnes * p.avail
  const biogasRaw = availTons * p.vs * (p.bmp / p.ch4)
  return {
    biogasM3: biogasRaw,
    ch4Weighted: p.ch4,
    biomassTotal: availTons,
  }
}

export function spreadToMonths(biogasYearly: number, activeMonths: number[]): MonthlyDistribution[] {
  const perMonth = activeMonths.length > 0 ? biogasYearly / activeMonths.length : 0
  const activeSet = new Set(activeMonths)
  return MONTH_LABELS.map((label, idx) => {
    const m = idx + 1
    const biogas = activeSet.has(m) ? perMonth : 0
    return { month: m, monthLabel: label, biogas, energy: 0 }
  })
}

/** Compute all 6 outputs — always returns full values regardless of selection.
 *  dryLignoCellulosic: dry lignocellulosic biomass available for pyrolysis (t/ano).
 *  Pass strawTons for sugarcane, biomassTotal*0.87 for crops, 0 for livestock (manure unsuitable). */
export function calcOutputs(
  biogasM3Year: number,
  ch4Content: number,
  biomassTotal: number,
  dryLignoCellulosic: number,
  activeMonths: number[],
): OutputResult {
  const ch4M3Year = biogasM3Year * ch4Content

  const energyKwhYear  = ch4M3Year * CH4_LHV_MJ_PER_M3 * ELEC_EFFICIENCY * MJ_TO_KWH
  const biomethaneM3   = ch4M3Year
  const digestateTons  = biomassTotal * 0.75
  const thermalMjYear  = ch4M3Year * CH4_LHV_MJ_PER_M3 * THERMAL_EFFICIENCY
  const biocharTons    = dryLignoCellulosic * SCENARIO_FACTORS.avg.biocharYield
  const co2TonsYear    = ch4M3Year * 0.657 * (44 / 16) / 1000

  const monthly = spreadToMonths(biogasM3Year, activeMonths).map(m => ({
    ...m,
    energy: m.biogas * ch4Content * CH4_LHV_MJ_PER_M3 * ELEC_EFFICIENCY * MJ_TO_KWH,
  }))

  return {
    totalBiogasM3Year: biogasM3Year,
    ch4ContentWeighted: ch4Content,
    energyKwhYear,
    biomethaneM3Year: biomethaneM3,
    digestateTonsYear: digestateTons,
    thermalMjYear,
    biocharTonsYear: biocharTons,
    co2TonsYear,
    monthly,
  }
}

/** Transform a base OutputResult (computed at avg scenario) into a different scenario.
 *  Biochar scales only by pyrolysis yield ratio (independent of BMP). */
export function applyScenario(base: OutputResult, scenario: ScenarioFactor): OutputResult {
  const AVG    = SCENARIO_FACTORS.avg
  const bmpF   = scenario.bmpFactor
  const elecF  = scenario.elecEff   / AVG.elecEff
  const thermF = scenario.thermalEff / AVG.thermalEff
  const charF  = scenario.biocharYield / AVG.biocharYield
  return {
    totalBiogasM3Year:  base.totalBiogasM3Year  * bmpF,
    ch4ContentWeighted: base.ch4ContentWeighted,
    energyKwhYear:      base.energyKwhYear      * bmpF * elecF,
    biomethaneM3Year:   base.biomethaneM3Year   * bmpF,
    digestateTonsYear:  base.digestateTonsYear  * bmpF,
    thermalMjYear:      base.thermalMjYear      * bmpF * thermF,
    biocharTonsYear:    base.biocharTonsYear    * charF,
    co2TonsYear:        base.co2TonsYear        * bmpF,
    monthly: base.monthly.map(m => ({
      ...m,
      biogas: m.biogas * bmpF,
      energy: m.energy * bmpF * elecF,
    })),
  }
}

export function getCapexTier(biogasM3Year: number): CapexTier {
  if (biogasM3Year < 100_000)   return CAPEX_TIERS[0]
  if (biogasM3Year < 1_000_000) return CAPEX_TIERS[1]
  return CAPEX_TIERS[2]
}

function roundYears(y: number): number {
  return Math.round(y * 10) / 10
}

export function calcPaybackRange(annualRevNominal: number, tier: CapexTier): PaybackRange {
  if (annualRevNominal <= 0) return { min: 999, avg: 999, max: 999 }

  const cm = tier.mid
  const cl = cm * CAPEX_LOW_FACTOR
  const ch = cm * CAPEX_HIGH_FACTOR

  // Best case: low CAPEX, good revenue, minimal overhead + maintenance
  const netBest = annualRevNominal * REVENUE_BEST - cl * MAINT_LOW
  const pb_min = netBest > 0 ? (cl * (1 + 0.06)) / netBest : 999

  // Expected case: mid CAPEX, realistic revenue realization, standard maintenance
  const netAvg  = annualRevNominal * REVENUE_AVG - cm * MAINT_MID
  const pb_avg  = netAvg > 0  ? (cm * (1 + STARTUP_COST_FACTOR)) / netAvg : 999

  // Conservative case: high CAPEX, poor realization (kinetics curve, low tariffs, downtime),
  // high maintenance, extended startup overhead
  const netWorst = annualRevNominal * REVENUE_WORST - ch * MAINT_HIGH
  const pb_max  = netWorst > 0 ? Math.min((ch * 1.25) / netWorst, 40) : 999

  return {
    min: pb_min < 999 ? roundYears(Math.max(pb_min, 0.5)) : 999,
    avg: pb_avg < 999 ? roundYears(pb_avg) : 999,
    max: pb_max >= 40  ? 999 : roundYears(pb_max),
  }
}

/**
 * Calculate financial indicators from computed outputs.
 * selectedOutputs controls which revenue streams are shown in the display breakdown,
 * but payback is always computed from the full economic potential (energy + carbon)
 * so that selecting only digestate/heat/biochar doesn't collapse payback to 999.
 * prices allows overriding SP 2025 defaults (used by sliders in ResultsDashboard).
 */
export function calcFinancials(
  outputs: OutputResult,
  selectedOutputs: OutputType[] = ALL_OUTPUT_TYPES,
  prices: PriceConfig = DEFAULT_PRICES,
): FinancialResult {
  // Full potential revenue — used for payback (system viability is independent of display choice)
  const energyFull    = outputs.energyKwhYear    * prices.energyTariffBrlKwh
  const biomethFull   = outputs.biomethaneM3Year * prices.biomethaneM3
  const carbonFull    = outputs.co2TonsYear      * prices.co2CreditBrlTon
  const primaryFull   = energyFull > 0 ? energyFull : biomethFull
  const annualRevMax  = primaryFull + carbonFull

  // Filtered revenue — only selected outputs, for display breakdown
  const useEnergy     = selectedOutputs.includes('energy')
  const useBiomethane = selectedOutputs.includes('biomethane')
  const useCarbon     = selectedOutputs.includes('carbon')
  const energySavings = useEnergy     ? energyFull  : 0
  const biomethaneRev = useBiomethane ? biomethFull : 0
  const carbonRev     = useCarbon     ? carbonFull  : 0

  const dieselEquiv   = outputs.biomethaneM3Year * CH4_DIESEL_EQUIV_RATIO * 1000
  const tier          = getCapexTier(outputs.totalBiogasM3Year)
  const payback       = calcPaybackRange(annualRevMax, tier)

  return {
    annualRevenueMaxBRL:  annualRevMax,
    annualRevenueAvgBRL:  annualRevMax * REVENUE_AVG,
    capexTier:            tier,
    payback,
    dieselEquivLitersYear: dieselEquiv,
    energySavingsBrlYear:  energySavings,
    biomethaneRevBrlYear:  biomethaneRev,
    carbonRevBrlYear:      carbonRev,
  }
}

// ── Main entry point ──────────────────────────────────────────────────────────

const LIVESTOCK_ACTIVITY_TYPES = new Set<ActivityType>(['livestock', 'swine', 'cattle', 'poultry'])
const LIVESTOCK_CATEGORY_LABEL: Record<string, string> = {
  livestock: 'Pecuária', swine: 'Suínos', cattle: 'Bovinos', poultry: 'Aves',
}

export function runCalculation(
  activityType: ActivityType,
  sugarcaneInput: SugarcaneInput | null,
  livestockInput: LivestockInput | null,
  activeMonths: number[],
  selectedOutputs: OutputType[],
  cropInput?: { tonnes: number },
): CalculationResult {
  let biogasM3 = 0, ch4 = 0.60, biomass = 0, dryLigno = 0, activityLabel = ''

  if (activityType === 'sugarcane' && sugarcaneInput) {
    const tonsRaw = sugarcaneInput.type === 'hectares'
      ? hectaresToCane(sugarcaneInput.value)
      : sugarcaneInput.value
    const r = calcBiogasFromSugarcane(tonsRaw)
    biogasM3 = r.biogasM3; ch4 = r.ch4Weighted; biomass = r.biomassTotal
    dryLigno = r.strawTons * SUGARCANE_STREAMS.palha.vs
    activityLabel = `Cana-de-açúcar (${sugarcaneInput.type === 'hectares'
      ? sugarcaneInput.value + ' ha'
      : tonsRaw.toLocaleString('pt-BR') + ' t'})`

  } else if (LIVESTOCK_ACTIVITY_TYPES.has(activityType) && livestockInput) {
    const catKey = activityType as 'livestock' | 'swine' | 'cattle' | 'poultry'
    const speciesFilter = catKey === 'livestock'
      ? null
      : LIVESTOCK_CATEGORY_SPECIES[catKey as 'swine' | 'cattle' | 'poultry']
    const heads: Partial<Record<LivestockSpecies, number>> = speciesFilter
      ? Object.fromEntries(
          speciesFilter
            .filter(s => (livestockInput.heads[s] ?? 0) > 0)
            .map(s => [s, livestockInput.heads[s]])
        )
      : livestockInput.heads
    const r = calcBiogasFromLivestock(heads)
    biogasM3 = r.biogasM3; ch4 = r.ch4Weighted; biomass = r.biomassTotal
    dryLigno = 0
    activityLabel = `Pecuária — ${LIVESTOCK_CATEGORY_LABEL[catKey]}`

  } else if (cropInput && activityType in CROP_PARAMS) {
    const r = calcBiogasFromCrop(activityType as CropType, cropInput.tonnes)
    biogasM3 = r.biogasM3; ch4 = r.ch4Weighted; biomass = r.biomassTotal
    const p = CROP_PARAMS[activityType as CropType]
    dryLigno = biomass * p.vs
    activityLabel = `${p.label} (${cropInput.tonnes.toLocaleString('pt-BR')} t)`
  }

  const outputs    = calcOutputs(biogasM3, ch4, biomass, dryLigno, activeMonths)
  const financials = calcFinancials(outputs, selectedOutputs)

  return {
    outputs,
    financials,
    selectedOutputs,
    inputSummary: {
      activityLabel,
      biomassEstimateTons: biomass,
      activeMonths: activeMonths.length,
      activityType,
    },
  }
}

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
interface CapexTier {
  label: 'Baixo' | 'Médio' | 'Alto'
  range: string
  mid: number
}
const CAPEX_TIERS: CapexTier[] = [
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

export type ActivityType = 'sugarcane' | 'livestock' | CropType

export type OutputType = 'energy' | 'biomethane' | 'digestate' | 'thermal' | 'biochar' | 'carbon'
export const ALL_OUTPUT_TYPES: OutputType[] = ['energy', 'biomethane', 'digestate', 'thermal', 'biochar', 'carbon']

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
  annualRevenueMaxBRL: number
  capexTier: CapexTier
  paybackYears: number
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
  let totalBiogas = 0, ch4Numerator = 0

  for (const [species, count] of Object.entries(heads) as [LivestockSpecies, number][]) {
    if (!count || count <= 0) continue
    const coeff = LIVESTOCK_PPB[species]
    const biogas = count * coeff.ppb
    totalBiogas  += biogas
    ch4Numerator += biogas * coeff.ch4
  }

  return {
    biogasM3: totalBiogas,
    ch4Weighted: totalBiogas > 0 ? ch4Numerator / totalBiogas : 0.60,
    biomassTotal: totalBiogas * 0.08,
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

/** Compute all 6 outputs — always returns full values regardless of selection. */
export function calcOutputs(
  biogasM3Year: number,
  ch4Content: number,
  biomassTotal: number,
  strawTons: number,
  activeMonths: number[],
): OutputResult {
  const ch4M3Year = biogasM3Year * ch4Content

  const energyKwhYear  = ch4M3Year * CH4_LHV_MJ_PER_M3 * ELEC_EFFICIENCY * MJ_TO_KWH
  const biomethaneM3   = ch4M3Year
  const digestateTons  = biomassTotal * 0.75
  const thermalMjYear  = ch4M3Year * CH4_LHV_MJ_PER_M3 * THERMAL_EFFICIENCY
  const biocharTons    = strawTons * 0.30
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

export function getCapexTier(biogasM3Year: number): CapexTier {
  if (biogasM3Year < 100_000)   return CAPEX_TIERS[0]
  if (biogasM3Year < 1_000_000) return CAPEX_TIERS[1]
  return CAPEX_TIERS[2]
}

/**
 * Calculate financial indicators from computed outputs.
 * selectedOutputs controls which revenue streams count toward payback.
 * prices allows overriding SP 2025 defaults (used by sliders in ResultsDashboard).
 */
export function calcFinancials(
  outputs: OutputResult,
  selectedOutputs: OutputType[] = ALL_OUTPUT_TYPES,
  prices: PriceConfig = DEFAULT_PRICES,
): FinancialResult {
  const useEnergy     = selectedOutputs.includes('energy')
  const useBiomethane = selectedOutputs.includes('biomethane')
  const useCarbon     = selectedOutputs.includes('carbon')

  const energySavings  = useEnergy     ? outputs.energyKwhYear    * prices.energyTariffBrlKwh : 0
  const biomethaneRev  = useBiomethane ? outputs.biomethaneM3Year * prices.biomethaneM3       : 0
  const carbonRev      = useCarbon     ? outputs.co2TonsYear      * prices.co2CreditBrlTon    : 0
  const dieselEquiv    = outputs.biomethaneM3Year * CH4_DIESEL_EQUIV_RATIO * 1000

  const primaryRev   = energySavings > 0 ? energySavings : biomethaneRev
  const annualRevMax = primaryRev + carbonRev
  const tier         = getCapexTier(outputs.totalBiogasM3Year)
  const payback      = annualRevMax > 0 ? tier.mid / annualRevMax : 999

  return {
    annualRevenueMaxBRL:  annualRevMax,
    capexTier:            tier,
    paybackYears:         Math.round(payback * 10) / 10,
    dieselEquivLitersYear: dieselEquiv,
    energySavingsBrlYear:  energySavings,
    biomethaneRevBrlYear:  biomethaneRev,
    carbonRevBrlYear:      carbonRev,
  }
}

// ── Main entry point ──────────────────────────────────────────────────────────

export function runCalculation(
  activityType: ActivityType,
  sugarcaneInput: SugarcaneInput | null,
  livestockInput: LivestockInput | null,
  activeMonths: number[],
  selectedOutputs: OutputType[],
  cropInput?: { tonnes: number },
): CalculationResult {
  let biogasM3 = 0, ch4 = 0.60, biomass = 0, straw = 0, activityLabel = ''

  if (activityType === 'sugarcane' && sugarcaneInput) {
    const tonsRaw = sugarcaneInput.type === 'hectares'
      ? hectaresToCane(sugarcaneInput.value)
      : sugarcaneInput.value
    const r = calcBiogasFromSugarcane(tonsRaw)
    biogasM3 = r.biogasM3; ch4 = r.ch4Weighted; biomass = r.biomassTotal; straw = r.strawTons
    activityLabel = `Cana-de-açúcar (${sugarcaneInput.type === 'hectares'
      ? sugarcaneInput.value + ' ha'
      : tonsRaw.toLocaleString('pt-BR') + ' t'})`

  } else if (activityType === 'livestock' && livestockInput) {
    const r = calcBiogasFromLivestock(livestockInput.heads)
    biogasM3 = r.biogasM3; ch4 = r.ch4Weighted; biomass = r.biomassTotal
    const speciesList = Object.entries(livestockInput.heads)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => `${v?.toLocaleString('pt-BR')} ${k}`)
      .join(', ')
    activityLabel = `Pecuária (${speciesList})`

  } else if (cropInput && activityType in CROP_PARAMS) {
    const r = calcBiogasFromCrop(activityType as CropType, cropInput.tonnes)
    biogasM3 = r.biogasM3; ch4 = r.ch4Weighted; biomass = r.biomassTotal
    const p = CROP_PARAMS[activityType as CropType]
    activityLabel = `${p.label} (${cropInput.tonnes.toLocaleString('pt-BR')} t)`
  }

  const outputs    = calcOutputs(biogasM3, ch4, biomass, straw, activeMonths)
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

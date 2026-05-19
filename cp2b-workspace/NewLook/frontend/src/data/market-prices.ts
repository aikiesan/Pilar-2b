/**
 * São Paulo state market baseline prices (2025–2026) and biogas conversion factors.
 * Used as defaults when users haven't entered custom tariffs.
 */

export const SP_MARKET_BASELINES = {
  electricity:  0.68,   // R$/kWh  — CPFL Paulista industrial 2025
  biomethane:   3.00,   // R$/m³   — Comgás CP 2025, paridade mercado veicular
  fertilizer:  215.00,  // R$/ton  — digestato total, MFRural SP
  heat:         45.00,  // R$/GJ   — paridade gás natural SP
  carbon:       50.00,  // R$/tCO₂ — mercado voluntário, PwC/Capital Reset 2025
} as const;

export type TariffKey = keyof typeof SP_MARKET_BASELINES;

/** Physical conversion factors from biogas volume to each output stream */
export const CONVERSION = {
  biogasToElec:       1.43,   // kWh elétrico / m³ biogás (CHP ~24% eficiência elétrica)
  biogasToMethane:    0.60,   // m³ CH₄ / m³ biogás (concentração média)
  biogasToHeat:       0.021,  // GJ térmico / m³ biogás
  residueToDigestate: 0.85,   // ton digestato / ton resíduo fresco
  biogasToCO2:        0.00075,// tCO₂ capturado / m³ biogás (captura parcial)
} as const;

/** Business outcome definitions — single source of truth for wizard + sidebar */
export const BUSINESS_OUTCOMES = [
  {
    id: 'elec',
    icon: '⚡',
    labelKey: 'outcome_elec_label' as const,
    descKey:  'outcome_elec_desc'  as const,
    unit: 'kWh',
    priceKey: 'electricity' as TariffKey,
  },
  {
    id: 'fuel',
    icon: '🚗',
    labelKey: 'outcome_fuel_label' as const,
    descKey:  'outcome_fuel_desc'  as const,
    unit: 'm³ CH₄',
    priceKey: 'biomethane' as TariffKey,
  },
  {
    id: 'heat',
    icon: '♨️',
    labelKey: 'outcome_heat_label' as const,
    descKey:  'outcome_heat_desc'  as const,
    unit: 'GJ',
    priceKey: 'heat' as TariffKey,
  },
  {
    id: 'fert',
    icon: '🌱',
    labelKey: 'outcome_fert_label' as const,
    descKey:  'outcome_fert_desc'  as const,
    unit: 'ton',
    priceKey: 'fertilizer' as TariffKey,
  },
  {
    id: 'co2',
    icon: '💨',
    labelKey: 'outcome_co2_label' as const,
    descKey:  'outcome_co2_desc'  as const,
    unit: 'tCO₂',
    priceKey: 'carbon' as TariffKey,
  },
] as const;

/** Maps each business outcome to the database tech IDs it requires on the canvas */
export const OUTCOME_TO_TECH_IDS: Record<string, string[]> = {
  elec: ['end_cogen'],
  fuel: ['end_vehicle_fuel'],  // upgrading tech is prepended separately
  heat: ['end_boiler'],
  fert: ['byp_digestate'],
  co2:  ['byp_co2'],
};

/** Default purification tech when the user selects 'fuel' without choosing one */
export const DEFAULT_UPGRADING_TECH = 'upg_membrane';

/** Upgrading tech options for the purification secondary step */
export const UPGRADING_OPTIONS = [
  { id: 'upg_membrane',         icon: '🧬', labelKey: 'upg_membrane'          },
  { id: 'upg_psa',              icon: '🔬', labelKey: 'upg_psa'               },
  { id: 'upg_water_scrubbing',  icon: '💦', labelKey: 'upg_water_scrubbing'   },
  { id: 'upg_chemical_scrubbing', icon: '⚗️', labelKey: 'upg_chemical_scrubbing' },
] as const;

/** Compute the physical yield and R$ revenue for one business outcome */
export function calcOutcome(
  outcomeId: string,
  adjustedBiogasM3: number,
  amountTonsAdjusted: number,
  prices: Partial<Record<TariffKey, number>>
): { qty: number; revenue: number } {
  const price = (k: TariffKey) => prices[k] ?? SP_MARKET_BASELINES[k];

  switch (outcomeId) {
    case 'elec': {
      const kWh = adjustedBiogasM3 * CONVERSION.biogasToElec;
      return { qty: kWh, revenue: kWh * price('electricity') };
    }
    case 'fuel': {
      const m3 = adjustedBiogasM3 * CONVERSION.biogasToMethane;
      return { qty: m3, revenue: m3 * price('biomethane') };
    }
    case 'heat': {
      const gj = adjustedBiogasM3 * CONVERSION.biogasToHeat;
      return { qty: gj, revenue: gj * price('heat') };
    }
    case 'fert': {
      const ton = amountTonsAdjusted * CONVERSION.residueToDigestate;
      return { qty: ton, revenue: ton * price('fertilizer') };
    }
    case 'co2': {
      const tco2 = adjustedBiogasM3 * CONVERSION.biogasToCO2;
      return { qty: tco2, revenue: tco2 * price('carbon') };
    }
    default:
      return { qty: 0, revenue: 0 };
  }
}

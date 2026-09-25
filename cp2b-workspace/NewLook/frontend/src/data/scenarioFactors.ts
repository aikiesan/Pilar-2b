/**
 * Per-residue scenario multipliers for the map visualization.
 *
 * Derived from the backend canonical per-stream output
 * (compute_sp_canonical_totals.py → sp_canonical_by_stream.csv), normalised so the
 * map BASELINE = the "Médio Prazo" (realista) scenario = 1.0 per residue.
 * Each factor is scenario_biogas / medio_biogas for that residue's stream(s):
 *   - conservador  = min / medio
 *   - fronteira     = (medio + 0.5·(max−medio)) / medio   ← "Fronteira do Biogás"
 *   - otimista      = max / medio
 *
 * Applied per-municipality to each *_biogas_m3_year field, so each municipality
 * responds according to its own residue mix (NOT a uniform multiplier). Biomass
 * tonnage is unaffected — scenarios change availability, not the resource.
 *
 * State-level check (sum across SP): biogás Base/Médio≈6.5, Fronteira≈16.4,
 * Otimista≈26.3 Mm³/d — Fronteira surpasses the FIESP benchmark (~11.7 biogás / 6.4 biometano).
 */
/**
 * `real` and `ideal` are a DIFFERENT KIND of scenario from the four below, and
 * the distinction matters when reading the map.
 *
 * The original four are parameter bands: they pick min/medio/max off the served
 * BMP uncertainty, so they answer "how good could the chemistry be?".
 *
 * Real and Ideal come from the backend (migration 026, columns ch4_real_m3_year
 * and ch4_ideal_m3_year) and answer "how much of the resource actually reaches a
 * digester?". They follow the Atlas de Bioenergia SP 2020 definitions: Real uses
 * today's collection rates and competing uses; Ideal assumes 100% of what is
 * GENERATED is collected — an infrastructure frontier, with identical chemistry.
 * Every coefficient behind them is auditable in the scenario_parameters table.
 *
 * Because they are served whole rather than multiplied client-side, they are NOT
 * in SCENARIO_RESIDUE_FACTORS and applyScenarioToProps leaves them untouched.
 *
 * `cp2b_n3` and `cp2b_n4` are served the same way but come from ANOTHER METHOD
 * (migration 034): the CP2b cascade, reference scenario. N3 is the mobilisable
 * potential — the CP2b headline — and N4 the accessible one, after storage losses
 * and the spatial logistic factor on the road network. They are not a third and
 * fourth Atlas tier: sugarcane includes the surplus bagasse the Atlas excludes,
 * and there is no aquaculture or forestry stream. They share the served
 * machinery because their columns follow the same ch4_{tier}_{residue}_m3_year
 * shape, so the residue filter and the sector bars work unchanged.
 */
export type MapScenarioKey =
  | 'baseline'
  | 'conservador'
  | 'fronteira'
  | 'otimista'
  | 'real'
  | 'ideal'
  | 'cp2b_n3'
  | 'cp2b_n4';

/** Scenarios served whole by the backend rather than derived from a band. */
export const SERVED_SCENARIOS = ['real', 'ideal', 'cp2b_n3', 'cp2b_n4'] as const;
export type ServedScenarioKey = (typeof SERVED_SCENARIOS)[number];

export function isServedScenario(s: MapScenarioKey): s is ServedScenarioKey {
  return (SERVED_SCENARIOS as readonly string[]).includes(s);
}

/** The two CP2b tiers — a different method from the Atlas Real/Ideal pair. */
export function isCp2bScenario(s: MapScenarioKey): s is 'cp2b_n3' | 'cp2b_n4' {
  return s === 'cp2b_n3' || s === 'cp2b_n4';
}

/** Municipality property holding the CH₄ total for a served scenario. */
export const SERVED_SCENARIO_FIELD: Record<ServedScenarioKey, string> = {
  real: 'ch4_real_m3_year',
  ideal: 'ch4_ideal_m3_year',
  cp2b_n3: 'ch4_cp2b_n3_m3_year',
  cp2b_n4: 'ch4_cp2b_n4_m3_year',
};

/**
 * Municipality property holding ONE residue's share of a served scenario
 * (migration 029; emitted by municipalities.py's _SCENARIO_RESIDUE_COLUMNS).
 *
 * The backend carries thirteen residues, the map's filter offers twelve —
 * `forestry` is computed and stored but not selectable. So the sum
 * over the selected residues does NOT reconcile to `SERVED_SCENARIO_FIELD` even
 * when every checkbox is ticked, and it should not: the filter is a slice of the
 * total, not a decomposition of it.
 */
export const SERVED_SCENARIO_RESIDUE_FIELD = (
  tier: ServedScenarioKey,
  residue: string
): string => `ch4_${tier}_${residue}_m3_year`;

/** CH₄ fraction of raw biogas — FIESP 2025, matching the backend constant. */
export const CH4_FRACTION_OF_BIOGAS = 0.625;

/**
 * CH₄ fraction of raw biogas per served tier. Real/Ideal follow the FIESP
 * convention above. CP2b uses substrate-specific fractions; the map carries only
 * CH₄, so it applies the state-wide mix of each level (Table T2 of the v5.1
 * article: 34.05 M Nm³/day of biogas for 19.18 of CH₄). The state total then
 * matches the article exactly; a single municipality is approximate.
 */
export const SERVED_CH4_FRACTION_OF_BIOGAS: Record<ServedScenarioKey, number> = {
  real: CH4_FRACTION_OF_BIOGAS,
  ideal: CH4_FRACTION_OF_BIOGAS,
  cp2b_n3: 0.5634,
  cp2b_n4: 0.5638,
};

/**
 * Biomethane per unit of CH₄. Under the FIESP convention the two are equal.
 * CP2b deducts a 1% upgrading loss and delivers a 96% CH₄ product: 0.99 / 0.96.
 */
export const SERVED_BIOMETHANE_PER_CH4: Record<ServedScenarioKey, number> = {
  real: 1,
  ideal: 1,
  cp2b_n3: 0.99 / 0.96,
  cp2b_n4: 0.99 / 0.96,
};
/** Methane LHV in kWh/Nm³ — Bueno et al. 2016, matching the backend constant. */
export const CH4_LHV_KWH_M3 = 9.94;

/** The four band scenarios — the only ones that carry per-residue multipliers. */
export type BandScenarioKey = 'baseline' | 'conservador' | 'fronteira' | 'otimista';

export const SCENARIO_RESIDUE_FACTORS: Record<string, Record<BandScenarioKey, number>> = {
  sugarcane: { baseline: 1.0, conservador: 0.235, fronteira: 2.208, otimista: 3.417 },
  citrus:    { baseline: 1.0, conservador: 0.217, fronteira: 2.071, otimista: 3.142 },
  soybean:   { baseline: 1.0, conservador: 0.073, fronteira: 2.504, otimista: 4.008 },
  corn:      { baseline: 1.0, conservador: 0.104, fronteira: 1.869, otimista: 2.737 },
  coffee:    { baseline: 1.0, conservador: 0.328, fronteira: 1.799, otimista: 2.599 },
  cattle:    { baseline: 1.0, conservador: 0.083, fronteira: 4.862, otimista: 8.725 },
  swine:     { baseline: 1.0, conservador: 0.093, fronteira: 3.203, otimista: 5.406 },
  poultry:   { baseline: 1.0, conservador: 0.241, fronteira: 2.173, otimista: 3.345 },
  aquaculture: { baseline: 1.0, conservador: 1.0, fronteira: 1.0, otimista: 1.0 },
  rsu:       { baseline: 1.0, conservador: 0.196, fronteira: 2.349, otimista: 3.698 },
  rpo:       { baseline: 1.0, conservador: 0.025, fronteira: 6.273, otimista: 11.547 },
};

/**
 * Scenarios OFFERED in the map selector.
 *
 * Only Real and Ideal. The four band scenarios (conservador, baseline,
 * fronteira, otimista) were removed from the UI: they interpolate the BMP
 * uncertainty band, which answers "how good could the chemistry be?" — a
 * question the platform should settle on the reader's behalf, not delegate to a
 * toggle. Real and Ideal answer the question a reader actually has, follow the
 * Atlas de Bioenergia SP 2020 definitions, and are the pair published in the
 * comparative literature.
 *
 * The four keys remain in MapScenarioKey and in SCENARIO_RESIDUE_FACTORS so that
 * bookmarked ?scenario= URLs still resolve rather than crashing, and so the band
 * machinery in mapValues keeps compiling. They are simply not offered.
 */
export const MAP_SCENARIOS: { key: MapScenarioKey; color: string }[] = [
  { key: 'real', color: '#0F766E' },
  { key: 'ideal', color: '#7C3AED' },
  // CP2b method (migration 034). Offered after the Atlas pair, not instead of it.
  { key: 'cp2b_n3', color: '#B45309' },
  { key: 'cp2b_n4', color: '#9F1239' },
];

/** Scenario the map opens on. Real is the defensible short-term figure. */
export const DEFAULT_MAP_SCENARIO: MapScenarioKey = 'real';

/** Scenario key → swatch colour. Derived from MAP_SCENARIOS so the selector,
 *  the legend and the tooltip can never show different colours for the same tier. */
export const SCENARIO_COLOR: Record<MapScenarioKey, string> = Object.fromEntries(
  MAP_SCENARIOS.map(({ key, color }) => [key, color])
) as Record<MapScenarioKey, string>;

// Scenario names are copy: short labels live in messages as Map.scenario_<key>,
// tooltips as Map.scenario_<key>_tip.

// Residue keys whose *_biogas_m3_year fields get scaled, in sector groups.
export const SCENARIO_SECTOR_RESIDUES: Record<'agricultural' | 'livestock' | 'urban', string[]> = {
  agricultural: ['sugarcane', 'citrus', 'soybean', 'corn', 'coffee'],
  livestock: ['cattle', 'swine', 'poultry', 'aquaculture'],
  urban: ['rsu', 'rpo', 'sewage'],
};

/** Scale a municipality properties object's biogas fields by the scenario. Returns a new object. */
export function applyScenarioToProps<T extends Record<string, unknown>>(
  props: T,
  scenario: MapScenarioKey
): T {
  // Real and Ideal are served whole by the backend; scaling the legacy per-residue
  // fields by a factor they have no entry for would silently zero them.
  if (scenario === 'baseline' || isServedScenario(scenario)) return props;
  const out: Record<string, unknown> = { ...props };
  const sectorTotals: Record<string, number> = { agricultural: 0, livestock: 0, urban: 0 };
  let total = 0;
  for (const [sector, residues] of Object.entries(SCENARIO_SECTOR_RESIDUES)) {
    for (const r of residues) {
      const field = `${r}_biogas_m3_year`;
      const base = Number((props as Record<string, unknown>)[field]) || 0;
      const factor = SCENARIO_RESIDUE_FACTORS[r]?.[scenario as BandScenarioKey] ?? 1.0;
      const scaled = base * factor;
      out[field] = scaled;
      sectorTotals[sector] += scaled;
      total += scaled;
    }
    out[`${sector}_biogas_m3_year`] = sectorTotals[sector];
  }
  out.total_biogas_m3_year = total;
  return out as T;
}

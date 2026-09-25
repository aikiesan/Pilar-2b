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
 * Real and Ideal answer "how much of the resource actually reaches a digester?"
 * and follow the CP2b method (migration 034, view municipality_cp2b_map), its
 * reference scenario, through the same factor cascade:
 *   N1 theoretical -> x FC -> N2 technical -> x FCo - existing use -> N3
 *   mobilisable -> x FS x FL (spatial, road network) -> N4 accessible.
 * Real is N4, the whole cascade; Ideal is N3, before storage losses and the
 * spatial logistic factor. They used to be the Atlas de Bioenergia SP 2020
 * pair (migration 026); those columns stay in the database but are no longer
 * served. The CP2b residue set has no aquaculture or forestry stream, and its
 * sugarcane includes the surplus bagasse the Atlas excluded.
 *
 * The UI keys stay `real`/`ideal` so bookmarked ?scenario= URLs and presets keep
 * resolving; the payload fields keep the method's own names
 * (ch4_cp2b_n4_*, ch4_cp2b_n3_*) so a column never holds one quantity under
 * another's name. SERVED_SOURCE_TIER is the one place the two are joined.
 *
 * Because they are served whole rather than multiplied client-side, they are NOT
 * in SCENARIO_RESIDUE_FACTORS and applyScenarioToProps leaves them untouched.
 */
export type MapScenarioKey =
  | 'baseline'
  | 'conservador'
  | 'fronteira'
  | 'otimista'
  | 'real'
  | 'ideal';

/** Scenarios served whole by the backend rather than derived from a band. */
export const SERVED_SCENARIOS = ['real', 'ideal'] as const;
export type ServedScenarioKey = (typeof SERVED_SCENARIOS)[number];

export function isServedScenario(s: MapScenarioKey): s is ServedScenarioKey {
  return (SERVED_SCENARIOS as readonly string[]).includes(s);
}

/** CP2b level whose columns back each served scenario: Real = N4, Ideal = N3. */
export const SERVED_SOURCE_TIER: Record<ServedScenarioKey, 'cp2b_n4' | 'cp2b_n3'> = {
  real: 'cp2b_n4',
  ideal: 'cp2b_n3',
};

/**
 * The residues CP2b models — the ones a served share can exist for. The map's
 * filter also offers aquaculture, which the method does not model: selecting
 * only that paints no data, never a measured zero.
 */
export const SERVED_RESIDUES: readonly string[] = [
  'sugarcane',
  'soybean',
  'corn',
  'coffee',
  'citrus',
  'cattle',
  'swine',
  'poultry',
  'rsu',
  'rpo',
  'sewage',
];

/** Municipality property holding the CH₄ total for a served scenario. */
export const SERVED_SCENARIO_FIELD: Record<ServedScenarioKey, string> = {
  real: 'ch4_cp2b_n4_m3_year',
  ideal: 'ch4_cp2b_n3_m3_year',
};

/**
 * Municipality property holding the raw-BIOGAS total for a served scenario:
 * the method's own equivalent, summed from each substrate's CH₄ fraction
 * (0.52 RSU … 0.68 sewage). Served, never CH₄ over one state-wide fraction —
 * that matched the state total but put swine 15% and sewage 21% high.
 */
export const SERVED_SCENARIO_BIOGAS_FIELD: Record<ServedScenarioKey, string> = {
  real: 'biogas_cp2b_n4_m3_year',
  ideal: 'biogas_cp2b_n3_m3_year',
};

/**
 * Municipality property holding ONE residue's share of a served scenario
 * (the view's ch4_cp2b_{n3,n4}_{residue}_m3_year columns).
 *
 * The method carries eleven residues. The map's filter also offers aquaculture,
 * which CP2b does not model, so selecting it alone paints no data. The residue
 * shares sum to the municipality total: CP2b groups every one of its 17
 * substrates under one of these eleven.
 */
export const SERVED_SCENARIO_RESIDUE_FIELD = (
  tier: ServedScenarioKey,
  residue: string
): string => `ch4_${SERVED_SOURCE_TIER[tier]}_${residue}_m3_year`;

/** One residue's raw-biogas equivalent under a served scenario (served, see above). */
export const SERVED_SCENARIO_RESIDUE_BIOGAS_FIELD = (
  tier: ServedScenarioKey,
  residue: string
): string => `biogas_${SERVED_SOURCE_TIER[tier]}_${residue}_m3_year`;

/** CH₄ fraction of raw biogas — FIESP 2025, matching the backend constant. */
export const CH4_FRACTION_OF_BIOGAS = 0.625;

/**
 * Biomethane per unit of CH₄. CP2b deducts a 1% upgrading loss and delivers a
 * 96% CH₄ product: 0.99 / 0.96. Unlike the biogas fraction this is the same for
 * every substrate (1.03125 on all 32,895 rows), so a constant is exact here.
 */
export const SERVED_BIOMETHANE_PER_CH4: Record<ServedScenarioKey, number> = {
  real: 0.99 / 0.96,
  ideal: 0.99 / 0.96,
};

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
 * toggle. Real and Ideal answer the question a reader actually has, and both
 * come from the CP2b cascade (N4 and N3).
 *
 * The four keys remain in MapScenarioKey and in SCENARIO_RESIDUE_FACTORS so that
 * bookmarked ?scenario= URLs still resolve rather than crashing, and so the band
 * machinery in mapValues keeps compiling. They are simply not offered.
 */
export const MAP_SCENARIOS: { key: MapScenarioKey; color: string }[] = [
  { key: 'real', color: '#0F766E' },
  { key: 'ideal', color: '#7C3AED' },
];

/** Scenario the map opens on. Real (CP2b N4) is the defensible short-term figure. */
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
  // Served scenarios come whole from the backend; scaling the legacy per-residue
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

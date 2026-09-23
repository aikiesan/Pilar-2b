/**
 * Colour scales for the two beta choropleth modes, defined once — the same
 * mistake that split the C:N scale across two files is easy to repeat here.
 *
 * `tipologia` is categorical: 7 dominant-residue families. Colours are chosen
 * to read as materials, not as a ranking — sugarcane green, forestry dark
 * green, livestock warm brown, urban grey-blue — so no class looks "better".
 *
 * `regime` is a 3-class diverging scale on the same axis as the C:N ramp:
 * nitrogen-deficient blue, balanced green, nitrogen-excess amber. Deliberately
 * the same colour language as cnScale.ts, because it is the same underlying
 * story read at a coarser grain.
 *
 * Class counts over SP+MG (n=1498), for reference when checking a render:
 *   tipologia — livestock 599 · sugarcane 389 · mixed 266 · forestry 98 ·
 *               urban 88 · grains 54 · coffee 4
 *   regime    — N-deficit 799 · sweet 389 · N-excess 310
 *
 * The backend's class values are identifiers (the typology ones happen to be
 * Portuguese words). They are matched here and mapped to catalog keys —
 * Map.typology.classes.<key> and Map.typology.regime.<key> — never displayed.
 */

export type TipologiaKey = 'livestock' | 'sugarcane' | 'mixed' | 'forestry' | 'urban' | 'grains' | 'coffee';
export type RegimeKey = 'n_deficit' | 'sweet' | 'n_excess';

/**
 * The exact strings the canonical engine writes — do not "tidy" them — mapped
 * to catalog keys, in legend order: most municipalities first, so the eye
 * starts where the map is.
 */
export const TIPOLOGIA_KEY: Record<string, TipologiaKey> = {
  'Pecuário': 'livestock',
  'Cana-de-açúcar': 'sugarcane',
  'Misto/diversificado': 'mixed',
  'Florestal': 'forestry',
  'Urbano — RSU e esgoto': 'urban',
  'Grãos e resíduos agroindustriais': 'grains',
  'Café': 'coffee',
};

const TIPOLOGIA_KEY_COLORS: Record<TipologiaKey, string> = {
  sugarcane: '#16a34a',
  livestock: '#b45309',
  mixed: '#7c3aed',
  forestry: '#14532d',
  urban: '#475569',
  grains: '#eab308',
  coffee: '#9a3412',
};

/**
 * Keys are the raw values stored in `regime_harm`, which come from the
 * validation dossier's vocabulary — a C:N reading, not a dominance one:
 * N-deficit is C:N > 30 (carbon-heavy, short of nitrogen), sweet is the stable
 * 20-30 window, N-excess is C:N < 20. High C:N to low, following the scale.
 *
 * The older `regime` column said C-dominante / Equilibrado / N-dominante over
 * the same thresholds, but it was computed from the arithmetic mean and
 * misclassified 31% of São Paulo (PR #213). Same colours, new keys, so a stale
 * value cannot accidentally pick up a colour and pass for current.
 */
export const REGIME_KEY: Record<string, RegimeKey> = {
  'N-deficit': 'n_deficit',
  'sweet': 'sweet',
  'N-excess': 'n_excess',
};

const REGIME_KEY_COLORS: Record<RegimeKey, string> = {
  n_deficit: '#3b82f6',
  sweet: '#15803d',
  n_excess: '#d97706',
};

/** Fill for a municipality with no typology row. Never a real class colour. */
export const TYPOLOGY_NO_DATA_COLOR = '#e5e7eb';

/** Backend values in legend order. */
export const TIPOLOGIA_ORDER = Object.keys(TIPOLOGIA_KEY);
export const REGIME_ORDER = Object.keys(REGIME_KEY);

/** Backend value → colour, for the legend swatches. */
export const TIPOLOGIA_COLORS: Record<string, string> = Object.fromEntries(
  TIPOLOGIA_ORDER.map((value) => [value, TIPOLOGIA_KEY_COLORS[TIPOLOGIA_KEY[value]]])
);
export const REGIME_COLORS: Record<string, string> = Object.fromEntries(
  REGIME_ORDER.map((value) => [value, REGIME_KEY_COLORS[REGIME_KEY[value]]])
);

export function tipologiaColor(value: string | null | undefined): string {
  if (!value) return TYPOLOGY_NO_DATA_COLOR;
  return TIPOLOGIA_COLORS[value] ?? TYPOLOGY_NO_DATA_COLOR;
}

export function regimeColor(value: string | null | undefined): string {
  if (!value) return TYPOLOGY_NO_DATA_COLOR;
  return REGIME_COLORS[value] ?? TYPOLOGY_NO_DATA_COLOR;
}

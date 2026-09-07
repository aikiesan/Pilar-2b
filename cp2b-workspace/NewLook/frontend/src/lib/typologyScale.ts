/**
 * Colour scales for the two beta choropleth modes, defined once — the same
 * mistake that split the C:N scale across two files is easy to repeat here.
 *
 * `tipologia` is categorical: 7 dominant-residue families. Colours are chosen
 * to read as materials, not as a ranking — sugarcane green, forestry dark
 * green, livestock warm brown, urban grey-blue — so no class looks "better".
 *
 * `regime` is a 3-class diverging scale on the same axis as the C:N ramp:
 * C-dominante blue, Equilibrado green, N-dominante amber. Deliberately the
 * same colour language as cnScale.ts, because it is the same underlying story
 * read at a coarser grain.
 *
 * Class counts over SP+MG (n=1498), for reference when checking a render:
 *   tipologia — Pecuário 599 · Cana 389 · Misto 266 · Florestal 98 ·
 *               Urbano 88 · Grãos 54 · Café 4
 *   regime    — C-dominante 799 · Equilibrado 389 · N-dominante 310
 */

/** Keys are the exact strings the canonical engine writes; do not "tidy" them. */
export const TIPOLOGIA_COLORS: Record<string, string> = {
  'Cana-de-açúcar': '#16a34a',
  'Pecuário': '#b45309',
  'Misto/diversificado': '#7c3aed',
  'Florestal': '#14532d',
  'Urbano — RSU e esgoto': '#475569',
  'Grãos e resíduos agroindustriais': '#eab308',
  'Café': '#9a3412',
};

export const REGIME_COLORS: Record<string, string> = {
  'C-dominante': '#3b82f6',
  'Equilibrado': '#15803d',
  'N-dominante': '#d97706',
};

/** Fill for a municipality with no typology row. Never a real class colour. */
export const TYPOLOGY_NO_DATA_COLOR = '#e5e7eb';

/** Legend order — most municipalities first, so the eye starts where the map is. */
export const TIPOLOGIA_ORDER = [
  'Pecuário',
  'Cana-de-açúcar',
  'Misto/diversificado',
  'Florestal',
  'Urbano — RSU e esgoto',
  'Grãos e resíduos agroindustriais',
  'Café',
];

export const REGIME_ORDER = ['C-dominante', 'Equilibrado', 'N-dominante'];

export function tipologiaColor(value: string | null | undefined): string {
  if (!value) return TYPOLOGY_NO_DATA_COLOR;
  return TIPOLOGIA_COLORS[value] ?? TYPOLOGY_NO_DATA_COLOR;
}

export function regimeColor(value: string | null | undefined): string {
  if (!value) return TYPOLOGY_NO_DATA_COLOR;
  return REGIME_COLORS[value] ?? TYPOLOGY_NO_DATA_COLOR;
}

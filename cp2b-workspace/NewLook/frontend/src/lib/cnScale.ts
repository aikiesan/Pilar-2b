/**
 * The C:N colour scale — one definition, consumed by both the choropleth layer
 * and the legend. It used to be two hand-kept copies of the same hex array in
 * CnChoroLayer.tsx and MapComponent.tsx, which is how they drifted apart.
 *
 * Breaks. 20 and 30 are methodological, not visual: they are the optimal
 * co-digestion window, and the backend uses the same two numbers
 * (CN_OPTIMAL_LOW / CN_OPTIMAL_HIGH in codigestion_service.py). The optimal
 * band is the one saturated green in an otherwise diverging amber→blue ramp,
 * so "which municipalities are already balanced" reads at a glance.
 *
 * The upper breaks (40, 55) are distributional, chosen against the real SP+MG
 * cn_molar spread (n=1498, 11.4–67.4) so no class collapses:
 *   <20: 310 · 20–30: 389 · 30–40: 194 · 40–55: 266 · >55: 339
 *
 * The previous scale put 20–40 in a single "balanced" class, which swallowed
 * 583 of 1498 municipalities and read as optimal when half of it is not.
 */

export interface CnBand {
  /** Inclusive lower bound; the first band starts at -Infinity. */
  min: number;
  color: string;
  /** i18n key under Map.cnLegend. */
  labelKey: string;
}

/** Ordered low → high. */
export const CN_BANDS: CnBand[] = [
  { min: -Infinity, color: '#d97706', labelKey: 'n_rich' },   // amber-600 — N-rich
  { min: 20,        color: '#15803d', labelKey: 'optimal' },  // green-700 — the target window
  { min: 30,        color: '#93c5fd', labelKey: 'c_slight' }, // blue-300
  { min: 40,        color: '#3b82f6', labelKey: 'c_mod' },    // blue-500
  { min: 55,        color: '#1e3a8a', labelKey: 'c_rich' },   // blue-900 — C-rich
];

/** Fill for a municipality with no C:N on record. Never green: absent ≠ optimal. */
export const CN_NO_DATA_COLOR = '#e5e7eb';

export const CN_OPTIMAL_LOW = 20;
export const CN_OPTIMAL_HIGH = 30;

export function cnColor(cn: number | null | undefined): string {
  if (cn == null || !Number.isFinite(cn)) return CN_NO_DATA_COLOR;
  let color = CN_BANDS[0].color;
  for (const band of CN_BANDS) {
    if (cn >= band.min) color = band.color;
  }
  return color;
}

/** True inside the 20–30 co-digestion window. */
export function isCnOptimal(cn: number | null | undefined): boolean {
  return cn != null && cn >= CN_OPTIMAL_LOW && cn < CN_OPTIMAL_HIGH;
}

/** Legend rows, high → low, the order a vertical legend reads. */
export const CN_LEGEND_ROWS = [...CN_BANDS].reverse();

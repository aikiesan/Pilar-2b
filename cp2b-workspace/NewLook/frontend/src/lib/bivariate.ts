/**
 * Bivariate colour for /explore/map: two indicators, three classes each, nine
 * fills (docs/planning/EXPLORE_MAPA_PARA_FERRAMENTA.md, §1 and §4).
 *
 * This module only reads from mapMetrics.ts (NO_DATA_FILL) and gives nothing
 * back to it: the /map choropleth and its invariants stay untouched. The same
 * municipality can sit in a different class here than on /map, which spaces
 * its breaks logarithmically; the legend writes the method and the breaks so
 * the two are never confused.
 *
 * Classes arrive precomputed in public/bivar/v1/ind/<id>.bin (one byte per
 * municipality); classifyValue mirrors the generator so the legend, the tests
 * and the generator agree on which side of a break a value falls.
 */

import { NO_DATA_FILL } from './mapMetrics';

/** Class byte for "no data": either axis with it paints NO_DATA_FILL. */
export const CLASS_NO_DATA = 255;
/**
 * Class byte for a measured zero in a tertile indicator: outside the population
 * the tertiles were cut from, but a known fact, so it is painted as class 0 —
 * grey would claim ignorance about something we know.
 */
export const CLASS_ZERO = 253;

export type AxisClass = 0 | 1 | 2;

/** How an indicator's three classes are cut (`classes.json`, per indicator). */
export type ClassMethod =
  /** Tertiles over the non-zero population; zero is CLASS_ZERO. For continuous values. */
  | 'tertile_nonzero'
  /** Fixed 0 · 1 · 2+, breaks [1, 2]. Tertiles of small counts collapse into ties. */
  | 'fixed_count';

export const CLASS_METHODS: readonly ClassMethod[] = ['tertile_nonzero', 'fixed_count'];

/** The two inner breaks; a value equal to a break belongs to the class above it. */
export type Breaks = readonly [number, number];

export const FIXED_COUNT_BREAKS: Breaks = [1, 2];

/**
 * Class byte for a value, as the generator writes it. Same boundary rule as
 * getMetricColor (`v < break` → lower class), so a value sitting on a break
 * goes up on both maps.
 */
export function classifyValue(value: number | null, breaks: Breaks, method: ClassMethod): number {
  if (value === null || !Number.isFinite(value)) return CLASS_NO_DATA;
  if (method === 'tertile_nonzero' && value === 0) return CLASS_ZERO;
  if (value < breaks[0]) return 0;
  if (value < breaks[1]) return 1;
  return 2;
}

/** The class a byte paints as, or null for no data (and for any byte the format does not define). */
export function axisClass(code: number): AxisClass | null {
  if (code === 0 || code === 1 || code === 2) return code;
  if (code === CLASS_ZERO) return 0;
  return null;
}

/** Cell 0–8 of the 3×3 matrix (`cy * 3 + cx`), or null when either axis has no data. */
export function bivariateCell(xCode: number, yCode: number): number | null {
  const cx = axisClass(xCode);
  const cy = axisClass(yCode);
  if (cx === null || cy === null) return null;
  return cy * 3 + cx;
}

/**
 * The nine fills, indexed by cell (`cy * 3 + cx`): row y0 first. Cream is
 * neither; saturated yellow (x2, y0: much substrate, no infrastructure) is the
 * gap, the policy message; blue is infrastructure without substrate; dark green
 * is both. The matrix does not change with the theme: a printed legend stays
 * valid and the figure keeps its identity.
 */
// i18n-exempt: colour values, not copy
export const BIVARIATE_FILLS: readonly string[] = [
  '#ecece1', '#e5d491', '#d8b42d', // y0: little infrastructure
  '#98bdc6', '#94ab80', '#8b9127', // y1
  '#136482', '#135a54', '#124c1a', // y2: much infrastructure
];

/**
 * Blue × warm brown, for the colour-vision setting (useCvdPalette). Built as
 * the multiply blend of a brown x ramp (#f3f3f3, #e2b68a, #a35f22) and a blue
 * y ramp (#f3f3f3, #a6c6e0, #3b78b0), so each row and column still reads as one
 * hue getting stronger.
 */
// i18n-exempt: colour values, not copy
export const BIVARIATE_FILLS_CVD: readonly string[] = [
  '#e8e8e8', '#d7ad84', '#9b5b20',
  '#9ebdd5', '#938d79', '#6a4a1e',
  '#3872a8', '#34565f', '#262d17',
];

export type BivariatePalette = 'default' | 'cvd';

export function bivariateFills(palette: BivariatePalette = 'default'): readonly string[] {
  return palette === 'cvd' ? BIVARIATE_FILLS_CVD : BIVARIATE_FILLS;
}

/** Fill for a municipality from its two class bytes. */
export function bivariateFill(xCode: number, yCode: number, palette: BivariatePalette = 'default'): string {
  const cell = bivariateCell(xCode, yCode);
  return cell === null ? NO_DATA_FILL : bivariateFills(palette)[cell];
}

// ── Contrast (WCAG 2.x) ────────────────────────────────────────────────────

/** The two inks a legend cell can carry, for its label and its focus ring. */
export const INK_DARK = '#111827';
export const INK_LIGHT = '#ffffff';

/** Minimum contrast for a label on a cell (WCAG 1.4.3, normal text). */
export const MIN_LABEL_CONTRAST = 4.5;
/** Minimum contrast for the focus ring against its cell (WCAG 1.4.11). */
export const MIN_FOCUS_CONTRAST = 3;

function channel(hex: string, i: number): number {
  const c = parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16) / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Relative luminance of a `#rrggbb` colour. */
export function relativeLuminance(hex: string): number {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) throw new Error(`not a #rrggbb colour: ${hex}`);
  return 0.2126 * channel(hex, 0) + 0.7152 * channel(hex, 1) + 0.0722 * channel(hex, 2);
}

/** WCAG contrast ratio between two `#rrggbb` colours, 1–21. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((p, q) => q - p);
  return (hi + 0.05) / (lo + 0.05);
}

/** The ink (label and focus ring) for a cell: whichever of the two contrasts more. */
export function cellInk(fill: string): string {
  return contrastRatio(fill, INK_DARK) >= contrastRatio(fill, INK_LIGHT) ? INK_DARK : INK_LIGHT;
}

// ── Collinearity guard ─────────────────────────────────────────────────────

/**
 * Above this |ρ| a pair is refused. Biogas, methane, biomethane and bioenergy
 * are constant multiples of one another: crossed, every municipality falls on
 * the diagonal and the map manufactures a finding.
 */
export const MAX_PAIR_RHO = 0.95;

/** Whether a pair is worth a bivariate map. An unknown ρ (no overlap) is refused too. */
export function pairIsInformative(rho: number | null): boolean {
  return rho !== null && Number.isFinite(rho) && Math.abs(rho) <= MAX_PAIR_RHO;
}

/** 1-based ranks with ties averaged. */
function ranks(values: number[]): number[] {
  const order = values.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
  const out = new Array<number>(values.length);
  for (let start = 0; start < order.length; ) {
    let end = start;
    while (end + 1 < order.length && order[end + 1][0] === order[start][0]) end++;
    const rank = (start + end) / 2 + 1;
    for (let k = start; k <= end; k++) out[order[k][1]] = rank;
    start = end + 1;
  }
  return out;
}

/**
 * Spearman's ρ over the municipalities where both values are known: Pearson on
 * tie-averaged ranks, as scipy.stats.spearmanr computes it, so the client agrees
 * with the ρ the generator records for the curated pairs. Null with fewer than
 * three such municipalities or when either side is constant.
 */
export function spearmanRho(xs: ArrayLike<number>, ys: ArrayLike<number>): number | null {
  if (xs.length !== ys.length) throw new Error(`spearmanRho: lengths differ (${xs.length} vs ${ys.length})`);
  const x: number[] = [];
  const y: number[] = [];
  for (let i = 0; i < xs.length; i++) {
    if (Number.isFinite(xs[i]) && Number.isFinite(ys[i])) {
      x.push(xs[i]);
      y.push(ys[i]);
    }
  }
  if (x.length < 3) return null;
  const rx = ranks(x);
  const ry = ranks(y);
  const mean = (x.length + 1) / 2; // ranks 1..n always average (n + 1) / 2
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < rx.length; i++) {
    const dx = rx[i] - mean;
    const dy = ry[i] - mean;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  if (sxx === 0 || syy === 0) return null;
  return sxy / Math.sqrt(sxx * syy);
}

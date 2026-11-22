/**
 * Locks the bivariate colour of /explore/map: the boundary rule shared with
 * /map, the two sentinels, nine distinct cells in both palettes, and label and
 * focus-ring contrast on every cell.
 */

import {
  BIVARIATE_FILLS,
  BIVARIATE_FILLS_CVD,
  CLASS_NO_DATA,
  CLASS_ZERO,
  FIXED_COUNT_BREAKS,
  MAX_PAIR_RHO,
  MIN_FOCUS_CONTRAST,
  MIN_LABEL_CONTRAST,
  axisClass,
  bivariateCell,
  bivariateFill,
  cellInk,
  classifyValue,
  contrastRatio,
  pairIsInformative,
  spearmanRho,
  type Breaks,
} from './bivariate';
import { NO_DATA_FILL, getMetricColor, getMetricSpec, type MetricSpec } from './mapMetrics';

describe('classifyValue', () => {
  const breaks: Breaks = [10, 20];

  it('puts a value on a break in the class above, as getMetricColor does', () => {
    const ramp = ['#000000', '#000001', '#000002'];
    const spec: MetricSpec = { ...getMetricSpec('biomass_tons'), ramp, toDisplay: (v: number) => v };
    for (const v of [0.5, 9.999, 10, 10.001, 19.999, 20, 20.001, 1e9]) {
      const onMap = ramp.indexOf(getMetricColor(v, spec, false, undefined, [...breaks]));
      expect(classifyValue(v, breaks, 'tertile_nonzero')).toBe(onMap);
    }
  });

  it('marks a measured zero apart in tertiles, and as class 0 in counts', () => {
    expect(classifyValue(0, breaks, 'tertile_nonzero')).toBe(CLASS_ZERO);
    expect(classifyValue(0, FIXED_COUNT_BREAKS, 'fixed_count')).toBe(0);
  });

  it('classes counts as 0 · 1 · 2+', () => {
    expect([0, 1, 2, 3, 40].map((v) => classifyValue(v, FIXED_COUNT_BREAKS, 'fixed_count'))).toEqual([0, 1, 2, 2, 2]);
  });

  it('gives no data for null, NaN and infinities', () => {
    for (const v of [null, NaN, Infinity, -Infinity]) {
      expect(classifyValue(v, breaks, 'tertile_nonzero')).toBe(CLASS_NO_DATA);
      expect(classifyValue(v, FIXED_COUNT_BREAKS, 'fixed_count')).toBe(CLASS_NO_DATA);
    }
  });
});

describe('cells and fills', () => {
  it('paints a measured zero as class 0, not grey', () => {
    expect(axisClass(CLASS_ZERO)).toBe(0);
    expect(bivariateFill(CLASS_ZERO, CLASS_ZERO)).toBe(BIVARIATE_FILLS[0]);
    expect(bivariateFill(CLASS_ZERO, CLASS_ZERO)).not.toBe(NO_DATA_FILL);
  });

  it('paints no data when either axis has none, or an undefined byte', () => {
    expect(bivariateFill(CLASS_NO_DATA, 2)).toBe(NO_DATA_FILL);
    expect(bivariateFill(1, CLASS_NO_DATA)).toBe(NO_DATA_FILL);
    expect(bivariateFill(7, 1)).toBe(NO_DATA_FILL);
    expect(bivariateCell(254, 0)).toBeNull();
  });

  it('indexes cell = cy * 3 + cx, with the gap (x2, y0) saturated yellow', () => {
    for (let cy = 0; cy < 3; cy++) for (let cx = 0; cx < 3; cx++) expect(bivariateCell(cx, cy)).toBe(cy * 3 + cx);
    expect(bivariateFill(2, 0)).toBe('#d8b42d');
    expect(bivariateFill(2, 2)).toBe('#124c1a');
  });

  it.each([
    ['default', BIVARIATE_FILLS],
    ['cvd', BIVARIATE_FILLS_CVD],
  ] as const)('%s palette: nine distinct #rrggbb fills, none of them the no-data grey', (palette, fills) => {
    expect(fills).toHaveLength(9);
    expect(new Set(fills.map((f) => f.toLowerCase())).size).toBe(9);
    for (const f of fills) {
      expect(f).toMatch(/^#[0-9a-f]{6}$/i);
      expect(f.toLowerCase()).not.toBe(NO_DATA_FILL);
    }
    expect(bivariateFill(1, 1, palette)).toBe(fills[4]);
  });
});

describe('contrast', () => {
  it('computes WCAG ratios', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#777777', '#777777')).toBe(1);
    expect(() => contrastRatio('red', '#ffffff')).toThrow();
  });

  it.each([...BIVARIATE_FILLS, ...BIVARIATE_FILLS_CVD])('cell %s carries a readable label and a visible focus ring', (fill) => {
    const ratio = contrastRatio(fill, cellInk(fill));
    expect(ratio).toBeGreaterThanOrEqual(MIN_LABEL_CONTRAST);
    expect(ratio).toBeGreaterThanOrEqual(MIN_FOCUS_CONTRAST);
  });
});

describe('collinearity guard', () => {
  it('computes Spearman ρ with ties averaged, as scipy does, skipping unknown values', () => {
    // scipy.stats.spearmanr([1, 2, 2, 3, 5], [2, 1, 3, 3, 6]).statistic
    const x = [1, 2, 2, 3, 5, NaN, 4];
    const y = [2, 1, 3, 3, 6, 1, NaN];
    expect(spearmanRho(x, y)).toBeCloseTo(0.7631578947368421, 12);
    expect(spearmanRho(new Float32Array(x), new Float32Array(y))).toBeCloseTo(0.7631578947368421, 12);
  });

  it('sees a constant multiple as perfectly collinear, and refuses it', () => {
    const methane = [3, 1, 4, 1, 5, 9, 2, 6];
    const bioenergy = methane.map((v) => v * 0.00997);
    const rho = spearmanRho(methane, bioenergy);
    expect(rho).toBeCloseTo(1, 12);
    expect(pairIsInformative(rho)).toBe(false);
    expect(pairIsInformative(-0.99)).toBe(false);
  });

  it('accepts a pair at the threshold and refuses an unknown ρ', () => {
    expect(pairIsInformative(MAX_PAIR_RHO)).toBe(true);
    expect(pairIsInformative(0.3)).toBe(true);
    expect(pairIsInformative(null)).toBe(false);
    expect(spearmanRho([1, 2], [2, 1])).toBeNull();
    expect(spearmanRho([1, 1, 1], [1, 2, 3])).toBeNull();
    expect(() => spearmanRho([1, 2, 3], [1, 2])).toThrow();
  });
});

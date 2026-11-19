/**
 * The artifact readers must throw on any misalignment: every array is matched
 * to order.json by position alone, so a silent off-by-one would paint the
 * wrong municipality.
 */

import { CLASS_NO_DATA, CLASS_ZERO } from './bivariate';
import {
  INDICATOR_BYTES_PER_MUNICIPALITY,
  assertGeometryOrder,
  checkClasses,
  parseClasses,
  parseIndicator,
  parseOrder,
  type IndicatorClasses,
} from './bivariateArtifacts';

interface Row {
  cls: number;
  prov: number;
  value: number;
}

/** Packs rows exactly as the generator writes ind/<id>.bin. */
function pack(rows: Row[]): ArrayBuffer {
  const n = rows.length;
  const buf = new ArrayBuffer(n * INDICATOR_BYTES_PER_MUNICIPALITY);
  const bytes = new Uint8Array(buf);
  const view = new DataView(buf);
  rows.forEach((r, i) => {
    bytes[i] = r.cls;
    bytes[n + i] = r.prov;
    view.setFloat32(2 * n + 4 * i, r.value, true);
  });
  return buf;
}

// Odd N on purpose: the float32 block then starts off a 4-byte boundary.
const ROWS: Row[] = [
  { cls: 0, prov: 0, value: 4.5 },
  { cls: CLASS_ZERO, prov: 0, value: 0 },
  { cls: 1, prov: 1, value: 12 },
  { cls: 2, prov: 2, value: 31.25 },
  { cls: CLASS_NO_DATA, prov: 3, value: NaN },
];

describe('parseIndicator', () => {
  it('reads the three arrays back, at an odd N', () => {
    const { classes, provenance, values } = parseIndicator(pack(ROWS), ROWS.length, 'ch4_real_m3_day');
    expect(Array.from(classes)).toEqual(ROWS.map((r) => r.cls));
    expect(Array.from(provenance)).toEqual(ROWS.map((r) => r.prov));
    expect(Array.from(values.slice(0, 4))).toEqual([4.5, 0, 12, 31.25]);
    expect(Number.isNaN(values[4])).toBe(true);
  });

  it('is 33,426 bytes for the 5,571 municipalities', () => {
    expect(5571 * INDICATOR_BYTES_PER_MUNICIPALITY).toBe(33_426);
  });

  it('throws on a size that does not match N, instead of misaligning', () => {
    const buf = pack(ROWS);
    expect(() => parseIndicator(buf, ROWS.length + 1, 'x')).toThrow(/ind\/x\.bin: 30 bytes, expected 36/);
    expect(() => parseIndicator(buf, ROWS.length - 1)).toThrow(/expected 24/);
    expect(() => parseIndicator(buf.slice(1), ROWS.length)).toThrow();
  });

  it.each<[string, Row]>([
    ['an undefined class byte', { cls: 7, prov: 0, value: 1 }],
    ['an undefined provenance byte', { cls: 1, prov: 4, value: 1 }],
    ['no-data class with a value', { cls: CLASS_NO_DATA, prov: 3, value: 2 }],
    ['no-data provenance with a class', { cls: 1, prov: 3, value: NaN }],
    ['NaN with a class', { cls: 1, prov: 0, value: NaN }],
    ['an infinite value', { cls: 2, prov: 0, value: Infinity }],
    ['a measured zero that is not zero', { cls: CLASS_ZERO, prov: 0, value: 0.5 }],
  ])('throws on %s', (_label, bad) => {
    const rows = [...ROWS];
    rows[2] = bad;
    expect(() => parseIndicator(pack(rows), rows.length)).toThrow(/position 2/);
  });
});

describe('checkClasses', () => {
  const spec: IndicatorClasses = { method: 'tertile_nonzero', breaks: [10, 20], unit: 'm3_day' };

  it('agrees with the stored classes when the breaks produced them', () => {
    expect(checkClasses(parseIndicator(pack(ROWS), ROWS.length), spec)).toBe(-1);
  });

  it('points at the first municipality whose class the breaks do not give', () => {
    const rows = [...ROWS];
    rows[3] = { cls: 1, prov: 0, value: 20 }; // on the break: belongs to class 2
    expect(checkClasses(parseIndicator(pack(rows), rows.length), spec)).toBe(3);
  });
});

describe('parseOrder', () => {
  it('accepts ascending 7-digit codes', () => {
    expect(parseOrder(['1100015', '3509502', '5300108'])).toHaveLength(3);
  });

  it.each([
    ['empty', []],
    ['not an array', { 0: '1100015' }],
    ['a number', [1100015]],
    ['a 6-digit code', ['110001']],
    ['a repeat', ['1100015', '1100015']],
    ['descending', ['3509502', '1100015']],
  ])('rejects %s', (_label, json) => {
    expect(() => parseOrder(json)).toThrow(/order\.json/);
  });
});

describe('parseClasses', () => {
  const valid = () => ({
    indicators: {
      ch4_real_m3_day: { method: 'tertile_nonzero', breaks: [120.5, 980], unit: 'm3_day', stats: { n: 5000 } },
      plants_biogas_count: { method: 'fixed_count', breaks: [1, 2], unit: 'count' },
    },
    pairs: { lacuna: { x: 'ch4_real_m3_day', y: 'plants_biogas_count', rho: 0.41 } },
  });

  it('accepts the contract and lets extra fields through', () => {
    const parsed = parseClasses(valid());
    expect(parsed.pairs.lacuna.rho).toBe(0.41);
    expect(parsed.indicators.ch4_real_m3_day.breaks).toEqual([120.5, 980]);
  });

  it.each<[string, (c: ReturnType<typeof valid>) => void]>([
    ['an unknown method', (c) => ((c.indicators.ch4_real_m3_day as { method: string }).method = 'quantile')],
    ['descending breaks', (c) => (c.indicators.ch4_real_m3_day.breaks = [980, 120.5])],
    ['one break', (c) => (c.indicators.ch4_real_m3_day.breaks = [980])],
    ['a missing unit', (c) => (c.indicators.ch4_real_m3_day.unit = '')],
    ['a pair over an unlisted indicator', (c) => (c.pairs.lacuna.y = 'dist_pipeline_km')],
    ['a pair of one indicator with itself', (c) => (c.pairs.lacuna.y = 'ch4_real_m3_day')],
    ['ρ out of range', (c) => (c.pairs.lacuna.rho = 1.2)],
  ])('rejects %s', (_label, mutate) => {
    const c = valid();
    mutate(c);
    expect(() => parseClasses(c)).toThrow(/classes\.json/);
  });

  it('rejects a file without indicators or pairs', () => {
    expect(() => parseClasses(null)).toThrow(/classes\.json/);
    expect(() => parseClasses({ pairs: {} })).toThrow(/indicators/);
    expect(() => parseClasses({ indicators: {} })).toThrow(/pairs/);
  });
});

describe('assertGeometryOrder', () => {
  const order = ['1100015', '3509502', '5300108'];

  it('accepts features in order.json order', () => {
    expect(() => assertGeometryOrder(order, [...order])).not.toThrow();
  });

  it('throws on a count or a position that differs', () => {
    expect(() => assertGeometryOrder(order, order.slice(0, 2))).toThrow(/2 features, expected 3/);
    expect(() => assertGeometryOrder(order, ['1100015', '5300108', '3509502'])).toThrow(/feature 1/);
  });
});

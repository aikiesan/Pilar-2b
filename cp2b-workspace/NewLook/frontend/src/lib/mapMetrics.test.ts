/**
 * Guards the metric registry: the four choropleth metrics must read the right
 * served fields, convert to the right display units, bucket into the right
 * colours, and the daltonic palette must actually swap in. If a metric is
 * mis-wired (e.g. biomethane reading biogas), these fail.
 */

import type { DisplayMetric } from '@/types/geospatial';
import type { MunicipalityProperties } from '@/types/geospatial';
import {
  DISPLAY_METRICS,
  METRIC_SPECS,
  getMetricColor,
  getMetricSpec,
  legendItems,
  formatMetricValue,
  RAMP_DEFAULT,
  RAMP_DALTONIC,
  RAMP_TIERS,
  computeAdaptiveBreaks,
  CVD_PALETTES,
  DEFAULT_CVD_PALETTE,
  ZERO_FILL,
} from './mapMetrics';
import { MWH_PER_M3_CH4 } from './mapValues';

const props = (o: Record<string, unknown>): MunicipalityProperties =>
  o as unknown as MunicipalityProperties;

const ctx = (scenario = 'baseline' as const) => ({
  biomassType: 'total' as const,
  selectedResidues: [],
  scenario,
});

describe('mapMetrics — registry wiring', () => {
  it('offers four toggles — methane is served but not surfaced', () => {
    expect(DISPLAY_METRICS).toEqual([
      'biomass_tons',
      'biogas_m3',
      'biomethane_m3',
      'bioenergy_mwh',
    ]);
  });

  it('keeps the methane spec resolvable for bookmarked URLs', () => {
    // Not a toggle, but ?metric=methane_m3 must not fall over, and bioenergia
    // reads this band.
    expect(METRIC_SPECS.methane_m3.rawValue).toBeDefined();
    expect(getMetricSpec('methane_m3' as DisplayMetric).unit).toBe('Nm³/dia');
  });

  it('biomass reads served tonnage (t/ano, no conversion)', () => {
    const p = props({ total_biomass_tons_year: 12_000, total_biomass_coverage: 'measured' });
    const v = METRIC_SPECS.biomass_tons.rawValue(p, ctx());
    expect(v.value).toBe(12_000);
    expect(METRIC_SPECS.biomass_tons.toDisplay(12_000)).toBe(12_000);
  });

  it('biogas reads the RAW biogas band, not the methane band', () => {
    // These are different quantities: raw biogas still carries the CO2, so it is
    // ~1.8x the methane figure. Reading biogas_ch4 here is what made
    // biomethane/"biogás" look like 0.97 instead of ~0.53.
    const p = props({
      biogas_medio_m3_yr: 365_000,
      biogas_ch4_medio_m3_yr: 200_000,
      total_biomass_coverage: 'estimated',
    });
    const v = METRIC_SPECS.biogas_m3.rawValue(p, ctx());
    expect(v.value).toBe(365_000);
    expect(METRIC_SPECS.biogas_m3.toDisplay(365_000)).toBe(1_000); // 365k/yr → 1000/day
  });

  it('metano reads the CH4 band', () => {
    const p = props({
      biogas_medio_m3_yr: 365_000,
      biogas_ch4_medio_m3_yr: 200_000,
      total_biomass_coverage: 'estimated',
    });
    expect(METRIC_SPECS.methane_m3.rawValue(p, ctx()).value).toBe(200_000);
  });

  it('bioenergia converts METHANE, never raw biogas', () => {
    // 9.97 kWh/m³ is the calorific value of pure methane; raw biogas is ~45% CO2
    // and carries no energy, so applying it there would inflate by ~1.8x.
    const p = props({
      biogas_medio_m3_yr: 365_000,
      biogas_ch4_medio_m3_yr: 200_000,
      total_biomass_coverage: 'estimated',
    });
    expect(METRIC_SPECS.bioenergy_mwh.rawValue(p, ctx()).value).toBeCloseTo(200_000 * 0.00997, 6);
  });

  it('biomethane reads its OWN served field, not biogas', () => {
    const p = props({
      biogas_ch4_medio_m3_yr: 999_999,
      biomethane_medio_m3_yr: 73_000,
      total_biomass_coverage: 'estimated',
    });
    const v = METRIC_SPECS.biomethane_m3.rawValue(p, ctx());
    expect(v.value).toBe(73_000);
    expect(METRIC_SPECS.biomethane_m3.toDisplay(73_000)).toBe(200); // Nm³/dia
  });

  it('bioenergy = biogas CH4 × 0.00997 MWh/m³ (MWh/ano)', () => {
    const p = props({ biogas_ch4_medio_m3_yr: 1_000_000, total_biomass_coverage: 'estimated' });
    const v = METRIC_SPECS.bioenergy_mwh.rawValue(p, ctx());
    expect(v.value).toBeCloseTo(1_000_000 * MWH_PER_M3_CH4, 3);
    expect(METRIC_SPECS.bioenergy_mwh.toDisplay(9970)).toBe(9970); // already MWh/yr
  });

  it('getMetricSpec falls back to biomass for an unknown key', () => {
    expect(getMetricSpec('nope' as never).key).toBe('biomass_tons');
  });
});

describe('mapMetrics — scenario band picking (via biogas)', () => {
  const p = props({
    biogas_min_m3_yr: 100,
    biogas_medio_m3_yr: 200,
    biogas_max_m3_yr: 400,
    total_biomass_coverage: 'estimated',
  });
  const raw = (s: 'conservador' | 'baseline' | 'otimista' | 'fronteira') =>
    METRIC_SPECS.biogas_m3.rawValue(p, ctx(s as 'baseline')).value;

  it('conservador→min, baseline→medio, otimista→max', () => {
    expect(raw('conservador')).toBe(100);
    expect(raw('baseline')).toBe(200);
    expect(raw('otimista')).toBe(400);
  });
  it('fronteira is the midpoint of medio and max', () => {
    expect(raw('fronteira')).toBe(300); // 200 + 0.5*(400-200)
  });
});

describe('mapMetrics — residue selection reaches the paint', () => {
  // The registry is the path the choropleth actually takes (MunicipalityLayer →
  // metricSpec.rawValue). The context already carried selectedResidues; the
  // scenario metrics dropped it on the floor, so picking a residue changed which
  // polygons were drawn but never what colour they got.
  const p = props({
    ch4_real_m3_year: 1_000,
    ch4_real_sugarcane_m3_year: 600,
    ch4_real_cattle_m3_year: 300,
  });
  const withResidues = (metric: DisplayMetric, r: string[]) =>
    METRIC_SPECS[metric].rawValue(p, { ...ctx('real' as 'baseline'), selectedResidues: r as never })
      .value;

  it('every scenario metric narrows to the selected shares', () => {
    expect(withResidues('biomethane_m3', ['sugarcane'])).toBe(600);
    expect(withResidues('methane_m3', ['sugarcane', 'cattle'])).toBe(900);
    expect(withResidues('bioenergy_mwh', ['cattle'])).toBeCloseTo(300 * MWH_PER_M3_CH4, 6);
    expect(withResidues('biogas_m3', ['cattle'])).toBeCloseTo(300 / 0.625, 6);
  });

  it('an empty selection still reads the municipality total', () => {
    expect(withResidues('biomethane_m3', [])).toBe(1_000);
  });
});

describe('mapMetrics — colour bucketing + daltonic', () => {
  const spec = METRIC_SPECS.biomass_tons;
  const TOP = RAMP_TIERS - 1;

  it('buckets low→high across the eight default tiers', () => {
    const [b0, b1] = spec.breaks;
    expect(getMetricColor(b0 / 2, spec, false)).toBe(RAMP_DEFAULT[0]);
    expect(getMetricColor((b0 + b1) / 2, spec, false)).toBe(RAMP_DEFAULT[1]);
    expect(getMetricColor(9_000_000, spec, false)).toBe(RAMP_DEFAULT[TOP]);
  });

  it('every ramp has the same number of tiers as there are break slots', () => {
    // A palette shorter than the ladder would silently paint the top classes
    // undefined; longer, and the darkest colour would never be reachable.
    expect(RAMP_DEFAULT).toHaveLength(RAMP_TIERS);
    for (const p of Object.values(CVD_PALETTES)) expect(p.ramp).toHaveLength(RAMP_TIERS);
    for (const m of Object.values(METRIC_SPECS)) expect(m.breaks).toHaveLength(RAMP_TIERS - 1);
  });

  it('a measured zero paints the zero swatch, not the ramp', () => {
    expect(getMetricColor(0, spec, false)).toBe(ZERO_FILL);
  });

  it('daltonic mode swaps in a CVD-safe palette (default: viridis)', () => {
    // With no palette id, daltonic uses the default CVD palette.
    expect(getMetricColor(9_000_000, spec, true)).toBe(CVD_PALETTES[DEFAULT_CVD_PALETTE].ramp[TOP]);
    expect(CVD_PALETTES[DEFAULT_CVD_PALETTE].ramp).not.toEqual(RAMP_DEFAULT);
  });

  it('daltonic mode honours the selected CVD palette', () => {
    expect(getMetricColor(9_000_000, spec, true, 'blues')).toBe(CVD_PALETTES.blues.ramp[TOP]);
    expect(getMetricColor(9_000_000, spec, true, 'cividis')).toBe(CVD_PALETTES.cividis.ramp[TOP]);
    expect(getMetricColor(1, spec, true, 'cividis')).toBe(CVD_PALETTES.cividis.ramp[0]);
    // Back-compat: RAMP_DALTONIC still points at the blues palette.
    expect(RAMP_DALTONIC).toEqual(CVD_PALETTES.blues.ramp);
  });
});

describe('mapMetrics — adaptive log scale', () => {
  // The distribution that motivated this: São Paulo's Real scenario, where the
  // fixed ladder left 573 of 645 municipalities in two colours.
  const skewed = [
    ...Array.from({ length: 600 }, (_, i) => 500 + i * 120), // the bulk
    390_000, // the capital, ~3.8x the 99th percentile
  ];

  it('spreads a right-skewed distribution across every tier', () => {
    const breaks = computeAdaptiveBreaks(skewed)!;
    expect(breaks).toHaveLength(RAMP_TIERS - 1);
    expect(breaks.every((b, i) => i === 0 || b > breaks[i - 1])).toBe(true);

    const spec = { ...METRIC_SPECS.biomethane_m3, toDisplay: (v: number) => v };
    const used = new Set(skewed.map((v) => getMetricColor(v, spec, false, undefined, breaks)));
    expect(used.size).toBe(RAMP_TIERS);
  });

  it('keeps the outlier in the darkest tier — it really is the largest', () => {
    const breaks = computeAdaptiveBreaks(skewed)!;
    const spec = { ...METRIC_SPECS.biomethane_m3, toDisplay: (v: number) => v };
    expect(getMetricColor(390_000, spec, false, undefined, breaks)).toBe(RAMP_DEFAULT[RAMP_TIERS - 1]);
  });

  it('rescales for a residue slice two orders of magnitude below', () => {
    // Cattle-only values against the state ladder are all bottom-tier; the
    // adaptive scale re-spreads them, which is the whole point of the filter.
    const cattle = skewed.map((v) => v / 100);
    const breaks = computeAdaptiveBreaks(cattle)!;
    expect(breaks[0]).toBeLessThan(computeAdaptiveBreaks(skewed)![0]);
  });

  it('returns null when there is nothing to classify, so the caller falls back', () => {
    expect(computeAdaptiveBreaks([])).toBeNull();
    expect(computeAdaptiveBreaks([5, 5, 5])).toBeNull(); // fewer values than tiers
    expect(computeAdaptiveBreaks(Array(50).fill(7))).toBeNull(); // no spread at all
    expect(computeAdaptiveBreaks(Array(50).fill(0))).toBeNull(); // all zero
  });
});

describe('mapMetrics — legend + formatting', () => {
  it('legend has eight ramp tiers + zero + no_data, in the daltonic palette when on', () => {
    const items = legendItems(METRIC_SPECS.biogas_m3, true, 'blues');
    expect(items).toHaveLength(RAMP_TIERS + 2);
    expect(items[0].color).toBe(CVD_PALETTES.blues.ramp[RAMP_TIERS - 1]);
    expect(items[0].label).toContain('>');
    expect(items[items.length - 1].label).toBe('Sem dados');
  });

  it('legend prints the SAME limits the choropleth was painted with', () => {
    // The legend explains an adaptive classification; printing the fixed ladder
    // while the map used another would be worse than showing no legend.
    const breaks = [10, 100, 1_000, 10_000, 100_000, 1_000_000, 10_000_000];
    const items = legendItems(METRIC_SPECS.biogas_m3, false, undefined, breaks);
    expect(items).toHaveLength(RAMP_TIERS + 2);
    expect(items[0].label).toBe('> 10M');
    expect(items[RAMP_TIERS - 1].label).toBe('< 10');
  });

  it('formatMetricValue shows the unit and null → sem dados', () => {
    expect(formatMetricValue(365_000, METRIC_SPECS.biogas_m3)).toContain('Nm³/dia');
    expect(formatMetricValue(null, METRIC_SPECS.biogas_m3)).toBe('sem dados');
  });
});

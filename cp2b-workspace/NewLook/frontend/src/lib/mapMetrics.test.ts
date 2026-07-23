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

describe('mapMetrics — colour bucketing + daltonic', () => {
  const spec = METRIC_SPECS.biomass_tons; // breaks [5k,50k,200k,1M,5M]

  it('buckets low→high across the six default tiers', () => {
    expect(getMetricColor(1_000, spec, false)).toBe(RAMP_DEFAULT[0]); // < 5k
    expect(getMetricColor(6_000, spec, false)).toBe(RAMP_DEFAULT[1]); // 5k–50k
    expect(getMetricColor(9_000_000, spec, false)).toBe(RAMP_DEFAULT[5]); // > 5M
  });

  it('a measured zero paints the zero swatch, not the ramp', () => {
    expect(getMetricColor(0, spec, false)).toBe(ZERO_FILL);
  });

  it('daltonic mode swaps in a CVD-safe palette (default: viridis)', () => {
    // With no palette id, daltonic uses the default CVD palette.
    expect(getMetricColor(9_000_000, spec, true)).toBe(CVD_PALETTES[DEFAULT_CVD_PALETTE].ramp[5]);
    expect(CVD_PALETTES[DEFAULT_CVD_PALETTE].ramp).not.toEqual(RAMP_DEFAULT);
    expect(CVD_PALETTES[DEFAULT_CVD_PALETTE].ramp).toHaveLength(6);
  });

  it('daltonic mode honours the selected CVD palette', () => {
    expect(getMetricColor(9_000_000, spec, true, 'blues')).toBe(CVD_PALETTES.blues.ramp[5]);
    expect(getMetricColor(9_000_000, spec, true, 'cividis')).toBe(CVD_PALETTES.cividis.ramp[5]);
    expect(getMetricColor(1_000, spec, true, 'cividis')).toBe(CVD_PALETTES.cividis.ramp[0]);
    // Back-compat: RAMP_DALTONIC still points at the blues palette.
    expect(RAMP_DALTONIC).toEqual(CVD_PALETTES.blues.ramp);
  });
});

describe('mapMetrics — legend + formatting', () => {
  it('legend has six ramp tiers + zero + no_data, in the daltonic palette when on', () => {
    const items = legendItems(METRIC_SPECS.biogas_m3, true, 'blues');
    expect(items).toHaveLength(8);
    expect(items[0].color).toBe(CVD_PALETTES.blues.ramp[5]);
    expect(items[0].label).toContain('>');
    expect(items[7].label).toBe('Sem dados');
  });

  it('formatMetricValue shows the unit and null → sem dados', () => {
    expect(formatMetricValue(365_000, METRIC_SPECS.biogas_m3)).toContain('Nm³/dia');
    expect(formatMetricValue(null, METRIC_SPECS.biogas_m3)).toBe('sem dados');
  });
});

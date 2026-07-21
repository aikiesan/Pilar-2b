/**
 * The municipality panel's sector breakdown must follow the active map metric,
 * and must read served values rather than deriving them.
 *
 * The panel previously showed a tonnage breakdown regardless of which metric the
 * choropleth was displaying, and its only sector split came from the legacy
 * `{sector}_biogas_m3_year` columns — populated for 645 São Paulo municipalities
 * and nobody else.
 */

import {
  getSectorMetricValue,
  getSectorScenarioValue,
  getResidueTonsOrNull,
  MWH_PER_M3_CH4,
} from './mapValues';
import type { MunicipalityProperties } from '@/types/geospatial';

const props = {
  // Sector biomass tonnage (served columns)
  agricultural_biomass_tons_year: 122_963,
  livestock_biomass_tons_year: 4_015_174,
  urban_biomass_tons_year: 10_971,
  // Sector biogas CH4 bands (map_metrics.SECTOR_STREAMS)
  agricultural_biogas_ch4_min_m3_yr: 1_000,
  agricultural_biogas_ch4_medio_m3_yr: 2_000,
  agricultural_biogas_ch4_max_m3_yr: 4_000,
  livestock_biogas_ch4_min_m3_yr: 5_000,
  livestock_biogas_ch4_medio_m3_yr: 10_000,
  livestock_biogas_ch4_max_m3_yr: 20_000,
  urban_biogas_ch4_min_m3_yr: 500,
  urban_biogas_ch4_medio_m3_yr: 1_000,
  urban_biogas_ch4_max_m3_yr: 2_000,
  // Sector biomethane bands
  agricultural_biomethane_medio_m3_yr: 1_940,
  livestock_biomethane_medio_m3_yr: 9_700,
  urban_biomethane_medio_m3_yr: 970,
} as unknown as MunicipalityProperties;

describe('getSectorMetricValue', () => {
  it('returns tonnage for the biomass metric', () => {
    expect(getSectorMetricValue(props, 'livestock', 'biomass_tons', 'baseline')).toBe(4_015_174);
  });

  it('returns served biogas, not tonnage, for the biogas metric', () => {
    expect(getSectorMetricValue(props, 'livestock', 'biogas_m3', 'baseline')).toBe(10_000);
  });

  it('returns served biomethane for the biomethane metric', () => {
    expect(getSectorMetricValue(props, 'livestock', 'biomethane_m3', 'baseline')).toBe(9_700);
  });

  it('derives bioenergy from the served biogas band by the shared factor', () => {
    expect(getSectorMetricValue(props, 'livestock', 'bioenergy_mwh', 'baseline')).toBeCloseTo(
      10_000 * MWH_PER_M3_CH4,
      6
    );
  });

  it('switching metric changes which sector dominates', () => {
    // Livestock dominates by tonnage here, and still dominates by biogas —
    // but the ratio differs, which is the whole point of showing the metric
    // the map is actually displaying.
    const byMass =
      getSectorMetricValue(props, 'livestock', 'biomass_tons', 'baseline')! /
      getSectorMetricValue(props, 'agricultural', 'biomass_tons', 'baseline')!;
    const byGas =
      getSectorMetricValue(props, 'livestock', 'biogas_m3', 'baseline')! /
      getSectorMetricValue(props, 'agricultural', 'biogas_m3', 'baseline')!;
    expect(byMass).toBeGreaterThan(30);
    expect(byGas).toBeCloseTo(5, 6);
  });

  it('maps scenarios onto the served band like every other canonical metric', () => {
    expect(getSectorScenarioValue(props, 'livestock', 'biogas', 'conservador')).toBe(5_000);
    expect(getSectorScenarioValue(props, 'livestock', 'biogas', 'baseline')).toBe(10_000);
    expect(getSectorScenarioValue(props, 'livestock', 'biogas', 'otimista')).toBe(20_000);
    // fronteira = midpoint(medio, max)
    expect(getSectorScenarioValue(props, 'livestock', 'biogas', 'fronteira')).toBe(15_000);
  });

  it('returns null — never 0 — when a sector was never served', () => {
    const empty = {} as MunicipalityProperties;
    expect(getSectorMetricValue(empty, 'agricultural', 'biogas_m3', 'baseline')).toBeNull();
    expect(getSectorMetricValue(empty, 'agricultural', 'bioenergy_mwh', 'baseline')).toBeNull();
  });
});

describe('getResidueTonsOrNull', () => {
  const withCoverage = {
    sugarcane_biomass_tons_year: null,
    sugarcane_biomass_coverage: 'no_data',
    // A municipality that genuinely grows no coffee: measured, and the value is 0.
    coffee_biomass_tons_year: 0,
    coffee_biomass_coverage: 'measured',
    soybean_biomass_tons_year: 43_400,
    soybean_biomass_coverage: 'measured',
  } as unknown as MunicipalityProperties;

  it('returns null for a residue we have no data for', () => {
    // Sugarcane is not promoted nationally yet, so outside São Paulo its column
    // is NULL. Rendering that as "0 t/ano" would state the municipality grows
    // no cane — the exact claim migration 025 exists to prevent.
    expect(getResidueTonsOrNull(withCoverage, 'sugarcane')).toBeNull();
  });

  it('returns 0 — not null — for a measured zero', () => {
    expect(getResidueTonsOrNull(withCoverage, 'coffee')).toBe(0);
  });

  it('returns the served tonnage when present', () => {
    expect(getResidueTonsOrNull(withCoverage, 'soybean')).toBe(43_400);
  });

  it('treats a missing coverage flag as no_data, not as zero', () => {
    expect(getResidueTonsOrNull({} as MunicipalityProperties, 'corn')).toBeNull();
  });
});

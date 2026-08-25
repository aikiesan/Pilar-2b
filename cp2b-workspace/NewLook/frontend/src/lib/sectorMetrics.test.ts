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
import { CH4_FRACTION_OF_BIOGAS } from '@/data/scenarioFactors';
import type { MunicipalityProperties } from '@/types/geospatial';

const props = {
  // Sector biomass tonnage (served columns)
  agricultural_biomass_tons_year: 122_963,
  livestock_biomass_tons_year: 4_015_174,
  urban_biomass_tons_year: 10_971,
  // Sector RAW BIOGAS bands (map_metrics.SECTOR_STREAMS). Distinct columns from
  // the CH4 ones below — raw biogas is the methane plus the CO2 it comes with,
  // i.e. CH4 / 0.625. The fixture used to omit these entirely, which is what let
  // the sector accessor read `biogas_ch4` under a "biogas" label unnoticed.
  agricultural_biogas_min_m3_yr: 1_600,
  agricultural_biogas_medio_m3_yr: 3_200,
  agricultural_biogas_max_m3_yr: 6_400,
  livestock_biogas_min_m3_yr: 8_000,
  livestock_biogas_medio_m3_yr: 16_000,
  livestock_biogas_max_m3_yr: 32_000,
  urban_biogas_min_m3_yr: 800,
  urban_biogas_medio_m3_yr: 1_600,
  urban_biogas_max_m3_yr: 3_200,
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

  it('returns served RAW biogas, not tonnage and not methane, for the biogas metric', () => {
    expect(getSectorMetricValue(props, 'livestock', 'biogas_m3', 'baseline')).toBe(16_000);
  });

  it('returns served methane for the methane metric', () => {
    // Used to fall through to `default` and answer in TONNES under a Nm³ unit.
    expect(getSectorMetricValue(props, 'livestock', 'methane_m3', 'baseline')).toBe(10_000);
  });

  it('keeps raw biogas and methane apart at sector level', () => {
    const biogas = getSectorMetricValue(props, 'livestock', 'biogas_m3', 'baseline')!;
    const methane = getSectorMetricValue(props, 'livestock', 'methane_m3', 'baseline')!;
    expect(methane / biogas).toBeCloseTo(CH4_FRACTION_OF_BIOGAS, 6);
  });

  it('returns served biomethane for the biomethane metric', () => {
    expect(getSectorMetricValue(props, 'livestock', 'biomethane_m3', 'baseline')).toBe(9_700);
  });

  it('derives bioenergy from the METHANE band by the shared factor', () => {
    // MWh/m³ is the calorific value of pure methane; applying it to raw biogas
    // would inflate bioenergy by 1/0.625 — CO2 carries no energy.
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
    expect(getSectorScenarioValue(props, 'livestock', 'methane', 'conservador')).toBe(5_000);
    expect(getSectorScenarioValue(props, 'livestock', 'methane', 'baseline')).toBe(10_000);
    expect(getSectorScenarioValue(props, 'livestock', 'methane', 'otimista')).toBe(20_000);
    // fronteira = midpoint(medio, max)
    expect(getSectorScenarioValue(props, 'livestock', 'methane', 'fronteira')).toBe(15_000);
  });

  it('returns null — never 0 — when a sector was never served', () => {
    const empty = {} as MunicipalityProperties;
    expect(getSectorMetricValue(empty, 'agricultural', 'biogas_m3', 'baseline')).toBeNull();
    expect(getSectorMetricValue(empty, 'agricultural', 'bioenergy_mwh', 'baseline')).toBeNull();
  });
});

/**
 * Real/Ideal are the DEFAULT map scenario (DEFAULT_MAP_SCENARIO = 'real'), and
 * nothing here exercised them: every assertion above ran against 'baseline'.
 * The sector accessor returned null for them unconditionally, so the profile
 * panel showed "Sem dados" for biogás/biometano/bioenergia on first load while
 * the choropleth beside it painted a value.
 */
describe('getSectorMetricValue — served scenarios (Real / Ideal)', () => {
  // As served by /municipalities/{ibge}/metrics (migration 026 columns).
  const served = {
    ch4_real_agricultural_m3_year: 1_000,
    ch4_real_livestock_m3_year: 4_000,
    ch4_real_urban_m3_year: 500,
    ch4_real_forestry_m3_year: 250,
    ch4_ideal_agricultural_m3_year: 3_000,
    ch4_ideal_livestock_m3_year: 8_000,
    ch4_ideal_urban_m3_year: 900,
    ch4_ideal_forestry_m3_year: 600,
  } as unknown as MunicipalityProperties;

  it('reads the served per-sector column for Real', () => {
    expect(getSectorMetricValue(served, 'livestock', 'methane_m3', 'real')).toBe(4_000);
  });

  it('reads the served per-sector column for Ideal', () => {
    expect(getSectorMetricValue(served, 'livestock', 'methane_m3', 'ideal')).toBe(8_000);
  });

  it('converts served CH4 to raw biogas the same way the municipality total does', () => {
    expect(getSectorMetricValue(served, 'livestock', 'biogas_m3', 'real')).toBeCloseTo(
      4_000 / CH4_FRACTION_OF_BIOGAS,
      6
    );
  });

  it('equates biomethane with methane, per the FIESP convention the backend uses', () => {
    expect(getSectorMetricValue(served, 'livestock', 'biomethane_m3', 'real')).toBe(4_000);
  });

  it('derives bioenergy from served methane, not from raw biogas', () => {
    expect(getSectorMetricValue(served, 'livestock', 'bioenergy_mwh', 'real')).toBeCloseTo(
      4_000 * MWH_PER_M3_CH4,
      6
    );
  });

  it('carries Florestal, which the band scenarios have no stream for', () => {
    expect(getSectorMetricValue(served, 'forestry', 'methane_m3', 'real')).toBe(250);
    expect(getSectorMetricValue(served, 'forestry', 'methane_m3', 'baseline')).toBeNull();
    expect(getSectorMetricValue(served, 'forestry', 'biomass_tons', 'real')).toBeNull();
  });

  it('stays null outside São Paulo, where migration 026 loaded nothing', () => {
    // A 0 here would claim we measured the municipality and found no potential.
    const outsideSp = { ch4_real_m3_year: null } as unknown as MunicipalityProperties;
    expect(getSectorMetricValue(outsideSp, 'agricultural', 'biogas_m3', 'real')).toBeNull();
    expect(getSectorMetricValue(outsideSp, 'urban', 'bioenergy_mwh', 'ideal')).toBeNull();
  });

  it('does not fall back to the band split when the served columns are absent', () => {
    // The band split would show a breakdown that does not add up to the Real
    // total displayed beside it.
    expect(getSectorMetricValue(props, 'livestock', 'methane_m3', 'real')).toBeNull();
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

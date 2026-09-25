/**
 * Real and Ideal are the CP2b cascade (migration 034): Real = N4 (accessible),
 * Ideal = N3 (mobilisable), reference scenario.
 *
 * The UI keys stay `real`/`ideal`; the payload fields keep the method's names
 * (ch4_cp2b_n4_*, ch4_cp2b_n3_*), and SERVED_SOURCE_TIER is the only join. The
 * Atlas SP 2020 columns (ch4_real_*, ch4_ideal_*) are no longer read, even when
 * a payload still carries them. The conversions are the method's own: the
 * state CH₄ mix of each level for biogas, 0.99 / 0.96 for biomethane.
 */

import type { MunicipalityProperties } from '@/types/geospatial';
import type { ResidueType } from '@/types/map';
import {
  getBiogasScenarioValue,
  getBiomethaneScenarioValue,
  getMethaneScenarioValue,
  getSectorScenarioValue,
  hasAnySelectedResidue,
  NO_DATA,
} from './mapValues';
import {
  CH4_FRACTION_OF_BIOGAS,
  DEFAULT_MAP_SCENARIO,
  MAP_SCENARIOS,
  SERVED_BIOMETHANE_PER_CH4,
  SERVED_CH4_FRACTION_OF_BIOGAS,
  SERVED_SCENARIO_FIELD,
  SERVED_SCENARIO_RESIDUE_FIELD,
  SERVED_SOURCE_TIER,
  isServedScenario,
} from '@/data/scenarioFactors';

const props = (o: Record<string, unknown>): MunicipalityProperties =>
  o as unknown as MunicipalityProperties;
const R = (...r: string[]) => r as ResidueType[];

// Guaíra-like, as the map payload carries it — plus a stale Atlas total that
// must be ignored.
const mun = props({
  ibge_code: '3517406',
  ch4_real_m3_year: 90_000_000,
  ch4_cp2b_n3_m3_year: 133_500_000,
  ch4_cp2b_n4_m3_year: 117_700_000,
  ch4_cp2b_n3_sugarcane_m3_year: 123_600_000,
  ch4_cp2b_n3_corn_m3_year: 3_800_000,
  ch4_cp2b_n4_sugarcane_m3_year: 109_600_000,
  ch4_cp2b_n4_corn_m3_year: 3_100_000,
  ch4_cp2b_n4_agricultural_m3_year: 117_000_000,
});

describe('Real / Ideal — scenario registry', () => {
  it('offers exactly Real and Ideal, opening on Real', () => {
    expect(MAP_SCENARIOS.map((s) => s.key)).toEqual(['real', 'ideal']);
    expect(DEFAULT_MAP_SCENARIO).toBe('real');
    expect(isServedScenario('real')).toBe(true);
    expect(isServedScenario('ideal')).toBe(true);
  });

  it('maps Real to N4 and Ideal to N3', () => {
    expect(SERVED_SOURCE_TIER).toEqual({ real: 'cp2b_n4', ideal: 'cp2b_n3' });
  });

  it('reads the columns the backend serves (municipalities.py _CP2B_MAP_COLUMNS)', () => {
    expect(SERVED_SCENARIO_FIELD.real).toBe('ch4_cp2b_n4_m3_year');
    expect(SERVED_SCENARIO_FIELD.ideal).toBe('ch4_cp2b_n3_m3_year');
    expect(SERVED_SCENARIO_RESIDUE_FIELD('real', 'rsu')).toBe('ch4_cp2b_n4_rsu_m3_year');
    expect(SERVED_SCENARIO_RESIDUE_FIELD('ideal', 'rsu')).toBe('ch4_cp2b_n3_rsu_m3_year');
  });
});

describe('Real / Ideal — values', () => {
  it('methane is served whole from the CP2b columns, never the Atlas ones', () => {
    expect(getMethaneScenarioValue(mun, 'real').value).toBe(117_700_000);
    expect(getMethaneScenarioValue(mun, 'ideal').value).toBe(133_500_000);
  });

  it('the residue filter sums the CP2b shares of the active level', () => {
    expect(getMethaneScenarioValue(mun, 'real', R('sugarcane', 'corn')).value).toBe(112_700_000);
    expect(getMethaneScenarioValue(mun, 'ideal', R('sugarcane', 'corn')).value).toBe(
      127_400_000
    );
    expect(hasAnySelectedResidue(mun, R('corn'), 'real')).toBe(true);
  });

  it('aquaculture, which CP2b does not model, paints no data', () => {
    const v = getMethaneScenarioValue(mun, 'real', R('aquaculture'));
    expect(v.value).toBeNull();
    expect(v.coverage).toBe(NO_DATA);
  });

  it('biogas uses the CP2b CH4 fraction of each level, not FIESP 0.625', () => {
    const v = getBiogasScenarioValue(mun, 'ideal').value as number;
    expect(v).toBeCloseTo(133_500_000 / SERVED_CH4_FRACTION_OF_BIOGAS.ideal, 3);
    expect(v).toBeGreaterThan(133_500_000 / CH4_FRACTION_OF_BIOGAS);
  });

  it('biomethane deducts the upgrading loss and the 96% purity', () => {
    expect(getBiomethaneScenarioValue(mun, 'real').value).toBeCloseTo(
      117_700_000 * (0.99 / 0.96),
      3
    );
  });

  it('the state mix reproduces the article (N3 19.18 -> 34.05 biogas; N4 16.36 -> 29.02)', () => {
    expect(19.183 / SERVED_CH4_FRACTION_OF_BIOGAS.ideal).toBeCloseTo(34.05, 1);
    expect(19.183 * SERVED_BIOMETHANE_PER_CH4.ideal).toBeCloseTo(19.78, 2);
    expect(16.361 / SERVED_CH4_FRACTION_OF_BIOGAS.real).toBeCloseTo(29.02, 1);
    expect(16.361 * SERVED_BIOMETHANE_PER_CH4.real).toBeCloseTo(16.87, 2);
  });

  it('sector bars read the CP2b sector columns; forestry has none', () => {
    expect(getSectorScenarioValue(mun, 'agricultural', 'methane', 'real')).toBe(117_000_000);
    expect(getSectorScenarioValue(mun, 'forestry', 'methane', 'real')).toBeNull();
  });

  it('a municipality without CP2b data is no_data, even with an Atlas total', () => {
    const outside = props({ ibge_code: '3106200', ch4_real_m3_year: 5 });
    const v = getMethaneScenarioValue(outside, 'real');
    expect(v.value).toBeNull();
    expect(v.coverage).toBe(NO_DATA);
  });
});

/**
 * The CP2b tiers (migration 034) ride the served-scenario machinery.
 *
 * Their columns follow the ch4_{tier}_{residue}_m3_year shape, so the residue
 * filter, the sector bars and the stat strip work without a CP2b branch. What
 * must differ is the unit conversion: CP2b's biogas uses the method's CH₄
 * fraction and its biomethane deducts upgrading losses, where Real/Ideal keep
 * the FIESP convention. These tests pin both halves.
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
  MAP_SCENARIOS,
  SERVED_BIOMETHANE_PER_CH4,
  SERVED_CH4_FRACTION_OF_BIOGAS,
  SERVED_SCENARIO_FIELD,
  SERVED_SCENARIO_RESIDUE_FIELD,
  isCp2bScenario,
  isServedScenario,
} from '@/data/scenarioFactors';

const props = (o: Record<string, unknown>): MunicipalityProperties =>
  o as unknown as MunicipalityProperties;
const R = (...r: string[]) => r as ResidueType[];

// Guaíra-like: CP2b N3/N4 plus the Real total, as the map payload carries them.
const mun = props({
  ibge_code: '3517406',
  ch4_real_m3_year: 90_000_000,
  ch4_cp2b_n3_m3_year: 133_500_000,
  ch4_cp2b_n4_m3_year: 117_700_000,
  ch4_cp2b_n3_sugarcane_m3_year: 123_600_000,
  ch4_cp2b_n3_corn_m3_year: 3_800_000,
  ch4_cp2b_n4_sugarcane_m3_year: 109_600_000,
  ch4_cp2b_n3_agricultural_m3_year: 133_000_000,
});

describe('CP2b tiers — scenario registry', () => {
  it('are served scenarios and offered in the selector after Real/Ideal', () => {
    expect(isServedScenario('cp2b_n3')).toBe(true);
    expect(isServedScenario('cp2b_n4')).toBe(true);
    expect(MAP_SCENARIOS.map((s) => s.key)).toEqual(['real', 'ideal', 'cp2b_n3', 'cp2b_n4']);
  });

  it('are told apart from the Atlas tiers', () => {
    expect(isCp2bScenario('cp2b_n3')).toBe(true);
    expect(isCp2bScenario('real')).toBe(false);
  });

  it('read the columns the backend serves (municipalities.py _CP2B_MAP_COLUMNS)', () => {
    expect(SERVED_SCENARIO_FIELD.cp2b_n3).toBe('ch4_cp2b_n3_m3_year');
    expect(SERVED_SCENARIO_RESIDUE_FIELD('cp2b_n4', 'rsu')).toBe('ch4_cp2b_n4_rsu_m3_year');
  });
});

describe('CP2b tiers — values', () => {
  it('methane is served whole, never scaled', () => {
    expect(getMethaneScenarioValue(mun, 'cp2b_n3').value).toBe(133_500_000);
    expect(getMethaneScenarioValue(mun, 'cp2b_n4').value).toBe(117_700_000);
  });

  it('the residue filter sums the CP2b shares', () => {
    expect(getMethaneScenarioValue(mun, 'cp2b_n3', R('sugarcane', 'corn')).value).toBe(
      127_400_000
    );
    expect(hasAnySelectedResidue(mun, R('corn'), 'cp2b_n3')).toBe(true);
  });

  it('biogas uses the CP2b CH4 fraction, not FIESP 0.625', () => {
    const v = getBiogasScenarioValue(mun, 'cp2b_n3').value as number;
    expect(v).toBeCloseTo(133_500_000 / SERVED_CH4_FRACTION_OF_BIOGAS.cp2b_n3, 3);
    expect(v).toBeGreaterThan(133_500_000 / CH4_FRACTION_OF_BIOGAS);
  });

  it('biomethane deducts upgrading losses for CP2b and not for Real', () => {
    expect(getBiomethaneScenarioValue(mun, 'cp2b_n3').value).toBeCloseTo(
      133_500_000 * (0.99 / 0.96),
      3
    );
    expect(SERVED_BIOMETHANE_PER_CH4.real).toBe(1);
    expect(getBiomethaneScenarioValue(mun, 'real').value).toBe(90_000_000);
  });

  it('the state mix reproduces the article (Table T2: 19.18 CH4 -> 34.05 biogas)', () => {
    expect(19.183 / SERVED_CH4_FRACTION_OF_BIOGAS.cp2b_n3).toBeCloseTo(34.05, 1);
    expect(19.183 * SERVED_BIOMETHANE_PER_CH4.cp2b_n3).toBeCloseTo(19.78, 2);
  });

  it('sector bars read the CP2b sector columns; forestry has none', () => {
    expect(getSectorScenarioValue(mun, 'agricultural', 'methane', 'cp2b_n3')).toBe(133_000_000);
    expect(getSectorScenarioValue(mun, 'forestry', 'methane', 'cp2b_n3')).toBeNull();
  });

  it('a municipality without CP2b data is no_data, not zero', () => {
    const outside = props({ ibge_code: '3106200', ch4_real_m3_year: 5 });
    const v = getMethaneScenarioValue(outside, 'cp2b_n3');
    expect(v.value).toBeNull();
    expect(v.coverage).toBe(NO_DATA);
  });
});

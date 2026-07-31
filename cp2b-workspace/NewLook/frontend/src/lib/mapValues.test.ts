/**
 * Guards the residue filter under the served scenarios (Real/Ideal).
 *
 * The failure this locks down was silent and total: the map's feature filter
 * tested the legacy `{residue}_biogas_m3_year` columns, which `fields=map` trims
 * out of the payload, so selecting a residue removed every municipality instead
 * of narrowing the choropleth. The shares (migration 029) are what both the
 * filter and the paint must read, and they must read the SAME ones.
 */

import type { MunicipalityProperties } from '@/types/geospatial';
import type { ResidueType } from '@/components/map/FloatingControlPanel';
import {
  getMethaneScenarioValue,
  getBiogasScenarioValue,
  getBiomethaneScenarioValue,
  getBioenergyScenarioValue,
  hasAnySelectedResidue,
  MWH_PER_M3_CH4,
  NO_DATA,
} from './mapValues';
import { CH4_FRACTION_OF_BIOGAS } from '@/data/scenarioFactors';

const props = (o: Record<string, unknown>): MunicipalityProperties =>
  o as unknown as MunicipalityProperties;

// A São Paulo row as the map payload actually delivers it: the total, some
// shares, and — crucially — NO key at all for the residues that came out zero.
const sp = props({
  ibge_code: '3505500',
  ch4_real_m3_year: 1_000,
  ch4_ideal_m3_year: 1_600,
  ch4_real_sugarcane_m3_year: 600,
  ch4_real_cattle_m3_year: 300,
  ch4_real_rsu_m3_year: 100,
  ch4_ideal_sugarcane_m3_year: 900,
  ch4_ideal_cattle_m3_year: 500,
  ch4_ideal_rsu_m3_year: 200,
  sugarcane_biomass_tons_year: 40_000,
  sugarcane_biomass_coverage: 'measured',
});

const R = (...r: string[]) => r as ResidueType[];

describe('mapValues — served scenarios with residues selected', () => {
  it('no selection reads the municipality total', () => {
    expect(getMethaneScenarioValue(sp, 'real').value).toBe(1_000);
    expect(getMethaneScenarioValue(sp, 'real', []).value).toBe(1_000);
  });

  it('sums only the selected residues', () => {
    expect(getMethaneScenarioValue(sp, 'real', R('sugarcane')).value).toBe(600);
    expect(getMethaneScenarioValue(sp, 'real', R('sugarcane', 'cattle')).value).toBe(900);
  });

  it('follows the scenario toggle — Ideal reads the Ideal shares', () => {
    expect(getMethaneScenarioValue(sp, 'ideal', R('sugarcane')).value).toBe(900);
    expect(getMethaneScenarioValue(sp, 'ideal', R('sugarcane', 'cattle')).value).toBe(1_400);
  });

  it('treats an absent share as zero, not as no-data', () => {
    // The payload omits falsy values, so "no coffee key" means no coffee — but a
    // selection that finds nothing anywhere is no_data, not a painted zero.
    expect(getMethaneScenarioValue(sp, 'real', R('sugarcane', 'coffee')).value).toBe(600);
    const none = getMethaneScenarioValue(sp, 'real', R('coffee'));
    expect(none.value).toBeNull();
    expect(none.coverage).toBe(NO_DATA);
  });

  it('every metric filters, in its own unit', () => {
    const sel = R('sugarcane', 'cattle');
    expect(getBiomethaneScenarioValue(sp, 'real', sel).value).toBe(900);
    expect(getBiogasScenarioValue(sp, 'real', sel).value).toBeCloseTo(
      900 / CH4_FRACTION_OF_BIOGAS,
      6
    );
    expect(getBioenergyScenarioValue(sp, 'real', sel).value).toBeCloseTo(900 * MWH_PER_M3_CH4, 6);
  });

  it('the shares never exceed the total they came from', () => {
    const all = R('sugarcane', 'cattle', 'rsu');
    expect(getMethaneScenarioValue(sp, 'real', all).value).toBeLessThanOrEqual(1_000);
  });

  it('leaves the band scenarios alone — they have no per-residue shares', () => {
    const band = props({
      biogas_ch4_medio_m3_yr: 200_000,
      total_biomass_coverage: 'estimated',
    });
    expect(getMethaneScenarioValue(band, 'baseline', R('sugarcane')).value).toBe(200_000);
  });
});

describe('mapValues — hasAnySelectedResidue', () => {
  it('keeps a municipality that has any one of the selected residues', () => {
    expect(hasAnySelectedResidue(sp, R('sugarcane'), 'real')).toBe(true);
    expect(hasAnySelectedResidue(sp, R('coffee', 'cattle'), 'real')).toBe(true);
  });

  it('drops one that has none of them', () => {
    expect(hasAnySelectedResidue(sp, R('coffee', 'poultry'), 'real')).toBe(false);
  });

  it('an empty selection filters nothing', () => {
    expect(hasAnySelectedResidue(sp, [], 'real')).toBe(true);
  });

  it('falls back to tonnage for the band scenarios', () => {
    // Band scenarios carry no shares; the served tonnage is the only per-residue
    // signal in the payload, and it is what the biomass metric already reads.
    expect(hasAnySelectedResidue(sp, R('sugarcane'), 'baseline')).toBe(true);
    expect(hasAnySelectedResidue(sp, R('coffee'), 'baseline')).toBe(false);
  });

  it('agrees with the paint: what survives the filter has a value', () => {
    const sel = R('sugarcane', 'coffee');
    expect(hasAnySelectedResidue(sp, sel, 'real')).toBe(true);
    expect(getMethaneScenarioValue(sp, 'real', sel).value).not.toBeNull();
  });
});

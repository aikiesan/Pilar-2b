import { compareSide, nextComparePair, rankField } from './compare';
import type { LandCoverResponse } from './landCover';
import type { MunicipalityProperties } from '@/types/geospatial';

describe('nextComparePair', () => {
  it('fills A, then B', () => {
    expect(nextComparePair([], '3550308')).toEqual(['3550308']);
    expect(nextComparePair(['3550308'], '3543402')).toEqual(['3550308', '3543402']);
  });

  it('replaces B on a third pick', () => {
    expect(nextComparePair(['3550308', '3543402'], '3509502')).toEqual(['3550308', '3509502']);
  });

  it('removes A or B when picked again, B moving up to A', () => {
    expect(nextComparePair(['3550308', '3543402'], '3543402')).toEqual(['3550308']);
    expect(nextComparePair(['3550308', '3543402'], '3550308')).toEqual(['3543402']);
    expect(nextComparePair(['3550308'], '3550308')).toEqual([]);
  });
});

const props = (code: string, extra: Record<string, unknown> = {}) =>
  ({ ibge_code: code, name: `M${code}`, ...extra }) as unknown as MunicipalityProperties;

const feature = (code: string, ch4: number | null) => ({
  properties: { ibge_code: code, name: `M${code}`, ch4_cp2b_n4_m3_year: ch4 },
});

describe('compareSide', () => {
  // Five SP municipalities; 3500002 and 3500003 tie, one MG municipality and
  // one SP municipality without a value stay out of the count.
  const features = [
    feature('3500001', 500),
    feature('3500002', 300),
    feature('3500003', 300),
    feature('3500004', 100),
    feature('3500005', null),
    feature('3100001', 900),
  ];

  it('ranks in the state on the scenario, ties sharing a rank', () => {
    const side = (code: string) => compareSide(props(code, { ch4_cp2b_n4_m3_year: 300 }), features, 'real', null, undefined);
    expect(side('3500002').rank).toEqual({ position: 2, of: 4 });
    expect(side('3500003').rank).toEqual({ position: 2, of: 4 });
    expect(compareSide(props('3500004'), features, 'real', null, undefined).rank).toEqual({ position: 4, of: 4 });
    expect(compareSide(props('3500005'), features, 'real', null, undefined).rank).toBeNull();
  });

  it('ranks the Ideal scenario on N3', () => {
    expect(rankField('real')).toBe('ch4_cp2b_n4_m3_year');
    expect(rankField('ideal')).toBe('ch4_cp2b_n3_m3_year');
  });

  it('says no data rather than zero', () => {
    const side = compareSide(props('3500005'), features, 'real', {}, undefined);
    expect(side.biomethane).toBeNull();
    expect(side.sectors).toEqual({ agricultural: null, livestock: null, urban: null });
    expect(side.topResidues).toBeNull();
    expect(side.landCover).toBeNull();
    expect(side.pipelineKm).toBeNull();
    expect(side.biogasPlants).toBeNull();
  });

  it('keeps a measured zero', () => {
    const side = compareSide(
      props('3500004', {
        livestock_biomass_tons_year: 0,
        cattle_biomass_tons_year: 0,
        cattle_biomass_coverage: 'measured',
      }),
      features,
      'real',
      { '3500004': { biogas_plants: 0, pipeline_km: 12.5 } },
      undefined,
    );
    expect(side.sectors.livestock).toBe(0);
    expect(side.topResidues).toEqual([]);
    expect(side.biogasPlants).toBe(0);
    expect(side.pipelineKm).toBe(12.5);
  });

  it('turns CH4 into biomethane and lists the three largest residues', () => {
    const side = compareSide(
      props('3500001', {
        ch4_cp2b_n4_m3_year: 960,
        sugarcane_biomass_tons_year: 900,
        sugarcane_biomass_coverage: 'measured',
        cattle_biomass_tons_year: 300,
        cattle_biomass_coverage: 'measured',
        rsu_biomass_tons_year: 500,
        rsu_biomass_coverage: 'measured',
        corn_biomass_tons_year: 100,
        corn_biomass_coverage: 'measured',
      }),
      features,
      'real',
      null,
      undefined,
    );
    expect(side.biomethane).toBeCloseTo(990, 6); // 960 × 0.99 / 0.96
    expect(side.topResidues).toEqual([
      { key: 'sugarcane', tons: 900 },
      { key: 'rsu', tons: 500 },
      { key: 'cattle', tons: 300 },
    ]);
    expect(side.sectors.agricultural).toBe(1000);
  });

  it('groups land cover for the bar and counts farmland', () => {
    const response: LandCoverResponse = {
      available: true,
      source: 'MapBiomas Collection 11',
      unit: 'ha',
      year: 2025,
      years: [2025],
      groups: ['forest', 'pasture', 'cane', 'crops', 'silviculture', 'mosaic', 'urban', 'other'],
      data: { '3500001': [100, 200, 300, 50, 25, 25, 250, 50] },
    };
    const side = compareSide(props('3500001'), features, 'real', null, response);
    expect(side.landCover).toEqual({
      groups: { native: 100, pasture: 200, cane: 300, other_farming: 100, urban_other: 300 },
      farmlandShare: 0.6,
    });
  });
});

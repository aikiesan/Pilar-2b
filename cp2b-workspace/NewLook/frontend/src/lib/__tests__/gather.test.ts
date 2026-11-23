import type { Polygon } from 'geojson';
import {
  arrivedShare,
  averageMw,
  easeOut,
  GATHER_TOTAL_MS,
  GATHER_WAVE_MS,
  gatherAround,
  isGatherRadius,
  particleCount,
  placeOf,
  waveReachMs,
} from '@/lib/gather';
import { getBiomethaneScenarioValue } from '@/lib/mapValues';
import type { MunicipalityFeature, MunicipalityProperties } from '@/types/geospatial';

// A small square centred on (lat, lng).
const square = (lat: number, lng: number, size = 0.02): Polygon => ({
  type: 'Polygon',
  coordinates: [[
    [lng - size / 2, lat - size / 2], [lng + size / 2, lat - size / 2],
    [lng + size / 2, lat + size / 2], [lng - size / 2, lat + size / 2],
    [lng - size / 2, lat - size / 2],
  ]],
});

const feature = (code: string, lat: number, lng: number, props: Record<string, unknown>): MunicipalityFeature =>
  ({ type: 'Feature', geometry: square(lat, lng), properties: { ibge_code: code, name: `M${code}`, ...props } }) as unknown as MunicipalityFeature;

// Real scenario (CP2b N4): 60% cane, 10% cattle, 30% urban waste.
const served = (ch4: number) => ({
  ch4_cp2b_n4_m3_year: ch4,
  ch4_cp2b_n4_sugarcane_m3_year: ch4 * 0.6,
  ch4_cp2b_n4_cattle_m3_year: ch4 * 0.1,
  ch4_cp2b_n4_rsu_m3_year: ch4 * 0.3,
});
// A band scenario: one amount, no honest split by source.
const band = { biomethane_min_m3_yr: 2_000_000, biomethane_medio_m3_yr: 3_000_000, biomethane_max_m3_yr: 4_000_000 };

const point = { lat: -22, lng: -47 };
const features = [
  feature('3500001', -22, -47, served(10_000_000)), // at the point, SP
  feature('3500002', -21.7, -47, band), // about 33 km north, SP, band only
  feature('3100001', -22, -46.6, served(5_000_000)), // about 41 km east, MG
  feature('3500003', -21, -47, served(9_000_000)), // about 111 km north
  feature('4100001', -22.1, -47, served(9_000_000)), // Paraná: never counted
];

const real = (f: MunicipalityFeature) =>
  getBiomethaneScenarioValue(f.properties as MunicipalityProperties, 'real').value!;

describe('gatherAround', () => {
  it('counts the SP and MG municipalities whose centre is within the radius, nearest first', () => {
    const r = gatherAround(features, point, 50, 'real');
    expect(r.members.map((m) => m.code)).toEqual(['3500001', '3500002', '3100001']);
    expect(r.members[1].km).toBeCloseTo(33.4, 0);
    expect(r.crossesBorder).toBe(true);
  });

  it('adds the scenario biomethane, split by source, and says who has none', () => {
    const r = gatherAround(features, point, 50, 'real');
    const total = real(features[0]) + real(features[2]);
    expect(r.total).toBeCloseTo(total);
    expect(r.bySource.agricultural / r.total).toBeCloseTo(0.6);
    expect(r.bySource.livestock / r.total).toBeCloseTo(0.1);
    expect(r.bySource.urban / r.total).toBeCloseTo(0.3);
    expect(r.bySource.unsplit).toBe(0);
    // The band-only municipality has nothing in Real.
    expect(r.withoutData).toBe(1);
    expect(r.top.map((t) => t.code)).toEqual(['3500001', '3100001']);
    expect(r.top[0].share).toBeCloseTo(2 / 3);
    expect(r.members[0].dominant).toBe('agricultural');
  });

  it('puts a band amount under "no split" instead of guessing one', () => {
    const r = gatherAround(features, point, 50, 'conservador');
    expect(r.total).toBe(2_000_000);
    expect(r.bySource.unsplit).toBe(2_000_000);
    expect(r.members.find((m) => m.code === '3500002')!.dominant).toBe('unsplit');
    expect(r.withoutData).toBe(2);
  });

  it('stays in one state at a small radius', () => {
    const r = gatherAround(features, point, 25, 'real');
    expect(r.members.map((m) => m.code)).toEqual(['3500001']);
    expect(r.crossesBorder).toBe(false);
  });

  it('reaches further at 100 km, but not past it', () => {
    const codes = gatherAround(features, point, 100, 'real').members.map((m) => m.code);
    expect(codes).not.toContain('3500003');
    expect(gatherAround(features, point, 112, 'real').members.map((m) => m.code)).toContain('3500003');
  });
});

describe('averageMw', () => {
  it('turns m³/yr into average MW at 9.97 kWh/m³ and 38%', () => {
    // 1 million m³ × 9.97 kWh × 0.38 / 8760 h = 432.5 kW.
    expect(averageMw(1_000_000)).toBeCloseTo(0.4325, 4);
    expect(averageMw(0)).toBe(0);
  });
});

describe('placeOf', () => {
  it('names the municipality the point lies in, or the nearest one', () => {
    expect(placeOf(features, point)?.properties?.ibge_code).toBe('3500001');
    expect(placeOf(features, { lat: -21.75, lng: -47 })?.properties?.ibge_code).toBe('3500002');
  });
});

describe('the flow', () => {
  it('sends about three particles per √ million m³, at least one', () => {
    expect(particleCount(0)).toBe(0);
    expect(particleCount(10_000)).toBe(1);
    expect(particleCount(1_000_000)).toBe(3);
    expect(particleCount(100_000_000)).toBe(30);
  });

  it('times the wave so the circle reaches each municipality when it fills', () => {
    expect(waveReachMs(0, 50)).toBe(0);
    expect(waveReachMs(50, 50)).toBeCloseTo(GATHER_WAVE_MS);
    for (const km of [5, 20, 33, 49]) {
      const t = waveReachMs(km, 50);
      expect(50 * easeOut(t / GATHER_WAVE_MS)).toBeCloseTo(km, 6);
    }
  });

  it('counts up from nothing to the whole', () => {
    expect(arrivedShare(0)).toBe(0);
    expect(arrivedShare(GATHER_TOTAL_MS)).toBe(1);
    expect(arrivedShare(GATHER_TOTAL_MS / 2)).toBeGreaterThan(0);
    expect(arrivedShare(GATHER_TOTAL_MS / 2)).toBeLessThan(1);
  });

  it('takes only the three radii', () => {
    expect([25, 50, 100].every(isGatherRadius)).toBe(true);
    expect(isGatherRadius(30)).toBe(false);
  });
});

import type { Polygon } from 'geojson';
import type { LandCoverResponse } from '@/lib/landCover';
import {
  arcPoints,
  arcProgress,
  arcsTotalMs,
  ARC_DRAW_MS,
  ARC_STAGGER_MS,
  buildProfiles,
  findSimilar,
  partialArc,
  profileVector,
  SECTOR_WEIGHT,
  SIZE_SCALE,
} from '@/lib/similarity';
import type { MunicipalityFeature, MunicipalityProperties } from '@/types/geospatial';

const square = (lat: number, lng: number, size = 0.02): Polygon => ({
  type: 'Polygon',
  coordinates: [[
    [lng - size / 2, lat - size / 2], [lng + size / 2, lat - size / 2],
    [lng + size / 2, lat + size / 2], [lng - size / 2, lat + size / 2],
    [lng - size / 2, lat - size / 2],
  ]],
});

/** Residue tonnes by sector and biomethane (reference band). */
const props = (agri: number | null, live: number | null, urban: number | null, biomethane: number | null = 999_999) =>
  ({
    agricultural_biomass_tons_year: agri,
    livestock_biomass_tons_year: live,
    urban_biomass_tons_year: urban,
    biomethane_medio_m3_yr: biomethane,
  }) as unknown as MunicipalityProperties;

const feature = (code: string, p: MunicipalityProperties, lat = -22, lng = -47): MunicipalityFeature =>
  ({ type: 'Feature', geometry: square(lat, lng), properties: Object.assign({}, p, { ibge_code: code, name: `M${code}` }) }) as unknown as MunicipalityFeature;

const GROUPS = ['forest', 'pasture', 'cane', 'crops', 'silviculture', 'mosaic', 'urban', 'other'] as const;
/** Hectares in group order. */
const cover = (data: Record<string, number[]>): LandCoverResponse => ({
  available: true, source: 'MapBiomas Collection 11', unit: 'ha', year: 2025, years: [2025], groups: [...GROUPS], data,
});
const allCane = [0, 0, 100, 0, 0, 0, 0, 0];
const allPasture = [0, 100, 0, 0, 0, 0, 0, 0];
const half = [0, 50, 50, 0, 0, 0, 0, 0];

describe('profileVector', () => {
  it('is three weighted sector shares, eight land shares and the size', () => {
    const v = profileVector(props(75, 5, 20, 999_999), { forest: 30, pasture: 10, cane: 60 })!;
    expect(v).toHaveLength(12);
    expect(v.slice(0, 3)).toEqual([0.75 * SECTOR_WEIGHT, 0.05 * SECTOR_WEIGHT, 0.2 * SECTOR_WEIGHT].map((x) => expect.closeTo(x, 10)));
    expect(v.slice(3, 11)).toEqual([0.3, 0.1, 0.6, 0, 0, 0, 0, 0].map((x) => expect.closeTo(x, 10)));
    expect(v[11]).toBeCloseTo(6 / SIZE_SCALE, 10);
  });

  it('is null when a sector, the land cover or the biomethane has no data', () => {
    const land = { cane: 1 };
    expect(profileVector(props(null, 5, 20), land)).toBeNull();
    expect(profileVector(props(0, 0, 0), land)).toBeNull();
    expect(profileVector(props(1, 1, 1), null)).toBeNull();
    expect(profileVector(props(1, 1, 1), { cane: 0 })).toBeNull();
    expect(profileVector(props(1, 1, 1, null), land)).toBeNull();
  });

  it('takes a served zero as a value', () => {
    expect(profileVector(props(10, 0, 0, 0), { cane: 1 })).not.toBeNull();
  });
});

describe('findSimilar', () => {
  // The origin is cane country; SP has near and far cousins, MG one twin.
  const features = [
    feature('3500001', props(90, 5, 5)),
    feature('3500002', props(88, 6, 6)), // closest in SP
    feature('3500003', props(50, 25, 25)), // middling
    feature('3500004', props(5, 90, 5)), // far
    feature('3100001', props(90, 5, 5)), // MG twin
    feature('3500005', props(null, 5, 5)), // skipped: no agricultural data
    feature('3100002', props(10, 10, 10)), // skipped: no land cover
    feature('4100001', props(90, 5, 5)), // another state: never part of it
  ];
  const landCover = cover({
    3500001: allCane, 3500002: allCane, 3500003: half, 3500004: allPasture,
    3100001: allCane, 3500005: allCane, 4100001: allCane,
  });
  const profiles = buildProfiles(features, landCover);

  it('builds profiles for SP and MG only, and counts the skipped', () => {
    expect([...profiles.byCode.keys()].sort()).toEqual(['3100001', '3500001', '3500002', '3500003', '3500004']);
    expect([...profiles.skipped].sort()).toEqual(['3100002', '3500005']);
  });

  it('orders by distance, nearest first, the origin left out', () => {
    const r = findSimilar(profiles, '3500001', 'state');
    if (r.status !== 'ready') throw new Error('expected a result');
    expect(r.matches.map((m) => m.code)).toEqual(['3500002', '3500003', '3500004']);
    expect(r.matches[0].distance).toBeLessThan(r.matches[1].distance);
  });

  it('keeps to the origin state, or takes both', () => {
    const state = findSimilar(profiles, '3500001', 'state');
    const both = findSimilar(profiles, '3500001', 'both');
    if (state.status !== 'ready' || both.status !== 'ready') throw new Error('expected results');
    expect(state.matches.some((m) => m.code.startsWith('31'))).toBe(false);
    expect(both.matches[0].code).toBe('3100001');
    // Skipped counts only the states searched.
    expect(state.skipped).toBe(1);
    expect(both.skipped).toBe(2);
  });

  it('keeps the count, and shows similarity against the last distance × 1.4', () => {
    const r = findSimilar(profiles, '3500001', 'both', 2);
    if (r.status !== 'ready') throw new Error('expected a result');
    expect(r.matches).toHaveLength(2);
    const last = r.matches[1];
    expect(last.similarity).toBeCloseTo(1 - 1 / 1.4, 10);
    expect(r.matches[0].similarity).toBe(1); // the twin: distance 0
  });

  it('says when the origin itself has no profile', () => {
    expect(findSimilar(profiles, '3500005', 'state')).toEqual({ status: 'no_profile', code: '3500005' });
  });
});

describe('arcs', () => {
  const a = { lat: -21, lng: -47 };
  const b = { lat: -22, lng: -48 };

  it('runs from a to b in 24 points, bent off the straight line', () => {
    const pts = arcPoints(a, b);
    expect(pts).toHaveLength(24);
    expect(pts[0][0]).toBeCloseTo(a.lat, 10);
    expect(pts[0][1]).toBeCloseTo(a.lng, 10);
    expect(pts[23][0]).toBeCloseTo(b.lat, 10);
    expect(pts[23][1]).toBeCloseTo(b.lng, 10);
    const mid = pts[12];
    const straight = (mid[0] - a.lat) / (b.lat - a.lat) - (mid[1] - a.lng) / (b.lng - a.lng);
    expect(Math.abs(straight)).toBeGreaterThan(0.05);
  });

  it('staggers the arcs and lands each one at full', () => {
    expect(arcProgress(0, 0)).toBe(0);
    expect(arcProgress(3, 3 * ARC_STAGGER_MS)).toBe(0);
    expect(arcProgress(3, 3 * ARC_STAGGER_MS + ARC_DRAW_MS)).toBe(1);
    expect(arcsTotalMs(12)).toBe(11 * ARC_STAGGER_MS + ARC_DRAW_MS);
  });

  it('cuts an arc part way, ending between two samples', () => {
    const pts: [number, number][] = [[0, 0], [0, 1], [0, 2]];
    expect(partialArc(pts, 0)).toEqual([[0, 0]]);
    expect(partialArc(pts, 0.75)).toEqual([[0, 0], [0, 1], [0, 1.5]]);
    expect(partialArc(pts, 1)).toEqual(pts);
  });
});

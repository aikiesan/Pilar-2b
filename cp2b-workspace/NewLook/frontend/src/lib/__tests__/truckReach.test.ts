import type { Polygon } from 'geojson';
import {
  bandColor,
  frameSegments,
  minuteToDraw,
  isTruckLimit,
  readSiteId,
  segmentShare,
  summarizeTruckReach,
  treeSegments,
  truckMinuteAt,
  truckPlayMs,
  TRUCK_BAND_COLORS,
  TRUCK_BEYOND_COLOR,
  TRUCK_PLAY_MS,
  type TruckReachData,
  type TruckSite,
} from '@/lib/truckReach';
import type { MunicipalityFeature } from '@/types/geospatial';

const square = (lat: number, lng: number, size = 0.02): Polygon => ({
  type: 'Polygon',
  coordinates: [[
    [lng - size / 2, lat - size / 2], [lng + size / 2, lat - size / 2],
    [lng + size / 2, lat + size / 2], [lng - size / 2, lat + size / 2],
    [lng - size / 2, lat - size / 2],
  ]],
});

/** A municipality at (lat, lng) with its cane residue and biomethane. */
const feature = (code: string, lat: number, lng: number, cane: number | null, biomethane: number | null): MunicipalityFeature =>
  ({
    type: 'Feature',
    geometry: square(lat, lng),
    properties: { ibge_code: code, name: `M${code}`, sugarcane_biomass_tons_year: cane, biomethane_medio_m3_yr: biomethane },
  }) as unknown as MunicipalityFeature;

// The site at (−21, −48). One degree of latitude is about 111 km.
const SITE = { lat: -21, lng: -48 };
const features = [
  feature('3500001', -21.1, -48, 1000, 10), // 11 km, 20 min
  feature('3500002', -21.3, -48, 2000, 20), // 33 km, 45 min
  feature('3500003', -21.4, -48, 4000, null), // 44 km, 80 min: in the circle, slow by road
  feature('3500004', -21.6, -48, 8000, 80), // 67 km, 55 min: outside the circle, quick by road
  feature('3500005', -21.2, -48, 500, 5), // 22 km, never reached in 90 min
  feature('3100001', -21.05, -48, 9999, 99), // MG: never part of the circle
];
const site = { site_id: 'S1', name: 'Usina Teste', kind: 'ethanol', ibge_code: '3500001', municipality: 'M3500001', at_town_centre: false, lon: SITE.lng, lat: SITE.lat, snap_m: 100 } as const;
const data: TruckReachData = {
  site,
  caps: { motorway: 80 },
  other_cap: 30,
  town_limit_min: 90,
  pipeline_limit_min: 180,
  grid_m: 250,
  built_at: '2026-11-22T21:29:02+00:00',
  graph_source: 'OpenStreetMap',
  towns: [
    { ibge_code: '3500001', name: 'A', minutes: 20, km: 15 },
    { ibge_code: '3500002', name: 'B', minutes: 45, km: 40 },
    { ibge_code: '3500004', name: 'D', minutes: 55, km: 70 },
    { ibge_code: '3500003', name: 'C', minutes: 80, km: 60 },
  ],
  tree: [-48, -21, -48, -21.1, 0, 20, -48, -21.1, -48, -21.3, 20, 45],
  pipeline: { lon: -48, lat: -21.5, minutes: 72, km: 80, kind: 'transport', tree: [] },
};
const sites: TruckSite[] = [
  { ...site },
  { site_id: 'S2', name: 'Aterro', kind: 'landfill', ibge_code: '3500002', municipality: 'B', at_town_centre: true, lon: 0, lat: 0 },
  { site_id: 'S3', name: 'Usina 2', kind: 'ethanol', ibge_code: '3500004', municipality: 'D', at_town_centre: false, lon: 0, lat: 0 },
  { site_id: 'S4', name: 'Usina 3', kind: 'ethanol', ibge_code: '3500003', municipality: 'C', at_town_centre: false, lon: 0, lat: 0 },
  { site_id: 'S5', name: 'Biogás', kind: 'biogas', ibge_code: '3500001', municipality: 'A', at_town_centre: false, lon: 0, lat: 0 },
];

describe('summarizeTruckReach', () => {
  it('counts the towns by limit and sums what lies within the chosen one', () => {
    const s = summarizeTruckReach(data, 60, features, sites);
    expect(s.byLimit).toEqual({ 30: 1, 60: 3, 90: 4 });
    expect(s.reached.map((t) => t.ibge_code)).toEqual(['3500001', '3500002', '3500004']);
    expect(s.caneTons).toBe(11_000);
    expect(s.biomethane).toBe(110);
    expect(s.withoutData).toBe(0);
  });

  it('counts a town with no figure, never as zero data silently', () => {
    const s = summarizeTruckReach(data, 90, features, sites);
    expect(s.caneTons).toBe(15_000);
    expect(s.biomethane).toBe(110);
    expect(s.withoutData).toBe(1);
  });

  it('counts the other sites in reach, leaving the site itself out', () => {
    expect(summarizeTruckReach(data, 30, features, sites).otherSites).toEqual({ mills: 0, landfills: 0, plants: 1 });
    expect(summarizeTruckReach(data, 60, features, sites).otherSites).toEqual({ mills: 1, landfills: 1, plants: 1 });
    expect(summarizeTruckReach(data, 90, features, sites).otherSites).toEqual({ mills: 2, landfills: 1, plants: 1 });
  });

  it('says when the pipeline is beyond the limit', () => {
    expect(summarizeTruckReach(data, 60, features, sites).pipeline).toEqual({ minutes: 72, km: 80, beyond: true });
    expect(summarizeTruckReach(data, 90, features, sites).pipeline?.beyond).toBe(false);
    expect(summarizeTruckReach({ ...data, pipeline: null }, 90, features, sites).pipeline).toBeNull();
  });

  it('weighs the road against a 50 km circle, São Paulo only', () => {
    // In the circle: 0001, 0002, 0003, 0005. Slower by road at 60: 0003, 0005.
    // Reached outside it: 0004.
    expect(summarizeTruckReach(data, 60, features, sites).circle).toEqual({ inCircle: 4, slowerByRoad: 2, roadBeyondCircle: 1 });
    expect(summarizeTruckReach(data, 30, features, sites).circle).toEqual({ inCircle: 4, slowerByRoad: 3, roadBeyondCircle: 0 });
  });
});

describe('the clock and the colours', () => {
  it('plays 90 minutes in 2.6 s, longer when the pipeline lies further', () => {
    expect(truckMinuteAt(TRUCK_PLAY_MS)).toBe(90);
    expect(truckMinuteAt(TRUCK_PLAY_MS / 2)).toBe(45);
    expect(truckPlayMs({ pipeline: null })).toBe(TRUCK_PLAY_MS);
    expect(truckPlayMs({ pipeline: { ...data.pipeline!, minutes: 135 } })).toBe(TRUCK_PLAY_MS * 1.5);
  });

  it('draws a segment by the share of it the truck has passed', () => {
    expect(segmentShare(10, 20, 5)).toBe(0);
    expect(segmentShare(10, 20, 15)).toBe(0.5);
    expect(segmentShare(10, 20, 25)).toBe(1);
    expect(segmentShare(10, 10, 10)).toBe(1);
  });

  it('colours by 30 minute band, grey past the limit', () => {
    expect(bandColor(10, 90)).toBe(TRUCK_BAND_COLORS[0]);
    expect(bandColor(45, 90)).toBe(TRUCK_BAND_COLORS[1]);
    expect(bandColor(75, 90)).toBe(TRUCK_BAND_COLORS[2]);
    expect(bandColor(45, 30)).toBe(TRUCK_BEYOND_COLOR);
  });

  it('reads the flat tree as lat/lng segments with their minutes', () => {
    expect(treeSegments(data.tree)).toEqual([
      { a: [-21, -48], b: [-21.1, -48], t1: 0, t2: 20 },
      { a: [-21.1, -48], b: [-21.3, -48], t1: 20, t2: 45 },
    ]);
  });
});

describe('URL values', () => {
  it('takes only the limits on offer and well-formed site ids', () => {
    expect(isTruckLimit(60)).toBe(true);
    expect(isTruckLimit(45)).toBe(false);
    expect(readSiteId('ITB_SP_0005')).toBe('ITB_SP_0005');
    expect(readSiteId('../etc')).toBeNull();
    expect(readSiteId(null)).toBeNull();
  });
});

describe('frameSegments', () => {
  const segs = treeSegments([
    0, 0, 1, 0, 0, 20, // first band
    1, 0, 2, 0, 20, 40, // second band
    2, 0, 3, 0, 70, 100, // past a 60 minute limit
  ]);

  it('draws only what the truck has passed, the last segment cut where it is', () => {
    const drawn = frameSegments(segs, 30, 60);
    expect(drawn).toHaveLength(2);
    expect(drawn[0].b).toEqual([0, 1]);
    expect(drawn[1].b[1]).toBeCloseTo(1.5, 10);
  });

  it('colours by the band a road is entered in, grey past the limit', () => {
    const drawn = frameSegments(segs, Infinity, 60);
    expect(drawn.map((d) => d.color)).toEqual([TRUCK_BAND_COLORS[0], TRUCK_BAND_COLORS[0], TRUCK_BEYOND_COLOR]);
    expect(drawn.map((d) => d.beyond)).toEqual([false, false, true]);
  });

  it('with reduced motion draws the whole tree at once', () => {
    const drawn = frameSegments(segs, minuteToDraw(0, true), 90);
    expect(drawn).toHaveLength(3);
    expect(drawn.every((d, i) => d.b === segs[i].b)).toBe(true);
    expect(frameSegments(segs, minuteToDraw(0, false), 90)).toHaveLength(0);
  });
});

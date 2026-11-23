/**
 * Truck reach, the map's road tool: click a mill or landfill and see where a
 * truck gets within 30, 60 or 90 minutes on real roads, against the circle
 * that pretends every direction is equally easy.
 *
 * Nothing is routed here. The routes were computed once offline
 * (backend/scripts/build_truck_reach.py) and a click reads one stored row:
 *   GET /api/v1/truck-reach/sites       every site, public
 *   GET /api/v1/truck-reach/{site_id}   its towns, route tree and pipeline route
 *
 * The tree is flat [lon1, lat1, lon2, lat2, t1, t2, ...]: point 1 is the end
 * nearer the site, reached at minute t1, so the map grows every route from the
 * site on one clock. Town routes run towards the site (residues travel to it);
 * the pipeline route runs from it (biomethane travels out).
 *
 * The window's sums read the municipality data the map already holds. Town
 * positions are the municipality centroids, as Gather's are: the endpoint
 * names the towns reached but not where their centres lie.
 */
import { centroidOf, haversineKm, type LatLng } from '@/lib/mapGeometry';
import type { MunicipalityFeature } from '@/types/geospatial';

// ── Limits and the URL ───────────────────────────────────────────────────────

export const TRUCK_LIMITS = [30, 60, 90] as const;
export type TruckLimit = (typeof TRUCK_LIMITS)[number];
export const DEFAULT_TRUCK_LIMIT: TruckLimit = 60;
export const isTruckLimit = (v: unknown): v is TruckLimit =>
  typeof v === 'number' && (TRUCK_LIMITS as readonly number[]).includes(v);

/** The backend's own rule for a site id. */
const SITE_ID = /^[A-Za-z0-9_]{1,40}$/;
export const readSiteId = (v: string | null): string | null => (v !== null && SITE_ID.test(v) ? v : null);

/** The straight-line circle the window weighs the roads against, in km. */
export const TRUCK_CIRCLE_KM = 50;

// ── What the endpoints send ──────────────────────────────────────────────────

export type TruckSiteKind = 'ethanol' | 'landfill' | 'biogas' | 'biomethane';

export interface TruckSite {
  site_id: string;
  name: string;
  kind: TruckSiteKind;
  ibge_code: string;
  municipality: string;
  at_town_centre: boolean;
  lon: number;
  lat: number;
}

export type TruckSitesResponse =
  | { available: true; built_at: string; sites: TruckSite[] }
  | { available: false };

export interface TruckTown {
  ibge_code: string;
  name: string | null;
  minutes: number;
  km: number;
}

export interface TruckPipelineRoute {
  lon: number;
  lat: number;
  minutes: number;
  km: number;
  kind: string;
  tree: number[];
}

export interface TruckReachData {
  site: TruckSite & { snap_m: number | null };
  caps: Record<string, number>;
  other_cap: number;
  town_limit_min: number;
  pipeline_limit_min: number;
  grid_m: number;
  built_at: string;
  graph_source: string;
  towns: TruckTown[];
  tree: number[];
  pipeline: TruckPipelineRoute | null;
}

export type TruckReachResponse = TruckReachData | { available: false };

export const isTruckReachData = (r: TruckReachResponse | undefined | null): r is TruckReachData =>
  Boolean(r && 'site' in r);

/** Every site sits in São Paulo: the road graph covers that state only. */
export const isInSaoPaulo = (ibge: string) => ibge.startsWith('35');

// ── The clock ────────────────────────────────────────────────────────────────

/** 90 truck minutes play in this long; the pipeline route may run past 90. */
export const TRUCK_PLAY_MS = 2600;
export const TRUCK_PLAY_MINUTES = 90;

/** The truck minute `elapsed` ms after the click. */
export const truckMinuteAt = (elapsedMs: number) => (elapsedMs / TRUCK_PLAY_MS) * TRUCK_PLAY_MINUTES;

/** The whole movement: to the last town, or to the pipeline if later. */
export function truckPlayMs(data: Pick<TruckReachData, 'pipeline'>): number {
  const last = Math.max(TRUCK_PLAY_MINUTES, data.pipeline?.minutes ?? 0);
  return (last / TRUCK_PLAY_MINUTES) * TRUCK_PLAY_MS;
}

/**
 * How much of a segment reached from minute t1 to t2 is drawn at `minute`:
 * 0 before it starts, 1 once the truck is past its far end.
 */
export function segmentShare(t1: number, t2: number, minute: number): number {
  if (minute >= t2) return 1;
  if (minute <= t1) return 0;
  return t2 > t1 ? (minute - t1) / (t2 - t1) : 1;
}

/** Truck minutes over which a reached town's fill fades in. */
export const TOWN_FADE_MINUTES = 6;

/** How far a town reached at `arrival` has faded in at `minute`, 0 to 1. */
export const townShare = (arrival: number, minute: number) =>
  Math.max(0, Math.min(1, (minute - arrival) / TOWN_FADE_MINUTES));

// ── Colours by band ──────────────────────────────────────────────────────────

/** Azul Petróleo ramp (dusk 700, 500, 300 in styles/palette.js). */
export const TRUCK_BAND_COLORS = ['#1E3E4C', '#3E6C7F', '#8DB2C0'] as const;
/** Roads past the chosen limit. */
export const TRUCK_BEYOND_COLOR = '#C9D3D8';

/**
 * The colour of a road first reached at `minute`: by 30-minute band within
 * the limit, faint grey beyond it.
 */
export function bandColor(minute: number, limit: TruckLimit): string {
  if (minute >= limit) return TRUCK_BEYOND_COLOR;
  return TRUCK_BAND_COLORS[Math.min(2, Math.floor(minute / 30))];
}

/** Fill colours of the site symbols, shape by kind as well. */
export const TRUCK_SITE_COLORS: Record<TruckSiteKind, string> = {
  ethanol: '#5CA032', // sector agrícola
  landfill: '#166E97', // sector urbano
  biogas: '#8C4C00', // ochre 700: ochre 500 reads as the green under deutan
  biomethane: '#8C4C00',
};

export type TruckSiteShape = 'square' | 'triangle' | 'diamond';
export const siteShape = (kind: TruckSiteKind): TruckSiteShape =>
  kind === 'ethanol' ? 'square' : kind === 'landfill' ? 'triangle' : 'diamond';

// ── The sites in reach ───────────────────────────────────────────────────────

/** How many of each kind the window lists as nearest. */
export const TRUCK_NEAREST = 3;

/**
 * Another site the truck reaches, and when: the minutes to its town's centre.
 * The routes end at town centres, not at the sites, so a site's minutes are
 * its town's.
 */
export interface TruckSiteArrival {
  site: TruckSite;
  minutes: number;
}

/** Every other site whose town the truck reaches in 90 minutes, nearest first. */
export function siteArrivals(data: TruckReachData, sites: readonly TruckSite[]): TruckSiteArrival[] {
  const minutesByTown = new Map(data.towns.map((t) => [t.ibge_code, t.minutes]));
  const out: TruckSiteArrival[] = [];
  for (const site of sites) {
    if (site.site_id === data.site.site_id) continue;
    const minutes = minutesByTown.get(site.ibge_code);
    if (minutes !== undefined) out.push({ site, minutes });
  }
  return out.sort((a, b) => a.minutes - b.minutes || a.site.name.localeCompare(b.site.name));
}

// ── The window's figures ─────────────────────────────────────────────────────

export interface TruckSummary {
  /** Towns reached within 30, 60 and 90 minutes. */
  byLimit: Record<TruckLimit, number>;
  /** Towns within the chosen limit. */
  reached: TruckTown[];
  /** Sugarcane residue in those towns, t/yr. */
  caneTons: number;
  /** Biomethane in those towns, reference band (biomethane_medio_m3_yr), m³/yr. */
  biomethane: number;
  /** Towns within the limit with no figure for one of the two. */
  withoutData: number;
  /** Other sites whose town is within the limit. */
  otherSites: { mills: number; landfills: number; plants: number };
  /** The nearest mills and landfills within the limit, nearest first. */
  nearest: { mills: TruckSiteArrival[]; landfills: TruckSiteArrival[] };
  pipeline: { minutes: number; km: number; beyond: boolean } | null;
  circle: {
    /** São Paulo municipalities whose centre is within 50 km in a straight line. */
    inCircle: number;
    /** Of those, the ones the road does not reach within the limit. */
    slowerByRoad: number;
    /** Reached by road within the limit, though outside the circle. */
    roadBeyondCircle: number;
  };
}

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * Sums what lies in reach of the site within `limit` minutes, and weighs the
 * roads against a 50 km circle.
 */
export function summarizeTruckReach(
  data: TruckReachData,
  limit: TruckLimit,
  features: readonly MunicipalityFeature[],
  sites: readonly TruckSite[],
): TruckSummary {
  const byCode = new Map(features.map((f) => [String(f.properties?.ibge_code ?? ''), f]));
  const byLimit = Object.fromEntries(
    TRUCK_LIMITS.map((l) => [l, data.towns.filter((t) => t.minutes <= l).length]),
  ) as Record<TruckLimit, number>;
  const reached = data.towns.filter((t) => t.minutes <= limit);
  const reachedCodes = new Set(reached.map((t) => t.ibge_code));

  let caneTons = 0;
  let biomethane = 0;
  let withoutData = 0;
  for (const town of reached) {
    const props = byCode.get(town.ibge_code)?.properties as unknown as Record<string, unknown> | undefined;
    const cane = num(props?.sugarcane_biomass_tons_year);
    const bio = num(props?.biomethane_medio_m3_yr);
    if (cane === null || bio === null) withoutData++;
    caneTons += cane ?? 0;
    biomethane += bio ?? 0;
  }

  const otherSites = { mills: 0, landfills: 0, plants: 0 };
  const nearest: TruckSummary['nearest'] = { mills: [], landfills: [] };
  for (const arrival of siteArrivals(data, sites)) {
    if (arrival.minutes > limit) break;
    const { kind } = arrival.site;
    if (kind === 'ethanol') {
      otherSites.mills++;
      if (nearest.mills.length < TRUCK_NEAREST) nearest.mills.push(arrival);
    } else if (kind === 'landfill') {
      otherSites.landfills++;
      if (nearest.landfills.length < TRUCK_NEAREST) nearest.landfills.push(arrival);
    } else {
      otherSites.plants++;
    }
  }

  const site: LatLng = { lat: data.site.lat, lng: data.site.lon };
  let inCircle = 0;
  let slowerByRoad = 0;
  let roadBeyondCircle = 0;
  for (const [code, feature] of byCode) {
    if (!isInSaoPaulo(code)) continue;
    const c = centroidOf(feature);
    if (!c) continue;
    const inside = haversineKm(site, c) <= TRUCK_CIRCLE_KM;
    const byRoad = reachedCodes.has(code);
    if (inside) {
      inCircle++;
      if (!byRoad) slowerByRoad++;
    } else if (byRoad) {
      roadBeyondCircle++;
    }
  }

  const p = data.pipeline;
  return {
    byLimit,
    reached,
    caneTons,
    biomethane,
    withoutData,
    otherSites,
    nearest,
    pipeline: p ? { minutes: p.minutes, km: p.km, beyond: p.minutes > limit } : null,
    circle: { inCircle, slowerByRoad, roadBeyondCircle },
  };
}

/** The tree as segments, for drawing and tests. */
export interface TreeSegment {
  a: [number, number];
  b: [number, number];
  t1: number;
  t2: number;
}

export function treeSegments(flat: readonly number[]): TreeSegment[] {
  const out: TreeSegment[] = [];
  for (let i = 0; i + 5 < flat.length; i += 6) {
    out.push({ a: [flat[i + 1], flat[i]], b: [flat[i + 3], flat[i + 2]], t1: flat[i + 4], t2: flat[i + 5] });
  }
  return out;
}

export interface DrawnSegment {
  a: [number, number];
  /** The far end, or the point the truck has reached on the way to it. */
  b: [number, number];
  color: string;
  beyond: boolean;
}

/**
 * The roads drawn at truck minute `minute`: each segment cut where the truck
 * is, coloured by the band it was entered in. `Infinity` is the whole tree at
 * once (reduced motion, or the clock done).
 */
export function frameSegments(segments: readonly TreeSegment[], minute: number, limit: TruckLimit): DrawnSegment[] {
  const out: DrawnSegment[] = [];
  for (const s of segments) {
    const share = segmentShare(s.t1, s.t2, minute);
    if (share <= 0) continue;
    const b: [number, number] = share >= 1
      ? s.b
      : [s.a[0] + (s.b[0] - s.a[0]) * share, s.a[1] + (s.b[1] - s.a[1]) * share];
    out.push({ a: s.a, b, color: bandColor(s.t1, limit), beyond: s.t1 >= limit });
  }
  return out;
}

/** The truck minute to draw: the whole tree with reduced motion. */
export const minuteToDraw = (elapsedMs: number, reduced: boolean) => (reduced ? Infinity : truckMinuteAt(elapsedMs));

/**
 * Find similar, the map's click tool: the twelve municipalities that look most
 * like the one clicked, to find a model project or a partner.
 *
 * Each municipality is a profile vector:
 *   - its residue mass by source (agricultural, livestock, urban) as shares of
 *     the whole, weighted 1.4, so the mix counts a little more than the land;
 *   - its land cover in the latest year, as shares of the eight groups;
 *   - its size, log10(1 + biomethane m³/yr) / 8, which keeps a large and a
 *     small municipality apart without letting size drown the rest.
 * Pipeline distance is left out: it says where a place is, not what it is.
 *
 * Likeness is the Euclidean distance between vectors. The bar shows
 * 1 − d / d_max, where d_max is the twelfth distance × 1.4, so the twelfth
 * still shows (about 29%) and the bars read against each other. The best
 * match is full only when it is an exact twin; for Ribeirão Preto it is
 * about 61%.
 *
 * Size reads the reference band's middle value (biomethane_medio_m3_yr), not
 * the map's scenario: the served tiers cover São Paulo only, and the ranking
 * must not change when the scenario does. The window shows each match's
 * biomethane in the map's scenario.
 *
 * A municipality with no data for a sector, no land cover, or no biomethane is
 * skipped, never filled with zeros, and the window says how many.
 */
import type { LandCoverResponse } from '@/lib/landCover';
import { landCoverOf, LAND_COVER_GROUPS } from '@/lib/landCover';
import { centroidOf } from '@/lib/mapGeometry';
import type { SimilarWithin } from '@/lib/mapTools';
import type { MunicipalityFeature, MunicipalityProperties } from '@/types/geospatial';

export const SIMILAR_COUNT = 12;
/** Weight of the residue mix against the land cover. */
export const SECTOR_WEIGHT = 1.4;
/** log10 of the largest biomethane is about 8; this brings size to 0–1. */
export const SIZE_SCALE = 8;
/** d_max is the last match's distance times this. */
export const SPREAD = 1.4;

const SECTORS = ['agricultural', 'livestock', 'urban'] as const;

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * One municipality's profile vector: three sector shares (weighted), eight
 * land cover shares, one size. Null when any part has no data.
 */
export function profileVector(
  props: MunicipalityProperties,
  cover: Record<string, number> | null,
): number[] | null {
  const record = props as unknown as Record<string, unknown>;
  const tons = SECTORS.map((s) => num(record[`${s}_biomass_tons_year`]));
  if (tons.some((t) => t === null || t < 0)) return null;
  const tonsTotal = (tons as number[]).reduce((a, b) => a + b, 0);
  if (!(tonsTotal > 0)) return null;

  if (!cover) return null;
  const ha = LAND_COVER_GROUPS.map((g) => cover[g] ?? 0);
  const haTotal = ha.reduce((a, b) => a + b, 0);
  if (!(haTotal > 0)) return null;

  const biomethane = num(record.biomethane_medio_m3_yr);
  if (biomethane === null || biomethane < 0) return null;

  return [
    ...(tons as number[]).map((t) => (SECTOR_WEIGHT * t) / tonsTotal),
    ...ha.map((h) => h / haTotal),
    Math.log10(1 + biomethane) / SIZE_SCALE,
  ];
}

export interface SimilarProfile {
  code: string;
  name: string;
  lat: number;
  lng: number;
  vector: number[];
}

export interface SimilarProfiles {
  byCode: Map<string, SimilarProfile>;
  /** São Paulo and Minas Gerais municipalities left out for missing data. */
  skipped: Set<string>;
}

/** Only the platform's two states take part. */
const inStates = (code: string) => code.startsWith('35') || code.startsWith('31');

/** The profiles of every SP and MG municipality the data allows. */
export function buildProfiles(
  features: readonly MunicipalityFeature[],
  landCover: LandCoverResponse | undefined,
): SimilarProfiles {
  const byCode = new Map<string, SimilarProfile>();
  const skipped = new Set<string>();
  for (const feature of features) {
    const props = feature.properties;
    const code = String(props?.ibge_code ?? '');
    if (!props || !inStates(code)) continue;
    const vector = profileVector(props, landCoverOf(landCover, code));
    const c = centroidOf(feature);
    if (!vector || !c) {
      skipped.add(code);
      continue;
    }
    byCode.set(code, { code, name: props.name ?? code, lat: c.lat, lng: c.lng, vector });
  }
  return { byCode, skipped };
}

export function distance(a: readonly number[], b: readonly number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}

export interface SimilarMatch {
  code: string;
  name: string;
  lat: number;
  lng: number;
  distance: number;
  /** 0–1, for the bar. */
  similarity: number;
}

export type SimilarResult =
  | { status: 'no_profile'; code: string }
  | {
      status: 'ready';
      origin: SimilarProfile;
      matches: SimilarMatch[];
      /** Municipalities in the search's states skipped for missing data. */
      skipped: number;
    };

/**
 * The `count` municipalities nearest to `of`, in its own state or in both.
 * `no_profile` when `of` itself has no profile.
 */
export function findSimilar(
  profiles: SimilarProfiles,
  of: string,
  within: SimilarWithin,
  count = SIMILAR_COUNT,
): SimilarResult {
  const origin = profiles.byCode.get(of);
  if (!origin) return { status: 'no_profile', code: of };
  const state = of.slice(0, 2);
  const inScope = (code: string) => within === 'both' || code.slice(0, 2) === state;

  const nearest = [...profiles.byCode.values()]
    .filter((p) => p.code !== of && inScope(p.code))
    .map((p) => ({ p, d: distance(origin.vector, p.vector) }))
    .sort((x, y) => x.d - y.d || x.p.code.localeCompare(y.p.code))
    .slice(0, count);

  const dMax = (nearest.at(-1)?.d ?? 0) * SPREAD;
  const matches = nearest.map(({ p, d }) => ({
    code: p.code,
    name: p.name,
    lat: p.lat,
    lng: p.lng,
    distance: d,
    similarity: dMax > 0 ? Math.max(0, 1 - d / dMax) : 1,
  }));

  let skipped = 0;
  for (const code of profiles.skipped) if (code !== of && inScope(code)) skipped++;
  return { status: 'ready', origin, matches, skipped };
}

// ── The arcs ─────────────────────────────────────────────────────────────────

/** Points along each arc. */
export const ARC_POINTS = 24;
/** Each arc starts this long after the one before. */
export const ARC_STAGGER_MS = 90;
/** One arc's draw. */
export const ARC_DRAW_MS = 600;
/** Sideways bend of the arc, as a share of its length. */
const ARC_BEND = 0.18;

/**
 * A quadratic Bézier from a to b, its control pushed to the left of the
 * midpoint, sampled in `points` points (both ends included). In degrees, with
 * longitude scaled by the cosine of the latitude so the bend looks the same
 * on the map in every direction.
 */
export function arcPoints(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
  points = ARC_POINTS,
): [number, number][] {
  const k = Math.cos(((a.lat + b.lat) / 2) * (Math.PI / 180)) || 1;
  const ax = a.lng * k;
  const bx = b.lng * k;
  const mx = (ax + bx) / 2 - (b.lat - a.lat) * ARC_BEND;
  const my = (a.lat + b.lat) / 2 + (bx - ax) * ARC_BEND;
  const out: [number, number][] = [];
  for (let i = 0; i < points; i++) {
    const t = i / (points - 1);
    const x = (1 - t) ** 2 * ax + 2 * (1 - t) * t * mx + t ** 2 * bx;
    const y = (1 - t) ** 2 * a.lat + 2 * (1 - t) * t * my + t ** 2 * b.lat;
    out.push([y, x / k]);
  }
  return out;
}

/**
 * How much of arc `i` is drawn `elapsed` ms after the click, 0–1, eased out.
 */
export function arcProgress(i: number, elapsedMs: number): number {
  const p = Math.min(1, Math.max(0, (elapsedMs - i * ARC_STAGGER_MS) / ARC_DRAW_MS));
  return 1 - (1 - p) ** 3;
}

/** The whole movement, from the click to the last arc landing. */
export const arcsTotalMs = (count: number) => Math.max(0, count - 1) * ARC_STAGGER_MS + ARC_DRAW_MS;

/** The first `share` of an arc, the last point placed between two samples. */
export function partialArc(points: readonly [number, number][], share: number): [number, number][] {
  if (share >= 1) return [...points];
  if (share <= 0 || points.length < 2) return points.slice(0, 1);
  const pos = share * (points.length - 1);
  const i = Math.floor(pos);
  const f = pos - i;
  const [y0, x0] = points[i];
  const [y1, x1] = points[i + 1];
  return [...points.slice(0, i + 1), [y0 + (y1 - y0) * f, x0 + (x1 - x0) * f]];
}

/**
 * Dot density: the map's Pontos view. One dot is a fixed amount of the
 * metric, placed at random inside its municipality and coloured by the
 * residue's origin. A dense patch is a lot of potential; the colours show what
 * it is made of. Unlike a heat surface it reads the same at every zoom, and
 * unlike a choropleth a big municipality with little potential stays sparse.
 *
 * The placement is random but seeded by the IBGE code, so the same data draws
 * the same dots on every visit and every redraw. Positions inside a
 * municipality mean nothing, which the legend says.
 */
import type { Geometry, Position } from 'geojson';
import { SPLIT_SECTORS, type SectorAmounts } from '@/lib/sectorSplit';

/** Dot colour index: the three sectors in SPLIT_SECTORS order, then "no split". */
export type DotKind = 0 | 1 | 2 | 3;
export const NO_SPLIT: DotKind = 3;

export interface Dot {
  lat: number;
  lng: number;
  kind: DotKind;
}

/** About this many dots for the whole state: dense enough to read, light enough to draw. */
export const TARGET_DOTS = 24_000;

/** The smallest 1, 2 or 5 × 10ⁿ at least `raw`. */
export function niceStep(raw: number): number {
  if (!(raw > 0)) return 1;
  const exp = Math.floor(Math.log10(raw));
  const base = 10 ** exp;
  for (const m of [1, 2, 5, 10]) {
    if (m * base >= raw * (1 - 1e-9)) return m * base;
  }
  return 10 * base;
}

/** What one dot is worth, for a state whose amounts add up to `total`. */
export function dotValueFor(total: number, target = TARGET_DOTS): number {
  return niceStep(total / target);
}

/** A small, fast seeded generator (mulberry32): the same seed, the same dots. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function inRing(lng: number, lat: number, ring: Position[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Inside the outer ring and outside every hole. */
function inPolygon(lng: number, lat: number, rings: Position[][]): boolean {
  if (!rings.length || !inRing(lng, lat, rings[0])) return false;
  for (let k = 1; k < rings.length; k++) if (inRing(lng, lat, rings[k])) return false;
  return true;
}

/**
 * Detailed outlines (Minas Gerais comes with thousands of vertices per
 * municipality) made placing a state's dots take seconds. The sampling tests
 * against the outline thinned to at most this many vertices per ring: off by a
 * few metres at the border, invisible at any zoom the dots are read at.
 */
export const SAMPLE_RING_MAX = 400;

function thin(ring: Position[]): Position[] {
  if (ring.length <= SAMPLE_RING_MAX) return ring;
  const step = ring.length / SAMPLE_RING_MAX;
  const out: Position[] = [];
  for (let i = 0; i < ring.length; i += step) out.push(ring[Math.floor(i)]);
  out.push(ring[ring.length - 1]);
  return out;
}

function polygonsOf(geometry: Geometry | null | undefined): Position[][][] {
  if (!geometry) return [];
  if (geometry.type === 'Polygon') return [geometry.coordinates];
  if (geometry.type === 'MultiPolygon') return geometry.coordinates;
  return [];
}

export function geometryContains(geometry: Geometry | null | undefined, lng: number, lat: number): boolean {
  return polygonsOf(geometry).some((rings) => inPolygon(lng, lat, rings));
}

/** How many dots each kind gets: whole dots, the remainder decided by a seeded draw. */
export function dotCounts(amounts: SectorAmounts, dotValue: number, rand: () => number): number[] {
  const round = (v: number) => {
    const exact = v / dotValue;
    const whole = Math.floor(exact);
    return whole + (rand() < exact - whole ? 1 : 0);
  };
  if (!amounts.parts) return [0, 0, 0, round(amounts.total)];
  const parts = amounts.parts;
  return [...SPLIT_SECTORS.map((s) => round(parts[s])), 0];
}

/**
 * Dots for one municipality, inside its outline. A municipality too thin for
 * the rejection sampling to land in (rare: a sliver of coast) gets the rest of
 * its dots around its first vertex rather than losing them.
 */
export function placeDots(
  geometry: Geometry | null | undefined,
  counts: number[],
  seed: number,
): Dot[] {
  const n = counts.reduce((a, b) => a + b, 0);
  if (n === 0) return [];
  const polygons = polygonsOf(geometry).map((rings) => rings.map(thin));
  if (!polygons.length) return [];
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  for (const rings of polygons) {
    for (const [lng, lat] of rings[0]) {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
  }
  const rand = seededRandom(seed);
  const kinds: DotKind[] = [];
  counts.forEach((c, kind) => {
    for (let i = 0; i < c; i++) kinds.push(kind as DotKind);
  });
  // Shuffle the kinds so no colour is always drawn on top of another.
  for (let i = kinds.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [kinds[i], kinds[j]] = [kinds[j], kinds[i]];
  }

  const dots: Dot[] = [];
  let tries = 0;
  const maxTries = n * 60;
  while (dots.length < n && tries < maxTries) {
    tries++;
    const lng = minLng + rand() * (maxLng - minLng);
    const lat = minLat + rand() * (maxLat - minLat);
    if (polygons.some((rings) => inPolygon(lng, lat, rings))) {
      dots.push({ lat, lng, kind: kinds[dots.length] });
    }
  }
  const [fallbackLng, fallbackLat] = polygons[0][0][0];
  while (dots.length < n) dots.push({ lat: fallbackLat, lng: fallbackLng, kind: kinds[dots.length] });
  return dots;
}

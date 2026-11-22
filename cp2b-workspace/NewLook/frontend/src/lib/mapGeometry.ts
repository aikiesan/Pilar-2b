/**
 * Geometry helpers for the map's click tools: a municipality's centroid and the
 * straight-line distance between two points.
 *
 * The centroid is area-weighted over every polygon of the municipality, holes
 * subtracted, computed in lon/lat. A municipality spans well under a degree,
 * where that is indistinguishable from an equal-area projection. It is not the
 * representative point and can fall outside a crescent-shaped municipality;
 * for distances between municipalities that is what we want.
 *
 * Compare, Gather and Find similar all read it, so it is memoised per geometry
 * object: the map's features keep their geometry across renders.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

type Ring = readonly (readonly number[])[];
type Geometry =
  | { type: 'Polygon'; coordinates: readonly Ring[] }
  | { type: 'MultiPolygon'; coordinates: readonly (readonly Ring[])[] }
  | { type: string; coordinates?: unknown };

/** Twice the signed area of a ring and its centroid moments (shoelace). */
function ringMoments(ring: Ring): { a2: number; cx6a: number; cy6a: number } {
  let a2 = 0;
  let cx6a = 0;
  let cy6a = 0;
  for (let i = 0, n = ring.length; i < n; i++) {
    const [x0, y0] = ring[i];
    const [x1, y1] = ring[(i + 1) % n];
    const cross = x0 * y1 - x1 * y0;
    a2 += cross;
    cx6a += (x0 + x1) * cross;
    cy6a += (y0 + y1) * cross;
  }
  return { a2, cx6a, cy6a };
}

/** Area-weighted centroid of a Polygon or MultiPolygon; null for anything else or no area. */
export function geometryCentroid(geometry: Geometry | null | undefined): LatLng | null {
  if (!geometry) return null;
  let polygons: readonly (readonly Ring[])[];
  if (geometry.type === 'Polygon') polygons = [geometry.coordinates as readonly Ring[]];
  else if (geometry.type === 'MultiPolygon') polygons = geometry.coordinates as readonly (readonly Ring[])[];
  else return null;

  let area = 0;
  let mx = 0;
  let my = 0;
  for (const rings of polygons) {
    rings.forEach((ring, i) => {
      if (ring.length < 3) return;
      const m = ringMoments(ring);
      // The outer ring adds, holes subtract, whatever their winding.
      const sign = (i === 0 ? 1 : -1) * Math.sign(m.a2);
      area += sign * m.a2;
      mx += sign * m.cx6a;
      my += sign * m.cy6a;
    });
  }
  if (!(Math.abs(area) > 1e-12)) return null;
  // centroid = moments / (3 × twice-area)
  return { lng: mx / (3 * area), lat: my / (3 * area) };
}

const cache = new WeakMap<object, LatLng | null>();

/** A feature's centroid, computed once per geometry object. */
export function centroidOf(feature: { geometry?: Geometry | null } | null | undefined): LatLng | null {
  const geometry = feature?.geometry;
  if (!geometry || typeof geometry !== 'object') return null;
  if (cache.has(geometry)) return cache.get(geometry) ?? null;
  const centroid = geometryCentroid(geometry);
  cache.set(geometry, centroid);
  return centroid;
}

const EARTH_RADIUS_KM = 6371.0088;

/** Great-circle distance in km. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** The point halfway along the straight map line from a to b (for its label). */
export function midpoint(a: LatLng, b: LatLng): LatLng {
  return { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 };
}

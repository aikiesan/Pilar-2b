/**
 * PILAR-2b V3 - Map utility functions.
 *
 * Number formatting lives in lib/format.ts (locale-aware); display text lives
 * in the message catalogs. What remains here is pure map logic.
 */

import type { MunicipalityGeometry, Position } from '@/types/geospatial';

/**
 * Where to draw a municipality's marker, in Leaflet order: [lat, lng].
 *
 * A Point is its own position; an outline is the mean of the vertices of its
 * outer ring (the first polygon's, for a MultiPolygon) — close enough to the
 * centroid for a marker, and cheap. Null when there is nothing to average.
 */
export function markerPosition(geometry: MunicipalityGeometry): [number, number] | null {
  let ring: Position[] | undefined;
  switch (geometry.type) {
    case 'Point':
      return [geometry.coordinates[1], geometry.coordinates[0]];
    case 'Polygon':
      ring = geometry.coordinates[0];
      break;
    case 'MultiPolygon':
      ring = geometry.coordinates[0]?.[0];
      break;
  }
  if (!ring?.length) return null;
  const sum = ring.reduce((acc, [lng, lat]) => ({ lng: acc.lng + lng, lat: acc.lat + lat }), { lng: 0, lat: 0 });
  return [sum.lat / ring.length, sum.lng / ring.length];
}

/** Share of `part` in `total`, in percentage points; 0 when the total is 0. */
export function calculatePercentage(part: number, total: number): number {
  if (total === 0) return 0;
  return (part / total) * 100;
}

/** Catalog key for a potential class: Map.potentialCategory.<key>. */
export type PotentialCategoryKey = 'high' | 'medium' | 'low' | 'unclassified';

/**
 * Maps the backend's potential class to a catalog key.
 *
 * The API sends Portuguese codes (ALTO, MEDIO, BAIXO, SEM DADOS). They are
 * identifiers, not copy, so they are matched here and never displayed.
 */
export function getPotentialCategoryKey(category: string | null | undefined): PotentialCategoryKey {
  switch (category?.toUpperCase()) {
    case 'ALTO':
      return 'high';
    case 'MEDIO':
    case 'MÉDIO': // i18n-exempt: backend class code, never displayed
      return 'medium';
    case 'BAIXO':
      return 'low';
    default:
      return 'unclassified';
  }
}

const CATEGORY_BADGE_CLASS: Record<PotentialCategoryKey, string> = {
  high: 'bg-green-600 text-white',
  medium: 'bg-yellow-500 text-white',
  low: 'bg-orange-500 text-white',
  unclassified: 'bg-gray-400 text-white',
};

/** Tailwind classes for the potential-class badge. */
export function getCategoryColor(category: string | null | undefined): string {
  return CATEGORY_BADGE_CLASS[getPotentialCategoryKey(category)];
}

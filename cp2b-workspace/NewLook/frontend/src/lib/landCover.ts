/**
 * Land cover per municipality (MapBiomas Collection 11), SP and MG.
 *
 * Served by GET /api/v1/municipalities/land-cover, signed-in only (migration
 * 041). Each municipality is a vector of hectares in the order of `groups`;
 * read it through landCoverOf() rather than by position.
 */

export const LAND_COVER_GROUPS = [
  'forest', 'pasture', 'cane', 'crops', 'silviculture', 'mosaic', 'urban', 'other',
] as const;
export type LandCoverGroup = (typeof LAND_COVER_GROUPS)[number];

/** Years the table holds; the endpoint lists the loaded ones in `years`. */
export const LAND_COVER_YEARS = [1985, 2005, 2025] as const;
export type LandCoverYear = (typeof LAND_COVER_YEARS)[number];
export const LATEST_LAND_COVER_YEAR: LandCoverYear = 2025;

export const LAND_COVER_SOURCE = 'MapBiomas Collection 11';

export type LandCoverResponse =
  | { available: false }
  | {
      available: true;
      source: string;
      unit: 'ha';
      year: number;
      years: number[];
      groups: LandCoverGroup[];
      /** IBGE code → hectares, in the order of `groups`. */
      data: Record<string, number[]>;
    };

/** One municipality's hectares by group, or null when it has none. */
export function landCoverOf(
  response: LandCoverResponse | undefined,
  ibge: string,
): Record<LandCoverGroup, number> | null {
  if (!response?.available) return null;
  const row = response.data[ibge];
  if (!row) return null;
  return Object.fromEntries(response.groups.map((g, i) => [g, row[i] ?? 0])) as Record<LandCoverGroup, number>;
}

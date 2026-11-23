/**
 * Land around: what the land within a circle on the map is used for.
 *
 * The numbers come from /proximity/analyze, which clips the MapBiomas raster
 * (Collection 10, 2024, São Paulo) to the circle. That raster maps farming only:
 * crops, pasture, planted forest. Everything else in the circle (native
 * vegetation, towns, water, and any part outside São Paulo) has no class, so it
 * is shown as one remainder, measured against the full area of the circle and
 * not against the classified pixels alone.
 */
import type { LandUseClass, ProximityAnalysisResult, ProximityInfrastructure } from '@/services/proximityApi';

/** The radii the tool offers, in km. 20 km is what the old Proximity page recommended. */
export const LAND_AROUND_RADII = [10, 20, 50] as const;
export type LandAroundRadius = (typeof LAND_AROUND_RADII)[number];
export const DEFAULT_LAND_AROUND_RADIUS: LandAroundRadius = 20;

export function isLandAroundRadius(value: number): value is LandAroundRadius {
  return (LAND_AROUND_RADII as readonly number[]).includes(value);
}

/** MapBiomas ids that are not cropland although the raster files them as farming. */
export const PASTURE_CLASS = 15;
export const PLANTED_FOREST_CLASS = 9;

/** Rows listed by name before the rest of the farming is grouped. */
const LISTED_ROWS = 5;

export type LandRowKind = 'crop' | 'pasture' | 'planted_forest' | 'other_farming' | 'unmapped';

export interface LandRow {
  kind: LandRowKind;
  /** MapBiomas class id for a single class; null for a grouped row. */
  classId: number | null;
  /** Portuguese class name as served, for a fallback label. */
  servedName: string;
  color: string;
  areaKm2: number;
  /** Share of the whole circle, 0 to 100. */
  share: number;
}

export interface LandAroundSummary {
  circleKm2: number;
  /** Crops (every farming class but pasture and planted forest), share of the circle. */
  cropShare: number;
  pastureShare: number;
  plantedForestShare: number;
  /** No farming class: native vegetation, towns, water, or outside the raster. */
  unmappedShare: number;
  /** Largest first; the unmapped remainder always last. */
  rows: LandRow[];
  municipalityCount: number;
  /** The nearest municipality to the clicked point, to name the place. */
  placeName: string | null;
  biogasM3Year: number | null;
  /** True when the raster found no farming at all (MG, the sea, a city centre). */
  empty: boolean;
}

/** Grey for the remainder: it is the absence of a farming class, not a class. */
export const UNMAPPED_COLOR = '#d6ddda';
/** One colour for the farming classes folded into "other". */
export const OTHER_FARMING_COLOR = '#b9a88a';

export function circleAreaKm2(radiusKm: number): number {
  return Math.PI * radiusKm * radiusKm;
}

export function summarizeLandAround(result: ProximityAnalysisResult, radiusKm: number): LandAroundSummary {
  const circleKm2 = circleAreaKm2(radiusKm);
  const classes: LandUseClass[] = Object.values(result.results.land_use?.by_class ?? {})
    .filter((c) => c.area_km2 > 0 && c.class_id !== 0)
    .sort((a, b) => b.area_km2 - a.area_km2);

  // Pixels at the circle's edge can add up to a hair over the circle; cap at 100%.
  const classified = classes.reduce((sum, c) => sum + c.area_km2, 0);
  const scale = classified > circleKm2 ? circleKm2 / classified : 1;
  const share = (km2: number) => (100 * km2 * scale) / circleKm2;

  const kindOf = (c: LandUseClass): LandRowKind =>
    c.class_id === PASTURE_CLASS ? 'pasture' : c.class_id === PLANTED_FOREST_CLASS ? 'planted_forest' : 'crop';

  const rows: LandRow[] = classes.slice(0, LISTED_ROWS).map((c) => ({
    kind: kindOf(c),
    classId: c.class_id,
    servedName: c.name,
    color: c.color,
    areaKm2: c.area_km2 * scale,
    share: share(c.area_km2),
  }));
  const rest = classes.slice(LISTED_ROWS);
  if (rest.length) {
    const area = rest.reduce((sum, c) => sum + c.area_km2, 0);
    rows.push({ kind: 'other_farming', classId: null, servedName: '', color: OTHER_FARMING_COLOR, areaKm2: area * scale, share: share(area) });
  }

  const sumBy = (kind: LandRowKind) => classes.filter((c) => kindOf(c) === kind).reduce((s, c) => s + share(c.area_km2), 0);
  const cropShare = sumBy('crop');
  const pastureShare = sumBy('pasture');
  const plantedForestShare = sumBy('planted_forest');
  const unmappedShare = Math.max(0, 100 - share(classified));
  rows.push({
    kind: 'unmapped',
    classId: null,
    servedName: '',
    color: UNMAPPED_COLOR,
    areaKm2: (unmappedShare / 100) * circleKm2,
    share: unmappedShare,
  });

  const municipalities = [...(result.results.municipalities ?? [])].sort(
    (a, b) => (Number(a.distance_km) || 0) - (Number(b.distance_km) || 0),
  );

  return {
    circleKm2,
    cropShare,
    pastureShare,
    plantedForestShare,
    unmappedShare,
    rows,
    municipalityCount: municipalities.length,
    placeName: municipalities[0]?.name ?? null,
    // Without municipalities the server summed nothing: say nothing, not zero.
    biogasM3Year: municipalities.length
      ? result.summary?.total_biogas_m3_year ?? result.results.biogas_potential?.total_m3_year ?? null
      : null,
    empty: classes.length === 0,
  };
}

/**
 * Points around a circle, for the hole in the spotlight mask. Built on the
 * sphere's local scale, which is close enough at 50 km and keeps the hole on
 * top of Leaflet's own Circle, which uses the same approximation.
 */
export function circleRing(lat: number, lng: number, radiusKm: number, steps = 96): [number, number][] {
  const dLat = radiusKm / 111.32;
  const dLng = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  return Array.from({ length: steps }, (_, i) => {
    const a = (2 * Math.PI * i) / steps;
    return [lat + dLat * Math.sin(a), lng + dLng * Math.cos(a)];
  });
}

/**
 * The box the analysis accepts (the backend's request model): São Paulo and a
 * margin. A point outside it is refused before any request is sent.
 */
export const LAND_AROUND_BOUNDS = { south: -25, north: -19, west: -54, east: -44 } as const;

export function isInLandAroundBounds(lat: number, lng: number): boolean {
  const b = LAND_AROUND_BOUNDS;
  return lat >= b.south && lat <= b.north && lng >= b.west && lng <= b.east;
}

export interface LandAroundPoint {
  lat: number;
  lng: number;
}

/** The tool's state as the URL keeps it: ?tool=land&lat=..&lng=..&radius=.. */
export interface LandAroundParams {
  on: boolean;
  point: LandAroundPoint | null;
  radius: LandAroundRadius;
}

export const LAND_AROUND_TOOL = 'land';

/** Reads the tool's state from a query string. Anything malformed falls back quietly. */
export function parseLandAroundParams(search: string | URLSearchParams): LandAroundParams {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search;
  const on = params.get('tool') === LAND_AROUND_TOOL;
  const radiusRaw = Number(params.get('radius'));
  const radius = isLandAroundRadius(radiusRaw) ? radiusRaw : DEFAULT_LAND_AROUND_RADIUS;
  const latRaw = params.get('lat');
  const lngRaw = params.get('lng');
  const lat = latRaw === null || latRaw.trim() === '' ? NaN : Number(latRaw);
  const lng = lngRaw === null || lngRaw.trim() === '' ? NaN : Number(lngRaw);
  const valid = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  return { on, point: on && valid ? { lat, lng } : null, radius };
}

/**
 * Writes the tool's state into a copy of the query string, leaving every other
 * parameter as it was. Off removes all four.
 */
export function writeLandAroundParams(search: string | URLSearchParams, state: LandAroundParams): URLSearchParams {
  const params = new URLSearchParams(search);
  params.delete('tool');
  params.delete('lat');
  params.delete('lng');
  params.delete('radius');
  if (!state.on) return params;
  params.set('tool', LAND_AROUND_TOOL);
  if (state.point) {
    params.set('lat', state.point.lat.toFixed(4));
    params.set('lng', state.point.lng.toFixed(4));
  }
  params.set('radius', String(state.radius));
  return params;
}

/** The nearest feature of one infrastructure type, or null when the server has no such layer. */
export interface NearestInfrastructure {
  /** Null when nothing was found within maxKm. */
  distanceKm: number | null;
  maxKm: number | null;
}

export function nearestInfrastructure(result: ProximityAnalysisResult, type: string): NearestInfrastructure | null {
  const entry: ProximityInfrastructure | undefined = (result.results.infrastructure ?? []).find((i) => i.type === type);
  if (!entry) return null;
  if (entry.found === false || entry.distance_km == null) {
    // "Not found" and "layer not loaded" look the same in the response (a null
    // distance); only a found: false with a search radius says it was searched.
    return entry.found === false && entry.max_distance_km != null
      ? { distanceKm: null, maxKm: entry.max_distance_km }
      : null;
  }
  return { distanceKm: Number(entry.distance_km), maxKm: entry.max_distance_km ?? null };
}

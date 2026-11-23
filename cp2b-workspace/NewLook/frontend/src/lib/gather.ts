/**
 * Gather, the map's click tool: how much biomethane one plant at a point
 * could collect from the municipalities around it.
 *
 * Computed in the browser from the map's own features, so it covers São Paulo
 * and Minas Gerais alike (the proximity endpoint is SP only, and empty in
 * local Docker). The rule is a straight-line catchment: a municipality counts
 * when its centroid is within the radius of the point. Roads come with Truck
 * reach.
 *
 * Biomethane is the map's scenario value (m³/yr). Its split by source is the
 * same accessor narrowed to each sector's residues (lib/sectorSplit): where
 * the data has no honest split (the band scenarios), that municipality's
 * amount goes to "no split" instead of a guess.
 */
import type { Geometry } from 'geojson';
import { geometryContains } from '@/lib/dotDensity';
import { centroidOf, haversineKm, type LatLng } from '@/lib/mapGeometry';
import { getBiomethaneScenarioValue, MWH_PER_M3_CH4 } from '@/lib/mapValues';
import { sectorAmounts, SPLIT_SECTORS, type SplitSector } from '@/lib/sectorSplit';
import type { MapScenarioKey } from '@/data/scenarioFactors';
import type { MunicipalityFeature } from '@/types/geospatial';

export const GATHER_RADII = [25, 50, 100] as const;
export type GatherRadius = (typeof GATHER_RADII)[number];
export const DEFAULT_GATHER_RADIUS: GatherRadius = 50;

export function isGatherRadius(value: number): value is GatherRadius {
  return (GATHER_RADII as readonly number[]).includes(value);
}

/** Power if the biomethane is burned for electricity at this efficiency. */
export const POWER_EFFICIENCY = 0.38;
const HOURS_PER_YEAR = 8760;

/**
 * Average electric power in MW from biomethane in m³/yr:
 * m³ × 9.97 kWh/m³ × 0.38 / 8760 h / 1000. The 9.97 kWh/m³ is methane's
 * energy (MWH_PER_M3_CH4); the platform's biomethane is 96% methane, and the
 * brief and the mock-up apply 9.97 to biomethane as is.
 */
export function averageMw(biomethaneM3Year: number): number {
  return (biomethaneM3Year * MWH_PER_M3_CH4 * 1000 * POWER_EFFICIENCY) / HOURS_PER_YEAR / 1000;
}

export type GatherSource = SplitSector | 'unsplit';
export const GATHER_SOURCES: readonly GatherSource[] = [...SPLIT_SECTORS, 'unsplit'];

export interface GatherMember {
  code: string;
  name: string;
  /** Centroid, where its flow leaves from. */
  lat: number;
  lng: number;
  /** Straight-line km from the point to the centroid. */
  km: number;
  /** Biomethane, m³/yr, in the map's scenario; null when it has none. */
  biomethane: number | null;
  /** The same amount by source, m³/yr, summing to `biomethane`. */
  bySource: Record<GatherSource, number>;
  /** The source with the most, for the fill; null without biomethane. */
  dominant: GatherSource | null;
}

export interface GatherResult {
  members: GatherMember[];
  /** m³/yr over every member with biomethane. */
  total: number;
  bySource: Record<GatherSource, number>;
  /** The five that give the most, with their share of the total. */
  top: { code: string; name: string; share: number }[];
  /** Members with no biomethane in this scenario. */
  withoutData: number;
  /** The circle takes municipalities of both states. */
  crossesBorder: boolean;
}

const emptySources = (): Record<GatherSource, number> =>
  Object.fromEntries(GATHER_SOURCES.map((s) => [s, 0])) as Record<GatherSource, number>;

const inStates = (code: string) => code.startsWith('35') || code.startsWith('31');

export function gatherAround(
  features: readonly MunicipalityFeature[],
  point: LatLng,
  radiusKm: number,
  scenario: MapScenarioKey,
): GatherResult {
  const members: GatherMember[] = [];
  for (const feature of features) {
    const code = String(feature.properties?.ibge_code ?? '');
    if (!inStates(code)) continue;
    const c = centroidOf(feature);
    if (!c) continue;
    const km = haversineKm(point, c);
    if (km > radiusKm) continue;

    const value = getBiomethaneScenarioValue(feature.properties, scenario).value;
    const biomethane = value !== null && value > 0 ? value : value === 0 ? 0 : null;
    const bySource = emptySources();
    if (biomethane) {
      const split = sectorAmounts(feature.properties, 'biomethane_m3', {
        biomassType: 'total',
        selectedResidues: [],
        scenario,
      });
      const parts = split?.parts;
      if (parts && split.total > 0) {
        for (const s of SPLIT_SECTORS) bySource[s] = (biomethane * parts[s]) / split.total;
      } else {
        bySource.unsplit = biomethane;
      }
    }
    const dominant = biomethane
      ? GATHER_SOURCES.reduce((best, s) => (bySource[s] > bySource[best] ? s : best), GATHER_SOURCES[0])
      : null;
    members.push({
      code,
      name: feature.properties?.name ?? code,
      lat: c.lat,
      lng: c.lng,
      km,
      biomethane,
      bySource,
      dominant,
    });
  }
  members.sort((a, b) => a.km - b.km);

  const bySource = emptySources();
  let total = 0;
  for (const m of members) {
    if (!m.biomethane) continue;
    total += m.biomethane;
    for (const s of GATHER_SOURCES) bySource[s] += m.bySource[s];
  }
  const top = members
    .filter((m) => (m.biomethane ?? 0) > 0)
    .sort((a, b) => (b.biomethane ?? 0) - (a.biomethane ?? 0))
    .slice(0, 5)
    .map((m) => ({ code: m.code, name: m.name, share: total > 0 ? (m.biomethane ?? 0) / total : 0 }));
  const states = new Set(members.map((m) => m.code.slice(0, 2)));
  return {
    members,
    total,
    bySource,
    top,
    withoutData: members.filter((m) => m.biomethane === null).length,
    crossesBorder: states.size > 1,
  };
}

/**
 * The municipality the point lies in, to name the place; the nearest centroid
 * when the point is outside every outline (a river, the state border).
 */
export function placeOf(features: readonly MunicipalityFeature[], point: LatLng): MunicipalityFeature | null {
  let nearest: MunicipalityFeature | null = null;
  let best = Infinity;
  for (const feature of features) {
    if (!inStates(String(feature.properties?.ibge_code ?? ''))) continue;
    if (geometryContains(feature.geometry as Geometry, point.lng, point.lat)) return feature;
    const c = centroidOf(feature);
    if (!c) continue;
    const km = haversineKm(point, c);
    if (km < best) {
      best = km;
      nearest = feature;
    }
  }
  return nearest;
}

/**
 * Particles a municipality sends: about one per square root of its million
 * m³/yr, at least one, so the flow shows the order of magnitude without a
 * large municipality flooding the map.
 */
export function particleCount(biomethaneM3Year: number): number {
  if (!(biomethaneM3Year > 0)) return 0;
  return Math.max(1, Math.round(Math.sqrt(biomethaneM3Year / 1e6) * 3));
}

// ── The flow's clock ──────────────────────────────────────────────────────────

/** The circle grows to the radius in this long. */
export const GATHER_WAVE_MS = 1400;
/** A particle leaves within this long of the wave reaching its municipality. */
export const GATHER_STAGGER_MS = 1100;
/** A particle's trip to the hub. */
export const GATHER_TRIP_MS = 1000;
/** The whole movement, from the click to the last arrival. */
export const GATHER_TOTAL_MS = GATHER_WAVE_MS + GATHER_STAGGER_MS + GATHER_TRIP_MS;

/** Ease out: fast start, gentle arrival. */
export const easeOut = (p: number) => 1 - (1 - Math.min(1, Math.max(0, p))) ** 3;

/** When (ms after the click) the growing circle reaches a municipality at `km`. */
export function waveReachMs(km: number, radiusKm: number): number {
  if (!(radiusKm > 0)) return 0;
  const target = Math.min(1, Math.max(0, km / radiusKm));
  // Invert the ease: r(t) = R · easeOut(t / WAVE).
  const p = 1 - Math.cbrt(1 - target);
  return p * GATHER_WAVE_MS;
}

/** Share of the total arrived at the hub by `elapsed` ms, for the counter. */
export function arrivedShare(elapsedMs: number): number {
  const start = GATHER_WAVE_MS * 0.3;
  return easeOut((elapsedMs - start) / (GATHER_TOTAL_MS - start));
}

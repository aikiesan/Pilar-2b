/**
 * Compare, the map's click tool: which two municipalities are picked, and the
 * figures its window shows for each.
 *
 * Every figure comes from what the map already holds (the municipality
 * features, the scenario, /siting-indicators, /municipalities/land-cover); no
 * request of its own. A figure the data does not have is `null`, and the
 * window says "no data" for it, never 0: a served 0 is a result, an absent
 * field is not.
 */
import { isServedScenario, SERVED_SOURCE_TIER, type MapScenarioKey } from '@/data/scenarioFactors';
import type { SectorKey } from '@/data/sectorColors';
import { landCoverOf, type LandCoverGroup, type LandCoverResponse } from '@/lib/landCover';
import type { SitingIndicators } from '@/lib/mapAnalyses';
import { getBiomethaneScenarioValue, getResidueTonsOrNull, getSectorMetricValue } from '@/lib/mapValues';
import { municipalityStanding } from '@/lib/municipalityStanding';
import type { MunicipalityProperties } from '@/types/geospatial';
import type { ResidueType } from '@/types/map';

/** A first, B second. Orange and blue: told apart under colour blindness (dataviz validator). */
export const COMPARE_COLORS = { a: '#c2610c', b: '#1f6fb0' } as const;
export type CompareSlot = keyof typeof COMPARE_COLORS;

/**
 * The next pair after a click (or a search pick) on `code`:
 * the first is A, the second B, a third replaces B, and a click on A or B
 * removes it (B moves up to A when A goes).
 */
export function nextComparePair(pair: readonly string[], code: string): string[] {
  if (pair.includes(code)) return pair.filter((c) => c !== code);
  if (pair.length < 2) return [...pair, code];
  return [pair[0], code];
}

export const COMPARE_SECTORS: readonly SectorKey[] = ['agricultural', 'livestock', 'urban'];

/**
 * Where a request behind some of the figures stands. Only `ready` lets a null
 * figure read as "no data": while it loads, or when it failed, the platform
 * may well have the figure, so the window says that instead.
 */
export type FigureState = 'ready' | 'loading' | 'failed';

/** The state of a query whose data the figures come from. */
export function figureState(query: { data?: unknown; isError: boolean }): FigureState {
  if (query.data !== undefined) return 'ready';
  return query.isError ? 'failed' : 'loading';
}

/** Decimals for a distance in km, the same on the map and in the window. */
export const kmDecimals = (km: number) => (km < 10 ? 1 : 0);

const RESIDUES_BY_SECTOR: Record<SectorKey, readonly ResidueType[]> = {
  agricultural: ['sugarcane', 'soybean', 'corn', 'coffee', 'citrus'],
  livestock: ['cattle', 'swine', 'poultry', 'aquaculture'],
  urban: ['rsu', 'rpo', 'sewage'],
};
const RESIDUES: readonly ResidueType[] = COMPARE_SECTORS.flatMap((s) => RESIDUES_BY_SECTOR[s]);

/**
 * Land cover in five groups for the bar: eight colours side by side cannot be
 * told apart, five can (dataviz validator, light, on white). Colours from the
 * validated categorical palette, picked so the hue still reads as the
 * MapBiomas legend's: green vegetation, yellow pasture, pink cane, red urban.
 */
export const COVER_BAR_GROUPS = ['native', 'pasture', 'cane', 'other_farming', 'urban_other'] as const;
export type CoverBarGroup = (typeof COVER_BAR_GROUPS)[number];
export const COVER_BAR_COLORS: Record<CoverBarGroup, string> = {
  native: '#008300',
  pasture: '#eda100',
  cane: '#e87ba4',
  other_farming: '#6250d6',
  urban_other: '#e34948',
};
const BAR_GROUP_OF: Record<LandCoverGroup, CoverBarGroup> = {
  forest: 'native',
  pasture: 'pasture',
  cane: 'cane',
  crops: 'other_farming',
  silviculture: 'other_farming',
  mosaic: 'other_farming',
  urban: 'urban_other',
  other: 'urban_other',
};
/** Farmland: every farming group, the mosaic of farm uses included. */
const FARMLAND: readonly LandCoverGroup[] = ['pasture', 'cane', 'crops', 'silviculture', 'mosaic'];

export interface CompareSide {
  code: string;
  name: string;
  rank: { position: number; of: number } | null;
  /** Biomethane under the scenario, m³ per year. */
  biomethane: number | null;
  /** Residue mass by sector, tonnes per year; null when the sector has no data. */
  sectors: Record<SectorKey, number | null>;
  /** The three residues with the most mass; null when no residue has data. */
  topResidues: { key: ResidueType; tons: number }[] | null;
  /** Land cover in the latest year: hectares per bar group, and the farmland share 0–1. */
  landCover: { groups: Record<CoverBarGroup, number>; farmlandShare: number } | null;
  pipelineKm: number | null;
  biogasPlants: number | null;
}

type FeatureLike = { properties?: object | null };

/** The CH₄ field the rank reads: biomethane is CH₄ × a constant, so the order is the same. */
export function rankField(scenario: MapScenarioKey): string {
  return `ch4_${isServedScenario(scenario) ? SERVED_SOURCE_TIER[scenario] : 'cp2b_n4'}_m3_year`;
}

function landCoverSide(response: LandCoverResponse | undefined, code: string): CompareSide['landCover'] {
  const cover = landCoverOf(response, code);
  if (!cover) return null;
  const total = Object.values(cover).reduce((sum, ha) => sum + ha, 0);
  if (!(total > 0)) return null;
  const groups = Object.fromEntries(COVER_BAR_GROUPS.map((g) => [g, 0])) as Record<CoverBarGroup, number>;
  for (const [group, ha] of Object.entries(cover) as [LandCoverGroup, number][]) groups[BAR_GROUP_OF[group]] += ha;
  const farmland = FARMLAND.reduce((sum, g) => sum + cover[g], 0);
  return { groups, farmlandShare: farmland / total };
}

/**
 * One municipality's column.
 *
 * `props` should be the map feature's properties topped up with its detail
 * (useMunicipalityMetrics): the collection is served slim and the residue
 * tonnes live in the detail.
 */
export function compareSide(
  props: MunicipalityProperties,
  features: readonly FeatureLike[],
  scenario: MapScenarioKey,
  siting: SitingIndicators | null,
  landCover: LandCoverResponse | undefined,
): CompareSide {
  const code = String(props.ibge_code);
  const standing = municipalityStanding(features, code, rankField(scenario));

  const tons = RESIDUES.map((key) => ({ key, tons: getResidueTonsOrNull(props, key) }));
  // getSectorBiomassTons reads a missing sector as 0. Here a sector with no
  // total of its own and no residue with data is "no data".
  const record = props as unknown as Record<string, unknown>;
  const sectorKnown = (s: SectorKey) =>
    record[`${s}_biomass_tons_year`] != null ||
    tons.some((r) => r.tons !== null && RESIDUES_BY_SECTOR[s].includes(r.key));
  const sectors = Object.fromEntries(
    COMPARE_SECTORS.map((s) => [s, sectorKnown(s) ? getSectorMetricValue(props, s, 'biomass_tons', scenario) : null]),
  ) as Record<SectorKey, number | null>;

  const known = tons.filter((r): r is { key: ResidueType; tons: number } => r.tons !== null);
  const topResidues = known.length === 0
    ? null
    : known.filter((r) => r.tons > 0).sort((a, b) => b.tons - a.tons).slice(0, 3);

  const site = siting?.[code];
  return {
    code,
    name: props.name ?? code,
    rank: standing ? { position: standing.stateRank, of: standing.stateCount } : null,
    biomethane: getBiomethaneScenarioValue(props, scenario).value,
    sectors,
    topResidues,
    landCover: landCoverSide(landCover, code),
    pipelineKm: site && typeof site.pipeline_km === 'number' ? site.pipeline_km : null,
    biogasPlants: site && typeof site.biogas_plants === 'number' ? site.biogas_plants : null,
  };
}

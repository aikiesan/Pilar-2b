/**
 * One municipality's value for the map's metric, split by where the residue
 * comes from: agricultural, livestock, urban. Read by the two magnitude views,
 * Pontos (dot density) and Símbolos (circles by origin).
 *
 * The total is the choropleth's own number (the metric spec's accessor, in its
 * display unit), so a dot count, a circle and a polygon never disagree. Each
 * sector is the same accessor narrowed to that sector's residues. A split is
 * only returned when its parts add up to the total: some scenarios serve no
 * per-residue figures, and there the accessor answers the whole municipality
 * for every sector. Then `parts` is null and the views draw the total in one
 * neutral colour rather than invent a mix.
 */
import { RESIDUES_BY_SECTOR } from '@/lib/biomassAvailability';
import { getMetricSpec } from '@/lib/mapMetrics';
import type { MapScenarioKey } from '@/data/scenarioFactors';
import type { DisplayMetric, MunicipalityProperties } from '@/types/geospatial';
import type { BiomassType, ResidueType } from '@/types/map';

export const SPLIT_SECTORS = ['agricultural', 'livestock', 'urban'] as const;
export type SplitSector = (typeof SPLIT_SECTORS)[number];

export interface SplitContext {
  biomassType: BiomassType;
  selectedResidues: ResidueType[];
  scenario: MapScenarioKey;
}

export interface SectorAmounts {
  /** The metric in its display unit (as the choropleth paints it). */
  total: number;
  /** The same total by origin, or null when the data has no honest split. */
  parts: Record<SplitSector, number> | null;
}

/** Parts may miss the total by rounding, never by more than this share. */
const SPLIT_TOLERANCE = 0.02;

/**
 * Whether a metric is an amount that can be counted out in dots or sized as
 * an area. A rate (per inhabitant) cannot: two municipalities of 50 m³ per
 * person do not make 100.
 */
export function isAmountMetric(metric: DisplayMetric): boolean {
  return metric !== 'ch4_per_capita';
}

export function sectorAmounts(
  props: MunicipalityProperties,
  metric: DisplayMetric,
  ctx: SplitContext,
): SectorAmounts | null {
  const spec = getMetricSpec(metric);
  const raw = spec.rawValue(props, ctx).value;
  if (raw === null || !(raw > 0)) return null;
  const total = spec.toDisplay(raw);

  const parts = {} as Record<SplitSector, number>;
  for (const sector of SPLIT_SECTORS) {
    if (ctx.biomassType !== 'total' && ctx.biomassType !== sector) {
      parts[sector] = 0;
      continue;
    }
    const own = RESIDUES_BY_SECTOR[sector];
    const residues = ctx.selectedResidues.length > 0
      ? ctx.selectedResidues.filter((r) => own.includes(r))
      : own;
    if (ctx.selectedResidues.length > 0 && residues.length === 0) {
      parts[sector] = 0;
      continue;
    }
    // Tonnage has a served total per sector; read it whole when no residue is
    // picked, as the choropleth does for that sector.
    const narrowed: SplitContext = metric === 'biomass_tons' && ctx.selectedResidues.length === 0
      ? { ...ctx, biomassType: sector, selectedResidues: [] }
      : { ...ctx, biomassType: sector, selectedResidues: [...residues] };
    const value = spec.rawValue(props, narrowed).value;
    parts[sector] = value === null ? 0 : spec.toDisplay(value);
  }

  const sum = SPLIT_SECTORS.reduce((acc, s) => acc + parts[s], 0);
  const honest = sum > 0 && Math.abs(sum - total) <= total * SPLIT_TOLERANCE;
  return { total, parts: honest ? parts : null };
}

/**
 * The two magnitude views from the map's features: what Pontos and Símbolos
 * draw, and what their legend needs to say about it. Pure, so it is computed
 * once per change of data, metric, selection or scenario (useMemo), and tested
 * without a map.
 */
import { centroidOf } from '@/lib/mapGeometry';
import { dotCounts, dotValueFor, placeDots, seededRandom, type Dot } from '@/lib/dotDensity';
import { sectorAmounts, SPLIT_SECTORS, type SectorAmounts, type SplitContext, type SplitSector } from '@/lib/sectorSplit';
import type { DisplayMetric, MunicipalityFeature } from '@/types/geospatial';

export interface SymbolItem {
  code: string;
  lat: number;
  lng: number;
  amounts: SectorAmounts;
}

export interface MagnitudeLegendFacts {
  /** The origins that show up anywhere on the map, in fixed order. */
  sectors: SplitSector[];
  /** How many municipalities have an amount but no split (drawn in ink). */
  unsplit: number;
  /** Municipalities with an amount. */
  count: number;
}

function amountsOf(features: readonly MunicipalityFeature[], metric: DisplayMetric, ctx: SplitContext) {
  const out: { feature: MunicipalityFeature; code: string; amounts: SectorAmounts }[] = [];
  for (const feature of features) {
    const amounts = sectorAmounts(feature.properties, metric, ctx);
    if (amounts) out.push({ feature, code: String(feature.properties?.ibge_code ?? ''), amounts });
  }
  return out;
}

function factsOf(rows: { amounts: SectorAmounts }[]): MagnitudeLegendFacts {
  const seen = new Set<SplitSector>();
  let unsplit = 0;
  for (const { amounts } of rows) {
    if (!amounts.parts) {
      unsplit++;
      continue;
    }
    for (const s of SPLIT_SECTORS) if (amounts.parts[s] > 0) seen.add(s);
  }
  return { sectors: SPLIT_SECTORS.filter((s) => seen.has(s)), unsplit, count: rows.length };
}

export interface SymbolsView extends MagnitudeLegendFacts {
  /** Largest first, so the small ones end up drawn on top. */
  items: SymbolItem[];
  maxValue: number;
}

export function buildSymbols(
  features: readonly MunicipalityFeature[],
  metric: DisplayMetric,
  ctx: SplitContext,
): SymbolsView {
  const rows = amountsOf(features, metric, ctx);
  const items: SymbolItem[] = [];
  for (const { feature, code, amounts } of rows) {
    const c = centroidOf(feature);
    if (c) items.push({ code, lat: c.lat, lng: c.lng, amounts });
  }
  items.sort((a, b) => b.amounts.total - a.amounts.total);
  return { ...factsOf(rows), items, maxValue: items[0]?.amounts.total ?? 0 };
}

export interface DotsView extends MagnitudeLegendFacts {
  dots: Dot[];
  /** What one dot is worth, in the metric's display unit. */
  dotValue: number;
}

export function buildDots(
  features: readonly MunicipalityFeature[],
  metric: DisplayMetric,
  ctx: SplitContext,
): DotsView {
  const rows = amountsOf(features, metric, ctx);
  const total = rows.reduce((acc, r) => acc + r.amounts.total, 0);
  const dotValue = dotValueFor(total);
  const dots: Dot[] = [];
  for (const { feature, code, amounts } of rows) {
    const seed = Number(code) || 1;
    const counts = dotCounts(amounts, dotValue, seededRandom(seed ^ 0x9e3779b9));
    for (const d of placeDots(feature.geometry, counts, seed)) dots.push(d);
  }
  return { ...factsOf(rows), dots, dotValue };
}

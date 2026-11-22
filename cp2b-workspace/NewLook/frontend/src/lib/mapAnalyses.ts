/**
 * The map's four ready-made analyses: each crosses two indicators into a 3×3
 * bivariate map (lib/bivariate.ts gives the nine fills and the cell index).
 *
 *   lacuna      methane × biogas plants     where there is potential and no plant
 *   siting      methane × pipeline nearness where a plant could inject cheaply
 *   codigestao  agricultural × livestock    where the two substrates meet
 *   coleta      Ideal methane × share lost  where collection loses the most
 *
 * Classes are cut here, in the browser, over the municipalities of the state
 * on screen (SP, or the MG pilot): a class is a tertile among peers, so the
 * same municipality can fall in a different class on the /map choropleth,
 * whose breaks are logarithmic. The legend prints the method and the breaks.
 *
 * Plants and pipeline distance come from /municipalities/siting-indicators
 * (PostGIS); everything else is already in the map's GeoJSON.
 */

import { bivariateFills, type AxisClass, type BivariatePalette } from './bivariate'

export type AnalysisId = 'lacuna' | 'siting' | 'codigestao' | 'coleta'

export const ANALYSIS_IDS: readonly AnalysisId[] = ['lacuna', 'siting', 'codigestao', 'coleta']

export const isAnalysisId = (v: unknown): v is AnalysisId =>
  typeof v === 'string' && (ANALYSIS_IDS as readonly string[]).includes(v)

export interface SitingIndicator {
  biogas_plants: number
  pipeline_km: number | null
}
export type SitingIndicators = Record<string, SitingIndicator>

type Props = Record<string, unknown>

/**
 * How an axis is cut into three classes.
 *  - `tertile_nonzero`: tertiles of the values above zero; a measured zero is class 0.
 *  - `tertile`: tertiles of every value, zero included.
 *  - `fixed_count`: 0 · 1 · 2+, for small counts whose tertiles collapse into ties.
 */
export type AxisMethod = 'tertile_nonzero' | 'tertile' | 'fixed_count'

export interface AxisDef {
  /** Key under Map.analyses.axes, for the legend. */
  key: 'methane' | 'methane_ideal' | 'plants' | 'pipeline' | 'agricultural' | 'livestock' | 'loss'
  method: AxisMethod
  /** True when a SMALLER value is the stronger class (distance: near is class 2). */
  invert?: boolean
  value: (p: Props, siting: SitingIndicators | null, tierField: string) => number | null
}

export interface AnalysisDef {
  id: AnalysisId
  x: AxisDef
  y: AxisDef
  /** The cell (cy * 3 + cx) that answers the analysis's question. */
  answerCell: number
  /** Needs /siting-indicators. */
  needsSiting: boolean
  /** Infrastructure layers worth seeing under the analysis. */
  layers: readonly string[]
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)

const methane: AxisDef = {
  key: 'methane',
  method: 'tertile_nonzero',
  value: (p, _s, tierField) => num(p[tierField]),
}

export const ANALYSES: Record<AnalysisId, AnalysisDef> = {
  lacuna: {
    id: 'lacuna',
    x: methane,
    y: {
      key: 'plants',
      method: 'fixed_count',
      value: (p, s) => (s ? (s[String(p.ibge_code)]?.biogas_plants ?? null) : null),
    },
    // Much methane, no plant: the gap.
    answerCell: 2,
    needsSiting: true,
    layers: ['biogas_plant'],
  },
  siting: {
    id: 'siting',
    x: methane,
    y: {
      key: 'pipeline',
      method: 'tertile',
      invert: true,
      value: (p, s) => (s ? (s[String(p.ibge_code)]?.pipeline_km ?? null) : null),
    },
    // Much methane, close to a pipeline.
    answerCell: 8,
    needsSiting: true,
    layers: ['gas_pipeline_transport', 'gas_pipeline_distribution'],
  },
  codigestao: {
    id: 'codigestao',
    x: { key: 'agricultural', method: 'tertile_nonzero', value: (p) => num(p.agricultural_biomass_tons_year) },
    y: { key: 'livestock', method: 'tertile_nonzero', value: (p) => num(p.livestock_biomass_tons_year) },
    // Both substrates abundant.
    answerCell: 8,
    needsSiting: false,
    layers: [],
  },
  coleta: {
    id: 'coleta',
    x: { key: 'methane_ideal', method: 'tertile_nonzero', value: (p) => num(p.ch4_cp2b_n3_m3_year) },
    y: {
      key: 'loss',
      method: 'tertile',
      // Share of the Ideal (N3) that does not reach the Real (N4), 0–1.
      value: (p) => {
        const ideal = num(p.ch4_cp2b_n3_m3_year)
        const real = num(p.ch4_cp2b_n4_m3_year)
        if (ideal === null || real === null) return null
        return ideal > 0 ? Math.min(1, Math.max(0, 1 - real / ideal)) : 0
      },
    },
    // Much potential, much of it lost.
    answerCell: 8,
    needsSiting: false,
    layers: [],
  },
}

export type Breaks = readonly [number, number]

/** The value at quantile q of an ascending array (nearest rank). */
function quantile(sorted: readonly number[], q: number): number {
  const i = Math.min(sorted.length - 1, Math.max(0, Math.floor(q * sorted.length)))
  return sorted[i]
}

/** The two inner breaks of an axis over its values, or null when there are too few to cut. */
export function axisBreaks(values: readonly number[], method: AxisMethod): Breaks | null {
  if (method === 'fixed_count') return [1, 2]
  const pool = (method === 'tertile_nonzero' ? values.filter((v) => v > 0) : [...values]).sort((a, b) => a - b)
  if (pool.length < 3) return null
  // A value equal to a break goes to the class above, so a break sitting on
  // the minimum (many tied zeros) would leave class 0 empty. Move each break up
  // to the next distinct value instead: the tied values then fill the class.
  const above = (v: number) => pool.find((x) => x > v)
  let low = quantile(pool, 1 / 3)
  if (low <= pool[0]) {
    const next = above(pool[0])
    if (next === undefined) return null // every value the same: nothing to cut
    low = next
  }
  let high = quantile(pool, 2 / 3)
  if (high <= low) high = above(low) ?? low
  return [low, high]
}

/**
 * Class 0–2 of a value. Same boundary rule as lib/bivariate's classifyValue: a
 * value equal to a break belongs to the class above. A measured zero in a
 * `tertile_nonzero` axis is class 0, not "no data". Inverted axes flip the
 * result, so the strongest class is always 2.
 */
export function axisClassOf(value: number | null, breaks: Breaks | null, axis: Pick<AxisDef, 'method' | 'invert'>): AxisClass | null {
  if (value === null || !Number.isFinite(value) || breaks === null) return null
  let c: AxisClass
  if (axis.method === 'tertile_nonzero' && value === 0) c = 0
  else if (value < breaks[0]) c = 0
  else if (value < breaks[1]) c = 1
  else c = 2
  return axis.invert ? ((2 - c) as AxisClass) : c
}

export interface Classified {
  x: number | null
  y: number | null
  /** Cell 0–8 (cy * 3 + cx), or null when either axis has no data. */
  cell: number | null
}

export interface AnalysisResult {
  id: AnalysisId
  xBreaks: Breaks | null
  yBreaks: Breaks | null
  byCode: Map<string, Classified>
  /** Municipalities per cell, 0–8. */
  counts: number[]
  /** Municipalities with no cell (either axis missing). */
  noData: number
}

/**
 * Classifies every municipality of the given state (two-digit IBGE prefix).
 * Others are left out of `byCode`: the analysis is a reading of one state.
 */
export function classifyAnalysis(
  def: AnalysisDef,
  features: readonly { properties?: object | null }[],
  uf: string,
  siting: SitingIndicators | null,
  tierField: string,
): AnalysisResult {
  const rows: { code: string; x: number | null; y: number | null }[] = []
  for (const f of features) {
    const p = (f.properties ?? {}) as Props
    const code = String(p.ibge_code ?? '')
    if (code.slice(0, 2) !== uf) continue
    rows.push({ code, x: def.x.value(p, siting, tierField), y: def.y.value(p, siting, tierField) })
  }
  const known = (vals: (number | null)[]) => vals.filter((v): v is number => v !== null && Number.isFinite(v))
  const xBreaks = axisBreaks(known(rows.map((r) => r.x)), def.x.method)
  const yBreaks = axisBreaks(known(rows.map((r) => r.y)), def.y.method)

  const byCode = new Map<string, Classified>()
  const counts = new Array<number>(9).fill(0)
  let noData = 0
  for (const r of rows) {
    const cx = axisClassOf(r.x, xBreaks, def.x)
    const cy = axisClassOf(r.y, yBreaks, def.y)
    const cell = cx === null || cy === null ? null : cy * 3 + cx
    if (cell === null) noData++
    else counts[cell]++
    byCode.set(r.code, { x: r.x, y: r.y, cell })
  }
  return { id: def.id, xBreaks, yBreaks, byCode, counts, noData }
}

/** The fill for a cell, or null for no data. */
export function analysisFill(cell: number | null, palette: BivariatePalette = 'default'): string | null {
  return cell === null ? null : bivariateFills(palette)[cell]
}

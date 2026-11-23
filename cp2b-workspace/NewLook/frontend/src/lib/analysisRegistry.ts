/**
 * Registry analyses: the bivariate analyses an account may see, served by the
 * API (GET /analyses) next to the four built-in ones. The server sends cells,
 * cuts and counts, never raw values, so a registry result has no x/y numbers.
 *
 * `AnalysisView` is what the map window draws for either kind, so the window
 * does not care where an analysis came from.
 */

import {
  ANALYSES,
  isAnalysisId,
  type AnalysisId,
  type AnalysisResult,
  type AxisDef,
  type Breaks,
  type Classified,
  type MapAnalysisRef,
} from './mapAnalyses'

export type { MapAnalysisRef }

export interface LocalizedText {
  pt: string
  en: string
}

/** One item of GET /analyses. */
export interface RegistryAnalysisMeta {
  id: string
  title: LocalizedText
  question: LocalizedText
  source: LocalizedText | null
  x_label: LocalizedText
  y_label: LocalizedText
  answer_cell: number
  /** The axis reads "closer is stronger" (a distance): its labels run backwards. */
  x_invert?: boolean
  y_invert?: boolean
  layers: string[]
  uf_prefixes: string[]
}

interface ServedBreaks {
  x: [number, number] | null
  y: [number, number] | null
}

/** GET /analyses/{id}. `breaks`, `counts` and `no_data` are keyed by UF prefix. */
export interface RegistryAnalysisDetail {
  id: string
  cells: Record<string, number | null>
  breaks: Record<string, ServedBreaks>
  counts: Record<string, number[]>
  no_data: Record<string, number>
}

export const REGISTRY_ID_PATTERN = /^[a-z0-9_]{1,40}$/

export const isRegistryId = (v: unknown): v is string => typeof v === 'string' && REGISTRY_ID_PATTERN.test(v)

export const isRegistryRef = (ref: string): ref is `r:${string}` => ref.startsWith('r:')

export const registryId = (ref: `r:${string}`): string => ref.slice(2)

/** A ?a= value: a built-in id or `r:` plus a well-formed registry id; anything else is null. */
export function readAnalysisRef(param: string | null): MapAnalysisRef | null {
  if (param === null) return null
  if (isAnalysisId(param)) return param
  if (isRegistryRef(param) && isRegistryId(registryId(param))) return param
  return null
}

export interface AnalysisView {
  ref: MapAnalysisRef
  title: string
  question: string
  answer: string
  xLabel: string
  yLabel: string
  answerCell: number
  xInvert: boolean
  yInvert: boolean
  source: string | null
  layers: readonly string[]
}

/** The Map.analyses keys a built-in view reads; next-intl's typed translator fits. */
export type BuiltInViewKey = `${AnalysisId}.${'title' | 'question' | 'answer'}` | `axes.${AxisDef['key']}`

/** `t` reads under Map.analyses. */
export function builtInView(id: AnalysisId, t: (key: BuiltInViewKey) => string): AnalysisView {
  const def = ANALYSES[id]
  return {
    ref: id,
    title: t(`${id}.title`),
    question: t(`${id}.question`),
    answer: t(`${id}.answer`),
    xLabel: t(`axes.${def.x.key}`),
    yLabel: t(`axes.${def.y.key}`),
    answerCell: def.answerCell,
    xInvert: def.x.invert ?? false,
    yInvert: def.y.invert ?? false,
    source: null,
    layers: def.layers,
  }
}

/** `tAnswer` is the generic Map.analyses.registry_answer: the registry has no per-analysis answer. */
export function registryView(meta: RegistryAnalysisMeta, locale: 'pt-BR' | 'en', tAnswer: string): AnalysisView {
  const k = locale === 'en' ? 'en' : 'pt'
  return {
    ref: `r:${meta.id}`,
    title: meta.title[k],
    question: meta.question[k],
    answer: tAnswer,
    xLabel: meta.x_label[k],
    yLabel: meta.y_label[k],
    answerCell: meta.answer_cell,
    xInvert: meta.x_invert ?? false,
    yInvert: meta.y_invert ?? false,
    source: meta.source ? meta.source[k] : null,
    layers: meta.layers,
  }
}

/** The result for one state (two-digit IBGE prefix). Values are not served, so x/y are null. */
export function registryResult(detail: RegistryAnalysisDetail, uf: '35' | '31'): AnalysisResult {
  const byCode = new Map<string, Classified>()
  for (const [code, cell] of Object.entries(detail.cells)) {
    if (code.slice(0, 2) !== uf) continue
    byCode.set(code, { x: null, y: null, cell })
  }
  const breaks = detail.breaks[uf]
  const counts = detail.counts[uf]
  return {
    id: `r:${detail.id}`,
    xBreaks: (breaks?.x ?? null) as Breaks | null,
    yBreaks: (breaks?.y ?? null) as Breaks | null,
    byCode,
    counts: counts ? [...counts] : new Array<number>(9).fill(0),
    noData: detail.no_data[uf] ?? 0,
  }
}

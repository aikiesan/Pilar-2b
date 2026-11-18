/**
 * Where the data on the map and the municipality pages comes from: the
 * registry of data/canonical_parameters/fontes_dados.yaml, served at
 * /api/v1/sources. Each map layer and page block cites sources by key, and the
 * page puts a source button (components/mandate/Cite) beside what it shows.
 *
 * Runs on the server (municipality page, via serverGetJson) and in the browser
 * (map and Proximity, via hooks/useDataSources). No source is ever written
 * here: when the catalog cannot be read, the button is left out, never guessed.
 */
import type { useFormatter } from 'next-intl'
import type { SourceKind } from '@/components/mandate/SourceList'

export const SOURCES_PATH = '/sources'

export interface DataSource {
  key: string
  title: string
  /** Text of the button: "IBGE, PAM". */
  short: string
  /** Null until checked at the source; `to_check` then says so. */
  publisher: string | null
  /** "2023", "2025-08" or "2025-08-15", at the precision known. */
  date: string | null
  url: string | null
  kind: SourceKind
  note: string | null
  license: string | null
  /** What is still to confirm (link, date, licence, original publisher). */
  to_check: string | null
}

export interface SourceCatalog {
  version: string
  sources: Record<string, DataSource>
  /** Map layer id (MapComponent INITIAL_LAYERS) -> source keys. */
  layers: Record<string, string[]>
  /** Page block -> source keys. */
  pages: Record<string, string[]>
  to_check: string[]
  without_license: string[]
}

function cited(catalog: SourceCatalog | null | undefined, keys: readonly string[] | undefined): DataSource[] {
  if (!catalog || !keys) return []
  return keys.map((k) => catalog.sources[k]).filter((s): s is DataSource => s !== undefined)
}

export const layerSources = (catalog: SourceCatalog | null | undefined, layerId: string) =>
  cited(catalog, catalog?.layers[layerId])

export const pageSources = (catalog: SourceCatalog | null | undefined, block: string) =>
  cited(catalog, catalog?.pages[block])

/** next-intl's formatter: useFormatter() in the browser, getFormatter() on the server. */
type DateFormatter = Pick<ReturnType<typeof useFormatter>, 'dateTime'>

/** "2023", "ago. de 2025" or "15 de ago. de 2025": shown at the precision given. */
export function sourceDateLabel(date: string, format: DateFormatter): string {
  const [y, m, day] = date.split('-')
  if (!m) return y
  const d = new Date(Date.UTC(Number(y), Number(m) - 1, Number(day ?? 15), 12))
  return format.dateTime(
    d,
    day ? { dateStyle: 'medium', timeZone: 'UTC' } : { month: 'short', year: 'numeric', timeZone: 'UTC' },
  )
}

/**
 * The `dataSources` messages describeSource reads. The kind's label comes from
 * the caller's own translator (`t(\`kinds.${kind}\`)`), where the key check can see it.
 */
export type SourceTranslator = (key: 'describe' | 'to_check' | 'new_tab', values?: Record<string, string>) => string

/**
 * The whole citation, read out by screen readers and shown on hover:
 * "Fonte (Oficial): IBGE, PAM — IBGE, 2023. Abre em nova aba." Fields the
 * registry does not know yet are left out, and what is missing is said.
 */
export function describeSource(
  s: DataSource,
  t: SourceTranslator,
  kindLabel: (kind: SourceKind) => string,
  format: DateFormatter,
): string {
  const by = [s.publisher, s.date && sourceDateLabel(s.date, format)].filter(Boolean).join(', ')
  return [
    t('describe', { kind: kindLabel(s.kind), title: s.title, by: by ? ` — ${by}` : '' }),
    s.note,
    s.to_check ? t('to_check', { what: s.to_check }) : null,
    s.url ? t('new_tab') : null,
  ]
    .filter(Boolean)
    .join(' ')
}

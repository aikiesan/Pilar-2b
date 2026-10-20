/**
 * Where a card's numbers come from: each figure's sources, with the kind of
 * source (official, data, study, company, press, estimate), who published it,
 * when, and a link. Folded by default so the card stays readable; the summary
 * says how many sources there are and when they were checked.
 *
 * The entries come from the `fontes` registry of mandato_biometano.yaml, via
 * /api/v1/mandate/panel; labels arrive translated, so this stays a plain
 * server-renderable component.
 */
import { ExternalLink } from 'lucide-react'

export const SOURCE_KINDS = ['oficial', 'dados', 'estudo', 'empresa', 'imprensa', 'estimativa'] as const
export type SourceKind = (typeof SOURCE_KINDS)[number]

export interface Reference {
  key: string
  title: string
  publisher: string
  date: string
  url: string | null
  kind: SourceKind
  note: string | null
}

/** Strongest first: official and data the reader can recheck, press and estimates to confirm. */
const KIND_CLASS: Record<SourceKind, string> = {
  oficial: 'border-dusk-700 text-dusk-800 dark:border-dusk-300 dark:text-dusk-200',
  dados: 'border-dusk-700 text-dusk-800 dark:border-dusk-300 dark:text-dusk-200',
  estudo: 'border-line-strong text-ink',
  empresa: 'border-line-strong text-ink',
  imprensa: 'border-terra-700 text-terra-800 dark:border-terra-400 dark:text-terra-200',
  estimativa: 'border-terra-700 border-dashed text-terra-800 dark:border-terra-400 dark:text-terra-200',
}

export function KindBadge({ kind, label }: { kind: SourceKind; label: string }) {
  return (
    <span className={`inline-block shrink-0 self-start rounded border px-1.5 text-[0.7rem] uppercase leading-5 tracking-wide ${KIND_CLASS[kind]}`}>
      {label}
    </span>
  )
}

export function SourceItem({
  source,
  kindLabel,
  dateLabel,
}: {
  source: Reference
  kindLabel: (kind: SourceKind) => string
  dateLabel: (date: string) => string
}) {
  return (
    <li className="flex gap-2">
      <KindBadge kind={source.kind} label={kindLabel(source.kind)} />
      <span>
        {source.url ? (
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-terra-700 underline underline-offset-2 dark:text-terra-300"
          >
            {source.title}
            <ExternalLink className="ml-1 inline h-3 w-3 align-baseline" aria-hidden="true" />
          </a>
        ) : (
          <span className="text-ink">{source.title}</span>
        )}
        <span className="text-ink-muted">
          {' '}
          · {source.publisher} · {dateLabel(source.date)}
        </span>
        {source.note && <span className="block italic text-ink-muted">{source.note}</span>}
      </span>
    </li>
  )
}

export default function SourceList({
  summary,
  groups,
  kindLabel,
  dateLabel,
}: {
  /** e.g. "Fontes deste quadro (9) · conferidas em 20 de out. de 2026". */
  summary: string
  /** One group per figure: what the sources back, then the sources. */
  groups: { key: string; label: string; sources: Reference[] }[]
  kindLabel: (kind: SourceKind) => string
  dateLabel: (date: string) => string
}) {
  return (
    <details className="group mt-4 border-t border-line pt-3 text-xs">
      <summary className="cursor-pointer font-medium text-ink marker:text-ink-muted">{summary}</summary>
      <dl className="mt-3 space-y-3">
        {groups.map((g) => (
          <div key={g.key}>
            <dt className="font-medium text-ink">{g.label}</dt>
            <dd>
              <ul className="mt-1 space-y-1.5">
                {g.sources.map((s) => (
                  <SourceItem key={s.key} source={s} kindLabel={kindLabel} dateLabel={dateLabel} />
                ))}
              </ul>
            </dd>
          </div>
        ))}
      </dl>
    </details>
  )
}

/** Distinct sources across groups (a source can back several figures). */
export const countSources = (groups: { sources: Reference[] }[]) =>
  new Set(groups.flatMap((g) => g.sources.map((s) => s.key))).size

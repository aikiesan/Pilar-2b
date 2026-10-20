/**
 * The buttons beside a figure on the mandate page: one per source, showing
 * its short citation ("CCEE, InfoPLD jul/2026") in the colour of its kind.
 * A linked source opens straight at the source in a new tab; an assumption
 * of the platform has no link and its dashed button says so. A figure the
 * platform computes gets a "calculation" button that jumps to the card's
 * "How we calculate" block, where the arithmetic is written out.
 *
 * The accessible name carries the whole citation (kind, title, publisher,
 * date), and hovering shows it too, so the short label can stay short.
 */
import { Calculator, ExternalLink } from 'lucide-react'
import { KIND_CLASS, type Reference } from './SourceList'

const CHIP =
  'inline-flex items-center gap-0.5 whitespace-nowrap rounded-full border px-1.5 py-0.5 text-[0.7rem] font-normal leading-none no-underline'

export type Describe = (source: Reference) => string

export default function Cite({
  sources,
  describe,
  className = '',
}: {
  sources: readonly Reference[] | undefined
  /** The full citation, read out and shown on hover: "Fonte (oficial): …". */
  describe: Describe
  className?: string
}) {
  if (!sources?.length) return null
  return (
    <span className={`ml-1 inline-flex flex-wrap gap-1 align-baseline ${className}`}>
      {sources.map((s) =>
        s.url ? (
          <a
            key={s.key}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={describe(s)}
            title={describe(s)}
            className={`${CHIP} ${KIND_CLASS[s.kind]} hover:bg-paper-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1`}
          >
            {s.short}
            <ExternalLink className="h-2.5 w-2.5" aria-hidden="true" />
          </a>
        ) : (
          <span key={s.key} title={describe(s)} className={`${CHIP} ${KIND_CLASS[s.kind]}`}>
            <span aria-hidden="true">{s.short}</span>
            <span className="sr-only">{describe(s)}</span>
          </span>
        ),
      )}
    </span>
  )
}

/** "Calculation": jumps to the card's "How we calculate" block. */
export function CalcLink({ href, label, text }: { href: `#${string}`; label: string; text: string }) {
  return (
    <a
      href={href}
      aria-label={label}
      title={label}
      className={`${CHIP} ml-1 border-line-strong align-baseline text-ink hover:bg-paper-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1`}
    >
      <Calculator className="h-2.5 w-2.5" aria-hidden="true" />
      {text}
    </a>
  )
}

/** The key to the buttons: one sample per kind of source, then the calculation one. */
export function CiteLegend({
  heading,
  kinds,
  calcText,
}: {
  heading: string
  kinds: { kind: Reference['kind']; label: string }[]
  calcText: string
}) {
  return (
    <p className="flex flex-wrap items-center gap-1 text-xs text-ink-muted">
      <span className="mr-1">{heading}</span>
      {kinds.map(({ kind, label }) => (
        <span key={kind} className={`${CHIP} ${KIND_CLASS[kind]}`}>
          {label}
        </span>
      ))}
      <span className={`${CHIP} border-line-strong text-ink`}>
        <Calculator className="h-2.5 w-2.5" aria-hidden="true" />
        {calcText}
      </span>
    </p>
  )
}

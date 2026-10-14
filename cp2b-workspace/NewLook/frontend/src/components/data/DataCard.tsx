/**
 * The data card: one line that says what a figure is, after MapBiomas — the
 * quantity, its scope, where, and from which base. Every page that shows a
 * number from the platform carries one, so a screenshot still says what it
 * shows.
 *
 *   Biometano · potencial disponível, cenário real · Campinas (SP) · ano-base por fonte
 *
 * Works in server and client components (no hooks); the caller passes the
 * already-translated parts. Empty parts are dropped.
 */
export default function DataCard({
  parts,
  label,
  className = '',
}: {
  parts: Array<string | null | undefined | false>
  /** Accessible name, e.g. "Sobre estes dados". */
  label: string
  className?: string
}) {
  const shown = parts.filter((p): p is string => Boolean(p))
  return (
    <div
      role="note"
      aria-label={label}
      className={`flex flex-wrap items-center gap-x-2 gap-y-1 border-y border-line py-2 text-xs text-ink-muted ${className}`}
    >
      {shown.map((part, index) => (
        <span key={`${index}-${part}`} className="inline-flex items-center gap-2">
          {index > 0 && <span aria-hidden="true" className="text-line-strong">·</span>}
          <span className={index === 0 ? 'font-semibold uppercase tracking-[0.12em] text-ink' : undefined}>{part}</span>
        </span>
      ))}
    </div>
  )
}

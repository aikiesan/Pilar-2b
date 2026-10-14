/**
 * The municipality visuals: stat tiles, a rank strip, a stacked share bar and
 * bar lists. Plain HTML, no client code, so the same pieces render on the
 * server page (/municipalities/[slug]) and inside the map's sidebar, print,
 * and read in order without CSS.
 *
 * Colour never carries meaning alone: every bar has its own text label, and
 * residues sit under their sector's heading. That is required, not a nicety:
 * the sector palette fails the colour-blind check on its own (agrícola and
 * pecuária are ΔE 2.9 apart under protanopia).
 *
 * Mark specs: thin bars (10px), a 4px rounded data end, a 2px surface gap
 * between stacked segments, recessive tracks, values in ink, never in the
 * series colour.
 */
import type { CSSProperties, ReactNode } from 'react'

const pct = (value: number, scale: number) => (scale > 0 ? Math.min(100, (value / scale) * 100) : 0)
/** A drawn bar is at least 2px wide, so a small non-zero value stays visible. */
const barWidth = (value: number, scale: number) => (value > 0 ? `max(2px, ${pct(value, scale)}%)` : '0')

export function Card({
  id,
  title,
  caption,
  aside,
  children,
  className = '',
  compact = false,
}: {
  id: string
  title: string
  caption?: ReactNode
  /** Right of the title: a total, a link. */
  aside?: ReactNode
  children: ReactNode
  className?: string
  /** The map sidebar: tighter padding, an h3 under the panel's own h2. */
  compact?: boolean
}) {
  const Heading = compact ? 'h3' : 'h2'
  return (
    <section
      id={id}
      aria-labelledby={`${id}-h`}
      className={`scroll-mt-24 border border-line bg-paper-raised ${compact ? 'p-2.5' : 'p-4 sm:p-5'} ${className}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <Heading id={`${id}-h`} className={compact ? 'text-base font-semibold text-ink' : 'text-lg text-ink'}>
          {title}
        </Heading>
        {aside && <div className="text-sm text-ink-muted">{aside}</div>}
      </div>
      {caption && <p className={`mt-1 text-ink-muted ${compact ? 'text-xs' : 'text-sm'}`}>{caption}</p>}
      <div className={compact ? 'mt-2' : 'mt-4'}>{children}</div>
    </section>
  )
}

/** One figure with its label. Use inside a <dl>. */
export function StatTile({
  label,
  value,
  unit,
  note,
  children,
  emphasis = false,
  compact = false,
}: {
  label: string
  value: ReactNode
  unit?: ReactNode
  note?: ReactNode
  /** A small graphic under the figure. */
  children?: ReactNode
  /** The page's headline figure. */
  emphasis?: boolean
  /** The map sidebar: tighter padding, one figure size at every width. */
  compact?: boolean
}) {
  return (
    <div
      className={`flex flex-col border ${compact ? 'p-2.5' : 'p-4'} ${
        emphasis ? 'border-terra-700 bg-terra-50 dark:border-terra-400 dark:bg-terra-950/40' : 'border-line bg-paper-raised'
      }`}
    >
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-2 flex flex-1 flex-col">
        <span className={`font-display leading-none text-ink ${compact ? 'text-xl' : 'text-2xl sm:text-3xl'}`}>{value}</span>
        {unit && <span className={`mt-1 text-ink ${compact ? 'text-xs' : 'text-sm'}`}>{unit}</span>}
        {children && <span className={`${compact ? 'mt-1.5' : 'mt-3'} block`}>{children}</span>}
        {note && <span className={`mt-auto ${compact ? 'pt-1' : 'pt-2'} text-ink-muted ${compact ? 'text-xs' : 'text-sm'}`}>{note}</span>}
      </dd>
    </div>
  )
}

/**
 * Where `position` falls among `of`, first on the left. Decorative: the tile's
 * text already says the rank.
 */
export function RankStrip({ position, of }: { position: number; of: number }) {
  const left = of > 1 ? ((position - 1) / (of - 1)) * 100 : 0
  return (
    <span className="block" aria-hidden="true">
      <span className="relative block h-2 rounded-full bg-paper-sunken">
        <span className="absolute inset-y-0 left-0 w-1/4 rounded-l-full bg-line" />
        <span
          className="absolute -top-1 h-4 w-[3px] -translate-x-1/2 rounded-sm bg-terra-700 dark:bg-terra-300"
          style={{ left: `${left}%` }}
        />
      </span>
      <span className="mt-1 flex justify-between text-xs tabular-nums text-ink-muted">
        <span>1º</span>
        <span>{of}º</span>
      </span>
    </span>
  )
}

export interface Segment {
  key: string
  value: number
  color: string
}

/** Parts of a whole as one bar, 2px gaps between parts. Decorative: pair it with a legend. */
export function StackedBar({ segments, height = 'h-3' }: { segments: Segment[]; height?: string }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0)
  if (total <= 0) return null
  const drawn = segments.filter((s) => s.value > 0)
  return (
    <span className={`flex w-full gap-[2px] ${height}`} aria-hidden="true">
      {drawn.map((s, i) => (
        <span
          key={s.key}
          className={`${i === 0 ? 'rounded-l' : ''} ${i === drawn.length - 1 ? 'rounded-r' : ''}`}
          style={{ width: `${pct(s.value, total)}%`, minWidth: 2, backgroundColor: s.color }}
        />
      ))}
    </span>
  )
}

export interface BarRow {
  key: string
  label: ReactNode
  value: number
  /** The value as read, e.g. "8,47 mi". Always shown. */
  valueLabel: string
  /** Bar colour; a class (e.g. dark-mode aware) wins over a hex. */
  color?: string
  barClassName?: string
  /** Stand out from the rest (this municipality among its neighbours). */
  emphasis?: boolean
}

/**
 * Horizontal bars, every one labelled with its name and value. A list, so a
 * screen reader reads "name, value" in order; the bars are decorative.
 */
export function BarList({
  rows,
  scale,
  labelWidth = 'minmax(6.5rem, 9rem)',
}: {
  rows: BarRow[]
  /** The value a full-width bar stands for; defaults to the largest row. */
  scale?: number
  labelWidth?: string
}) {
  const max = scale ?? Math.max(0, ...rows.map((r) => r.value))
  return (
    <ul className="space-y-1.5">
      {rows.map((r) => (
        <li
          key={r.key}
          className="grid items-center gap-x-3 text-sm"
          style={{ gridTemplateColumns: `${labelWidth} 1fr auto` } as CSSProperties}
        >
          <span className={`truncate ${r.emphasis ? 'font-semibold text-ink' : 'text-ink'}`}>{r.label}</span>
          <span className="block h-2.5" aria-hidden="true">
            <span
              className={`block h-full rounded-r ${r.barClassName ?? ''}`}
              style={{ width: barWidth(r.value, max), backgroundColor: r.barClassName ? undefined : r.color }}
            />
          </span>
          <span className={`text-right tabular-nums ${r.emphasis ? 'font-semibold text-ink' : 'text-ink-muted'}`}>
            {r.valueLabel}
          </span>
        </li>
      ))}
    </ul>
  )
}

export interface LevelRow {
  key: string
  label: string
  /** One line on what this level takes out. */
  body: string
  value: number
  valueLabel: string
  range: { min: number; max: number } | null
  rangeLabel?: string
}

/**
 * The method's levels as bars on one scale, each with its range as a whisker
 * (central value = bar, minimum to maximum = line). The scale includes the
 * ranges, so no whisker is cut.
 */
export function LevelBars({ rows }: { rows: LevelRow[] }) {
  const scale = Math.max(0, ...rows.map((r) => Math.max(r.value, r.range?.max ?? 0)))
  return (
    <ol className="space-y-4">
      {rows.map((r) => (
        <li key={r.key}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="font-medium text-ink">{r.label}</span>
            <span className="tabular-nums text-ink">{r.valueLabel}</span>
          </div>
          <div className="relative mt-1.5 h-3" aria-hidden="true">
            <span className="absolute inset-0 rounded-r bg-paper-sunken" />
            <span
              className="absolute inset-y-0 left-0 rounded-r bg-terra-600 dark:bg-terra-400"
              style={{ width: barWidth(r.value, scale) }}
            />
            {r.range && (
              <span
                className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-ink/70"
                style={{ left: `${pct(r.range.min, scale)}%`, width: `${pct(r.range.max - r.range.min, scale)}%` }}
              >
                <span className="absolute -top-1 left-0 h-2.5 w-0.5 bg-ink/70" />
                <span className="absolute -top-1 right-0 h-2.5 w-0.5 bg-ink/70" />
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-ink-muted">
            {r.body}
            {r.rangeLabel && <> · {r.rangeLabel}</>}
          </p>
        </li>
      ))}
    </ol>
  )
}

/** A colour key: swatch, name, value. */
export function LegendItem({ color, label, value }: { color: string; label: string; value?: ReactNode }) {
  return (
    <span className="flex items-baseline gap-2 text-sm">
      <span className="h-2.5 w-2.5 shrink-0 translate-y-px rounded-sm" style={{ backgroundColor: color }} aria-hidden="true" />
      <span className="text-ink">{label}</span>
      {value && <span className="tabular-nums text-ink-muted">{value}</span>}
    </span>
  )
}

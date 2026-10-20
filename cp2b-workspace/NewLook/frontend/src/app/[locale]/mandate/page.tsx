/**
 * /mandate — Painel do mandato do biometano (Estratégia 2027, C26): each
 * year's target under the Combustível do Futuro law against the biomethane
 * Brazil and São Paulo produce (ANP, monthly), and the CGOB issued once a
 * public registry exists. Below them, the route switch (C17): what the
 * environmental attribute must pay for a plant to stop burning biogas for
 * electricity and sell biomethane instead; the revenue stack (C27): what
 * adds up in the revenue of one m³ and what excludes what; and the biogenic
 * CO2 (C20) upgrading separates at each SP plant, against the market for it.
 *
 * Every figure comes from /api/v1/mandate/panel (data/canonical_parameters/
 * mandato_biometano.yaml and the ANP series and plant snapshot). Beside each
 * figure, buttons open its sources straight away (the YAML's `fontes`
 * registry: short citation, kind, publisher, date, link); a figure the
 * platform computes gets a "conta" button to the card's "Como calculamos"
 * block, which writes the arithmetic out with the inputs. Each card also
 * lists all its sources, "Onde conferir" points to the live pages and
 * "Como citar" gives the citation of the panel. Rendered on the server and kept
 * for an hour; when the API is down the render throws, so ISR keeps the last
 * good page rather than caching an outage.
 */
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { getFormatter, getLocale, getTranslations } from 'next-intl/server'
import { Ban, CirclePlus, Repeat1, TriangleAlert, type LucideIcon } from 'lucide-react'
import Breadcrumb from '@/components/ui/Breadcrumb'
import { HeaderLeaves } from '@/components/ui/ArcOrnament'
import { BarList, Card, StatTile } from '@/components/municipality/ProfileVisuals'
import SourceList, { SOURCE_KINDS, SourceItem, countSources, type Reference } from '@/components/mandate/SourceList'
import Cite, { CalcLink, CiteLegend, type Describe } from '@/components/mandate/Cite'
import { Link } from '@/navigation'
import { navCrumbs } from '@/lib/breadcrumbTrail'
import { navMetadata } from '@/lib/pageMetadata'
import { serverGetJson } from '@/lib/serverApi'
import { publicUrl } from '@/lib/siteUrl'

export const revalidate = 3600

/** Months of ANP production the chart shows. */
const SERIES_MONTHS = 24
const BR_COLOR = 'bg-dusk-300 dark:bg-dusk-700'
const SP_COLOR = 'bg-terra-600 dark:bg-terra-400'

type Status = 'vigente' | 'proposta' | 'indicativa'

/** Electricity prices the route card labels (`troca_de_rota.precos_eletricidade`). */
const PRICE_KEYS = ['pld_baixo', 'pld_medio', 'pld_alto', 'autoconsumo'] as const
type PriceKey = (typeof PRICE_KEYS)[number]
const isPriceKey = (k: string): k is PriceKey => (PRICE_KEYS as readonly string[]).includes(k)

/** Source groups each card labels (the `fontes` keys of each YAML block), in display order. */
const ROUTE_GROUPS = [
  'molecula',
  'atributo',
  'purificacao',
  'cambio',
  'eletricidade',
  'autoconsumo',
  'pci',
  'rendimento',
  'fracao_ch4',
  'biogas_sp',
] as const
const STACK_GROUPS = ['fossil', 'cbio', 'unidade_cgob', 'regra_cgob', 'critica', 'densidade', 'digestato'] as const
const CO2_GROUPS = ['plantas', 'mercado', 'exemplos', 'epe', 'remocao'] as const
type Grouped = Partial<Record<string, Reference[]>>

interface Month {
  month: string
  br_m3_day: number
  sp_m3_day: number
}

interface Target {
  year: number
  reduction_pct: number
  volume_m3_day: number
  volume_estimated: boolean
  status: Status
  act: string
  source: Reference
  coverage: number
}

interface RouteSwitch {
  molecule_brl_m3: number
  upgrading_brl_m3: number
  reference_attribute_brl_m3: number
  threshold_brl_mwh: number
  prices: {
    key: string
    electricity_brl_mwh: number
    electricity_route_brl_m3: number
    breakeven_attribute_brl_m3: number
  }[]
  sp_burned_ch4_m3_day: number
  /** The inputs behind the figures, for the "Como calculamos" block. */
  inputs: {
    lhv_kwh_m3: number
    electric_efficiency: number
    upgrading_eur_mwh: number
    brl_per_eur: number
    ch4_fraction: [number, number]
    sp_biogas_m3_day: number
  }
  references: Grouped
}

/** The revenue-stack groups, in order, and the lines in each (messages under `stack.items`). */
const STACK = [
  { group: 'adds', Icon: CirclePlus, items: ['molecule', 'co2', 'digestate_new'] },
  { group: 'once', Icon: Repeat1, items: ['cgob', 'captive', 'voluntary_cert'] },
  { group: 'caveat', Icon: TriangleAlert, items: ['cbio'] },
  { group: 'not', Icon: Ban, items: ['carbon', 'digestate_kept', 'straw', 'electricity'] },
] as const satisfies readonly { group: string; Icon: LucideIcon; items: readonly string[] }[]
type StackItem = (typeof STACK)[number]['items'][number]

interface RevenueStack {
  molecule_brl_m3: number
  attribute_brl_m3: number
  m3_per_cgob: number
  cbio_per_m3_max: number
  cbio_prices: { key: string; brl: number; brl_m3_max: number }[]
  co2_kg_per_m3: [number, number]
  digestate_value_share: { ja_reciclado: number; reposicao: number; novo: number }
  fossil_g_co2e_mj: number
  co2_density_kg_m3: number
  references: Grouped
}

/** [low, high]: rich biogas (more CH4) separates less CO2. */
type Range = [number, number]

interface BiogenicCo2 {
  month: string
  plants: { name: string; municipality: string; now_t_day: Range; capacity_t_day: Range }[]
  sp_now_t_year: Range
  sp_capacity_t_year: Range
  sp_burned_t_year: Range
  market_t_year: number
  ethanol_unit_t_day: number
  ethanol_t_year: number
  epe_biogas_t_year: number
  references: Grouped
}

interface Panel {
  sources_checked: string
  references: Reference[]
  production_references: Reference[]
  where_to_check: Reference[]
  cgob: { public_registry: boolean; references: Reference[] }
  latest: Month & { sp_share_of_br: number }
  targets: Target[]
  series: Month[]
  route_switch: RouteSwitch | null
  revenue_stack: RevenueStack | null
  biogenic_co2: BiogenicCo2 | null
}

const LOWERCASE_WORDS = new Set(['de', 'da', 'do', 'das', 'dos', 'e'])
/** ANP registers names in capitals: "ESSENCIS BIOMETANO S.A." → "Essencis Biometano S.A.". */
const titleCase = (s: string) =>
  s
    .toLowerCase()
    .split(' ')
    .map((w, i) =>
      i > 0 && LOWERCASE_WORDS.has(w)
        ? w
        : w.replace(/(^|-)(\p{L})/gu, (_m, sep: string, c: string) => sep + c.toUpperCase()),
    )
    .join(' ')
    .replace(/\bS\.a\b\.?/g, 'S.A.')

export const generateMetadata = (): Promise<Metadata> => navMetadata('mandate', 'mandate')

export default async function MandatePage() {
  const data = await serverGetJson<Panel>('/mandate/panel')
  if (!data?.targets.length || !data.series.length) throw new Error('mandate panel unavailable')
  const t = await getTranslations('mandate')
  const tNav = await getTranslations('common.nav')
  const format = await getFormatter()
  const locale = await getLocale()

  const volume = (v: number) =>
    format.number(v, { notation: 'compact', compactDisplay: 'long', maximumSignificantDigits: 3 })
  const pct = (v: number) => format.number(v, { style: 'percent', maximumFractionDigits: 0 })
  const reduction = (v: number) => format.number(v / 100, { style: 'percent', maximumFractionDigits: 1 })
  const monthLabel = (m: string) =>
    format.dateTime(new Date(`${m}-15T12:00:00Z`), { month: 'short', year: 'numeric', timeZone: 'UTC' })

  const { latest, targets } = data
  const current = targets.find((g) => g.status === 'vigente') ?? targets[0]
  const series = data.series.slice(-SERIES_MONTHS)
  const seriesMax = Math.max(current.volume_m3_day, ...series.map((m) => m.br_m3_day))
  const height = (v: number) => `${(100 * v) / seriesMax}%`
  const latestLabel = monthLabel(latest.month)
  // Indicative targets scale the latest published volume by their percentage.
  const published = targets.filter((g) => !g.volume_estimated).at(-1)

  // Sources: "2026", "2026-10" or "2026-10-20", shown at the precision given.
  const sourceDate = (d: string) => {
    const [y, m, day] = d.split('-')
    if (!m) return y
    const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(day ?? 15), 12))
    return format.dateTime(date, day ? { dateStyle: 'medium', timeZone: 'UTC' } : { month: 'short', year: 'numeric', timeZone: 'UTC' })
  }
  const checked = sourceDate(data.sources_checked)
  const kindLabel = (k: (typeof SOURCE_KINDS)[number]) => t(`sources.kinds.${k}`)
  const describe: Describe = (s) =>
    [
      t('sources.describe', { kind: kindLabel(s.kind), title: s.title, publisher: s.publisher, date: sourceDate(s.date) }),
      s.note,
      s.url ? t('sources.new_tab') : null,
    ]
      .filter(Boolean)
      .join(' ')
  /** The source buttons beside a figure: every source of the groups given, once each. */
  const cite = (...groups: (readonly Reference[] | undefined)[]) => {
    const unique = new Map(groups.flatMap((g) => g ?? []).map((r) => [r.key, r] as const))
    return <Cite sources={[...unique.values()]} describe={describe} />
  }
  /** The "conta" button beside a computed figure: to the card's "Como calculamos" block. */
  const calc = (card: string) => (
    <CalcLink href={`#conta-${card}`} label={t('sources.calc_label')} text={t('sources.calc')} />
  )
  const method = (card: string, lines: ReactNode[]) => (
    <section
      id={`conta-${card}`}
      aria-labelledby={`conta-${card}-heading`}
      className="mt-4 scroll-mt-24 rounded-lg border border-line bg-paper-raised p-3 text-xs text-ink-muted"
    >
      <h3 id={`conta-${card}-heading`} className="font-semibold text-ink">
        {t('sources.method_heading')}
      </h3>
      <ul className="mt-1.5 list-disc space-y-1 pl-4">
        {lines.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    </section>
  )
  /** A card's inputs: each value with the buttons of its sources. */
  const inputs = (rows: { key: string; label: string; value: string; sources: ReactNode }[]) => (
    <section aria-labelledby="premissas-heading" className="mb-5">
      <h3 id="premissas-heading" className="text-sm font-semibold text-ink">
        {t('sources.inputs_heading')}
      </h3>
      <dl className="mt-2 grid gap-x-6 text-sm md:grid-cols-2">
        {rows.map((r) => (
          <div key={r.key} className="flex flex-wrap items-baseline justify-between gap-x-3 border-b border-line py-1.5">
            <dt className="text-ink-muted">{r.label}</dt>
            <dd className="text-right tabular-nums text-ink">
              {r.value}
              {r.sources}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
  const sourceList = (groups: { key: string; label: string; sources: Reference[] }[]) => {
    const present = groups.filter((g) => g.sources.length)
    return (
      <SourceList
        summary={t('sources.summary', { count: countSources(present), date: checked })}
        groups={present}
        kindLabel={kindLabel}
        dateLabel={sourceDate}
      />
    )
  }

  const brl = (v: number) => format.number(v, { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const brl0 = (v: number) => format.number(v, { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
  const route = data.route_switch
  // The burned methane is set against the next target still being decided.
  const routeTarget = targets.find((g) => g.status === 'proposta') ?? current
  // The break-even attribute at each electricity price, then the one the market pays.
  const routeRows = route
    ? [
        ...route.prices.flatMap((p) => {
          const key = p.key
          if (!isPriceKey(key)) return []
          const attribute = p.breakeven_attribute_brl_m3
          return {
            key,
            emphasis: false,
            label: t('route.row', { label: t(`route.prices.${key}`), price: brl0(p.electricity_brl_mwh) }),
            sources: key === 'autoconsumo' ? cite(route.references.autoconsumo) : calc('troca-de-rota'),
            value: Math.max(0, attribute),
            valueLabel: attribute > 0 ? t('route.per_m3', { value: brl(attribute) }) : t('route.none_needed'),
          }
        }),
        {
          key: 'reference',
          emphasis: true,
          label: t('route.reference'),
          sources: cite(route.references.atributo),
          value: route.reference_attribute_brl_m3,
          valueLabel: t('route.per_m3', { value: brl(route.reference_attribute_brl_m3) }),
        },
      ]
    : []
  const routeMax = Math.max(...routeRows.map((r) => r.value))
  const pld = route?.prices.filter((p) => p.key.startsWith('pld_')).map((p) => p.electricity_brl_mwh) ?? []
  const selfUse = route?.prices.find((p) => p.key === 'autoconsumo')
  // The worked example in "Como calculamos": the highest price, where the attribute matters.
  const example = route?.prices.at(-1)
  const decimal = (v: number, digits = 2) => format.number(v, { maximumFractionDigits: digits })

  const stack = data.revenue_stack
  // The figure beside each line; lines without one only explain.
  const figures = (s: RevenueStack): Partial<Record<StackItem, string>> => {
    const cbio = s.cbio_prices.map((c) => c.brl_m3_max)
    const kg = (v: number) => format.number(v, { maximumFractionDigits: 1, minimumFractionDigits: 1 })
    const share = (v: number) => pct(v)
    return {
      molecule: t('stack.items.molecule.value', { value: brl(s.molecule_brl_m3) }),
      co2: t('stack.items.co2.value', { low: kg(s.co2_kg_per_m3[0]), high: kg(s.co2_kg_per_m3[1]) }),
      digestate_new: t('stack.items.digestate_new.value', { share: share(s.digestate_value_share.novo) }),
      cgob: t('stack.items.cgob.value', { m3: s.m3_per_cgob, perCgob: brl0(s.attribute_brl_m3 * s.m3_per_cgob) }),
      cbio: t('stack.items.cbio.value', { low: brl(Math.min(...cbio)), high: brl(Math.max(...cbio)) }),
      digestate_kept: t('stack.items.digestate_kept.value', { share: share(s.digestate_value_share.ja_reciclado) }),
      straw: t('stack.items.straw.value', { share: share(s.digestate_value_share.reposicao) }),
    }
  }
  const stackFigures = stack ? figures(stack) : {}
  // The buttons under each line: its sources, and "conta" where the platform computes the figure.
  const stackSources = (s: RevenueStack): Partial<Record<StackItem, ReactNode>> => {
    const r = s.references
    const rr = route?.references
    return {
      molecule: cite(rr?.molecula),
      co2: (
        <>
          {cite(r.densidade, rr?.fracao_ch4)}
          {calc('pilha-de-receitas')}
        </>
      ),
      digestate_new: cite(r.digestato),
      cgob: (
        <>
          {cite(r.unidade_cgob, rr?.atributo)}
          {calc('pilha-de-receitas')}
        </>
      ),
      captive: cite(rr?.atributo),
      voluntary_cert: cite(r.regra_cgob),
      cbio: (
        <>
          {cite(r.cbio, r.fossil, r.regra_cgob, r.critica)}
          {calc('pilha-de-receitas')}
        </>
      ),
      digestate_kept: cite(r.digestato),
      straw: cite(r.digestato),
    }
  }
  const stackButtons = stack ? stackSources(stack) : {}
  const stackCbio = stack ? Math.max(...stack.cbio_prices.map((c) => c.brl_m3_max)) : 0
  const stackTotal = stack ? stack.molecule_brl_m3 + stack.attribute_brl_m3 + stackCbio : 0

  const co2 = data.biogenic_co2
  const tonnes = (v: number) => format.number(v, { notation: 'compact', maximumSignificantDigits: 2 })
  const tonnesRange = (r: Range) => t('co2.unit', { low: tonnes(r[0]), high: tonnes(r[1]) })
  const perDay = (r: Range) =>
    r[1] < 0.5 ? '—' : `${format.number(r[0], { maximumFractionDigits: 0 })}–${format.number(r[1], { maximumFractionDigits: 0 })}`
  // Low and high of each amount, the market as a single reference.
  const co2Rows = co2
    ? [
        { key: 'now', range: co2.sp_now_t_year, color: 'bg-ink-muted' },
        { key: 'capacity', range: co2.sp_capacity_t_year, color: 'bg-ink-muted' },
        { key: 'burned', range: co2.sp_burned_t_year, color: SP_COLOR },
        { key: 'market', range: [co2.market_t_year, co2.market_t_year] as Range, color: BR_COLOR },
      ] as const
    : []
  const co2Max = Math.max(...co2Rows.map((r) => r.range[1]))
  const co2Sources = (key: (typeof co2Rows)[number]['key']): ReactNode => {
    if (!co2) return null
    if (key === 'market') return cite(co2.references.mercado)
    const basis = key === 'burned' ? route?.references.biogas_sp : co2.references.plantas
    return (
      <>
        {cite(basis)}
        {calc('co2-biogenico')}
      </>
    )
  }

  return (
    <div className="bg-paper">
      <header className="relative overflow-hidden border-b border-line">
        <HeaderLeaves />
        <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <Breadcrumb items={navCrumbs('/mandate', (key) => tNav(key))} />
          <p className="eyebrow mt-4">{t('eyebrow')}</p>
          <h1 className="mt-2 text-4xl text-ink sm:text-5xl">{t('title')}</h1>
          <p className="mt-4 max-w-2xl text-ink-muted">{t('lede')}</p>
          <p className="mt-3 max-w-2xl text-sm text-ink-muted">
            {t('sources.line', { date: checked })}{' '}
            <a href="#onde-conferir" className="text-terra-700 underline underline-offset-2 dark:text-terra-300">
              {t('sources.where_link')}
            </a>
          </p>
          <div className="mt-2 max-w-2xl">
            <CiteLegend
              heading={t('sources.legend')}
              kinds={SOURCE_KINDS.map((kind) => ({ kind, label: kindLabel(kind) }))}
              calcText={t('sources.calc')}
            />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            emphasis
            label={t('tiles.target', { year: current.year })}
            value={volume(current.volume_m3_day)}
            unit={t('unit_m3_day')}
            note={
              <>
                {t('tiles.target_note', { reduction: reduction(current.reduction_pct) })}
                {cite([current.source])}
              </>
            }
          />
          <StatTile
            label={t('tiles.br')}
            value={volume(latest.br_m3_day)}
            unit={t('unit_m3_day')}
            note={
              <>
                {t('tiles.coverage', { month: latestLabel, share: pct(current.coverage), year: current.year })}
                {cite(data.production_references)}
                {calc('trajetoria')}
              </>
            }
          />
          <StatTile
            label={t('tiles.sp')}
            value={volume(latest.sp_m3_day)}
            unit={t('unit_m3_day')}
            note={
              <>
                {t('tiles.sp_share', { month: latestLabel, share: pct(latest.sp_share_of_br) })}
                {cite(data.production_references)}
              </>
            }
          />
          <StatTile
            label={t('tiles.cgob')}
            value={t('tiles.cgob_none')}
            note={
              <>
                {t('tiles.cgob_note')}
                {cite(data.cgob.references)}
              </>
            }
          />
        </dl>

        <div className="grid gap-5 lg:grid-cols-5">
          <Card
            id="trajetoria"
            className="lg:col-span-2"
            title={t('path.heading')}
            caption={
              <>
                {t('path.caption', { month: latestLabel })}
                {cite(data.production_references)}
              </>
            }
          >
            <BarList
              labelWidth="minmax(7rem, 9rem)"
              rows={[
                {
                  key: 'now',
                  emphasis: true,
                  label: t('path.now'),
                  value: latest.br_m3_day,
                  valueLabel: volume(latest.br_m3_day),
                  barClassName: BR_COLOR,
                },
                ...targets.map((g) => ({
                  key: String(g.year),
                  label: t('path.row', { year: g.year, reduction: reduction(g.reduction_pct) }),
                  value: g.volume_m3_day,
                  valueLabel: `${g.volume_estimated ? '≈ ' : ''}${volume(g.volume_m3_day)}`,
                  barClassName: g.status === 'indicativa' ? 'bg-line-strong' : 'bg-ink-muted',
                })),
              ]}
            />
            <ul className="mt-4 space-y-1 text-xs text-ink-muted">
              {targets.map((g) => (
                <li key={g.year}>
                  <span className="font-medium text-ink">{g.year}</span> · {t(`status.${g.status}`)} ·{' '}
                  <a
                    href={g.source.url ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-terra-700 underline underline-offset-2 dark:text-terra-300"
                  >
                    {g.act}
                  </a>
                  {g.volume_estimated && calc('trajetoria')}
                </li>
              ))}
            </ul>
            {method('trajetoria', [
              t('path.method.production'),
              t('path.method.coverage', {
                month: latestLabel,
                br: volume(latest.br_m3_day),
                year: current.year,
                target: volume(current.volume_m3_day),
                share: pct(current.coverage),
              }),
              ...(published && targets.some((g) => g.volume_estimated)
                ? [
                    t('path.method.indicative', {
                      volume: volume(published.volume_m3_day),
                      year: published.year,
                      pct: reduction(published.reduction_pct),
                    }),
                  ]
                : []),
            ])}
            {sourceList([
              { key: 'panel', label: t('path.source_groups.panel'), sources: data.references },
              { key: 'cgob', label: t('path.source_groups.cgob'), sources: data.cgob.references },
            ])}
          </Card>

          <Card
            id="producao"
            className="lg:col-span-3"
            title={t('series.heading')}
            caption={
              <>
                {t('series.caption', { year: current.year })}
                {cite(data.production_references)}
                {calc('trajetoria')}
              </>
            }
          >
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink">
              {[
                { color: BR_COLOR, label: t('series.br') },
                { color: SP_COLOR, label: t('series.sp') },
              ].map(({ color, label }) => (
                <span key={label} className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-sm ${color}`} aria-hidden="true" />
                  {label}
                </span>
              ))}
            </div>
            <div className="relative mt-3 h-48" aria-hidden="true">
              <div
                className="absolute inset-x-0 border-t border-dashed border-ink"
                style={{ bottom: height(current.volume_m3_day) }}
              >
                <span className="absolute -top-5 right-0 bg-paper-raised px-1 text-xs text-ink">
                  {t('series.target', { year: current.year })}
                </span>
              </div>
              <div className="flex h-full items-end gap-px">
                {series.map((m) => (
                  <div key={m.month} className={`relative flex-1 ${BR_COLOR}`} style={{ height: height(m.br_m3_day) }}>
                    <div className={`absolute inset-x-0 bottom-0 ${SP_COLOR}`} style={{ height: `${m.br_m3_day ? (100 * m.sp_m3_day) / m.br_m3_day : 0}%` }} />
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-1 flex justify-between text-xs text-ink-muted" aria-hidden="true">
              <span>{monthLabel(series[0].month)}</span>
              <span>{latestLabel}</span>
            </div>
            <table className="sr-only">
              <caption>{t('series.heading')}</caption>
              <thead>
                <tr>
                  <th scope="col">{t('series.month')}</th>
                  <th scope="col">{t('series.br')}</th>
                  <th scope="col">{t('series.sp')}</th>
                </tr>
              </thead>
              <tbody>
                {series.map((m) => (
                  <tr key={m.month}>
                    <th scope="row">{monthLabel(m.month)}</th>
                    <td>{volume(m.br_m3_day)}</td>
                    <td>{volume(m.sp_m3_day)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sourceList([{ key: 'production', label: t('series.source_groups.production'), sources: data.production_references }])}
          </Card>
        </div>

        {route && (
          <Card
            id="troca-de-rota"
            title={t('route.heading')}
            caption={t('route.caption')}
          >
            {inputs([
              {
                key: 'molecule',
                label: t('route.inputs.molecule'),
                value: t('route.inputs.per_m3', { value: brl(route.molecule_brl_m3) }),
                sources: cite(route.references.molecula),
              },
              {
                key: 'attribute',
                label: t('route.inputs.attribute'),
                value: t('route.inputs.per_m3', { value: brl(route.reference_attribute_brl_m3) }),
                sources: cite(route.references.atributo),
              },
              {
                key: 'upgrading',
                label: t('route.inputs.upgrading', {
                  eur: decimal(route.inputs.upgrading_eur_mwh, 0),
                  fx: brl(route.inputs.brl_per_eur),
                }),
                value: t('route.inputs.per_m3', { value: brl(route.upgrading_brl_m3) }),
                sources: cite(route.references.purificacao, route.references.cambio),
              },
              ...(pld.length
                ? [
                    {
                      key: 'pld',
                      label: t('route.inputs.pld'),
                      value: t('route.inputs.mwh_range', { low: brl0(Math.min(...pld)), high: brl0(Math.max(...pld)) }),
                      sources: cite(route.references.eletricidade),
                    },
                  ]
                : []),
              ...(selfUse
                ? [
                    {
                      key: 'self_use',
                      label: t('route.prices.autoconsumo'),
                      value: t('route.inputs.per_mwh', { value: brl0(selfUse.electricity_brl_mwh) }),
                      sources: cite(route.references.autoconsumo),
                    },
                  ]
                : []),
              {
                key: 'lhv',
                label: t('route.inputs.lhv'),
                value: t('route.inputs.kwh_m3', { value: decimal(route.inputs.lhv_kwh_m3) }),
                sources: cite(route.references.pci),
              },
              {
                key: 'efficiency',
                label: t('route.inputs.efficiency'),
                value: pct(route.inputs.electric_efficiency),
                sources: cite(route.references.rendimento),
              },
              {
                key: 'ch4',
                label: t('route.inputs.ch4'),
                value: t('route.inputs.range', {
                  low: pct(route.inputs.ch4_fraction[0]),
                  high: pct(route.inputs.ch4_fraction[1]),
                }),
                sources: cite(route.references.fracao_ch4),
              },
              {
                key: 'biogas',
                label: t('route.inputs.biogas'),
                value: t('route.inputs.m3_day', { value: volume(route.inputs.sp_biogas_m3_day) }),
                sources: cite(route.references.biogas_sp),
              },
            ])}
            <div className="grid gap-5 lg:grid-cols-5">
              {/* Label and value above each bar: the labels are long and the
                  card is narrow beside the text, so a side-by-side row would cut them. */}
              <ul className="space-y-3 lg:col-span-3">
                {routeRows.map((r) => (
                  <li key={r.key} className="text-sm">
                    <div className={`flex items-baseline justify-between gap-3 ${r.emphasis ? 'font-semibold text-ink' : 'text-ink'}`}>
                      <span>
                        {r.label}
                        {r.sources}
                      </span>
                      <span className="shrink-0 tabular-nums">{r.valueLabel}</span>
                    </div>
                    <span className="mt-1 block h-2.5" aria-hidden="true">
                      <span
                        className={`block h-full rounded-r ${r.emphasis ? SP_COLOR : 'bg-ink-muted'}`}
                        style={{ width: `${(100 * r.value) / routeMax}%` }}
                      />
                    </span>
                  </li>
                ))}
              </ul>
              <div className="space-y-3 text-sm text-ink-muted lg:col-span-2">
                <p className="text-ink">
                  {t('route.threshold', { threshold: brl0(route.threshold_brl_mwh) })}
                  {calc('troca-de-rota')}
                </p>
                <p>
                  {Math.max(...route.prices.map((p) => p.breakeven_attribute_brl_m3)) < route.reference_attribute_brl_m3
                    ? t('route.reference_covers')
                    : t('route.reference_short')}
                  {cite(route.references.atributo)}
                  {calc('troca-de-rota')}
                </p>
                <p>
                  {t('route.burned', {
                    volume: volume(route.sp_burned_ch4_m3_day),
                    ratio: format.number(route.sp_burned_ch4_m3_day / routeTarget.volume_m3_day, { maximumFractionDigits: 1 }),
                    year: routeTarget.year,
                  })}
                  {cite(route.references.biogas_sp, route.references.fracao_ch4, [routeTarget.source])}
                  {calc('troca-de-rota')}
                </p>
              </div>
            </div>
            {method('troca-de-rota', [
              ...(example
                ? [
                    t('route.method.electricity', {
                      lhv: decimal(route.inputs.lhv_kwh_m3),
                      eta: pct(route.inputs.electric_efficiency),
                      price: brl0(example.electricity_brl_mwh),
                      value: brl(example.electricity_route_brl_m3),
                    }),
                  ]
                : []),
              t('route.method.upgrading', {
                eur: decimal(route.inputs.upgrading_eur_mwh, 0),
                fx: brl(route.inputs.brl_per_eur),
                lhv: decimal(route.inputs.lhv_kwh_m3),
                upgrading: brl(route.upgrading_brl_m3),
              }),
              ...(example
                ? [
                    t('route.method.breakeven', {
                      price: brl0(example.electricity_brl_mwh),
                      electricity: brl(example.electricity_route_brl_m3),
                      molecule: brl(route.molecule_brl_m3),
                      upgrading: brl(route.upgrading_brl_m3),
                      value: brl(example.breakeven_attribute_brl_m3),
                    }),
                  ]
                : []),
              t('route.method.threshold', {
                molecule: brl(route.molecule_brl_m3),
                upgrading: brl(route.upgrading_brl_m3),
                lhv: decimal(route.inputs.lhv_kwh_m3),
                eta: pct(route.inputs.electric_efficiency),
                threshold: brl0(route.threshold_brl_mwh),
              }),
              t('route.method.burned', {
                biogas: volume(route.inputs.sp_biogas_m3_day),
                mid: pct((route.inputs.ch4_fraction[0] + route.inputs.ch4_fraction[1]) / 2),
                ch4: volume(route.sp_burned_ch4_m3_day),
                year: routeTarget.year,
                target: volume(routeTarget.volume_m3_day),
                ratio: format.number(route.sp_burned_ch4_m3_day / routeTarget.volume_m3_day, { maximumFractionDigits: 1 }),
              }),
            ])}
            <p className="mt-4 text-xs text-ink-muted">{t('route.limits')}</p>
            {sourceList(
              ROUTE_GROUPS.map((g) => ({ key: g, label: t(`route.source_groups.${g}`), sources: route.references[g] ?? [] })),
            )}
          </Card>
        )}

        {stack && (
          <Card id="pilha-de-receitas" title={t('stack.heading')} caption={t('stack.caption')}>
            <p className="max-w-3xl text-sm font-medium text-ink">
              {t('stack.total', { total: brl(stackTotal) })}
              {calc('pilha-de-receitas')}
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {STACK.map(({ group, Icon, items }) => (
                <section key={group} aria-labelledby={`stack-${group}`} className="rounded-lg border border-line p-4">
                  <h3 id={`stack-${group}`} className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <Icon className="h-4 w-4 shrink-0 text-terra-700 dark:text-terra-300" aria-hidden="true" />
                    {t(`stack.groups.${group}`)}
                  </h3>
                  <dl className="mt-3 space-y-3 text-sm">
                    {items.map((item) => (
                      <div key={item}>
                        <dt className="flex flex-wrap items-baseline justify-between gap-x-3 font-medium text-ink">
                          <span>{t(`stack.items.${item}.title`)}</span>
                          {stackFigures[item] && <span className="tabular-nums">{stackFigures[item]}</span>}
                        </dt>
                        <dd className="mt-0.5 text-ink-muted">
                          {item === 'cbio'
                            ? t('stack.items.cbio.note', {
                                cbio: format.number(stack.cbio_per_m3_max, { maximumSignificantDigits: 2 }),
                              })
                            : t(`stack.items.${item}.note`)}
                          {stackButtons[item]}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ))}
            </div>
            {method('pilha-de-receitas', [
              ...(route
                ? [
                    t('stack.method.cbio', {
                      lhv: decimal(route.inputs.lhv_kwh_m3 * 3.6, 1),
                      fossil: decimal(stack.fossil_g_co2e_mj, 1),
                      cbio: format.number(stack.cbio_per_m3_max, { maximumSignificantDigits: 2 }),
                      low: brl(Math.min(...stack.cbio_prices.map((c) => c.brl))),
                      high: brl(Math.max(...stack.cbio_prices.map((c) => c.brl))),
                      brl_low: brl(Math.min(...stack.cbio_prices.map((c) => c.brl_m3_max))),
                      brl_high: brl(Math.max(...stack.cbio_prices.map((c) => c.brl_m3_max))),
                    }),
                    t('stack.method.co2', {
                      density: decimal(stack.co2_density_kg_m3),
                      high: pct(route.inputs.ch4_fraction[1]),
                      low: pct(route.inputs.ch4_fraction[0]),
                      kg_low: decimal(stack.co2_kg_per_m3[0]),
                      kg_high: decimal(stack.co2_kg_per_m3[1]),
                    }),
                  ]
                : []),
              t('stack.method.cgob', {
                m3: stack.m3_per_cgob,
                attr: brl(stack.attribute_brl_m3),
                perCgob: brl0(stack.attribute_brl_m3 * stack.m3_per_cgob),
              }),
              t('stack.method.total', {
                molecule: brl(stack.molecule_brl_m3),
                attr: brl(stack.attribute_brl_m3),
                cbio: brl(stackCbio),
                total: brl(stackTotal),
              }),
            ])}
            <p className="mt-4 text-xs text-ink-muted">
              {t('stack.digestate_basis')} {t('stack.limits')}
            </p>
            {sourceList(
              STACK_GROUPS.map((g) => ({ key: g, label: t(`stack.source_groups.${g}`), sources: stack.references[g] ?? [] })),
            )}
          </Card>
        )}

        {co2 && (
          <Card id="co2-biogenico" title={t('co2.heading')} caption={t('co2.caption', { month: monthLabel(co2.month) })}>
            <div className="grid gap-5 lg:grid-cols-5">
              <div className="space-y-5 lg:col-span-3">
                <ul className="space-y-3">
                  {co2Rows.map((r) => (
                    <li key={r.key} className="text-sm">
                      <div className={`flex items-baseline justify-between gap-3 text-ink ${r.key === 'burned' ? 'font-semibold' : ''}`}>
                        <span>
                          {t(`co2.rows.${r.key}`)}
                          {co2Sources(r.key)}
                        </span>
                        <span className="shrink-0 tabular-nums">
                          {r.key === 'market' ? t('co2.unit_one', { value: tonnes(r.range[0]) }) : tonnesRange(r.range)}
                        </span>
                      </div>
                      {/* The faint bar is the high end, the solid one the low end. */}
                      <span className="mt-1 block h-2.5" aria-hidden="true">
                        <span className="relative block h-full" style={{ width: `${(100 * r.range[1]) / co2Max}%` }}>
                          <span className={`absolute inset-0 rounded-r opacity-40 ${r.color}`} />
                          <span className={`absolute inset-y-0 left-0 rounded-r ${r.color}`} style={{ width: `${(100 * r.range[0]) / r.range[1]}%` }} />
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
                <table className="w-full text-sm">
                  <caption className="mb-2 text-left font-medium text-ink">
                    {t('co2.plants')}
                    {cite(co2.references.plantas)}
                    {calc('co2-biogenico')}
                  </caption>
                  <thead>
                    <tr className="border-b border-line text-xs text-ink-muted">
                      <th scope="col" className="py-1 pr-2 text-left font-normal">{t('co2.plant')}</th>
                      <th scope="col" className="py-1 pr-2 text-right font-normal">{t('co2.today')}</th>
                      <th scope="col" className="py-1 text-right font-normal">{t('co2.at_capacity')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {co2.plants.map((p) => (
                      <tr key={`${p.name}-${p.municipality}`} className="border-b border-line last:border-0">
                        <th scope="row" className="py-1.5 pr-2 text-left font-normal">
                          <span className="block text-ink">{titleCase(p.name)}</span>
                          <span className="block text-xs text-ink-muted">{titleCase(p.municipality)}</span>
                        </th>
                        <td className="whitespace-nowrap py-1.5 pr-2 text-right tabular-nums text-ink">{perDay(p.now_t_day)}</td>
                        <td className="whitespace-nowrap py-1.5 text-right tabular-nums text-ink-muted">{perDay(p.capacity_t_day)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="space-y-3 text-sm text-ink-muted lg:col-span-2">
                <p className="text-ink">
                  {t('co2.market_share', {
                    share: pct((co2.sp_now_t_year[0] + co2.sp_now_t_year[1]) / 2 / co2.market_t_year),
                    low: format.number(co2.sp_burned_t_year[0] / co2.market_t_year, { maximumFractionDigits: 1 }),
                    high: format.number(co2.sp_burned_t_year[1] / co2.market_t_year, { maximumFractionDigits: 1 }),
                    unit: co2.ethanol_unit_t_day,
                  })}
                  {calc('co2-biogenico')}
                  {cite(co2.references.exemplos, co2.references.mercado)}
                </p>
                <p>
                  {t('co2.ethanol', {
                    ethanol: t('co2.unit_one', { value: tonnes(co2.ethanol_t_year) }),
                    biogas: t('co2.unit_one', { value: tonnes(co2.epe_biogas_t_year) }),
                  })}
                  {cite(co2.references.epe)}
                </p>
                <p>
                  {t('co2.removal')}
                  {cite(co2.references.remocao)}
                </p>
              </div>
            </div>
            {method('co2-biogenico', [
              ...(route && stack
                ? [
                    t('co2.method.plant', {
                      co2_low: pct(1 - route.inputs.ch4_fraction[1]),
                      co2_high: pct(1 - route.inputs.ch4_fraction[0]),
                      density: decimal(stack.co2_density_kg_m3),
                    }),
                    t('co2.method.burned', { biogas: volume(route.inputs.sp_biogas_m3_day) }),
                  ]
                : []),
              t('co2.method.market', {
                day: format.number(co2.market_t_year / 365, { maximumFractionDigits: 0 }),
                year: t('co2.unit_one', { value: tonnes(co2.market_t_year) }),
              }),
              t('co2.method.share', {
                now: tonnesRange(co2.sp_now_t_year),
                share: pct((co2.sp_now_t_year[0] + co2.sp_now_t_year[1]) / 2 / co2.market_t_year),
              }),
            ])}
            <p className="mt-4 text-xs text-ink-muted">{t('co2.limits')}</p>
            {sourceList(CO2_GROUPS.map((g) => ({ key: g, label: t(`co2.source_groups.${g}`), sources: co2.references[g] ?? [] })))}
          </Card>
        )}

        <Card id="onde-conferir" title={t('sources.where.heading')} caption={t('sources.where.caption')}>
          <ul className="grid gap-x-6 gap-y-2 text-sm md:grid-cols-2">
            {data.where_to_check.map((s) => (
              <SourceItem key={s.key} source={s} kindLabel={kindLabel} dateLabel={sourceDate} />
            ))}
          </ul>
          <p className="mt-4 text-xs text-ink-muted">{t('sources.where.legend')}</p>
        </Card>

        <Card id="citar" title={t('sources.cite.heading')}>
          <p className="max-w-3xl break-words border-l-2 border-line-strong pl-3 text-xs text-ink">
            {t('sources.cite.text', {
              checked,
              url: publicUrl(`/${locale}/mandate`),
              date: format.dateTime(new Date(), { dateStyle: 'long' }),
            })}
          </p>
          <p className="mt-3 text-sm text-ink-muted">
            {t('sources.cite.note')}{' '}
            <Link href="/cite" className="text-terra-700 underline underline-offset-2 dark:text-terra-300">
              {t('sources.cite.more')}
            </Link>
          </p>
        </Card>

        <Card id="limites" title={t('limits.heading')}>
          <ul className="max-w-3xl list-disc space-y-2 pl-5 text-sm text-ink-muted">
            {(t.raw('limits.items') as string[]).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}

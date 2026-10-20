/**
 * /mandate — Painel do mandato do biometano (Estratégia 2027, C26): each
 * year's target under the Combustível do Futuro law against the biomethane
 * Brazil and São Paulo produce (ANP, monthly), and the CGOB issued once a
 * public registry exists. Below them, the route switch (C17): what the
 * environmental attribute must pay for a plant to stop burning biogas for
 * electricity and sell biomethane instead.
 *
 * Every figure comes from /api/v1/mandate/panel (data/canonical_parameters/
 * mandato_biometano.yaml and the ANP series). Rendered on the server and kept
 * for an hour; when the API is down the render throws, so ISR keeps the last
 * good page rather than caching an outage.
 */
import type { Metadata } from 'next'
import { getFormatter, getTranslations } from 'next-intl/server'
import Breadcrumb from '@/components/ui/Breadcrumb'
import { HeaderLeaves } from '@/components/ui/ArcOrnament'
import { BarList, Card, StatTile } from '@/components/municipality/ProfileVisuals'
import { navCrumbs } from '@/lib/breadcrumbTrail'
import { navMetadata } from '@/lib/pageMetadata'
import { serverGetJson } from '@/lib/serverApi'

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
  source: string
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
  sources: { molecule_attribute_url: string; electricity_url: string }
}

interface Panel {
  latest: Month & { sp_share_of_br: number }
  targets: Target[]
  series: Month[]
  route_switch: RouteSwitch | null
}

export const generateMetadata = (): Promise<Metadata> => navMetadata('mandate', 'mandate')

export default async function MandatePage() {
  const data = await serverGetJson<Panel>('/mandate/panel')
  if (!data?.targets.length || !data.series.length) throw new Error('mandate panel unavailable')
  const t = await getTranslations('mandate')
  const tNav = await getTranslations('common.nav')
  const format = await getFormatter()

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
            value: Math.max(0, attribute),
            valueLabel: attribute > 0 ? t('route.per_m3', { value: brl(attribute) }) : t('route.none_needed'),
          }
        }),
        {
          key: 'reference',
          emphasis: true,
          label: t('route.reference'),
          value: route.reference_attribute_brl_m3,
          valueLabel: t('route.per_m3', { value: brl(route.reference_attribute_brl_m3) }),
        },
      ]
    : []
  const routeMax = Math.max(...routeRows.map((r) => r.value))
  const linkClass = 'text-terra-700 underline underline-offset-2 dark:text-terra-300'

  return (
    <div className="bg-paper">
      <header className="relative overflow-hidden border-b border-line">
        <HeaderLeaves />
        <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <Breadcrumb items={navCrumbs('/mandate', (key) => tNav(key))} />
          <p className="eyebrow mt-4">{t('eyebrow')}</p>
          <h1 className="mt-2 text-4xl text-ink sm:text-5xl">{t('title')}</h1>
          <p className="mt-4 max-w-2xl text-ink-muted">{t('lede')}</p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            emphasis
            label={t('tiles.target', { year: current.year })}
            value={volume(current.volume_m3_day)}
            unit={t('unit_m3_day')}
            note={t('tiles.target_note', { reduction: reduction(current.reduction_pct) })}
          />
          <StatTile
            label={t('tiles.br')}
            value={volume(latest.br_m3_day)}
            unit={t('unit_m3_day')}
            note={t('tiles.coverage', { month: latestLabel, share: pct(current.coverage), year: current.year })}
          />
          <StatTile
            label={t('tiles.sp')}
            value={volume(latest.sp_m3_day)}
            unit={t('unit_m3_day')}
            note={t('tiles.sp_share', { month: latestLabel, share: pct(latest.sp_share_of_br) })}
          />
          <StatTile
            label={t('tiles.cgob')}
            value={t('tiles.cgob_none')}
            note={t('tiles.cgob_note')}
          />
        </dl>

        <div className="grid gap-5 lg:grid-cols-5">
          <Card id="trajetoria" className="lg:col-span-2" title={t('path.heading')} caption={t('path.caption', { month: latestLabel })}>
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
                    href={g.source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-terra-700 underline underline-offset-2 dark:text-terra-300"
                  >
                    {g.act}
                  </a>
                </li>
              ))}
            </ul>
          </Card>

          <Card
            id="producao"
            className="lg:col-span-3"
            title={t('series.heading')}
            caption={t('series.caption', { year: current.year })}
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
          </Card>
        </div>

        {route && (
          <Card
            id="troca-de-rota"
            title={t('route.heading')}
            caption={t('route.caption', { molecule: brl(route.molecule_brl_m3), upgrading: brl(route.upgrading_brl_m3) })}
          >
            <div className="grid gap-5 lg:grid-cols-5">
              {/* Label and value above each bar: the labels are long and the
                  card is narrow beside the text, so a side-by-side row would cut them. */}
              <ul className="space-y-3 lg:col-span-3">
                {routeRows.map((r) => (
                  <li key={r.key} className="text-sm">
                    <div className={`flex items-baseline justify-between gap-3 ${r.emphasis ? 'font-semibold text-ink' : 'text-ink'}`}>
                      <span>{r.label}</span>
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
                <p className="text-ink">{t('route.threshold', { threshold: brl0(route.threshold_brl_mwh) })}</p>
                <p>
                  {Math.max(...route.prices.map((p) => p.breakeven_attribute_brl_m3)) < route.reference_attribute_brl_m3
                    ? t('route.reference_covers')
                    : t('route.reference_short')}
                </p>
                <p>
                  {t('route.burned', {
                    volume: volume(route.sp_burned_ch4_m3_day),
                    ratio: format.number(route.sp_burned_ch4_m3_day / routeTarget.volume_m3_day, { maximumFractionDigits: 1 }),
                    year: routeTarget.year,
                  })}
                </p>
              </div>
            </div>
            <p className="mt-4 text-xs text-ink-muted">
              {t('route.limits')} {t('route.sources')}:{' '}
              <a href={route.sources.molecule_attribute_url} target="_blank" rel="noopener noreferrer" className={linkClass}>
                {t('route.source_tariff')}
              </a>
              {' · '}
              <a href={route.sources.electricity_url} target="_blank" rel="noopener noreferrer" className={linkClass}>
                {t('route.source_pld')}
              </a>
            </p>
          </Card>
        )}

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

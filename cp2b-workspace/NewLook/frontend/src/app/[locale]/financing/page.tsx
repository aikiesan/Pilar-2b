/**
 * /financing — Observatório do financiamento (Estratégia 2027, C18): what a
 * m³/day of biomethane capacity costs in Brazil, from public BNDES approvals.
 *
 * Every figure comes from /api/v1/financing/benchmarks, whose deals live in
 * data/canonical_parameters/bndes_biometano_operacoes.csv, one source per row.
 * Rendered on the server and kept for an hour; when the API is down the render
 * throws, so ISR keeps the last good page rather than caching an outage.
 */
import type { Metadata } from 'next'
import { getFormatter, getTranslations } from 'next-intl/server'
import Breadcrumb from '@/components/ui/Breadcrumb'
import { HeaderLeaves } from '@/components/ui/ArcOrnament'
import { Card, StatTile } from '@/components/municipality/ProfileVisuals'
import { navCrumbs } from '@/lib/breadcrumbTrail'
import { navMetadata } from '@/lib/pageMetadata'
import { serverGetJson } from '@/lib/serverApi'

export const revalidate = 3600

type RouteKey = 'aterro' | 'agroindustrial'
type Basis = 'total' | 'joint_total' | 'financing'

interface Project {
  project: string
  uf: string
  route_key: RouteKey
  capacity_m3_day: number
  basis: Basis
  lower_bound: boolean
  capex_brl_per_m3d: number
  levelized: { rate: number; brl_per_m3: number }[]
  bndes_mi_brl: number | null
  approved: string
  sources: string[]
}

interface Benchmarks {
  assumptions: { rates: number[]; life_years: number; capacity_factor: number }
  projects: Project[]
  by_route: Partial<Record<RouteKey, { n: number; capex_min: number; capex_max: number }>>
  totals: { deals: number; bndes_mi_brl: number | null; fundo_clima_mi_brl: number | null; capacity_m3_day: number }
}

const ROUTES: RouteKey[] = ['aterro', 'agroindustrial']

export const generateMetadata = (): Promise<Metadata> => navMetadata('financing', 'financing')

export default async function FinancingPage() {
  const data = await serverGetJson<Benchmarks>('/financing/benchmarks')
  if (!data) throw new Error('financing benchmarks unavailable')
  const t = await getTranslations('financing')
  const tNav = await getTranslations('common.nav')
  const format = await getFormatter()

  const brl = (v: number) => format.number(v, { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
  const brl2 = (v: number) => format.number(v, { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })
  const millions = (v: number | null) =>
    v === null ? '—' : format.number(v * 1e6, { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 })
  const count = (v: number) => format.number(v, { maximumFractionDigits: 0 })
  const pct = (v: number) => format.number(v, { style: 'percent', maximumFractionDigits: 0 })
  const { assumptions: a, totals } = data
  const rates = format.list(a.rates.map(pct))

  return (
    <div className="bg-paper">
      <header className="relative overflow-hidden border-b border-line">
        <HeaderLeaves />
        <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <Breadcrumb items={navCrumbs('/financing', (key) => tNav(key))} />
          <p className="eyebrow mt-4">{t('eyebrow')}</p>
          <h1 className="mt-2 text-4xl text-ink sm:text-5xl">{t('title')}</h1>
          <p className="mt-4 max-w-2xl text-ink-muted">{t('lede')}</p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile emphasis label={t('tiles.deals')} value={count(totals.deals)} />
          <StatTile label={t('tiles.bndes')} value={millions(totals.bndes_mi_brl)} note={t('tiles.known')} />
          <StatTile label={t('tiles.fundo_clima')} value={millions(totals.fundo_clima_mi_brl)} note={t('tiles.known')} />
          <StatTile label={t('tiles.capacity')} value={count(totals.capacity_m3_day)} unit={t('unit_m3_day')} />
        </dl>

        <div className="grid gap-5 md:grid-cols-2">
          {ROUTES.map((key) => {
            const r = data.by_route[key]
            return (
              r && (
                <Card key={key} id={`rota-${key}`} title={t(`routes.${key}`)} caption={t(`routes.${key}_caption`)}>
                  <p className="text-2xl tabular-nums text-ink">
                    {t('range', { min: brl(r.capex_min), max: brl(r.capex_max) })}
                  </p>
                  <p className="mt-1 text-sm text-ink-muted">{t('per_m3_day', { n: r.n })}</p>
                </Card>
              )
            )
          })}
        </div>

        <Card id="operacoes" title={t('table.heading')} caption={t('table.caption', { years: a.life_years, factor: pct(a.capacity_factor), rates })}>
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[44rem] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-ink-muted">
                  <th scope="col" className="py-2 pr-3 font-normal">{t('table.project')}</th>
                  <th scope="col" className="py-2 pr-3 font-normal">{t('table.route')}</th>
                  <th scope="col" className="py-2 pr-3 text-right font-normal">{t('table.capacity')}</th>
                  <th scope="col" className="py-2 pr-3 text-right font-normal">{t('table.capex')}</th>
                  <th scope="col" className="py-2 pr-3 text-right font-normal">{t('table.levelized')}</th>
                  <th scope="col" className="py-2 font-normal">{t('table.source')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.projects.map((p) => (
                  <tr key={p.project}>
                    <td className="py-2 pr-3 text-ink">
                      {p.project} <span className="text-ink-muted">({p.uf})</span>
                      <span className="block text-xs text-ink-muted">{t(`basis.${p.basis}`)} · {p.approved}</span>
                    </td>
                    <td className="whitespace-nowrap py-2 pr-3 text-ink-muted">{t(`routes.${p.route_key}`)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-ink">{count(p.capacity_m3_day)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-ink">
                      {p.lower_bound ? t('at_least', { value: brl(p.capex_brl_per_m3d) }) : brl(p.capex_brl_per_m3d)}
                    </td>
                    <td className="whitespace-nowrap py-2 pr-3 text-right tabular-nums text-ink">
                      {t('range', { min: brl2(p.levelized[0].brl_per_m3), max: brl2(p.levelized[p.levelized.length - 1].brl_per_m3) })}
                    </td>
                    <td className="whitespace-nowrap py-2 text-xs">
                      {p.sources.map((url, i) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mr-2 text-terra-800 underline underline-offset-2 dark:text-terra-300"
                        >
                          {p.sources.length > 1 ? t('table.source_n', { n: i + 1 }) : t('table.source')}
                        </a>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

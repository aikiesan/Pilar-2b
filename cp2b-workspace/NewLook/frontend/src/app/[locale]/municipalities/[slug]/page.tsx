/**
 * /municipalities/campinas-sp: one municipality's profile, rendered on the
 * server and kept for an hour (ISR), in a fixed reading order:
 *
 *  1. header: name, state, regions, "not your municipality?" search
 *  2. lede: CP2b N4 methane, one sentence, rank in the state, per inhabitant
 *  3. by sector · 4. by residue · 5. method levels (N4, N3, their ranges)
 *  6. nearby infrastructure (→ Proximidade) · 7. data and citation
 *  8. share · 9. neighbours · 10. notes, limitations, report an error
 *
 * Every figure comes from the API (lib/municipalityProfile). Outside the CP2b
 * scope (São Paulo) the page says "sem dado CP2b" and keeps the rest. When the
 * API is down the render throws, so ISR keeps serving the last good page rather
 * than caching an outage; error.tsx covers a first visit.
 *
 * The old /municipality/3509502 address answers with a 301 here (src/proxy.ts).
 */
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getFormatter, getTranslations } from 'next-intl/server'
import { Link } from '@/navigation'
import Breadcrumb from '@/components/ui/Breadcrumb'
import { navCrumbs } from '@/lib/breadcrumbTrail'
import MunicipalitySearch from '@/components/home/MunicipalitySearch'
import ShareLinks from '@/components/municipality/ShareLinks'
import { getState, ufOf } from '@/data/brazilStates'
import { SECTOR_COLORS } from '@/data/sectorColors'
import { isLocale } from '@/config/i18n'
import { DATA_EXPORT_ENABLED } from '@/lib/featureFlags'
import { isPublicMapMunicipality } from '@/lib/mapScope'
import { findMunicipality } from '@/lib/municipalityDirectory'
import {
  loadMunicipalityProfile,
  PROFILE_SECTORS,
  type MunicipalityProfile,
} from '@/lib/municipalityProfile'
import { isIbgeCode, municipalityPath } from '@/lib/municipalitySlug'
import { publicUrl } from '@/lib/siteUrl'

export const revalidate = 3600
// Rendered on first visit, then kept: 5,571 pages are not built ahead.
export const dynamicParams = true
export function generateStaticParams() {
  return []
}

type Params = { params: Promise<{ locale: string; slug: string }> }

/** Proximidade opens on a point with this radius (km). */
const PROXIMITY_RADIUS_KM = 50

/**
 * The municipality a slug names. Without the list (API down) only an IBGE code
 * can be served; a slug then throws, so no outage page is cached.
 */
async function resolve(slug: string): Promise<{ ibge: string; name?: string }> {
  const entry = await findMunicipality(slug)
  if (entry === null) notFound()
  if (entry) return { ibge: entry.ibge, name: entry.name }
  if (isIbgeCode(slug)) {
    if (!isPublicMapMunicipality(slug)) notFound()
    return { ibge: slug }
  }
  throw new Error('municipality list unavailable')
}

async function load(slug: string): Promise<MunicipalityProfile> {
  const { ibge, name } = await resolve(slug)
  const profile = await loadMunicipalityProfile(ibge, name)
  if (!profile) throw new Error(`municipality ${ibge} unavailable`)
  return profile
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, slug } = await params
  if (!isLocale(locale)) return {}
  const profile = await load(slug)
  const t = await getTranslations({ locale, namespace: 'municipality_profile' })
  const format = await getFormatter({ locale })
  const uf = getState(ufOf(profile.ibge))?.sigla ?? ''
  const path = municipalityPath(profile.name, profile.ibge)
  const description =
    profile.n4 === null
      ? t('meta.description_no_data', { name: profile.name, uf })
      : t('meta.description', {
          name: profile.name,
          uf,
          value: format.number(profile.n4, { notation: 'compact', compactDisplay: 'long', maximumFractionDigits: 1 }),
        })
  const image = {
    // Absolute: Next adds no basePath (/pilar2b) to a URL given here.
    url: publicUrl(`/${locale}${path}/share-image`),
    width: 1200,
    height: 630,
    alt: t('og.alt', { name: profile.name, uf }),
  }
  const title = t('meta.title', { name: profile.name, uf })
  return {
    title,
    description,
    alternates: {
      canonical: publicUrl(`/${locale}${path}`),
      languages: {
        'pt-BR': publicUrl(`/pt-BR${path}`),
        en: publicUrl(`/en${path}`),
        'x-default': publicUrl(`/pt-BR${path}`),
      },
    },
    openGraph: {
      title,
      description,
      url: publicUrl(`/${locale}${path}`),
      type: 'website',
      locale: locale === 'pt-BR' ? 'pt_BR' : 'en_US',
      images: [image],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  }
}

function Section({
  id,
  title,
  lede,
  children,
}: {
  id: string
  title: string
  lede?: string
  children: React.ReactNode
}) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-24 border-t border-line py-10 sm:py-12">
      <h2 id={`${id}-h`} className="text-2xl text-ink sm:text-3xl">{title}</h2>
      {lede && <p className="mt-2 max-w-2xl text-ink-muted">{lede}</p>}
      <div className="mt-6">{children}</div>
    </section>
  )
}

export default async function MunicipalityProfilePage({ params }: Params) {
  const { locale, slug } = await params
  if (!isLocale(locale)) notFound()
  const profile = await load(slug)
  const t = await getTranslations({ locale, namespace: 'municipality_profile' })
  const tSectors = await getTranslations({ locale, namespace: 'common.sectors' })
  const tNav = await getTranslations({ locale, namespace: 'common.nav' })
  const tResidues = await getTranslations({ locale, namespace: 'Map.residues' })
  const format = await getFormatter({ locale })

  const p = profile
  const state = getState(ufOf(p.ibge))
  const uf = state?.sigla ?? ''
  const path = municipalityPath(p.name, p.ibge)
  const url = publicUrl(`/${locale}${path}`)
  const hasCp2b = p.n4 !== null

  const volume = (v: number) => format.number(v, { maximumSignificantDigits: 3 })
  const big = (v: number) =>
    format.number(v, { notation: 'compact', compactDisplay: 'long', maximumFractionDigits: 1 })
  const percent = (v: number) =>
    format.number(v, { style: 'percent', maximumFractionDigits: v > 0 && v < 0.01 ? 1 : 0 })

  const sectorTotal = PROFILE_SECTORS.reduce((sum, s) => sum + (p.sectors[s] ?? 0), 0)
  const residues = [...p.residues].sort((a, b) => (b.n4 ?? 0) - (a.n4 ?? 0))
  const perCapita = hasCp2b && p.population ? p.n4! / p.population : null
  // "Top x %" is said only when it flatters no one: the upper half of the state.
  const topShare = p.rank ? Math.max(1, Math.ceil((p.rank.position / p.rank.of) * 100)) : null

  const proximityHref = p.centroid
    ? `/proximity?lat=${p.centroid.lat.toFixed(6)}&lng=${p.centroid.lng.toFixed(6)}&radius=${PROXIMITY_RADIUS_KM}`
    : '/proximity'
  const source = p.methodVersion ? t('residues.source_version', { version: p.methodVersion }) : t('residues.source')
  const stamp = p.methodVersion ? t('data.stamp', { version: p.methodVersion }) : t('data.stamp_no_version')
  const today = format.dateTime(new Date(), { dateStyle: 'long' })

  const sections = [
    hasCp2b && { id: 'setores', label: t('sectors.heading') },
    hasCp2b && { id: 'residuos', label: t('residues.heading') },
    hasCp2b && { id: 'niveis', label: t('scenarios.heading') },
    { id: 'infraestrutura', label: t('infrastructure.heading') },
    { id: 'dados', label: t('data.heading') },
    { id: 'compartilhar', label: t('share.heading') },
    { id: 'vizinhos', label: t('neighbours.heading') },
    { id: 'notas', label: t('notes.heading') },
  ].filter(Boolean) as { id: string; label: string }[]

  return (
    <div className="bg-paper">
      {/* 1. Header */}
      <header className="border-b border-line">
        <div className="mx-auto max-w-5xl px-4 pt-8 sm:px-6 sm:pt-12 lg:px-8">
          <Breadcrumb items={navCrumbs('/municipalities/' + slug, (key) => tNav(key), [{ label: p.name }])} />
          <p className="eyebrow mt-6">{t('eyebrow', { state: state?.nome ?? uf })}</p>
          <h1 className="mt-2 text-4xl text-ink sm:text-5xl">
            {p.name} <span className="text-ink-muted">({uf})</span>
          </h1>
          <dl className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:flex sm:flex-wrap">
            {p.immediateRegion && (
              <div className="flex gap-2">
                <dt className="text-ink-muted">{t('region_immediate')}</dt>
                <dd className="text-ink">{p.immediateRegion}</dd>
              </div>
            )}
            {p.intermediateRegion && (
              <div className="flex gap-2">
                <dt className="text-ink-muted">{t('region_intermediate')}</dt>
                <dd className="text-ink">{p.intermediateRegion}</dd>
              </div>
            )}
            <div className="flex gap-2">
              <dt className="text-ink-muted">{t('ibge_code')}</dt>
              <dd className="tabular-nums text-ink">{p.ibge}</dd>
            </div>
          </dl>
          <details className="group mt-6 max-w-xl pb-8">
            <summary className="inline-flex min-h-[44px] cursor-pointer items-center text-sm font-medium text-terra-800 underline underline-offset-4 dark:text-terra-300">
              {t('switch')}
            </summary>
            <div className="mt-3">
              <MunicipalitySearch />
            </div>
          </details>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* 2. Lede */}
        <section aria-labelledby="lede-h" className="py-10 sm:py-12">
          {hasCp2b ? (
            <>
              <h2 id="lede-h" className="eyebrow font-sans">{t('lede_label')}</h2>
              <p className="mt-3 font-display text-5xl leading-none text-ink sm:text-7xl">{big(p.n4!)}</p>
              <p className="mt-2 text-lg text-ink">{t('lede_unit')}</p>
              <p className="mt-6 max-w-2xl text-ink-muted">{t('lede_sentence', { name: p.name })}</p>
              <ul className="mt-6 flex flex-col gap-2 text-sm text-ink sm:flex-row sm:flex-wrap sm:gap-x-6">
                {p.rank && (
                  <li>
                    {t('rank', { position: p.rank.position, of: p.rank.of, state: state?.nome ?? uf })}
                    {topShare !== null && topShare <= 50 && <> · {t('top_share', { share: topShare })}</>}
                  </li>
                )}
                {perCapita !== null && (
                  <li>
                    {p.populationYear
                      ? t('per_capita_year', { value: volume(perCapita), year: p.populationYear })
                      : t('per_capita', { value: volume(perCapita) })}
                  </li>
                )}
              </ul>
            </>
          ) : (
            <div className="max-w-2xl border border-line border-l-2 border-l-terra-900 bg-paper-raised px-5 py-4">
              <h2 id="lede-h" className="text-xl text-ink">{t('no_cp2b_title')}</h2>
              <p className="mt-2 text-ink-muted">{t('no_cp2b_body', { name: p.name })}</p>
            </div>
          )}
          <nav aria-label={t('on_this_page')} className="mt-8">
            <ul className="flex gap-2 overflow-x-auto pb-1 text-sm sm:flex-wrap sm:overflow-visible">
              {sections.map((s) => (
                <li key={s.id} className="shrink-0">
                  <a
                    href={`#${s.id}`}
                    className="inline-flex min-h-[40px] items-center border border-line bg-paper-raised px-3 text-ink hover:border-line-strong"
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </section>

        {hasCp2b && (
          <>
            {/* 3. By sector */}
            <Section id="setores" title={t('sectors.heading')} lede={t('sectors.lede')}>
              {sectorTotal > 0 ? (
                <>
                  <div className="flex h-6 w-full overflow-hidden border border-line" aria-hidden="true">
                    {PROFILE_SECTORS.map((s) =>
                      (p.sectors[s] ?? 0) > 0 ? (
                        <div
                          key={s}
                          style={{ width: `${((p.sectors[s] ?? 0) / sectorTotal) * 100}%`, backgroundColor: SECTOR_COLORS[s] }}
                        />
                      ) : null,
                    )}
                  </div>
                  <ul className="mt-4 grid gap-3 sm:grid-cols-3">
                    {PROFILE_SECTORS.map((s) => (
                      <li key={s} className="flex items-start gap-3">
                        <span className="mt-1 h-3 w-3 shrink-0" style={{ backgroundColor: SECTOR_COLORS[s] }} aria-hidden="true" />
                        <span>
                          <span className="block font-medium text-ink">{tSectors(s)}</span>
                          <span className="block text-sm text-ink-muted">
                            {t('sectors.item', { value: volume(p.sectors[s] ?? 0), percent: percent((p.sectors[s] ?? 0) / sectorTotal) })}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-ink-muted">{t('sectors.empty')}</p>
              )}
            </Section>

            {/* 4. By residue */}
            <Section id="residuos" title={t('residues.heading')}>
              <table className="w-full border-collapse text-sm">
                <caption className="mb-3 text-left text-ink-muted">{t('residues.caption')}</caption>
                <thead className="sr-only sm:not-sr-only">
                  <tr className="border-b border-line-strong text-left">
                    <th scope="col" className="py-2 pr-4 font-medium text-ink">{t('residues.col_residue')}</th>
                    <th scope="col" className="py-2 pr-4 font-medium text-ink">{t('residues.col_sector')}</th>
                    <th scope="col" className="py-2 pr-4 text-right font-medium text-ink">{t('residues.col_value')}</th>
                    <th scope="col" className="py-2 pr-4 font-medium text-ink">{t('residues.col_unit')}</th>
                    <th scope="col" className="py-2 font-medium text-ink">{t('residues.col_source')}</th>
                  </tr>
                </thead>
                <tbody>
                  {residues.map((r) => (
                    <tr key={r.key} role="row" className="grid grid-cols-2 gap-x-4 border-b border-line py-2 sm:table-row sm:py-0">
                      <th scope="row" role="rowheader" className="col-span-2 text-left font-medium text-ink sm:py-2 sm:pr-4">{tResidues(r.key as Parameters<typeof tResidues>[0])}</th>
                      <td role="cell" className="text-ink-muted sm:py-2 sm:pr-4">{tSectors(r.sector)}</td>
                      <td role="cell" className="text-right tabular-nums text-ink sm:py-2 sm:pr-4">
                        {volume(r.n4 ?? 0)}
                        <span className="text-ink-muted sm:hidden"> {t('residues.unit')}</span>
                      </td>
                      <td role="cell" className="hidden text-ink-muted sm:table-cell sm:py-2 sm:pr-4">{t('residues.unit')}</td>
                      <td role="cell" className="hidden text-ink-muted sm:table-cell sm:py-2">{source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-sm text-ink-muted sm:hidden">{t('residues.col_source')}: {source}</p>
            </Section>

            {/* 5. Method levels */}
            <Section id="niveis" title={t('scenarios.heading')} lede={t('scenarios.lede')}>
              <dl className="grid gap-4 sm:grid-cols-2">
                {([
                  ['n4', p.n4, p.envelope?.n4],
                  ['n3', p.n3, p.envelope?.n3],
                ] as const).map(([level, value, range]) => (
                  <div key={level} className="border border-line bg-paper-raised p-5">
                    <dt className="eyebrow">{t(`scenarios.${level}_label`)}</dt>
                    <dd className="mt-2">
                      <span className="block font-display text-3xl text-ink">{value === null ? t('no_cp2b_title') : big(value)}</span>
                      {value !== null && <span className="block text-sm text-ink">{t('scenarios.unit')}</span>}
                      <span className="mt-3 block text-sm text-ink-muted">{t(`scenarios.${level}_body`)}</span>
                      {range && (
                        <span className="mt-2 block text-sm text-ink-muted">
                          {t('scenarios.range', { min: volume(range.min), max: volume(range.max) })}
                        </span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </Section>
          </>
        )}

        {/* 6. Nearby infrastructure */}
        <Section id="infraestrutura" title={t('infrastructure.heading')}>
          <p className="max-w-2xl text-ink-muted">{t('infrastructure.body', { name: p.name })}</p>
          <Link
            href={proximityHref}
            className="mt-4 inline-flex min-h-[44px] items-center bg-terra-800 px-5 text-sm font-medium text-white hover:bg-terra-900"
          >
            {p.centroid ? t('infrastructure.cta') : t('infrastructure.cta_plain')}
          </Link>
        </Section>

        {/* 7. Data and citation */}
        <Section id="dados" title={t('data.heading')}>
          {!DATA_EXPORT_ENABLED && (
            <p className="max-w-2xl border border-line border-l-2 border-l-terra-900 bg-paper-raised px-4 py-3 text-sm text-ink">
              {t('data.downloads_paused')}
            </p>
          )}
          <h3 className="mt-6 text-lg text-ink">{t('data.cite_label')}</h3>
          <p className="mt-2 max-w-2xl break-words border-l-2 border-line-strong pl-4 text-sm text-ink">
            {t('data.citation', { name: p.name, uf, url, date: today })}
          </p>
          <p className="mt-3 text-sm">
            <Link href="/cite" className="text-terra-800 underline underline-offset-4 dark:text-terra-300">{t('data.cite_more')}</Link>
          </p>
          <p className="mt-6 text-xs uppercase tracking-wide text-ink-muted">{stamp}</p>
        </Section>

        {/* 8. Share */}
        <Section id="compartilhar" title={t('share.heading')}>
          <ShareLinks url={url} text={t('share.text', { name: p.name, uf })} />
        </Section>

        {/* 9. Neighbours */}
        <Section id="vizinhos" title={t('neighbours.heading')} lede={p.neighbours?.length ? t('neighbours.lede', { name: p.name }) : undefined}>
          {p.neighbours === null ? (
            <p className="text-ink-muted">{t('neighbours.unavailable')}</p>
          ) : p.neighbours.length === 0 ? (
            <p className="text-ink-muted">{t('neighbours.none', { name: p.name })}</p>
          ) : (
            <ul className="grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
              {p.neighbours.map((n) => (
                <li key={n.ibge} className="flex items-baseline justify-between gap-3 border-b border-line py-2">
                  <Link
                    href={municipalityPath(n.name, n.ibge)}
                    className="inline-flex min-h-[32px] items-center text-ink underline-offset-2 hover:text-terra-700 hover:underline dark:hover:text-terra-300"
                  >
                    {n.name}
                    {ufOf(n.ibge) !== ufOf(p.ibge) && <span className="ml-1 text-ink-muted">({getState(ufOf(n.ibge))?.sigla})</span>}
                  </Link>
                  <span className="shrink-0 text-right text-sm tabular-nums text-ink-muted">
                    {n.n4 === null ? t('neighbours.no_data') : `${volume(n.n4)} ${t('residues.unit')}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* 10. Notes and limitations */}
        <Section id="notas" title={t('notes.heading')}>
          <ul className="max-w-2xl list-disc space-y-2 pl-5 text-ink-muted">
            {(t.raw('notes.items') as string[]).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div className="mt-8 max-w-2xl border border-line bg-paper-raised p-5">
            <h3 className="text-lg text-ink">{t('notes.report_heading')}</h3>
            <p className="mt-1 text-sm text-ink-muted">{t('notes.report_body')}</p>
            <Link
              href="/about#contato"
              className="mt-3 inline-flex min-h-[44px] items-center text-sm font-medium text-terra-800 underline underline-offset-4 dark:text-terra-300"
            >
              {t('notes.report')}
            </Link>
          </div>
        </Section>
      </div>
    </div>
  )
}

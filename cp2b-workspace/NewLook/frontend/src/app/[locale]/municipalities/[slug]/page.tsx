/**
 * /municipalities/campinas-sp: one municipality's profile, rendered on the
 * server and kept for an hour (ISR). A dashboard, not an essay: figures first,
 * each in the form that reads fastest, the explanations folded away.
 *
 *  1. header: name, regions, IBGE code, "not your municipality?" search
 *  2. four tiles: N4 (headline), rank in the state, N3, main sector
 *  3. where the methane comes from: sector bar + residue bars by sector
 *  4. method levels: bars with their min–max range (N1 and N2 only while
 *     METHOD_PAGES_ENABLED is on — see MunicipalityProfile.upstream)
 *  5. neighbours compared, this municipality highlighted
 *  6. actions: nearby infrastructure (→ Proximidade), share, cite
 *  7. notes and limitations, folded; report an error
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
import {
  BarList,
  Card,
  LegendItem,
  LevelBars,
  RankStrip,
  StackedBar,
  StatTile,
  type LevelRow,
} from '@/components/municipality/ProfileVisuals'
import { getState, ufOf } from '@/data/brazilStates'
import { SECTOR_COLORS } from '@/data/sectorColors'
import { isLocale } from '@/config/i18n'
import { DATA_EXPORT_ENABLED, METHOD_PAGES_ENABLED } from '@/lib/featureFlags'
import { isPublicMapMunicipality } from '@/lib/mapScope'
import { findMunicipality } from '@/lib/municipalityDirectory'
import {
  loadMunicipalityProfile,
  PROFILE_SECTORS,
  type MunicipalityProfile,
  type ProfileSector,
  type Range,
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
  /** Bar labels: "8,47 mi", "786 mil". */
  const short = (v: number) =>
    format.number(v, { notation: 'compact', compactDisplay: 'short', maximumSignificantDigits: 3 })
  const percent = (v: number) =>
    format.number(v, { style: 'percent', maximumFractionDigits: v > 0 && v < 0.01 ? 1 : 0 })

  const sectorValue = (s: ProfileSector) => p.sectors[s] ?? 0
  const sectorTotal = PROFILE_SECTORS.reduce((sum, s) => sum + sectorValue(s), 0)
  const sectorSegments = PROFILE_SECTORS.map((s) => ({ key: s, value: sectorValue(s), color: SECTOR_COLORS[s] }))
  const mainSector = sectorTotal > 0 ? [...PROFILE_SECTORS].sort((a, b) => sectorValue(b) - sectorValue(a))[0] : null
  const residues = [...p.residues].sort((a, b) => (b.n4 ?? 0) - (a.n4 ?? 0))
  const residueMax = Math.max(0, ...residues.map((r) => r.n4 ?? 0))
  const zeroResidues = residues.filter((r) => !r.n4)
  const residueName = (key: string) => tResidues(key as Parameters<typeof tResidues>[0])
  const perCapita = hasCp2b && p.population ? p.n4! / p.population : null
  // "Top x %" is said only when it flatters no one: the upper half of the state.
  const topShare = p.rank ? Math.max(1, Math.ceil((p.rank.position / p.rank.of) * 100)) : null

  const levels: LevelRow[] = []
  const addLevel = (key: 'n1' | 'n2' | 'n3' | 'n4', value: number | null, range: Range | null) => {
    if (value === null) return
    levels.push({
      key,
      label: t(`scenarios.${key}_label`),
      body: t(`scenarios.${key}_body`),
      value,
      valueLabel: short(value),
      range,
      rangeLabel: range ? t('scenarios.range_short', { min: short(range.min), max: short(range.max) }) : undefined,
    })
  }
  if (hasCp2b) {
    if (METHOD_PAGES_ENABLED && p.upstream) {
      addLevel('n1', p.upstream.n1?.value ?? null, p.upstream.n1?.range ?? null)
      addLevel('n2', p.upstream.n2?.value ?? null, p.upstream.n2?.range ?? null)
    }
    addLevel('n3', p.n3, p.envelope?.n3 ?? null)
    addLevel('n4', p.n4, p.envelope?.n4 ?? null)
  }

  const neighbourRows = p.neighbours?.length
    ? [
        ...p.neighbours.map((n) => ({ ibge: n.ibge, name: n.name, n4: n.n4, self: false })),
        { ibge: p.ibge, name: p.name, n4: p.n4, self: true },
      ].sort((a, b) => (b.n4 ?? -1) - (a.n4 ?? -1))
    : []

  const proximityHref = p.centroid
    ? `/proximity?lat=${p.centroid.lat.toFixed(6)}&lng=${p.centroid.lng.toFixed(6)}&radius=${PROXIMITY_RADIUS_KM}`
    : '/proximity'
  const stamp = p.methodVersion ? t('data.stamp', { version: p.methodVersion }) : t('data.stamp_no_version')
  const today = format.dateTime(new Date(), { dateStyle: 'long' })
  const linkClass = 'font-medium text-terra-800 underline underline-offset-4 hover:text-terra-900 dark:text-terra-300'
  const chip = 'flex gap-1.5 border border-line bg-paper-raised px-2 py-1'

  // Beside the method levels when there is CP2b data; with the actions otherwise.
  const infrastructure = (
    <Card id="infraestrutura" title={t('infrastructure.heading')} caption={t('infrastructure.short')}>
      <Link
        href={proximityHref}
        className="inline-flex min-h-[44px] items-center bg-terra-800 px-4 text-sm font-medium text-white hover:bg-terra-900"
      >
        {p.centroid ? t('infrastructure.cta') : t('infrastructure.cta_plain')}
      </Link>
    </Card>
  )

  return (
    <div className="bg-paper">
      {/* 1. Header */}
      <header className="border-b border-line">
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
          <Breadcrumb items={navCrumbs('/municipalities/' + slug, (key) => tNav(key), [{ label: p.name }])} />
          <div className="mt-4 flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
            <div>
              <p className="eyebrow">{t('eyebrow', { state: state?.nome ?? uf })}</p>
              <h1 className="mt-1 text-3xl text-ink sm:text-4xl">
                {p.name} <span className="text-ink-muted">({uf})</span>
              </h1>
              <dl className="mt-3 flex flex-wrap gap-2 text-xs">
                {p.intermediateRegion && (
                  <div className={chip}>
                    <dt className="text-ink-muted">{t('region_intermediate')}</dt>
                    <dd className="text-ink">{p.intermediateRegion}</dd>
                  </div>
                )}
                {p.immediateRegion && (
                  <div className={chip}>
                    <dt className="text-ink-muted">{t('region_immediate')}</dt>
                    <dd className="text-ink">{p.immediateRegion}</dd>
                  </div>
                )}
                <div className={chip}>
                  <dt className="text-ink-muted">{t('ibge_code')}</dt>
                  <dd className="tabular-nums text-ink">{p.ibge}</dd>
                </div>
              </dl>
            </div>
            <details className="group w-full max-w-sm sm:w-auto">
              <summary className="inline-flex min-h-[44px] cursor-pointer items-center text-sm font-medium text-terra-800 underline underline-offset-4 dark:text-terra-300">
                {t('switch')}
              </summary>
              <div className="mt-2">
                <MunicipalitySearch />
              </div>
            </details>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        {/* 2. Tiles */}
        {hasCp2b ? (
          <section aria-label={t('lede_label')}>
            <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatTile
                emphasis
                label={t('kpi.n4_label')}
                value={big(p.n4!)}
                unit={t('kpi.unit_year')}
                note={
                  perCapita !== null
                    ? t('per_capita', { value: volume(perCapita) })
                    : t('kpi.per_day', { value: volume(p.n4! / 365) })
                }
              />
              <StatTile
                label={t('kpi.rank_label')}
                value={p.rank ? t('kpi.rank_value', { position: p.rank.position }) : '—'}
                unit={p.rank ? t('kpi.rank_of', { of: p.rank.of, state: state?.nome ?? uf }) : undefined}
                note={topShare !== null && topShare <= 50 ? t('top_share', { share: topShare }) : undefined}
              >
                {p.rank && <RankStrip position={p.rank.position} of={p.rank.of} />}
              </StatTile>
              <StatTile
                label={t('kpi.n3_label')}
                value={p.n3 === null ? '—' : big(p.n3)}
                unit={t('kpi.unit_year')}
                note={p.n3 ? t('kpi.n3_kept', { percent: percent(p.n4! / p.n3) }) : undefined}
              />
              <StatTile
                label={t('kpi.sector_label')}
                value={mainSector ? tSectors(mainSector) : '—'}
                unit={mainSector ? t('kpi.sector_share', { percent: percent(sectorValue(mainSector) / sectorTotal) }) : undefined}
              >
                <StackedBar height="h-2" segments={sectorSegments} />
              </StatTile>
            </dl>
          </section>
        ) : (
          <section aria-labelledby="lede-h" className="max-w-2xl border border-line border-l-2 border-l-terra-900 bg-paper-raised px-5 py-4">
            <h2 id="lede-h" className="text-xl text-ink">{t('no_cp2b_title')}</h2>
            <p className="mt-2 text-ink-muted">{t('no_cp2b_body', { name: p.name })}</p>
          </section>
        )}

        {hasCp2b && (
          <div className="grid gap-5 lg:grid-cols-5">
            {/* 3. Where the methane comes from */}
            <Card id="composicao" className="lg:col-span-3" title={t('composition.heading')} caption={t('composition.caption')}>
              {sectorTotal > 0 ? (
                <>
                  <StackedBar segments={sectorSegments} />
                  <div className="mt-5 space-y-4">
                    {PROFILE_SECTORS.filter((s) => sectorValue(s) > 0).map((s) => (
                      <div key={s}>
                        <h3 className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 border-b border-line pb-1">
                          <LegendItem color={SECTOR_COLORS[s]} label={tSectors(s)} />
                          <span className="text-sm tabular-nums text-ink-muted">
                            {short(sectorValue(s))} · {percent(sectorValue(s) / sectorTotal)}
                          </span>
                        </h3>
                        <BarList
                          scale={residueMax}
                          rows={residues
                            .filter((r) => r.sector === s && (r.n4 ?? 0) > 0)
                            .map((r) => ({
                              key: r.key,
                              label: residueName(r.key),
                              value: r.n4 ?? 0,
                              valueLabel: short(r.n4 ?? 0),
                              color: SECTOR_COLORS[s],
                            }))}
                        />
                      </div>
                    ))}
                  </div>
                  {zeroResidues.length > 0 && (
                    <p className="mt-4 text-xs text-ink-muted">
                      {t('composition.zero', { list: format.list(zeroResidues.map((r) => residueName(r.key))) })}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-ink-muted">{t('sectors.empty')}</p>
              )}
            </Card>

            <div className="grid content-start gap-5 lg:col-span-2">
              {/* 4. Method levels */}
              <Card id="niveis" title={t('scenarios.heading')} caption={t('scenarios.caption')}>
                <LevelBars rows={levels} />
                {!METHOD_PAGES_ENABLED && <p className="mt-4 text-xs text-ink-muted">{t('scenarios.held')}</p>}
              </Card>
              {infrastructure}
            </div>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-5">
          {/* 5. Neighbours */}
          <Card
            id="vizinhos"
            className="lg:col-span-3"
            title={t('neighbours.heading')}
            caption={p.neighbours?.length ? t('neighbours.caption', { name: p.name }) : undefined}
          >
            {p.neighbours === null ? (
              <p className="text-ink-muted">{t('neighbours.unavailable')}</p>
            ) : p.neighbours.length === 0 ? (
              <p className="text-ink-muted">{t('neighbours.none', { name: p.name })}</p>
            ) : (
              <BarList
                labelWidth="minmax(7rem, 11rem)"
                rows={neighbourRows.map((n) => ({
                  key: n.ibge,
                  emphasis: n.self,
                  value: n.n4 ?? 0,
                  valueLabel: n.n4 === null ? t('neighbours.no_data') : short(n.n4),
                  barClassName: n.self ? 'bg-terra-600 dark:bg-terra-400' : 'bg-line-strong',
                  label: n.self ? (
                    <span>
                      {n.name} <span className="font-normal text-ink-muted">· {t('neighbours.this')}</span>
                    </span>
                  ) : (
                    <Link
                      href={municipalityPath(n.name, n.ibge)}
                      className="underline-offset-2 hover:text-terra-700 hover:underline dark:hover:text-terra-300"
                    >
                      {n.name}
                      {ufOf(n.ibge) !== ufOf(p.ibge) && <span className="ml-1 text-ink-muted">({getState(ufOf(n.ibge))?.sigla})</span>}
                    </Link>
                  ),
                }))}
              />
            )}
          </Card>

          {/* 6. Actions */}
          <div className="grid content-start gap-5 lg:col-span-2">
            {!hasCp2b && infrastructure}
            <Card id="compartilhar" title={t('share.heading')}>
              <ShareLinks url={url} text={t('share.text', { name: p.name, uf })} />
            </Card>
            <Card id="dados" title={t('data.cite_label')}>
              <p className="break-words border-l-2 border-line-strong pl-3 text-xs text-ink">
                {t('data.citation', { name: p.name, uf, url, date: today })}
              </p>
              <p className="mt-3 text-sm">
                <Link href="/cite" className={linkClass}>{t('data.cite_more')}</Link>
              </p>
              {!DATA_EXPORT_ENABLED && <p className="mt-3 text-xs text-ink-muted">{t('data.downloads_paused')}</p>}
            </Card>
          </div>
        </div>

        {/* 7. Notes */}
        <details id="notas" className="group border border-line bg-paper-raised">
          <summary className="flex min-h-[48px] cursor-pointer items-center justify-between gap-4 px-4 text-ink sm:px-5">
            <span className="text-lg">{t('notes.heading')}</span>
            <span className="text-sm text-ink-muted group-open:hidden">{t('notes.open')}</span>
          </summary>
          <div className="border-t border-line px-4 py-4 sm:px-5">
            <ul className="max-w-3xl list-disc space-y-2 pl-5 text-sm text-ink-muted">
              {(t.raw('notes.items') as string[]).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-ink">
              {t('notes.report_body')}{' '}
              <Link href="/about#contato" className={linkClass}>{t('notes.report')}</Link>
            </p>
          </div>
        </details>

        <p className="text-xs uppercase tracking-wide text-ink-muted">{stamp}</p>
      </div>
    </div>
  )
}

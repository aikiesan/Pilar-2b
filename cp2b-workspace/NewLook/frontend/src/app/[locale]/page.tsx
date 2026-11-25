/**
 * Landing — the platform's front door at "/".
 *
 * Built as a visual page, after UNBL, Orbae and monks.com: the sector is shown
 * before it is explained. Reading order:
 *   hero      an edited loop through biogas sources (plant, livestock, crops, sewage), the platform's name, one button;
 *   counts    what the platform covers, on the hero's own petrol band;
 *   search    start from a municipality;
 *   questions the four map analyses, each with its 3 × 3 grid;
 *   market    biomethane demand: the mandate and the cost of a plant (video);
 *   sectors   the data catalogue by sector;
 *   build     the siting tools: the calculator (video);
 *   method, news and citation, partners.
 *
 * Server-rendered; the videos are the only client islands (HomeVideo). No
 * number is typed into the copy: residue and sector counts come from
 * src/data/residueFactors.ts, municipality and reference counts from the API
 * (cached for an hour). When the API does not answer, the count says so
 * instead of showing a figure. Until the paper is submitted
 * (METHOD_PAGES_ENABLED off) the copy does not name the factors one by one.
 */
import type { Metadata } from 'next';
import { getFormatter, getLocale, getTranslations } from 'next-intl/server';
import { ArrowRight } from 'lucide-react';
import { Link } from '@/navigation';
import NavLink from '@/components/layout/NavLink';
import { CP2B_PAGES } from '@/config/contact';
import HomeVideo from '@/components/home/HomeVideo';
import HeroStage from '@/components/home/HeroStage';
import MunicipalitySearch from '@/components/home/MunicipalitySearch';
import { DETAILED_RESIDUES } from '@/data/residueFactors';
import { canonical } from '@/lib/pageMetadata';
import { CATALOG_SECTORS, SECTOR_SWATCH, residuePath, residuesInSector } from '@/data/residueCatalog';
import patchNotes from '@/data/patch-notes.json';
import { MAP_ANALYSES_ENABLED, METHOD_PAGES_ENABLED } from '@/lib/featureFlags';
import { countFrom, serverGetJson } from '@/lib/serverApi';
import { municipalityDirectory } from '@/lib/municipalityDirectory';
import { BIVARIATE_FILLS } from '@/lib/bivariate';
import { ANALYSES, ANALYSIS_IDS, type AnalysisId } from '@/lib/mapAnalyses';

type Locale = 'pt-BR' | 'en';

const NAMES_SHOWN = 4;

async function liveCounts() {
  // The municipalities the platform covers (SP and the MG pilot), not Brazil's 5,571.
  const [directory, references] = await Promise.all([
    municipalityDirectory(),
    serverGetJson<{ total?: unknown }>('/residuos/references/all?limit=1'),
  ]);
  const referenceCount = countFrom(references?.total);
  return {
    municipalities: directory ? directory.length : null,
    // An empty reference table is a missing load, not "zero references": no figure then.
    references: referenceCount === 0 ? null : referenceCount,
  };
}

/** The analysis's 3 × 3 grid in miniature, its answer cell outlined. */
function AnalysisGlyph({ id }: { id: AnalysisId }) {
  const answer = ANALYSES[id].answerCell;
  return (
    <span aria-hidden="true" className="grid h-16 w-16 shrink-0 grid-cols-3 gap-[2px]">
      {[2, 1, 0].map((cy) =>
        [0, 1, 2].map((cx) => {
          const cell = cy * 3 + cx;
          return (
            <span
              key={cell}
              className={cell === answer ? 'outline outline-2 outline-offset-1 outline-ink' : ''}
              style={{ backgroundColor: BIVARIATE_FILLS[cell] }}
            />
          );
        })
      )}
    </span>
  );
}

/** A destination inside a video band: a title that is the link, one line under it. */
function BandLink({ href, title, body }: { href: string; title: string; body: string }) {
  return (
    <li className="border-t border-white/25 py-5">
      <Link
        href={href}
        className="group flex items-start justify-between gap-6 rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-cp2b-lima focus-visible:ring-offset-4 focus-visible:ring-offset-transparent"
      >
        <span>
          <span className="block text-xl font-bold text-white sm:text-2xl">{title}</span>
          <span className="mt-1 block max-w-md text-sm leading-relaxed text-dusk-100">{body}</span>
        </span>
        <ArrowRight className="mt-1.5 h-5 w-5 shrink-0 text-cp2b-lima transition-transform group-hover:translate-x-1" aria-hidden="true" />
      </Link>
    </li>
  );
}

/** The map button: the page's one primary action, in the brand lime on dark. */
const MAP_CTA_BASE =
  'inline-flex min-h-[60px] items-center gap-3 rounded px-8 text-lg font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';
const MAP_CTA_ON_DARK = `${MAP_CTA_BASE} bg-cp2b-lima text-cp2b-petroleo hover:bg-white focus-visible:ring-white focus-visible:ring-offset-cp2b-petroleo`;
const MAP_CTA_ON_LIGHT = `${MAP_CTA_BASE} bg-cp2b-petroleo text-cp2b-lima hover:bg-dusk-950 focus-visible:ring-terra-600 focus-visible:ring-offset-paper`;

// Title and description come from the locale layout; the home adds its own
// canonical, so /pilar2b/pt-BR?utm_… and the like count as this page.
export const generateMetadata = (): Promise<Metadata> => canonical('/');

export default async function LandingPage() {
  const t = await getTranslations('home');
  const tA = await getTranslations('Map.analyses');
  const format = await getFormatter();
  const locale = ((await getLocale()) === 'en' ? 'en' : 'pt-BR') as Locale;
  const { municipalities, references } = await liveCounts();

  const sectors = CATALOG_SECTORS.map((sector) => ({
    sector,
    residues: residuesInSector(sector),
  })).filter((s) => s.residues.length > 0);

  type CountKey = 'municipalities' | 'residues' | 'sectors' | 'states' | 'references';
  const counts: { key: CountKey; value: number | null }[] = [
    { key: 'municipalities', value: municipalities },
    { key: 'residues', value: DETAILED_RESIDUES.length },
    { key: 'sectors', value: sectors.length },
    // Without a reference count, the fourth figure is the coverage: SP and the MG pilot.
    references === null ? { key: 'states', value: 2 } : { key: 'references', value: references },
  ];

  const news = patchNotes.entries.slice(0, 3);
  const steps = ['data', 'factors', 'potential'] as const;

  return (
    <div className="bg-paper">
      {/* ── Hero: the sources of biogas, under a clear header ───────────── */}
      {/* -mt-16 slides the hero under the sticky header, which is clear here. */}
      <section
        aria-labelledby="home-title"
        className="relative isolate -mt-16 flex min-h-[100svh] max-h-[64rem] items-end overflow-hidden bg-cp2b-petroleo text-white"
      >
        <HeroStage
          pauseLabel={t('v2.hero.pause')}
          playLabel={t('v2.hero.play')}
          sourcesLabel={t('v2.hero.sources.label')}
          sourceNames={{
            plant: t('v2.hero.sources.plant'),
            livestock: t('v2.hero.sources.livestock'),
            crops: t('v2.hero.sources.crops'),
            sanitation: t('v2.hero.sources.sanitation'),
          }}
        >
          {/* The name is the headline; the full name sits under it, inside the
              same heading, so the page title reads as the whole name. */}
          <h1 id="home-title">
            <span className="block text-6xl font-bold leading-none tracking-[-0.03em] sm:text-7xl lg:text-8xl xl:text-[8.5rem]">
              {t('v2.hero.name')}
            </span>
            <span className="mt-5 block max-w-[34ch] text-xl font-semibold leading-snug text-white sm:text-2xl lg:text-[1.75rem]">
              {t('v2.hero.full_name')}
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-dusk-50 sm:text-lg">{t('v2.hero.lede')}</p>
          <Link href="/map" className={`mt-9 ${MAP_CTA_ON_DARK}`}>
            {t('v2.hero.cta')}
            <ArrowRight className="h-6 w-6" aria-hidden="true" />
          </Link>
        </HeroStage>
      </section>

      {/* ── Counts, on the hero's petrol ────────────────────────────────── */}
      <section aria-labelledby="home-counts" className="bg-cp2b-petroleo text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 id="home-counts" className="sr-only">{t('counts.heading')}</h2>
          <dl className="grid grid-cols-2 lg:grid-cols-4">
            {counts.map(({ key, value }, index) => (
              <div
                key={key}
                className={`flex flex-col-reverse gap-1 py-7 sm:py-9 ${index % 2 === 1 ? 'border-l border-white/15 pl-4 sm:pl-6' : 'pr-4'} ${
                  index > 0 ? 'lg:border-l lg:border-white/15 lg:pl-6' : ''
                } ${index < 2 ? 'border-b border-white/15 lg:border-b-0' : ''}`}
              >
                <dt className="text-sm text-dusk-100">
                  {key === 'residues' && !METHOD_PAGES_ENABLED ? t('held.counts_residues') : t(`counts.${key}`)}
                </dt>
                <dd className="font-display text-4xl font-bold tabular-nums sm:text-5xl">
                  {value === null ? (
                    <>
                      <span aria-hidden="true">—</span>
                      <span className="sr-only">{t('counts.unavailable')}</span>
                    </>
                  ) : (
                    format.number(value)
                  )}
                </dd>
              </div>
            ))}
          </dl>
          {municipalities === null && (
            <p className="border-t border-white/15 py-3 text-xs text-dusk-100">{t('counts.unavailable_note')}</p>
          )}
        </div>
      </section>

      {/* ── Start from a municipality ───────────────────────────────────── */}
      <section aria-labelledby="home-search" className="border-b border-line">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 sm:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,32rem)] lg:items-center lg:gap-16 lg:px-8">
          <div>
            <h2 id="home-search" className="text-3xl font-bold text-ink sm:text-4xl">{t('v2.search.heading')}</h2>
            <p className="mt-3 max-w-lg text-ink-muted">{t('v2.search.body')}</p>
          </div>
          <MunicipalitySearch />
        </div>
      </section>

      {/* ── Four questions the map answers ──────────────────────────────── */}
      {/* Held back with the analyses they open (MAP_ANALYSES_ENABLED). */}
      {MAP_ANALYSES_ENABLED && (
        <section aria-labelledby="home-questions" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <h2 id="home-questions" className="max-w-2xl text-3xl font-bold text-ink sm:text-4xl">{t('v2.questions.heading')}</h2>
          <p className="mt-3 max-w-2xl text-ink-muted">{t('v2.questions.lede')}</p>
          <ul className="mt-10 grid gap-px border border-line bg-line sm:grid-cols-2">
            {ANALYSIS_IDS.map((id) => (
              <li key={id} className="bg-paper-raised">
                <Link
                  href={`/map?a=${id}`}
                  className="group flex h-full items-start gap-5 p-6 transition-colors hover:bg-paper-sunken focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-terra-600 sm:p-8"
                >
                  <AnalysisGlyph id={id} />
                  <span className="min-w-0">
                    <span className="block text-sm text-ink-muted">{tA(`${id}.title`)}</span>
                    <span className="mt-1 block text-xl font-bold leading-snug text-ink group-hover:text-terra-700 dark:group-hover:text-terra-300">
                      {tA(`${id}.question`)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link href="/map" className={MAP_CTA_ON_LIGHT}>
              {t('v2.hero.cta')}
              <ArrowRight className="h-6 w-6" aria-hidden="true" />
            </Link>
            <p className="max-w-sm text-sm text-ink-muted">{t('v2.questions.cta_note')}</p>
          </div>
        </section>
      )}

      {/* ── The market: biomethane demand (video band) ──────────────────── */}
      <section aria-labelledby="home-market" className="relative isolate overflow-hidden bg-cp2b-petroleo text-white">
        <HomeVideo name="station" pauseLabel={t('v2.hero.pause')} playLabel={t('v2.hero.play')} className="-z-10" controlClassName="top-4 right-4 sm:right-6 lg:right-8" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-dusk-950/95 via-dusk-950/80 to-dusk-950/55" />
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-2 lg:px-8">
          <div>
            <h2 id="home-market" className="max-w-[18ch] text-3xl font-bold leading-tight sm:text-5xl">{t('v2.market.heading')}</h2>
            <p className="mt-5 max-w-lg leading-relaxed text-dusk-50">{t('v2.market.lede')}</p>
          </div>
          <ul className="self-end border-b border-white/25">
            <BandLink href="/mandate" title={t('v2.market.mandate')} body={t('v2.market.mandate_body')} />
            <BandLink href="/financing" title={t('v2.market.financing')} body={t('v2.market.financing_body')} />
          </ul>
        </div>
      </section>

      {/* ── Data by sector ──────────────────────────────────────────────── */}
      <section aria-labelledby="home-sectors" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <h2 id="home-sectors" className="text-3xl font-bold text-ink sm:text-4xl">{t('sectors.heading')}</h2>
        <p className="mt-3 max-w-2xl text-ink-muted">{METHOD_PAGES_ENABLED ? t('sectors.lede') : t('held.sectors_lede')}</p>

        <ul className="mt-10 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {sectors.map(({ sector, residues }) => {
            const rest = residues.length - NAMES_SHOWN;
            return (
              <li key={sector} className="flex flex-col bg-paper-raised">
                <span aria-hidden="true" className="block h-1.5" style={{ background: SECTOR_SWATCH[sector] }} />
                <div className="flex flex-1 flex-col p-5 sm:p-6">
                  <h3 className="font-display text-2xl font-bold text-ink">
                    <Link href={`/data/${sector}`} className="underline-offset-4 hover:text-terra-700 hover:underline dark:hover:text-terra-300">
                      {t(`sectors.names.${sector}`)}
                    </Link>
                  </h3>
                  <p className="mt-1 text-sm text-ink-muted">{t('sectors.residue_count', { count: residues.length })}</p>
                  <ul className="mt-4 flex-1 space-y-1.5 border-t border-line pt-4 text-sm text-ink">
                    {residues.slice(0, NAMES_SHOWN).map((r) => (
                      <li key={r.code}>
                        <Link href={residuePath(r)} className="underline-offset-2 hover:text-terra-700 hover:underline dark:hover:text-terra-300">
                          {r.name[locale]}
                        </Link>
                      </li>
                    ))}
                    {rest > 0 && <li className="text-ink-muted">{t('sectors.more', { count: rest })}</li>}
                  </ul>
                </div>
              </li>
            );
          })}
        </ul>
        <Link href="/data" className="mt-6 inline-flex min-h-[44px] items-center gap-2 font-medium text-terra-600 underline-offset-4 hover:underline dark:text-terra-400">
          {t('sectors.cta')}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </section>

      {/* ── Before building a plant (video band) ────────────────────────── */}
      <section aria-labelledby="home-build" className="relative isolate overflow-hidden bg-cp2b-petroleo text-white">
        <HomeVideo name="port" pauseLabel={t('v2.hero.pause')} playLabel={t('v2.hero.play')} className="-z-10" controlClassName="top-4 left-4 sm:left-6 lg:left-8" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-l from-dusk-950/95 via-dusk-950/80 to-dusk-950/55" />
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-2 lg:px-8">
          <ul className="order-2 self-end border-b border-white/25 lg:order-1">
            <BandLink href="/calculator" title={t('v2.build.calculator')} body={t('v2.build.calculator_body')} />
          </ul>
          <div className="order-1 lg:order-2">
            <h2 id="home-build" className="max-w-[18ch] text-3xl font-bold leading-tight sm:text-5xl">{t('v2.build.heading')}</h2>
            <p className="mt-5 max-w-lg leading-relaxed text-dusk-50">{t('v2.build.lede')}</p>
          </div>
        </div>
      </section>

      {/* ── How a number is made (a real sequence: numbered) ────────────── */}
      <section id="como-funciona" aria-labelledby="home-how" className="scroll-mt-20 border-b border-line bg-paper-sunken">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <h2 id="home-how" className="text-3xl font-bold text-ink sm:text-4xl">{t('how.heading')}</h2>
          <ol className="mt-10 grid gap-8 md:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step} className="border-t border-line-strong pt-5">
                <span className="font-display text-3xl font-bold text-terra-700 dark:text-terra-300 tabular-nums" aria-hidden="true">
                  {index + 1}
                </span>
                <h3 className="mt-3 text-lg font-semibold text-ink">
                  {step === 'factors' && !METHOD_PAGES_ENABLED ? t('held.factors_title') : t(`how.steps.${step}.title`)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                  {step === 'factors' && !METHOD_PAGES_ENABLED ? t('held.factors_body') : t(`how.steps.${step}.body`)}
                </p>
              </li>
            ))}
          </ol>
          <Link href="/guide/base-cientifica" className="btn-secondary mt-10 min-h-[44px]">
            {t('how.cta')}
          </Link>
        </div>
      </section>

      {/* ── What is new, how to cite ────────────────────────────────────── */}
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[3fr_2fr] lg:px-8">
        <section aria-labelledby="home-news">
          <h2 id="home-news" className="text-3xl font-bold text-ink">{t('news.heading')}</h2>
          <ul className="mt-6 divide-y divide-line border-y border-line">
            {news.map((entry) => (
              <li key={entry.version} className="py-4">
                <p className="text-xs text-ink-muted tabular-nums">
                  <time dateTime={entry.date}>{format.dateTime(new Date(entry.date), { dateStyle: 'long' })}</time>
                  {', '}
                  {t('news.version', { version: entry.version })}
                </p>
                <p className="mt-1 font-medium text-ink">{entry.title[locale] ?? entry.title['pt-BR']}</p>
              </li>
            ))}
          </ul>
          <Link href="/patch-notes" className="mt-4 inline-flex min-h-[44px] items-center gap-2 font-medium text-terra-600 underline-offset-4 hover:underline dark:text-terra-400">
            {t('news.cta')}
          </Link>
        </section>

        <section aria-labelledby="home-cite" className="self-start border border-line border-l-4 border-l-cp2b-verde bg-paper-raised p-6">
          <h2 id="home-cite" className="text-2xl font-bold text-ink">{t('cite.heading')}</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">{t('cite.body')}</p>
          <p className="mt-4 text-sm font-medium text-ink">{t('cite.licence')}</p>
          <Link href="/cite" className="btn-secondary mt-6 min-h-[44px]">
            {t('cite.cta')}
          </Link>
        </section>
      </div>

      {/* ── Who stands behind it ────────────────────────────────────────── */}
      <section aria-labelledby="home-closing" className="bg-cp2b-petroleo text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-16 sm:px-6 sm:py-20 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <h2 id="home-closing" className="max-w-2xl text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
            {t('v2.closing.heading')}
          </h2>
          <Link href="/map" className={`shrink-0 ${MAP_CTA_ON_DARK}`}>
            {t('v2.hero.cta')}
            <ArrowRight className="h-6 w-6" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section aria-labelledby="home-partners" className="border-t border-line bg-paper-sunken">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <h2 id="home-partners" className="sr-only">{t('partners.heading')}</h2>
          <dl className="grid gap-6 sm:grid-cols-2 lg:flex lg:gap-12">
            <div>
              <dt className="text-sm text-ink-muted">{t('partners.made_by')}</dt>
              <dd className="mt-1 text-sm font-medium text-ink">{t('partners.made_by_names')}</dd>
            </div>
            <div>
              <dt className="text-sm text-ink-muted">{t('partners.funding')}</dt>
              <dd className="mt-1 space-y-1 text-sm font-medium text-ink">
                <p>{t('partners.grant_cp2bsd')}</p>
                <p>{t('partners.grant_national')}</p>
              </dd>
            </div>
          </dl>
          <NavLink href={CP2B_PAGES.partners} externalIcon={false} className="inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-terra-600 underline-offset-4 hover:underline dark:text-terra-400">
            {t('partners.cta')}
          </NavLink>
        </div>
      </section>
    </div>
  );
}

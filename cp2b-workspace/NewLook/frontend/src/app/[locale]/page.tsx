/**
 * Landing — the platform's front door at "/".
 *
 * Reading order, after MapBiomas and WaPOR: what this is and a search box,
 * four counts, the data by sector, how a number is made, what is new, who
 * stands behind it. The interactive map lives at /map, one click away; the
 * hero shows a static picture of it (MapPreviewCard) that is that click.
 *
 * Server-rendered. No number is typed into the copy: residue and sector counts
 * come from src/data/residueFactors.ts, municipality and reference counts from
 * the API (cached for an hour). When the API does not answer, the count says
 * so instead of showing a figure. Until the paper is submitted
 * (METHOD_PAGES_ENABLED off) the copy does not name the factors one by one.
 */
import { getFormatter, getLocale, getTranslations } from 'next-intl/server';
import { ArrowRight, Map as MapIcon } from 'lucide-react';
import { Link } from '@/navigation';
import ArcOrnament from '@/components/ui/ArcOrnament';
import MapPreviewCard from '@/components/home/MapPreviewCard';
import MunicipalitySearch from '@/components/home/MunicipalitySearch';
import { DETAILED_RESIDUES } from '@/data/residueFactors';
import { CATALOG_SECTORS, SECTOR_SWATCH, residuePath, residuesInSector } from '@/data/residueCatalog';
import patchNotes from '@/data/patch-notes.json';
import { METHOD_PAGES_ENABLED } from '@/lib/featureFlags';
import { countFrom, serverGetJson } from '@/lib/serverApi';

type Locale = 'pt-BR' | 'en';

const NAMES_SHOWN = 4;

async function liveCounts() {
  const [summary, references] = await Promise.all([
    serverGetJson<{ total_municipalities?: unknown }>('/statistics/summary'),
    serverGetJson<{ total?: unknown }>('/residuos/references/all?limit=1'),
  ]);
  return {
    municipalities: countFrom(summary?.total_municipalities),
    references: countFrom(references?.total),
  };
}

export default async function LandingPage() {
  const t = await getTranslations('home');
  const format = await getFormatter();
  const locale = ((await getLocale()) === 'en' ? 'en' : 'pt-BR') as Locale;
  const { municipalities, references } = await liveCounts();

  const sectors = CATALOG_SECTORS.map((sector) => ({
    sector,
    residues: residuesInSector(sector),
  })).filter((s) => s.residues.length > 0);

  const counts = [
    { key: 'municipalities', value: municipalities },
    { key: 'residues', value: DETAILED_RESIDUES.length },
    { key: 'sectors', value: sectors.length },
    { key: 'references', value: references },
  ] as const;

  const news = patchNotes.entries.slice(0, 3);

  const steps = ['data', 'factors', 'potential'] as const;

  return (
    <div className="bg-paper">
      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-line">
        <ArcOrnament className="absolute -right-40 -top-20 hidden h-[130%] w-auto text-terra-900 dark:text-ochre-300 md:block" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-center lg:gap-10 lg:px-8 lg:py-24 xl:grid-cols-[minmax(0,1fr)_minmax(0,32rem)] xl:gap-16">
          <div>
            <p className="eyebrow">{t('hero.eyebrow')}</p>
            <h1 className="mt-4 max-w-3xl text-4xl leading-[1.05] text-ink sm:text-5xl xl:text-6xl">
              {t('hero.title')}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-ink-muted sm:text-lg">
              {t('hero.lede')}
            </p>

            <div className="mt-10 grid max-w-xl gap-6">
              <MunicipalitySearch />
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/map" className="btn-primary min-h-[48px]">
                  <MapIcon className="h-4 w-4" aria-hidden="true" />
                  {t('hero.cta_map')}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <a href="#como-funciona" className="btn-secondary min-h-[48px]">
                  {t('hero.cta_method')}
                </a>
              </div>
            </div>
          </div>

          <MapPreviewCard className="w-full max-w-xl lg:max-w-none" />
        </div>
      </section>

      {/* ── Counts ──────────────────────────────────────────────────────── */}
      <section aria-labelledby="home-counts" className="border-b border-line bg-paper-raised">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 id="home-counts" className="sr-only">{t('counts.heading')}</h2>
          <dl className="grid grid-cols-2 lg:grid-cols-4">
            {counts.map(({ key, value }, index) => (
              <div
                key={key}
                className={`flex flex-col-reverse gap-1 py-6 sm:py-8 ${index % 2 === 1 ? 'border-l border-line pl-4 sm:pl-6' : 'pr-4'} ${
                  index > 0 ? 'lg:border-l lg:border-line lg:pl-6' : ''
                } ${index < 2 ? 'border-b border-line lg:border-b-0' : ''}`}
              >
                <dt className="text-sm text-ink-muted">
                  {key === 'residues' && !METHOD_PAGES_ENABLED ? t('held.counts_residues') : t(`counts.${key}`)}
                </dt>
                <dd className="font-display text-4xl text-ink tabular-nums sm:text-5xl">
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
          {(municipalities === null || references === null) && (
            <p className="border-t border-line py-3 text-xs text-ink-muted">{t('counts.unavailable_note')}</p>
          )}
        </div>
      </section>

      {/* ── Data by sector ──────────────────────────────────────────────── */}
      <section aria-labelledby="home-sectors" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <p className="eyebrow">{t('sectors.eyebrow')}</p>
        <h2 id="home-sectors" className="mt-3 text-3xl text-ink sm:text-4xl">{t('sectors.heading')}</h2>
        <p className="mt-4 max-w-2xl text-ink-muted">{METHOD_PAGES_ENABLED ? t('sectors.lede') : t('held.sectors_lede')}</p>

        <ul className="mt-10 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {sectors.map(({ sector, residues }) => {
            const rest = residues.length - NAMES_SHOWN;
            return (
              <li key={sector} className="flex flex-col bg-paper-raised">
                <span aria-hidden="true" className="block h-1" style={{ background: SECTOR_SWATCH[sector] }} />
                <div className="flex flex-1 flex-col p-5 sm:p-6">
                  <h3 className="font-display text-2xl text-ink">
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

      {/* ── How a number is made ────────────────────────────────────────── */}
      <section id="como-funciona" aria-labelledby="home-how" className="scroll-mt-20 border-y border-line bg-paper-sunken">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <p className="eyebrow">{t('how.eyebrow')}</p>
          <h2 id="home-how" className="mt-3 text-3xl text-ink sm:text-4xl">{t('how.heading')}</h2>
          <ol className="mt-10 grid gap-8 md:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step} className="border-t border-line-strong pt-5">
                <span className="font-display text-3xl text-terra-700 dark:text-terra-300 tabular-nums" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
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
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* ── What is new · how to cite ───────────────────────────────────── */}
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[3fr_2fr] lg:px-8">
        <section aria-labelledby="home-news">
          <p className="eyebrow">{t('news.eyebrow')}</p>
          <h2 id="home-news" className="mt-3 text-3xl text-ink">{t('news.heading')}</h2>
          <ul className="mt-6 divide-y divide-line border-y border-line">
            {news.map((entry) => (
              <li key={entry.version} className="py-4">
                <p className="text-xs text-ink-muted tabular-nums">
                  <time dateTime={entry.date}>{format.dateTime(new Date(entry.date), { dateStyle: 'long' })}</time>
                  {' · '}
                  {t('news.version', { version: entry.version })}
                </p>
                <p className="mt-1 font-medium text-ink">{entry.title[locale] ?? entry.title['pt-BR']}</p>
              </li>
            ))}
          </ul>
          <Link href="/patch-notes" className="mt-4 inline-flex min-h-[44px] items-center gap-2 font-medium text-terra-600 underline-offset-4 hover:underline dark:text-terra-400">
            {t('news.cta')}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </section>

        <section aria-labelledby="home-cite" className="self-start border border-line border-l-2 border-l-terra-600 bg-paper-raised p-6">
          <p className="eyebrow">{t('cite.eyebrow')}</p>
          <h2 id="home-cite" className="mt-3 text-2xl text-ink">{t('cite.heading')}</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">{t('cite.body')}</p>
          <p className="mt-4 text-xs font-medium uppercase tracking-[0.12em] text-ink">{t('cite.licence')}</p>
          <Link href="/cite" className="btn-secondary mt-6 min-h-[44px]">
            {t('cite.cta')}
          </Link>
        </section>
      </div>

      {/* ── Who stands behind it ────────────────────────────────────────── */}
      <section aria-labelledby="home-partners" className="border-t border-line bg-paper-sunken">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <h2 id="home-partners" className="sr-only">{t('partners.heading')}</h2>
          <dl className="grid gap-6 sm:grid-cols-2 lg:flex lg:gap-12">
            <div>
              <dt className="eyebrow">{t('partners.made_by')}</dt>
              <dd className="mt-2 text-sm text-ink">{t('partners.made_by_names')}</dd>
            </div>
            <div>
              <dt className="eyebrow">{t('partners.funding')}</dt>
              <dd className="mt-2 space-y-1 text-sm text-ink">
                <p>{t('partners.grant_cp2bsd')}</p>
                <p>{t('partners.grant_national')}</p>
              </dd>
            </div>
          </dl>
          <Link href="/about#parceiros" className="inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-terra-600 underline-offset-4 hover:underline dark:text-terra-400">
            {t('partners.cta')}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}

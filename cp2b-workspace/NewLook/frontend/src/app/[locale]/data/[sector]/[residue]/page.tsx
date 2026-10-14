/**
 * /data/<sector>/<residue> — a residue as a data product, after MapBiomas'
 * product pages: a breadcrumb, a data card, and six tabs (Visão geral ·
 * Método · Legenda e códigos · Acesso aos dados · Estatísticas · Validação e
 * limitações).
 *
 * Factors, BMP and confidence come from src/data/residueFactors.ts and are
 * rendered on the server; the chemical characterization and the references
 * come from the API in the browser (ResidueLiveFacts), and say so when it
 * does not answer. Every residue is generated at build time.
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getFormatter, getLocale, getTranslations } from 'next-intl/server';
import { ArrowRight } from 'lucide-react';
import { Link } from '@/navigation';
import DataCard from '@/components/data/DataCard';
import ProductTabs from '@/components/data/ProductTabs';
import LegendTables from '@/components/data/LegendTables';
import { ResidueChemistry, ResidueReferences } from '@/components/data/ResidueLiveFacts';
import { allResidueParams, findResidue, residueFDE, SECTOR_SWATCH } from '@/data/residueCatalog';
import type { FactorKey } from '@/data/residueFactors';
import { DATA_EXPORT_ENABLED } from '@/lib/featureFlags';

export function generateStaticParams() {
  return allResidueParams();
}

export const dynamicParams = false;

type Params = { params: Promise<{ sector: string; residue: string }> };

const FACTORS: FactorKey[] = ['fc', 'fcp', 'fs', 'fl'];
const PUBLIC_API = 'https://cp2b.unicamp.br/pilar2b/api/v1';

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { sector, residue: slug } = await params;
  const residue = findResidue(sector, slug);
  if (!residue) return {};
  const locale = (await getLocale()) === 'en' ? 'en' : 'pt-BR';
  const t = await getTranslations('data_catalog');
  return {
    title: `${residue.name[locale]} · ${t('catalog.title')} · PILAR-2b`,
    description: `${residue.name[locale]} — ${t('product.card_scope')}.`,
  };
}

export default async function ResidueProductPage({ params }: Params) {
  const { sector, residue: slug } = await params;
  const residue = findResidue(sector, slug);
  if (!residue) notFound();

  const t = await getTranslations('data_catalog');
  const tFactor = await getTranslations('analysis.factor_docs');
  const format = await getFormatter();
  const locale = (await getLocale()) === 'en' ? 'en' : 'pt-BR';
  const name = residue.name[locale];
  const sectorName = t(`sectors.${residue.category}`);
  const fde = residueFDE(residue);
  const pct = (v: number) => format.number(v, { style: 'percent', maximumFractionDigits: 1 });
  const link = 'font-medium text-terra-700 underline-offset-2 hover:underline dark:text-terra-300';

  const overview = (
    <div className="grid gap-10 lg:grid-cols-[2fr_1fr]">
      <section aria-labelledby="facts">
        <h2 id="facts" className="text-2xl text-ink">{t('product.facts_heading')}</h2>
        <dl className="mt-4 divide-y divide-line border-y border-line text-sm">
          {[
            [t('product.fact_sector'), (
              <span key="s" className="inline-flex items-center gap-2">
                <span aria-hidden="true" className="h-2.5 w-2.5" style={{ background: SECTOR_SWATCH[residue.category] }} />
                {sectorName}
              </span>
            )],
            [t('product.fact_code'), <span key="c" className="font-mono text-xs">{residue.code}</span>],
            [t('product.fact_bmp'), t('product.fact_bmp_value', { value: format.number(residue.bmp, { maximumFractionDigits: 2 }) })],
            [t('product.fact_fde'), (
              <span key="f">
                <span className="font-display text-2xl tabular-nums">{pct(fde)}</span>{' '}
                <span className="text-ink-muted">{t('product.fact_fde_note')}</span>
              </span>
            )],
            [t('product.fact_confidence'), t(`confidence.${residue.confidence}`)],
          ].map(([label, value], i) => (
            <div key={i} className="grid gap-1 py-3 sm:grid-cols-[14rem_1fr] sm:gap-4">
              <dt className="text-ink-muted">{label}</dt>
              <dd className="text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <div className="flex flex-col gap-3 self-start">
        <Link href="/map" className="btn-primary min-h-[44px]">
          {t('product.open_map')}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <Link href="/analysis" className="btn-secondary min-h-[44px]">
          {t('product.open_analysis')}
        </Link>
      </div>
    </div>
  );

  const method = (
    <section aria-labelledby="method" className="max-w-4xl">
      <h2 id="method" className="text-2xl text-ink">{t('product.method_heading')}</h2>
      <p className="mt-3 text-sm leading-relaxed text-ink-muted">{t('product.method_lede')}</p>
      <p className="mt-4 inline-block border border-line bg-paper-sunken px-4 py-2 font-mono text-sm text-ink">
        {t('product.method_formula')}
      </p>
      <div className="mt-6 overflow-x-auto border-y border-line">
        <table className="w-full min-w-[36rem] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-[0.1em] text-ink-muted">
              <th scope="col" className="py-2.5 pr-4 font-medium">{t('product.method_factor')}</th>
              <th scope="col" className="py-2.5 pr-4 text-right font-medium">{t('product.method_value')}</th>
              <th scope="col" className="py-2.5 font-medium">{t('product.method_why')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {FACTORS.map((f) => (
              <tr key={f}>
                <th scope="row" className="py-3 pr-4 text-left align-top font-medium text-ink">
                  {tFactor(`${f}_title`)}
                  <span className="mt-0.5 block text-xs font-normal text-ink-muted">{tFactor(`${f}_desc`)}</span>
                </th>
                <td className="py-3 pr-4 text-right align-top tabular-nums text-ink">{pct(residue[f])}</td>
                <td className="py-3 align-top text-ink">{residue.justification[f][locale]}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-line-strong">
              <th scope="row" className="py-3 pr-4 text-left font-semibold text-ink">{t('product.method_result')}</th>
              <td className="py-3 pr-4 text-right font-semibold tabular-nums text-ink">{pct(fde)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="mt-6 text-sm leading-relaxed text-ink">{t('product.method_potential')}</p>
      <Link href="/method/science-base" className={`mt-4 inline-flex min-h-[44px] items-center gap-2 ${link}`}>
        {t('product.method_more')}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </section>
  );

  const access = (
    <div className="grid max-w-5xl gap-10 lg:grid-cols-2">
      <section aria-labelledby="access-platform">
        <h2 id="access-platform" className="text-2xl text-ink">{t('product.access_platform')}</h2>
        <ul className="mt-4 divide-y divide-line border-y border-line text-sm">
          {([
            ['/map', 'access_map'],
            ['/analysis', 'access_analysis'],
            ['/method/science-base', 'access_science'],
          ] as const).map(([href, key]) => (
            <li key={href}>
              <Link href={href} className="flex min-h-[44px] items-center justify-between gap-4 py-2 text-ink hover:bg-paper-sunken">
                {t(`product.${key}`)}
                <ArrowRight className="h-4 w-4 shrink-0 text-terra-600" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="access-api">
        <h2 id="access-api" className="text-2xl text-ink">{t('product.access_api')}</h2>
        <p className="mt-3 text-sm text-ink-muted">{t('product.access_api_lede', { code: residue.code })}</p>
        <dl className="mt-4 space-y-4 text-sm">
          {([
            ['/residuos/?limit=500', 'access_api_residues'],
            ['/residuos/references/all', 'access_api_references'],
          ] as const).map(([path, key]) => (
            <div key={path}>
              <dt className="text-ink">{t(`product.${key}`)}</dt>
              <dd className="mt-1 overflow-x-auto border border-line bg-paper-sunken px-3 py-2 font-mono text-xs text-ink">
                GET {PUBLIC_API}{path}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 text-xs font-medium uppercase tracking-[0.12em] text-ink">{t('product.access_licence')}</p>
        {!DATA_EXPORT_ENABLED && <p className="mt-3 text-sm text-ink-muted">{t('product.access_paused')}</p>}
      </section>
    </div>
  );

  const statistics = (
    <section aria-labelledby="statistics">
      <h2 id="statistics" className="text-2xl text-ink">{t('product.statistics_heading')}</h2>
      <p className="mt-2 mb-6 text-sm text-ink-muted">{t('product.statistics_lede')}</p>
      <ResidueChemistry code={residue.code} />
    </section>
  );

  const validation = (
    <div className="grid max-w-5xl gap-12 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-10">
        <section aria-labelledby="confidence">
          <h2 id="confidence" className="text-2xl text-ink">{t('product.validation_heading')}</h2>
          <p className="mt-4 font-display text-3xl text-ink">{t(`confidence.${residue.confidence}`)}</p>
          <p className="mt-2 text-sm leading-relaxed text-ink">{t(`confidence_meaning.${residue.confidence}`)}</p>
          <p className="mt-2 text-xs text-ink-muted">{t('product.validation_source')}</p>
        </section>
        <section aria-labelledby="limitations">
          <h2 id="limitations" className="text-2xl text-ink">{t('product.limitations_heading')}</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink marker:text-terra-600">
            <li>{t('product.limitations.scope')}</li>
            <li>{t('product.limitations.factors')}</li>
            <li>{t('product.limitations.report')}</li>
          </ul>
          <Link href="/about#contato" className={`mt-4 inline-flex min-h-[44px] items-center gap-2 ${link}`}>
            {t('product.contact_cta')}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </section>
      </div>
      <section aria-labelledby="references">
        <h2 id="references" className="text-2xl text-ink">{t('product.references_heading')}</h2>
        <div className="mt-4">
          <ResidueReferences code={residue.code} />
        </div>
      </section>
    </div>
  );

  return (
    <div className="bg-paper">
      <header className="border-b border-line">
        <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 sm:pt-14 lg:px-8">
          <nav aria-label={t('product.breadcrumb')} className="text-sm text-ink-muted">
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <li><Link href="/data" className="underline-offset-2 hover:text-ink hover:underline">{t('catalog.title')}</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link href={`/data/${residue.category}`} className="underline-offset-2 hover:text-ink hover:underline">{sectorName}</Link></li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-ink">{name}</li>
            </ol>
          </nav>
          <h1 className="mt-4 text-4xl text-ink sm:text-5xl">{name}</h1>
          <DataCard
            className="mt-6"
            label={t('product.card_label')}
            parts={[name, t('product.card_scope'), t('product.card_place'), t('product.card_source')]}
          />
          <div className="mt-8">
            <ProductTabs
              label={t('product.tabs_label')}
              tabs={[
                { id: 'visao-geral', label: t('product.tabs.overview'), panel: overview },
                { id: 'metodo', label: t('product.tabs.method'), panel: method },
                { id: 'legenda', label: t('product.tabs.legend'), panel: <LegendTables highlight={residue.code} /> },
                { id: 'acesso', label: t('product.tabs.access'), panel: access },
                { id: 'estatisticas', label: t('product.tabs.statistics'), panel: statistics },
                { id: 'validacao', label: t('product.tabs.validation'), panel: validation },
              ]}
            />
          </div>
        </div>
      </header>
      <div className="h-16" />
    </div>
  );
}

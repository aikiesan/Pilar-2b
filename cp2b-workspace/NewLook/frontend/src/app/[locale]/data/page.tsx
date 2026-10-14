/**
 * /data — the data catalogue: every residue, grouped by sector, each linking
 * to its product page. Server-rendered from src/data/residueFactors.ts.
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ArrowRight } from 'lucide-react';
import { Link } from '@/navigation';
import ResidueTable from '@/components/data/ResidueTable';
import { CATALOG_SECTORS, SECTOR_SWATCH, residuesInSector } from '@/data/residueCatalog';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('data_catalog.catalog');
  return { title: `${t('title')} · PILAR-2b`, description: t('lede') };
}

export default async function DataCatalogPage() {
  const t = await getTranslations('data_catalog');
  const sectors = CATALOG_SECTORS.filter((s) => residuesInSector(s).length > 0);

  return (
    <div className="bg-paper">
      <header className="border-b border-line">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <p className="eyebrow">{t('catalog.eyebrow')}</p>
          <h1 className="mt-3 text-4xl text-ink sm:text-5xl">{t('catalog.title')}</h1>
          <p className="mt-4 max-w-2xl text-ink-muted">{t('catalog.lede')}</p>
          <nav aria-label={t('catalog.sectors_nav')} className="mt-8 flex flex-wrap gap-2">
            {sectors.map((s) => (
              <a
                key={s}
                href={`#${s}`}
                className="inline-flex min-h-[40px] items-center gap-2 border border-line bg-paper-raised px-3 text-sm text-ink hover:border-line-strong"
              >
                <span aria-hidden="true" className="h-2.5 w-2.5" style={{ background: SECTOR_SWATCH[s] }} />
                {t(`sectors.${s}`)}
              </a>
            ))}
            <Link
              href="/data/legend"
              className="inline-flex min-h-[40px] items-center gap-2 px-3 text-sm font-medium text-terra-700 underline-offset-2 hover:underline dark:text-terra-300"
            >
              {t('catalog.legend_cta')}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-14 px-4 py-12 sm:px-6 lg:px-8">
        {sectors.map((s) => (
          <section key={s} id={s} aria-labelledby={`sector-${s}`} className="scroll-mt-24">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id={`sector-${s}`} className="flex items-center gap-3 text-3xl text-ink">
                <span aria-hidden="true" className="h-3 w-3" style={{ background: SECTOR_SWATCH[s] }} />
                {t(`sectors.${s}`)}
              </h2>
              <p className="flex items-baseline gap-4 text-sm text-ink-muted">
                {t('catalog.residue_count', { count: residuesInSector(s).length })}
                <Link
                  href={`/data/${s}`}
                  className="inline-flex min-h-[40px] items-center gap-1 font-medium text-terra-700 underline-offset-2 hover:underline dark:text-terra-300"
                >
                  {t('catalog.see_sector')}
                  <span className="sr-only">: {t(`sectors.${s}`)}</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </p>
            </div>
            <div className="mt-4">
              <ResidueTable sector={s} />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

/**
 * /data/legend — Legenda e códigos: residue codes, the map's colour ramps and
 * their reference limits, and the files to take them into a GIS.
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/navigation';
import LegendTables from '@/components/data/LegendTables';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('data_catalog.legend');
  return { title: `${t('title')} · PILAR-2b`, description: t('lede') };
}

export default async function LegendPage() {
  const t = await getTranslations('data_catalog');
  return (
    <div className="bg-paper">
      <header className="border-b border-line">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <nav aria-label={t('product.breadcrumb')} className="text-sm text-ink-muted">
            <Link href="/data" className="underline-offset-2 hover:text-ink hover:underline">{t('catalog.title')}</Link>
            <span aria-hidden="true" className="mx-2">/</span>
            <span aria-current="page">{t('legend.title')}</span>
          </nav>
          <h1 className="mt-4 text-4xl text-ink sm:text-5xl">{t('legend.title')}</h1>
          <p className="mt-4 max-w-2xl text-ink-muted">{t('legend.lede')}</p>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <LegendTables />
      </div>
    </div>
  );
}

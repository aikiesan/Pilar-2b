/**
 * /data/legend — Legenda e códigos: residue codes, the map's colour ramps and
 * their reference limits, and the files to take them into a GIS.
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/navigation';
import Breadcrumb from '@/components/ui/Breadcrumb';
import { navCrumbs } from '@/lib/breadcrumbTrail';
import LegendTables from '@/components/data/LegendTables';
import { HeaderLeaves } from '@/components/ui/ArcOrnament'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('data_catalog.legend');
  return { title: `${t('title')} · PILAR-2b`, description: t('lede') };
}

export default async function LegendPage() {
  const t = await getTranslations('data_catalog');
  const tNav = await getTranslations('common.nav');
  return (
    <div className="bg-paper">
      <header className="relative overflow-hidden border-b border-line">
        <HeaderLeaves />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <Breadcrumb items={navCrumbs('/data/legend', (key) => tNav(key))} />
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

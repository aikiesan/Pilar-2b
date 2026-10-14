/**
 * /data/<sector> — one sector's residues. The four sectors are generated at
 * build time; any other segment is a 404.
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/navigation';
import Breadcrumb from '@/components/ui/Breadcrumb';
import { navCrumbs } from '@/lib/breadcrumbTrail';
import ResidueTable from '@/components/data/ResidueTable';
import { CATALOG_SECTORS, SECTOR_SWATCH, isCatalogSector, residuesInSector } from '@/data/residueCatalog';
import { METHOD_PAGES_ENABLED } from '@/lib/featureFlags';

export function generateStaticParams() {
  return CATALOG_SECTORS.filter((s) => residuesInSector(s).length > 0).map((sector) => ({ sector }));
}

export const dynamicParams = false;

type Params = { params: Promise<{ sector: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { sector } = await params;
  if (!isCatalogSector(sector)) return {};
  const t = await getTranslations('data_catalog');
  const name = t(`sectors.${sector}`);
  const description = METHOD_PAGES_ENABLED ? t('sector_page.lede', { sector: name }) : t('held.sector_lede', { sector: name });
  return { title: `${name} · ${t('catalog.title')} · PILAR-2b`, description };
}

export default async function DataSectorPage({ params }: Params) {
  const { sector } = await params;
  if (!isCatalogSector(sector)) notFound();
  const t = await getTranslations('data_catalog');
  const name = t(`sectors.${sector}`);
  const tNav = await getTranslations('common.nav');

  return (
    <div className="bg-paper">
      <header className="border-b border-line">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <Breadcrumb items={navCrumbs(`/data/${sector}`, (key) => tNav(key), [{ label: name }])} />
          <h1 className="mt-4 flex items-center gap-4 text-4xl text-ink sm:text-5xl">
            <span aria-hidden="true" className="h-4 w-4 shrink-0" style={{ background: SECTOR_SWATCH[sector] }} />
            {name}
          </h1>
          <p className="mt-4 max-w-2xl text-ink-muted">{METHOD_PAGES_ENABLED
              ? t('sector_page.lede', { sector: name.toLowerCase() })
              : t('held.sector_lede', { sector: name.toLowerCase() })}</p>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <ResidueTable sector={sector} />
      </div>
    </div>
  );
}

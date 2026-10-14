/**
 * /method/scenarios — the two scenarios the map offers (Real and Ideal), what
 * separates them, and why the older band scenarios left the map. Definitions
 * from src/data/scenarioFactors.ts, which the map itself reads.
 */
import type { Metadata } from 'next';
import { getFormatter, getTranslations } from 'next-intl/server';
import { ArrowRight } from 'lucide-react';
import { Link } from '@/navigation';
import MethodShell from '@/components/method/MethodShell';
import { CH4_FRACTION_OF_BIOGAS, MAP_SCENARIOS } from '@/data/scenarioFactors';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('method.scenarios');
  return { title: `${t('title')} · PILAR-2b`, description: t('lede') };
}

export default async function MethodScenariosPage() {
  const t = await getTranslations('method.scenarios');
  const tMap = await getTranslations('Map');
  const format = await getFormatter();

  return (
    <MethodShell current="/method/scenarios" title={t('title')} lede={t('lede')}>
      <ul className="grid gap-px border border-line bg-line md:grid-cols-2">
        {MAP_SCENARIOS.map(({ key, color }) => (
          <li key={key} className="bg-paper-raised">
            <span aria-hidden="true" className="block h-1" style={{ background: color }} />
            <div className="p-5 sm:p-6">
              <h2 className="font-display text-2xl text-ink">{t(`${key as 'real' | 'ideal'}_title`)}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{t(`${key as 'real' | 'ideal'}_body`)}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-4 max-w-3xl text-sm text-ink-muted">{t('definitions')}</p>
      <p className="mt-2 max-w-3xl text-sm text-ink-muted">{tMap('scenario_served_note')}</p>

      <section aria-labelledby="scenarios-ch4" className="mt-14">
        <h2 id="scenarios-ch4" className="text-2xl text-ink sm:text-3xl">{t('ch4_heading')}</h2>
        <p className="mt-3 max-w-3xl text-ink">
          {t('ch4_body', { share: format.number(CH4_FRACTION_OF_BIOGAS, { style: 'percent', maximumFractionDigits: 1 }) })}
        </p>
      </section>

      <section aria-labelledby="scenarios-retired" className="mt-14">
        <h2 id="scenarios-retired" className="text-2xl text-ink sm:text-3xl">{t('retired_heading')}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-muted">{t('retired_body')}</p>
      </section>

      <Link href="/map" className="btn-primary mt-10 min-h-[44px]">
        {t('map_cta')}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </MethodShell>
  );
}

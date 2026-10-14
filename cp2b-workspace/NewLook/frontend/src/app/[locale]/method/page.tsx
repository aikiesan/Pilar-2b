/**
 * /method — Visão geral: how a figure is made, in three steps and two
 * equations, and the way into the rest of the Método section.
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ArrowRight } from 'lucide-react';
import { Link } from '@/navigation';
import MethodShell from '@/components/method/MethodShell';
import { NAV_GROUPS } from '@/components/layout/siteNav';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('method.overview');
  return { title: `${t('title')} · PILAR-2b`, description: t('lede') };
}

const STEPS = ['data', 'factors', 'potential'] as const;
const METHOD = NAV_GROUPS.find((group) => group.id === 'method')!;

export default async function MethodOverviewPage() {
  const t = await getTranslations('method.overview');
  const tHow = await getTranslations('home.how');
  const tNav = await getTranslations('common');

  return (
    <MethodShell current="/method" title={t('title')} lede={t('lede')}>
      <section aria-labelledby="method-steps">
        <h2 id="method-steps" className="text-2xl text-ink sm:text-3xl">{t('steps_heading')}</h2>
        <ol className="mt-6 grid gap-px border border-line bg-line md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step} className="bg-paper-raised p-5 sm:p-6">
              <span className="font-display text-3xl text-terra-600 dark:text-terra-400" aria-hidden="true">{index + 1}</span>
              <h3 className="mt-2 font-display text-xl text-ink">{tHow(`steps.${step}.title`)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{tHow(`steps.${step}.body`)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="method-formulas" className="mt-14">
        <h2 id="method-formulas" className="text-2xl text-ink sm:text-3xl">{t('formulas_heading')}</h2>
        <dl className="mt-6 space-y-6">
          {(['fde', 'potential'] as const).map((key) => (
            <div key={key} className="border-l-2 border-terra-600 pl-4 dark:border-terra-400">
              <dt>
                <code className="inline-block border border-line bg-paper-sunken px-3 py-2 font-mono text-sm text-ink">
                  {t(`${key}_formula`)}
                </code>
              </dt>
              <dd className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted">{t(`${key}_formula_note`)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="method-sections" className="mt-14">
        <h2 id="method-sections" className="text-2xl text-ink sm:text-3xl">{t('sections_heading')}</h2>
        <ul className="mt-6 grid gap-px border border-line bg-line sm:grid-cols-2 sm:[&>li:last-child:nth-child(odd)]:col-span-2">
          {METHOD.items
            .filter((item) => item.href !== '/method')
            .map(({ href, labelKey, descriptionKey, icon: Icon }) => (
              <li key={href} className="bg-paper-raised">
                <Link href={href} className="group flex h-full items-start gap-3 p-5 hover:bg-paper-sunken">
                  <Icon className="mt-1 h-5 w-5 shrink-0 text-ink-muted" aria-hidden="true" />
                  <span>
                    <span className="flex items-center gap-2 font-display text-xl text-ink group-hover:text-terra-700 dark:group-hover:text-terra-300">
                      {tNav(`nav.${labelKey}`)}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </span>
                    {descriptionKey && (
                      <span className="mt-1 block text-sm text-ink-muted">{tNav(`nav_descriptions.${descriptionKey}`)}</span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
        </ul>
      </section>

      <p className="mt-14 border-t border-line pt-6 text-sm text-ink-muted">
        {t('licence')}{' '}
        <Link href="/cite" className="font-medium text-terra-700 underline underline-offset-2 dark:text-terra-300">
          {t('cite_cta')}
        </Link>
      </p>
    </MethodShell>
  );
}

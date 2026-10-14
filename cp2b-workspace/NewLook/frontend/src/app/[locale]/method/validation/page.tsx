/**
 * /method/validation — what backs each factor: the confidence levels with the
 * residues in each (counted from src/data/residueFactors.ts), where the
 * factors come from, the limitations, and how to report an error.
 */
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { ArrowRight } from 'lucide-react';
import { Link } from '@/navigation';
import MethodShell from '@/components/method/MethodShell';
import { requireMethodPages } from '@/components/method/requireMethodPages';
import { residuePath } from '@/data/residueCatalog';
import { DETAILED_RESIDUES } from '@/data/residueFactors';

export async function generateMetadata(): Promise<Metadata> {
  requireMethodPages();
  const t = await getTranslations('method.validation');
  return { title: `${t('title')} · PILAR-2b`, description: t('lede') };
}

const LEVELS = ['HIGH', 'MEDIUM', 'LOW'] as const;
const PROCESS = ['data', 'competition', 'collection', 'conservative'] as const;
const LIMITATIONS = ['scope', 'factors'] as const;

export default async function MethodValidationPage() {
  requireMethodPages();
  const t = await getTranslations('method.validation');
  const tData = await getTranslations('data_catalog');
  const locale = (await getLocale()) === 'en' ? 'en' : 'pt-BR';

  return (
    <MethodShell current="/method/validation" title={t('title')} lede={t('lede')}>
      <section aria-labelledby="validation-levels">
        <h2 id="validation-levels" className="text-2xl text-ink sm:text-3xl">{t('levels_heading')}</h2>
        <ul className="mt-6 grid gap-px border border-line bg-line lg:grid-cols-3">
          {LEVELS.map((level) => {
            const residues = DETAILED_RESIDUES.filter((r) => r.confidence === level).sort((a, b) =>
              a.name[locale].localeCompare(b.name[locale], locale)
            );
            return (
              <li key={level} className="flex flex-col bg-paper-raised p-5">
                <h3 className="font-display text-2xl text-ink">{tData(`confidence.${level}`)}</h3>
                <p className="text-sm text-ink-muted">{t('residue_count', { count: residues.length })}</p>
                <p className="mt-3 text-sm leading-relaxed text-ink">{tData(`confidence_meaning.${level}`)}</p>
                <ul className="mt-4 space-y-1 border-t border-line pt-3 text-sm">
                  {residues.map((r) => (
                    <li key={r.code}>
                      <Link href={residuePath(r)} className="text-terra-700 underline-offset-2 hover:underline dark:text-terra-300">
                        {r.name[locale]}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-ink-muted">{tData('product.validation_source')}</p>
      </section>

      <section aria-labelledby="validation-process" className="mt-14">
        <h2 id="validation-process" className="text-2xl text-ink sm:text-3xl">{t('process_heading')}</h2>
        <ol className="mt-6 max-w-3xl space-y-4">
          {PROCESS.map((step, index) => (
            <li key={step} className="grid grid-cols-[2rem_1fr] gap-2">
              <span aria-hidden="true" className="font-display text-xl text-terra-600 dark:text-terra-400">{index + 1}</span>
              <p className="text-sm leading-relaxed text-ink">{t(`process.${step}`)}</p>
            </li>
          ))}
        </ol>
        <p className="mt-6 max-w-3xl border border-line border-l-2 border-l-ochre-700 bg-paper-raised px-4 py-3 text-sm text-ink">
          {t('beta')}{' '}
          <Link href="/patch-notes" className="font-medium text-terra-700 underline underline-offset-2 dark:text-terra-300">
            {t('patch_notes_cta')}
          </Link>
        </p>
      </section>

      <section aria-labelledby="validation-limitations" className="mt-14">
        <h2 id="validation-limitations" className="text-2xl text-ink sm:text-3xl">{t('limitations_heading')}</h2>
        <ul className="mt-4 max-w-3xl list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink">
          {LIMITATIONS.map((key) => (
            <li key={key}>{tData(`product.limitations.${key}`)}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="validation-report" className="mt-14 border-t border-line pt-8">
        <h2 id="validation-report" className="text-2xl text-ink sm:text-3xl">{t('report_heading')}</h2>
        <p className="mt-3 max-w-2xl text-ink-muted">{t('report_body')}</p>
        <Link href="/about#contato" className="btn-secondary mt-5 min-h-[44px]">
          {tData('product.contact_cta')}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </section>
    </MethodShell>
  );
}

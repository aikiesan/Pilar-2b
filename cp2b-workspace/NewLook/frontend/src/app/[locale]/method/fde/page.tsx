/**
 * /method/fde — the four availability factors: what each means, the values of
 * every residue (from src/data/residueFactors.ts) and the confidence levels.
 */
import type { Metadata } from 'next';
import { getFormatter, getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/navigation';
import MethodShell from '@/components/method/MethodShell';
import { CATALOG_SECTORS, SECTOR_SWATCH, residueFDE, residuePath } from '@/data/residueCatalog';
import { DETAILED_RESIDUES } from '@/data/residueFactors';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('method.fde');
  return { title: `${t('title')} · PILAR-2b`, description: t('lede') };
}

const FACTORS = ['fc', 'fcp', 'fs', 'fl'] as const;
const LEVELS = ['HIGH', 'MEDIUM', 'LOW'] as const;
const th = 'py-2.5 pr-4 text-xs font-medium uppercase tracking-[0.1em] text-ink-muted';

export default async function MethodFdePage() {
  const t = await getTranslations('method.fde');
  const tFactor = await getTranslations('analysis.factor_docs');
  const tData = await getTranslations('data_catalog');
  const format = await getFormatter();
  const locale = (await getLocale()) === 'en' ? 'en' : 'pt-BR';

  const pct = (v: number) => format.number(v, { style: 'percent', maximumFractionDigits: 1 });
  const order = (s: string) => CATALOG_SECTORS.indexOf(s as (typeof CATALOG_SECTORS)[number]);
  const residues = [...DETAILED_RESIDUES].sort(
    (a, b) => order(a.category) - order(b.category) || a.name[locale].localeCompare(b.name[locale], locale)
  );
  // Factor abbreviations, as in the formula: FC, FCp, FS, FL.
  const abbr = (f: (typeof FACTORS)[number]) => (f === 'fcp' ? 'FCp' : f.toUpperCase());

  return (
    <MethodShell current="/method/fde" title={t('title')} lede={t('lede')}>
      <section aria-labelledby="fde-factors">
        <h2 id="fde-factors" className="text-2xl text-ink sm:text-3xl">{t('factors_heading')}</h2>
        <code className="mt-4 inline-block border border-line bg-paper-sunken px-3 py-2 font-mono text-sm text-ink">
          {tData('product.method_formula')}
        </code>
        <dl className="mt-6 grid gap-px border border-line bg-line md:grid-cols-2">
          {FACTORS.map((f) => (
            <div key={f} className="bg-paper-raised p-5">
              <dt className="font-display text-xl text-ink">{tFactor(`${f}_title`)}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-ink">{tFactor(`${f}_desc`)}</dd>
              <dd className="mt-2 text-sm leading-relaxed text-ink-muted">
                <span className="font-medium">{t('context_label')}:</span> {tFactor(`${f}_context`)}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 max-w-3xl text-sm text-ink-muted">{t('competition_note')}</p>
      </section>

      <section aria-labelledby="fde-table" className="mt-14">
        <h2 id="fde-table" className="text-2xl text-ink sm:text-3xl">{t('table_heading')}</h2>

        {/* Phones: one stacked entry per residue. */}
        <ul className="mt-6 divide-y divide-line border-y border-line md:hidden">
          {residues.map((r) => (
            <li key={r.code} className="py-3">
              <Link href={residuePath(r)} className="font-medium text-terra-700 underline-offset-2 hover:underline dark:text-terra-300">
                {r.name[locale]}
              </Link>
              <p className="mt-0.5 flex items-center gap-2 text-xs text-ink-muted">
                <span aria-hidden="true" className="h-2 w-2" style={{ background: SECTOR_SWATCH[r.category] }} />
                {tData(`sectors.${r.category}`)} · {tData(`confidence.${r.confidence}`)}
              </p>
              <dl className="mt-2 grid grid-cols-5 gap-1 text-xs">
                {FACTORS.map((f) => (
                  <div key={f}>
                    <dt className="text-ink-muted">{abbr(f)}</dt>
                    <dd className="text-sm tabular-nums text-ink">{pct(r[f])}</dd>
                  </div>
                ))}
                <div>
                  <dt className="font-medium text-ink-muted">FDE</dt>
                  <dd className="text-sm font-medium tabular-nums text-ink">{pct(residueFDE(r))}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>

        <div className="mt-6 hidden overflow-x-auto border-y border-line md:block">
          <table className="w-full text-sm">
            <caption className="sr-only">{t('table_caption')}</caption>
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className={`${th} text-left`}>{t('col_residue')}</th>
                <th scope="col" className={`${th} text-left`}>{t('col_sector')}</th>
                {FACTORS.map((f) => (
                  <th key={f} scope="col" className={`${th} text-right`}>
                    <abbr title={tFactor(`${f}_title`)} className="no-underline">{abbr(f)}</abbr>
                  </th>
                ))}
                <th scope="col" className={`${th} text-right`}>FDE</th>
                <th scope="col" className={`${th} text-left`}>{t('col_confidence')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {residues.map((r) => (
                <tr key={r.code} className="hover:bg-paper-sunken">
                  <th scope="row" className="py-2.5 pr-4 text-left font-medium">
                    <Link href={residuePath(r)} className="text-terra-700 underline-offset-2 hover:underline dark:text-terra-300">
                      {r.name[locale]}
                    </Link>
                  </th>
                  <td className="py-2.5 pr-4 text-ink">
                    <span className="inline-flex items-center gap-2">
                      <span aria-hidden="true" className="h-2.5 w-2.5" style={{ background: SECTOR_SWATCH[r.category] }} />
                      {tData(`sectors.${r.category}`)}
                    </span>
                  </td>
                  {FACTORS.map((f) => (
                    <td key={f} className="py-2.5 pr-4 text-right tabular-nums text-ink">{pct(r[f])}</td>
                  ))}
                  <td className="py-2.5 pr-4 text-right font-medium tabular-nums text-ink">{pct(residueFDE(r))}</td>
                  <td className="py-2.5 text-ink">{tData(`confidence.${r.confidence}`)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="fde-bands" className="mt-14">
        <h2 id="fde-bands" className="text-2xl text-ink sm:text-3xl">{t('bands_heading')}</h2>
        <p className="mt-2 max-w-3xl text-sm text-ink-muted">{t('bands_lede')}</p>
        <dl className="mt-6 divide-y divide-line border-y border-line">
          {LEVELS.map((level) => (
            <div key={level} className="grid gap-1 py-3 sm:grid-cols-[8rem_1fr] sm:gap-4">
              <dt className="font-medium text-ink">{tData(`confidence.${level}`)}</dt>
              <dd className="text-sm leading-relaxed text-ink-muted">{tData(`confidence_meaning.${level}`)}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-ink-muted">{tData('product.validation_source')}</p>
      </section>
    </MethodShell>
  );
}

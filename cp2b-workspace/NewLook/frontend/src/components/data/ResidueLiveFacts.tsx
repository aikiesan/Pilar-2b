'use client';

/**
 * The parts of a residue's product page that come from the API rather than
 * from the files in src/data: its chemical characterization (Estatísticas) and
 * the papers filed under it (Validação e limitações).
 *
 * Both say plainly when the API does not answer; neither shows a number it did
 * not receive.
 */
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ExternalLink, Loader2 } from 'lucide-react';
import { getReferencesForResidue, getResidues } from '@/services/scientificApi';
import { queryKeys } from '@/lib/queryClient';
import { useFormat } from '@/hooks/useFormat';
import type { ResidueRecord } from '@/types/scientific';

const ONE_HOUR = 60 * 60 * 1000;

function Pending() {
  const t = useTranslations('data_catalog.live');
  return (
    <p role="status" className="flex items-center gap-2 text-sm text-ink-muted">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      {t('loading')}
    </p>
  );
}

function Unavailable() {
  const t = useTranslations('data_catalog.live');
  return (
    <p className="border border-line border-l-2 border-l-terra-900 bg-paper-raised px-4 py-3 text-sm text-ink">
      {t('unavailable')}
    </p>
  );
}

type Range = { mean?: number | null; min?: number | null; max?: number | null };

export function ResidueChemistry({ code }: { code: string }) {
  const t = useTranslations('data_catalog.live');
  const format = useFormat();
  const { data, isPending, isError } = useQuery({
    queryKey: queryKeys.residues.list(),
    queryFn: getResidues,
    staleTime: ONE_HOUR,
    retry: 1,
  });

  if (isPending) return <Pending />;
  if (isError) return <Unavailable />;
  const record: ResidueRecord | undefined = data.find((r) => r.codigo === code);
  if (!record) return <p className="text-sm text-ink-muted">{t('not_in_database')}</p>;

  const num = (v: number | null | undefined, digits = 2) =>
    typeof v === 'number' ? format.number(v, { decimals: digits }) : null;
  const range = ({ mean, min, max }: Range, digits = 2) => {
    const m = num(mean, digits);
    if (!m) return null;
    const lo = num(min, digits);
    const hi = num(max, digits);
    return lo && hi ? t('mean_range', { mean: m, min: lo, max: hi }) : m;
  };

  const rows = [
    { key: 'bmp', value: range({ mean: record.bmp_medio, min: record.bmp_min, max: record.bmp_max }, 0), unit: t('units.bmp') },
    { key: 'ts', value: range({ mean: record.ts_medio, min: record.ts_min, max: record.ts_max }, 1), unit: t('units.ts') },
    { key: 'vs', value: range({ mean: record.vs_medio, min: record.vs_min, max: record.vs_max }, 1), unit: t('units.vs') },
    { key: 'cn', value: num(record.chemical_cn_ratio, 1), unit: '' },
    { key: 'ch4', value: num(record.chemical_ch4_content, 1), unit: t('units.ch4') },
    { key: 'ph', value: num(record.ph, 1), unit: '' },
    { key: 'studies', value: num(record.bmp_n_studies, 0), unit: '' },
  ] as const;

  return (
    <div>
      <table className="w-full max-w-2xl text-sm">
        <caption className="sr-only">{t('chemistry_caption')}</caption>
        <tbody className="divide-y divide-line border-y border-line">
          {rows.map(({ key, value, unit }) => (
            <tr key={key}>
              <th scope="row" className="py-2.5 pr-4 text-left font-normal text-ink-muted">{t(`rows.${key}`)}</th>
              <td className="py-2.5 text-right text-ink tabular-nums">
                {value ? `${value}${unit ? ` ${unit}` : ''}` : <span className="text-ink-muted">{t('not_reported')}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-ink-muted">{t('chemistry_source')}</p>
    </div>
  );
}

export function ResidueReferences({ code }: { code: string }) {
  const t = useTranslations('data_catalog.live');
  const { data, isPending, isError } = useQuery({
    queryKey: queryKeys.residues.references(code),
    queryFn: () => getReferencesForResidue(code),
    staleTime: ONE_HOUR,
    retry: 1,
  });

  if (isPending) return <Pending />;
  if (isError) return <Unavailable />;
  if (data.length === 0) return <p className="text-sm text-ink-muted">{t('no_references')}</p>;

  return (
    <div>
      <p className="text-sm text-ink-muted">{t('reference_count', { count: data.length })}</p>
      <ol className="mt-4 divide-y divide-line border-y border-line">
        {data.map((ref) => (
          <li key={ref.id} className="py-3 text-sm">
            <p className="text-ink">{ref.title}</p>
            <p className="mt-1 text-xs text-ink-muted">
              {[ref.authors, ref.journal, ref.year].filter(Boolean).join(' · ')}
              {ref.validated && (
                <span className="ml-2 border border-current px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-terra-700 dark:text-terra-300">
                  {t('validated')}
                </span>
              )}
            </p>
            {(ref.doi || ref.url) && (
              <a
                href={ref.doi ? `https://doi.org/${ref.doi}` : ref.url!}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex min-h-[32px] items-center gap-1 text-xs font-medium text-terra-600 underline-offset-2 hover:underline dark:text-terra-400"
              >
                {ref.doi ? `doi:${ref.doi}` : t('open_source')}
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
                <span className="sr-only">{t('new_tab')}</span>
              </a>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

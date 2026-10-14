/**
 * One sector's residues as a table: name (linking to its product page), code,
 * BMP, FDE and confidence. Server component; every value comes from
 * src/data/residueFactors.ts.
 */
import { getFormatter, getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/navigation';
import { residueFDE, residuePath, residuesInSector, type CatalogSector } from '@/data/residueCatalog';

export default async function ResidueTable({ sector }: { sector: CatalogSector }) {
  const t = await getTranslations('data_catalog');
  const format = await getFormatter();
  const locale = (await getLocale()) === 'en' ? 'en' : 'pt-BR';
  const residues = residuesInSector(sector);
  const bmp = (v: number) => format.number(v, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fde = (v: number) => format.number(v, { style: 'percent', maximumFractionDigits: 1 });

  return (
    <>
    {/* Phones: one stacked entry per residue, every figure in view. */}
    <ul className="divide-y divide-line border-y border-line sm:hidden">
      {residues.map((r) => (
        <li key={r.code} className="py-3">
          <Link href={residuePath(r)} className="font-medium text-terra-700 underline-offset-2 hover:underline dark:text-terra-300">
            {r.name[locale]}
          </Link>
          <dl className="mt-1.5 grid grid-cols-3 gap-2 text-xs">
            <div>
              <dt className="text-ink-muted">{t('table.bmp')}</dt>
              <dd className="text-sm text-ink tabular-nums">{bmp(r.bmp)}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">{t('table.fde')}</dt>
              <dd className="text-sm text-ink tabular-nums">{fde(residueFDE(r))}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">{t('table.confidence')}</dt>
              <dd className="text-sm text-ink">{t(`confidence.${r.confidence}`)}</dd>
            </div>
          </dl>
          <p className="mt-1.5 break-all font-mono text-[11px] text-ink-muted">{r.code}</p>
        </li>
      ))}
    </ul>
    <div className="hidden overflow-x-auto border-y border-line sm:block">
      {/* Fixed layout with set widths, so the four sector tables line up. */}
      <table className="w-full min-w-[40rem] table-fixed text-sm">
        <colgroup>
          <col className="w-[34%]" />
          <col className="w-[30%]" />
          <col className="w-[14%]" />
          <col className="w-[9%]" />
          <col className="w-[13%]" />
        </colgroup>
        <caption className="sr-only">{t('table.caption', { sector: t(`sectors.${sector}`) })}</caption>
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-[0.1em] text-ink-muted">
            <th scope="col" className="py-2.5 pr-4 font-medium">{t('table.residue')}</th>
            <th scope="col" className="py-2.5 pr-4 font-medium">{t('table.code')}</th>
            <th scope="col" className="py-2.5 pr-4 text-right font-medium">{t('table.bmp')}</th>
            <th scope="col" className="py-2.5 pr-4 text-right font-medium">{t('table.fde')}</th>
            <th scope="col" className="py-2.5 font-medium">{t('table.confidence')}</th>
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
              <td className="break-all py-2.5 pr-4 font-mono text-xs text-ink-muted">{r.code}</td>
              <td className="py-2.5 pr-4 text-right text-ink tabular-nums">{bmp(r.bmp)}</td>
              <td className="py-2.5 pr-4 text-right text-ink tabular-nums">
                {fde(residueFDE(r))}
              </td>
              <td className="py-2.5 text-ink">{t(`confidence.${r.confidence}`)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </>
  );
}

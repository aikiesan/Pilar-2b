/**
 * Legend and codes: the residue code table, the map's colour ramps with their
 * reference limits, and the files to take them into a GIS. Shared by
 * /data/legend and the "Legenda e códigos" tab of each product page (which
 * passes `highlight` to mark its own row and shows only that row).
 *
 * Every value comes from the same modules the map paints with, so the table
 * cannot drift from the map.
 */
import { getFormatter, getTranslations } from 'next-intl/server';
import { Download } from 'lucide-react';
import { DETAILED_RESIDUES } from '@/data/residueFactors';
import { CATALOG_SECTORS, SECTOR_SWATCH } from '@/data/residueCatalog';
import { METRIC_SPECS } from '@/lib/mapMetrics';
import { LEGEND_FILES, LEGEND_METRICS } from '@/lib/legendExports';
import { withBasePath } from '@/lib/basePath';

const th = 'py-2.5 pr-4 text-left text-xs font-medium uppercase tracking-[0.1em] text-ink-muted';

function Swatch({ hex }: { hex: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden="true" className="h-4 w-6 border border-line" style={{ background: hex }} />
      <span className="font-mono text-xs text-ink-muted">{hex}</span>
    </span>
  );
}

export default async function LegendTables({
  highlight,
  headingLevel = 2,
}: {
  /** A residue code: show only its row in the code table. */
  highlight?: string;
  headingLevel?: 2 | 3;
}) {
  const t = await getTranslations('data_catalog');
  const tMetric = await getTranslations('Map.metrics');
  const format = await getFormatter();
  const H = `h${headingLevel}` as const;

  const order = (s: string) => CATALOG_SECTORS.indexOf(s as (typeof CATALOG_SECTORS)[number]);
  const residues = [...DETAILED_RESIDUES]
    .filter((r) => !highlight || r.code === highlight)
    .sort((a, b) => order(a.category) - order(b.category) || a.code.localeCompare(b.code));

  const n = (v: number) => format.number(v, { maximumFractionDigits: 0 });

  return (
    <div className="space-y-12">
      <section aria-labelledby="legend-codes">
        <H id="legend-codes" className="text-2xl text-ink">
          {highlight ? t('legend.this_residue') : t('legend.codes_heading')}
        </H>
        <div className="mt-4 overflow-x-auto border-y border-line">
          <table className="w-full min-w-[40rem] text-sm">
            <caption className="sr-only">{t('legend.codes_caption')}</caption>
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className={th}>{t('legend.col_code')}</th>
                <th scope="col" className={th}>{t('legend.col_name_pt')}</th>
                <th scope="col" className={th}>{t('legend.col_name_en')}</th>
                <th scope="col" className={th}>{t('legend.col_sector')}</th>
                <th scope="col" className={th}>{t('legend.col_colour')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {residues.map((r) => (
                <tr key={r.code}>
                  <th scope="row" className="py-2.5 pr-4 text-left font-mono text-xs font-normal text-ink">{r.code}</th>
                  <td className="py-2.5 pr-4 text-ink" lang="pt-BR">{r.name['pt-BR']}</td>
                  <td className="py-2.5 pr-4 text-ink" lang="en">{r.name.en}</td>
                  <td className="py-2.5 pr-4 text-ink">{t(`sectors.${r.category}`)}</td>
                  <td className="py-2.5 pr-4"><Swatch hex={SECTOR_SWATCH[r.category]} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="legend-ramps">
        <H id="legend-ramps" className="text-2xl text-ink">{t('legend.ramps_heading')}</H>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-muted">{t('legend.ramps_lede')}</p>
        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          {LEGEND_METRICS.map((metric) => {
            const { ramp, breaks } = METRIC_SPECS[metric];
            return (
              <div key={metric} className="overflow-x-auto">
                <table className="w-full text-sm">
                  <caption className="pb-2 text-left font-medium text-ink">
                    {tMetric(`${metric}.legend`)}
                    <span className="sr-only">
                      {' — '}
                      {t('legend.ramps_caption', { metric: tMetric(`${metric}.label`), unit: tMetric(`${metric}.unit`) })}
                    </span>
                  </caption>
                  <thead>
                    <tr className="border-y border-line">
                      <th scope="col" className={th}>{t('legend.col_tier')}</th>
                      <th scope="col" className={th}>{t('legend.col_colour')}</th>
                      <th scope="col" className={th}>{t('legend.col_range')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line border-b border-line">
                    {ramp.map((hex, tier) => (
                      <tr key={hex}>
                        <th scope="row" className="py-1.5 pr-4 text-left font-normal tabular-nums text-ink">{tier + 1}</th>
                        <td className="py-1.5 pr-4"><Swatch hex={hex} /></td>
                        <td className="py-1.5 pr-4 tabular-nums text-ink">
                          {tier === 0
                            ? t('legend.range_up_to', { upper: n(breaks[0]) })
                            : tier >= breaks.length
                              ? t('legend.range_above', { lower: n(breaks[breaks.length - 1]) })
                              : t('legend.range_between', { lower: n(breaks[tier - 1]), upper: n(breaks[tier]) })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="legend-files">
        <H id="legend-files" className="text-2xl text-ink">{t('legend.files_heading')}</H>
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {([
            ['file_codes', LEGEND_FILES.residueCodes],
            ['file_legend', LEGEND_FILES.mapLegend],
            ['file_qgis', LEGEND_FILES.qgisRamps],
          ] as const).map(([key, path]) => (
            <li key={key}>
              <a
                href={withBasePath(path)}
                download
                className="flex min-h-[44px] items-center justify-between gap-4 py-2 text-sm font-medium text-terra-700 hover:bg-paper-sunken dark:text-terra-300"
              >
                <span>{t(`legend.${key}`)}</span>
                <span className="inline-flex items-center gap-2 font-mono text-xs text-ink-muted">
                  {path.split('/').pop()}
                  <Download className="h-4 w-4" aria-hidden="true" />
                </span>
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-ink-muted">{t('legend.files_note')}</p>
      </section>
    </div>
  );
}

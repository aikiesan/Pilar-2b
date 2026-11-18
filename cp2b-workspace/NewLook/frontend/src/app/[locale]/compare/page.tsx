'use client';

import { useEffect, useState, Suspense } from 'react';
import { Link, useRouter } from '@/navigation';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { BreadcrumbBar } from '@/components/ui/Breadcrumb';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { useFormat } from '@/hooks/useFormat';
import { logger } from '@/lib/logger';
import ComparisonPicker from '@/components/comparison/ComparisonPicker';

interface MunicipalityData {
  id: number;
  municipality_name: string;
  ibge_code: string | null;
  total_biogas_m3_year: number;
  urban_biogas_m3_year: number;
  agricultural_biogas_m3_year: number;
  livestock_biogas_m3_year: number;
  energy_potential_mwh_year: number;
  population: number | null;
  area_km2: number | null;
  population_density: number | null;
  administrative_region: string | null;
}

function ComparePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('pages');
  const tNav = useTranslations('common.nav');
  const breadcrumbs = useBreadcrumbs();
  const format = useFormat();
  const [municipalities, setMunicipalities] = useState<MunicipalityData[]>([]);
  // Net emissions reduction per IBGE code (GHG module, CP2b Real level); absent = unavailable.
  const [ghgNet, setGhgNet] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Opened without a usable selection (from the header, or with one id): show
  // the picker instead of bouncing to the Hub. `notice` says why, if anything.
  const [picking, setPicking] = useState<{ notice?: string } | null>(null);

  useEffect(() => {
    const fetchMunicipalities = async () => {
      try {
        const idsParam = searchParams.get('ids');
        if (!idsParam) {
          setPicking({});
          return;
        }

        // Only whole numbers: anything else in the address would fetch /municipalities/NaN.
        const ids = idsParam.split(',').map((id) => Number(id.trim())).filter(Number.isInteger);

        if (ids.length < 2) {
          setPicking({ notice: t('compare.min_municipalities_error') });
          return;
        }

        setPicking(null);
        setError(null);
        setLoading(true);

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

        const promises = ids.map((id) =>
          fetch(`${apiUrl}/api/v1/geospatial/municipalities/${id}`).then((res) => {
            if (!res.ok) throw new Error(`Municipality ${id} not found`);
            return res.json();
          })
        );

        const data: MunicipalityData[] = await Promise.all(promises);
        setMunicipalities(data);
        setLoading(false);

        // Optional row, filled in after the table: a municipality without the GHG answer shows a dash.
        const ghg = await Promise.allSettled(
          data.map((m) =>
            fetch(`${apiUrl}/api/v1/ghg/municipalities/${m.ibge_code}?level=n4`).then((res) =>
              res.ok ? res.json() : Promise.reject(res.status)
            )
          )
        );
        setGhgNet(
          Object.fromEntries(
            ghg.flatMap((r) =>
              r.status === 'fulfilled' && typeof r.value?.totals?.er_net_t === 'number'
                ? [[r.value.ibge_code, r.value.totals.er_net_t]]
                : []
            )
          )
        );
      } catch (err) {
        // The raw message ("Municipality 42 not found", "Failed to fetch") is for the log.
        logger.error('Comparison load failed:', err);
        setError(t('compare.error'));
      } finally {
        setLoading(false);
      }
    };

    fetchMunicipalities();
  }, [searchParams, router, t]);

  // In the page's number format ("1,234" / "1.234"); a missing value is a dash.
  const formatNumber = (num: number | null | undefined): string => format.number(num, { decimals: 0 });
  const formatDecimal = (num: number | null | undefined, decimals: number = 2): string =>
    format.number(num, { decimals, minDecimals: decimals });

  const getComparisonIcon = (values: number[], index: number) => {
    const value = values[index];
    const max = Math.max(...values);
    const min = Math.min(...values);

    if (value === max && max !== min) {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    } else if (value === min && max !== min) {
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    }
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  // Every state keeps the breadcrumb, so the way back is always on screen.
  if (picking) {
    return (
      <>
        <BreadcrumbBar items={breadcrumbs} />
        <ComparisonPicker notice={picking.notice} />
      </>
    );
  }

  if (loading) {
    return (
      <>
        <BreadcrumbBar items={breadcrumbs} />
        <div className="min-h-[60vh] bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-terra-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-slate-400">{t('compare.loading_comparison')}</p>
          </div>
        </div>
      </>
    );
  }

  if (error || municipalities.length === 0) {
    return (
      <>
        <BreadcrumbBar items={breadcrumbs} />
        <div className="flex min-h-[60vh] items-center justify-center bg-paper px-4">
          <div className="max-w-md text-center">
            <p role="alert" className="mb-6 text-ink">{error || t('compare.none_found')}</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/municipalities" className="btn-primary min-h-[44px]">{tNav('municipalities')}</Link>
              <Link href="/map" className="btn-secondary min-h-[44px]">{tNav('open_map')}</Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-20">
      <BreadcrumbBar items={breadcrumbs} />

      {/* Page Title */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t('compare.title')}</h1>
          <p className="text-gray-600 dark:text-slate-400 mt-1">{t('compare.comparing', { count: municipalities.length })}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Comparison Table */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
            <thead className="bg-gray-50 dark:bg-slate-700">
              <tr>
                <th className="sticky left-0 bg-gray-50 dark:bg-slate-700 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider z-10">
                  {t('compare.indicator')}
                </th>
                {municipalities.map((m) => (
                  <th
                    key={m.id}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider"
                  >
                    <div className="font-bold text-gray-900 dark:text-slate-100">{m.municipality_name}</div>
                    <div className="font-normal text-gray-500 dark:text-slate-400 normal-case">
                      {t('compare.ibge_code')}: {m.ibge_code || 'N/A'}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
              {/* Location */}
              <ComparisonRow
                label={t('compare.admin_region')}
                values={municipalities.map((m) => m.administrative_region || 'N/A')}
                isNumeric={false}
              />

              {/* Geographic */}
              <ComparisonRow
                label={t('compare.area')}
                values={municipalities.map((m) => formatDecimal(m.area_km2, 0))}
                numericValues={municipalities.map((m) => m.area_km2 || 0)}
                getComparisonIcon={getComparisonIcon}
              />

              <ComparisonRow
                label={t('compare.population')}
                values={municipalities.map((m) => formatNumber(m.population))}
                numericValues={municipalities.map((m) => m.population || 0)}
                getComparisonIcon={getComparisonIcon}
              />

              <ComparisonRow
                label={t('compare.row_population_density')}
                values={municipalities.map((m) => formatDecimal(m.population_density, 1))}
                numericValues={municipalities.map((m) => m.population_density || 0)}
                getComparisonIcon={getComparisonIcon}
              />

              {/* Biogas Potential section header */}
              <tr className="bg-terra-50 dark:bg-terra-900/30">
                <td colSpan={municipalities.length + 1} className="px-6 py-2 text-sm font-bold text-terra-900 dark:text-terra-300">
                  {t('compare.biogas_section')}
                </td>
              </tr>

              <ComparisonRow
                label={t('compare.row_total_biogas')}
                values={municipalities.map((m) => formatNumber(m.total_biogas_m3_year))}
                numericValues={municipalities.map((m) => m.total_biogas_m3_year)}
                getComparisonIcon={getComparisonIcon}
                highlight
              />

              <ComparisonRow
                label={t('compare.row_agri_biogas')}
                values={municipalities.map((m) => formatNumber(m.agricultural_biogas_m3_year))}
                numericValues={municipalities.map((m) => m.agricultural_biogas_m3_year)}
                getComparisonIcon={getComparisonIcon}
              />

              <ComparisonRow
                label={t('compare.row_live_biogas')}
                values={municipalities.map((m) => formatNumber(m.livestock_biogas_m3_year))}
                numericValues={municipalities.map((m) => m.livestock_biogas_m3_year)}
                getComparisonIcon={getComparisonIcon}
              />

              <ComparisonRow
                label={t('compare.row_urban_biogas')}
                values={municipalities.map((m) => formatNumber(m.urban_biogas_m3_year))}
                numericValues={municipalities.map((m) => m.urban_biogas_m3_year)}
                getComparisonIcon={getComparisonIcon}
              />

              {/* Energy and Environmental section header */}
              <tr className="bg-yellow-50 dark:bg-yellow-900/20">
                <td colSpan={municipalities.length + 1} className="px-6 py-2 text-sm font-bold text-yellow-900 dark:text-yellow-300">
                  {t('compare.energy_section')}
                </td>
              </tr>

              <ComparisonRow
                label={t('compare.row_energy')}
                values={municipalities.map((m) => formatNumber(m.energy_potential_mwh_year))}
                numericValues={municipalities.map((m) => m.energy_potential_mwh_year)}
                getComparisonIcon={getComparisonIcon}
              />

              <ComparisonRow
                label={t('compare.row_ghg')}
                values={municipalities.map((m) => formatNumber(ghgNet[m.ibge_code ?? '']))}
                numericValues={municipalities.map((m) => ghgNet[m.ibge_code ?? ''] ?? 0)}
                getComparisonIcon={getComparisonIcon}
              />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Export default wrapper with Suspense
export default function ComparePage() {
  const t = useTranslations('pages');
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-terra-600 mx-auto mb-4"></div>
            <p className="text-gray-600">{t('compare.loading_comparison')}</p>
          </div>
        </div>
      }
    >
      <ComparePageContent />
    </Suspense>
  );
}

// Helper component for comparison rows
interface ComparisonRowProps {
  label: string;
  values: (string | number)[];
  numericValues?: number[];
  getComparisonIcon?: (values: number[], index: number) => React.ReactNode;
  isNumeric?: boolean;
  highlight?: boolean;
}

function ComparisonRow({
  label,
  values,
  numericValues,
  getComparisonIcon,
  isNumeric = true,
  highlight = false,
}: ComparisonRowProps) {
  return (
    <tr className={highlight ? 'bg-terra-50 dark:bg-terra-900/20' : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'}>
      <td className={`sticky left-0 ${highlight ? 'bg-terra-50 dark:bg-terra-900/20' : 'bg-white dark:bg-slate-800'} px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-slate-100 z-10`}>
        {label}
      </td>
      {values.map((value, index) => (
        <td key={index} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-slate-300">
          <div className="flex items-center gap-2">
            {numericValues && getComparisonIcon && getComparisonIcon(numericValues, index)}
            <span className={highlight ? 'font-bold text-terra-900 dark:text-terra-300' : ''}>{value}</span>
          </div>
        </td>
      ))}
    </tr>
  );
}

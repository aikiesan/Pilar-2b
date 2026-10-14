'use client';

/**
 * Picks the municipalities to compare, for /compare opened without a
 * selection (now that "Comparar" is in the header, that is the common case).
 *
 * The selection goes into ComparisonContext, so the global ComparisonBar shows
 * the chosen chips and carries the "Comparar" action -- the picker only finds
 * and adds. Search runs over the municipalities the map already loads.
 */
import { useId, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Map, Plus, Search } from 'lucide-react';
import { Link } from '@/navigation';
import { useGeospatialData } from '@/hooks/useGeospatialData';
import { MAX_COMPARISON, MIN_COMPARISON, useComparison } from '@/contexts/ComparisonContext';
import { searchMunicipalities } from '@/lib/municipalitySearch';

const MAX_RESULTS = 8;

export default function ComparisonPicker({ notice }: { notice?: string }) {
  const t = useTranslations('comparison.picker');
  const { data, loading, error } = useGeospatialData();
  const { addMunicipality, isSelected, selectedMunicipalities } = useComparison();
  const [query, setQuery] = useState('');
  const inputId = useId();
  const full = selectedMunicipalities.length >= MAX_COMPARISON;

  // By name or IBGE code, as everywhere (lib/municipalitySearch).
  const results = useMemo(
    () =>
      data
        ? searchMunicipalities(
            data.features,
            query,
            (f) => ({ name: f.properties.name, code: f.properties.ibge_code }),
            MAX_RESULTS,
          )
        : [],
    [query, data],
  );

  return (
    // Bottom padding keeps the last result clear of the fixed ComparisonBar.
    <div className="min-h-[60vh] bg-gray-50 dark:bg-slate-900 pb-40">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100">
          {t('title')}
        </h1>
        <p className="mt-2 text-gray-600 dark:text-slate-400">
          {t('intro', { min: MIN_COMPARISON, max: MAX_COMPARISON })}
        </p>

        {notice && (
          <p role="alert" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {notice}
          </p>
        )}

        <label htmlFor={inputId} className="mt-6 block text-sm font-medium text-gray-700 dark:text-slate-300">
          {t('search_label')}
        </label>
        <div className="mt-1 flex items-center gap-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 focus-within:ring-2 focus-within:ring-terra-600">
          <Search className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
          <input
            id={inputId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search_placeholder')}
            autoComplete="off"
            className="min-h-[44px] flex-1 border-0 bg-transparent p-0 text-base focus:ring-0 text-gray-900 dark:text-slate-100 outline-none placeholder:text-gray-400"
          />
        </div>

        <div aria-live="polite" className="mt-4">
          {error ? (
            <p className="text-sm text-red-700">{t('error')}</p>
          ) : loading ? (
            query.trim() && <p className="text-sm text-gray-500 dark:text-slate-400">{t('loading')}</p>
          ) : (
            query.trim() && results.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-slate-400">{t('no_results', { query })}</p>
            )
          )}
        </div>

        {results.length > 0 && (
          <ul className="mt-2 divide-y divide-gray-100 dark:divide-slate-700 overflow-hidden rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            {results.map((feature) => {
              const { id, name, ibge_code, intermediate_region } = feature.properties;
              const numericId = Number(id);
              const selected = isSelected(numericId);
              return (
                <li key={String(ibge_code)} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900 dark:text-slate-100">{name}</p>
                    <p className="truncate text-xs text-gray-500 dark:text-slate-400">
                      {intermediate_region} · IBGE {ibge_code}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      addMunicipality({
                        id: numericId,
                        name,
                        total_biogas_m3_year: feature.properties.total_biogas_m3_year,
                        region: intermediate_region,
                      })
                    }
                    disabled={selected || full}
                    className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-lg border border-terra-600 dark:border-terra-400 px-3 text-sm font-medium text-terra-600 dark:text-terra-400 hover:bg-terra-600 hover:text-white disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-transparent focus:outline-none focus:ring-2 focus:ring-terra-600"
                  >
                    {selected ? <Check className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
                    {/* The name is part of the accessible name, so ten "Adicionar"
                        buttons stay distinguishable in a screen reader's list. */}
                    <span>{selected ? t('added') : t('add')}</span>
                    <span className="sr-only">{name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <p className="mt-8 text-sm text-gray-600 dark:text-slate-400">
          {t('map_hint')}{' '}
          <Link href="/map" className="inline-flex items-center gap-1 font-medium text-terra-600 dark:text-terra-400 underline underline-offset-2 hover:text-terra-700 dark:hover:text-terra-300">
            <Map className="h-4 w-4" aria-hidden="true" />
            {t('open_map')}
          </Link>
        </p>
      </div>
    </div>
  );
}

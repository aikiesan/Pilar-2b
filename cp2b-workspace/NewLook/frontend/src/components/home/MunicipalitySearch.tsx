'use client';

/**
 * The landing page's search: type a municipality's name or IBGE code, pick it,
 * land on its page. A combobox (ARIA 1.2 pattern): arrows move through the
 * options, Enter opens one, Escape clears. Matching is lib/municipalitySearch,
 * the same as the header's.
 *
 * It loads the light name list (useMunicipalityNames, no geometry) on first
 * focus rather than the map's GeoJSON, so the landing stays quick. An option
 * opens the municipality's readable address (/municipalities/campinas-sp).
 */
import { useId, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Search } from 'lucide-react';
import { useRouter } from '@/navigation';
import type { MunicipalityName } from '@/lib/municipalityNames';
import { municipalityPath } from '@/lib/municipalitySlug';
import { searchMunicipalities, ufAbbreviation } from '@/lib/municipalitySearch';
import { useMunicipalityNames } from '@/hooks/useMunicipalityNames';

type MunicipalityOption = MunicipalityName;

const MAX_RESULTS = 8;

export default function MunicipalitySearch() {
  const t = useTranslations('home.search');
  const router = useRouter();
  const [wanted, setWanted] = useState(false);
  const { names: options, state: load, retry } = useMunicipalityNames(wanted);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputId = useId();
  const listId = useId();
  const statusId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const ensureLoaded = () => {
    setWanted(true);
    // A failed load is tried again on the next focus.
    retry();
  };

  const results = useMemo(
    () =>
      searchMunicipalities(
        options,
        query,
        (o) => ({ name: o.municipality_name, code: o.ibge_code }),
        MAX_RESULTS,
      ),
    [query, options],
  );
  const expanded = results.length > 0;

  const go = (option: MunicipalityOption) =>
    router.push(municipalityPath(option.municipality_name, option.ibge_code));

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && expanded) {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp' && expanded) {
      e.preventDefault();
      setActive((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === 'Enter' && expanded) {
      e.preventDefault();
      go(results[active]);
    } else if (e.key === 'Escape') {
      setQuery('');
    }
  };

  // One live message: loading, the list being unavailable, or no match.
  const status =
    load === 'failed'
      ? t('unavailable')
      : load === 'loading' && query
        ? t('loading')
        : query.trim() && !expanded && load === 'ready'
          ? `${t('no_results', { query: query.trim() })}. ${t('no_results_hint')}`
          : '';

  return (
    <div className="relative max-w-xl">
      <label htmlFor={inputId} className="eyebrow block">
        {t('label')}
      </label>
      <div className="mt-2 flex items-center border border-line-strong bg-paper-raised focus-within:border-terra-600 focus-within:ring-1 focus-within:ring-terra-600">
        <Search className="ml-3 h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-activedescendant={expanded ? `${listId}-${active}` : undefined}
          aria-describedby={statusId}
          autoComplete="off"
          value={query}
          placeholder={t('placeholder')}
          onFocus={ensureLoaded}
          onChange={(e) => {
            ensureLoaded();
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          className="min-h-[48px] w-full border-0 bg-transparent px-3 focus:ring-0 text-base text-ink placeholder:text-ink-muted focus:outline-none"
        />
      </div>

      <ul
        id={listId}
        role="listbox"
        aria-label={t('results_label')}
        hidden={!expanded}
        className="absolute left-0 right-0 z-30 mt-1 max-h-80 overflow-y-auto border border-line bg-paper-raised py-1 shadow-xl"
      >
        {results.map((option, index) => (
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events -- keyboard: the combobox input (arrows, Enter)
          <li
            key={option.ibge_code}
            id={`${listId}-${index}`}
            role="option"
            aria-selected={index === active}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => go(option)}
            onMouseEnter={() => setActive(index)}
            className={`flex min-h-[44px] cursor-pointer items-center justify-between gap-3 border-l-2 px-3 py-2 text-sm ${
              index === active ? 'border-terra-600 bg-paper-sunken text-ink' : 'border-transparent text-ink'
            }`}
          >
            <span className="font-medium">{option.municipality_name}</span>
            <span className="font-mono text-xs text-ink-muted tabular-nums">
              {ufAbbreviation(option.ibge_code)} · {option.ibge_code}
            </span>
          </li>
        ))}
      </ul>

      <p id={statusId} role="status" className="mt-2 min-h-[1.25rem] text-sm text-ink-muted">
        {status}
      </p>
    </div>
  );
}

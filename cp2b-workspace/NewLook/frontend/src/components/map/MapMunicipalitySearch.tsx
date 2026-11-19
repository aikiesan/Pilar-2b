'use client';

/**
 * Find a municipality on the map: type its name or IBGE code, pick it, and the
 * map outlines it, frames it and opens its profile, with every other
 * municipality still painted around it. It selects; it never filters.
 *
 * The same combobox as the landing's search (ARIA 1.2: arrows move, Enter
 * picks, Escape clears) and the same matching (lib/municipalitySearch), but
 * its options are the municipalities already on the map, so it needs no
 * request of its own.
 */
import { useId, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Search, X } from 'lucide-react';
import type { MunicipalityFeature } from '@/types/geospatial';
import { searchMunicipalities, ufAbbreviation } from '@/lib/municipalitySearch';

const MAX_RESULTS = 8;

export default function MapMunicipalitySearch({
  features,
  selected,
  onSelect,
  onClear,
}: {
  /** The municipalities on the map, in the current scope. */
  features: readonly MunicipalityFeature[];
  /** The municipality the map has selected, from here or from a click. */
  selected: MunicipalityFeature | null;
  onSelect: (feature: MunicipalityFeature) => void;
  onClear: () => void;
}) {
  const t = useTranslations('Map.search');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(false);
  const [active, setActive] = useState(0);
  const inputId = useId();
  const listId = useId();
  const statusId = useId();

  // While not typing, the box names what is selected, so a click on the map shows up here too.
  const selectedName = selected?.properties?.name ?? '';
  const shown = editing ? query : selectedName;

  const results = useMemo(
    () =>
      editing
        ? searchMunicipalities(
            features,
            query,
            (f) => ({ name: f.properties?.name ?? '', code: f.properties?.ibge_code ?? '' }),
            MAX_RESULTS,
          )
        : [],
    [editing, query, features],
  );
  const expanded = results.length > 0;

  const pick = (feature: MunicipalityFeature) => {
    onSelect(feature);
    setEditing(false);
    setQuery('');
  };

  const clear = () => {
    setQuery('');
    setEditing(false);
    onClear();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && expanded) {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp' && expanded) {
      e.preventDefault();
      setActive((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === 'Enter' && expanded) {
      e.preventDefault();
      pick(results[active]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (editing && query) {
        setQuery('');
      } else {
        clear();
      }
    }
  };

  const noMatch = editing && query.trim() !== '' && !expanded;

  return (
    <div className="relative w-full sm:w-80">
      <label htmlFor={inputId} className="sr-only">
        {t('label')}
      </label>
      <div className="surface-light flex items-center border border-line bg-paper-raised/95 shadow-md backdrop-blur focus-within:border-terra-600 focus-within:ring-1 focus-within:ring-terra-600">
        <Search className="ml-3 h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-activedescendant={expanded ? `${listId}-${active}` : undefined}
          aria-describedby={statusId}
          autoComplete="off"
          value={shown}
          placeholder={t('placeholder')}
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            setEditing(true);
            setQuery(e.target.value);
            setActive(0);
          }}
          onBlur={() => {
            // Leaving the box without picking puts the selected name back.
            setEditing(false);
            setQuery('');
          }}
          onKeyDown={onKeyDown}
          data-testid="map-municipality-search"
          className="min-h-11 w-full border-0 bg-transparent px-2.5 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-0"
        />
        {shown && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={clear}
            aria-label={t('clear_aria')}
            className="mr-1 flex h-9 w-9 shrink-0 items-center justify-center text-ink-muted hover:text-ink focus-ring"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <ul
        id={listId}
        role="listbox"
        aria-label={t('label')}
        hidden={!expanded}
        className="surface-light absolute left-0 right-0 z-30 mt-1 max-h-80 overflow-y-auto border border-line bg-paper-raised py-1 shadow-xl"
      >
        {results.map((feature, index) => {
          const code = feature.properties?.ibge_code ?? '';
          return (
            // eslint-disable-next-line jsx-a11y/click-events-have-key-events -- keyboard: the combobox input (arrows, Enter)
            <li
              key={String(code)}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(feature)}
              onMouseEnter={() => setActive(index)}
              className={`flex min-h-[44px] cursor-pointer items-center justify-between gap-3 border-l-2 px-3 py-2 text-sm ${
                index === active ? 'border-terra-600 bg-paper-sunken text-ink' : 'border-transparent text-ink'
              }`}
            >
              <span className="font-medium">{feature.properties?.name}</span>
              <span className="font-mono text-xs text-ink-muted tabular-nums">
                {ufAbbreviation(code)} · {code}
              </span>
            </li>
          );
        })}
      </ul>

      <p
        id={statusId}
        role="status"
        className="surface-light mt-1 border border-line bg-paper-raised/95 px-3 py-2 text-xs text-ink-muted shadow-md empty:hidden"
      >
        {noMatch ? t('no_match') : ''}
      </p>
    </div>
  );
}

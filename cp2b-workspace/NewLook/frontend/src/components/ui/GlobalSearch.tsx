'use client'

/**
 * GlobalSearch — the header's municipality search, by name or IBGE code only
 * (lib/municipalitySearch). Press "/" to open it from anywhere.
 * On select: opens the municipality's page (/municipalities/campinas-sp).
 *
 * It reads the light name list (useMunicipalityNames), fetched the first time
 * the search opens, not the map's GeoJSON. On a phone the open search covers
 * the top of the screen, with a 16 px input so the browser does not zoom.
 */

import { useState, useEffect, useId, useRef, useCallback, useMemo } from 'react'
import { useRouter } from '@/navigation'
import { municipalityPath } from '@/lib/municipalitySlug'
import { useTranslations } from 'next-intl'
import { useMunicipalityNames } from '@/hooks/useMunicipalityNames'
import { searchMunicipalities, ufAbbreviation } from '@/lib/municipalitySearch'
import type { MunicipalityName } from '@/lib/municipalityNames'
import { Search, X, MapPin } from 'lucide-react'

const MAX_RESULTS = 8

export default function GlobalSearch() {
  const t = useTranslations('common.search')
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  // The list is fetched the first time the search opens, then kept.
  const [wanted, setWanted] = useState(false)
  const { names, state, retry } = useMunicipalityNames(wanted)

  const inputRef = useRef<HTMLInputElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  // Closing from the keyboard or the close button hands focus back to the trigger.
  const refocusTrigger = useRef(false)
  const listboxId = useId()
  const statusId = useId()
  const optionId = (index: number) => `${listboxId}-option-${index}`

  const results = useMemo(
    () =>
      searchMunicipalities(
        names,
        query,
        (m: MunicipalityName) => ({ name: m.municipality_name, code: m.ibge_code }),
        MAX_RESULTS,
      ),
    [names, query],
  )
  // The listbox exists only while there are results; the combobox says so.
  const expanded = results.length > 0

  const openSearch = useCallback(() => {
    refocusTrigger.current = false
    setWanted(true)
    retry()
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [retry])

  const close = useCallback((returnFocus: boolean) => {
    refocusTrigger.current = returnFocus
    setOpen(false)
    setQuery('')
  }, [])

  // ── Keyboard shortcut "/" to open ───────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault()
        openSearch()
      }
      if (e.key === 'Escape') {
        close(containerRef.current?.contains(e.target as Node) ?? false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [close, openSearch])

  useEffect(() => {
    if (!open && refocusTrigger.current) {
      refocusTrigger.current = false
      triggerRef.current?.focus()
    }
  }, [open])

  // ── Close on outside click ──────────────────────────────────────────────────
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close(false)
      }
    }
    if (open) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open, close])

  // ── Navigation ──────────────────────────────────────────────────────────────
  const navigateTo = useCallback(
    (municipality: MunicipalityName) => {
      router.push(municipalityPath(municipality.municipality_name, municipality.ibge_code) as never)
      close(false)
    },
    [router, close]
  )

  const onKeyDownList = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      // Never below 0: with no results yet, the first one to arrive is the active one.
      setActiveIndex((i) => Math.max(0, Math.min(i + 1, results.length - 1)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[activeIndex]) {
      e.preventDefault()
      navigateTo(results[activeIndex])
    }
  }

  // One live message: loading, the list being unavailable, or no match.
  const typed = query.trim() !== ''
  const status = !typed || expanded
    ? ''
    : state === 'failed'
      ? t('unavailable')
      : state === 'ready'
        ? `${t('no_results', { query: query.trim() })}. ${t('scope_hint')}`
        : t('loading')

  return (
    <div ref={containerRef} className="relative tour-search-bar">
      {/* Collapsed trigger. It keeps its place while the search is open (hidden,
          so it cannot take focus): the open search floats over the bar instead
          of widening it, which pushed a full header off the screen. */}
      <button
        ref={triggerRef}
        type="button"
        onClick={openSearch}
        className={`flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded border border-line bg-paper-sunken px-3 text-sm text-ink-muted transition-colors hover:border-line-strong hover:text-ink sm:min-h-[36px] ${open ? 'invisible' : ''}`}
        aria-label={t('trigger_aria')}
      >
        <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="hidden min-[1760px]:inline text-xs">{t('trigger')}</span>
        <kbd className="hidden min-[1760px]:inline px-1 py-0.5 font-mono text-xs rounded bg-black/10 dark:bg-white/10" aria-hidden="true">
          /
        </kbd>
      </button>

      {open && (
        // A phone gets the whole top of the screen; wider screens a box over the bar.
        <div className="fixed inset-x-0 top-0 z-[600] border-b border-line bg-paper p-2 shadow-lg sm:absolute sm:inset-x-auto sm:right-0 sm:top-1/2 sm:w-96 sm:-translate-y-1/2 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
          <div className="flex items-center gap-2 rounded border border-line-strong bg-paper-raised pl-3 shadow-lg focus-within:border-terra-600 focus-within:ring-1 focus-within:ring-terra-600">
            <Search className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setActiveIndex(0)
              }}
              onKeyDown={onKeyDownList}
              role="combobox"
              aria-expanded={expanded}
              aria-controls={expanded ? listboxId : undefined}
              aria-autocomplete="list"
              aria-activedescendant={expanded && results[activeIndex] ? optionId(activeIndex) : undefined}
              aria-describedby={statusId}
              placeholder={t('placeholder')}
              aria-label={t('input_aria')}
              enterKeyHint="search"
              className="min-h-[44px] min-w-0 flex-1 border-0 bg-transparent p-0 text-base text-ink outline-none placeholder:text-ink-muted focus:ring-0 sm:text-sm [&::-webkit-search-cancel-button]:hidden"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => close(true)}
              aria-label={t('close_aria')}
              className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center text-ink-muted hover:text-ink"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* Results, or what is happening instead */}
          <div className={`mt-1 overflow-hidden rounded border border-line bg-paper-raised shadow-xl sm:absolute sm:left-0 sm:right-0 sm:top-full ${typed ? '' : 'hidden'}`}>
            <p id={statusId} role="status" className={status ? 'px-4 py-4 text-sm text-ink-muted' : 'sr-only'}>
              {status}
            </p>
            {expanded && (
              <ul id={listboxId} role="listbox" aria-label={t('results_aria')}>
                {results.map((muni, idx) => (
                  // eslint-disable-next-line jsx-a11y/click-events-have-key-events -- keyboard: the combobox input (arrows, Enter)
                  <li
                    key={muni.ibge_code}
                    id={optionId(idx)}
                    role="option"
                    aria-selected={idx === activeIndex}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => navigateTo(muni)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`flex min-h-[44px] cursor-pointer items-center gap-3 border-l-2 px-4 py-2 ${
                      idx === activeIndex ? 'border-terra-600 bg-paper-sunken' : 'border-transparent'
                    }`}
                  >
                    <MapPin className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{muni.municipality_name}</span>
                    <span className="shrink-0 font-mono text-xs tabular-nums text-ink-muted">
                      {ufAbbreviation(muni.ibge_code)} · {muni.ibge_code}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {expanded && (
              <p className="hidden border-t border-line bg-paper-sunken px-4 py-2 text-center text-xs text-ink-muted sm:block" aria-hidden="true">
                {t('hints')}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

/**
 * GlobalSearch — header search across all 645 municipalities.
 * Keyboard shortcut: press "/" to open.
 * On select: navigates to /municipality/[ibge_code] deep-dive page.
 *
 * Data comes from the cached useGeospatialData hook (no extra fetch).
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from '@/navigation'
import { useGeospatialData } from '@/hooks/useGeospatialData'
import { Search, X, MapPin, TrendingUp } from 'lucide-react'
import type { MunicipalityFeature } from '@/types/geospatial'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBig(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`
  return value.toFixed(0)
}

function getPotentialColor(value: number): string {
  if (value >= 500_000_000) return 'text-blue-700 dark:text-blue-400'
  if (value >= 100_000_000) return 'text-cyan-700 dark:text-cyan-400'
  if (value >= 50_000_000) return 'text-teal-700 dark:text-teal-400'
  if (value >= 10_000_000) return 'text-green-700 dark:text-green-400'
  return 'text-lime-700 dark:text-lime-400'
}

// ── Component ─────────────────────────────────────────────────────────────────

interface GlobalSearchProps {
  /** visual variant: matches the header (public=light, authenticated=dark) */
  variant?: 'light' | 'dark'
}

export default function GlobalSearch({ variant = 'light' }: GlobalSearchProps) {
  const router = useRouter()
  const { data } = useGeospatialData()

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // ── Search results ──────────────────────────────────────────────────────────
  const results: MunicipalityFeature[] = (() => {
    if (!query.trim() || !data) return []
    const q = query.toLowerCase().trim()
    return data.features
      .filter(
        (f) =>
          f.properties.name.toLowerCase().includes(q) ||
          String(f.properties.ibge_code).startsWith(q)
      )
      .sort((a, b) => b.properties.total_biogas_m3_year - a.properties.total_biogas_m3_year)
      .slice(0, 8)
  })()

  // ── Keyboard shortcut "/" to open ───────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault()
        setOpen(true)
        setTimeout(() => inputRef.current?.focus(), 50)
      }
      if (e.key === 'Escape') {
        setOpen(false)
        setQuery('')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // ── Close on outside click ──────────────────────────────────────────────────
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    if (open) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0)
  }, [results.length])

  // ── Navigation ──────────────────────────────────────────────────────────────
  const navigateTo = useCallback(
    (municipality: MunicipalityFeature) => {
      router.push(`/municipality/${municipality.properties.ibge_code}` as any)
      setOpen(false)
      setQuery('')
    },
    [router]
  )

  const onKeyDownList = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[activeIndex]) {
      navigateTo(results[activeIndex])
    }
  }

  // ── Styles based on variant ─────────────────────────────────────────────────
  const triggerClass =
    variant === 'dark'
      ? 'flex items-center gap-2 px-3 py-1.5 rounded-lg text-green-100 bg-white/10 hover:bg-white/20 border border-white/20 text-sm transition-colors cursor-pointer'
      : 'flex items-center gap-2 px-3 py-1.5 rounded-lg text-gray-500 bg-gray-100 hover:bg-gray-200 border border-gray-200 text-sm transition-colors cursor-pointer'

  return (
    <div ref={containerRef} className="relative">
      {/* Collapsed trigger */}
      {!open && (
        <button
          onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50) }}
          className={triggerClass}
          aria-label="Buscar município (tecla /)"
        >
          <Search className="w-4 h-4 shrink-0" />
          <span className="hidden lg:inline text-xs">Buscar município</span>
          <kbd className="hidden lg:inline px-1 py-0.5 text-[10px] font-mono rounded bg-black/10 dark:bg-white/10">
            /
          </kbd>
        </button>
      )}

      {/* Expanded search input */}
      {open && (
        <div className="w-72 sm:w-96">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border shadow-lg ${
            variant === 'dark'
              ? 'bg-[#163d1f] border-white/20'
              : 'bg-white border-gray-300'
          }`}>
            <Search className={`w-4 h-4 shrink-0 ${variant === 'dark' ? 'text-green-300' : 'text-gray-400'}`} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDownList}
              placeholder="Nome ou código IBGE..."
              className={`flex-1 bg-transparent text-sm outline-none ${
                variant === 'dark' ? 'text-white placeholder-green-300/50' : 'text-gray-900 placeholder-gray-400'
              }`}
              autoComplete="off"
            />
            <button
              onClick={() => { setOpen(false); setQuery('') }}
              className={`shrink-0 ${variant === 'dark' ? 'text-green-300 hover:text-white' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Results dropdown */}
          {query.trim() && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-xl overflow-hidden z-[600]">
              {results.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-gray-500">
                  Nenhum município encontrado para &quot;{query}&quot;
                </div>
              ) : (
                <ul role="listbox">
                  {results.map((muni, idx) => {
                    const total = muni.properties.total_biogas_m3_year
                    return (
                      <li
                        key={muni.properties.ibge_code}
                        role="option"
                        aria-selected={idx === activeIndex}
                        onClick={() => navigateTo(muni)}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors ${
                          idx === activeIndex
                            ? 'bg-green-50 dark:bg-green-900/20'
                            : 'hover:bg-gray-50 dark:hover:bg-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {muni.properties.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {muni.properties.intermediate_region} · IBGE {muni.properties.ibge_code}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-3">
                          <TrendingUp className="w-3 h-3 text-gray-400" />
                          <span className={`text-xs font-semibold ${getPotentialColor(total)}`}>
                            {formatBig(total)} m³/ano
                          </span>
                        </div>
                      </li>
                    )
                  })}
                  <li className="px-4 py-2 bg-gray-50 dark:bg-slate-900/40 border-t border-gray-100 dark:border-slate-700">
                    <p className="text-[10px] text-gray-400 text-center">
                      ↑↓ navegar · Enter selecionar · Esc fechar
                    </p>
                  </li>
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

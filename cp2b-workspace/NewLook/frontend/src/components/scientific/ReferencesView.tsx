'use client'

import { useCallback, useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { BookOpen, CheckCircle2, ExternalLink, Filter, Search } from 'lucide-react'
import { useResidueName } from '@/hooks/useResidueName'
import { toApa, toBibtex } from '@/lib/citations'
import { SECTOR_CODES, type LiteratureReference, type ResidueRecord, type SectorCode } from '@/types/scientific'

const SECTOR_EMOJI: Record<SectorCode, string> = {
  AG_AGRICULTURA: '🌾',
  PC_PECUARIA: '🐄',
  IN_INDUSTRIAL: '🏭',
  UR_URBANO: '🏙️',
}

/** Lowercase, without accents: "Vinhaça" matches "vinhaca". */
const fold = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

interface ReferencesViewProps {
  references: LiteratureReference[]
  residues: ResidueRecord[]
  /** The residue filter (a residue's `nome`), controlled so other tabs can set it. */
  residue: string
  onResidueChange: (residue: string) => void
}

/** The knowledge base: every paper, filterable, with its citation ready to copy. */
export default function ReferencesView({ references, residues, residue, onResidueChange }: ReferencesViewProps) {
  const t = useTranslations('pages.scientific_database')
  const locale = useLocale()
  const nameOf = useResidueName()
  const [query, setQuery] = useState('')
  const [sectors, setSectors] = useState<SectorCode[]>([])
  const [validatedOnly, setValidatedOnly] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const residueOptions = useMemo(
    () =>
      residues
        .map((r) => ({ value: r.nome, label: nameOf(r) }))
        .sort((a, b) => a.label.localeCompare(b.label, locale)),
    [residues, nameOf, locale]
  )

  const filtered = useMemo(() => {
    const q = fold(query.trim())
    return references.filter(
      (ref) =>
        (!q || [ref.title, ref.authors, ref.journal].some((field) => field && fold(field).includes(q))) &&
        (!residue || ref.residue?.nome === residue) &&
        (sectors.length === 0 || (ref.sector !== null && sectors.includes(ref.sector))) &&
        (!validatedOnly || ref.validated)
    )
  }, [references, query, residue, sectors, validatedOnly])

  const hasFilters = Boolean(query || residue || sectors.length > 0 || validatedOnly)
  const clearFilters = () => {
    setQuery('')
    onResidueChange('')
    setSectors([])
    setValidatedOnly(false)
  }

  const copy = useCallback((text: string, key: string) => {
    navigator.clipboard
      ?.writeText(text)
      .then(() => {
        setCopied(key)
        setTimeout(() => setCopied((current) => (current === key ? null : current)), 2000)
      })
      .catch(() => {
        /* clipboard refused (permissions, insecure context): nothing to confirm */
      })
  }, [])

  const placeholders = { noAuthor: t('references_view.no_author'), noDate: t('references_view.no_date'), untitled: t('references_view.untitled') }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <aside className="lg:col-span-1 space-y-4">
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-md p-5 border border-green-200">
          <h2 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            {t('references_view.stats_heading')}
          </h2>
          <dl className="space-y-2">
            {[
              [t('references_view.total'), references.length],
              [t('references_view.residues'), residues.length],
              [t('references_view.validated'), references.filter((r) => r.validated).length],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between items-center">
                <dt className="text-sm text-green-700">{label}</dt>
                <dd className="font-bold text-green-900">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="bg-white text-gray-900 rounded-xl shadow-md p-5 border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Filter className="h-4 w-4" aria-hidden="true" />
            {t('references_view.filters')}
          </h2>

          <div className="mb-4">
            <label htmlFor="references-search" className="text-xs text-gray-600 block mb-1.5">
              {t('references_view.search')}
            </label>
            <div className="relative">
              <input
                id="references-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('references_view.search_placeholder')}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent pr-8"
              />
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="references-residue" className="text-xs font-medium text-gray-600 block mb-1.5">
              {t('references_view.residue_filter')}
            </label>
            <select
              id="references-residue"
              value={residue}
              onChange={(e) => onResidueChange(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
            >
              <option value="">{t('references_view.all_residues')}</option>
              {residueOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <fieldset className="mb-4">
            <legend className="text-xs font-medium text-gray-600 block mb-1.5">{t('references_view.sector_filter')}</legend>
            <div className="space-y-2">
              {SECTOR_CODES.map((code) => (
                <label key={code} className="flex items-center justify-between gap-2 text-sm group">
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={sectors.includes(code)}
                      onChange={(e) => setSectors((s) => (e.target.checked ? [...s, code] : s.filter((x) => x !== code)))}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="group-hover:text-gray-900">
                      <span aria-hidden="true">{SECTOR_EMOJI[code]} </span>
                      {t(`sectors.${code}`)}
                    </span>
                  </span>
                  <span className="text-xs text-gray-400">{references.filter((r) => r.sector === code).length}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="mb-4 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={validatedOnly}
              onChange={(e) => setValidatedOnly(e.target.checked)}
              className="rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            {t('references_view.validated_only')}
          </label>

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="w-full py-2 px-3 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
            >
              {t('references_view.clear')}
            </button>
          )}

          <p className="pt-3 mt-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-600" aria-live="polite">
            <span>{t('references_view.results', { count: filtered.length })}</span>
            {filtered.length < references.length && (
              <span className="text-xs text-gray-400">{t('references_view.of_total', { total: references.length })}</span>
            )}
          </p>
        </div>
      </aside>

      <div className="lg:col-span-3 space-y-4">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 border border-gray-100 text-center">
            <BookOpen className="h-16 w-16 mx-auto mb-4 text-gray-300" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">{t('references_view.empty')}</h2>
            <p className="text-gray-600 mb-4">{t('references_view.empty_hint')}</p>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition-colors"
              >
                {t('references_view.clear')}
              </button>
            )}
          </div>
        ) : (
          filtered.map((ref) => (
            <article
              key={ref.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-xl hover:border-green-200 transition-all duration-200 p-6"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-2 leading-tight">{ref.title || placeholders.untitled}</h3>
                  <p className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                    <BookOpen className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                    <span className="font-medium">{ref.authors || placeholders.noAuthor}</span>
                    <span className="text-gray-400" aria-hidden="true">•</span>
                    <span className="font-semibold text-green-700">{ref.year ?? placeholders.noDate}</span>
                  </p>
                  {ref.journal && <p className="text-sm text-gray-500 italic">{ref.journal}</p>}
                </div>
                {ref.validated && (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 rounded-full text-xs font-semibold border border-blue-200 whitespace-nowrap shadow-sm">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('references_view.validated_badge')}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {ref.sector && (
                  <span className="px-3 py-1 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-800 rounded-lg text-xs font-semibold border border-gray-200">
                    {t(`sectors.${ref.sector}`)}
                  </span>
                )}
                {ref.residue && (
                  <span className="px-3 py-1 bg-gradient-to-r from-green-50 to-green-100 text-green-800 rounded-lg text-xs font-medium border border-green-200">
                    {nameOf(ref.residue)}
                  </span>
                )}
              </div>

              {(ref.doi || ref.url) && (
                <div className="flex flex-wrap items-center gap-3 mb-4 text-sm">
                  {ref.doi && (
                    <span className="flex items-center gap-2 text-gray-600">
                      <span className="font-semibold text-gray-500">DOI:</span>
                      <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded border border-gray-200">{ref.doi}</span>
                    </span>
                  )}
                  {(ref.url || ref.doi) && (
                    <a
                      href={ref.url || `https://doi.org/${ref.doi}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 font-semibold rounded-lg transition-all shadow-sm hover:shadow-md"
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      {t('references_view.open_paper')}
                    </a>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide mr-1">{t('references_view.cite')}</span>
                {([
                  ['apa', 'APA', () => toApa(ref, placeholders)],
                  ['bib', 'BibTeX', () => toBibtex(ref)],
                ] as const).map(([format, label, build]) => {
                  const key = `${ref.id}-${format}`
                  return (
                    <button
                      key={format}
                      type="button"
                      onClick={() => copy(build(), key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                        copied === key ? 'bg-green-50 border-green-300 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {copied === key ? t('references_view.copied') : label}
                    </button>
                  )
                })}
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  )
}

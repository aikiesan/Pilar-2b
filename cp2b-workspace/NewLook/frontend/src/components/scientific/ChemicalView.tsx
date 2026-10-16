'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { BookOpen, ChevronRight, ExternalLink } from 'lucide-react'
import { useFormat } from '@/hooks/useFormat'
import { useResidueName } from '@/hooks/useResidueName'
import { MISSING_VALUE } from '@/lib/format'
import { CN_LEVEL_COLORS, cnLevel, type ResidueRecord } from '@/types/scientific'

interface ChemicalViewProps {
  residues: ResidueRecord[]
  /** The residue picked in the residue list: scrolled to and highlighted. */
  focusId: number | null
  onShowReferences: (residue: ResidueRecord) => void
}

type Formatters = ReturnType<typeof useFormat>

/** "275.3 (220–320)": a mean with its literature range, when there is one. */
function withRange(format: Formatters, mean: number | null | undefined, min?: number | null, max?: number | null): string {
  if (mean === null || mean === undefined) return MISSING_VALUE
  const value = format.number(mean, { decimals: 1 })
  if (min === null || min === undefined || max === null || max === undefined) return value
  return `${value} (${format.number(min, { decimals: 0 })}–${format.number(max, { decimals: 0 })})`
}

function ResidueCard({ residue, focused, onShowReferences }: { residue: ResidueRecord; focused: boolean; onShowReferences: () => void }) {
  const t = useTranslations('pages.scientific_database')
  const format = useFormat()
  const nameOf = useResidueName()
  const level = cnLevel(residue.chemical_cn_ratio)
  const references = residue.reference_count ?? 0
  const studies = residue.bmp_n_studies || references

  return (
    <article
      id={`residue-${residue.id}`}
      aria-labelledby={`residue-${residue.id}-name`}
      className={`bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-xl hover:border-terra-300 transition-all duration-200 scroll-mt-24 ${
        focused ? 'border-terra-500 ring-2 ring-terra-500' : 'border-gray-200'
      }`}
    >
      <div className="px-5 pt-5 pb-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-start justify-between gap-3">
          <h3 id={`residue-${residue.id}-name`} className="text-lg font-bold text-gray-900 leading-tight flex-1">
            {nameOf(residue)}
          </h3>
          <span className="flex-shrink-0 px-2.5 py-1 bg-white text-gray-600 text-xs font-semibold rounded-lg border border-gray-200 shadow-sm">
            {t(`sectors.${residue.sector_codigo}`)}
          </span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="flex justify-between items-center gap-2">
          <span className="text-sm text-gray-600">BMP</span>
          <span className="font-mono font-semibold text-gray-900 text-right">
            {withRange(format, residue.bmp_medio, residue.bmp_min, residue.bmp_max)} {t('units.bmp_short')}
            {studies > 0 && <span className="ml-1 text-xs text-gray-500 font-normal">(n={studies})</span>}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center p-2.5 bg-dusk-50 rounded-lg border border-dusk-100">
            <div className="font-bold text-dusk-900 text-sm">
              {residue.ts_medio != null ? format.percent(residue.ts_medio) : MISSING_VALUE}
            </div>
            {residue.ts_min != null && residue.ts_max != null && (
              <div className="text-dusk-600 text-[10px]">
                ({format.number(residue.ts_min, { decimals: 0 })}–{format.number(residue.ts_max, { decimals: 0 })})
              </div>
            )}
            <div className="text-dusk-600 font-medium mt-0.5">{t('units.ts')}</div>
          </div>
          <div className="text-center p-2.5 bg-terra-50 rounded-lg border border-terra-100">
            <div className="font-bold text-terra-900 text-sm">
              {residue.vs_medio != null ? format.percent(residue.vs_medio) : MISSING_VALUE}
            </div>
            {residue.vs_min != null && residue.vs_max != null && (
              <div className="text-terra-600 text-[10px]">
                ({format.number(residue.vs_min, { decimals: 0 })}–{format.number(residue.vs_max, { decimals: 0 })})
              </div>
            )}
            <div className="text-terra-600 font-medium mt-0.5">{t('units.vs')}</div>
          </div>
          <div className="text-center p-2.5 bg-amber-50 rounded-lg border border-amber-100" title={level ? t(`cn.${level}`) : undefined}>
            <div className="font-bold text-sm" style={{ color: level ? CN_LEVEL_COLORS[level] : undefined }}>
              {residue.chemical_cn_ratio ? `${format.number(residue.chemical_cn_ratio, { decimals: 1 })}:1` : MISSING_VALUE}
            </div>
            <div className="text-amber-600 font-medium mt-0.5">C:N</div>
            {/* The color is not the only cue: the level is also written out. */}
            {level && <span className="sr-only">{t(`cn.${level}`)}</span>}
          </div>
        </div>

        {Boolean(residue.ph || residue.chemical_ch4_content) && (
          <dl className="space-y-2 text-sm">
            {residue.ph ? (
              <div className="flex justify-between">
                <dt className="text-gray-600">pH</dt>
                <dd className="font-mono font-semibold text-gray-900">{format.number(residue.ph, { decimals: 1 })}</dd>
              </div>
            ) : null}
            {residue.chemical_ch4_content ? (
              <div className="flex justify-between">
                <dt className="text-gray-600">CH₄</dt>
                <dd className="font-mono font-semibold text-gray-900">{format.percent(residue.chemical_ch4_content)}</dd>
              </div>
            ) : null}
          </dl>
        )}
      </div>

      <div className="px-5 py-4 bg-gradient-to-r from-dusk-50 to-dusk-50 border-t border-dusk-100">
        {residue.primary_doi && (
          <a
            href={`https://doi.org/${residue.primary_doi}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 mb-3 text-sm text-dusk-700 hover:text-dusk-900 font-medium group"
          >
            <ExternalLink className="h-4 w-4 flex-shrink-0 group-hover:scale-110 transition-transform" aria-hidden="true" />
            <span className="truncate">DOI: {residue.primary_doi}</span>
          </a>
        )}

        <button
          type="button"
          onClick={onShowReferences}
          className="w-full flex items-center justify-between gap-3 px-4 py-2.5 bg-white hover:bg-dusk-50 rounded-lg transition-all text-left border border-dusk-200 hover:border-dusk-300 shadow-sm hover:shadow group"
        >
          <span className="flex items-center gap-2.5">
            <BookOpen className="w-4 h-4 text-dusk-600 group-hover:text-dusk-700" aria-hidden="true" />
            <span className="text-sm font-semibold text-gray-800 group-hover:text-dusk-900">
              {references > 0 ? t('chemical_view.references', { count: references }) : t('chemical_view.see_references')}
            </span>
          </span>
          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-dusk-600 transition-colors" aria-hidden="true" />
        </button>

        {residue.main_reference && (
          <p className="mt-2 text-xs text-gray-500 line-clamp-2" title={residue.main_reference}>
            {residue.main_reference}
          </p>
        )}
      </div>
    </article>
  )
}

/** The chemical characterization of every residue, one card each. */
export default function ChemicalView({ residues, focusId, onShowReferences }: ChemicalViewProps) {
  const t = useTranslations('pages.scientific_database')

  useEffect(() => {
    if (focusId === null) return
    document.getElementById(`residue-${focusId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [focusId])

  if (residues.length === 0) {
    return <p className="bg-white rounded-xl shadow-md p-8 border border-gray-100 text-center text-gray-500">{t('chemical_view.empty')}</p>
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {residues.map((residue) => (
        <ResidueCard
          key={residue.id}
          residue={residue}
          focused={residue.id === focusId}
          onShowReferences={() => onShowReferences(residue)}
        />
      ))}
    </div>
  )
}

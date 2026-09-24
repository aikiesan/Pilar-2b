'use client'

import { useTranslations } from 'next-intl'
import { useFormat } from '@/hooks/useFormat'
import { useResidueName } from '@/hooks/useResidueName'
import type { ResidueRecord, SectorSummary } from '@/types/scientific'

interface ResidueListViewProps {
  residues: ResidueRecord[]
  sectors: SectorSummary[]
  /** Opens a residue's chemical characterization. */
  onSelect: (residue: ResidueRecord) => void
}

/** Every residue of the database, grouped by sector. */
export default function ResidueListView({ residues, sectors, onSelect }: ResidueListViewProps) {
  const t = useTranslations('pages.scientific_database')
  const format = useFormat()
  const nameOf = useResidueName()

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <h2 className="text-lg font-semibold text-gray-900">{t('residues_view.heading')}</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {t('residues_view.count', { residues: residues.length, sectors: sectors.length })}
        </p>
      </div>

      <div className="divide-y divide-gray-100">
        {sectors.map((sector) => {
          const sectorResidues = residues.filter((r) => r.sector_codigo === sector.codigo)
          if (sectorResidues.length === 0) return null

          return (
            <section key={sector.codigo} className="p-6" aria-labelledby={`sector-${sector.codigo}`}>
              <div className="flex items-center gap-3 mb-4">
                {sector.emoji && <span className="text-2xl" aria-hidden="true">{sector.emoji}</span>}
                <div>
                  <h3 id={`sector-${sector.codigo}`} className="font-semibold text-gray-900">
                    {t(`sectors.${sector.codigo}`)}
                  </h3>
                  <p className="text-xs text-gray-500">{t('residues_view.sector_count', { count: sectorResidues.length })}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {sectorResidues.map((residue) => (
                  <button
                    key={residue.id}
                    type="button"
                    onClick={() => onSelect(residue)}
                    className="text-left p-3 bg-gray-50 hover:bg-green-50 rounded-lg border border-gray-200 hover:border-green-300 transition-all group"
                  >
                    <div className="font-medium text-gray-900 group-hover:text-green-700 text-sm leading-tight">
                      {residue.icon && <span className="mr-1.5" aria-hidden="true">{residue.icon}</span>}
                      {nameOf(residue)}
                    </div>
                    {residue.bmp_medio ? (
                      <div className="text-xs text-gray-500 mt-1 font-mono">
                        BMP: {format.number(residue.bmp_medio, { decimals: 0 })} {t('units.bmp_short')}
                      </div>
                    ) : null}
                  </button>
                ))}
              </div>
            </section>
          )
        })}
      </div>

      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
        <p className="text-xs text-gray-500 text-center">{t('residues_view.hint')}</p>
      </div>
    </div>
  )
}

'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { GitCompare, Trophy } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useFormat } from '@/hooks/useFormat'
import { useResidueName } from '@/hooks/useResidueName'
import type { ResidueRecord } from '@/types/scientific'
import { SERIES_COLORS } from './seriesColors'

const MAX_SELECTED = 5
const CN_OPTIMUM = 25 // middle of the 20–30 band

type ParameterKey = 'bmp_medio' | 'vs_medio' | 'chemical_cn_ratio' | 'chemical_ch4_content'

/** How the best value of a parameter is chosen. */
const PARAMETERS: Array<{ key: ParameterKey; id: 'bmp' | 'vs' | 'cn' | 'ch4'; color: string; best: 'highest' | 'closest_to_optimum' }> = [
  { key: 'bmp_medio', id: 'bmp', color: '#1E5128', best: 'highest' },
  { key: 'vs_medio', id: 'vs', color: '#4E9F3D', best: 'highest' },
  { key: 'chemical_cn_ratio', id: 'cn', color: '#3B82F6', best: 'closest_to_optimum' },
  { key: 'chemical_ch4_content', id: 'ch4', color: '#F59E0B', best: 'highest' },
]

/** A parameter's value, or null when missing or zero (zero means "not measured" here). */
const valueOf = (residue: ResidueRecord, key: ParameterKey): number | null => residue[key] || null

function bestIndex(values: Array<number | null>, best: 'highest' | 'closest_to_optimum'): number | null {
  let bestAt: number | null = null
  values.forEach((value, i) => {
    if (value === null) return
    if (bestAt === null) {
      bestAt = i
      return
    }
    const current = values[bestAt] as number
    const better = best === 'highest' ? value > current : Math.abs(value - CN_OPTIMUM) < Math.abs(current - CN_OPTIMUM)
    if (better) bestAt = i
  })
  return bestAt
}

/** Side-by-side chemical parameters of up to five residues. */
export default function ComparisonView({ residues }: { residues: ResidueRecord[] }) {
  const t = useTranslations('pages.scientific_database')
  const format = useFormat()
  const nameOf = useResidueName()
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const selected = useMemo(
    () => selectedIds.map((id) => residues.find((r) => r.id === id)).filter((r): r is ResidueRecord => !!r),
    [residues, selectedIds]
  )
  const label = (id: (typeof PARAMETERS)[number]['id']) =>
    t(`comparison_view.params.${id}`, { bmp_unit: t('units.bmp_short'), vs_unit: t('units.vs_of_ts') })

  const chartData = selected.map((residue) => ({
    residue: nameOf(residue),
    ...Object.fromEntries(PARAMETERS.map((p) => [p.id, valueOf(residue, p.key)])),
  }))

  const toggle = (id: number) =>
    setSelectedIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : ids.length < MAX_SELECTED ? [...ids, id] : ids
    )

  return (
    <>
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">{t('comparison_view.select_heading', { max: MAX_SELECTED })}</h2>
        <div className="flex flex-wrap gap-2">
          {residues.map((residue) => {
            const index = selectedIds.indexOf(residue.id)
            return (
              <button
                key={residue.id}
                type="button"
                aria-pressed={index >= 0}
                onClick={() => toggle(residue.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  index >= 0 ? 'text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={index >= 0 ? { backgroundColor: SERIES_COLORS[index % SERIES_COLORS.length] } : undefined}
              >
                {nameOf(residue)}
              </button>
            )
          })}
        </div>
      </div>

      {selected.length < 2 ? (
        <div className="bg-white rounded-xl shadow-md p-8 border border-gray-100 text-center">
          <GitCompare className="h-12 w-12 mx-auto mb-3 text-gray-300" aria-hidden="true" />
          <p className="text-lg font-medium text-gray-900 mb-1">{t('comparison_view.need_two')}</p>
          <p className="text-sm text-gray-500">{t('comparison_view.need_two_hint')}</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">{t('comparison_view.chart_heading')}</h2>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="residue" />
                  <YAxis tickFormatter={(v: number) => format.number(v)} />
                  <Tooltip formatter={(v) => (typeof v === 'number' ? format.number(v, { decimals: 1 }) : v)} />
                  <Legend />
                  {PARAMETERS.map((p) => (
                    <Bar key={p.id} dataKey={p.id} fill={p.color} name={label(p.id)} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">{t('comparison_view.table_heading')}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="border-b border-gray-200">
                    <th scope="col" className="text-left py-3 px-4 font-semibold text-gray-700">{t('comparison_view.col_parameter')}</th>
                    {selected.map((residue, i) => (
                      <th
                        key={residue.id}
                        scope="col"
                        className="text-center py-3 px-4 font-semibold"
                        style={{ color: SERIES_COLORS[i % SERIES_COLORS.length] }}
                      >
                        {nameOf(residue)}
                      </th>
                    ))}
                    <th scope="col" className="text-center py-3 px-4 font-semibold text-gray-700">{t('comparison_view.col_best')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {PARAMETERS.map((p) => {
                    const values = selected.map((residue) => valueOf(residue, p.key))
                    const best = bestIndex(values, p.best)
                    return (
                      <tr key={p.id}>
                        <th scope="row" className="py-3 px-4 text-left font-medium text-gray-900">{label(p.id)}</th>
                        {values.map((value, i) => (
                          <td key={selected[i].id} className={`py-3 px-4 text-center ${i === best ? 'bg-green-50 font-semibold' : ''}`}>
                            {value === null ? (
                              <span className="text-xs text-gray-400 italic">{t('comparison_view.no_data')}</span>
                            ) : (
                              <>
                                <span className="font-mono">{format.number(value, { decimals: 1, minDecimals: 1 })}</span>
                                {i === best && <Trophy className="inline ml-1 h-3 w-3 text-yellow-500" aria-label={t('comparison_view.col_best')} />}
                              </>
                            )}
                          </td>
                        ))}
                        <td className="py-3 px-4 text-center">
                          {best === null ? (
                            <span className="text-xs text-gray-400 italic">{t('comparison_view.no_data')}</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">{nameOf(selected[best])}</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  )
}

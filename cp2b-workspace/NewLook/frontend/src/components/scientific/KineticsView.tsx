'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { AlertCircle, Filter, Info } from 'lucide-react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useFormat } from '@/hooks/useFormat'
import { useResidueName } from '@/hooks/useResidueName'
import { MISSING_VALUE } from '@/lib/format'
import {
  KINETIC_COLORS,
  KINETIC_CONSTANTS,
  bmpErrorPercent,
  generateKineticCurve,
  type KineticClassification,
  type KineticData,
} from '@/types/scientific'
import { SERIES_COLORS } from './seriesColors'

const MAX_SELECTED = 6
/** Curves drawn before anything is selected. */
const DEFAULT_SHOWN = 4
const DAYS = 30

const CLASS_KEY = {
  slow: 'slow',
  medium: 'medium',
  'medium-fast': 'medium_fast',
  fast: 'fast',
} as const satisfies Record<KineticClassification, string>

const isKnownClass = (value: string): value is KineticClassification => value in CLASS_KEY

/** Methane production curves and the three-fraction parameters behind them. */
export default function KineticsView({ kinetics }: { kinetics: KineticData[] }) {
  const t = useTranslations('pages.scientific_database')
  const format = useFormat()
  const nameOfResidue = useResidueName()
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const nameOf = (k: KineticData) => nameOfResidue({ nome: k.residue_name, nome_en: k.residue_name_en })
  const shown = useMemo(
    () =>
      selectedIds.length > 0
        ? selectedIds.map((id) => kinetics.find((k) => k.residue_id === id)).filter((k): k is KineticData => !!k)
        : kinetics.slice(0, DEFAULT_SHOWN),
    [kinetics, selectedIds]
  )
  const showBand = selectedIds.length === 1

  // One row per day; one column per residue (keyed by id, so names never collide).
  const curveData = useMemo(() => {
    const curves = shown.map((k) => ({ id: k.residue_id, points: generateKineticCurve(k, DAYS) }))
    return Array.from({ length: DAYS + 1 }, (_, day) => {
      const row: Record<string, number> = { day }
      for (const { id, points } of curves) {
        row[`r${id}`] = points[day]?.yield ?? 0
        if (showBand) {
          row[`r${id}_low`] = points[day]?.yield_low ?? 0
          row[`r${id}_high`] = points[day]?.yield_high ?? 0
        }
      }
      return row
    })
  }, [shown, showBand])

  const toggle = (id: number) =>
    setSelectedIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : ids.length < MAX_SELECTED ? [...ids, id] : ids
    )
  const colorOf = (id: number) => SERIES_COLORS[Math.max(0, shown.findIndex((k) => k.residue_id === id)) % SERIES_COLORS.length]
  const classLabel = (c: string) => (isKnownClass(c) ? t(`kinetics_view.classes.${CLASS_KEY[c]}`) : c)
  const yieldUnit = t('units.bmp')
  const fraction = (v: number) => format.number(v, { decimals: 3, minDecimals: 3 })

  return (
    <>
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Filter className="h-5 w-5 text-green-600" aria-hidden="true" />
          {t('kinetics_view.select_heading')}
        </h2>
        <div className="flex flex-wrap gap-2">
          {kinetics.map((k) => {
            const selected = selectedIds.includes(k.residue_id)
            return (
              <button
                key={k.residue_id}
                type="button"
                aria-pressed={selected}
                onClick={() => toggle(k.residue_id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  selected ? 'text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={selected ? { backgroundColor: colorOf(k.residue_id) } : undefined}
              >
                {nameOf(k)}
              </button>
            )
          })}
        </div>
        {selectedIds.length === 0 && kinetics.length > 0 && (
          <p className="text-sm text-gray-500 mt-2">
            {t('kinetics_view.select_hint', { max: MAX_SELECTED, shown: Math.min(DEFAULT_SHOWN, kinetics.length) })}
          </p>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">{t('kinetics_view.curves_heading')}</h2>
        {kinetics.length === 0 ? (
          <div className="h-[400px] flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <div className="text-center p-6">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" aria-hidden="true" />
              <p className="text-gray-600 font-medium mb-2">{t('kinetics_view.no_data')}</p>
              <p className="text-sm text-gray-500">{t('kinetics_view.no_data_hint')}</p>
            </div>
          </div>
        ) : (
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={curveData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" label={{ value: t('kinetics_view.axis_time'), position: 'insideBottom', offset: -5 }} />
                <YAxis label={{ value: t('kinetics_view.axis_yield', { unit: yieldUnit }), angle: -90, position: 'insideLeft' }} />
                <Tooltip
                  formatter={(value) =>
                    typeof value === 'number' ? `${format.number(value, { decimals: 1, minDecimals: 1 })} ${yieldUnit}` : value
                  }
                  labelFormatter={(day) => t('kinetics_view.tooltip_day', { day: String(day) })}
                />
                <Legend />
                {showBand &&
                  shown.flatMap((k) =>
                    ['low', 'high'].map((bound) => (
                      <Line
                        key={`r${k.residue_id}_${bound}`}
                        type="monotone"
                        dataKey={`r${k.residue_id}_${bound}`}
                        stroke={colorOf(k.residue_id)}
                        strokeWidth={1}
                        strokeDasharray="4 3"
                        strokeOpacity={0.5}
                        dot={false}
                        legendType="none"
                        tooltipType="none"
                      />
                    ))
                  )}
                {shown.map((k) => (
                  <Line
                    key={k.residue_id}
                    type="monotone"
                    dataKey={`r${k.residue_id}`}
                    name={nameOf(k)}
                    stroke={colorOf(k.residue_id)}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
            <p className="mt-2 text-xs text-gray-500">
              {t('kinetics_view.curve_note')} {showBand ? t('kinetics_view.band_note_single') : t('kinetics_view.band_note_multi')}
            </p>
          </div>
        )}
      </div>

      {kinetics.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">{t('kinetics_view.table_heading')}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-200">
                  <th scope="col" className="text-left py-3 px-4 font-semibold text-gray-700">{t('kinetics_view.col_residue')}</th>
                  <th scope="col" className="text-center py-3 px-4 font-semibold text-gray-700">{t('kinetics_view.col_class')}</th>
                  <th scope="col" className="text-center py-3 px-4 font-semibold text-gray-700">f_slow</th>
                  <th scope="col" className="text-center py-3 px-4 font-semibold text-gray-700">f_med</th>
                  <th scope="col" className="text-center py-3 px-4 font-semibold text-gray-700">f_fast</th>
                  <th scope="col" className="text-center py-3 px-4 font-semibold text-gray-700">FQ</th>
                  <th scope="col" className="text-right py-3 px-4 font-semibold text-gray-700">{t('kinetics_view.col_bmp_exp')}</th>
                  <th scope="col" className="text-right py-3 px-4 font-semibold text-gray-700">{t('kinetics_view.col_bmp_sim')}</th>
                  <th scope="col" className="text-center py-3 px-4 font-semibold text-gray-700">{t('kinetics_view.col_error')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {kinetics.map((k) => {
                  const error = bmpErrorPercent(k.bmp_experimental, k.bmp_simulated)
                  return (
                    <tr key={k.residue_id} className="hover:bg-gray-50">
                      <th scope="row" className="py-3 px-4 text-left font-medium text-gray-900">{nameOf(k)}</th>
                      <td className="py-3 px-4 text-center">
                        <span
                          className="px-2 py-1 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: isKnownClass(k.classification) ? KINETIC_COLORS[k.classification] : '#6B7280' }}
                        >
                          {classLabel(k.classification)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-gray-600">{fraction(k.f_slow)}</td>
                      <td className="py-3 px-4 text-center font-mono text-gray-600">{fraction(k.f_med)}</td>
                      <td className="py-3 px-4 text-center font-mono text-gray-600">{fraction(k.f_fast)}</td>
                      <td className="py-3 px-4 text-center font-mono font-semibold text-green-600">{fraction(k.fq)}</td>
                      <td className="py-3 px-4 text-right font-mono text-gray-900">{format.number(k.bmp_experimental, { decimals: 1 })}</td>
                      <td className="py-3 px-4 text-right font-mono text-gray-900">{format.number(k.bmp_simulated, { decimals: 1 })}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`text-xs font-medium ${error !== null && Math.abs(error) < 5 ? 'text-green-600' : 'text-amber-600'}`}>
                          {error === null ? MISSING_VALUE : `${error > 0 ? '+' : ''}${format.percent(error, { decimals: 1, minDecimals: 1 })}`}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
              <Info className="h-4 w-4" aria-hidden="true" />
              {t('kinetics_view.model_heading')}
            </h3>
            <ul className="text-sm text-blue-700 space-y-1">
              {(['slow', 'med', 'fast'] as const).map((part) => (
                <li key={part}>
                  <strong>k_{part}</strong> = {format.number(KINETIC_CONSTANTS[`k_${part}`], { decimals: 2 })} d⁻¹ (
                  {t(`kinetics_view.fraction_${part}`)})
                </li>
              ))}
            </ul>
            <p className="text-sm text-blue-700 mt-2">
              {t.rich('kinetics_view.fq_note', { strong: (chunks) => <strong>{chunks}</strong> })}
            </p>
          </div>
        </div>
      )}
    </>
  )
}

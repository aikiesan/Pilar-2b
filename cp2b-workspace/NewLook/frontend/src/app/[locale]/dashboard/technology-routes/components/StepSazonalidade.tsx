'use client'

import { useTranslations } from 'next-intl'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell
} from 'recharts'
import { useFormat } from '@/hooks/useFormat'
import { isLivestockActivity, type ActivityType } from '../calculatorEngine'

// Default safra SP: Apr (4) → Dec (12)
export const DEFAULT_CANE_MONTHS = [4,5,6,7,8,9,10,11,12]
export const ALL_MONTHS = [1,2,3,4,5,6,7,8,9,10,11,12]

interface Props {
  activeMonths: number[]
  activityType: ActivityType | null
  onChange: (months: number[]) => void
  onNext: () => void
  onBack: () => void
}

export default function StepSazonalidade({ activeMonths, activityType, onChange, onNext, onBack }: Props) {
  const t = useTranslations('calculator')
  const format = useFormat()

  const toggle = (m: number) => {
    if (activeMonths.includes(m)) {
      const next = activeMonths.filter(x => x !== m)
      if (next.length > 0) onChange(next)  // keep at least 1 month
    } else {
      onChange([...activeMonths, m].sort((a,b) => a-b))
    }
  }

  const chartData = ALL_MONTHS.map(month => ({
    label: format.month(month),
    month,
    value: activeMonths.includes(month) ? 1 : 0,
  }))

  return (
    <div className="space-y-5">
      <div className="text-center">
        <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">
          {activityType === 'sugarcane'
            ? t('step3.caneNote')
            : isLivestockActivity(activityType)
              ? t('step3.livestockNote')
              : t('step3.cropNote')}
        </p>
        <p className="text-xs text-gray-400 dark:text-slate-500">{t('step3.toggleHint')}</p>
      </div>

      {/* Visual bar chart */}
      <div className="h-36 w-full min-w-0">
        <ResponsiveContainer width="100%" height={144}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis hide />
            <Bar dataKey="value" radius={[4,4,0,0]}>
              {chartData.map(d => (
                <Cell
                  key={d.month}
                  fill={d.value === 1 ? '#16a34a' : '#e5e7eb'}
                  cursor="pointer"
                  onClick={() => toggle(d.month)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Month toggle buttons */}
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
        {ALL_MONTHS.map(m => {
          const active = activeMonths.includes(m)
          return (
            <button
              key={m}
              onClick={() => toggle(m)}
              aria-pressed={active}
              aria-label={format.month(m, 'long')}
              className={`py-1.5 rounded-lg text-xs font-medium border transition-colors
                ${active
                  ? 'bg-green-700 text-white border-green-600'
                  : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 border-gray-300 dark:border-slate-600 hover:border-green-400 dark:hover:border-emerald-500'}`}
            >
              {format.month(m)}
            </button>
          )
        })}
      </div>

      <p className="text-center text-xs text-gray-500 dark:text-slate-400">
        {t('step3.monthsActive', { count: activeMonths.length })}
        {activityType === 'sugarcane' && activeMonths.length < 6 && (
          <span className="ml-2 text-amber-500">⚠ {t('step3.shortSafraWarning')}</span>
        )}
      </p>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 rounded-xl font-medium text-gray-600 dark:text-slate-300 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
        >
          ← {t('common.back')}
        </button>
        <button
          onClick={onNext}
          className="flex-1 py-3 rounded-xl font-semibold text-white bg-green-700 hover:bg-green-800 transition-colors"
        >
          {t('common.next')} →
        </button>
      </div>
    </div>
  )
}

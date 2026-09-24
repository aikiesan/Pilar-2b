'use client'

/**
 * FactorRangeSliders - Interactive sliders for correction factors
 * Allows adjusting FC, FCp, FS, FL with real-time FDE preview
 */

import React from 'react'
import { useTranslations } from 'next-intl'
import { SlidersHorizontal, RotateCcw, Info } from 'lucide-react'
import {
  CorrectionFactors,
  calculateFDE,
  DEFAULT_FACTORS,
  FACTOR_RANGES,
} from '@/types/analysis'
import { useFormat } from '@/hooks/useFormat'

interface FactorRangeSlidersProps {
  factors: CorrectionFactors
  onChange: (factors: CorrectionFactors) => void
  showFDEPreview?: boolean
  compact?: boolean
}

const FACTOR_ORDER: (keyof CorrectionFactors)[] = ['fc', 'fcp', 'fs', 'fl']

/** Red/amber/green by position in the factor's range; FCp is inverted (less competition is better). */
function factorColor(key: keyof CorrectionFactors, value: number): string {
  const range = FACTOR_RANGES[key]
  const normalized = (value - range.min) / (range.max - range.min)

  if (key === 'fcp') {
    if (normalized > 0.7) return 'text-red-600'
    if (normalized > 0.4) return 'text-yellow-600'
    return 'text-green-600'
  }

  if (normalized < 0.3) return 'text-red-600'
  if (normalized < 0.6) return 'text-yellow-600'
  return 'text-green-600'
}

function FactorSlider({
  factor,
  value,
  onChange,
}: {
  factor: keyof CorrectionFactors
  value: number
  onChange: (value: number) => void
}) {
  const t = useTranslations('analysis')
  const format = useFormat()
  const range = FACTOR_RANGES[factor]
  const percent = (v: number) => format.percent(v * 100, { decimals: 0 })

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1">
          <label htmlFor={`factor-${factor}`} className="text-xs font-medium text-gray-600">
            {t(`factors.${factor}_label`)}
          </label>
          <div className="group relative">
            <Info className="h-3 w-3 text-gray-400 cursor-help" />
            <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block w-48 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
              {t(`factor_docs.${factor}_desc`)}
            </div>
          </div>
        </div>
        <span className={`text-xs font-mono font-semibold ${factorColor(factor, value)}`}>{percent(value)}</span>
      </div>
      <input
        id={`factor-${factor}`}
        type="range"
        min={range.min}
        max={range.max}
        step={range.step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer ${
          factor === 'fcp' ? 'accent-orange-500' : 'accent-green-600'
        }`}
      />
      <div className="flex justify-between text-xs text-gray-400 mt-0.5">
        <span>{percent(range.min)}</span>
        <span>{percent(range.max)}</span>
      </div>
    </div>
  )
}

export default function FactorRangeSliders({
  factors,
  onChange,
  showFDEPreview = true,
  compact = false,
}: FactorRangeSlidersProps) {
  const t = useTranslations('analysis')
  const format = useFormat()
  const fdeValue = calculateFDE(factors)
  const decimal = (v: number, digits = 2) => format.number(v, { decimals: digits, minDecimals: digits })

  return (
    <div className="bg-white rounded-xl shadow-md p-3 border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5 text-green-600" />
          <h4 className="text-sm font-semibold text-gray-700">{t('factor_sliders.heading')}</h4>
        </div>
        <button
          onClick={() => onChange(DEFAULT_FACTORS)}
          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
          title={t('factor_sliders.reset_title')}
        >
          <RotateCcw className="h-3 w-3" />
          {t('factor_sliders.reset')}
        </button>
      </div>

      {showFDEPreview && (
        <div className="mb-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-100">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">{t('factor_sliders.resulting_fde')}</span>
            <span
              className={`text-lg font-mono font-bold ${
                fdeValue >= 0.5 ? 'text-green-600' : fdeValue >= 0.3 ? 'text-yellow-600' : 'text-red-600'
              }`}
            >
              {format.percent(fdeValue * 100, { decimals: 1, minDecimals: 1 })}
            </span>
          </div>
          <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                fdeValue >= 0.5 ? 'bg-green-500' : fdeValue >= 0.3 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${fdeValue * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className={compact ? 'space-y-3' : 'space-y-4'}>
        {FACTOR_ORDER.map((factor) => (
          <FactorSlider
            key={factor}
            factor={factor}
            value={factors[factor]}
            onChange={(value) => onChange({ ...factors, [factor]: value })}
          />
        ))}
      </div>

      {/* Formula display */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <div className="text-xs text-gray-500 text-center font-mono">{t('methodology_panel.formula')}</div>
        <div className="text-xs text-gray-400 text-center mt-1">
          {decimal(factors.fc)} × {decimal(1 - factors.fcp)} × {decimal(factors.fs)} × {decimal(factors.fl)} ={' '}
          {decimal(fdeValue, 3)}
        </div>
      </div>
    </div>
  )
}

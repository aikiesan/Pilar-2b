'use client'

/**
 * FactorRangeSliders - Interactive sliders for correction factors
 * Allows adjusting FC, FCp, FS, FL with real-time FDE preview
 */

import React from 'react'
import { SlidersHorizontal, RotateCcw, Info } from 'lucide-react'
import {
  CorrectionFactors,
  calculateFDE,
  DEFAULT_FACTORS,
  FACTOR_RANGES,
  FACTOR_DOCUMENTATION
} from '@/types/analysis'

interface FactorRangeSlidersProps {
  factors: CorrectionFactors
  onChange: (factors: CorrectionFactors) => void
  showFDEPreview?: boolean
  compact?: boolean
}

export default function FactorRangeSliders({
  factors,
  onChange,
  showFDEPreview = true,
  compact = false
}: FactorRangeSlidersProps) {
  const fdeValue = calculateFDE(factors)

  // Handle individual factor change
  const handleFactorChange = (key: keyof CorrectionFactors, value: number) => {
    onChange({
      ...factors,
      [key]: value
    })
  }

  // Reset to defaults
  const handleReset = () => {
    onChange(DEFAULT_FACTORS)
  }

  // Get factor color based on value relative to range
  const getFactorColor = (key: keyof CorrectionFactors, value: number): string => {
    const range = FACTOR_RANGES[key]
    const normalized = (value - range.min) / (range.max - range.min)

    // For FCp, lower is better (less competition)
    if (key === 'fcp') {
      if (normalized > 0.7) return 'text-red-600'
      if (normalized > 0.4) return 'text-yellow-600'
      return 'text-green-600'
    }

    // For other factors, higher is better
    if (normalized < 0.3) return 'text-red-600'
    if (normalized < 0.6) return 'text-yellow-600'
    return 'text-green-600'
  }

  // Get slider track color
  const getSliderColor = (key: keyof CorrectionFactors): string => {
    if (key === 'fcp') return 'accent-orange-500'
    return 'accent-green-600'
  }

  // Get factor documentation
  const getDocumentation = (key: keyof CorrectionFactors) => {
    return FACTOR_DOCUMENTATION.find(doc => doc.factor === key)
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-3 border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5 text-green-600" />
          <h4 className="text-sm font-semibold text-gray-700">
            Fatores de Correcao
          </h4>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
          title="Resetar para valores padrao"
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </button>
      </div>

      {showFDEPreview && (
        <div className="mb-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-100">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">FDE Resultante:</span>
            <span className={`text-lg font-mono font-bold ${
              fdeValue >= 0.5 ? 'text-green-600' :
              fdeValue >= 0.3 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {(fdeValue * 100).toFixed(1)}%
            </span>
          </div>
          <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                fdeValue >= 0.5 ? 'bg-green-500' :
                fdeValue >= 0.3 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${fdeValue * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className={`space-y-${compact ? '3' : '4'}`}>
        {/* FC - Collection Factor */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1">
              <label className="text-xs font-medium text-gray-600">
                FC - Coleta
              </label>
              <div className="group relative">
                <Info className="h-3 w-3 text-gray-400 cursor-help" />
                <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block w-48 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
                  {getDocumentation('fc')?.description}
                </div>
              </div>
            </div>
            <span className={`text-xs font-mono font-semibold ${getFactorColor('fc', factors.fc)}`}>
              {(factors.fc * 100).toFixed(0)}%
            </span>
          </div>
          <input
            type="range"
            min={FACTOR_RANGES.fc.min}
            max={FACTOR_RANGES.fc.max}
            step={FACTOR_RANGES.fc.step}
            value={factors.fc}
            onChange={(e) => handleFactorChange('fc', parseFloat(e.target.value))}
            className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer ${getSliderColor('fc')}`}
          />
          <div className="flex justify-between text-xs text-gray-400 mt-0.5">
            <span>{(FACTOR_RANGES.fc.min * 100).toFixed(0)}%</span>
            <span>{(FACTOR_RANGES.fc.max * 100).toFixed(0)}%</span>
          </div>
        </div>

        {/* FCp - Competition Factor */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1">
              <label className="text-xs font-medium text-gray-600">
                FCp - Competicao
              </label>
              <div className="group relative">
                <Info className="h-3 w-3 text-gray-400 cursor-help" />
                <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block w-48 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
                  {getDocumentation('fcp')?.description}
                </div>
              </div>
            </div>
            <span className={`text-xs font-mono font-semibold ${getFactorColor('fcp', factors.fcp)}`}>
              {(factors.fcp * 100).toFixed(0)}%
            </span>
          </div>
          <input
            type="range"
            min={FACTOR_RANGES.fcp.min}
            max={FACTOR_RANGES.fcp.max}
            step={FACTOR_RANGES.fcp.step}
            value={factors.fcp}
            onChange={(e) => handleFactorChange('fcp', parseFloat(e.target.value))}
            className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer ${getSliderColor('fcp')}`}
          />
          <div className="flex justify-between text-xs text-gray-400 mt-0.5">
            <span>{(FACTOR_RANGES.fcp.min * 100).toFixed(0)}%</span>
            <span>{(FACTOR_RANGES.fcp.max * 100).toFixed(0)}%</span>
          </div>
        </div>

        {/* FS - Seasonality Factor */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1">
              <label className="text-xs font-medium text-gray-600">
                FS - Sazonalidade
              </label>
              <div className="group relative">
                <Info className="h-3 w-3 text-gray-400 cursor-help" />
                <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block w-48 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
                  {getDocumentation('fs')?.description}
                </div>
              </div>
            </div>
            <span className={`text-xs font-mono font-semibold ${getFactorColor('fs', factors.fs)}`}>
              {(factors.fs * 100).toFixed(0)}%
            </span>
          </div>
          <input
            type="range"
            min={FACTOR_RANGES.fs.min}
            max={FACTOR_RANGES.fs.max}
            step={FACTOR_RANGES.fs.step}
            value={factors.fs}
            onChange={(e) => handleFactorChange('fs', parseFloat(e.target.value))}
            className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer ${getSliderColor('fs')}`}
          />
          <div className="flex justify-between text-xs text-gray-400 mt-0.5">
            <span>{(FACTOR_RANGES.fs.min * 100).toFixed(0)}%</span>
            <span>{(FACTOR_RANGES.fs.max * 100).toFixed(0)}%</span>
          </div>
        </div>

        {/* FL - Logistics Factor */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1">
              <label className="text-xs font-medium text-gray-600">
                FL - Logistica
              </label>
              <div className="group relative">
                <Info className="h-3 w-3 text-gray-400 cursor-help" />
                <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block w-48 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
                  {getDocumentation('fl')?.description}
                </div>
              </div>
            </div>
            <span className={`text-xs font-mono font-semibold ${getFactorColor('fl', factors.fl)}`}>
              {(factors.fl * 100).toFixed(0)}%
            </span>
          </div>
          <input
            type="range"
            min={FACTOR_RANGES.fl.min}
            max={FACTOR_RANGES.fl.max}
            step={FACTOR_RANGES.fl.step}
            value={factors.fl}
            onChange={(e) => handleFactorChange('fl', parseFloat(e.target.value))}
            className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer ${getSliderColor('fl')}`}
          />
          <div className="flex justify-between text-xs text-gray-400 mt-0.5">
            <span>{(FACTOR_RANGES.fl.min * 100).toFixed(0)}%</span>
            <span>{(FACTOR_RANGES.fl.max * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {/* Formula display */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <div className="text-xs text-gray-500 text-center font-mono">
          FDE = FC x (1 - FCp) x FS x FL
        </div>
        <div className="text-xs text-gray-400 text-center mt-1">
          {(factors.fc).toFixed(2)} x {(1 - factors.fcp).toFixed(2)} x {factors.fs.toFixed(2)} x {factors.fl.toFixed(2)} = {fdeValue.toFixed(3)}
        </div>
      </div>
    </div>
  )
}

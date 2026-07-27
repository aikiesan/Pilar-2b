'use client'

import React, { useState } from 'react'
import { Link } from '@/navigation'
import {
  FileText,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Calculator,
  BookOpen,
  X
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import {
  CorrectionFactors,
  calculateFDE,
  FACTOR_DOCUMENTATION
} from '@/types/analysis'

interface MethodologyPanelProps {
  factors: CorrectionFactors
  isOpen: boolean
  onClose: () => void
}

export default function MethodologyPanel({
  factors,
  isOpen,
  onClose
}: MethodologyPanelProps) {
  const t = useTranslations('analysis')
  const [expandedFactors, setExpandedFactors] = useState<string[]>(['fc'])

  const toggleFactor = (factor: string) => {
    setExpandedFactors(prev =>
      prev.includes(factor)
        ? prev.filter(f => f !== factor)
        : [...prev, factor]
    )
  }

  const getFactorValue = (factor: keyof CorrectionFactors): number => {
    return factors[factor]
  }

  const fdeValue = calculateFDE(factors)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-lg bg-white dark:bg-slate-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700 bg-gradient-to-r from-green-50 to-white">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              {t('methodology_panel.title')}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label={t('methodology_panel.close')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-slate-400" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Formula Overview */}
          <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              {t('methodology_panel.formula_heading')}
            </h3>
            <div className="text-center py-3">
              <div className="text-lg font-mono font-semibold text-gray-800 dark:text-slate-200 mb-2">
                FDE = FC &times; (1 - FCp) &times; FS &times; FL
              </div>
              <div className="text-sm font-mono text-gray-600 dark:text-slate-400">
                {factors.fc.toFixed(2)} &times; {(1 - factors.fcp).toFixed(2)} &times; {factors.fs.toFixed(2)} &times; {factors.fl.toFixed(2)} = {fdeValue.toFixed(3)}
              </div>
              <div className="mt-3 text-2xl font-bold text-green-600">
                {(fdeValue * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500 dark:text-slate-400">
                {t('methodology_panel.formula_desc')}
              </div>
            </div>
          </div>

          {/* Factor Documentation */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 px-1">
              {t('methodology_panel.factors_heading')}
            </h3>

            {FACTOR_DOCUMENTATION.map(doc => {
              const isExpanded = expandedFactors.includes(doc.factor)
              const currentValue = getFactorValue(doc.factor)

              return (
                <div
                  key={doc.factor}
                  className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden"
                >
                  {/* Factor Header */}
                  <button
                    onClick={() => toggleFactor(doc.factor)}
                    className="w-full p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-gray-400 dark:text-slate-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      )}
                      <div className="text-left">
                        <div className="font-semibold text-gray-900 text-sm">
                          {t(doc.nameKey)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {doc.factor.toUpperCase()}
                        </div>
                      </div>
                    </div>
                    <span className={`font-mono font-bold text-sm ${
                      doc.factor === 'fcp'
                        ? currentValue > 0.5 ? 'text-red-600' : 'text-green-600'
                        : currentValue > 0.7 ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {(currentValue * 100).toFixed(0)}%
                    </span>
                  </button>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-gray-100 bg-gray-50">
                      <div className="mb-3">
                        <div className="text-xs font-medium text-gray-500 mb-1">
                          {t('methodology_panel.description')}
                        </div>
                        <p className="text-sm text-gray-700">
                          {t(doc.descKey)}
                        </p>
                      </div>

                      <div className="mb-3">
                        <div className="text-xs font-medium text-gray-500 mb-1">
                          {t('methodology_panel.context')}
                        </div>
                        <p className="text-sm text-gray-600">
                          {t(doc.contextKey)}
                        </p>
                      </div>

                      <div className="mb-3">
                        <div className="text-xs font-medium text-gray-500 mb-1">
                          {t('methodology_panel.typical_range')}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500"
                              style={{
                                marginLeft: `${doc.typicalRange.min * 100}%`,
                                width: `${(doc.typicalRange.max - doc.typicalRange.min) * 100}%`
                              }}
                            />
                          </div>
                          <span className="text-xs text-gray-600 font-mono whitespace-nowrap">
                            {(doc.typicalRange.min * 100).toFixed(0)}% - {(doc.typicalRange.max * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-medium text-gray-500 mb-1">
                          {t('methodology_panel.references')}
                        </div>
                        <ul className="space-y-1">
                          {doc.references.map((ref, idx) => (
                            <li
                              key={idx}
                              className="text-xs text-gray-600 flex items-start gap-1"
                            >
                              <span className="text-gray-400">&bull;</span>
                              <span>{ref}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Additional Info */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {t('methodology_panel.about_heading')}
            </h3>
            <p className="text-xs text-blue-700 mb-3">
              {t('methodology_panel.about_text')}
            </p>
            <div className="bg-amber-100 rounded-md p-2 mb-3">
              <p className="text-xs text-amber-800 font-semibold mb-1">
                ⚠️ {t('methodology_panel.validation_warning_title')}
              </p>
              <p className="text-xs text-amber-700">
                {t('methodology_panel.validation_warning_text')}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <ExternalLink className="h-3 w-3 text-blue-600" />
              <a
                href="https://www.nipe.unicamp.br"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                NIPE-UNICAMP
              </a>
              <span className="text-blue-400">|</span>
              <a
                href="https://fapesp.br"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                FAPESP 2024/01112-1 · 2025/08745-2
              </a>
            </div>
          </div>

          {/* Interpretation Guide */}
          <div className="bg-amber-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-amber-800 mb-2">
              {t('methodology_panel.interpretation_heading')}
            </h3>
            <ul className="space-y-2 text-xs text-amber-700">
              <li className="flex items-start gap-2">
                <span className="font-bold text-green-600 mt-0.5">{t('methodology_panel.color_green')}</span>
                <span>{t('methodology_panel.interp_high_detail')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-yellow-600 mt-0.5">{t('methodology_panel.color_yellow')}</span>
                <span>{t('methodology_panel.interp_medium_detail')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-red-600 mt-0.5">{t('methodology_panel.color_red')}</span>
                <span>{t('methodology_panel.interp_low_detail')}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 space-y-2">
          <Link
            href="/dashboard/references"
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <BookOpen className="h-4 w-4" />
            {t('methodology_panel.view_references')}
          </Link>
          <button
            onClick={onClose}
            className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
          >
            {t('methodology_panel.close')}
          </button>
        </div>
      </div>
    </div>
  )
}

'use client'

import { BookOpen, ExternalLink, Info } from 'lucide-react'
import {
  FDEFactorReference,
  getFactorTypeLabel,
  getFactorTypeDescription
} from '@/types/references'

interface FactorReferenceCardProps {
  factor: FDEFactorReference
  showValue?: boolean
  compact?: boolean
}

export default function FactorReferenceCard({
  factor,
  showValue = true,
  compact = false
}: FactorReferenceCardProps) {
  const hasReferences = factor.referencia_principal ||
                        (factor.referencias_adicionais && factor.referencias_adicionais.length > 0)

  const factorPercentage = (factor.factor_value * 100).toFixed(1)

  // Color based on factor value
  const getFactorColor = (value: number): string => {
    if (value >= 0.7) return 'text-green-600 bg-green-50 border-green-200'
    if (value >= 0.4) return 'text-amber-600 bg-amber-50 border-amber-200'
    return 'text-red-600 bg-red-50 border-red-200'
  }

  if (compact) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-2">
          <h5 className="font-semibold text-sm text-gray-800">
            {getFactorTypeLabel(factor.factor_type)}
          </h5>
          {showValue && (
            <span className={`text-lg font-bold ${getFactorColor(factor.factor_value)}`}>
              {factorPercentage}%
            </span>
          )}
        </div>

        {factor.referencia_principal && (
          <div className="text-xs text-gray-600 line-clamp-2">
            <BookOpen className="h-3 w-3 inline mr-1" />
            {factor.referencia_principal}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 hover:border-green-300 hover:shadow-lg transition-all">
      {/* Header */}
      <div className={`px-5 py-4 border-b border-gray-100 ${getFactorColor(factor.factor_value)}`}>
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-bold text-lg">{getFactorTypeLabel(factor.factor_type)}</h4>
            <p className="text-sm opacity-80 mt-0.5">
              {getFactorTypeDescription(factor.factor_type)}
            </p>
          </div>
          {showValue && (
            <div className="text-center">
              <div className="text-3xl font-bold">{factorPercentage}%</div>
              <div className="text-xs opacity-80">Valor do Fator</div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        {/* Justification */}
        {factor.justificativa && (
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-start gap-2">
              <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h5 className="font-semibold text-blue-900 text-sm mb-1">Justificativa</h5>
                <p className="text-sm text-blue-800 leading-relaxed">
                  {factor.justificativa}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Methodology */}
        {factor.metodologia && (
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h5 className="font-semibold text-gray-800 text-sm mb-2">Metodologia</h5>
            <p className="text-sm text-gray-700 leading-relaxed">
              {factor.metodologia}
            </p>
          </div>
        )}

        {/* References */}
        {hasReferences && (
          <div className="border-t border-gray-100 pt-4">
            <h5 className="font-semibold text-gray-800 text-sm mb-3 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-green-600" />
              Referências Bibliográficas
            </h5>

            <div className="space-y-3">
              {/* Main Reference */}
              {factor.referencia_principal && (
                <div className="bg-gradient-to-r from-green-50 to-white rounded-lg p-3 border border-green-200">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-green-600 rounded-full mt-2 flex-shrink-0"></div>
                    <div className="flex-1">
                      <span className="text-xs font-semibold text-green-800 uppercase block mb-1">
                        Referência Principal
                      </span>
                      <p className="text-sm text-gray-800 leading-relaxed">
                        {factor.referencia_principal}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Additional References */}
              {factor.referencias_adicionais && factor.referencias_adicionais.length > 0 && (
                <div>
                  <span className="text-xs font-semibold text-gray-600 uppercase block mb-2">
                    Referências Adicionais ({factor.referencias_adicionais.length})
                  </span>
                  <div className="space-y-2">
                    {factor.referencias_adicionais.map((ref, index) => (
                      <div
                        key={index}
                        className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                      >
                        <div className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                          <p className="text-sm text-gray-700 leading-relaxed flex-1">
                            {ref}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* DOI Link */}
        {factor.doi && (
          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
            <span className="text-xs font-semibold text-gray-600">DOI:</span>
            <a
              href={`https://doi.org/${factor.doi}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
            >
              {factor.doi}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}

        {/* URL Link */}
        {factor.url && !factor.doi && (
          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
            <span className="text-xs font-semibold text-gray-600">Link:</span>
            <a
              href={factor.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
            >
              Acessar fonte
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}

        {/* Metadata */}
        <div className="flex flex-wrap gap-4 text-xs text-gray-500 pt-2 border-t border-gray-100">
          {factor.updated_at && (
            <div>
              <span className="font-medium">Última atualização:</span>{' '}
              {new Date(factor.updated_at).toLocaleDateString('pt-BR')}
            </div>
          )}
          {factor.updated_by && (
            <div>
              <span className="font-medium">Por:</span> {factor.updated_by}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

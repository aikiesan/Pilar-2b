'use client'

import { useState, useEffect } from 'react'
import { Calculator, TrendingUp, AlertTriangle, Info, ChevronDown, ChevronUp } from 'lucide-react'
import {
  FDEBreakdownWithReferences,
  calculateFDE,
  getFDEClassification
} from '@/types/references'
import { getFDEBreakdown } from '@/services/referencesApi'
import FactorReferenceCard from './FactorReferenceCard'
import ReferenceList from './ReferenceList'
import { logger } from '@/lib/logger'

interface FDEBreakdownPanelProps {
  codigoResidue: string
  showGeneralReferences?: boolean
}

export default function FDEBreakdownPanel({
  codigoResidue,
  showGeneralReferences = true
}: FDEBreakdownPanelProps) {
  const [breakdown, setBreakdown] = useState<FDEBreakdownWithReferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['formula', 'factors']))

  useEffect(() => {
    fetchBreakdown()
  }, [codigoResidue])

  const fetchBreakdown = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getFDEBreakdown(codigoResidue)
      if (!data) {
        setError('Dados de FDE não encontrados para este resíduo.')
      } else {
        setBreakdown(data)
      }
    } catch (err) {
      logger.error('Error fetching FDE breakdown:', err)
      setError('Erro ao carregar dados de FDE.')
    } finally {
      setLoading(false)
    }
  }

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 bg-white rounded-xl border border-gray-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando análise de FDE...</p>
        </div>
      </div>
    )
  }

  if (error || !breakdown) {
    return (
      <div className="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-amber-900 mb-1">
              Dados de FDE Indisponíveis
            </h4>
            <p className="text-amber-800 text-sm">
              {error || 'Não foi possível carregar os dados de FDE para este resíduo.'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Calculate individual factor contributions
  const fc_value = breakdown.fator_competicao.factor_value
  const fcp_value = breakdown.fator_coleta_prazo.factor_value
  const fs_value = breakdown.fator_sazonalidade.factor_value
  const fl_value = breakdown.fator_logistica.factor_value

  // Calculated FDE
  const calculatedFDE = calculateFDE(fc_value, fcp_value, fs_value, fl_value)
  const calculatedClassification = getFDEClassification(calculatedFDE)

  // Check if calculated matches stored value (with tolerance for rounding)
  const fdeMatch = Math.abs((breakdown.fde_final / 100) - calculatedFDE) < 0.01

  // Get color for FDE value
  const getFDEColor = (fde: number): string => {
    if (fde >= 0.50) return 'bg-gradient-to-r from-green-600 to-green-500'
    if (fde >= 0.30) return 'bg-gradient-to-r from-blue-600 to-blue-500'
    if (fde >= 0.15) return 'bg-gradient-to-r from-amber-600 to-amber-500'
    if (fde >= 0.08) return 'bg-gradient-to-r from-orange-600 to-orange-500'
    return 'bg-gradient-to-r from-red-600 to-red-500'
  }

  return (
    <div className="space-y-6">
      {/* Main FDE Card */}
      <div className={`${getFDEColor(calculatedFDE)} text-white rounded-xl shadow-lg overflow-hidden`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-2xl font-bold mb-1">{breakdown.residuo_nome}</h3>
              <p className="text-white/90">Fator de Disponibilidade Efetiva (FDE)</p>
            </div>
            <div className="text-center bg-white/20 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-5xl font-bold">{(calculatedFDE * 100).toFixed(1)}%</div>
              <div className="text-sm mt-1 opacity-90">{calculatedClassification}</div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            <div className="bg-white/15 rounded-lg p-3 backdrop-blur-sm">
              <div className="text-xs opacity-80 mb-1">Competição</div>
              <div className="text-xl font-bold">{(fc_value * 100).toFixed(0)}%</div>
            </div>
            <div className="bg-white/15 rounded-lg p-3 backdrop-blur-sm">
              <div className="text-xs opacity-80 mb-1">Coleta/Prazo</div>
              <div className="text-xl font-bold">{(fcp_value * 100).toFixed(0)}%</div>
            </div>
            <div className="bg-white/15 rounded-lg p-3 backdrop-blur-sm">
              <div className="text-xs opacity-80 mb-1">Sazonalidade</div>
              <div className="text-xl font-bold">{(fs_value * 100).toFixed(0)}%</div>
            </div>
            <div className="bg-white/15 rounded-lg p-3 backdrop-blur-sm">
              <div className="text-xs opacity-80 mb-1">Logística</div>
              <div className="text-xl font-bold">{(fl_value * 100).toFixed(0)}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Calculation Formula Section */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <button
          onClick={() => toggleSection('formula')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Calculator className="h-5 w-5 text-green-600" />
            <h4 className="font-semibold text-gray-800">Fórmula de Cálculo</h4>
          </div>
          {expandedSections.has('formula') ? (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          )}
        </button>

        {expandedSections.has('formula') && (
          <div className="px-6 pb-6 border-t border-gray-100">
            <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-6 mt-4">
              <div className="text-center mb-6">
                <div className="inline-block bg-white rounded-lg px-6 py-4 shadow-sm border border-gray-200">
                  <code className="text-lg font-mono font-semibold text-gray-800">
                    FDE = (1 - FC) × FCP × FS × FL
                  </code>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-200">
                  <span className="font-medium text-gray-700">FDE =</span>
                  <span className="font-mono font-semibold text-green-600">
                    (1 - {fc_value.toFixed(3)}) × {fcp_value.toFixed(3)} × {fs_value.toFixed(3)} × {fl_value.toFixed(3)}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-200">
                  <span className="font-medium text-gray-700">FDE =</span>
                  <span className="font-mono font-semibold text-green-600">
                    {(1 - fc_value).toFixed(3)} × {fcp_value.toFixed(3)} × {fs_value.toFixed(3)} × {fl_value.toFixed(3)}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-green-100 rounded-lg p-4 border-2 border-green-300">
                  <span className="font-bold text-gray-800">FDE Final =</span>
                  <span className="font-mono text-2xl font-bold text-green-700">
                    {calculatedFDE.toFixed(4)} ({(calculatedFDE * 100).toFixed(2)}%)
                  </span>
                </div>
              </div>

              {!fdeMatch && (
                <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                  <Info className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">
                    <strong>Nota:</strong> O valor calculado ({(calculatedFDE * 100).toFixed(2)}%)
                    difere ligeiramente do valor armazenado ({breakdown.fde_final.toFixed(2)}%).
                    Isso pode ocorrer devido a arredondamentos intermediários.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Individual Factors Section */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <button
          onClick={() => toggleSection('factors')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <h4 className="font-semibold text-gray-800">Fatores Individuais e Referências</h4>
          </div>
          {expandedSections.has('factors') ? (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          )}
        </button>

        {expandedSections.has('factors') && (
          <div className="p-6 border-t border-gray-100">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FactorReferenceCard factor={breakdown.fator_competicao} />
              <FactorReferenceCard factor={breakdown.fator_coleta_prazo} />
              <FactorReferenceCard factor={breakdown.fator_sazonalidade} />
              <FactorReferenceCard factor={breakdown.fator_logistica} />
            </div>
          </div>
        )}
      </div>

      {/* General References Section */}
      {showGeneralReferences && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <button
            onClick={() => toggleSection('references')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Info className="h-5 w-5 text-green-600" />
              <h4 className="font-semibold text-gray-800">Referências Gerais do Resíduo</h4>
              {breakdown.referencias_gerais.length > 0 && (
                <span className="text-sm text-gray-500">
                  ({breakdown.referencias_gerais.length})
                </span>
              )}
            </div>
            {expandedSections.has('references') ? (
              <ChevronUp className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-500" />
            )}
          </button>

          {expandedSections.has('references') && (
            <div className="p-6 border-t border-gray-100">
              <ReferenceList
                codigoResidue={codigoResidue}
                showStatistics={true}
                maxHeight="600px"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

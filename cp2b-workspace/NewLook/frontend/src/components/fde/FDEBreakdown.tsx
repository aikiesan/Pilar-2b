'use client'

/**
 * FDEBreakdown Component
 * Displays detailed breakdown of FDE (Fator de Disponibilidade Efetivo) calculation
 */
import React from 'react'
import { Calculator, TrendingDown, Zap, AlertCircle, Info } from 'lucide-react'
import type { FDEData } from '@/types/fde'
import { formatFDE, formatPercentage } from '@/types/fde'

export interface FDEBreakdownProps {
  fdeData: FDEData
  residueName: string
  totalProduction?: number // Mg/year
  showFormula?: boolean
  showEnergyPotential?: boolean
}

const FDEBreakdown: React.FC<FDEBreakdownProps> = ({
  fdeData,
  residueName,
  totalProduction,
  showFormula = true,
  showEnergyPotential = true,
}) => {
  const { fde, fde_availability, fde_efficiency } = fdeData

  // Calculate energy potential if production data is available
  const energyPotential = totalProduction && fdeData.bmp_value
    ? totalProduction * fde * 0.15 * fdeData.bmp_value * 9.97 / 1000 // GWh/year
    : null

  // Determine status color
  const getFDEStatusColor = (value: number): string => {
    if (value === 0) return 'red'
    if (value < 0.1) return 'orange'
    if (value < 0.2) return 'yellow'
    return 'green'
  }

  const statusColor = getFDEStatusColor(fde)
  const statusColors: Record<string, string> = {
    green: 'bg-green-100 text-green-800 border-green-300',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    orange: 'bg-orange-100 text-orange-800 border-orange-300',
    red: 'bg-red-100 text-red-800 border-red-300',
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-cp2b-green to-cp2b-green-dark px-4 py-3">
        <div className="flex items-center gap-2 text-white">
          <Calculator size={20} />
          <h3 className="font-semibold text-lg">Cálculo do FDE</h3>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* FDE Formula */}
        {showFormula && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Fórmula do FDE:
            </div>
            <div className="font-mono text-lg text-center py-3 text-gray-900 dark:text-gray-100">
              FDE = Disponibilidade × Eficiência
            </div>
            <div className="text-xs text-gray-500 text-center">
              (Fator de Disponibilidade Efetivo)
            </div>
          </div>
        )}

        {/* Calculation Breakdown */}
        <div className="space-y-3">
          {/* Availability Component */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingDown size={18} className="text-blue-600 dark:text-blue-400" />
                <span className="font-semibold text-blue-900 dark:text-blue-100">
                  Disponibilidade
                </span>
              </div>
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {formatPercentage(fde_availability || 0)}
              </span>
            </div>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Fração do resíduo efetivamente disponível para biogás, considerando usos concorrentes,
              dispersão geográfica e requisitos regulatórios.
            </p>
          </div>

          {/* Efficiency Component */}
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap size={18} className="text-purple-600 dark:text-purple-400" />
                <span className="font-semibold text-purple-900 dark:text-purple-100">
                  Eficiência de Conversão
                </span>
              </div>
              <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {formatPercentage(fde_efficiency || 0)}
              </span>
            </div>
            <p className="text-sm text-purple-800 dark:text-purple-200">
              Eficiência real da digestão anaeróbica comparada ao potencial bioquímico teórico (BMP),
              considerando perdas operacionais e limitações técnicas.
            </p>
          </div>

          {/* Multiplication Arrow */}
          <div className="flex justify-center">
            <div className="text-3xl text-gray-400 dark:text-gray-600">×</div>
          </div>

          {/* Final FDE Result */}
          <div className={`rounded-lg p-4 border ${statusColors[statusColor]}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calculator size={18} />
                <span className="font-semibold text-lg">
                  FDE Final ({residueName})
                </span>
              </div>
              <span className="text-3xl font-bold">
                {formatFDE(fde)}
              </span>
            </div>

            {/* Calculation */}
            <div className="font-mono text-sm mb-3">
              {formatPercentage(fde_availability || 0)} × {formatPercentage(fde_efficiency || 0)} = {formatFDE(fde)}
            </div>

            {/* Interpretation */}
            <div className="text-sm">
              {fde === 0 ? (
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <span>
                    Este resíduo não está disponível para biogás devido a usos concorrentes de maior valor
                    (ex: cogeração, etanol 2G).
                  </span>
                </div>
              ) : fde < 0.1 ? (
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <span>
                    Apenas <strong>{formatPercentage(fde)}</strong> do resíduo total pode ser efetivamente
                    convertido em biogás.
                  </span>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <Info size={16} className="mt-0.5 flex-shrink-0" />
                  <span>
                    Aproximadamente <strong>{formatPercentage(fde)}</strong> do resíduo total pode ser
                    efetivamente convertido em biogás.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Energy Potential (if data available) */}
        {showEnergyPotential && energyPotential && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={18} className="text-green-600 dark:text-green-400" />
              <span className="font-semibold text-green-900 dark:text-green-100">
                Potencial Energético Realista
              </span>
            </div>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
              {energyPotential.toFixed(2)} GWh/ano
            </div>
            <div className="text-sm text-green-800 dark:text-green-200">
              Baseado em {totalProduction?.toLocaleString('pt-BR')} Mg/ano de produção
              e BMP de {fdeData.bmp_value} m³ CH₄/Mg VS
            </div>
          </div>
        )}

        {/* Methodology Note */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
          <div className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
            <Info size={14} className="mt-0.5 flex-shrink-0" />
            <div>
              <strong>Nota metodológica:</strong> O FDE representa o potencial realista de conversão,
              diferente do BMP teórico que não considera disponibilidade ou usos concorrentes.
              Para detalhes completos, consulte a{' '}
              <a
                href="/dashboard/about"
                className="text-cp2b-green hover:text-cp2b-green-dark underline"
              >
                metodologia FDE
              </a>.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FDEBreakdown

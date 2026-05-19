'use client'

/**
 * AlternativePathways Component
 * Displays competing uses and alternative utilization pathways for residues
 */
import React from 'react'
import { GitBranch, TrendingUp, Factory, Leaf, Truck, AlertTriangle, Zap } from 'lucide-react'
import type { AlternativePathways as AlternativePathwaysType } from '@/types/fde'

export interface AlternativePathwaysProps {
  pathways: AlternativePathwaysType
  residueName: string
  showTotal?: boolean
}

const AlternativePathways: React.FC<AlternativePathwaysProps> = ({
  pathways,
  residueName,
  showTotal = true,
}) => {
  const { competing_uses, total_unavailable, reasons } = pathways

  // Calculate total competing uses
  const totalCompeting = Object.values(competing_uses).reduce((sum, val) => sum + val, 0)

  // Pathway icons and colors
  const pathwayConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    cogeneration: {
      icon: <Factory size={20} />,
      color: 'bg-red-100 text-red-800 border-red-300',
      label: 'Cogeração',
    },
    second_gen_ethanol: {
      icon: <Zap size={20} />,
      color: 'bg-orange-100 text-orange-800 border-orange-300',
      label: 'Etanol 2G',
    },
    animal_feed: {
      icon: <Leaf size={20} />,
      color: 'bg-green-100 text-green-800 border-green-300',
      label: 'Ração Animal',
    },
    direct_soil: {
      icon: <Leaf size={20} />,
      color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      label: 'Aplicação Direta no Solo',
    },
    composting: {
      icon: <Leaf size={20} />,
      color: 'bg-lime-100 text-lime-800 border-lime-300',
      label: 'Compostagem',
    },
    free_range: {
      icon: <Truck size={20} />,
      color: 'bg-amber-100 text-amber-800 border-amber-300',
      label: 'Dispersão em Pastagens',
    },
    unmanaged: {
      icon: <AlertTriangle size={20} />,
      color: 'bg-gray-100 text-gray-800 border-gray-300',
      label: 'Descarte Inadequado',
    },
    other: {
      icon: <GitBranch size={20} />,
      color: 'bg-blue-100 text-blue-800 border-blue-300',
      label: 'Outros Usos',
    },
  }

  // Sort pathways by percentage (descending)
  const sortedPathways = Object.entries(competing_uses)
    .sort(([, a], [, b]) => b - a)
    .filter(([, value]) => value > 0)

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 px-4 py-3">
        <div className="flex items-center gap-2 text-white">
          <GitBranch size={20} />
          <h3 className="font-semibold text-lg">Usos Concorrentes</h3>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Introduction */}
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 border border-orange-200 dark:border-orange-800">
          <p className="text-sm text-orange-900 dark:text-orange-100">
            <strong>{residueName}</strong> possui usos alternativos que competem com a produção de biogás.
            Estes usos reduzem a disponibilidade efetiva do resíduo para biodigestão.
          </p>
        </div>

        {/* Total Unavailable */}
        {showTotal && (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-red-900 dark:text-red-100">
                Total Indisponível para Biogás
              </span>
              <span className="text-3xl font-bold text-red-600 dark:text-red-400">
                {(total_unavailable * 100).toFixed(1)}%
              </span>
            </div>
            <div className="text-xs text-red-800 dark:text-red-200">
              Apenas {((1 - total_unavailable) * 100).toFixed(1)}% está disponível para conversão em biogás
            </div>
          </div>
        )}

        {/* Pathway Breakdown */}
        <div className="space-y-3">
          <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Distribuição por Uso:
          </div>

          {sortedPathways.map(([key, percentage]) => {
            const config = pathwayConfig[key] || pathwayConfig.other
            const widthPercent = (percentage * 100).toFixed(1)

            return (
              <div key={key} className="space-y-2">
                {/* Pathway Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded ${config.color}`}>
                      {config.icon}
                    </div>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {config.label}
                    </span>
                  </div>
                  <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {widthPercent}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-400 to-red-500 transition-all duration-500"
                    style={{ width: `${widthPercent}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Reasons Explanation */}
        {reasons && reasons.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={18} className="text-blue-600 dark:text-blue-400" />
              <span className="font-semibold text-blue-900 dark:text-blue-100">
                Por que estes usos são preferíveis?
              </span>
            </div>
            <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
              {reasons.map((reason, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Economic Impact Note */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-start gap-2 text-sm text-yellow-900 dark:text-yellow-100">
            <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
            <div>
              <strong>Impacto Econômico:</strong> Usos concorrentes geralmente oferecem maior retorno
              econômico que a produção de biogás, tornando essas aplicações prioritárias para os geradores
              de resíduos.
            </div>
          </div>
        </div>

        {/* Validation Note */}
        <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
          Dados de usos concorrentes validados por fontes oficiais (UNICA, EMBRAPA, CETESB).
          Valores representam a distribuição atual no estado de São Paulo.
        </div>
      </div>
    </div>
  )
}

export default AlternativePathways

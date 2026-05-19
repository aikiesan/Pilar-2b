'use client'

/**
 * DataProvenance Component
 * Displays data sources, methodology, and validation information for FDE calculations
 */
import React, { useState } from 'react'
import { FileText, ExternalLink, Calendar, User, ChevronDown, ChevronUp } from 'lucide-react'
import type { DataSource } from '@/types/fde'

export interface DataProvenanceProps {
  sources: DataSource[]
  validationDate?: string
  lastUpdatedBy?: string
  residueName: string
  compact?: boolean
  showMethodology?: boolean
}

const DataProvenance: React.FC<DataProvenanceProps> = ({
  sources,
  validationDate,
  lastUpdatedBy,
  residueName,
  compact = false,
  showMethodology = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(!compact)

  // Group sources by type
  const groupedSources = sources.reduce((acc, source) => {
    if (!acc[source.type]) {
      acc[source.type] = []
    }
    acc[source.type].push(source)
    return acc
  }, {} as Record<string, DataSource[]>)

  // Source type labels
  const sourceTypeLabels: Record<string, string> = {
    'academic': 'Pesquisa Acadêmica',
    'government': 'Dados Governamentais',
    'industry': 'Indústria',
    'field_survey': 'Levantamento de Campo',
    'operational': 'Dados Operacionais',
  }

  // Source type colors
  const sourceTypeColors: Record<string, string> = {
    'academic': 'bg-blue-100 text-blue-800 border-blue-300',
    'government': 'bg-green-100 text-green-800 border-green-300',
    'industry': 'bg-purple-100 text-purple-800 border-purple-300',
    'field_survey': 'bg-orange-100 text-orange-800 border-orange-300',
    'operational': 'bg-teal-100 text-teal-800 border-teal-300',
  }

  if (compact && !isExpanded) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full flex items-center justify-between text-sm hover:text-cp2b-green transition-colors"
        >
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-gray-500" />
            <span className="font-medium">
              {sources.length} {sources.length === 1 ? 'fonte' : 'fontes'} de dados
            </span>
          </div>
          <ChevronDown size={16} />
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-cp2b-green to-cp2b-green-dark px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <FileText size={20} />
            <h3 className="font-semibold text-lg">Procedência dos Dados</h3>
          </div>
          {compact && (
            <button
              onClick={() => setIsExpanded(false)}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <ChevronUp size={20} />
            </button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Metadata */}
        <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
          {validationDate && (
            <div className="flex items-center gap-1.5">
              <Calendar size={16} />
              <span>
                Validado em: {new Date(validationDate).toLocaleDateString('pt-BR')}
              </span>
            </div>
          )}
          {lastUpdatedBy && (
            <div className="flex items-center gap-1.5">
              <User size={16} />
              <span>Atualizado por: {lastUpdatedBy}</span>
            </div>
          )}
        </div>

        {/* Sources by Type */}
        <div className="space-y-4">
          {Object.entries(groupedSources).map(([type, typeSources]) => (
            <div key={type} className="space-y-2">
              {/* Type Header */}
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                    sourceTypeColors[type] || 'bg-gray-100 text-gray-800 border-gray-300'
                  }`}
                >
                  {sourceTypeLabels[type] || type}
                </span>
                <span className="text-xs text-gray-500">
                  ({typeSources.length} {typeSources.length === 1 ? 'fonte' : 'fontes'})
                </span>
              </div>

              {/* Source List */}
              <div className="space-y-2 ml-4">
                {typeSources.map((source, index) => (
                  <div
                    key={index}
                    className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-2"
                  >
                    {/* Organization */}
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {source.organization}
                    </div>

                    {/* Reference */}
                    {source.reference && (
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        {source.reference}
                      </div>
                    )}

                    {/* Year and URL */}
                    <div className="flex items-center justify-between">
                      {source.year && (
                        <span className="text-xs text-gray-500">
                          Ano: {source.year}
                        </span>
                      )}
                      {source.url && (
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-cp2b-green hover:text-cp2b-green-dark transition-colors"
                        >
                          <span>Acessar fonte</span>
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Methodology Link */}
        {showMethodology && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <a
              href={`/dashboard/about#${residueName.toLowerCase().replace(/\s+/g, '-')}`}
              className="inline-flex items-center gap-2 text-sm text-cp2b-green hover:text-cp2b-green-dark transition-colors font-medium"
            >
              <FileText size={16} />
              <span>Ver metodologia completa de cálculo FDE</span>
              <ExternalLink size={14} />
            </a>
          </div>
        )}

        {/* Citation Suggestion */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
          <div className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-1">
            Citação sugerida:
          </div>
          <div className="text-xs text-blue-800 dark:text-blue-200 font-mono">
            PILAR-2b (2025). Fator de Disponibilidade Efetivo - {residueName}.
            Baseado em: {sources.map(s => s.organization).join(', ')}.
            Disponível em: https://cp2bmaps.org
          </div>
        </div>
      </div>
    </div>
  )
}

export default DataProvenance

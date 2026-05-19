'use client'

import { useState, useEffect } from 'react'
import { BookOpen, ExternalLink, CheckCircle, Clock, AlertCircle, ChevronDown, ChevronUp, FileText } from 'lucide-react'
import {
  UnifiedReference,
  ReferenceStatistics,
  getValidationStatusColor,
  getValidationStatusLabel
} from '@/types/references'
import { getReferencesForResidue, getReferenceStatistics } from '@/services/referencesApi'
import { logger } from '@/lib/logger'

interface ReferenceListProps {
  codigoResidue: string
  showStatistics?: boolean
  maxHeight?: string
}

export default function ReferenceList({
  codigoResidue,
  showStatistics = true,
  maxHeight = '500px'
}: ReferenceListProps) {
  const [references, setReferences] = useState<UnifiedReference[]>([])
  const [statistics, setStatistics] = useState<ReferenceStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedRefs, setExpandedRefs] = useState<Set<number>>(new Set())

  useEffect(() => {
    fetchData()
  }, [codigoResidue])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [refsData, statsData] = await Promise.all([
        getReferencesForResidue(codigoResidue),
        showStatistics ? getReferenceStatistics(codigoResidue) : Promise.resolve(null)
      ])
      setReferences(refsData)
      setStatistics(statsData)
    } catch (error) {
      logger.error('Error fetching references:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleExpanded = (id: number) => {
    const newExpanded = new Set(expandedRefs)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedRefs(newExpanded)
  }

  const getValidationIcon = (status?: string) => {
    switch (status) {
      case 'VALIDATED':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'PENDING':
        return <Clock className="h-4 w-4 text-amber-600" />
      case 'NEEDS_REVIEW':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <FileText className="h-4 w-4 text-gray-400" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        <span className="ml-3 text-gray-600">Carregando referências...</span>
      </div>
    )
  }

  if (references.length === 0) {
    return (
      <div className="text-center p-8 bg-gray-50 rounded-lg border border-gray-200">
        <BookOpen className="h-12 w-12 mx-auto mb-3 text-gray-300" />
        <p className="text-gray-600 font-medium">Nenhuma referência encontrada</p>
        <p className="text-sm text-gray-500 mt-1">
          Este resíduo ainda não possui referências bibliográficas cadastradas.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Statistics Card */}
      {showStatistics && statistics && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border border-green-200">
          <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-green-600" />
            Estatísticas das Referências
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <div className="text-2xl font-bold text-green-600">
                {statistics.total_referencias}
              </div>
              <div className="text-xs text-gray-600">Total de Refs</div>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <div className="text-2xl font-bold text-blue-600">
                {statistics.referencias_validadas}
              </div>
              <div className="text-xs text-gray-600">Validadas</div>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <div className="text-2xl font-bold text-purple-600">
                {statistics.referencias_com_doi}
              </div>
              <div className="text-xs text-gray-600">Com DOI</div>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <div className="text-2xl font-bold text-amber-600">
                {statistics.parametros_cobertos.length}
              </div>
              <div className="text-xs text-gray-600">Parâmetros</div>
            </div>
          </div>

          {/* Year coverage */}
          {statistics.anos_cobertura.length > 0 && (
            <div className="mt-3 pt-3 border-t border-green-200">
              <div className="text-xs text-gray-600">
                <span className="font-medium">Cobertura Temporal:</span>{' '}
                {Math.min(...statistics.anos_cobertura)} - {Math.max(...statistics.anos_cobertura)}
                {' '}({statistics.anos_cobertura.length} anos diferentes)
              </div>
            </div>
          )}

          {/* Parameters covered */}
          {statistics.parametros_cobertos.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {statistics.parametros_cobertos.map((param) => (
                <span
                  key={param}
                  className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full"
                >
                  {param}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* References List */}
      <div className="space-y-3" style={{ maxHeight, overflowY: 'auto' }}>
        {references.map((ref) => (
          <div
            key={ref.id}
            className="bg-white rounded-lg border border-gray-200 hover:border-green-300 hover:shadow-md transition-all"
          >
            <div className="p-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {getValidationIcon(ref.validation_status)}
                    {ref.ano && (
                      <span className="text-sm font-semibold text-gray-700">
                        ({ref.ano})
                      </span>
                    )}
                    {ref.validation_status && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full text-white"
                        style={{
                          backgroundColor: getValidationStatusColor(ref.validation_status as any)
                        }}
                      >
                        {getValidationStatusLabel(ref.validation_status as any)}
                      </span>
                    )}
                  </div>

                  {/* ABNT Citation */}
                  <p className="text-sm text-gray-900 leading-relaxed">
                    {ref.referencia_texto}
                  </p>
                </div>

                {/* Expand/Collapse Button */}
                <button
                  onClick={() => toggleExpanded(ref.id)}
                  className="flex-shrink-0 p-1 hover:bg-gray-100 rounded transition-colors"
                  title={expandedRefs.has(ref.id) ? 'Ver menos' : 'Ver mais'}
                >
                  {expandedRefs.has(ref.id) ? (
                    <ChevronUp className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  )}
                </button>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mt-2">
                {ref.tipo && (
                  <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                    {ref.tipo}
                  </span>
                )}
                {ref.parametro_relacionado && (
                  <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                    {ref.parametro_relacionado}
                  </span>
                )}
                {ref.fonte && (
                  <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                    Fonte: {ref.fonte}
                  </span>
                )}
              </div>

              {/* Expanded Content */}
              {expandedRefs.has(ref.id) && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                  {/* DOI Link */}
                  {ref.doi && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-700">DOI:</span>
                      <a
                        href={`https://doi.org/${ref.doi}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                      >
                        {ref.doi}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}

                  {/* URL Link */}
                  {ref.url && !ref.doi && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-700">Link:</span>
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 truncate"
                      >
                        {ref.url.substring(0, 50)}...
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}

                  {/* Notes */}
                  {ref.notas && (
                    <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                      <span className="text-xs font-semibold text-amber-800 block mb-1">
                        Notas:
                      </span>
                      <p className="text-sm text-amber-900">{ref.notas}</p>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                    {ref.created_at && (
                      <div>
                        <span className="font-medium">Cadastrado:</span>{' '}
                        {new Date(ref.created_at).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                    {ref.updated_at && ref.updated_at !== ref.created_at && (
                      <div>
                        <span className="font-medium">Atualizado:</span>{' '}
                        {new Date(ref.updated_at).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

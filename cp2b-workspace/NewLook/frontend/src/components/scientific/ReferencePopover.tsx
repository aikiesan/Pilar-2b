'use client'

import { X, ExternalLink, BookOpen, Beaker } from 'lucide-react'
import { ScientificReference } from '@/types/scientific'

interface ReferencePopoverProps {
  references: ScientificReference[]
  onClose: () => void
  title: string
  /** Parameter type for displaying reported values context */
  parameterType?: string
}

/**
 * Get the unit label for a parameter type
 */
function getParameterUnit(parameterType?: string): string {
  switch (parameterType) {
    case 'bmp':
      return 'L CH₄/kg SV'
    case 'ts':
      return '%'
    case 'vs':
      return '% ST'
    case 'cn_ratio':
      return ':1'
    case 'ch4_content':
      return '%'
    case 'ph':
      return ''
    case 'cod':
      return 'g O₂/L'
    default:
      return ''
  }
}

export default function ReferencePopover({ references, onClose, title, parameterType }: ReferencePopoverProps) {
  const unit = getParameterUnit(parameterType)

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col border border-gray-200 dark:border-slate-700">
        {/* Header */}
        <div className="p-5 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-lg">
              <BookOpen className="h-5 w-5 text-green-700 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Referências para {title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {references.length} {references.length === 1 ? 'estudo' : 'estudos'} encontrado{references.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-5 space-y-4">
          {references.length > 0 ? (
            references.map((ref, index) => {
              // Extract reported value from extracted_data if available
              const reportedValue = ref.extracted_data?.[parameterType || ''] ||
                                   ref.extracted_data?.reported_value ||
                                   ref.extracted_data?.value

              return (
                <div
                  key={ref.id || ref.doi || index}
                  className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 border border-gray-100 dark:border-slate-600 hover:border-green-200 dark:hover:border-green-700 transition-colors"
                >
                  {/* Title and Authors */}
                  <h4 className="font-semibold text-gray-900 dark:text-white leading-tight">
                    {ref.title}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {ref.authors} <span className="font-semibold text-green-700 dark:text-green-400">({ref.year})</span>
                  </p>

                  {/* Reported Value Badge */}
                  {reportedValue && (
                    <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg">
                      <Beaker className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
                        Valor reportado: <span className="font-mono font-bold">{reportedValue}{unit && ` ${unit}`}</span>
                      </span>
                    </div>
                  )}

                  {/* Journal Info */}
                  {ref.journal && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 italic">
                      {ref.journal}
                      {ref.volume && `, vol. ${ref.volume}`}
                      {ref.issue && `(${ref.issue})`}
                      {ref.pages && `, pp. ${ref.pages}`}
                    </p>
                  )}

                  {/* Links */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {ref.doi && (
                      <a
                        href={`https://doi.org/${ref.doi}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        DOI: {ref.doi}
                      </a>
                    )}
                    {ref.url && !ref.doi && (
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Acessar artigo
                      </a>
                    )}
                    {ref.peer_reviewed && (
                      <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 rounded-lg">
                        ✓ Peer-Reviewed
                      </span>
                    )}
                  </div>
                </div>
              )
            })
          ) : (
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400">
                Nenhuma referência específica encontrada para este parâmetro.
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Os valores podem estar baseados em estimativas ou médias da literatura.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {references.length > 0 && (
          <div className="p-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 rounded-b-xl">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Os valores apresentados são baseados em revisão sistemática da literatura científica.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

/**
 * PILAR-2b V3 - Floating Filter Panel
 * DBFZ-inspired floating panel for filters and controls
 * Can be toggled on/off and dragged (future feature)
 */

import React, { useState } from 'react'
import {
  X,
  ChevronDown,
  ChevronRight,
  Filter,
  BarChart3,
  Palette,
  Minimize2,
  Maximize2
} from 'lucide-react'
import StatsPanel from '@/components/dashboard/StatsPanel'
import type { FilterCriteria } from '@/components/dashboard/FilterPanel'

interface FloatingFilterPanelProps {
  isOpen: boolean
  onClose: () => void
  activeFilters: FilterCriteria
  onFilterChange: (filters: FilterCriteria) => void
}

export default function FloatingFilterPanel({
  isOpen,
  onClose,
  activeFilters,
  onFilterChange
}: FloatingFilterPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['statistics'])
  )
  const [isMinimized, setIsMinimized] = useState(false)

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  if (!isOpen) return null

  return (
    <div
      className={`
        absolute left-4 bottom-4 z-40
        bg-white rounded-lg shadow-2xl border border-gray-200
        transition-all duration-300 ease-in-out
        ${isMinimized ? 'w-12 h-12' : 'w-80 max-h-[calc(100vh-120px)]'}
      `}
      role="dialog"
      aria-label="Painel de filtros"
    >
      {isMinimized ? (
        /* Minimized State */
        <button
          onClick={() => setIsMinimized(false)}
          className="w-full h-full flex items-center justify-center text-[#1E5128] hover:bg-gray-50 rounded-lg"
          aria-label="Expandir painel de filtros"
        >
          <Maximize2 className="h-5 w-5" />
        </button>
      ) : (
        /* Expanded State */
        <>
          {/* Panel Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-[#1E5128] to-[#2C6B3A] rounded-t-lg">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Painel de Controle
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(true)}
                className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded"
                aria-label="Minimizar painel"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
              <button
                onClick={onClose}
                className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded"
                aria-label="Fechar painel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Panel Content */}
          <div className="overflow-y-auto max-h-[calc(100vh-200px)] p-3 space-y-3">
            {/* Section 1: Statistics */}
            <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => toggleSection('statistics')}
                className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-100 transition-colors"
                aria-expanded={expandedSections.has('statistics')}
              >
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-[#1E5128]" />
                  <span className="font-medium text-gray-900 text-sm">
                    Estatísticas
                  </span>
                </div>
                {expandedSections.has('statistics') ? (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                )}
              </button>

              {expandedSections.has('statistics') && (
                <div className="p-3 border-t border-gray-200 bg-white">
                  <StatsPanel />
                </div>
              )}
            </div>

            {/* Section 2: Filters */}
            <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => toggleSection('filters')}
                className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-100 transition-colors"
                aria-expanded={expandedSections.has('filters')}
              >
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-[#1E5128]" />
                  <span className="font-medium text-gray-900 text-sm">
                    Filtros de Dados
                  </span>
                </div>
                {expandedSections.has('filters') ? (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                )}
              </button>

              {expandedSections.has('filters') && (
                <div className="p-3 border-t border-gray-200 bg-white space-y-3">
                  {/* Search */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Buscar Município
                    </label>
                    <input
                      type="text"
                      value={activeFilters.searchQuery || ''}
                      onChange={(e) => onFilterChange({ ...activeFilters, searchQuery: e.target.value })}
                      placeholder="Nome ou código IBGE..."
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E5128] focus:border-transparent"
                    />
                  </div>

                  {/* Residue Type */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Tipo de Resíduo
                    </label>
                    <div className="space-y-1">
                      {[
                        { id: 'agricultural', label: 'Agrícola', value: 'agricultural' },
                        { id: 'livestock', label: 'Pecuária', value: 'livestock' },
                        { id: 'urban', label: 'Urbano', value: 'urban' }
                      ].map((option) => (
                        <label key={option.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={activeFilters.residueTypes?.includes(option.value as any) || false}
                            onChange={(e) => {
                              const current = activeFilters.residueTypes || []
                              const updated = e.target.checked
                                ? [...current, option.value as any]
                                : current.filter(t => t !== option.value)
                              onFilterChange({ ...activeFilters, residueTypes: updated })
                            }}
                            className="w-3.5 h-3.5 text-[#1E5128] border-gray-300 rounded focus:ring-[#1E5128]"
                          />
                          <span className="text-xs text-gray-700">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Biogas Range */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Potencial de Biogás (m³/ano)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        value={activeFilters.minBiogas || ''}
                        onChange={(e) => onFilterChange({ ...activeFilters, minBiogas: Number(e.target.value) || undefined })}
                        placeholder="Mín"
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-[#1E5128]"
                      />
                      <input
                        type="number"
                        value={activeFilters.maxBiogas || ''}
                        onChange={(e) => onFilterChange({ ...activeFilters, maxBiogas: Number(e.target.value) || undefined })}
                        placeholder="Máx"
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-[#1E5128]"
                      />
                    </div>
                  </div>

                  {/* Clear Filters Button */}
                  {(activeFilters.searchQuery ||
                    (activeFilters.residueTypes && activeFilters.residueTypes.length > 0) ||
                    activeFilters.minBiogas ||
                    activeFilters.maxBiogas) && (
                    <button
                      onClick={() => onFilterChange({
                        residueTypes: [],
                        regions: [],
                        searchQuery: '',
                        nearRailway: false,
                        nearPipeline: false,
                        nearSubstation: false,
                        proximityRadius: 50
                      })}
                      className="w-full px-3 py-1.5 text-xs bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors font-medium"
                    >
                      Limpar Filtros
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Section 3: Visualization */}
            <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => toggleSection('visualization')}
                className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-100 transition-colors"
                aria-expanded={expandedSections.has('visualization')}
              >
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-[#1E5128]" />
                  <span className="font-medium text-gray-900 text-sm">
                    Visualização
                  </span>
                </div>
                {expandedSections.has('visualization') ? (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                )}
              </button>

              {expandedSections.has('visualization') && (
                <div className="p-3 border-t border-gray-200 bg-white space-y-2">
                  {[
                    { id: 'circles', label: 'Círculos Proporcionais' },
                    { id: 'choropleth', label: 'Mapa Coroplético' },
                    { id: 'heatmap', label: 'Mapa de Calor' }
                  ].map((style) => (
                    <label
                      key={style.id}
                      className="flex items-center gap-2 p-2 border border-gray-200 rounded hover:border-[#1E5128] hover:bg-green-50 transition-colors cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="viz-style"
                        id={style.id}
                        className="w-3.5 h-3.5 text-[#1E5128] border-gray-300 focus:ring-[#1E5128]"
                        defaultChecked={style.id === 'circles'}
                      />
                      <span className="text-xs font-medium text-gray-900">{style.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

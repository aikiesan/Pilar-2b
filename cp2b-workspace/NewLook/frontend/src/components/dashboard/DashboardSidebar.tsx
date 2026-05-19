/**
 * PILAR-2b V3 - Dashboard Sidebar (V2 Style)
 * Organized sidebar with Statistics, Filters, and Visualization controls
 */

'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, BarChart3, Filter, Palette } from 'lucide-react';
import StatsPanel from './StatsPanel';
import type { FilterCriteria } from './FilterPanel';

interface DashboardSidebarProps {
  userName: string;
  activeFilters: FilterCriteria;
  onFilterChange: (filters: FilterCriteria) => void;
}

export default function DashboardSidebar({
  userName,
  activeFilters,
  onFilterChange
}: DashboardSidebarProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['statistics'])
  );

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1E5128] to-[#2C6B3A] text-white px-4 py-4 rounded-lg mb-4">
        <h2 className="text-lg font-bold text-center mb-1">
          🗺️ Painel de Controle do Mapa
        </h2>
        <p className="text-xs text-center text-green-100">
          Olá, {userName}!
        </p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {/* Section 1: Statistics */}
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <button
            onClick={() => toggleSection('statistics')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-200"
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-[#1E5128]" />
              <span className="font-semibold text-gray-900 text-sm">
                📊 Estatísticas
              </span>
            </div>
            {expandedSections.has('statistics') ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            )}
          </button>

          {expandedSections.has('statistics') && (
            <div className="p-3">
              <StatsPanel />
            </div>
          )}
        </div>

        {/* Section 2: Data Filters */}
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <button
            onClick={() => toggleSection('filters')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-200"
          >
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-[#1E5128]" />
              <span className="font-semibold text-gray-900 text-sm">
                📊 Filtros de Dados
              </span>
            </div>
            {expandedSections.has('filters') ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            )}
          </button>

          {expandedSections.has('filters') && (
            <div className="p-3 space-y-3">
              {/* Search */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
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
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Tipo de Resíduo
                </label>
                <div className="space-y-1.5">
                  {[
                    { id: 'agricultural', label: '🌾 Agrícola', value: 'agricultural' },
                    { id: 'livestock', label: '🐄 Pecuária', value: 'livestock' },
                    { id: 'urban', label: '🏙️ Urbano', value: 'urban' }
                  ].map((option) => (
                    <label key={option.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activeFilters.residueTypes?.includes(option.value as any) || false}
                        onChange={(e) => {
                          const current = activeFilters.residueTypes || [];
                          const updated = e.target.checked
                            ? [...current, option.value as any]
                            : current.filter(t => t !== option.value);
                          onFilterChange({ ...activeFilters, residueTypes: updated });
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
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Potencial de Biogás (m³/ano)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={activeFilters.minBiogas || ''}
                    onChange={(e) => onFilterChange({ ...activeFilters, minBiogas: Number(e.target.value) || undefined })}
                    placeholder="Mínimo"
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-[#1E5128]"
                  />
                  <input
                    type="number"
                    value={activeFilters.maxBiogas || ''}
                    onChange={(e) => onFilterChange({ ...activeFilters, maxBiogas: Number(e.target.value) || undefined })}
                    placeholder="Máximo"
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-[#1E5128]"
                  />
                </div>
              </div>

              {/* Population Range */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  População
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={activeFilters.minPopulation || ''}
                    onChange={(e) => onFilterChange({ ...activeFilters, minPopulation: Number(e.target.value) || undefined })}
                    placeholder="Mínimo"
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-[#1E5128]"
                  />
                  <input
                    type="number"
                    value={activeFilters.maxPopulation || ''}
                    onChange={(e) => onFilterChange({ ...activeFilters, maxPopulation: Number(e.target.value) || undefined })}
                    placeholder="Máximo"
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-[#1E5128]"
                  />
                </div>
              </div>

              {/* Clear Filters */}
              {(activeFilters.searchQuery ||
                (activeFilters.residueTypes && activeFilters.residueTypes.length > 0) ||
                activeFilters.minBiogas ||
                activeFilters.maxBiogas ||
                activeFilters.minPopulation ||
                activeFilters.maxPopulation) && (
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

        {/* Section 3: Visualization Styles */}
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <button
            onClick={() => toggleSection('visualization')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-200"
          >
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-[#1E5128]" />
              <span className="font-semibold text-gray-900 text-sm">
                🎨 Estilos de Visualização
              </span>
            </div>
            {expandedSections.has('visualization') ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            )}
          </button>

          {expandedSections.has('visualization') && (
            <div className="p-3 space-y-2">
              <p className="text-xs text-gray-600 mb-2">
                🎯 Escolha o estilo de visualização:
              </p>
              {[
                { id: 'circles', label: '⭕ Círculos Proporcionais', description: 'Tamanho = Potencial' },
                { id: 'choropleth', label: '🗺️ Mapa de Preenchimento', description: 'Cores por intensidade' },
                { id: 'heatmap', label: '🔥 Mapa de Calor', description: 'Densidade visual' },
                { id: 'clusters', label: '📍 Agrupamentos', description: 'Clusters interativos' }
              ].map((style) => (
                <div
                  key={style.id}
                  className="p-2 border border-gray-200 rounded hover:border-[#1E5128] hover:bg-green-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-start gap-2">
                    <input
                      type="radio"
                      name="viz-style"
                      id={style.id}
                      className="mt-0.5 w-3.5 h-3.5 text-[#1E5128] border-gray-300 focus:ring-[#1E5128]"
                      defaultChecked={style.id === 'circles'}
                    />
                    <label htmlFor={style.id} className="flex-1 cursor-pointer">
                      <div className="text-xs font-medium text-gray-900">{style.label}</div>
                      <div className="text-[10px] text-gray-500">{style.description}</div>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

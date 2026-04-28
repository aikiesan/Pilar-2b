/**
 * PILAR-2b V3 - Advanced Filter Panel
 * Multi-criteria filtering for municipalities
 */

'use client'

import { useState } from 'react'
import { Filter, X, Search } from 'lucide-react'

export interface FilterCriteria {
  // Biogas potential
  minBiogas?: number
  maxBiogas?: number
  residueTypes: ('agricultural' | 'livestock' | 'urban')[]

  // Geographic
  regions: string[]
  searchQuery: string

  // Population
  minPopulation?: number
  maxPopulation?: number

  // Infrastructure proximity
  nearRailway: boolean
  nearPipeline: boolean
  nearSubstation: boolean
  proximityRadius: number // km
}

interface FilterPanelProps {
  onFilterChange?: (filters: FilterCriteria) => void
}

export default function FilterPanel({ onFilterChange }: FilterPanelProps) {
  const [filters, setFilters] = useState<FilterCriteria>({
    minBiogas: undefined,
    maxBiogas: undefined,
    residueTypes: [],
    regions: [],
    searchQuery: '',
    minPopulation: undefined,
    maxPopulation: undefined,
    nearRailway: false,
    nearPipeline: false,
    nearSubstation: false,
    proximityRadius: 50,
  })

  const [activeFilters, setActiveFilters] = useState(0)

  const updateFilter = <K extends keyof FilterCriteria>(
    key: K,
    value: FilterCriteria[K]
  ) => {
    const updated = { ...filters, [key]: value }
    setFilters(updated)

    // Count active filters
    const count = Object.entries(updated).filter(([k, v]) => {
      if (k === 'residueTypes' || k === 'regions') return (v as any[]).length > 0
      if (k === 'searchQuery') return !!v
      if (typeof v === 'boolean') return v
      if (typeof v === 'number') return true
      return false
    }).length
    setActiveFilters(count)

    onFilterChange?.(updated)
  }

  const clearFilters = () => {
    const cleared: FilterCriteria = {
      minBiogas: undefined,
      maxBiogas: undefined,
      residueTypes: [],
      regions: [],
      searchQuery: '',
      minPopulation: undefined,
      maxPopulation: undefined,
      nearRailway: false,
      nearPipeline: false,
      nearSubstation: false,
      proximityRadius: 50,
    }
    setFilters(cleared)
    setActiveFilters(0)
    onFilterChange?.(cleared)
  }

  const toggleResidueType = (type: 'agricultural' | 'livestock' | 'urban') => {
    const updated = filters.residueTypes.includes(type)
      ? filters.residueTypes.filter(t => t !== type)
      : [...filters.residueTypes, type]
    updateFilter('residueTypes', updated)
  }

  const regions = [
    'Metropolitana de São Paulo',
    'Campinas',
    'Ribeirão Preto',
    'Sorocaba',
    'Santos',
    'São José dos Campos',
    'Bauru',
    'São José do Rio Preto',
  ]

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-[#1E5128]" />
          <h3 className="font-bold text-gray-900">Filtros Avançados</h3>
          {activeFilters > 0 && (
            <span className="bg-[#1E5128] text-white text-xs px-2 py-0.5 rounded-full">
              {activeFilters}
            </span>
          )}
        </div>
        {activeFilters > 0 && (
          <button
            onClick={clearFilters}
            className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
          >
            <X className="h-3 w-3" />
            Limpar
          </button>
        )}
      </div>

      {/* Search */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Buscar Município
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => updateFilter('searchQuery', e.target.value)}
            placeholder="Nome ou código IBGE..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1E5128] focus:border-transparent"
          />
        </div>
      </div>

      {/* Biogas Potential Range */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-2">
          Potencial de Biogás (m³/ano)
        </label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            value={filters.minBiogas || ''}
            onChange={(e) => updateFilter('minBiogas', e.target.value ? parseFloat(e.target.value) : undefined)}
            placeholder="Mínimo"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1E5128] focus:border-transparent"
          />
          <input
            type="number"
            value={filters.maxBiogas || ''}
            onChange={(e) => updateFilter('maxBiogas', e.target.value ? parseFloat(e.target.value) : undefined)}
            placeholder="Máximo"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1E5128] focus:border-transparent"
          />
        </div>
      </div>

      {/* Residue Types */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-2">
          Tipo de Resíduo
        </label>
        <div className="space-y-2">
          {[
            { type: 'agricultural' as const, label: '🌾 Agrícola', color: 'green' },
            { type: 'livestock' as const, label: '🐄 Pecuária', color: 'yellow' },
            { type: 'urban' as const, label: '🏙️ Urbano', color: 'blue' },
          ].map(({ type, label, color }) => (
            <label key={type} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
              <input
                type="checkbox"
                checked={filters.residueTypes.includes(type)}
                onChange={() => toggleResidueType(type)}
                className={`h-4 w-4 rounded border-gray-300 text-${color}-600 focus:ring-${color}-500`}
              />
              <span className="text-sm text-gray-700">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Regions */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-2">
          Regiões Administrativas
        </label>
        <select
          multiple
          value={filters.regions}
          onChange={(e) => updateFilter('regions', Array.from(e.target.selectedOptions, option => option.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1E5128] focus:border-transparent"
          size={4}
        >
          {regions.map(region => (
            <option key={region} value={region}>
              {region}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          Ctrl+Click para selecionar múltiplas
        </p>
      </div>

      {/* Infrastructure Proximity */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-2">
          Proximidade de Infraestrutura
        </label>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
            <input
              type="checkbox"
              checked={filters.nearRailway}
              onChange={(e) => updateFilter('nearRailway', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-[#1E5128] focus:ring-[#1E5128]"
            />
            <span className="text-sm text-gray-700">🛣️ Próximo a rodovias</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
            <input
              type="checkbox"
              checked={filters.nearPipeline}
              onChange={(e) => updateFilter('nearPipeline', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-[#1E5128] focus:ring-[#1E5128]"
            />
            <span className="text-sm text-gray-700">🔧 Próximo a gasodutos</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
            <input
              type="checkbox"
              checked={filters.nearSubstation}
              onChange={(e) => updateFilter('nearSubstation', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-[#1E5128] focus:ring-[#1E5128]"
            />
            <span className="text-sm text-gray-700">🔌 Próximo a subestações</span>
          </label>
        </div>
        {(filters.nearRailway || filters.nearPipeline || filters.nearSubstation) && (
          <div className="mt-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Raio (km)
            </label>
            <input
              type="number"
              value={filters.proximityRadius}
              onChange={(e) => updateFilter('proximityRadius', parseFloat(e.target.value) || 50)}
              min="1"
              max="200"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1E5128] focus:border-transparent"
            />
          </div>
        )}
      </div>

      {/* Population Range */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-2">
          População
        </label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            value={filters.minPopulation || ''}
            onChange={(e) => updateFilter('minPopulation', e.target.value ? parseInt(e.target.value) : undefined)}
            placeholder="Mínimo"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1E5128] focus:border-transparent"
          />
          <input
            type="number"
            value={filters.maxPopulation || ''}
            onChange={(e) => updateFilter('maxPopulation', e.target.value ? parseInt(e.target.value) : undefined)}
            placeholder="Máximo"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1E5128] focus:border-transparent"
          />
        </div>
      </div>
    </div>
  )
}

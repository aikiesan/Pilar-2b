/**
 * PILAR-2b V3 - Left Filter Panel
 * Search bar and residue filter controls
 */

'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Search, Minus, Plus } from 'lucide-react';
import type { ResidueType, BiomassType } from './FloatingControlPanel';
import type { DisplayMetric, ResidueCNMatrix } from '@/types/geospatial';
import { useTranslations } from 'next-intl';

export type VisualizationMode = 'choropleth' | 'heatmap' | 'bubble' | 'clusters';

interface LeftFilterPanelProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedResidues: ResidueType[];
  onResiduesChange: (residues: ResidueType[]) => void;
  biomassType: BiomassType;
  onBiomassTypeChange: (type: BiomassType) => void;
  visualizationMode?: VisualizationMode;
  onVisualizationModeChange?: (mode: VisualizationMode) => void;
  displayMetric?: DisplayMetric;
  onDisplayMetricChange?: (metric: DisplayMetric) => void;
  cnMatrix?: ResidueCNMatrix | null;
}

export default function LeftFilterPanel({
  searchQuery,
  onSearchChange,
  selectedResidues,
  onResiduesChange,
  biomassType,
  onBiomassTypeChange,
  visualizationMode = 'choropleth',
  onVisualizationModeChange,
  displayMetric = 'biomass_tons',
  onDisplayMetricChange,
  cnMatrix,
}: LeftFilterPanelProps) {
  const t = useTranslations('Map');
  const [isMinimized, setIsMinimized] = useState(true);
  const [showResidues, setShowResidues] = useState(false);
  const [showVisualization, setShowVisualization] = useState(false);
  const [showBiomassTypes, setShowBiomassTypes] = useState(false);

  const residueOptions = [
    { value: 'sugarcane', label: 'Cana-de-açúcar', category: 'agricultural', icon: '🌾' },
    { value: 'soybean', label: 'Soja', category: 'agricultural', icon: '🌿' },
    { value: 'corn', label: 'Milho', category: 'agricultural', icon: '🌽' },
    { value: 'coffee', label: 'Café', category: 'agricultural', icon: '☕' },
    { value: 'citrus', label: 'Citrus', category: 'agricultural', icon: '🍊' },
    { value: 'cattle', label: 'Bovinos', category: 'livestock', icon: '🐄' },
    { value: 'swine', label: 'Suínos', category: 'livestock', icon: '🐷' },
    { value: 'poultry', label: 'Aves', category: 'livestock', icon: '🐔' },
    { value: 'aquaculture', label: 'Aquicultura', category: 'livestock', icon: '🐟' },
    { value: 'rsu', label: 'RSU', category: 'urban', icon: '🗑️' },
    { value: 'rpo', label: t('residues.rpo'), category: 'urban', icon: '♻️' },
  ] as const;

  const biomassOptions = [
    { value: 'total', label: 'Potencial Total', icon: '⚡' },
    { value: 'agricultural', label: 'Agrícola', icon: '🌾' },
    { value: 'livestock', label: 'Pecuária', icon: '🐄' },
    { value: 'urban', label: 'Urbano', icon: '🏙️' }
  ];

  const handleResidueToggle = (residue: ResidueType) => {
    const newResidues = selectedResidues.includes(residue)
      ? selectedResidues.filter(r => r !== residue)
      : [...selectedResidues, residue];

    onResiduesChange(newResidues);
  };

  if (isMinimized) {
    return (
      <div className="absolute top-16 left-2 md:top-20 md:left-4 z-[400]">
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-white/95 backdrop-blur-sm shadow-lg rounded-lg p-2 md:p-3 hover:bg-white transition-colors"
          aria-label="Expand filter panel"
        >
          <Plus className="w-4 h-4 md:w-5 md:h-5 text-gray-700" />
        </button>
      </div>
    );
  }

  return (
    <div className="absolute top-16 left-2 md:top-20 md:left-4 z-[400] w-[calc(100vw-1rem)] max-w-[280px] md:w-72 md:max-w-80 max-h-[calc(100vh-100px)] md:max-h-[calc(100vh-120px)]">
      <div className="bg-white/95 backdrop-blur-sm shadow-lg rounded-lg overflow-hidden flex flex-col max-h-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1E5128] to-[#2C6B3A] px-3 py-2.5 flex items-center justify-between">
          <h3 className="text-white text-sm font-semibold flex items-center gap-2">
            <span className="text-lg">🔍</span>
            PILAR-2b BiogasAtlas
          </h3>
          <button
            onClick={() => setIsMinimized(true)}
            className="text-white/80 hover:text-white transition-colors"
            aria-label="Minimize panel"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 space-y-3 overflow-y-auto flex-1">
          {/* Search */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
              Buscar Município
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Nome ou código IBGE..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
              />
            </div>
          </div>

          {/* Metric Toggle */}
          {onDisplayMetricChange && (
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Métrica Principal
              </label>
              <div className="flex rounded-lg border border-gray-300 overflow-hidden text-xs">
                <button
                  onClick={() => onDisplayMetricChange('biomass_tons')}
                  className={`flex-1 py-1.5 px-2 font-medium transition-colors ${
                    displayMetric === 'biomass_tons'
                      ? 'bg-green-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  🌿 Biomassa (t/ano)
                </button>
                <button
                  onClick={() => onDisplayMetricChange('biogas_m3')}
                  className={`flex-1 py-1.5 px-2 font-medium transition-colors ${
                    displayMetric === 'biogas_m3'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  ⚡ Biogás (m³/ano)
                </button>
              </div>
            </div>
          )}

          {/* Residue Filter */}
          <div>
            <button
              onClick={() => setShowResidues(!showResidues)}
              className="flex items-center justify-between w-full text-xs font-semibold text-gray-700 uppercase tracking-wide hover:text-gray-900 transition-colors mb-1.5"
            >
              <span className="flex items-center gap-1.5">
                🌾 Filtrar por Resíduo {selectedResidues.length > 0 && `(${selectedResidues.length})`}
              </span>
              {showResidues ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {showResidues && (
              <div className="space-y-1 max-h-[400px] overflow-y-auto">
                {selectedResidues.length > 0 && (
                  <button
                    onClick={() => onResiduesChange([])}
                    className="w-full text-xs text-red-600 hover:text-red-800 text-left px-2 py-1.5 font-medium bg-red-50 rounded hover:bg-red-100 transition-colors"
                  >
                    ✕ Limpar filtros ({selectedResidues.length})
                  </button>
                )}

                {/* Agricultural */}
                <div className="pt-2">
                  <div className="text-[10px] text-gray-600 uppercase font-bold mb-1.5 px-2 flex items-center gap-1">
                    <span className="text-sm">🌾</span> Agrícola
                  </div>
                  {residueOptions.filter(r => r.category === 'agricultural').map((residue) => (
                    <label
                      key={residue.value}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                        selectedResidues.includes(residue.value as ResidueType)
                          ? 'bg-green-50 border border-green-200'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedResidues.includes(residue.value as ResidueType)}
                        onChange={() => handleResidueToggle(residue.value as ResidueType)}
                        className="w-4 h-4 text-green-600 rounded flex-shrink-0"
                      />
                      <span className="text-xs text-gray-700 font-medium flex-1">
                        {residue.icon} {residue.label}
                      </span>
                      {cnMatrix && (() => {
                        const entry = cnMatrix.residues.find(r => r.key === residue.value);
                        if (!entry) return null;
                        const badgeClass = entry.cn_role === 'nitrogen_donor'
                          ? 'bg-blue-100 text-blue-700'
                          : entry.cn_role === 'carbon_donor'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-green-100 text-green-700';
                        return (
                          <span
                            className={`text-[9px] font-mono px-1 py-0.5 rounded flex-shrink-0 ${badgeClass}`}
                            title={`C:N ratio: ${entry.cn_ratio} (${entry.cn_role === 'nitrogen_donor' ? 'Leaning N' : entry.cn_role === 'carbon_donor' ? 'Leaning C' : 'Balanced'})`}
                          >
                            {entry.cn_ratio}
                          </span>
                        );
                      })()}
                    </label>
                  ))}
                </div>

                {/* Livestock */}
                <div className="pt-2">
                  <div className="text-[10px] text-gray-600 uppercase font-bold mb-1.5 px-2 flex items-center gap-1">
                    <span className="text-sm">🐄</span> Pecuária
                  </div>
                  {residueOptions.filter(r => r.category === 'livestock').map((residue) => (
                    <label
                      key={residue.value}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                        selectedResidues.includes(residue.value as ResidueType)
                          ? 'bg-yellow-50 border border-yellow-200'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedResidues.includes(residue.value as ResidueType)}
                        onChange={() => handleResidueToggle(residue.value as ResidueType)}
                        className="w-4 h-4 text-yellow-600 rounded flex-shrink-0"
                      />
                      <span className="text-xs text-gray-700 font-medium">
                        {residue.icon} {residue.label}
                      </span>
                    </label>
                  ))}
                </div>

                {/* Urban */}
                <div className="pt-2">
                  <div className="text-[10px] text-gray-600 uppercase font-bold mb-1.5 px-2 flex items-center gap-1">
                    <span className="text-sm">🏙️</span> Urbano
                  </div>
                  {residueOptions.filter(r => r.category === 'urban').map((residue) => (
                    <label
                      key={residue.value}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                        selectedResidues.includes(residue.value as ResidueType)
                          ? 'bg-blue-50 border border-blue-200'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedResidues.includes(residue.value as ResidueType)}
                        onChange={() => handleResidueToggle(residue.value as ResidueType)}
                        className="w-4 h-4 text-blue-600 rounded flex-shrink-0"
                      />
                      <span className="text-xs text-gray-700 font-medium">
                        {residue.icon} {residue.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Visualization Mode Selector */}
          {onVisualizationModeChange && (
            <div>
              <button
                onClick={() => setShowVisualization(!showVisualization)}
                className="flex items-center justify-between w-full text-xs font-semibold text-gray-700 uppercase tracking-wide hover:text-gray-900 transition-colors mb-1.5"
              >
                <span className="flex items-center gap-1.5">
                  🎨 Modo de Visualização
                </span>
                {showVisualization ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
              {showVisualization && (
                <div className="space-y-1">
                  <label
                    className={`flex items-center gap-2 px-2 py-2 rounded cursor-pointer transition-colors ${
                      visualizationMode === 'choropleth'
                        ? 'bg-blue-100 border border-blue-300 text-blue-800'
                        : 'hover:bg-gray-50 text-gray-700 border border-transparent'
                    }`}
                  >
                    <input
                      type="radio"
                      name="visualizationMode"
                      value="choropleth"
                      checked={visualizationMode === 'choropleth'}
                      onChange={() => onVisualizationModeChange('choropleth')}
                      className="w-4 h-4 text-blue-600 flex-shrink-0"
                    />
                    <span className="text-xs font-medium">
                      🗺️ Mapa Coroplético (Preenchimento)
                    </span>
                  </label>
                  <label
                    className={`flex items-center gap-2 px-2 py-2 rounded cursor-pointer transition-colors ${
                      visualizationMode === 'heatmap'
                        ? 'bg-orange-100 border border-orange-300 text-orange-800'
                        : 'hover:bg-gray-50 text-gray-700 border border-transparent'
                    }`}
                  >
                    <input
                      type="radio"
                      name="visualizationMode"
                      value="heatmap"
                      checked={visualizationMode === 'heatmap'}
                      onChange={() => onVisualizationModeChange('heatmap')}
                      className="w-4 h-4 text-orange-600 flex-shrink-0"
                    />
                    <span className="text-xs font-medium">
                      🔥 Mapa de Calor (Concentração)
                    </span>
                  </label>
                  <label
                    className={`flex items-center gap-2 px-2 py-2 rounded cursor-pointer transition-colors ${
                      visualizationMode === 'bubble'
                        ? 'bg-purple-100 border border-purple-300 text-purple-800'
                        : 'hover:bg-gray-50 text-gray-700 border border-transparent'
                    }`}
                  >
                    <input
                      type="radio"
                      name="visualizationMode"
                      value="bubble"
                      checked={visualizationMode === 'bubble'}
                      onChange={() => onVisualizationModeChange('bubble')}
                      className="w-4 h-4 text-purple-600 flex-shrink-0"
                    />
                    <span className="text-xs font-medium">
                      🫧 Bolhas Proporcionais (Volume)
                    </span>
                  </label>
                  <label
                    className={`flex items-center gap-2 px-2 py-2 rounded cursor-pointer transition-colors ${
                      visualizationMode === 'clusters'
                        ? 'bg-violet-100 border border-violet-300 text-violet-800'
                        : 'hover:bg-gray-50 text-gray-700 border border-transparent'
                    }`}
                  >
                    <input
                      type="radio"
                      name="visualizationMode"
                      value="clusters"
                      checked={visualizationMode === 'clusters'}
                      onChange={() => onVisualizationModeChange('clusters')}
                      className="w-4 h-4 text-violet-600 flex-shrink-0"
                    />
                    <span className="text-xs font-medium">
                      🔬 Co-digestão (Clusters C:N)
                    </span>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Biomass Type Selector */}
          <div>
            <button
              onClick={() => setShowBiomassTypes(!showBiomassTypes)}
              className="flex items-center justify-between w-full text-xs font-semibold text-gray-700 uppercase tracking-wide hover:text-gray-900 transition-colors mb-1.5"
            >
              <span className="flex items-center gap-1.5">
                ⚡ Tipo de Biomassa
              </span>
              {showBiomassTypes ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
            {showBiomassTypes && (
              <div className="space-y-1">
                {biomassOptions.map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-center gap-2 px-2 py-2 rounded cursor-pointer transition-colors ${
                      biomassType === option.value
                        ? 'bg-green-100 border border-green-300 text-green-800'
                        : 'hover:bg-gray-50 text-gray-700 border border-transparent'
                    }`}
                  >
                    <input
                      type="radio"
                      name="biomassType"
                      value={option.value}
                      checked={biomassType === option.value}
                      onChange={() => onBiomassTypeChange(option.value as BiomassType)}
                      className="w-4 h-4 text-green-600 flex-shrink-0"
                    />
                    <span className="text-xs font-medium">
                      {option.icon} {option.label}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

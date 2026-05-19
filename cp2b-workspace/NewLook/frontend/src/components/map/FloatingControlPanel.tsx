/**
 * PILAR-2b V3 - Floating Control Panel (DBFZ-inspired)
 * Top-left floating panel with biomass type, search, opacity, and layers
 */

'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Search, Layers, Minus, Plus } from 'lucide-react';

export type BiomassType = 'total' | 'agricultural' | 'livestock' | 'urban';

export type ResidueType =
  | 'sugarcane' | 'soybean' | 'corn' | 'coffee' | 'citrus'
  | 'cattle' | 'swine' | 'poultry' | 'aquaculture'
  | 'rsu' | 'rpo';

interface FloatingControlPanelProps {
  biomassType: BiomassType;
  onBiomassTypeChange: (type: BiomassType) => void;
  opacity: number;
  onOpacityChange: (opacity: number) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  layers: Array<{
    id: string;
    name: string;
    visible: boolean;
    icon: string;
  }>;
  onLayerToggle: (layerId: string, visible: boolean) => void;
  selectedResidues?: ResidueType[];
  onResiduesChange?: (residues: ResidueType[]) => void;
}

export default function FloatingControlPanel({
  biomassType,
  onBiomassTypeChange,
  opacity,
  onOpacityChange,
  searchQuery,
  onSearchChange,
  layers,
  onLayerToggle,
  selectedResidues = [],
  onResiduesChange
}: FloatingControlPanelProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [showLayers, setShowLayers] = useState(false);
  const [showResidues, setShowResidues] = useState(false);
  const [showBiomassTypes, setShowBiomassTypes] = useState(false);

  const biomassOptions = [
    { value: 'total', label: 'Potencial Total', icon: '⚡' },
    { value: 'agricultural', label: 'Agrícola', icon: '🌾' },
    { value: 'livestock', label: 'Pecuária', icon: '🐄' },
    { value: 'urban', label: 'Urbano', icon: '🏙️' }
  ];

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
    { value: 'rpo', label: 'RPO', category: 'urban', icon: '♻️' },
  ] as const;

  const handleResidueToggle = (residue: ResidueType) => {
    if (!onResiduesChange) return;

    const newResidues = selectedResidues.includes(residue)
      ? selectedResidues.filter(r => r !== residue)
      : [...selectedResidues, residue];

    onResiduesChange(newResidues);
  };

  if (isMinimized) {
    return (
      <div className="absolute top-20 left-4 z-[400]">
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-white/95 backdrop-blur-sm shadow-lg rounded-lg p-3 hover:bg-white transition-colors"
          aria-label="Expand control panel"
        >
          <Plus className="w-5 h-5 text-gray-700" />
        </button>
      </div>
    );
  }

  return (
    <div className="absolute top-20 left-4 z-[400] w-72 max-h-[calc(100vh-120px)]">
      <div className="bg-white/95 backdrop-blur-sm shadow-lg rounded-lg overflow-hidden flex flex-col max-h-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1E5128] to-[#2C6B3A] px-3 py-2 flex items-center justify-between">
          <h3 className="text-white text-sm font-semibold">
            PILAR-2b
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
          {/* Biomass Type Selector - Collapsible */}
          <div>
            <button
              onClick={() => setShowBiomassTypes(!showBiomassTypes)}
              className="flex items-center justify-between w-full text-xs font-semibold text-gray-700 uppercase tracking-wide hover:text-gray-900 transition-colors mb-1.5"
            >
              <span className="flex items-center gap-1.5">
                {biomassOptions.find(o => o.value === biomassType)?.icon} Tipo de Biomassa
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
                    className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                      biomassType === option.value
                        ? 'bg-green-100 text-green-800'
                        : 'hover:bg-gray-50 text-gray-700'
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

          {/* Search */}
          <div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Buscar município..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>

          {/* Opacity Slider */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
              Opacidade: {Math.round(opacity * 100)}%
            </label>
            <input
              type="range"
              min="0.3"
              max="1"
              step="0.05"
              value={opacity}
              onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
            />
          </div>

          {/* Residue Filter */}
          {onResiduesChange && (
            <div>
              <button
                onClick={() => setShowResidues(!showResidues)}
                className="flex items-center justify-between w-full text-xs font-semibold text-gray-700 uppercase tracking-wide hover:text-gray-900 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  🔍 Resíduos {selectedResidues.length > 0 && `(${selectedResidues.length})`}
                </span>
                {showResidues ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {showResidues && (
                <div className="mt-2 space-y-1 max-h-[200px] overflow-y-auto">
                  {selectedResidues.length > 0 && (
                    <button
                      onClick={() => onResiduesChange([])}
                      className="w-full text-xs text-red-600 hover:text-red-800 text-left px-1 py-1 font-medium"
                    >
                      ✕ Limpar filtros ({selectedResidues.length})
                    </button>
                  )}

                  {/* Agricultural */}
                  <div className="pt-1">
                    <div className="text-[10px] text-gray-600 uppercase font-bold mb-1 px-1">Agrícola</div>
                    {residueOptions.filter(r => r.category === 'agricultural').map((residue) => (
                      <label
                        key={residue.value}
                        className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedResidues.includes(residue.value as ResidueType)}
                          onChange={() => handleResidueToggle(residue.value as ResidueType)}
                          className="w-3.5 h-3.5 text-green-600 rounded flex-shrink-0"
                        />
                        <span className="text-xs text-gray-700">
                          {residue.icon} {residue.label}
                        </span>
                      </label>
                    ))}
                  </div>

                  {/* Livestock */}
                  <div className="pt-1">
                    <div className="text-[10px] text-gray-600 uppercase font-bold mb-1 px-1">Pecuária</div>
                    {residueOptions.filter(r => r.category === 'livestock').map((residue) => (
                      <label
                        key={residue.value}
                        className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedResidues.includes(residue.value as ResidueType)}
                          onChange={() => handleResidueToggle(residue.value as ResidueType)}
                          className="w-3.5 h-3.5 text-yellow-600 rounded flex-shrink-0"
                        />
                        <span className="text-xs text-gray-700">
                          {residue.icon} {residue.label}
                        </span>
                      </label>
                    ))}
                  </div>

                  {/* Urban */}
                  <div className="pt-1">
                    <div className="text-[10px] text-gray-600 uppercase font-bold mb-1 px-1">Urbano</div>
                    {residueOptions.filter(r => r.category === 'urban').map((residue) => (
                      <label
                        key={residue.value}
                        className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedResidues.includes(residue.value as ResidueType)}
                          onChange={() => handleResidueToggle(residue.value as ResidueType)}
                          className="w-3.5 h-3.5 text-blue-600 rounded flex-shrink-0"
                        />
                        <span className="text-xs text-gray-700">
                          {residue.icon} {residue.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Layers Toggle */}
          <div>
            <button
              onClick={() => setShowLayers(!showLayers)}
              className="flex items-center justify-between w-full text-xs font-semibold text-gray-700 uppercase tracking-wide hover:text-gray-900 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Layers className="w-4 h-4" />
                Camadas
              </span>
              {showLayers ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {showLayers && (
              <div className="mt-2 space-y-1">
                {layers.map((layer) => (
                  <label
                    key={layer.id}
                    className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={layer.visible}
                      onChange={(e) => onLayerToggle(layer.id, e.target.checked)}
                      className="w-3.5 h-3.5 text-green-600 rounded flex-shrink-0"
                    />
                    <span className="text-xs text-gray-700">
                      {layer.icon} {layer.name}
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

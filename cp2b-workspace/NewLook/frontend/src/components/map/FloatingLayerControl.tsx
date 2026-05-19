/**
 * PILAR-2b V3 - Floating Layer Control (DBFZ-style)
 * Draggable layer control panel over the map
 */

'use client';

import React, { useState } from 'react';
import { X, ChevronDown, ChevronRight, Layers } from 'lucide-react';

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  category: 'base' | 'infrastructure' | 'administrative' | 'environmental';
  icon: string;
}

interface FloatingLayerControlProps {
  layers: Layer[];
  onLayerToggle: (layerId: string, visible: boolean) => void;
  onClose?: () => void;
}

export default function FloatingLayerControl({
  layers,
  onLayerToggle,
  onClose
}: FloatingLayerControlProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['base', 'infrastructure', 'environmental'])
  );

  const categories = {
    base: { name: 'Camadas Base', icon: '🗺️', color: 'blue' },
    infrastructure: { name: 'Infraestrutura', icon: '🏭', color: 'orange' },
    administrative: { name: 'Administrativas', icon: '📍', color: 'teal' },
    environmental: { name: 'Ambientais', icon: '🌳', color: 'green' }
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const layersByCategory = layers.reduce((acc, layer) => {
    if (!acc[layer.category]) {
      acc[layer.category] = [];
    }
    acc[layer.category].push(layer);
    return acc;
  }, {} as Record<string, Layer[]>);

  if (isMinimized) {
    return (
      <div className="absolute top-4 right-4 z-[1001]">
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-white hover:bg-gray-50 shadow-lg rounded-lg p-3 transition-colors border border-gray-200"
          title="Abrir camadas"
        >
          <Layers className="h-5 w-5 text-gray-700" />
        </button>
      </div>
    );
  }

  return (
    <div className="absolute top-4 right-4 z-[1001] w-80 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1E5128] to-[#2C6B3A] text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5" />
          <h3 className="font-semibold">Camadas do Mapa</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            title="Minimizar"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded transition-colors"
              title="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Layer List */}
      <div className="max-h-[500px] overflow-y-auto">
        {Object.entries(categories).map(([catKey, catInfo]) => {
          const categoryLayers = layersByCategory[catKey] || [];
          if (categoryLayers.length === 0) return null;

          const isExpanded = expandedCategories.has(catKey);

          return (
            <div key={catKey} className="border-b border-gray-200 last:border-b-0">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(catKey)}
                className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{catInfo.icon}</span>
                  <span className="font-medium text-gray-900 text-sm">
                    {catInfo.name}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({categoryLayers.filter(l => l.visible).length}/{categoryLayers.length})
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                )}
              </button>

              {/* Category Layers */}
              {isExpanded && (
                <div className="bg-gray-50 px-4 py-2 space-y-1.5">
                  {categoryLayers.map((layer) => (
                    <label
                      key={layer.id}
                      className="flex items-center gap-2 cursor-pointer hover:bg-white px-2 py-1.5 rounded transition-colors group"
                    >
                      <input
                        type="checkbox"
                        checked={layer.visible}
                        onChange={(e) => onLayerToggle(layer.id, e.target.checked)}
                        className="w-4 h-4 text-[#1E5128] border-gray-300 rounded focus:ring-[#1E5128] focus:ring-2 cursor-pointer"
                      />
                      <span className="text-base mr-1">{layer.icon}</span>
                      <span className="text-sm text-gray-700 group-hover:text-gray-900 flex-1">
                        {layer.name}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-600">
        <span>
          {layers.filter(l => l.visible).length} camada(s) ativa(s)
        </span>
        <button
          onClick={() => {
            layers.forEach(layer => {
              if (layer.visible) {
                onLayerToggle(layer.id, false);
              }
            });
          }}
          className="text-[#1E5128] hover:text-[#2C6B3A] font-medium"
        >
          Limpar todas
        </button>
      </div>
    </div>
  );
}

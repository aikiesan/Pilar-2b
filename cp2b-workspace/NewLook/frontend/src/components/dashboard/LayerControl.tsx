/**
 * PILAR-2b V3 - Layer Control Component
 * Toggle visibility of different map layers
 */

'use client'

import { useState } from 'react'
import { Layers, ChevronDown, ChevronUp } from 'lucide-react'

export interface Layer {
  id: string
  name: string
  description: string
  visible: boolean
  category: 'infrastructure' | 'administrative' | 'analysis' | 'environmental'
  icon: string
}

interface LayerControlProps {
  onLayerToggle?: (layerId: string, visible: boolean) => void
}

export default function LayerControl({ onLayerToggle }: LayerControlProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    infrastructure: true,
    administrative: true,
    analysis: false,
    environmental: false,
  })

  const [layers, setLayers] = useState<Layer[]>([
    // Infrastructure Layers
    {
      id: 'biogas-plants',
      name: 'Usinas de Biogás',
      description: 'Plantas de biogás existentes',
      visible: true,
      category: 'infrastructure',
      icon: '⚡',
    },
    {
      id: 'railways',
      name: 'Rodovias',
      description: 'Malha rodoviária',
      visible: false,
      category: 'infrastructure',
      icon: '🛣️',
    },
    {
      id: 'pipelines',
      name: 'Gasodutos',
      description: 'Rede de gasodutos',
      visible: false,
      category: 'infrastructure',
      icon: '🔧',
    },
    {
      id: 'substations',
      name: 'Subestações',
      description: 'Subestações elétricas',
      visible: false,
      category: 'infrastructure',
      icon: '🔌',
    },

    // Administrative Layers
    {
      id: 'municipalities',
      name: 'Limites Municipais',
      description: '645 municípios de SP',
      visible: true,
      category: 'administrative',
      icon: '🗺️',
    },
    {
      id: 'regions',
      name: 'Regiões Administrativas',
      description: 'Divisões regionais',
      visible: false,
      category: 'administrative',
      icon: '📍',
    },

    // Analysis Layers
    {
      id: 'biogas-potential',
      name: 'Potencial de Biogás',
      description: 'Classificação por potencial',
      visible: true,
      category: 'analysis',
      icon: '🔥',
    },
    {
      id: 'mcda-results',
      name: 'Resultados MCDA',
      description: 'Análise de localização ótima',
      visible: false,
      category: 'analysis',
      icon: '🎯',
    },

    // Environmental Layers
    {
      id: 'mapbiomas',
      name: 'Uso do Solo (MapBiomas)',
      description: 'Classificação de uso da terra',
      visible: false,
      category: 'environmental',
      icon: '🌿',
    },
    {
      id: 'water-bodies',
      name: 'Corpos Hídricos',
      description: 'Rios e reservatórios',
      visible: false,
      category: 'environmental',
      icon: '💧',
    },
  ])

  const toggleLayer = (layerId: string) => {
    setLayers(prev => {
      const updated = prev.map(layer =>
        layer.id === layerId ? { ...layer, visible: !layer.visible } : layer
      )
      const layer = updated.find(l => l.id === layerId)
      if (layer && onLayerToggle) {
        onLayerToggle(layerId, layer.visible)
      }
      return updated
    })
  }

  const toggleCategory = (category: string) => {
    setExpanded(prev => ({ ...prev, [category]: !prev[category] }))
  }

  const categories = {
    infrastructure: { name: 'Infraestrutura', icon: '🏗️' },
    administrative: { name: 'Administrativo', icon: '📋' },
    analysis: { name: 'Análises', icon: '📊' },
    environmental: { name: 'Ambiental', icon: '🌍' },
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <Layers className="h-5 w-5 text-[#1E5128]" />
        <h3 className="font-bold text-gray-900">Camadas do Mapa</h3>
      </div>

      {(Object.keys(categories) as Array<keyof typeof categories>).map(category => {
        const categoryLayers = layers.filter(l => l.category === category)
        if (categoryLayers.length === 0) return null

        return (
          <div key={category} className="border-b border-gray-200 pb-3 last:border-0">
            <button
              onClick={() => toggleCategory(category)}
              className="w-full flex items-center justify-between py-2 hover:bg-gray-50 rounded transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{categories[category].icon}</span>
                <span className="font-semibold text-sm text-gray-700">
                  {categories[category].name}
                </span>
                <span className="text-xs text-gray-500">
                  ({categoryLayers.filter(l => l.visible).length}/{categoryLayers.length})
                </span>
              </div>
              {expanded[category] ? (
                <ChevronUp className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              )}
            </button>

            {expanded[category] && (
              <div className="mt-2 space-y-2 ml-2">
                {categoryLayers.map(layer => (
                  <label
                    key={layer.id}
                    className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      checked={layer.visible}
                      onChange={() => toggleLayer(layer.id)}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-[#1E5128] focus:ring-[#1E5128]"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{layer.icon}</span>
                        <span className="text-sm font-medium text-gray-900 group-hover:text-[#1E5128] transition-colors">
                          {layer.name}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {layer.description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/**
 * PILAR-2b V3 - Biomass Plants Layer Legend
 * Floating legend showing the biomass plant types currently on the map
 */

'use client';

import React, { useState } from 'react';
import { ChevronUp, ChevronDown, X, Info } from 'lucide-react';
import {
  PLANT_LAYERS,
  SP_PLANT_SUBTYPES,
  isPlantLayer,
  type PlantTypeInfo,
} from '@/lib/plantLayers';

interface BiomassLayerLegendProps {
  /**
   * Ids of the plant layers currently switched on. The legend describes exactly
   * these and nothing else — it used to render a fixed list of four types
   * whenever the biogás layer was on, so it claimed etanol/biometano/UTE were
   * on screen when they were not, and stayed silent when they actually were.
   */
  layerIds?: string[];
}

export default function BiomassLayerLegend({ layerIds = [] }: BiomassLayerLegendProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  // The legacy São Paulo layer draws several subtypes under one id, so it
  // contributes all of them; the national layers contribute exactly one each.
  const plantTypes: PlantTypeInfo[] = [];
  const seen = new Set<string>();
  for (const id of layerIds) {
    const entries = id === 'biogas-plants'
      ? SP_PLANT_SUBTYPES
      : isPlantLayer(id)
      ? [PLANT_LAYERS[id]]
      : [];
    for (const entry of entries) {
      if (seen.has(entry.name)) continue;
      seen.add(entry.name);
      plantTypes.push(entry);
    }
  }

  // Nothing to explain when no plant layer is on.
  if (plantTypes.length === 0) {
    return null;
  }

  if (isHidden) {
    return (
      <button
        onClick={() => setIsHidden(false)}
        className="bg-white/95 backdrop-blur-sm shadow-lg rounded-lg px-3 py-2 text-xs text-gray-600 hover:bg-white transition-colors flex items-center gap-1"
      >
        <Info size={14} />
        Legenda Plantas
      </button>
    );
  }

  return (
    <div className="w-72" data-testid="biomass-layer-legend">
      <div className="bg-white/95 backdrop-blur-sm shadow-lg rounded-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-green-600 to-green-700 px-3 py-2">
          <div className="flex items-center gap-2">
            <Info size={14} className="text-white" />
            <h3 className="text-sm font-semibold text-white">Legenda: Plantas de Biomassa</h3>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-white/80 hover:text-white transition-colors p-1"
              aria-label={isExpanded ? 'Recolher' : 'Expandir'}
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            <button
              onClick={() => setIsHidden(true)}
              className="text-white/80 hover:text-white transition-colors p-1"
              aria-label="Fechar"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-3">
          {/* Plant Types */}
          <div className="space-y-2">
            {plantTypes.map((type) => (
              <div key={type.name} className="flex items-start gap-2">
                {/* Icon */}
                <div
                  style={{
                    backgroundColor: type.color,
                    borderColor: type.borderColor,
                    borderWidth: '2px',
                    borderStyle: 'solid',
                  }}
                  className="rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5"
                >
                  <span className="text-xs">{type.icon}</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">{type.name}</div>
                  <div className="text-xs text-gray-600">{type.description}</div>
                  {isExpanded && (
                    <div className="mt-1 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Fonte:</span>
                        <span>{type.dataSource}</span>
                      </div>
                      <div>
                        <span className="font-medium">Ano:</span> {type.year}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Footer info when expanded */}
          {isExpanded && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                <strong>MapBiomas:</strong> Projeto de mapeamento anual da cobertura e uso do solo do Brasil
              </p>
              <p className="text-xs text-gray-500 mt-1">
                <strong>ANP:</strong> Agência Nacional do Petróleo, Gás Natural e Biocombustíveis
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

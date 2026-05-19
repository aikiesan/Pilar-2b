/**
 * PILAR-2b V3 - Biomass Plants Layer Legend
 * Floating legend showing different biomass plant types and data sources
 */

'use client';

import React, { useState } from 'react';
import { ChevronUp, ChevronDown, X, Info } from 'lucide-react';

interface BiomassLayerLegendProps {
  visible?: boolean;
}

interface PlantTypeInfo {
  name: string;
  icon: string;
  color: string;
  borderColor: string;
  description: string;
  dataSource: string;
  year: string;
  url?: string;
}

const plantTypes: PlantTypeInfo[] = [
  {
    name: 'Etanol',
    icon: '🌽',
    color: '#9B59B6',
    borderColor: '#6C3483',
    description: 'Plantas de produção de etanol',
    dataSource: 'Plantas_Etanol_SP',
    year: '2024',
    url: ''
  },
  {
    name: 'Biogás',
    icon: '🏭',
    color: '#27AE60',
    borderColor: '#1E5128',
    description: 'Plantas de produção de biogás',
    dataSource: 'MapBiomas + ANP',
    year: '2024',
    url: ''
  },
  {
    name: 'Biometano',
    icon: '💨',
    color: '#3498DB',
    borderColor: '#1F618D',
    description: 'Plantas de produção de biometano',
    dataSource: 'MapBiomas + ANP',
    year: '2024',
    url: ''
  },
  {
    name: 'Biomassa UTE',
    icon: '⚡',
    color: '#E67E22',
    borderColor: '#BA4A00',
    description: 'Usinas termelétricas de biomassa',
    dataSource: 'MapBiomas + ANP',
    year: '2024',
    url: ''
  }
];

export default function BiomassLayerLegend({ visible = false }: BiomassLayerLegendProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  // Don't render if not visible (layer is off)
  if (!visible) {
    return null;
  }

  if (isHidden) {
    return (
      <button
        onClick={() => setIsHidden(false)}
        className="absolute bottom-20 left-4 z-[400] bg-white/95 backdrop-blur-sm shadow-lg rounded-lg px-3 py-2 text-xs text-gray-600 hover:bg-white transition-colors flex items-center gap-1"
      >
        <Info size={14} />
        Legenda Plantas
      </button>
    );
  }

  return (
    <div className="absolute bottom-20 left-4 z-[400] w-72">
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
                        {type.url ? (
                          <a
                            href={type.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {type.dataSource}
                          </a>
                        ) : (
                          <span>{type.dataSource}</span>
                        )}
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

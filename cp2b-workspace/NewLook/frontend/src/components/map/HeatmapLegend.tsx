/**
 * PILAR-2b V3 - Heatmap Legend Component
 * Displays heatmap color scale legend with data ranges
 */

'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

// Legend items matching the recalibrated HEAT_GRADIENT in HeatmapLayer.tsx
const legendItems = [
  { color: '#bd0026', label: '> 200M m³/ano', description: 'Muito Alto' },
  { color: '#f03b20', label: '50M – 200M',    description: 'Alto' },
  { color: '#fd8d3c', label: '10M – 50M',     description: 'Médio' },
  { color: '#fecc5c', label: '1M – 10M',      description: 'Baixo' },
  { color: '#ffffb2', label: '< 1M',          description: 'Muito Baixo' },
  { color: '#cccccc', label: 'Sem dados',     description: '' },
];

export default function HeatmapLegend() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="absolute bottom-16 right-2 md:bottom-4 md:right-4 z-[400]">
      <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100 overflow-hidden w-40 md:w-48">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5 bg-gradient-to-r from-orange-50 to-white border-b border-orange-100">
          <span className="text-[10px] font-semibold text-gray-700 uppercase tracking-wide">
            🔥 Concentração
          </span>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-gray-400 hover:text-gray-600 focus:outline-none transition-colors rounded-full hover:bg-gray-100 p-0.5"
            aria-label={isCollapsed ? 'Expandir legenda' : 'Recolher legenda'}
            aria-expanded={!isCollapsed}
          >
            {isCollapsed ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Legend Items */}
        {!isCollapsed && (
          <div className="p-3 space-y-1.5">
            {legendItems.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-2.5 hover:bg-gray-50 px-1.5 py-1 rounded-md transition-colors"
                role="listitem"
              >
                {/* Color circle */}
                <div
                  className="w-4 h-4 rounded-full border border-gray-300 shadow-sm flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                  aria-hidden="true"
                />

                {/* Label */}
                <span className="text-[10px] text-gray-700 font-medium flex-1">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

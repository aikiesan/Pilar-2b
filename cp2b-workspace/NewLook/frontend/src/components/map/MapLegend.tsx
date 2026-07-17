/**
 * PILAR-2b V3 - Map Legend Component (DBFZ-inspired)
 * Displays YlGnBu color scale legend with data ranges
 */

'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { DisplayMetric } from '@/types/geospatial';

// 'Zero' and 'Sem dados' are deliberately separate: the near-white swatch is a
// real zero (we looked; there is none), the grey is no_data (never loaded). The
// map keeps them distinct — see MunicipalityLayer NO_DATA_STYLE / migration 025.
const biogasItems = [
  { color: '#253494', label: '> 500M m³' },
  { color: '#2c7fb8', label: '100M – 500M m³' },
  { color: '#41b6c4', label: '50M – 100M m³' },
  { color: '#7fcdbb', label: '10M – 50M m³' },
  { color: '#c7e9b4', label: '1M – 10M m³' },
  { color: '#ffffcc', label: '< 1M m³' },
  { color: '#f7f7f7', label: 'Zero' },
  { color: '#cbd5e1', label: 'Sem dados' },
];

const biomassItems = [
  { color: '#253494', label: '> 5M t' },
  { color: '#2c7fb8', label: '1M – 5M t' },
  { color: '#41b6c4', label: '200K – 1M t' },
  { color: '#7fcdbb', label: '50K – 200K t' },
  { color: '#c7e9b4', label: '5K – 50K t' },
  { color: '#ffffcc', label: '< 5K t' },
  { color: '#f7f7f7', label: 'Zero' },
  { color: '#cbd5e1', label: 'Sem dados' },
];

export default function MapLegend({ displayMetric = 'biomass_tons' }: { displayMetric?: DisplayMetric }) {
  const legendItems = displayMetric === 'biomass_tons' ? biomassItems : biogasItems;
  const title = displayMetric === 'biomass_tons' ? 'Biomassa (t/ano)' : 'Biogás (m³/ano)';
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div>
      <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100 overflow-hidden w-40 md:w-48">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
          <span className="text-[10px] font-semibold text-gray-700 uppercase tracking-wide">
            {title}
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
                {/* Color box */}
                <div
                  className="w-5 h-3.5 rounded border border-gray-200 shadow-sm flex-shrink-0"
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

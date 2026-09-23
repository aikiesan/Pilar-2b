/**
 * PILAR-2b V3 - Heatmap Legend Component
 * Displays heatmap color scale legend with data ranges
 */

'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useFormat } from '@/hooks/useFormat';

// Bands matching the heatmap color scale in HeatmapLayer, high → low.
const BANDS: { color: string; from?: number; to?: number }[] = [
  { color: '#800026', from: 500e6 },
  { color: '#bd0026', from: 100e6, to: 500e6 },
  { color: '#f03b20', from: 50e6, to: 100e6 },
  { color: '#fd8d3c', from: 10e6, to: 50e6 },
  { color: '#fecc5c', from: 1e6, to: 10e6 },
  { color: '#ffffb2', to: 1e6 },
];
const NO_DATA_COLOR = '#cccccc';

export default function HeatmapLegend() {
  const t = useTranslations('Map');
  const tCommon = useTranslations('common');
  const format = useFormat();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const legendItems = [
    ...BANDS.map(({ color, from, to }) => ({
      color,
      label:
        from !== undefined && to !== undefined
          ? `${format.compact(from)} – ${format.compact(to)}`
          : from !== undefined
            ? `> ${format.compact(from)}`
            : `< ${format.compact(to)}`,
    })),
    { color: NO_DATA_COLOR, label: tCommon('states.no_data') },
  ];

  return (
    <div>
      <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100 overflow-hidden w-40 md:w-48">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5 bg-gradient-to-r from-orange-50 to-white border-b border-orange-100">
          <span className="text-[10px] font-semibold text-gray-700 uppercase tracking-wide">
            🔥 {t('heatmap_legend.title')}
          </span>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-gray-400 hover:text-gray-600 focus:outline-none transition-colors rounded-full hover:bg-gray-100 p-0.5"
            aria-label={isCollapsed ? t('legend.expand') : t('legend.collapse')}
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

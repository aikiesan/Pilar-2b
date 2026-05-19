/**
 * PILAR-2b V3 - Floating Stats Micro-Panel (DBFZ-inspired)
 * Bottom-left compact statistics panel
 */

'use client';

import React, { useState } from 'react';
import { ChevronUp, ChevronDown, X } from 'lucide-react';
import { useSummaryStatistics } from '@/hooks/useGeospatialData';
import { formatBiogasShort } from '@/lib/mapUtils';

interface FloatingStatsPanelProps {
  visible?: boolean;
}

export default function FloatingStatsPanel({ visible = true }: FloatingStatsPanelProps) {
  const { data, loading, error } = useSummaryStatistics();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  if (!visible || isHidden) {
    return (
      <button
        onClick={() => setIsHidden(false)}
        className="absolute bottom-4 left-4 z-[400] bg-white/95 backdrop-blur-sm shadow-lg rounded-lg px-3 py-2 text-xs text-gray-600 hover:bg-white transition-colors"
      >
        Mostrar Estatísticas
      </button>
    );
  }

  if (loading) {
    return (
      <div className="absolute bottom-4 left-4 z-[400] bg-white/95 backdrop-blur-sm shadow-lg rounded-lg p-3">
        <div className="animate-pulse space-y-2">
          <div className="h-3 bg-gray-200 rounded w-24"></div>
          <div className="h-3 bg-gray-200 rounded w-20"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return null;
  }

  return (
    <div className="absolute bottom-4 left-4 z-[400] w-56">
      <div className="bg-white/95 backdrop-blur-sm shadow-lg rounded-lg overflow-hidden">
        {/* Header */}
        <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide">
            Visão Geral - SP
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronUp className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              onClick={() => setIsHidden(true)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Hide panel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Compact Stats */}
        <div className="p-3 space-y-2">
          {/* Main metrics */}
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div>
              <span className="text-gray-500">🌾 Agrícola</span>
              <p className="font-semibold text-green-700">
                {formatBiogasShort(data.sector_breakdown.agricultural)}
              </p>
            </div>
            <div>
              <span className="text-gray-500">🐄 Pecuária</span>
              <p className="font-semibold text-yellow-700">
                {formatBiogasShort(data.sector_breakdown.livestock)}
              </p>
            </div>
            <div>
              <span className="text-gray-500">🏙️ Urbano</span>
              <p className="font-semibold text-blue-700">
                {formatBiogasShort(data.sector_breakdown.urban)}
              </p>
            </div>
            <div>
              <span className="text-gray-500">📊 Total</span>
              <p className="font-bold text-gray-900">
                {formatBiogasShort(data.total_biogas_m3_year)}
              </p>
            </div>
          </div>

          {/* Expanded content - Top 5 */}
          {isExpanded && (
            <div className="pt-2 border-t border-gray-100">
              <p className="text-[9px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Top 5 Municípios
              </p>
              <div className="space-y-1">
                {data.top_5_municipalities.map((muni, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between text-[10px]"
                  >
                    <div className="flex items-center gap-1">
                      <span className="w-3.5 h-3.5 flex items-center justify-center bg-green-600 text-white text-[8px] font-bold rounded">
                        {index + 1}
                      </span>
                      <span className="text-gray-700 truncate max-w-[90px]">
                        {muni.name}
                      </span>
                    </div>
                    <span className="font-semibold text-green-700">
                      {formatBiogasShort(muni.biogas_m3_year)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

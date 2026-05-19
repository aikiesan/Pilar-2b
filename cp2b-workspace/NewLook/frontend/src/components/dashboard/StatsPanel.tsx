/**
 * PILAR-2b V3 - Compact Statistics Panel (DBFZ-inspired)
 * Minimalist, efficient statistics display
 */

'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Zap, MapPin, Users, Trophy } from 'lucide-react';
import { useSummaryStatistics } from '@/hooks/useGeospatialData';
import { formatBiogasShort, formatPopulation, formatPercentage } from '@/lib/mapUtils';

export default function StatsPanel() {
  const { data, loading, error } = useSummaryStatistics();
  const [showTop5, setShowTop5] = useState(false);

  if (loading) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <p className="text-xs text-red-600">Erro ao carregar estatísticas</p>
    );
  }

  return (
    <div className="space-y-3">
      {/* Key Metrics Grid - Compact 2x2 */}
      <div className="grid grid-cols-2 gap-2">
        {/* Total Biogas */}
        <div className="bg-green-50 rounded p-2">
          <div className="flex items-center gap-1 text-green-700 mb-0.5">
            <Zap className="w-3 h-3" />
            <span className="text-[10px] font-medium">Total</span>
          </div>
          <p className="text-sm font-bold text-green-900">
            {formatBiogasShort(data.total_biogas_m3_year)}
          </p>
        </div>

        {/* Municipalities */}
        <div className="bg-blue-50 rounded p-2">
          <div className="flex items-center gap-1 text-blue-700 mb-0.5">
            <MapPin className="w-3 h-3" />
            <span className="text-[10px] font-medium">Municípios</span>
          </div>
          <p className="text-sm font-bold text-blue-900">
            {data.total_municipalities}
          </p>
        </div>

        {/* Average */}
        <div className="bg-emerald-50 rounded p-2">
          <div className="flex items-center gap-1 text-emerald-700 mb-0.5">
            <Trophy className="w-3 h-3" />
            <span className="text-[10px] font-medium">Média</span>
          </div>
          <p className="text-sm font-bold text-emerald-900">
            {formatBiogasShort(data.average_biogas_m3_year)}
          </p>
        </div>

        {/* Population */}
        <div className="bg-orange-50 rounded p-2">
          <div className="flex items-center gap-1 text-orange-700 mb-0.5">
            <Users className="w-3 h-3" />
            <span className="text-[10px] font-medium">População</span>
          </div>
          <p className="text-sm font-bold text-orange-900">
            {formatPopulation(data.total_population)}
          </p>
        </div>
      </div>

      {/* Sector Breakdown - Compact Bars */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide">
          Setores
        </p>

        {/* Agricultural */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] w-16 text-gray-600">Agrícola</span>
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-500"
              style={{ width: `${data.sector_percentages.agricultural}%` }}
            />
          </div>
          <span className="text-[10px] font-medium w-10 text-right text-gray-700">
            {formatPercentage(data.sector_percentages.agricultural)}
          </span>
        </div>

        {/* Livestock */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] w-16 text-gray-600">Pecuária</span>
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-yellow-500 transition-all duration-500"
              style={{ width: `${data.sector_percentages.livestock}%` }}
            />
          </div>
          <span className="text-[10px] font-medium w-10 text-right text-gray-700">
            {formatPercentage(data.sector_percentages.livestock)}
          </span>
        </div>

        {/* Urban */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] w-16 text-gray-600">Urbano</span>
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-500"
              style={{ width: `${data.sector_percentages.urban}%` }}
            />
          </div>
          <span className="text-[10px] font-medium w-10 text-right text-gray-700">
            {formatPercentage(data.sector_percentages.urban)}
          </span>
        </div>
      </div>

      {/* Top 5 - Collapsible */}
      <div>
        <button
          onClick={() => setShowTop5(!showTop5)}
          className="flex items-center justify-between w-full text-[10px] font-semibold text-gray-600 uppercase tracking-wide hover:text-gray-900 transition-colors"
        >
          <span>Top 5 Municípios</span>
          {showTop5 ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
        </button>

        {showTop5 && (
          <div className="mt-1.5 space-y-1">
            {data.top_5_municipalities.map((muni, index) => (
              <div
                key={index}
                className="flex items-center justify-between text-[10px] py-1 px-1.5 bg-gray-50 rounded"
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 flex items-center justify-center bg-green-600 text-white text-[8px] font-bold rounded">
                    {index + 1}
                  </span>
                  <span className="text-gray-800 truncate max-w-[100px]">
                    {muni.name}
                  </span>
                </div>
                <span className="font-semibold text-green-700">
                  {formatBiogasShort(muni.biogas_m3_year)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

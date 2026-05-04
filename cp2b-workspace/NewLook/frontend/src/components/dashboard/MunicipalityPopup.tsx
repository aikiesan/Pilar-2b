/**
 * PILAR-2b V3 - Municipality Popup Component
 * Displays all municipality information in an interactive map popup
 * No separate detail pages needed - all info is shown here
 */

'use client';

import React from 'react';
import type { MunicipalityProperties } from '@/types/geospatial';
import {
  formatPopulation,
  formatArea,
  calculatePercentage,
  formatPercentage,
  getCategoryColor,
  getCategoryLabel,
} from '@/lib/mapUtils';
import { BookOpen } from 'lucide-react';
import {
  BIOMASS_RESIDUES,
  getResidueBiomassTons,
  getSectorBiomassTons,
  getTotalBiomassTons,
  numberValue,
} from '@/lib/biomassAvailability';
import type { ResidueType } from '@/components/map/FloatingControlPanel';

interface MunicipalityPopupProps {
  properties: MunicipalityProperties;
}

const residuePillClass: Record<ResidueType, string> = {
  sugarcane: 'bg-green-50 border-green-200',
  soybean: 'bg-green-50 border-green-200',
  corn: 'bg-green-50 border-green-200',
  coffee: 'bg-green-50 border-green-200',
  citrus: 'bg-green-50 border-green-200',
  cattle: 'bg-yellow-50 border-yellow-200',
  swine: 'bg-yellow-50 border-yellow-200',
  poultry: 'bg-yellow-50 border-yellow-200',
  aquaculture: 'bg-yellow-50 border-yellow-200',
  rsu: 'bg-blue-50 border-blue-200',
  rpo: 'bg-blue-50 border-blue-200',
};

const formatTons = (value: unknown): string => {
  const tons = numberValue(value);
  if (tons >= 1_000_000) return `${(tons / 1_000_000).toFixed(2)} mi t/ano`;
  if (tons >= 1_000) return `${(tons / 1_000).toFixed(1)} mil t/ano`;
  return `${tons.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} t/ano`;
};

const formatTonsShort = (value: unknown): string => {
  const tons = numberValue(value);
  if (tons >= 1_000_000) return `${(tons / 1_000_000).toFixed(1)}M t`;
  if (tons >= 1_000) return `${(tons / 1_000).toFixed(1)}K t`;
  return `${tons.toFixed(0)} t`;
};

function MunicipalityPopup({ properties }: MunicipalityPopupProps) {
  // Defensive checks for required properties
  if (!properties || !properties.name) {
    return (
      <div className="w-full p-4 text-center text-gray-500">
        <p className="text-sm">Dados não disponíveis</p>
      </div>
    );
  }

  const agriculturalBiomass = getSectorBiomassTons(properties, 'agricultural');
  const livestockBiomass = getSectorBiomassTons(properties, 'livestock');
  const urbanBiomass = getSectorBiomassTons(properties, 'urban');
  const totalBiomass = getTotalBiomassTons(properties);
  const agriPercentage = calculatePercentage(agriculturalBiomass, totalBiomass);
  const livestockPercentage = calculatePercentage(livestockBiomass, totalBiomass);
  const urbanPercentage = calculatePercentage(urbanBiomass, totalBiomass);

  return (
    <div className="w-full">
      {/* Header Section - Horizontal */}
      <div className="flex items-start justify-between pb-2 border-b border-gray-200 mb-2">
        <div className="flex-1">
          <h3 className="text-base font-bold text-gray-900 leading-tight mb-0.5">
            {properties.name}
          </h3>
          <p className="text-[10px] text-gray-500">
            IBGE: {properties.ibge_code || 'N/A'}
          </p>
        </div>
        <span
          className={`px-2 py-0.5 text-[10px] font-semibold rounded whitespace-nowrap ${getCategoryColor(
            properties.potential_category
          )}`}
        >
          {getCategoryLabel(properties.potential_category)}
        </span>
      </div>

      {/* Main Content - Horizontal Grid Layout */}
      <div className="grid grid-cols-2 gap-3 mb-2">
        {/* Left Column - Total Biomass & Demographics */}
        <div className="space-y-2">
          {/* Total Biomass Availability */}
          <div className="p-2 bg-green-50 rounded">
            <div className="flex items-center gap-1.5 mb-1">
              <svg className="w-3.5 h-3.5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-[10px] font-medium text-green-900">
                Biomassa Disponível
              </span>
            </div>
            <p className="text-sm font-bold text-green-900">
              {formatTons(totalBiomass)}
            </p>
          </div>

          {/* Demographics - Compact */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px]">
              <span className="text-gray-600">População:</span>
              <span className="font-medium text-gray-900">
                {formatPopulation(properties.population || 0)}
              </span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-gray-600">Área:</span>
              <span className="font-medium text-gray-900">
                {formatArea(properties.area_km2 || 0)}
              </span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-gray-600">Região:</span>
              <span className="font-medium text-gray-900 truncate max-w-[120px]" title={properties.immediate_region || 'N/A'}>
                {properties.immediate_region || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column - Sector Breakdown */}
        <div className="space-y-1.5">
          <h4 className="text-[10px] font-semibold text-gray-700 mb-1">
            Distribuição por Setor
          </h4>

          {/* Agricultural - Compact */}
          <div className="space-y-0.5">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-gray-600">🌾 Agrícola</span>
              <span className="font-semibold text-gray-900">
                {formatPercentage(agriPercentage)}
              </span>
            </div>
            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-600 transition-all"
                style={{ width: `${agriPercentage}%` }}
              />
            </div>
          </div>

          {/* Livestock - Compact */}
          <div className="space-y-0.5">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-gray-600">🐄 Pecuária</span>
              <span className="font-semibold text-gray-900">
                {formatPercentage(livestockPercentage)}
              </span>
            </div>
            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-600 transition-all"
                style={{ width: `${livestockPercentage}%` }}
              />
            </div>
          </div>

          {/* Urban - Compact */}
          <div className="space-y-0.5">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-gray-600">🏙️ Urbano</span>
              <span className="font-semibold text-gray-900">
                {formatPercentage(urbanPercentage)}
              </span>
            </div>
            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all"
                style={{ width: `${urbanPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Residues Section - Horizontal Pills */}
      <div className="pt-2 border-t border-gray-200">
        <h4 className="text-[10px] font-semibold text-gray-700 mb-1.5">
          Principais Resíduos
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(BIOMASS_RESIDUES) as ResidueType[]).map((residue) => {
            const value = getResidueBiomassTons(properties, residue);
            if (value <= 0) return null;

            return (
              <div key={residue} className={`px-2 py-0.5 border rounded text-[9px] ${residuePillClass[residue]}`}>
                <span className="font-medium">{BIOMASS_RESIDUES[residue].label}:</span> {formatTonsShort(value)}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer - Note about References */}
      <div className="mt-3 pt-2 border-t border-gray-200">
        <div className="flex items-center justify-center gap-1.5 w-full px-2 py-1.5 bg-indigo-50 border border-indigo-200 rounded">
          <BookOpen className="h-3 w-3 text-indigo-600" />
          <span className="text-[10px] font-medium text-indigo-700">
            Cada resíduo possui análises e referências científicas diferentes
          </span>
        </div>
      </div>
    </div>
  );
}

export default React.memo(MunicipalityPopup);

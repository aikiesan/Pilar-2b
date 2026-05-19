/**
 * PILAR-2b V3 - Quick Filter Bar (Mobile)
 * Horizontally scrollable chip strip for the most common filters.
 * Shown on mobile below the header, above the map, hidden on md+.
 */

'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import type { BiomassType } from './FloatingControlPanel';
import type { VisualizationMode } from './LeftFilterPanel';
import type { ResidueType } from './FloatingControlPanel';

interface QuickFilterBarProps {
  visualizationMode: VisualizationMode;
  onVisualizationModeChange: (mode: VisualizationMode) => void;
  biomassType: BiomassType;
  onBiomassTypeChange: (type: BiomassType) => void;
  selectedResidues: ResidueType[];
  onResiduesChange: (residues: ResidueType[]) => void;
}

export default function QuickFilterBar({
  visualizationMode,
  onVisualizationModeChange,
  biomassType,
  onBiomassTypeChange,
  selectedResidues,
  onResiduesChange,
}: QuickFilterBarProps) {
  const t = useTranslations('Map');

  const vizOptions: { value: VisualizationMode; icon: string; key: string }[] = [
    { value: 'choropleth', icon: '🗺️', key: 'vizModes.choropleth' },
    { value: 'heatmap', icon: '🔥', key: 'vizModes.heatmap' },
    { value: 'bubble', icon: '🫧', key: 'vizModes.bubble' },
  ];

  const biomassOptions: { value: BiomassType; icon: string; key: string }[] = [
    { value: 'total', icon: '⚡', key: 'biomassTypes.total' },
    { value: 'agricultural', icon: '🌾', key: 'biomassTypes.agricultural' },
    { value: 'livestock', icon: '🐄', key: 'biomassTypes.livestock' },
    { value: 'urban', icon: '🏙️', key: 'biomassTypes.urban' },
  ];

  const topResidues: { value: ResidueType; icon: string; key: string }[] = [
    { value: 'sugarcane', icon: '🌾', key: 'residues.sugarcane' },
    { value: 'cattle', icon: '🐄', key: 'residues.cattle' },
    { value: 'swine', icon: '🐷', key: 'residues.swine' },
    { value: 'rsu', icon: '🗑️', key: 'residues.rsu' },
  ];

  const toggleResidue = (r: ResidueType) => {
    const next = selectedResidues.includes(r)
      ? selectedResidues.filter(x => x !== r)
      : [...selectedResidues, r];
    onResiduesChange(next);
  };

  const hasActiveFilters = selectedResidues.length > 0 || biomassType !== 'total';

  return (
    <div className="md:hidden fixed top-14 left-0 right-0 z-[400] bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
      <div
        className="flex items-center gap-2 px-3 py-2 overflow-x-auto"
        style={{ scrollbarWidth: 'none' }}
      >
        <span className="text-[10px] text-gray-400 font-semibold uppercase shrink-0">{t('vis')}</span>

        {vizOptions.map(opt => (
          <button
            key={opt.value}
            onClick={() => onVisualizationModeChange(opt.value)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${
              visualizationMode === opt.value
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
            }`}
          >
            {opt.icon} {t(opt.key)}
          </button>
        ))}

        <div className="w-px h-5 bg-gray-300 shrink-0" />

        {biomassOptions.map(opt => (
          <button
            key={opt.value}
            onClick={() => onBiomassTypeChange(opt.value)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${
              biomassType === opt.value && selectedResidues.length === 0
                ? 'bg-green-600 text-white border-green-600 shadow-sm'
                : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
            }`}
          >
            {opt.icon} {t(opt.key)}
          </button>
        ))}

        <div className="w-px h-5 bg-gray-300 shrink-0" />

        {topResidues.map(opt => (
          <button
            key={opt.value}
            onClick={() => toggleResidue(opt.value)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${
              selectedResidues.includes(opt.value)
                ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
            }`}
          >
            {opt.icon} {t(opt.key)}
          </button>
        ))}

        {hasActiveFilters && (
          <>
            <div className="w-px h-5 bg-gray-300 shrink-0" />
            <button
              onClick={() => {
                onResiduesChange([]);
                onBiomassTypeChange('total');
              }}
              className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border border-red-300 bg-red-50 text-red-600 hover:bg-red-100 transition-all whitespace-nowrap"
            >
              {t('clearAll')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

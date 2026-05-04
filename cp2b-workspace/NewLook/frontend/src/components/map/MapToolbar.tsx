'use client';

/**
 * MapToolbar
 * Floating color-mode selector centered at the top of the map.
 * Controls which data metric is visualized on the choropleth:
 *   biogas     → default biogas potential (ALTO/MÉDIO/BAIXO)
 *   cn_profile → weighted C/N ratio per municipality
 *   pairings   → (Phase 2, disabled)
 */

import React from 'react';

export type ColorMode = 'biogas' | 'cn_profile' | 'cluster';

interface MapToolbarProps {
  colorMode: ColorMode;
  onColorModeChange: (mode: ColorMode) => void;
}

const MODES: { value: ColorMode; label: string; disabled?: boolean }[] = [
  { value: 'biogas',      label: 'Potencial Biogás' },
  { value: 'cn_profile',  label: 'Perfil C/N' },
  { value: 'cluster',     label: 'Clusters K4' },
];

export default function MapToolbar({ colorMode, onColorModeChange }: MapToolbarProps) {
  return (
    <div
      className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] flex rounded-lg shadow-lg overflow-hidden border border-gray-200 bg-white/95 backdrop-blur-sm"
      style={{ pointerEvents: 'auto' }}
    >
      {MODES.map(({ value, label, disabled }) => {
        const active = colorMode === value;
        return (
          <button
            key={value}
            onClick={() => !disabled && onColorModeChange(value)}
            disabled={disabled}
            className={[
              'px-4 py-2 text-sm font-medium transition-colors select-none',
              'border-r border-gray-200 last:border-r-0',
              active
                ? 'bg-green-700 text-white'
                : disabled
                  ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-100 cursor-pointer',
            ].join(' ')}
            title={disabled ? 'Disponível na Fase 2' : undefined}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

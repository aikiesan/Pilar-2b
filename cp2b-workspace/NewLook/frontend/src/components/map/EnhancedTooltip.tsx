/** Compact, non-interactive preview shown while hovering a municipality. */

'use client';

import React from 'react';
import { MapPin, MousePointerClick } from 'lucide-react';
import type { DisplayMetric, MunicipalityFeature } from '@/types/geospatial';
import { SCENARIO_COLOR, SCENARIO_LABEL, type MapScenarioKey } from '@/data/scenarioFactors';
import { formatCompact, getMetricSpec } from '@/lib/mapMetrics';

interface EnhancedTooltipProps {
  municipality: MunicipalityFeature;
  position: { x: number; y: number };
  visible: boolean;
  metric?: DisplayMetric;
  scenario?: MapScenarioKey;
}

export default function EnhancedTooltip({
  municipality,
  position,
  visible,
  metric = 'biomass_tons',
  scenario = 'baseline',
}: EnhancedTooltipProps) {
  if (!visible) return null;

  const props = municipality.properties;
  const spec = getMetricSpec(metric);
  const rawValue = spec.rawValue(props, {
    biomassType: 'total',
    selectedResidues: [],
    scenario,
  }).value;
  const displayValue = rawValue === null ? null : spec.toDisplay(rawValue);

  // Always open below/right of the pointer and clamp to the viewport. Unlike a
  // Leaflet auto-direction tooltip, the card never jumps between top and bottom.
  const width = 264;
  const height = 112;
  const gutter = 12;
  const headerOffset = 72;
  const viewportWidth = typeof window === 'undefined' ? 1280 : window.innerWidth;
  const viewportHeight = typeof window === 'undefined' ? 800 : window.innerHeight;
  const left = Math.max(gutter, Math.min(position.x + 14, viewportWidth - width - gutter));
  const top = Math.max(
    headerOffset,
    Math.min(position.y + 14, viewportHeight - height - gutter),
  );

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed z-[1200] w-[264px] animate-fade-in rounded-xl border border-gray-200/80 bg-white/96 px-3 py-2.5 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/96"
      style={{ left, top }}
    >
      <div className="flex min-w-0 items-start gap-2">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-green-700" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-gray-900 dark:text-white">{props.name}</p>
          <p className="truncate text-[10px] text-gray-500 dark:text-gray-400">
            IBGE {props.ibge_code}{props.intermediate_region ? ` · ${props.intermediate_region}` : ''}
          </p>
        </div>
      </div>

      <div className="mt-2 flex items-end justify-between gap-2 border-t border-gray-100 pt-2 dark:border-slate-800">
        <div className="min-w-0">
          <div className="flex items-center gap-1 text-[10px] font-semibold text-gray-500">
            <span>{spec.icon} {spec.toggleLabel}</span>
            {metric !== 'biomass_tons' && (
              <span
                className="rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white"
                style={{ backgroundColor: SCENARIO_COLOR[scenario] }}
              >
                {SCENARIO_LABEL[scenario]}
              </span>
            )}
          </div>
          <p className="truncate text-base font-bold text-gray-900 dark:text-white">
            {displayValue !== null && displayValue > 0 ? formatCompact(displayValue) : 'Sem dados'}
            <span className="ml-1 text-[10px] font-medium text-gray-500">{spec.unit}</span>
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-1 text-[10px] font-semibold text-green-700">
          <MousePointerClick className="h-3.5 w-3.5" />
          Clique para detalhes
        </span>
      </div>
    </div>
  );
}

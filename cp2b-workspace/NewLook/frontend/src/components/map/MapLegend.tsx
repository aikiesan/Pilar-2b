/**
 * PILAR-2b V3 - Map Legend Component (DBFZ-inspired)
 * Displays YlGnBu color scale legend with data ranges
 */

'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { DisplayMetric } from '@/types/geospatial';
import { getMetricSpec, legendItems as buildLegendItems, CVD_PALETTES, type CvdPaletteId } from '@/lib/mapMetrics';
import { BETA_FILL } from '@/lib/mapScope';
import { useCvdPalette } from '@/hooks/useCvdPalette';
import { useMapPalette } from '@/hooks/useMapPalette';
import { useTranslations } from 'next-intl';
import { isServedScenario, SCENARIO_COLOR, type MapScenarioKey } from '@/data/scenarioFactors';

// 'Zero' and 'Sem dados' are deliberately separate: the near-white swatch is a
// real zero (we looked; there is none), the grey is no_data (never loaded). The
// map keeps them distinct — see MunicipalityLayer NO_DATA_STYLE / migration 025.
// Ranges, colours and units all come from the metric registry (lib/mapMetrics),
// so the legend can never drift from the choropleth it explains.
export default function MapLegend({
  displayMetric = 'biomass_tons',
  daltonic = false,
  showNationalBeta = false,
  scenario = 'baseline',
  scaleBreaks = null,
}: {
  displayMetric?: DisplayMetric;
  daltonic?: boolean;
  /** Adds the beta swatch when the national layer is on the map. */
  showNationalBeta?: boolean;
  /** Active scenario — named in the header so the numbers are never ambiguous. */
  scenario?: MapScenarioKey;
  /**
   * The class limits the choropleth was actually painted with (adaptive, from
   * the visible São Paulo distribution). They move with the scenario and the
   * residue filter, which is the point — a legend printing a fixed ladder while
   * the map used another would be worse than no legend.
   */
  scaleBreaks?: number[] | null;
}) {
  const t = useTranslations('Map');
  const [cvdPalette, setCvdPalette] = useCvdPalette();
  const [mapPalette] = useMapPalette();
  const spec = getMetricSpec(displayMetric);
  const legendItems = buildLegendItems(spec, daltonic, cvdPalette, scaleBreaks, mapPalette);
  const title = spec.legendTitle;
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Biomassa is the resource itself and does not move with the scenario, so
  // naming one over it would imply a dependency that is not there.
  const scenarioApplies = displayMetric !== 'biomass_tons';
  const served = isServedScenario(scenario);

  return (
    <div>
      <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100 overflow-hidden w-40 md:w-48">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
          {/* The ramp is the São Paulo ramp. Saying so in the legend header is
              the cheapest place to prevent the whole misreading — the reader is
              already looking here to decode the colours. */}
          <span className="text-[10px] font-semibold text-gray-700 uppercase tracking-wide leading-tight">
            {title}
            <span className="block text-[9px] font-bold text-green-700 normal-case tracking-normal">
              São Paulo
            </span>
            {scenarioApplies && (
              <span
                className="mt-0.5 block text-[9px] font-bold normal-case tracking-normal"
                style={{ color: SCENARIO_COLOR[scenario] }}
              >
                {t(`scenario_${scenario}`)}
              </span>
            )}
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

        {/* Palette selector — only in daltonic mode. Lets the user pick a
            CVD-safe palette instead of being locked to one blue ramp. */}
        {!isCollapsed && daltonic && (
          <div className="px-3 pt-2.5">
            <span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-gray-400">
              Paleta (daltônico)
            </span>
            <div className="flex gap-1" role="radiogroup" aria-label="Paleta para daltonismo">
              {(Object.keys(CVD_PALETTES) as CvdPaletteId[]).map((id) => {
                const p = CVD_PALETTES[id];
                const active = cvdPalette === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setCvdPalette(id)}
                    title={`${p.label} — ${p.note}`}
                    className={`flex-1 rounded-md border p-1 transition-all ${
                      active ? 'border-gray-800 ring-1 ring-gray-800' : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <span className="flex h-3 w-full overflow-hidden rounded-sm" aria-hidden="true">
                      {p.ramp.map((c) => (
                        <span key={c} className="flex-1" style={{ backgroundColor: c }} />
                      ))}
                    </span>
                    <span className="mt-0.5 block text-[8px] font-semibold text-gray-600">{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

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

            {/* Beta swatch, separated by a rule: it is not another step of the
                ramp, it is a different scope with a different confidence. */}
            {showNationalBeta && (
              <div className="pt-1.5 mt-1 border-t border-gray-100">
                <div className="flex items-center gap-2.5 px-1.5 py-1" role="listitem">
                  <div
                    className="w-5 h-3.5 rounded border border-gray-200 shadow-sm flex-shrink-0 opacity-40"
                    style={{ backgroundColor: BETA_FILL }}
                    aria-hidden="true"
                  />
                  <span className="text-[10px] text-gray-500 font-medium flex-1 leading-tight">
                    Fora de SP — em validação
                  </span>
                </div>
              </div>
            )}

            {/* Real and Ideal are loaded for São Paulo only (migration 026), so
                outside SP every municipality reads no-data under them. Saying so
                here stops that being mistaken for "measured, and it is zero". */}
            {scenarioApplies && served && (
              <div className="pt-1.5 mt-1 border-t border-gray-100">
                <p className="px-1.5 text-[9px] leading-snug text-gray-500">
                  {t('scenario_served_note')}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

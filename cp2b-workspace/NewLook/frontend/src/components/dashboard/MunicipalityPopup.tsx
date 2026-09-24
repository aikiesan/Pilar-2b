/**
 * PILAR-2b V3 - Municipality Popup Component
 * Displays all municipality information in an interactive map popup
 * No separate detail pages needed - all info is shown here
 */

'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import type { MunicipalityProperties } from '@/types/geospatial';
import { calculatePercentage, getCategoryColor, getPotentialCategoryKey } from '@/lib/mapUtils';
import { BookOpen } from 'lucide-react';
import { RESIDUE_TYPES } from '@/lib/biomassAvailability';
import { getSectorMetricValue, getResidueTonsOrNull } from '@/lib/mapValues';
import { getMetricSpec } from '@/lib/mapMetrics';
import { MISSING_VALUE } from '@/lib/format';
import { useFormat } from '@/hooks/useFormat';
import { useMetricText } from '@/hooks/useMetricText';
import type { ResidueType } from '@/types/map';
import type { DisplayMetric } from '@/types/geospatial';
import type { MapScenarioKey } from '@/data/scenarioFactors';

interface MunicipalityPopupProps {
  properties: MunicipalityProperties;
  /** Metric the map is currently showing — the popup mirrors it. */
  metric?: DisplayMetric;
  scenario?: MapScenarioKey;
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
  sewage: 'bg-blue-50 border-blue-200',
};

const SECTOR_ROWS = [
  { sector: 'agricultural', icon: '🌾', barClass: 'bg-green-600' },
  { sector: 'livestock', icon: '🐄', barClass: 'bg-yellow-600' },
  { sector: 'urban', icon: '🏙️', barClass: 'bg-blue-600' },
] as const;

function MunicipalityPopup({
  properties,
  metric = 'biomass_tons',
  scenario = 'baseline',
}: MunicipalityPopupProps) {
  const t = useTranslations('Map');
  const tCommon = useTranslations('common');
  const format = useFormat();
  const metricText = useMetricText();

  // Defensive checks for required properties
  if (!properties || !properties.name) {
    return (
      <div className="w-full p-4 text-center text-gray-500">
        <p className="text-sm">{t('popup.data_unavailable')}</p>
      </div>
    );
  }

  // Sector figures follow the ACTIVE MAP METRIC, read from the served payload
  // through the metric registry — same accessor the panel and tooltip use, so
  // the three can never disagree about the same municipality.
  const spec = getMetricSpec(metric);
  const text = metricText(metric);
  const toDisplay = (v: number | null) => (v === null ? null : spec.toDisplay(v));
  const sectorValues = Object.fromEntries(
    SECTOR_ROWS.map(({ sector }) => [
      sector,
      toDisplay(getSectorMetricValue(properties, sector, metric, scenario)) ?? 0,
    ])
  ) as Record<(typeof SECTOR_ROWS)[number]['sector'], number>;
  const total = sectorValues.agricultural + sectorValues.livestock + sectorValues.urban;

  return (
    <div className="w-full">
      {/* Header Section - Horizontal */}
      <div className="flex items-start justify-between pb-2 border-b border-gray-200 mb-2">
        <div className="flex-1">
          <h3 className="text-base font-bold text-gray-900 leading-tight mb-0.5">
            {properties.name}
          </h3>
          <p className="text-[10px] text-gray-500">
            IBGE: {properties.ibge_code || MISSING_VALUE}
          </p>
        </div>
        <span
          className={`px-2 py-0.5 text-[10px] font-semibold rounded whitespace-nowrap ${getCategoryColor(
            properties.potential_category
          )}`}
        >
          {t(`potentialCategory.${getPotentialCategoryKey(properties.potential_category)}`)}
        </span>
      </div>

      {/* Main Content - Horizontal Grid Layout */}
      <div className="grid grid-cols-2 gap-3 mb-2">
        {/* Left Column - Total Biomass & Demographics */}
        <div className="space-y-2">
          {/* Total for the active metric */}
          <div className="p-2 bg-green-50 rounded">
            <div className="flex items-center gap-1.5 mb-1">
              <svg className="w-3.5 h-3.5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-[10px] font-medium text-green-900">
                {spec.icon} {text.label}
              </span>
            </div>
            <p className="text-sm font-bold text-green-900">
              {total > 0 ? `${format.compact(total)} ${text.unit}` : tCommon('states.no_data')}
            </p>
          </div>

          {/* Demographics - Compact */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px]">
              <span className="text-gray-600">{t('popup.population')}:</span>
              <span className="font-medium text-gray-900">
                {format.number(properties.population)}
              </span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-gray-600">{t('popup.area')}:</span>
              <span className="font-medium text-gray-900">
                {properties.area_km2
                  ? `${format.number(properties.area_km2, { decimals: 1, minDecimals: 1 })} ${tCommon('units.km2')}`
                  : MISSING_VALUE}
              </span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-gray-600">{t('popup.region')}:</span>
              <span
                className="font-medium text-gray-900 truncate max-w-[120px]"
                title={properties.immediate_region || MISSING_VALUE}
              >
                {properties.immediate_region || MISSING_VALUE}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column - Sector Breakdown */}
        <div className="space-y-1.5">
          <h4 className="text-[10px] font-semibold text-gray-700 mb-1">
            {t('popup.sector_distribution')}
          </h4>

          {SECTOR_ROWS.map(({ sector, icon, barClass }) => {
            const share = calculatePercentage(sectorValues[sector], total);
            return (
              <div key={sector} className="space-y-0.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-gray-600">
                    {icon} {tCommon(`sectors.${sector}`)}
                  </span>
                  <span className="font-semibold text-gray-900">{format.percent(share)}</span>
                </div>
                <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className={`h-full ${barClass} transition-all`} style={{ width: `${share}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Residues Section - Horizontal Pills */}
      <div className="pt-2 border-t border-gray-200">
        <h4 className="text-[10px] font-semibold text-gray-700 mb-1.5">
          {t('popup.main_residues')}
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {RESIDUE_TYPES.map((residue) => {
            // null (no data) and 0 (measured none) are both omitted from these
            // pills — they list what a municipality HAS. The panel's detail rows
            // are where the two are distinguished explicitly.
            const value = getResidueTonsOrNull(properties, residue);
            if (value === null || value <= 0) return null;

            return (
              <div key={residue} className={`px-2 py-0.5 border rounded text-[9px] ${residuePillClass[residue]}`}>
                <span className="font-medium">{t(`residues.${residue}`)}:</span> {format.compact(value)} t
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
            {t('popup.references_note')}
          </span>
        </div>
      </div>
    </div>
  );
}

export default React.memo(MunicipalityPopup);

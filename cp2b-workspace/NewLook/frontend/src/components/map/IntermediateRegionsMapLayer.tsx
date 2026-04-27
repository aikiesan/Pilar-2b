'use client';

/**
 * IntermediateRegionsMapLayer
 * Renders all 133 IBGE intermediate regions on the main map.
 *
 * - If enriched GeoJSON (from /api/v1/intermediate-regions/geojson?enrich=true) is provided,
 *   regions are color-coded by total_biogas_m3_year using the same YlGnBu scale as MunicipalityLayer.
 * - Otherwise, renders plain green dashed boundaries as a loading fallback.
 *
 * Switching to Brazil scope (?scope=brazil) is handled by the parent (MapComponent).
 */

import React, { useMemo } from 'react';
import { GeoJSON } from 'react-leaflet';
import L from 'leaflet';

// ── Color scale (mirrors MunicipalityLayer thresholds scaled for region aggregates) ──────────────

const REGION_BIOGAS_THRESHOLDS = [
  { min: 2_000_000_000, color: '#084594' },  // > 2 billion m³ — dark blue
  { min:   500_000_000, color: '#2171b5' },
  { min:   200_000_000, color: '#4292c6' },
  { min:    50_000_000, color: '#74c476' },  // green-blue mid
  { min:    10_000_000, color: '#c7e9b4' },
  { min:             0, color: '#ffffcc' },  // pale yellow
];

function getBiogasColor(value: number): string {
  for (const tier of REGION_BIOGAS_THRESHOLDS) {
    if (value >= tier.min) return tier.color;
  }
  return '#ffffcc';
}

// ── Component ─────────────────────────────────────────────────────────────────

interface IntermediateRegionsMapLayerProps {
  geoJSON: any | null;       // enriched FeatureCollection from useIntermediateRegionsGeoJSON
  opacity?: number;
  onRegionClick?: (feature: any) => void;
}

export default function IntermediateRegionsMapLayer({
  geoJSON,
  opacity = 0.7,
  onRegionClick,
}: IntermediateRegionsMapLayerProps) {
  const stableKey = useMemo(
    () => `ir-${geoJSON?.features?.length ?? 0}-${Date.now()}`,
    [geoJSON]
  );

  if (!geoJSON) return null;

  const styleFeature = (feature: any) => {
    const biogas = Number(feature?.properties?.total_biogas_m3_year ?? 0);
    const hasData = biogas > 0;
    return {
      fillColor:   hasData ? getBiogasColor(biogas) : '#e0e0e0',
      fillOpacity: hasData ? opacity : 0.15,
      color:       '#1B5E20',
      weight:      hasData ? 1.5 : 1,
      opacity:     0.8,
      dashArray:   hasData ? undefined : '6, 4',
    };
  };

  const onEachFeature = (feature: any, layer: L.Layer) => {
    const p = feature.properties || {};
    const name = p.nm_rgint || p.name || 'Região';
    const biogas = Number(p.total_biogas_m3_year ?? 0);
    const biomass = Number(p.total_biomass_tons_year ?? 0);
    const stateCode = p.cd_uf || p.state_code || '';
    const munCount = p.municipality_count || '–';

    const tooltipHtml = `
      <div style="min-width:180px;font-family:sans-serif;font-size:12px">
        <strong>${name}</strong>
        <div style="color:#555">UF: ${stateCode} · ${munCount} municípios</div>
        ${biogas > 0
          ? `<div>🌿 Biogás: <b>${(biogas / 1e6).toFixed(1)} M m³/ano</b></div>
             <div>📦 Biomassa: ${(biomass / 1e3).toFixed(1)} kt/ano</div>`
          : '<div style="color:#999">Dados nacionais em carregamento</div>'}
      </div>`;

    (layer as L.Path).bindTooltip(tooltipHtml, { sticky: true, opacity: 0.95 });

    if (onRegionClick) {
      layer.on('click', () => onRegionClick(feature));
    }

    (layer as L.Path).on('mouseover', function () {
      (this as L.Path).setStyle({ weight: 3, color: '#000' });
    });
    (layer as L.Path).on('mouseout', function () {
      (this as L.Path).setStyle({ weight: biogas > 0 ? 1.5 : 1, color: '#1B5E20' });
    });
  };

  return (
    <GeoJSON
      key={stableKey}
      data={geoJSON}
      style={styleFeature}
      onEachFeature={onEachFeature}
    />
  );
}

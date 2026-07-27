/**
 * PILAR-2b V3 - Municipality Layer Component
 * Renders municipalities as choropleth polygons with YlGnBu color scale
 */

'use client';

import React, { useCallback, useRef } from 'react';
import { GeoJSON } from 'react-leaflet';
import type { GeoJsonObject, Feature } from 'geojson';
import type { MunicipalityCollection, MunicipalityFeature, MunicipalityProperties, DisplayMetric } from '@/types/geospatial';
import type { ColorMode } from '@/types/geospatial';
import type { BiomassType, ResidueType } from './FloatingControlPanel';
import MunicipalityPopup from '../dashboard/MunicipalityPopup';
import L from 'leaflet';
import { createRoot } from 'react-dom/client';
import type { MapValue } from '@/lib/mapValues';
import { getMetricSpec, getMetricColor } from '@/lib/mapMetrics';
import { useCvdPalette } from '@/hooks/useCvdPalette';
import type { MapScenarioKey } from '@/data/scenarioFactors';
import { useTranslations } from 'next-intl';

interface MunicipalityLayerProps {
  data: MunicipalityCollection;
  opacity?: number;
  biomassType?: BiomassType;
  selectedResidues?: ResidueType[];
  displayMetric?: DisplayMetric;
  colorMode?: ColorMode;
  mapScenario?: string;
  daltonic?: boolean;
  onMunicipalityClick?: (feature: MunicipalityFeature) => void;
  onMunicipalityHover?: (feature: MunicipalityFeature | null, e?: MouseEvent) => void;
}

// Cluster choropleth — 4 distinct qualitative colors
const CLUSTER_COLORS: Record<number, string> = {
  0: '#4daf4a',  // green  — sugarcane-dominated
  1: '#ff7f00',  // orange — soybean-intensive
  2: '#e41a1c',  // red    — rsu-urban-intensive
  3: '#377eb8',  // blue   — cattle-intensive
};

const getColorForCluster = (clusterId: number | null | undefined): string =>
  clusterId != null && clusterId in CLUSTER_COLORS ? CLUSTER_COLORS[clusterId] : '#aaaaaa';

// Choropleth colours (per-metric ramps, display-unit breaks, daltonic palette)
// live in one place — lib/mapMetrics.ts — so the layer, legend and popup agree.

// "No data" is not the bottom of the ramp. A distinct medium grey (well clear of
// both the YlGnBu ramp and the near-white zero swatch) says "we never loaded this
// municipality", so a data gap can never be misread as a low value — the whole
// reason the API stopped coercing null to 0 (migration 025). The legend labels it.
export const NO_DATA_FILL = '#cbd5e1';
const NO_DATA_STYLE = {
  fillColor: NO_DATA_FILL,
  weight: 0.5,
  opacity: 0.5,
  color: '#94a3b8',
  fillOpacity: 0.55,
} as const;

export default function MunicipalityLayer({
  data,
  opacity = 0.7,
  biomassType = 'total',
  selectedResidues = [],
  displayMetric = 'biomass_tons',
  colorMode = 'biogas',
  mapScenario = 'baseline',
  daltonic = false,
  onMunicipalityClick,
  onMunicipalityHover,
}: MunicipalityLayerProps) {
  const t = useTranslations('Map');
  const metricSpec = getMetricSpec(displayMetric);
  // Selected CVD palette (only used when `daltonic` is on). Reading it here means
  // changing the palette in the legend restyles the choropleth reactively.
  const [cvdPalette] = useCvdPalette();

  // Opacity changes (the slider — the most frequent map interaction) restyle
  // the existing layer via react-leaflet's setStyle instead of remounting all
  // polygons: `opacity` is deliberately NOT in the <GeoJSON> key below, and a
  // new `style` identity (useCallback dep) triggers the restyle. The hover
  // handlers are bound once per mount, so they read this ref rather than a
  // stale closed-over prop.
  const opacityRef = useRef(opacity);
  opacityRef.current = opacity;

  // Display value + coverage. Biomass reads served per-sector tonnage; biogas reads
  // the canonical municipality total at the chosen scenario. Both preserve null so
  // the style can render no_data distinctly instead of as a zero.
  const getMapValue = (props: MunicipalityProperties): MapValue =>
    metricSpec.rawValue(props, {
      biomassType,
      selectedResidues,
      scenario: mapScenario as MapScenarioKey,
    });

  // Style function for polygons (choropleth). Memoized so its identity only
  // changes when the visual inputs change — react-leaflet calls setStyle on
  // the mounted layer whenever the `style` prop identity changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const style = useCallback((feature?: Feature) => {
    if (!feature || !feature.properties) return {};

    if (colorMode === 'cluster') {
      return {
        fillColor: getColorForCluster((feature.properties as any).cluster_id),
        weight: 1,
        opacity: 0.8,
        color: '#666666',
        fillOpacity: opacity,
      };
    }

    const { value, coverage } = getMapValue(feature.properties as MunicipalityProperties);
    // no_data is rendered as a distinct grey, never as a ramp value. This is where
    // the backend's null/coverage distinction becomes visible on the map.
    if (value === null || coverage === 'no_data') {
      return { ...NO_DATA_STYLE };
    }

    return {
      fillColor: getMetricColor(value, metricSpec, daltonic, cvdPalette),
      weight: 1,
      opacity: 0.8,
      color: '#666666',
      fillOpacity: opacity,
    };
    // getMapValue is recreated per render but only depends on the deps listed here,
    // so listing them directly keeps the identity stable.
  }, [colorMode, displayMetric, biomassType, selectedResidues, mapScenario, daltonic, cvdPalette, opacity]);

  // Format a value for display. null -> "sem dados" so the tooltip never shows a
  // fabricated 0 for a municipality we have no data for.
  const formatBiogas = (value: number | null): string => {
    if (value === null) return 'sem dados';
    if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toFixed(0);
  };

  // Get label for biomass type or selected residues
  const getBiomassLabel = (): string => {
    if (selectedResidues.length > 0) {
      const residueLabels: Record<ResidueType, string> = {
        sugarcane: 'Cana-de-açúcar',
        soybean: 'Soja',
        corn: 'Milho',
        coffee: 'Café',
        citrus: 'Citrus',
        cattle: 'Bovinos',
        swine: 'Suínos',
        poultry: 'Aves',
        aquaculture: 'Aquicultura',
        rsu: 'RSU',
        rpo: t('residues.rpo')
      };

      if (selectedResidues.length === 1) {
        return residueLabels[selectedResidues[0]];
      }
      return `${selectedResidues.length} Resíduos`;
    }

    switch (biomassType) {
      case 'agricultural': return 'Agrícola';
      case 'livestock': return 'Pecuária';
      case 'urban': return 'Urbano';
      default: return 'Total';
    }
  };

  // Event handlers for each feature
  const onEachFeature = (feature: any, layer: L.Layer) => {
    if (!feature || !feature.properties) return;

    const props = feature.properties;
    const biogasValue = getMapValue(props).value;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    // Tooltip (hover) — only bind HTML tooltip when no hover handler (mobile fallback)
    if (!onMunicipalityHover) {
      const tooltipBody = colorMode === 'cluster'
        ? `<span style="font-size:11px;color:rgba(255,255,255,0.9);">${props.cluster_label ?? 'N/A'} · ${props.mun_dominant_stream ?? ''}</span>`
        : `<span style="font-size:11px;color:rgba(255,255,255,0.9);">${getBiomassLabel()}: ${formatBiogas(biogasValue)} ${displayMetric === 'biomass_tons' ? 't/ano' : 'm³/ano'}</span>`;

      layer.bindTooltip(
        `<div style="text-align:center;padding:4px;">
          <strong style="font-size:12px;color:white;">${props.name}</strong><br/>
          ${tooltipBody}
        </div>`,
        { permanent: false, direction: 'top', className: 'custom-tooltip', offset: [0, -10] }
      );
    }

    // Popup (click) — only bind popup when no click handler (mobile fallback)
    if (!onMunicipalityClick) {
      const popupWidth = isMobile
        ? Math.min(window.innerWidth - 32, 340)
        : 560;

      layer.bindPopup(() => {
        const container = L.DomUtil.create('div');
        const root = createRoot(container);

        root.render(
          <MunicipalityPopup
            properties={props}
            metric={displayMetric}
            scenario={mapScenario as MapScenarioKey}
          />
        );
        // Leaflet re-invokes this factory (new container + root) on every
        // open — unmount when the popup closes, or each open leaks a root.
        layer.once('popupclose', () => {
          setTimeout(() => root.unmount(), 0);
        });
        return container;
      }, {
        maxWidth: popupWidth,
        minWidth: isMobile ? Math.min(window.innerWidth - 32, 300) : 560,
        maxHeight: isMobile ? 420 : 550,
        className: 'municipality-popup',
        autoPan: true,
        autoPanPadding: [10, 10],
        keepInView: true,
      });
    }

    // Hover effects for polygons
    if (layer instanceof L.Path) {
      layer.on({
        mouseover: (e) => {
          const target = e.target;
          target.setStyle({
            weight: 2,
            color: '#000000',
            fillOpacity: Math.min(opacityRef.current + 0.2, 1),
          });
          target.bringToFront();

          // Desktop: call hover handler with feature + mouse event
          if (onMunicipalityHover) {
            onMunicipalityHover(feature as MunicipalityFeature, e.originalEvent as MouseEvent);
          }
        },
        mouseout: (e) => {
          const target = e.target;
          if (colorMode !== 'cluster') {
            const { value, coverage } = getMapValue(feature.properties as MunicipalityProperties);
            if (value === null || coverage === 'no_data') {
              target.setStyle(NO_DATA_STYLE);
              if (onMunicipalityHover) onMunicipalityHover(null);
              return;
            }
          }
          const resetColor = colorMode === 'cluster'
            ? getColorForCluster((feature.properties as any).cluster_id)
            : getMetricColor(getMapValue(feature.properties as MunicipalityProperties).value ?? 0, metricSpec, daltonic, cvdPalette);
          target.setStyle({
            weight: 1,
            color: '#666666',
            fillOpacity: opacityRef.current,
            fillColor: resetColor,
          });

          // Desktop: clear hover
          if (onMunicipalityHover) {
            onMunicipalityHover(null);
          }
        },
        click: () => {
          // Desktop: open profile panel instead of popup
          if (onMunicipalityClick) {
            onMunicipalityClick(feature as MunicipalityFeature);
          }
        },
      });
    }
  };

  return (
    <GeoJSON
      // The key remounts the layer when anything bound at creation time
      // changes: tooltip/popup content (biomassType, displayMetric, colorMode,
      // selectedResidues) or the data itself (mapScenario — react-leaflet only
      // reads `data` on mount). Opacity is intentionally absent: it flows
      // through the memoized `style` -> setStyle without a remount.
      key={`${biomassType}-${displayMetric}-${colorMode}-${mapScenario}-${selectedResidues.join(',')}`}
      data={data as GeoJsonObject}
      style={style}
      onEachFeature={onEachFeature}
    />
  );
}

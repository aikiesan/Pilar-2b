/**
 * PILAR-2b V3 - Municipality Layer Component
 * Renders municipalities as choropleth polygons with YlGnBu color scale
 */

'use client';

import React from 'react';
import { GeoJSON } from 'react-leaflet';
import type { GeoJsonObject, Feature } from 'geojson';
import type { MunicipalityCollection, MunicipalityFeature, DisplayMetric } from '@/types/geospatial';
import type { BiomassType, ResidueType } from './FloatingControlPanel';
import MunicipalityPopup from '../dashboard/MunicipalityPopup';
import L from 'leaflet';
import { createRoot } from 'react-dom/client';

interface MunicipalityLayerProps {
  data: MunicipalityCollection;
  opacity?: number;
  biomassType?: BiomassType;
  selectedResidues?: ResidueType[];
  displayMetric?: DisplayMetric;
  onMunicipalityClick?: (feature: MunicipalityFeature) => void;
  onMunicipalityHover?: (feature: MunicipalityFeature | null, e?: MouseEvent) => void;
}

// YlGnBu color scale for biogas (m³/year)
const getColorForBiogas = (value: number): string => {
  if (value === 0) return '#f7f7f7';
  if (value < 1000000)   return '#ffffcc';   // < 1M
  if (value < 10000000)  return '#c7e9b4';   // 1M–10M
  if (value < 50000000)  return '#7fcdbb';   // 10M–50M
  if (value < 100000000) return '#41b6c4';   // 50M–100M
  if (value < 500000000) return '#2c7fb8';   // 100M–500M
  return '#253494';                           // > 500M
};

// YlGnBu color scale for biomass availability (t/year)
const getColorForBiomassTons = (value: number): string => {
  if (value === 0)        return '#f7f7f7';
  if (value < 500)        return '#ffffcc';   // < 500 t
  if (value < 5000)       return '#c7e9b4';   // 500–5K t
  if (value < 25000)      return '#7fcdbb';   // 5K–25K t
  if (value < 100000)     return '#41b6c4';   // 25K–100K t
  if (value < 500000)     return '#2c7fb8';   // 100K–500K t
  return '#253494';                            // > 500K t
};

const getColorForValue = (value: number, metric: DisplayMetric = 'biogas_m3'): string =>
  metric === 'biomass_tons' ? getColorForBiomassTons(value) : getColorForBiogas(value);

export default function MunicipalityLayer({
  data,
  opacity = 0.7,
  biomassType = 'total',
  selectedResidues = [],
  displayMetric = 'biomass_tons',
  onMunicipalityClick,
  onMunicipalityHover,
}: MunicipalityLayerProps) {

  const suffix = displayMetric === 'biomass_tons' ? 'biomass_tons_year' : 'biogas_m3_year';

  // Get display value based on selected residues or biomass type
  const getBiogasValue = (props: any): number => {
    if (selectedResidues.length > 0) {
      return selectedResidues.reduce((sum, residue) => {
        const val = Number(props[`${residue}_${suffix}`]) || 0;
        return sum + val;
      }, 0);
    }
    switch (biomassType) {
      case 'agricultural': return Number(props[`agricultural_${suffix}`]) || 0;
      case 'livestock':    return Number(props[`livestock_${suffix}`])    || 0;
      case 'urban':        return Number(props[`urban_${suffix}`])        || 0;
      case 'total':
      default:             return Number(props[`total_${suffix}`])        || 0;
    }
  };

  // Style function for polygons (choropleth)
  const style = (feature?: Feature) => {
    if (!feature || !feature.properties) return {};

    const biogas = getBiogasValue(feature.properties);
    const color = getColorForValue(biogas, displayMetric);

    return {
      fillColor: color,
      weight: 1,
      opacity: 0.8,
      color: '#666666',
      fillOpacity: opacity,
    };
  };

  // Format biogas value for display
  const formatBiogas = (value: number): string => {
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
        rpo: 'RPO'
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
    const biogasValue = getBiogasValue(props);
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    // Tooltip (hover) — only bind HTML tooltip when no hover handler (mobile fallback)
    if (!onMunicipalityHover) {
      layer.bindTooltip(
        `<div style="text-align: center; padding: 4px;">
          <strong style="font-size: 12px; color: white;">${props.name}</strong><br/>
          <span style="font-size: 11px; color: rgba(255, 255, 255, 0.9);">
            ${getBiomassLabel()}: ${formatBiogas(biogasValue)} ${displayMetric === 'biomass_tons' ? 't/ano' : 'm³/ano'}
          </span>
        </div>`,
        {
          permanent: false,
          direction: 'top',
          className: 'custom-tooltip',
          offset: [0, -10]
        }
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
          />
        );
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
            fillOpacity: Math.min(opacity + 0.2, 1),
          });
          target.bringToFront();

          // Desktop: call hover handler with feature + mouse event
          if (onMunicipalityHover) {
            onMunicipalityHover(feature as MunicipalityFeature, e.originalEvent as MouseEvent);
          }
        },
        mouseout: (e) => {
          const target = e.target;
          const biogas = getBiogasValue(feature.properties);
          const color = getColorForValue(biogas);
          const resetColor = getColorForValue(getBiogasValue(feature.properties), displayMetric);
          target.setStyle({
            weight: 1,
            color: '#666666',
            fillOpacity: opacity,
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
      key={`${biomassType}-${displayMetric}-${opacity}-${selectedResidues.join(',')}`}
      data={data as GeoJsonObject}
      style={style}
      onEachFeature={onEachFeature}
    />
  );
}

/**
 * Bubble Chart Layer
 * Proportional symbol visualization for biogas potential
 */

'use client';

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { MunicipalityCollection } from '@/types/geospatial';

interface BubbleChartLayerProps {
  data: MunicipalityCollection;
  opacity?: number;
  attribute?: string;
}

export default function BubbleChartLayer({
  data,
  opacity = 0.7,
  attribute = 'total_biogas_m3_year',
}: BubbleChartLayerProps) {
  const map = useMap();

  useEffect(() => {
    if (!data || !data.features) return;

    // Find min and max values for scaling
    const values = data.features
      .map((feature) => (feature.properties as any)[attribute] || 0)
      .filter((v) => v > 0);

    if (values.length === 0) return;

    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);

    // Create circle markers
    const markers: L.CircleMarker[] = [];

    data.features.forEach((feature) => {
      const value = (feature.properties as any)[attribute] || 0;
      if (value <= 0) return;

      // Calculate radius based on value (logarithmic scale for better visualization)
      const normalizedValue = (Math.log(value + 1) - Math.log(minValue + 1)) /
                              (Math.log(maxValue + 1) - Math.log(minValue + 1));
      const radius = 5 + normalizedValue * 40; // 5-45px radius

      // Get color based on value
      const color = getColor(value, minValue, maxValue);

      // Get centroid coordinates
      // MunicipalityFeature geometry is 'Point' | 'MultiPolygon' (never 'Polygon')
      const geometry = feature.geometry;
      let coordinates: [number, number] | null = null;

      if (geometry.type === 'Point') {
        // Point: coordinates is [lng, lat]
        const coords = geometry.coordinates as number[];
        coordinates = [coords[0], coords[1]];
      } else if (geometry.type === 'MultiPolygon') {
        // MultiPolygon: coordinates is [][][], use first ring of first polygon
        const coords = geometry.coordinates as unknown as number[][][][];
        coordinates = getCentroid(coords[0][0] as Array<[number, number]>);
      }

      if (!coordinates) return;

      // Create circle marker
      const circle = L.circleMarker(
        [coordinates[1], coordinates[0]], // Leaflet uses [lat, lng]
        {
          radius,
          fillColor: color,
          fillOpacity: opacity,
          color: darkenColor(color, 0.2),
          weight: 2,
          opacity: opacity,
        }
      );

      // Add popup
      circle.bindPopup(`
        <div class="p-3">
          <h4 class="font-bold text-lg mb-2">${feature.properties.name}</h4>
          <p class="text-sm">
            <strong>${getAttributeLabel(attribute)}:</strong><br/>
            ${formatNumber(value)} m³/ano
          </p>
        </div>
      `);

      // Add tooltip
      circle.bindTooltip(feature.properties.name, {
        permanent: false,
        direction: 'top',
        className: 'custom-tooltip',
      });

      markers.push(circle);
      circle.addTo(map);
    });

    // Cleanup
    return () => {
      markers.forEach((marker) => marker.remove());
    };
  }, [map, data, opacity, attribute]);

  return null;
}

// Helper functions

function getCentroid(coordinates: Array<[number, number]>): [number, number] {
  let x = 0;
  let y = 0;
  const count = coordinates.length;

  coordinates.forEach(([lng, lat]) => {
    x += lng;
    y += lat;
  });

  return [x / count, y / count];
}

function getColor(value: number, min: number, max: number): string {
  const normalized = (value - min) / (max - min);

  // Color gradient: yellow -> orange -> red
  if (normalized < 0.2) return '#FEF3C7'; // Very light yellow
  if (normalized < 0.4) return '#FCD34D'; // Yellow
  if (normalized < 0.6) return '#FBBF24'; // Amber
  if (normalized < 0.8) return '#F59E0B'; // Orange
  return '#DC2626'; // Red
}

function darkenColor(hex: string, factor: number): string {
  // Convert hex to RGB
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  // Darken
  const darkR = Math.floor(r * (1 - factor));
  const darkG = Math.floor(g * (1 - factor));
  const darkB = Math.floor(b * (1 - factor));

  // Convert back to hex
  return `#${darkR.toString(16).padStart(2, '0')}${darkG.toString(16).padStart(2, '0')}${darkB.toString(16).padStart(2, '0')}`;
}

function formatNumber(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toFixed(0);
}

function getAttributeLabel(attribute: string): string {
  const labels: Record<string, string> = {
    total_biogas_m3_year: 'Biogás Total',
    agricultural_biogas_m3_year: 'Biogás Agrícola',
    livestock_biogas_m3_year: 'Biogás Pecuário',
    urban_biogas_m3_year: 'Biogás Urbano',
    population: 'População',
    area_km2: 'Área',
  };
  return labels[attribute] || attribute;
}

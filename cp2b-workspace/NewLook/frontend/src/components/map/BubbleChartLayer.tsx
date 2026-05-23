/**
 * Bubble Chart Layer
 * Proportional symbol visualization for biogas potential
 */

'use client';

import { useEffect, useRef } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
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
  const markersRef = useRef<L.CircleMarker[]>([]);

  const buildMarkers = () => {
    // Remove previous markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (!data || !data.features) return;

    const values = data.features
      .map((feature) => (feature.properties as any)[attribute] || 0)
      .filter((v) => v > 0);

    if (values.length === 0) return;

    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);

    // Zoom-aware radius scaling: larger radius at lower zoom so bubbles stay readable
    const zoom = map.getZoom();
    const zoomFactor = Math.max(0.5, zoom / 9);

    data.features.forEach((feature) => {
      const props = feature.properties as any;
      const value = props[attribute] || 0;
      if (value <= 0) return;

      const normalizedValue =
        (Math.log(value + 1) - Math.log(minValue + 1)) /
        (Math.log(maxValue + 1) - Math.log(minValue + 1));

      // Zoom-aware radius: 4–40px scaled by zoom factor
      const baseRadius = 4 + normalizedValue * 36;
      const radius = Math.max(4, Math.min(40, baseRadius * zoomFactor));

      const color = getColor(value, minValue, maxValue);

      // Prefer DB-supplied centroid (more accurate than polygon arithmetic)
      let latLng: [number, number] | null = null;
      if (props.centroid_lat != null && props.centroid_lng != null) {
        latLng = [parseFloat(props.centroid_lat), parseFloat(props.centroid_lng)];
      } else {
        const geometry = feature.geometry;
        if (geometry.type === 'Point') {
          const coords = geometry.coordinates as number[];
          latLng = [coords[1], coords[0]]; // GeoJSON [lng, lat] → Leaflet [lat, lng]
        } else if (geometry.type === 'MultiPolygon') {
          const coords = geometry.coordinates as unknown as number[][][][];
          latLng = getPolygonCentroid(coords[0][0] as Array<[number, number]>);
        }
      }

      if (!latLng) return;

      const municipalityName = props.municipality_name || props.name || '';

      const circle = L.circleMarker(latLng, {
        radius,
        fillColor: color,
        fillOpacity: opacity * 0.75,  // semi-transparent fill for stacked readability
        color: '#ffffff',             // white stroke separates overlapping bubbles
        weight: 1.5,
        opacity: Math.min(1, opacity + 0.2),
      });

      // Rich popup: name + primary value + sector breakdown
      const agri = formatNumber(props.agricultural_biogas_m3_year || 0);
      const live = formatNumber(props.livestock_biogas_m3_year || 0);
      const urban = formatNumber(props.urban_biogas_m3_year || 0);

      circle.bindPopup(`
        <div style="padding:8px;min-width:180px">
          <h4 style="font-weight:700;font-size:13px;margin:0 0 6px">${municipalityName}</h4>
          <p style="font-size:12px;margin:0 0 6px">
            <strong>${getAttributeLabel(attribute)}:</strong>
            ${formatNumber(value)} m³/ano
          </p>
          <hr style="margin:4px 0;border-color:#eee"/>
          <p style="font-size:11px;color:#555;margin:0">
            🌾 Agrícola: ${agri} m³/ano<br/>
            🐄 Pecuária: ${live} m³/ano<br/>
            🏙️ Urbano: ${urban} m³/ano
          </p>
        </div>
      `);

      circle.bindTooltip(municipalityName, {
        permanent: false,
        direction: 'top',
        className: 'custom-tooltip',
      });

      markersRef.current.push(circle);
      circle.addTo(map);
    });
  };

  // Rebuild on data/opacity/attribute change
  useEffect(() => {
    buildMarkers();
    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
    };
  }, [map, data, opacity, attribute]);

  // Rebuild on zoom change so radius scaling stays consistent
  useMapEvents({
    zoomend: () => {
      buildMarkers();
    },
  });

  return null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPolygonCentroid(ring: Array<[number, number]>): [number, number] {
  let sumLng = 0;
  let sumLat = 0;
  ring.forEach(([lng, lat]) => {
    sumLng += lng;
    sumLat += lat;
  });
  return [sumLat / ring.length, sumLng / ring.length]; // Leaflet [lat, lng]
}

function getColor(value: number, min: number, max: number): string {
  const normalized = (value - min) / (max - min);
  if (normalized < 0.2) return '#FEF3C7';
  if (normalized < 0.4) return '#FCD34D';
  if (normalized < 0.6) return '#FBBF24';
  if (normalized < 0.8) return '#F59E0B';
  return '#DC2626';
}

function formatNumber(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
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

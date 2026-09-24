/**
 * Bubble Chart Layer
 * Proportional symbols for the active map metric: one circle per municipality,
 * sized on a log scale.
 */

'use client';

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { DisplayMetric, MunicipalityCollection } from '@/types/geospatial';
import type { BiomassType, ResidueType } from '@/types/map';
import type { MapScenarioKey } from '@/data/scenarioFactors';
import { getMetricSpec } from '@/lib/mapMetrics';
import { markerPosition } from '@/lib/mapUtils';
import { useFormat } from '@/hooks/useFormat';
import { useMetricText } from '@/hooks/useMetricText';
import { useSelectionLabel } from '@/hooks/useSelectionLabel';
import { escapeHtml } from '@/lib/html';

interface BubbleChartLayerProps {
  data: MunicipalityCollection;
  opacity?: number;
  metric?: DisplayMetric;
  biomassType?: BiomassType;
  selectedResidues?: ResidueType[];
  scenario?: MapScenarioKey;
}

const NO_RESIDUES: ResidueType[] = [];

export default function BubbleChartLayer({
  data,
  opacity = 0.7,
  metric = 'biomass_tons',
  biomassType = 'total',
  selectedResidues = NO_RESIDUES,
  scenario = 'baseline',
}: BubbleChartLayerProps) {
  const map = useMap();
  const format = useFormat();
  const metricText = useMetricText();
  const selectionLabel = useSelectionLabel();
  const { label, unit } = metricText(metric);
  // Plain strings, so the effect below re-runs on a change of copy, not of identity.
  const title = `${label} · ${selectionLabel(biomassType, selectedResidues)}`;

  useEffect(() => {
    if (!data || !data.features) return;

    // The same accessor the choropleth paints with (lib/mapMetrics), so a bubble
    // and a polygon always show the same number. The legacy *_biogas_m3_year
    // columns this used to read are not in the map payload (fields=map), which
    // left the biogas bubbles empty.
    const spec = getMetricSpec(metric);
    const valueOf = (feature: MunicipalityCollection['features'][number]): number => {
      const raw = spec.rawValue(feature.properties, { biomassType, selectedResidues, scenario }).value;
      return raw === null ? 0 : spec.toDisplay(raw);
    };

    const valued = data.features
      .map((feature) => ({ feature, value: valueOf(feature) }))
      .filter(({ value }) => value > 0);

    if (valued.length === 0) return;

    const values = valued.map(({ value }) => value);
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);

    // Draw largest first so the smallest bubbles end up on top and stay legible
    // instead of being buried under the big ones.
    const ordered = valued.sort((a, b) => b.value - a.value);

    // Create circle markers
    const markers: L.CircleMarker[] = [];

    // Radius on a log scale, kept small (3–20px) so 645 municipalities do not
    // merge into one blob. One value on screen (or all equal) has no range to
    // scale across and gets the full size.
    const logRange = Math.log(maxValue + 1) - Math.log(minValue + 1);

    ordered.forEach(({ feature, value }) => {
      const normalizedValue =
        logRange > 0 ? (Math.log(value + 1) - Math.log(minValue + 1)) / logRange : 1;
      const radius = 3 + normalizedValue * 17; // 3–20px radius

      // Get color based on value
      const color = getColor(value, minValue, maxValue);

      // A municipality with no outline arrives as a Polygon (a circle around its
      // centroid), which this layer used to skip; markerPosition handles all three.
      const position = markerPosition(feature.geometry);
      if (!position) return;

      // Create circle marker
      const circle = L.circleMarker(
        position,
        {
          radius,
          fillColor: color,
          fillOpacity: Math.min(opacity, 0.55),
          color: darkenColor(color, 0.2),
          weight: 1,
          opacity: 0.85,
        }
      );

      // Add popup
      circle.bindPopup(`
        <div class="p-3">
          <h4 class="font-bold text-lg mb-2">${escapeHtml(feature.properties.name)}</h4>
          <p class="text-sm">
            <strong>${escapeHtml(title)}:</strong><br/>
            ${escapeHtml(format.compact(value))} ${escapeHtml(unit)}
          </p>
        </div>
      `);

      // Add tooltip
      circle.bindTooltip(escapeHtml(feature.properties.name), {
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
  }, [map, data, opacity, metric, biomassType, selectedResidues, scenario, format, title, unit]);

  return null;
}

// Helper functions

function getColor(value: number, min: number, max: number): string {
  const normalized = max > min ? (value - min) / (max - min) : 1;

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

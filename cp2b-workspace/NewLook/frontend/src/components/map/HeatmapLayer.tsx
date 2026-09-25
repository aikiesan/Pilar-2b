/**
 * PILAR-2b V3 - Heatmap Layer Component
 * Renders residue concentration as a canvas Gaussian-blur heatmap via leaflet.heat.
 * Invisible CircleMarkers are rendered on top for tooltip interaction.
 */

'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import { useMap, CircleMarker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { useTranslations } from 'next-intl';
import type { MunicipalityCollection, MunicipalityProperties } from '@/types/geospatial';
import type { ResidueType } from '@/types/map';
import { useFormat } from '@/hooks/useFormat';
import { useSelectionLabel } from '@/hooks/useSelectionLabel';
import { markerPosition } from '@/lib/mapUtils';

interface HeatmapLayerProps {
  data: MunicipalityCollection;
  selectedResidues: ResidueType[];
  opacity?: number;
}

// Colour gradient matching the legend thresholds
const HEAT_GRADIENT: Record<number, string> = {
  0.2: '#ffffb2',
  0.4: '#fecc5c',
  0.6: '#fd8d3c',
  0.8: '#f03b20',
  0.9: '#bd0026',
  1.0: '#800026',
};

/**
 * A municipality's biomass (t/year) for the selected residues, or its total.
 *
 * Reads the served biomass tonnage fields (`{residue}_biomass_tons_year`,
 * `total_biomass_tons_year`). The legacy `*_biogas_m3_year` columns this used
 * to read are trimmed from the slim map payload (fields=map), so they came back
 * undefined and every point was 0 — the heatmap rendered nothing. See
 * geospatialClient (fields=map) and the served-keys audit.
 */
function residueValue(props: MunicipalityProperties, selectedResidues: ResidueType[]): number {
  const fields = props as unknown as Record<string, unknown>;
  if (selectedResidues.length === 0) {
    return Number(fields.total_biomass_tons_year) || 0;
  }
  return selectedResidues.reduce(
    (sum, residue) => sum + (Number(fields[`${residue}_biomass_tons_year`]) || 0),
    0
  );
}

export default function HeatmapLayer({
  data,
  selectedResidues,
  opacity = 0.6,
}: HeatmapLayerProps) {
  const map = useMap();
  const heatLayerRef = useRef<L.Layer | null>(null);
  const tCommon = useTranslations('common');
  const format = useFormat();
  const selectionLabel = useSelectionLabel();

  // Build point data (memoised so tooltip markers re-render when data changes)
  const points = useMemo(() => {
    return data.features
      .map(feature => {
        const value = residueValue(feature.properties, selectedResidues);
        if (value === 0) return null;
        const position = markerPosition(feature.geometry);
        if (!position) return null;
        return { position, value, name: feature.properties.name };
      })
      .filter((p): p is { position: [number, number]; value: number; name: string } => p !== null);
  }, [data, selectedResidues]);

  // Canvas heatmap via leaflet.heat
  useEffect(() => {
    let cancelled = false;

    import('leaflet.heat').then(() => {
      if (cancelled) return;

      // Remove previous layer
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }

      if (points.length === 0) return;

      const maxVal = Math.max(...points.map(p => p.value));

      const heatPoints: [number, number, number][] = points.map(p => [
        p.position[0],
        p.position[1],
        maxVal > 0 ? p.value / maxVal : 0,
      ]);

      heatLayerRef.current = (L as any).heatLayer(heatPoints, {
        radius: 35,
        blur: 25,
        maxZoom: 17,
        max: 1.0,
        minOpacity: Math.max(0.2, opacity * 0.5),
        gradient: HEAT_GRADIENT,
      });

      heatLayerRef.current!.addTo(map);
    });

    return () => {
      cancelled = true;
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
    };
  }, [map, points, opacity]);

  // The heatmap weighs tonnage across the selected residues, or the total.
  const residueLabel = selectionLabel('total', selectedResidues);
  const unit = tCommon('units.t_year');

  return (
    <>
      {/* Invisible markers for tooltip interaction only */}
      {points.map((point, index) => (
        <CircleMarker
          key={`heat-tip-${index}`}
          center={point.position}
          radius={12}
          pathOptions={{ opacity: 0, fillOpacity: 0 }}
        >
          <Tooltip direction="top" offset={[0, -6]} opacity={0.9}>
            <div style={{ padding: '4px', textAlign: 'center' }}>
              <strong style={{ fontSize: '11px' }}>{point.name}</strong>
              <br />
              <span style={{ fontSize: '10px' }}>
                {residueLabel}: {format.compact(point.value)} {unit}
              </span>
            </div>
          </Tooltip>
        </CircleMarker>
      ))}
    </>
  );
}

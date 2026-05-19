/**
 * PILAR-2b V3 - Heatmap Layer Component
 * Renders residue concentration as a canvas Gaussian-blur heatmap via leaflet.heat.
 * Invisible CircleMarkers are rendered on top for tooltip interaction.
 */

'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import { useMap, CircleMarker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import type { MunicipalityCollection } from '@/types/geospatial';
import type { ResidueType } from './FloatingControlPanel';

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

export default function HeatmapLayer({
  data,
  selectedResidues,
  opacity = 0.6,
}: HeatmapLayerProps) {
  const map = useMap();
  const heatLayerRef = useRef<L.Layer | null>(null);

  // Calculate residue value for each municipality
  const getResidueValue = (props: any): number => {
    if (selectedResidues.length === 0) {
      return props.total_biogas_m3_year || 0;
    }
    return selectedResidues.reduce((sum, residue) => {
      const value = (() => {
        switch (residue) {
          case 'sugarcane':    return props.sugarcane_biogas_m3_year;
          case 'soybean':      return props.soybean_biogas_m3_year;
          case 'corn':         return props.corn_biogas_m3_year;
          case 'coffee':       return props.coffee_biogas_m3_year;
          case 'citrus':       return props.citrus_biogas_m3_year;
          case 'cattle':       return props.cattle_biogas_m3_year;
          case 'swine':        return props.swine_biogas_m3_year;
          case 'poultry':      return props.poultry_biogas_m3_year;
          case 'aquaculture':  return props.aquaculture_biogas_m3_year;
          case 'rsu':          return props.rsu_biogas_m3_year;
          case 'rpo':          return props.rpo_biogas_m3_year;
          default:             return 0;
        }
      })();
      return sum + (Number(value) || 0);
    }, 0);
  };

  // Get centroid [lat, lng] from a GeoJSON geometry
  const getCentroid = (feature: any): [number, number] | null => {
    const { type, coordinates } = feature.geometry;
    if (type === 'Point') {
      return [coordinates[1], coordinates[0]];
    }
    if (type === 'Polygon') {
      const ring = coordinates[0] as [number, number][];
      const sum = ring.reduce((acc, [lng, lat]) => ({ lng: acc.lng + lng, lat: acc.lat + lat }), { lng: 0, lat: 0 });
      return [sum.lat / ring.length, sum.lng / ring.length];
    }
    if (type === 'MultiPolygon') {
      const ring = coordinates[0][0] as [number, number][];
      const sum = ring.reduce((acc, [lng, lat]) => ({ lng: acc.lng + lng, lat: acc.lat + lat }), { lng: 0, lat: 0 });
      return [sum.lat / ring.length, sum.lng / ring.length];
    }
    return null;
  };

  // Format biogas value for tooltip display
  const formatBiogas = (value: number): string => {
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
    if (value >= 1_000_000)     return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000)         return `${(value / 1_000).toFixed(1)}K`;
    return value.toFixed(0);
  };

  const getResidueLabel = (): string => {
    if (selectedResidues.length === 0) return 'Total';
    const labels: Record<ResidueType, string> = {
      sugarcane: 'Cana-de-açúcar', soybean: 'Soja', corn: 'Milho',
      coffee: 'Café', citrus: 'Citrus', cattle: 'Bovinos',
      swine: 'Suínos', poultry: 'Aves', aquaculture: 'Aquicultura',
      rsu: 'RSU', rpo: 'RPO',
    };
    if (selectedResidues.length === 1) return labels[selectedResidues[0]];
    return `${selectedResidues.length} Resíduos`;
  };

  // Build point data (memoised so tooltip markers re-render when data changes)
  const points = useMemo(() => {
    return data.features
      .map(feature => {
        const value = getResidueValue(feature.properties);
        if (value === 0) return null;
        const centroid = getCentroid(feature);
        if (!centroid) return null;
        return { position: centroid as [number, number], value, name: feature.properties.name };
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

  const residueLabel = getResidueLabel();

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
                {residueLabel}: {formatBiogas(point.value)} m³/ano
              </span>
            </div>
          </Tooltip>
        </CircleMarker>
      ))}
    </>
  );
}

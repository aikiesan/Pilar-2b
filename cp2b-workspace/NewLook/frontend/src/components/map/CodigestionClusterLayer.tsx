'use client';

import React from 'react';
import { GeoJSON } from 'react-leaflet';
import type { CodigestionCluster } from '@/types/geospatial';

interface CodigestionClusterLayerProps {
  clusters: CodigestionCluster[];
  selectedClusterId: string | null;
  onClusterClick: (cluster: CodigestionCluster) => void;
}

const getClusterColor = (score: number): string => {
  if (score > 80) return '#7b2d8b';
  if (score > 60) return '#a855f7';
  if (score > 40) return '#c084fc';
  return '#e9d5ff';
};

export default function CodigestionClusterLayer({
  clusters,
  selectedClusterId,
  onClusterClick,
}: CodigestionClusterLayerProps) {
  if (!clusters || clusters.length === 0) return null;

  // Build a GeoJSON FeatureCollection from cluster convex hulls
  const geojsonData = {
    type: 'FeatureCollection' as const,
    features: clusters
      .filter(c => c.convex_hull != null)
      .map(cluster => ({
        type: 'Feature' as const,
        geometry: cluster.convex_hull as GeoJSON.Geometry,
        properties: {
          cluster_id: cluster.cluster_id,
          cluster_score: cluster.cluster_score,
          municipality_count: cluster.municipality_count,
          top_residue_a: cluster.top_pair.residue_a.label,
          top_residue_b: cluster.top_pair.residue_b.label,
          cn_combined: cluster.top_pair.cn_combined,
          total_biomass_tons_year: cluster.total_biomass_tons_year,
        },
      })),
  };

  const style = (feature?: GeoJSON.Feature) => {
    if (!feature?.properties) return {};
    const isSelected = feature.properties.cluster_id === selectedClusterId;
    const color = getClusterColor(feature.properties.cluster_score);
    return {
      fillColor: color,
      fillOpacity: isSelected ? 0.55 : 0.35,
      color: color,
      weight: isSelected ? 3 : 2,
      dashArray: isSelected ? undefined : '8 4',
      opacity: 0.9,
    };
  };

  const formatTons = (v: number): string => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000)     return `${(v / 1_000).toFixed(1)}K`;
    return v.toFixed(0);
  };

  const onEachFeature = (feature: GeoJSON.Feature, layer: L.Layer) => {
    if (!feature.properties) return;
    const p = feature.properties;

    layer.bindTooltip(
      `<div style="text-align:center;padding:4px;">
        <strong style="font-size:11px;color:#4c1d95;">Cluster ${p.cluster_id}</strong><br/>
        <span style="font-size:10px;color:#555;">${p.top_residue_a} + ${p.top_residue_b}</span><br/>
        <span style="font-size:10px;color:#555;">C:N combinado: <b>${p.cn_combined}</b></span><br/>
        <span style="font-size:10px;color:#555;">${p.municipality_count} municípios · ${formatTons(p.total_biomass_tons_year)} t/ano</span>
      </div>`,
      { permanent: false, direction: 'top', className: 'custom-tooltip', offset: [0, -6] }
    );

    layer.on({
      click: () => {
        const cluster = clusters.find(c => c.cluster_id === p.cluster_id);
        if (cluster) onClusterClick(cluster);
      },
      mouseover: (e: L.LeafletMouseEvent) => {
        (e.target as L.Path).setStyle({ fillOpacity: 0.55, weight: 3 });
      },
      mouseout: (e: L.LeafletMouseEvent) => {
        const isSelected = p.cluster_id === selectedClusterId;
        (e.target as L.Path).setStyle({
          fillOpacity: isSelected ? 0.55 : 0.35,
          weight: isSelected ? 3 : 2,
        });
      },
    });
  };

  return (
    <GeoJSON
      key={`clusters-${clusters.length}-${selectedClusterId}`}
      data={geojsonData as GeoJSON.GeoJsonObject}
      style={style}
      onEachFeature={onEachFeature}
    />
  );
}

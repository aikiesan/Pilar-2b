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

const toFiniteNumber = (value: unknown, fallback = 0): number => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

export default function CodigestionClusterLayer({
  clusters,
  selectedClusterId,
  onClusterClick,
}: CodigestionClusterLayerProps) {
  if (!clusters || clusters.length === 0) return null;

  // Only render convex hull polygons for small clusters (≤30 municipalities).
  // Large clusters produce hulls that cover most of the state and obscure the map.
  const MAX_HULL_MUNICIPALITIES = 30;

  // Build a GeoJSON FeatureCollection from cluster convex hulls
  const geojsonData = {
    type: 'FeatureCollection' as const,
    features: clusters
      .filter(c => c.convex_hull != null && c.top_pair != null && c.municipality_count <= MAX_HULL_MUNICIPALITIES)
      .map(cluster => ({
        type: 'Feature' as const,
        geometry: cluster.convex_hull as GeoJSON.Geometry,
        properties: {
          cluster_id: cluster.cluster_id,
          cluster_score: toFiniteNumber(cluster.cluster_score),
          municipality_count: toFiniteNumber(cluster.municipality_count),
          top_residue_a: cluster.top_pair.residue_a?.label ?? 'Residuo A',
          top_residue_b: cluster.top_pair.residue_b?.label ?? 'Residuo B',
          cn_combined: toFiniteNumber(cluster.top_pair.cn_combined),
          total_feedstock_value: toFiniteNumber(cluster.total_biomass_tons_year),
          total_biogas_m3_year: toFiniteNumber(cluster.total_biogas_m3_year),
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

  const formatTons = (value: unknown): string => {
    const v = toFiniteNumber(value);
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000)     return `${(v / 1_000).toFixed(1)}K`;
    return Math.round(v).toLocaleString('pt-BR');
  };

  const getClusterAmountLabel = (props: GeoJSON.GeoJsonProperties): string => {
    const biomassTons = toFiniteNumber(props?.total_feedstock_value);
    if (biomassTons > 0) return `${formatTons(biomassTons)} t/ano`;

    const biogasM3 = toFiniteNumber(props?.total_biogas_m3_year);
    return `${formatTons(biogasM3)} m³/ano`;
  };

  const onEachFeature = (feature: GeoJSON.Feature, layer: L.Layer) => {
    if (!feature.properties) return;
    const p = feature.properties;

    layer.bindTooltip(
      `<div style="text-align:center;padding:4px;">
        <strong style="font-size:11px;color:#4c1d95;">Cluster ${p.cluster_id}</strong><br/>
        <span style="font-size:10px;color:#555;">${p.top_residue_a} + ${p.top_residue_b}</span><br/>
        <span style="font-size:10px;color:#555;">C:N combinado: <b>${p.cn_combined}</b></span><br/>
        <span style="font-size:10px;color:#555;">${p.municipality_count} municípios · ${getClusterAmountLabel(p)}</span>
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

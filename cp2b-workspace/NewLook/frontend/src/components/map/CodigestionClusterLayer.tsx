'use client';

import React from 'react';
import { GeoJSON } from 'react-leaflet';
import { useLocale, useTranslations } from 'next-intl';
import type { CodigestionCluster } from '@/types/geospatial';
import { useFormat } from '@/hooks/useFormat';
import { clusterNumber, useCodigestionText } from '@/hooks/useCodigestionText';

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
  const t = useTranslations('Map.codigestion');
  const locale = useLocale();
  const format = useFormat();
  const text = useCodigestionText();

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
          top_residue_a: text.substrate(cluster.top_pair.residue_a),
          top_residue_b: text.substrate(cluster.top_pair.residue_b),
          cn_combined: toFiniteNumber(cluster.top_pair.cn_combined),
          amount: text.amount(cluster.total_biomass_tons_year, cluster.total_biogas_m3_year),
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

  const onEachFeature = (feature: GeoJSON.Feature, layer: L.Layer) => {
    if (!feature.properties) return;
    const p = feature.properties;

    layer.bindTooltip(
      `<div style="text-align:center;padding:4px;">
        <strong style="font-size:11px;color:#4c1d95;">${t('cluster', { id: clusterNumber(p.cluster_id) })}</strong><br/>
        <span style="font-size:10px;color:#555;">${p.top_residue_a} + ${p.top_residue_b}</span><br/>
        <span style="font-size:10px;color:#555;">${t('combined_cn')}: <b>${format.number(p.cn_combined, { decimals: 1 })}</b></span><br/>
        <span style="font-size:10px;color:#555;">${t('municipality_count', { count: p.municipality_count })} · ${p.amount}</span>
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
      key={`clusters-${locale}-${clusters.length}-${selectedClusterId}`}
      data={geojsonData as GeoJSON.GeoJsonObject}
      style={style}
      onEachFeature={onEachFeature}
    />
  );
}

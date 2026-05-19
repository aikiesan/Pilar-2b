'use client';

/**
 * CnChoroLayer
 * Overlays municipality polygons colored by weighted C/N ratio.
 * Renders non-interactively (pointer-events: none) so clicks fall through
 * to the MunicipalityLayer beneath for normal popup/hover behavior.
 *
 * Color scale (5 tiers, per BIOMASS_PAIRING_ROADMAP Phase 1):
 *   cn > 60  → deep blue  (strongly C-rich)
 *   cn 40–60 → light blue
 *   cn 20–40 → green      (balanced / optimal)
 *   cn 10–20 → orange     (moderately N-rich)
 *   cn < 10  → red        (strongly N-rich)
 */

import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { MunicipalityCollection, MunicipalityCnProfile } from '@/types/geospatial';

export type CnProfilesMap = Record<string, MunicipalityCnProfile>;

interface CnChoroLayerProps {
  geoJsonData: MunicipalityCollection;
  profilesMap: CnProfilesMap;
}

function cnColor(cn: number): string {
  if (cn > 60) return '#1e40af';  // deep blue
  if (cn > 40) return '#60a5fa';  // light blue
  if (cn > 20) return '#16a34a';  // green (balanced)
  if (cn > 10) return '#f97316';  // orange
  return '#dc2626';               // red (N-rich)
}

export default function CnChoroLayer({ geoJsonData, profilesMap }: CnChoroLayerProps) {
  const map = useMap();
  const layerRef = useRef<L.GeoJSON | null>(null);

  useEffect(() => {
    if (!geoJsonData?.features?.length || !Object.keys(profilesMap).length) return;

    // Create a dedicated pane above the overlayPane so this layer renders on top
    if (!map.getPane('cnChoro')) {
      map.createPane('cnChoro');
      const pane = map.getPane('cnChoro')!;
      pane.style.zIndex = '450';
      pane.style.pointerEvents = 'none';
    }

    const layer = L.geoJSON(geoJsonData as any, {
      pane: 'cnChoro',
      style: (feature) => {
        const ibge = feature?.properties?.ibge_code ?? feature?.properties?.cd_mun ?? '';
        const profile = profilesMap[String(ibge)];
        const fill = profile ? cnColor(profile.cn_ratio_weighted) : '#e5e7eb';
        return {
          fillColor: fill,
          fillOpacity: 0.75,
          weight: 0,
          stroke: false,
          interactive: false,
        };
      },
    });

    layer.addTo(map);
    layerRef.current = layer;

    return () => {
      layer.remove();
      layerRef.current = null;
    };
  }, [map, geoJsonData, profilesMap]);

  return null;
}

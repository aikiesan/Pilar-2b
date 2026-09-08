'use client';

/**
 * CnChoroLayer
 * Overlays municipality polygons colored by weighted C/N ratio.
 * Renders non-interactively (pointer-events: none) so clicks fall through
 * to the MunicipalityLayer beneath for normal popup/hover behavior.
 *
 * Colour scale lives in @/lib/cnScale — shared with the map legend.
 */

import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { MunicipalityCollection, MunicipalityCnProfile } from '@/types/geospatial';
import { cnColor, CN_NO_DATA_COLOR } from '@/lib/cnScale';

export type CnProfilesMap = Record<string, MunicipalityCnProfile>;

interface CnChoroLayerProps {
  geoJsonData: MunicipalityCollection;
  profilesMap: CnProfilesMap;
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
        const fill = profile ? cnColor(profile.cn_ratio_weighted) : CN_NO_DATA_COLOR;
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

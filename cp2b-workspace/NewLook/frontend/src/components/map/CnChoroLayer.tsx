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
import type { MunicipalityCollection } from '@/types/geospatial';
import { cnColor, CN_NO_DATA_COLOR } from '@/lib/cnScale';

interface CnChoroLayerProps {
  geoJsonData: MunicipalityCollection;
  /**
   * C:N by IBGE code. Takes plain numbers rather than a profile object so the
   * caller decides which C:N it is painting — the map feeds the N-additive
   * `cn_harm`, not the arithmetic mean this layer used to read off the
   * cn-profiles endpoint. A municipality absent from the map is drawn as
   * no-data, which is how MG renders while it has no corrected value.
   */
  cnByIbge: Record<string, number>;
}


export default function CnChoroLayer({ geoJsonData, cnByIbge }: CnChoroLayerProps) {
  const map = useMap();
  const layerRef = useRef<L.GeoJSON | null>(null);

  useEffect(() => {
    if (!geoJsonData?.features?.length || !Object.keys(cnByIbge).length) return;

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
        const value = cnByIbge[String(ibge)];
        const fill = value !== undefined ? cnColor(value) : CN_NO_DATA_COLOR;
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
  }, [map, geoJsonData, cnByIbge]);

  return null;
}

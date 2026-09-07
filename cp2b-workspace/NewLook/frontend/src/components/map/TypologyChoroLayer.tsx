'use client';

/**
 * TypologyChoroLayer — BETA
 *
 * Paints municipality polygons by co-digestion typology or nutrient regime.
 * Same shape as CnChoroLayer: a non-interactive overlay in its own pane, so
 * clicks and hover fall through to the MunicipalityLayer underneath and the
 * popup/tooltip behaviour is unchanged.
 *
 * Colours live in @/lib/typologyScale, shared with the legend.
 */

import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { MunicipalityCollection } from '@/types/geospatial';
import type { MunicipalityTypology } from '@/hooks/useTypologyProfiles';
import { tipologiaColor, regimeColor, TYPOLOGY_NO_DATA_COLOR } from '@/lib/typologyScale';

export type TypologyMap = Record<string, MunicipalityTypology>;

interface TypologyChoroLayerProps {
  geoJsonData: MunicipalityCollection;
  typologyMap: TypologyMap;
  mode: 'tipologia' | 'regime';
  /** When set, only this class keeps its colour; the rest go flat grey. */
  highlightClass?: string | null;
}

export default function TypologyChoroLayer({
  geoJsonData,
  typologyMap,
  mode,
  highlightClass = null,
}: TypologyChoroLayerProps) {
  const map = useMap();
  const layerRef = useRef<L.GeoJSON | null>(null);

  useEffect(() => {
    if (!geoJsonData?.features?.length || !Object.keys(typologyMap).length) return;

    if (!map.getPane('typologyChoro')) {
      map.createPane('typologyChoro');
      const pane = map.getPane('typologyChoro')!;
      pane.style.zIndex = '450';
      pane.style.pointerEvents = 'none';
    }

    const layer = L.geoJSON(geoJsonData as any, {
      pane: 'typologyChoro',
      style: (feature) => {
        const ibge = feature?.properties?.ibge_code ?? feature?.properties?.cd_mun ?? '';
        const row = typologyMap[String(ibge)];
        const value = row ? (mode === 'tipologia' ? row.tipologia : row.regime) : null;
        const dimmed = highlightClass != null && value !== highlightClass;
        const fill = !row
          ? TYPOLOGY_NO_DATA_COLOR
          : mode === 'tipologia'
            ? tipologiaColor(value)
            : regimeColor(value);
        return {
          fillColor: dimmed ? '#d4d4d8' : fill,
          fillOpacity: dimmed ? 0.35 : 0.78,
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
  }, [map, geoJsonData, typologyMap, mode, highlightClass]);

  return null;
}

'use client';

/**
 * The selected municipality, outlined on the map: a dark line over a white
 * halo, so it reads on every fill and basemap, drawn in its own pane above the
 * choropleth and the infrastructure. Nothing else changes: its neighbours keep
 * their colours, which is the point of finding it on the map rather than
 * filtering the map down to it.
 *
 * `fitKey` asks for the view to frame the municipality; it changes when the
 * selection comes from the search or the URL, not from a click (the visitor
 * already sees what they clicked, and a jump would lose their place).
 */
import { useEffect, useMemo } from 'react';
import { GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { MunicipalityFeature } from '@/types/geospatial';

export const HIGHLIGHT_PANE = 'municipality-highlight';

const HALO = { color: '#ffffff', weight: 7, opacity: 0.95, fill: false } as const;
const LINE = { color: '#111827', weight: 3, opacity: 1, fill: false } as const;

/**
 * Room the view leaves around the municipality, clear of what opens with it:
 * the profile panel on the right on a desktop, the bottom sheet (about 60% of
 * the height) on a phone. The top keeps clear of the controls over the map:
 * on a desktop the top row, ~110 px when it wraps to two lines (md to xl); on
 * a 375 px phone the thematic ribbon plus the search/state row, ~160 px.
 */
export function fitPadding(map: Pick<L.Map, 'getSize'>): { paddingTopLeft: L.PointExpression; paddingBottomRight: L.PointExpression } {
  const { x, y } = map.getSize();
  return x >= 768
    ? { paddingTopLeft: [48, 120], paddingBottomRight: [400, 48] }
    : { paddingTopLeft: [24, 170], paddingBottomRight: [24, Math.round(y * 0.6)] };
}

export default function MunicipalityHighlight({
  feature,
  fitKey,
}: {
  feature: MunicipalityFeature | null;
  fitKey: number;
}) {
  const map = useMap();

  // Above the infrastructure pane (450) and below markers (600); never catches
  // the pointer, so clicks still reach the municipality underneath. Made during
  // render, idempotently: the GeoJSON children add their layers in their own
  // effects, which run before any effect of this component would.
  useMemo(() => {
    if (!map.getPane(HIGHLIGHT_PANE)) {
      const pane = map.createPane(HIGHLIGHT_PANE);
      pane.style.zIndex = '460';
      pane.style.pointerEvents = 'none';
    }
  }, [map]);

  useEffect(() => {
    if (!feature || fitKey === 0) return;
    const bounds = L.geoJSON(feature).getBounds();
    const size = map.getSize();
    // A zero-sized container makes Leaflet's zoom maths return NaN (see ScopeViewController).
    if (!bounds.isValid() || size.x === 0 || size.y === 0) return;
    // 1.2 s, not 0.6: at 0.6 the fly's zoom-out-then-in arc read as a jump and
    // the visitor lost track of where the map went. maxZoom 9 with the map's
    // fractional zoom (zoomSnap 0.1) frames a mid-sized municipality instead of
    // stopping a full level short of it.
    map.flyToBounds(bounds, { ...fitPadding(map), maxZoom: 9, duration: 1.2 });
    // Only a new fit request moves the view; the feature object alone does not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);

  if (!feature) return null;
  const id = String(feature.properties?.ibge_code ?? '');
  return (
    <>
      <GeoJSON key={`halo-${id}`} data={feature} pane={HIGHLIGHT_PANE} interactive={false} style={HALO} />
      <GeoJSON key={`line-${id}`} data={feature} pane={HIGHLIGHT_PANE} interactive={false} style={LINE} />
    </>
  );
}

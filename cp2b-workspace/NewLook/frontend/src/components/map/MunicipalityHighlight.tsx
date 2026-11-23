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
import { prefersReducedMotion, replayPaneFade } from '@/lib/mapMotion';
import type { MunicipalityFeature } from '@/types/geospatial';

export const HIGHLIGHT_PANE = 'municipality-highlight';

const HALO = { color: '#ffffff', weight: 7, opacity: 0.95, fill: false } as const;
const LINE = { color: '#111827', weight: 3, opacity: 1, fill: false } as const;

/**
 * The most of the map's height the profile bottom sheet takes on a phone in
 * portrait. Keep it equal to the `max-h-[55%]` in MunicipalityProfilePanel:
 * the fit below must clear the whole sheet, or the municipality lands under it.
 */
export const PHONE_SHEET_SHARE = 0.55;

/**
 * Room the view leaves around the municipality, clear of what opens with it:
 * the profile panel on the right on a desktop and on a phone in landscape, the
 * bottom sheet on a phone in portrait. The top keeps clear of the controls over
 * the map: on a desktop the top row, ~110 px when it wraps to two lines (md to
 * xl); on a 375 px phone the thematic ribbon plus the search/state row, ~160 px.
 */
export function fitPadding(map: Pick<L.Map, 'getSize'>): { paddingTopLeft: L.PointExpression; paddingBottomRight: L.PointExpression } {
  const { x, y } = map.getSize();
  if (x >= 768) return { paddingTopLeft: [48, 120], paddingBottomRight: [400, 48] };
  if (x > y) return { paddingTopLeft: [24, 120], paddingBottomRight: [380, 24] };
  return { paddingTopLeft: [24, 170], paddingBottomRight: [24, Math.round(y * PHONE_SHEET_SHARE) + 16] };
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
    if (prefersReducedMotion()) map.fitBounds(bounds, { ...fitPadding(map), maxZoom: 9, animate: false });
    else map.flyToBounds(bounds, { ...fitPadding(map), maxZoom: 9, duration: 1.2 });
    // Only a new fit request moves the view; the feature object alone does not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);

  // A new outline fades in rather than snapping on.
  const featureId = feature ? String(feature.properties?.ibge_code ?? '') : '';
  useEffect(() => {
    if (featureId && typeof map.getPane === 'function') replayPaneFade(map.getPane(HIGHLIGHT_PANE));
  }, [featureId, map]);

  if (!feature) return null;
  const id = featureId;
  return (
    <>
      <GeoJSON key={`halo-${id}`} data={feature} pane={HIGHLIGHT_PANE} interactive={false} style={HALO} />
      <GeoJSON key={`line-${id}`} data={feature} pane={HIGHLIGHT_PANE} interactive={false} style={LINE} />
    </>
  );
}

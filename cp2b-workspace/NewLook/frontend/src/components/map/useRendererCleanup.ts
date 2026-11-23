/**
 * Takes a layer's own SVG renderer off the map when the layer goes.
 *
 * A path drawn with an explicit renderer (`L.svg({ pane })`) adds that
 * renderer to the map the first time, and Leaflet never removes it: each
 * time a tool opened and drew, its pane gained one more full-size <svg>.
 * The paths themselves still come off as usual; this removes what held them.
 */
import { useEffect } from 'react';
import type L from 'leaflet';

export function useRendererCleanup(map: L.Map, renderer: L.Renderer | null | undefined): void {
  useEffect(() => {
    if (!renderer) return;
    return () => {
      if (map.hasLayer(renderer)) map.removeLayer(renderer);
    };
  }, [map, renderer]);
}

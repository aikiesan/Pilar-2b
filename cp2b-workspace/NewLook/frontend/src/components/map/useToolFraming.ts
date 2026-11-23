/**
 * Moves the map to a click tool's result, clear of its window: once per pick,
 * after the map's own opening move, and only when it should (lib/mapFraming).
 *
 * Every tool layer calls it with:
 *   - `resultKey`: what was picked (a code, a pair, a point); one framing each;
 *   - `openedFromLink`: whether the tool shows the pick a link opened it with;
 *     the first result framed then counts as the link's, framed whatever the
 *     view. Once false (the reader picked something else), it stays off;
 *   - `pick`: the picked places, which a click must keep in view;
 *   - `extent`: everything the result draws, what gets framed; null until the
 *     result is in.
 */
import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  OPENING_MOVE_MS,
  readPx,
  shouldFrame,
  toolWindowPadding,
} from '@/lib/mapFraming';
import { prefersReducedMotion } from '@/lib/mapMotion';

interface ToolFraming {
  resultKey: string | null;
  openedFromLink: boolean;
  pick: readonly L.LatLngExpression[];
  extent: L.LatLngBounds | null;
  /** The tool window's width on desktops (MAP_WINDOW_CLASS 340, the wide one 380). */
  windowWidth?: number;
  maxZoom?: number;
}

export function useToolFraming({ resultKey, openedFromLink, pick, extent, windowWidth = 340, maxZoom = 10 }: ToolFraming): void {
  const map = useMap();
  const mountedAt = useRef(0);
  const framed = useRef<string | null>(null);
  const linkPending = useRef(openedFromLink);
  // The latest places, read when the framing runs (they are new arrays each render).
  const latest = useRef({ pick, extent, windowWidth, maxZoom });
  useEffect(() => {
    latest.current = { pick, extent, windowWidth, maxZoom };
  });

  useEffect(() => {
    mountedAt.current = performance.now();
  }, []);

  // Declared before the framing so a new pick clears it first.
  useEffect(() => {
    if (!openedFromLink) linkPending.current = false;
  }, [openedFromLink]);

  const ready = extent !== null && extent.isValid();
  useEffect(() => {
    if (!resultKey || !ready || framed.current === resultKey) return;
    const frame = () => {
      framed.current = resultKey;
      const fromLink = linkPending.current;
      linkPending.current = false;
      const { pick: places, extent: bounds, windowWidth: width, maxZoom: zoom } = latest.current;
      const size = map.getSize();
      if (!bounds || size.x === 0 || size.y === 0) return;
      const padding = toolWindowPadding(size, {
        topClear: readPx(getComputedStyle(map.getContainer()).getPropertyValue('--map-top-clear')) ?? undefined,
        bottomBar: readPx(getComputedStyle(document.documentElement).getPropertyValue('--map-bottom-bar')) ?? 0,
        windowWidth: width,
        // The window's own landscape: classes follow the viewport, not the map.
        landscape: window.matchMedia('(orientation: landscape)').matches,
      });
      const points = places.map((p) => map.latLngToContainerPoint(p));
      if (!shouldFrame(fromLink, points, size, padding)) return;
      map.fitBounds(bounds, { ...padding, maxZoom: zoom, animate: !prefersReducedMotion() });
    };
    // On a fresh page the map's opening fly would override the framing.
    const wait = Math.max(0, OPENING_MOVE_MS - (performance.now() - mountedAt.current));
    if (wait === 0) {
      frame();
      return;
    }
    const timer = window.setTimeout(frame, wait);
    return () => window.clearTimeout(timer);
  }, [map, resultKey, ready]);
}

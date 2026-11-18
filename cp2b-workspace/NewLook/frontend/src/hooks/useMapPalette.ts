/**
 * useMapPalette — the currently-selected thematic choropleth palette.
 *
 * Same tiny module-level store pattern as useCvdPalette: any component can read
 * or set the palette without a React context wrapping the map, so the palette
 * selector (in the sidebar's Temas tab), the choropleth (MunicipalityLayer) and
 * the legend (MapLegend) stay in sync, and a thematic preset can set it
 * imperatively from MapComponent via `setMapPalette`. Persisted in localStorage.
 *
 * This is the everyday palette. The daltonic override lives in useCvdPalette and
 * takes precedence in the colour functions — see getMetricColor.
 */

'use client';

import { useSyncExternalStore, useCallback } from 'react';
import {
  MAP_PALETTES,
  DEFAULT_MAP_PALETTE,
  type MapPaletteId,
} from '@/lib/mapMetrics';

const STORAGE_KEY = 'pilar2b-map-palette';

let current: MapPaletteId = DEFAULT_MAP_PALETTE;
let hydrated = false;
const listeners = new Set<() => void>();

function isValid(v: string | null): v is MapPaletteId {
  return v != null && Object.prototype.hasOwnProperty.call(MAP_PALETTES, v);
}

function hydrateOnce() {
  if (hydrated || typeof window === 'undefined') return;
  hydrated = true;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isValid(stored)) current = stored;
  } catch {
    /* localStorage unavailable (privacy mode) */
  }
}

function getSnapshot(): MapPaletteId {
  hydrateOnce();
  return current;
}

function getServerSnapshot(): MapPaletteId {
  return DEFAULT_MAP_PALETTE;
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function setMapPalette(id: MapPaletteId) {
  if (current === id) return;
  current = id;
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore persist failure */
  }
  listeners.forEach((cb) => cb());
}

export function useMapPalette(): [MapPaletteId, (id: MapPaletteId) => void] {
  const palette = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const set = useCallback((id: MapPaletteId) => setMapPalette(id), []);
  return [palette, set];
}

/**
 * useCvdPalette — the currently-selected colour-vision-deficiency palette.
 *
 * Backed by a tiny module-level store (useSyncExternalStore) so any component
 * can read or set it without a React context/provider wrapping the map. That
 * keeps the palette selector (in the legend) and the choropleth
 * (MunicipalityLayer) in sync while leaving MapComponent untouched. Persisted
 * in localStorage, alongside the existing `pilar2b-daltonic` flag.
 */

'use client';

import { useSyncExternalStore, useCallback } from 'react';
import {
  CVD_PALETTES,
  DEFAULT_CVD_PALETTE,
  type CvdPaletteId,
} from '@/lib/mapMetrics';

const STORAGE_KEY = 'pilar2b-cvd-palette';

let current: CvdPaletteId = DEFAULT_CVD_PALETTE;
let hydrated = false;
const listeners = new Set<() => void>();

function isValid(v: string | null): v is CvdPaletteId {
  return v != null && Object.prototype.hasOwnProperty.call(CVD_PALETTES, v);
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

function getSnapshot(): CvdPaletteId {
  hydrateOnce();
  return current;
}

function getServerSnapshot(): CvdPaletteId {
  return DEFAULT_CVD_PALETTE;
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function setCvdPalette(id: CvdPaletteId) {
  if (current === id) return;
  current = id;
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore persist failure */
  }
  listeners.forEach((cb) => cb());
}

export function useCvdPalette(): [CvdPaletteId, (id: CvdPaletteId) => void] {
  const palette = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const set = useCallback((id: CvdPaletteId) => setCvdPalette(id), []);
  return [palette, set];
}

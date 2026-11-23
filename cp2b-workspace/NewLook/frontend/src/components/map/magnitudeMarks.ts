/**
 * Shared by the two magnitude views (Pontos, Símbolos) and their legend:
 * where they draw, and the colour of each origin.
 */
import type L from 'leaflet';
import { SECTOR_COLORS } from '@/data/sectorColors';
import type { GatherSource } from '@/lib/gather';
import { SPLIT_SECTORS } from '@/lib/sectorSplit';

/**
 * Above the municipality outlines (overlayPane, 400) and under the
 * infrastructure (450) and the selection outline (460). It never catches the
 * pointer: hover and click stay with the municipality underneath.
 */
export const MAGNITUDE_PANE = 'magnitude-marks';

export function ensureMagnitudePane(map: L.Map): HTMLElement {
  const existing = map.getPane(MAGNITUDE_PANE);
  if (existing) return existing;
  const pane = map.createPane(MAGNITUDE_PANE);
  pane.style.zIndex = '420';
  pane.style.pointerEvents = 'none';
  return pane;
}

/** Ink for an amount the data cannot split by origin. */
export const NO_SPLIT_COLOR = '#4B5563';

/** Index = DotKind: the three sectors in SPLIT_SECTORS order, then no split. */
export const KIND_COLORS: readonly string[] = [...SPLIT_SECTORS.map((s) => SECTOR_COLORS[s]), NO_SPLIT_COLOR];

/** The same colours by name, for Gather's fills, particles and bar. */
export const SOURCE_COLORS: Record<GatherSource, string> = {
  agricultural: SECTOR_COLORS.agricultural,
  livestock: SECTOR_COLORS.livestock,
  urban: SECTOR_COLORS.urban,
  unsplit: NO_SPLIT_COLOR,
};

/** The paper the marks are cut from: the gaps between segments and the halo. */
export const MARK_PAPER = '#FCFCFB';

/** The flat fill under the marks: the municipalities as context, not as data. */
export const CONTEXT_FILL = '#F1EEE7';

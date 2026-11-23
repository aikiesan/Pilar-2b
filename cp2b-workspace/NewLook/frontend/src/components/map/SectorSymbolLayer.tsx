'use client';

/**
 * Símbolos: one circle per municipality, its area the amount, its ring split
 * by origin (lib/sectorSymbols.ts). SVG in Leaflet divIcons, so each circle is
 * crisp at any zoom, at a fixed screen size: the legend's circles stay true.
 *
 * Big circles are drawn under small ones (zIndexOffset), and each is cut out
 * of a paper halo so overlapping circles stay apart. The circles never catch
 * the pointer: hover and click reach the municipality underneath, whose
 * tooltip carries the numbers.
 */
import { useEffect } from 'react';
import L from 'leaflet';
import { useMap } from 'react-leaflet';
import { SECTOR_COLORS } from '@/data/sectorColors';
import type { SymbolItem } from '@/lib/magnitudeViews';
import type { SectorAmounts } from '@/lib/sectorSplit';
import { ringSegments, symbolRadius, SYMBOL_HOLE_FROM, SYMBOL_HOLE_SHARE } from '@/lib/sectorSymbols';
import { ensureMagnitudePane, MAGNITUDE_PANE, MARK_PAPER, NO_SPLIT_COLOR } from './magnitudeMarks';

interface SectorSymbolLayerProps {
  items: readonly SymbolItem[];
  /** The amount that gets the largest circle. */
  maxValue: number;
}

const HALO = 1.5;

/** The circle's SVG, centred in a square of side 2(r + halo). */
export function symbolSvg(amounts: SectorAmounts, r: number): string {
  const c = r + HALO;
  const size = c * 2;
  const hole = r >= SYMBOL_HOLE_FROM ? r * SYMBOL_HOLE_SHARE : 0;
  const ring = amounts.parts
    ? ringSegments(amounts.parts, r, hole)
        .map((s) => `<path d="${s.d}" fill="${SECTOR_COLORS[s.sector]}" fill-rule="evenodd" stroke="${MARK_PAPER}" stroke-width="1" stroke-linejoin="round"/>`)
        .join('')
    : `<circle r="${(hole ? (r + hole) / 2 : r / 2).toFixed(2)}" fill="none" stroke="${NO_SPLIT_COLOR}" stroke-width="${(hole ? r - hole : r).toFixed(2)}"/>`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${-c} ${-c} ${size} ${size}" aria-hidden="true">` +
    `<circle r="${(r + HALO / 2).toFixed(2)}" fill="${MARK_PAPER}" fill-opacity="0.92"/>` +
    ring +
    `<circle r="${r.toFixed(2)}" fill="none" stroke="#1E3E4C" stroke-opacity="0.45" stroke-width="0.75"/>` +
    `</svg>`
  );
}

export default function SectorSymbolLayer({ items, maxValue }: SectorSymbolLayerProps) {
  const map = useMap();

  useEffect(() => {
    ensureMagnitudePane(map);
    const markers: L.Marker[] = [];
    for (const item of items) {
      const r = symbolRadius(item.amounts.total, maxValue);
      if (!r) continue;
      const size = Math.ceil((r + HALO) * 2);
      const marker = L.marker([item.lat, item.lng], {
        pane: MAGNITUDE_PANE,
        interactive: false,
        keyboard: false,
        // Small over big, whatever the latitude.
        zIndexOffset: -Math.round(r * 1000),
        icon: L.divIcon({
          className: 'sector-symbol',
          html: symbolSvg(item.amounts, r),
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        }),
      });
      marker.addTo(map);
      markers.push(marker);
    }
    return () => {
      for (const m of markers) m.remove();
    };
  }, [map, items, maxValue]);

  return null;
}

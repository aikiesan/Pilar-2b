'use client';

/**
 * Pontos: the dot density view (lib/dotDensity.ts), drawn on canvas tiles.
 *
 * A GridLayer, so Leaflet asks for one 256 px canvas per tile in view and the
 * dots are drawn once per tile and zoom, not on every frame of a pan. Each
 * dot's place is projected once (Web Mercator, 0–1) and scaled per zoom.
 * The dots grow a little with the zoom so they stay visible close up, never
 * enough to merge at the state view.
 */
import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import { useMap } from 'react-leaflet';
import type { Dot } from '@/lib/dotDensity';
import { ensureMagnitudePane, KIND_COLORS, MAGNITUDE_PANE } from './magnitudeMarks';

interface DotDensityLayerProps {
  dots: readonly Dot[];
}

/** Dot radius in CSS px at a zoom level. */
export function dotRadius(zoom: number): number {
  return Math.min(2.4, Math.max(0.9, 0.9 + (zoom - 6) * 0.38));
}

export default function DotDensityLayer({ dots }: DotDensityLayerProps) {
  const map = useMap();

  // Mercator x/y in 0–1, and the kind, packed for the tile loop.
  const packed = useMemo(() => {
    const xs = new Float64Array(dots.length);
    const ys = new Float64Array(dots.length);
    const kinds = new Uint8Array(dots.length);
    dots.forEach((d, i) => {
      const sin = Math.sin((d.lat * Math.PI) / 180);
      xs[i] = (d.lng + 180) / 360;
      ys[i] = 0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI);
      kinds[i] = d.kind;
    });
    return { xs, ys, kinds };
  }, [dots]);

  useEffect(() => {
    ensureMagnitudePane(map);
    const { xs, ys, kinds } = packed;
    const Grid = L.GridLayer.extend({
      createTile(coords: L.Coords) {
        const tile = document.createElement('canvas');
        const size = (this as L.GridLayer).getTileSize();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        tile.width = size.x * dpr;
        tile.height = size.y * dpr;
        const ctx = tile.getContext('2d');
        if (!ctx) return tile;
        ctx.scale(dpr, dpr);
        const world = size.x * 2 ** coords.z;
        const ox = coords.x * size.x;
        const oy = coords.y * size.y;
        const r = dotRadius(coords.z);
        for (let kind = 0; kind < KIND_COLORS.length; kind++) {
          ctx.beginPath();
          let any = false;
          for (let i = 0; i < xs.length; i++) {
            if (kinds[i] !== kind) continue;
            const x = xs[i] * world - ox;
            const y = ys[i] * world - oy;
            if (x < -r || y < -r || x > size.x + r || y > size.y + r) continue;
            ctx.moveTo(x + r, y);
            ctx.arc(x, y, r, 0, Math.PI * 2);
            any = true;
          }
          if (any) {
            ctx.fillStyle = KIND_COLORS[kind];
            ctx.globalAlpha = 0.88;
            ctx.fill();
          }
        }
        return tile;
      },
    });
    const DotGrid = Grid as unknown as new (options: L.GridLayerOptions) => L.GridLayer;
    const layer = new DotGrid({ pane: MAGNITUDE_PANE, updateWhenZooming: false, keepBuffer: 2 });
    layer.addTo(map);
    return () => {
      layer.remove();
    };
  }, [map, packed]);

  return null;
}

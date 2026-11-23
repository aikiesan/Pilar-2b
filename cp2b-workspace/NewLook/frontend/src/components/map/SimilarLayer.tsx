'use client';

/**
 * Find similar, on the map: every municipality of the scope as a light outline
 * a click can pick; the picked one filled in ink; curved arcs reaching out to
 * its twelve closest matches, about 90 ms apart, each match filling in green
 * as its arc lands. Hovering a row in the window outlines that match.
 *
 * The outlines stay on the map's canvas renderer (preferCanvas), as Compare's
 * do. The fills, arcs and hover outline are SVG in the tool's pane (458),
 * which never catches the pointer. Arcs grow by adding points, never by
 * animating a size; with reduced motion everything is there at once.
 */
import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import type { Feature, Geometry } from 'geojson';
import { GeoJSON, useMap } from 'react-leaflet';
import { prefersReducedMotion } from '@/lib/mapMotion';
import {
  arcPoints,
  arcProgress,
  arcsTotalMs,
  partialArc,
  type SimilarResult,
} from '@/lib/similarity';
import type { MunicipalityFeature } from '@/types/geospatial';
import { useRendererCleanup } from './useRendererCleanup';

const PANE = 'similar';
const INK = '#1E3E4C';
const OUTLINE = '#9DB0B8';
/** terra 500 and 600 (styles/palette.js). */
export const SIMILAR_MATCH_FILL = '#178257';
const MATCH_LINE = '#00573A';

interface SimilarLayerProps {
  /** The municipalities a click can pick (the map's scope and filters). */
  features: readonly MunicipalityFeature[];
  /** Every municipality the map holds: a match may lie outside the scope. */
  allFeatures: readonly MunicipalityFeature[];
  result: SimilarResult | null;
  /** The match a row in the window points at. */
  hovered: string | null;
  /** Whether a click picks (approved sign-in); otherwise the outlines are inert. */
  interactive: boolean;
  onPick: (code: string) => void;
}

/** A number per features array, for the GeoJSON's key (see CompareLayer). */
const featureSetIds = new WeakMap<object, number>();
let nextFeatureSetId = 0;
function featureSetId(features: object): number {
  let id = featureSetIds.get(features);
  if (id === undefined) {
    id = ++nextFeatureSetId;
    featureSetIds.set(features, id);
  }
  return id;
}

const OUTLINE_STYLE: L.PathOptions = { color: OUTLINE, weight: 0.6, opacity: 0.9, fillColor: '#ffffff', fillOpacity: 0.01 };
const MATCH_SHOWN: L.PathOptions = { color: MATCH_LINE, weight: 1, opacity: 0.9, fillColor: SIMILAR_MATCH_FILL, fillOpacity: 0.45 };
const MATCH_HIDDEN: L.PathOptions = { ...MATCH_SHOWN, opacity: 0, fillOpacity: 0 };

export default function SimilarLayer({ features, allFeatures, result, hovered, interactive, onPick }: SimilarLayerProps) {
  const map = useMap();
  const renderer = useMemo(() => {
    if (!map.getPane(PANE)) {
      const pane = map.createPane(PANE);
      pane.style.zIndex = '458';
      pane.style.pointerEvents = 'none';
    }
    return L.svg({ pane: PANE });
  }, [map]);
  useRendererCleanup(map, renderer);

  const byCode = useMemo(
    () => new Map(allFeatures.map((f) => [String(f.properties?.ibge_code), f])),
    [allFeatures],
  );

  // The click handlers are bound once per layer; they read the latest props here.
  const pickRef = useRef(onPick);
  const interactiveRef = useRef(interactive);
  useEffect(() => {
    pickRef.current = onPick;
    interactiveRef.current = interactive;
  }, [onPick, interactive]);

  const collection = useMemo(
    () => ({ type: 'FeatureCollection' as const, features: features as unknown as Feature[] }),
    [features],
  );

  // ── The origin, the arcs and the matches, on one clock ──
  useEffect(() => {
    if (!result || result.status !== 'ready') return;
    const reduced = prefersReducedMotion();
    const layers: L.Layer[] = [];
    const shape = (code: string, style: L.PathOptions) => {
      const feature = byCode.get(code);
      if (!feature) return null;
      const layer = L.geoJSON(feature as unknown as Feature<Geometry>, {
        pane: PANE,
        renderer,
        interactive: false,
        style,
      } as L.GeoJSONOptions).addTo(map);
      layers.push(layer);
      return layer;
    };

    shape(result.origin.code, { color: INK, weight: 2, opacity: 1, fillColor: INK, fillOpacity: 0.8 });

    const arcs = result.matches.map((m) => {
      const points = arcPoints(result.origin, m);
      const line = L.polyline(reduced ? points : points.slice(0, 1), {
        pane: PANE,
        renderer,
        interactive: false,
        color: INK,
        weight: 1.5,
        opacity: 0.7,
        lineCap: 'round',
      }).addTo(map);
      layers.push(line);
      const fill = shape(m.code, reduced ? MATCH_SHOWN : MATCH_HIDDEN);
      return { points, line, fill, landed: reduced };
    });

    const cleanup = () => {
      for (const l of layers) l.remove();
    };
    if (reduced) return cleanup;

    const total = arcsTotalMs(arcs.length);
    const t0 = performance.now();
    let frame = 0;
    const draw = (now: number) => {
      const t = now - t0;
      arcs.forEach((arc, i) => {
        if (arc.landed) return;
        const p = arcProgress(i, t);
        arc.line.setLatLngs(partialArc(arc.points, p));
        if (p >= 1) {
          arc.landed = true;
          arc.fill?.setStyle(MATCH_SHOWN);
        }
      });
      if (t < total) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      cleanup();
    };
  }, [map, renderer, result, byCode]);

  // ── The row the window points at ──
  useEffect(() => {
    if (!hovered) return;
    const feature = byCode.get(hovered);
    if (!feature) return;
    const layer = L.geoJSON(feature as unknown as Feature<Geometry>, {
      pane: PANE,
      renderer,
      interactive: false,
      style: { color: INK, weight: 3, opacity: 1, fill: false },
    } as L.GeoJSONOptions).addTo(map);
    return () => {
      layer.remove();
    };
  }, [map, renderer, hovered, byCode]);

  return (
    <GeoJSON
      key={featureSetId(features)}
      data={collection}
      style={OUTLINE_STYLE}
      onEachFeature={(feature, layer) => {
        const code = String(feature.properties?.ibge_code ?? '');
        layer.on('click', (e: L.LeafletMouseEvent) => {
          if (!interactiveRef.current) return;
          L.DomEvent.stopPropagation(e);
          pickRef.current(code);
        });
      }}
    />
  );
}

'use client';

/**
 * Compare, on the map: every municipality of the scope as a light outline a
 * click can pick, A and B filled in their colours with ink outlines and a
 * lettered chip, and a dashed ink line from A to B that draws itself in 700 ms
 * with the distance at its middle.
 *
 * The outlines stay on the map's canvas renderer (preferCanvas) like the
 * choropleth they replace while the tool is open. The line draws as SVG in a
 * pane of its own (455, as Land around's circle) and never catches the pointer.
 * It grows by moving its end point, never by animating a size; with reduced
 * motion it is drawn whole at once.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import type { Feature, Geometry } from 'geojson';
import { GeoJSON, Marker, Polyline, useMap } from 'react-leaflet';
import { COMPARE_COLORS, type CompareSlot } from '@/lib/compare';
import { centroidOf, midpoint, type LatLng } from '@/lib/mapGeometry';
import type { MunicipalityFeature } from '@/types/geospatial';
import { useRendererCleanup } from './useRendererCleanup';

const PANE = 'compare-line';
const DRAW_MS = 700;
const INK = '#1E3E4C';
const OUTLINE = '#9DB0B8';

interface CompareLayerProps {
  /** The municipalities a click can pick (the map's scope and filters). */
  features: readonly MunicipalityFeature[];
  /**
   * Every municipality the map holds, to place A and B: a pair from a link or
   * a search may lie outside the scope or the filters, and the window still
   * shows it.
   */
  allFeatures: readonly MunicipalityFeature[];
  /** IBGE codes: [A] or [A, B]. */
  pair: readonly string[];
  /** Whether a click picks (approved sign-in); otherwise the outlines are inert. */
  interactive: boolean;
  onPick: (code: string) => void;
  /** "{n} km apart in a straight line", for the label. */
  distanceLabel: (km: number) => string;
  distanceKm: number | null;
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function chipIcon(slot: CompareSlot) {
  return L.divIcon({
    className: '',
    html: `<div class="compare-chip" style="color:${COMPARE_COLORS[slot]}"><span>${slot.toUpperCase()}</span></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

function labelIcon(text: string) {
  const span = document.createElement('span');
  span.className = 'compare-distance';
  span.textContent = text;
  return L.divIcon({ className: '', html: span.outerHTML, iconSize: [0, 0], iconAnchor: [0, 0] });
}

/**
 * A number per features array, for the GeoJSON's key. react-leaflet reads
 * `data` once, at mount, so a new array (a refetch, another scope or filter)
 * must remount the layer, even when it holds as many municipalities.
 */
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

/** The end of the line `t` of the way from a to b, 0–1. */
const along = (a: LatLng, b: LatLng, t: number): [number, number] => [
  a.lat + (b.lat - a.lat) * t,
  a.lng + (b.lng - a.lng) * t,
];

export default function CompareLayer({
  features,
  allFeatures,
  pair,
  interactive,
  onPick,
  distanceLabel,
  distanceKm,
}: CompareLayerProps) {
  const map = useMap();
  const renderer = useMemo(() => {
    if (!map.getPane(PANE)) {
      const pane = map.createPane(PANE);
      pane.style.zIndex = '455';
      pane.style.pointerEvents = 'none';
    }
    return L.svg({ pane: PANE });
  }, [map]);
  useRendererCleanup(map, renderer);

  const byCode = useMemo(
    () => new Map(allFeatures.map((f) => [String(f.properties?.ibge_code), f])),
    [allFeatures],
  );
  const [codeA, codeB] = pair;
  const a = codeA ? centroidOf(byCode.get(codeA)) : null;
  const b = codeB ? centroidOf(byCode.get(codeB)) : null;

  // ── Outlines: one layer for the scope, restyled when the pair changes ──
  const geoRef = useRef<L.GeoJSON | null>(null);
  // The click handlers are bound once per layer; they read the latest props here.
  const pickRef = useRef(onPick);
  const interactiveRef = useRef(interactive);
  useEffect(() => {
    pickRef.current = onPick;
    interactiveRef.current = interactive;
  }, [onPick, interactive]);

  const styleFor = useMemo(
    () => (feature?: Feature<Geometry, { ibge_code?: string | number }>): L.PathOptions => {
      const code = String(feature?.properties?.ibge_code ?? '');
      const slot: CompareSlot | null = code === codeA ? 'a' : code === codeB ? 'b' : null;
      return slot
        ? { color: INK, weight: 2, opacity: 1, fillColor: COMPARE_COLORS[slot], fillOpacity: 0.6 }
        : { color: OUTLINE, weight: 0.6, opacity: 0.9, fillColor: '#ffffff', fillOpacity: 0.01 };
    },
    [codeA, codeB],
  );
  useEffect(() => {
    geoRef.current?.setStyle(styleFor as L.StyleFunction);
  }, [styleFor]);

  const collection = useMemo(
    () => ({ type: 'FeatureCollection' as const, features: features as unknown as Feature[] }),
    [features],
  );

  // ── The line, drawn from A to B on one clock ──
  const lineKey = a && b ? `${codeA}-${codeB}` : null;
  const [reducedMotion] = useState(prefersReducedMotion);
  const [drawn, setDrawn] = useState<{ key: string | null; t: number }>({ key: null, t: 1 });
  useEffect(() => {
    if (!lineKey || reducedMotion) return;
    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / DRAW_MS);
      // ease-out: fast start, gentle arrival at B
      setDrawn({ key: lineKey, t: 1 - (1 - p) ** 3 });
      if (p < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [lineKey, reducedMotion]);
  // With reduced motion the line is there whole, at once.
  const t = reducedMotion ? 1 : drawn.key === lineKey ? drawn.t : 0;

  const chipA = useMemo(() => chipIcon('a'), []);
  const chipB = useMemo(() => chipIcon('b'), []);
  const label = useMemo(
    () => (distanceKm !== null ? labelIcon(distanceLabel(distanceKm)) : null),
    [distanceKm, distanceLabel],
  );

  return (
    <>
      <GeoJSON
        key={featureSetId(features)}
        ref={geoRef}
        data={collection}
        style={styleFor as L.StyleFunction}
        onEachFeature={(feature, layer) => {
          const code = String(feature.properties?.ibge_code ?? '');
          layer.on('click', (e: L.LeafletMouseEvent) => {
            if (!interactiveRef.current) return;
            L.DomEvent.stopPropagation(e);
            pickRef.current(code);
          });
        }}
      />
      {a && b && t > 0 && (
        <Polyline
          positions={[[a.lat, a.lng], along(a, b, t)]}
          // The renderer and pane are chosen when the line is added, so they are
          // props: inside pathOptions they would only reach setStyle(), too late.
          pane={PANE}
          renderer={renderer}
          interactive={false}
          pathOptions={{ color: INK, weight: 2, opacity: 0.9, dashArray: '6 6' }}
        />
      )}
      {a && <Marker position={[a.lat, a.lng]} icon={chipA} interactive={false} keyboard={false} />}
      {b && <Marker position={[b.lat, b.lng]} icon={chipB} interactive={false} keyboard={false} />}
      {a && b && label && t >= 1 && (
        <Marker position={[midpoint(a, b).lat, midpoint(a, b).lng]} icon={label} interactive={false} keyboard={false} />
      )}
    </>
  );
}

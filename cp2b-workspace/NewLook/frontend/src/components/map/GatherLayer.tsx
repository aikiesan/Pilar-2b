'use client';

/**
 * Gather, on the map: catches the click that places the plant, then plays the
 * tool's one movement on one clock (lib/gather.ts):
 *
 *   1. a dashed ink circle grows to the radius (about 1.4 s);
 *   2. each member municipality fills in its main source's colour as the
 *      circle reaches its centroid;
 *   3. particles leave each member, about one per √ of its million m³/yr, in
 *      its sources' colours, along slightly curved paths to the hub, whose ink
 *      dot grows as they arrive.
 *
 * The circle, fills and hub are SVG in the tool's pane (456). The particles are
 * one canvas in a pane of their own (457), redrawn per frame from
 * latLngToContainerPoint and kept aligned with the map while it pans; hidden
 * during a zoom and redrawn after it. The loop stops when the flow ends or the
 * tool closes. With reduced motion everything is there at once and no
 * particle moves.
 */
import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import { useMap, useMapEvents } from 'react-leaflet';
import type { Feature } from 'geojson';
import {
  easeOut,
  GATHER_STAGGER_MS,
  GATHER_TRIP_MS,
  GATHER_WAVE_MS,
  particleCount,
  waveReachMs,
  type GatherResult,
  type GatherSource,
} from '@/lib/gather';
import { seededRandom } from '@/lib/dotDensity';
import { prefersReducedMotion } from '@/lib/mapMotion';
import type { LatLng } from '@/lib/mapGeometry';
import type { MunicipalityFeature } from '@/types/geospatial';
import { SOURCE_COLORS } from './magnitudeMarks';
import { useRendererCleanup } from './useRendererCleanup';

const PANE = 'gather';
const FLOW_PANE = 'gather-flow';
const INK = '#1E3E4C';

interface GatherLayerProps {
  /** The tool is on: the cursor is a crosshair and a click places the plant. */
  active: boolean;
  point: LatLng | null;
  radiusKm: number;
  result: GatherResult | null;
  /** Outlines of the members, by IBGE code. */
  features: readonly MunicipalityFeature[];
  onPick: (point: LatLng) => void;
}

interface Particle {
  from: L.LatLng;
  /** Control point of the curve, as a share of the trip, sideways. */
  bend: number;
  start: number;
  color: string;
}

function ensurePane(map: L.Map, name: string, z: number): HTMLElement {
  const existing = map.getPane(name);
  if (existing) return existing;
  const pane = map.createPane(name);
  pane.style.zIndex = String(z);
  pane.style.pointerEvents = 'none';
  return pane;
}

export default function GatherLayer({ active, point, radiusKm, result, features, onPick }: GatherLayerProps) {
  const map = useMap();
  const renderer = useMemo(() => {
    ensurePane(map, PANE, 456);
    return L.svg({ pane: PANE });
  }, [map]);
  useRendererCleanup(map, renderer);

  useEffect(() => {
    const container = map.getContainer();
    container.classList.toggle('land-around-on', active);
    return () => container.classList.remove('land-around-on');
  }, [map, active]);

  // The click handler reads the latest props.
  const pickRef = useRef(onPick);
  const activeRef = useRef(active);
  useEffect(() => {
    pickRef.current = onPick;
    activeRef.current = active;
  }, [onPick, active]);
  useMapEvents({
    click(e) {
      if (activeRef.current) pickRef.current({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });

  const byCode = useMemo(
    () => new Map(features.map((f) => [String(f.properties?.ibge_code), f])),
    [features],
  );

  useEffect(() => {
    if (!point || !result) return;
    const reduced = prefersReducedMotion();
    const hub = L.latLng(point.lat, point.lng);
    const layers: L.Layer[] = [];

    // ── 1 and 2: the circle and the fills ──
    const circle = L.circle(hub, {
      radius: reduced ? radiusKm * 1000 : 1,
      pane: PANE,
      renderer,
      interactive: false,
      fill: false,
      color: INK,
      weight: 2,
      dashArray: '8 6',
    }).addTo(map);
    layers.push(circle);

    const fills = result.members
      .filter((m) => m.dominant)
      .map((m) => {
        const feature = byCode.get(m.code);
        if (!feature) return null;
        const layer = L.geoJSON(feature as unknown as Feature, {
          pane: PANE,
          renderer,
          interactive: false,
          style: {
            color: SOURCE_COLORS[m.dominant as GatherSource],
            weight: 1,
            opacity: reduced ? 0.8 : 0,
            fillColor: SOURCE_COLORS[m.dominant as GatherSource],
            fillOpacity: reduced ? 0.28 : 0,
          },
        } as L.GeoJSONOptions).addTo(map);
        layers.push(layer);
        return { layer, at: waveReachMs(m.km, radiusKm), shown: reduced };
      })
      .filter(Boolean) as { layer: L.GeoJSON; at: number; shown: boolean }[];

    // ── 3: the hub, growing as the flow arrives ──
    const hubMax = 9;
    const hubDot = L.circleMarker(hub, {
      radius: reduced ? hubMax : 4,
      pane: PANE,
      renderer,
      interactive: false,
      color: '#FCFCFB',
      weight: 2,
      fillColor: INK,
      fillOpacity: 1,
    }).addTo(map);
    layers.push(hubDot);

    const cleanup = () => {
      for (const l of layers) l.remove();
    };
    if (reduced) return cleanup;

    // ── The particles ──
    const particles: Particle[] = [];
    for (const m of result.members) {
      if (!m.biomethane) continue;
      const rand = seededRandom(Number(m.code) || 1);
      const n = particleCount(m.biomethane);
      const reach = waveReachMs(m.km, radiusKm);
      const sources = (Object.keys(m.bySource) as GatherSource[]).filter((s) => m.bySource[s] > 0);
      for (let i = 0; i < n; i++) {
        // Colour drawn by the municipality's own mix.
        let pick = rand() * m.biomethane;
        let color = SOURCE_COLORS[sources[0]];
        for (const s of sources) {
          pick -= m.bySource[s];
          if (pick <= 0) {
            color = SOURCE_COLORS[s];
            break;
          }
        }
        particles.push({
          from: L.latLng(m.lat, m.lng),
          bend: (rand() - 0.5) * 0.35,
          start: reach + rand() * GATHER_STAGGER_MS,
          color,
        });
      }
    }
    const totalParticles = particles.length;

    const flowPane = ensurePane(map, FLOW_PANE, 457);
    const canvas = L.DomUtil.create('canvas', 'gather-flow', flowPane) as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = () => {
      const s = map.getSize();
      canvas.width = s.x * dpr;
      canvas.height = s.y * dpr;
      canvas.style.width = `${s.x}px`;
      canvas.style.height = `${s.y}px`;
    };
    size();
    let zooming = false;
    const onZoomStart = () => {
      zooming = true;
      canvas.style.visibility = 'hidden';
    };
    const onZoomEnd = () => {
      zooming = false;
      canvas.style.visibility = '';
    };
    map.on('zoomstart', onZoomStart);
    map.on('zoomend', onZoomEnd);
    map.on('resize', size);

    const t0 = performance.now();
    let frame = 0;
    const draw = (now: number) => {
      const t = now - t0;
      // Circle and fills.
      circle.setRadius(Math.max(1, radiusKm * 1000 * easeOut(t / GATHER_WAVE_MS)));
      for (const f of fills) {
        if (!f.shown && t >= f.at) {
          f.shown = true;
          f.layer.setStyle({ opacity: 0.8, fillOpacity: 0.28 });
        }
      }
      // Particles, in container pixels, the canvas held at the container's corner.
      let arrived = 0;
      let moving = 0;
      if (ctx && !zooming) {
        L.DomUtil.setPosition(canvas, map.containerPointToLayerPoint([0, 0]));
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const s = map.getSize();
        ctx.clearRect(0, 0, s.x, s.y);
        const h = map.latLngToContainerPoint(hub);
        for (const p of particles) {
          const k = (t - p.start) / GATHER_TRIP_MS;
          if (k >= 1) {
            arrived++;
            continue;
          }
          if (k < 0) continue;
          moving++;
          const a = map.latLngToContainerPoint(p.from);
          const e = easeOut(k);
          // A quadratic curve, its control pushed sideways from the midpoint.
          const mx = (a.x + h.x) / 2 - (h.y - a.y) * p.bend;
          const my = (a.y + h.y) / 2 + (h.x - a.x) * p.bend;
          const x = (1 - e) * (1 - e) * a.x + 2 * (1 - e) * e * mx + e * e * h.x;
          const y = (1 - e) * (1 - e) * a.y + 2 * (1 - e) * e * my + e * e * h.y;
          ctx.globalAlpha = 0.9;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(x, y, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        for (const p of particles) if (t - p.start >= GATHER_TRIP_MS) arrived++;
      }
      hubDot.setRadius(4 + (hubMax - 4) * Math.sqrt(totalParticles ? arrived / totalParticles : 1));
      const done = t >= GATHER_WAVE_MS && arrived === totalParticles && moving === 0;
      if (done) {
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      map.off('zoomstart', onZoomStart);
      map.off('zoomend', onZoomEnd);
      map.off('resize', size);
      canvas.remove();
      cleanup();
    };
  }, [map, renderer, point, radiusKm, result, byCode]);

  return null;
}

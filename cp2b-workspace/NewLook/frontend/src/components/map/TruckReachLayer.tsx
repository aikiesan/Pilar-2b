'use client';

/**
 * Truck reach, on the map: the sites as small symbols (shape and colour by
 * kind), and for the picked site its route tree growing on one truck clock
 * (lib/truckReach.ts): 90 minutes in about 2.6 s, shared roads first, each
 * town getting its dot as the truck gets there, the pipeline route dotted to
 * a ring on the pipeline.
 *
 * Panes, all between the infrastructure (450) and the highlight (460):
 *   453  truck-towns   SVG: each town reached, filled in its band as the
 *                      truck gets there (quieter than the roads);
 *   455  truck-routes  one canvas for the tree (about 1,800 segments), redrawn
 *                      per frame while it grows and again after a pan or a
 *                      zoom, never 1,800 Leaflet polylines;
 *   456  truck-marks   SVG: the town dots, the pipeline ring, the 50 km circle
 *                      and the ring round the picked site;
 *   458  truck-sites   the site symbols, as Leaflet markers. Markers rather
 *                      than hit testing on a canvas: each is focusable and
 *                      opens with Enter, carries its name for a screen
 *                      reader, and Leaflet does the hit testing and tooltips.
 *
 * The other sites start dimmed and grow to full colour as the truck reaches
 * their town (a site's minutes are its town's: the routes end at town
 * centres). A change of limit recolours what is drawn, with no replay. With reduced
 * motion the whole tree is there at once.
 */
import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import { useMap } from 'react-leaflet';
import { centroidOf } from '@/lib/mapGeometry';
import { prefersReducedMotion } from '@/lib/mapMotion';
import {
  bandColor,
  frameSegments,
  minuteToDraw,
  siteArrivals,
  townShare,
  siteShape,
  treeSegments,
  truckPlayMs,
  TRUCK_CIRCLE_KM,
  TRUCK_SITE_COLORS,
  type TruckLimit,
  type TruckReachData,
  type TruckSite,
} from '@/lib/truckReach';
import type { MunicipalityFeature } from '@/types/geospatial';
import { useRendererCleanup } from './useRendererCleanup';

const TOWNS_PANE = 'truck-towns';
const ROUTES_PANE = 'truck-routes';
const MARKS_PANE = 'truck-marks';
const SITES_PANE = 'truck-sites';
const INK = '#1E3E4C';
const FAINT = '#93A3AB';
/** The transport pipeline's colour (InfrastructureLayer). */
const PIPELINE = '#FF6B35';
/** The map's fly to the state on load (ScopeViewController), with a margin. */
const OPENING_MOVE_MS = 900;

interface TruckReachLayerProps {
  sites: readonly TruckSite[];
  /** Whether a click on a site picks it (approved sign-in). */
  interactive: boolean;
  selected: string | null;
  /** The site the page's link named, framed on arrival whatever the view. */
  openedWith: string | null;
  data: TruckReachData | null;
  /** A site a row in the window points at: ringed, its name shown. */
  hovered: string | null;
  limit: TruckLimit;
  showCircle: boolean;
  /** Every municipality the map holds, for the town dots. */
  features: readonly MunicipalityFeature[];
  /** The site's name, kind and town, for its tooltip and screen reader name. */
  describe: (site: TruckSite) => string;
  onPick: (siteId: string) => void;
}

function ensurePane(map: L.Map, name: string, z: number, pointer = false): HTMLElement {
  const existing = map.getPane(name);
  if (existing) return existing;
  const pane = map.createPane(name);
  pane.style.zIndex = String(z);
  pane.style.pointerEvents = pointer ? 'auto' : 'none';
  return pane;
}

const SHAPES = {
  square: '<rect x="3" y="3" width="10" height="10" />',
  triangle: '<path d="M8 2.5 14 13.5H2Z" />',
  diamond: '<path d="M8 1.5 14.5 8 8 14.5 1.5 8Z" />',
} as const;

function siteIcon(site: TruckSite, picked: boolean): L.DivIcon {
  const size = picked ? 20 : 16;
  return L.divIcon({
    className: `truck-site${picked ? ' truck-site-picked' : ''}`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<svg viewBox="0 0 16 16" width="${size}" height="${size}" aria-hidden="true" focusable="false">`
      + `<g fill="${TRUCK_SITE_COLORS[site.kind]}" stroke="#FFFFFF" stroke-width="1.5" stroke-linejoin="round">${SHAPES[siteShape(site.kind)]}</g></svg>`,
  });
}

/** A div icon takes no alt: name the focusable element itself, as a button. */
function nameMarker(marker: L.Marker, label: string, picked: boolean): void {
  const el = marker.getElement();
  if (!el) return;
  el.setAttribute('role', 'button');
  el.setAttribute('aria-label', label);
  el.setAttribute('aria-pressed', String(picked));
}

export default function TruckReachLayer({
  sites, interactive, selected, openedWith, data, hovered, limit, showCircle, features, describe, onPick,
}: TruckReachLayerProps) {
  const map = useMap();
  const renderer = useMemo(() => {
    ensurePane(map, ROUTES_PANE, 455);
    ensurePane(map, MARKS_PANE, 456);
    ensurePane(map, SITES_PANE, 458, true);
    return L.svg({ pane: MARKS_PANE });
  }, [map]);
  const townRenderer = useMemo(() => {
    ensurePane(map, TOWNS_PANE, 453);
    return L.svg({ pane: TOWNS_PANE });
  }, [map]);
  useRendererCleanup(map, renderer);
  useRendererCleanup(map, townRenderer);

  // Handlers bound once per marker read the latest props here.
  const pickRef = useRef(onPick);
  const interactiveRef = useRef(interactive);
  useEffect(() => {
    pickRef.current = onPick;
    interactiveRef.current = interactive;
  }, [onPick, interactive]);

  // ── The site symbols ──
  const markersRef = useRef<Map<string, { marker: L.Marker; site: TruckSite; label: string }>>(new Map());
  const shownSelectedRef = useRef<string | null>(null);
  const selectedRef = useRef(selected);
  /**
   * Shows `selected` as the picked site. Restyles only the markers that
   * change, so the other sites keep their elements and a keyboard pick keeps
   * its focus (setIcon replaces the element: it is named again and given the
   * focus back).
   */
  const showSelected = (next: string | null) => {
    const markers = markersRef.current;
    const restyle = (id: string | null, picked: boolean) => {
      const entry = id ? markers.get(id) : undefined;
      if (!entry) return;
      const hadFocus = entry.marker.getElement() === document.activeElement;
      entry.marker.setIcon(siteIcon(entry.site, picked));
      entry.marker.setZIndexOffset(picked ? 1000 : 0);
      nameMarker(entry.marker, entry.label, picked);
      if (hadFocus) entry.marker.getElement()?.focus();
    };
    const previous = shownSelectedRef.current;
    if (previous !== next) restyle(previous, false);
    restyle(next, true);
    shownSelectedRef.current = next;
  };
  const showSelectedRef = useRef(showSelected);
  useEffect(() => {
    const byId = new Map<string, { marker: L.Marker; site: TruckSite; label: string }>();
    const markers = sites.map((site) => {
      const label = describe(site);
      const marker = L.marker([site.lat, site.lon], {
        pane: SITES_PANE,
        icon: siteIcon(site, false),
        keyboard: true,
        riseOnHover: true,
      });
      marker.bindTooltip(label, { direction: 'top', offset: [0, -8], className: 'truck-site-tip', opacity: 1 });
      marker.on('click', (e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
        if (interactiveRef.current) pickRef.current(site.site_id);
      });
      // Leaflet answers Enter on a marker only to open a popup: pick here, as
      // a button would, with Enter or Space.
      marker.on('keydown', (e: L.LeafletKeyboardEvent) => {
        const key = e.originalEvent.key;
        if (key !== 'Enter' && key !== ' ') return;
        e.originalEvent.preventDefault();
        if (interactiveRef.current) pickRef.current(site.site_id);
      });
      marker.addTo(map);
      nameMarker(marker, label, false);
      byId.set(site.site_id, { marker, site, label });
      return marker;
    });
    markersRef.current = byId;
    shownSelectedRef.current = null;
    showSelectedRef.current(selectedRef.current);
    return () => {
      for (const m of markers) m.remove();
      markersRef.current = new Map();
    };
  }, [map, sites, describe]);

  // ── The picked site ──
  useEffect(() => {
    selectedRef.current = selected;
    showSelectedRef.current(selected);
  }, [selected]);

  // ── The 50 km circle ──
  useEffect(() => {
    if (!showCircle || !data) return;
    const circle = L.circle([data.site.lat, data.site.lon], {
      radius: TRUCK_CIRCLE_KM * 1000,
      pane: MARKS_PANE,
      renderer,
      interactive: false,
      fill: false,
      color: INK,
      weight: 1.5,
      dashArray: '6 6',
    }).addTo(map);
    return () => {
      circle.remove();
    };
  }, [map, renderer, showCircle, data]);

  const byCode = useMemo(() => new Map(features.map((f) => [String(f.properties?.ibge_code), f])), [features]);
  const segments = useMemo(() => (data ? treeSegments(data.tree) : []), [data]);
  const pipelineSegments = useMemo(() => (data?.pipeline ? treeSegments(data.pipeline.tree) : []), [data]);
  const arrivals = useMemo(
    () => new Map((data ? siteArrivals(data, sites) : []).map((a) => [a.site.site_id, a.minutes])),
    [data, sites],
  );

  // ── The site a window row points at ──
  useEffect(() => {
    const entry = hovered ? markersRef.current.get(hovered) : undefined;
    if (!entry) return;
    const ring = L.circleMarker(entry.marker.getLatLng(), {
      radius: 13, pane: MARKS_PANE, renderer, interactive: false, color: INK, weight: 2.5, fill: false,
    }).addTo(map);
    entry.marker.openTooltip();
    return () => {
      ring.remove();
      entry.marker.closeTooltip();
    };
  }, [map, renderer, hovered]);

  // The limit, read by the drawing without replaying the clock.
  const limitRef = useRef(limit);
  const redrawRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    limitRef.current = limit;
    redrawRef.current?.();
  }, [limit]);

  // ── A site picked off screen (a shared link) is brought into view ──
  // Its whole tree is framed, clear of the window: a card on the right in
  // landscape, a bottom sheet over the lower half in portrait. A site clicked
  // on screen leaves the map where it is. On a fresh page the map's own
  // opening move (a 0.6 s fly to the state) would override the framing, so it
  // waits for that to settle.
  const mountedAtRef = useRef(0);
  const framedRef = useRef<string | null>(null);
  const openedWithRef = useRef(openedWith);
  useEffect(() => {
    mountedAtRef.current = performance.now();
  }, []);
  useEffect(() => {
    if (!data || framedRef.current === data.site.site_id) return;
    const frame = () => {
      framedRef.current = data.site.site_id;
      const size = map.getSize();
      const landscape = size.x > size.y;
      const topLeft = L.point(24, 72);
      const bottomRight = landscape ? L.point(372, 24) : L.point(24, Math.round(size.y * 0.55));
      const clear = L.bounds(topLeft, size.subtract(bottomRight));
      const fromLink = data.site.site_id === openedWithRef.current;
      if (!fromLink && clear.contains(map.latLngToContainerPoint([data.site.lat, data.site.lon]))) return;
      const points: L.LatLngTuple[] = [[data.site.lat, data.site.lon]];
      for (const s of segments) points.push(s.b);
      map.fitBounds(L.latLngBounds(points), {
        paddingTopLeft: topLeft,
        paddingBottomRight: bottomRight,
        maxZoom: 10,
        animate: !prefersReducedMotion(),
      });
    };
    const wait = Math.max(0, OPENING_MOVE_MS - (performance.now() - mountedAtRef.current));
    if (wait === 0) { frame(); return; }
    const timer = window.setTimeout(frame, wait);
    return () => window.clearTimeout(timer);
  }, [map, data, segments]);

  // ── The tree, the towns and the pipeline, on one clock ──
  useEffect(() => {
    if (!data) return;
    const reduced = prefersReducedMotion();
    const pane = ensurePane(map, ROUTES_PANE, 455);
    const canvas = L.DomUtil.create('canvas', 'truck-routes', pane) as HTMLCanvasElement;
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

    const layers: L.Layer[] = [];
    const ring = L.circleMarker([data.site.lat, data.site.lon], {
      radius: 11, pane: MARKS_PANE, renderer, interactive: false, color: INK, weight: 2, fill: false,
    }).addTo(map);
    layers.push(ring);

    const towns = data.towns
      .map((town) => {
        const c = centroidOf(byCode.get(town.ibge_code));
        if (!c) return null;
        const dot = L.circleMarker([c.lat, c.lng], {
          radius: 3.5, pane: MARKS_PANE, renderer, interactive: false,
          color: '#FFFFFF', weight: 1.5, opacity: 0, fillColor: INK, fillOpacity: 0,
        }).addTo(map);
        layers.push(dot);
        return { dot, minutes: town.minutes };
      })
      .filter(Boolean) as { dot: L.CircleMarker; minutes: number }[];

    // Each town reached, filled in its band as the truck gets there. Leaflet
    // hands the GeoJSON options to each polygon, renderer included; its types
    // list only the GeoJSON ones.
    const fillOptions: L.GeoJSONOptions & L.PathOptions = {
      pane: TOWNS_PANE, renderer: townRenderer, interactive: false,
      style: { stroke: true, weight: 1, opacity: 0, fill: true, fillOpacity: 0 },
    };
    const fills = data.towns
      .map((town) => {
        const feature = byCode.get(town.ibge_code);
        if (!feature) return null;
        const shape = L.geoJSON(feature, fillOptions).addTo(map);
        layers.push(shape);
        return { shape, minutes: town.minutes, key: '' };
      })
      .filter(Boolean) as { shape: L.GeoJSON; minutes: number; key: string }[];

    const pipe = data.pipeline;
    const pipeEnd = pipe
      ? L.circleMarker([pipe.lat, pipe.lon], {
        radius: 6, pane: MARKS_PANE, renderer, interactive: false, color: PIPELINE, weight: 2.5, opacity: 0, fill: false,
      }).addTo(map)
      : null;
    if (pipeEnd) layers.push(pipeEnd);

    let minute = minuteToDraw(0, reduced);
    let zooming = false;

    const draw = () => {
      const l = limitRef.current;
      for (const t of towns) {
        const shown = minute >= t.minutes;
        const within = t.minutes <= l;
        t.dot.setStyle({
          opacity: shown ? 1 : 0,
          fillOpacity: shown ? (within ? 1 : 0.55) : 0,
          fillColor: within ? INK : FAINT,
        });
      }
      if (pipeEnd && pipe) pipeEnd.setStyle({ opacity: minute >= pipe.minutes ? 1 : 0 });
      for (const f of fills) {
        const share = Math.round(townShare(f.minutes, minute) * 20) / 20;
        const within = f.minutes <= l;
        const key = `${share}|${within}`;
        if (key === f.key) continue;
        f.key = key;
        const band = bandColor(f.minutes, l);
        f.shape.setStyle(within
          ? { color: band, weight: 1, opacity: 0.85 * share, fillColor: band, fillOpacity: 0.4 * share }
          : { color: FAINT, weight: 0.75, opacity: 0.6 * share, fillOpacity: 0 });
      }
      // The other sites: dimmed until the truck reaches their town within
      // the limit, then grown to full colour. The picked one stays as it is.
      for (const [id, entry] of markersRef.current) {
        const el = entry.marker.getElement();
        if (!el) continue;
        const at = arrivals.get(id);
        const state = id === data.site.site_id ? '' : at !== undefined && at <= l && minute >= at ? 'reached' : 'dim';
        if (el.dataset.reach === state) continue;
        el.dataset.reach = state;
        el.classList.toggle('truck-site-reached', state === 'reached');
        el.classList.toggle('truck-site-dim', state === 'dim');
      }
      if (!ctx || zooming) return;
      L.DomUtil.setPosition(canvas, map.containerPointToLayerPoint([0, 0]));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const s = map.getSize();
      ctx.clearRect(0, 0, s.x, s.y);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      // One path per colour; the faint roads first, under the bands.
      const drawn = frameSegments(segments, minute, l);
      const groups = new Map<string, typeof drawn>();
      for (const d of drawn) {
        const g = groups.get(d.color);
        if (g) g.push(d); else groups.set(d.color, [d]);
      }
      const order = [...groups.keys()].sort((a, b) => Number(groups.get(b)![0].beyond) - Number(groups.get(a)![0].beyond));
      for (const color of order) {
        const g = groups.get(color)!;
        ctx.strokeStyle = color;
        ctx.lineWidth = g[0].beyond ? 1.5 : 2.5;
        ctx.globalAlpha = g[0].beyond ? 0.9 : 1;
        ctx.beginPath();
        for (const d of g) {
          const a = map.latLngToContainerPoint(d.a);
          const b = map.latLngToContainerPoint(d.b);
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
        }
        ctx.stroke();
      }
      // The pipeline route, dotted, on the same clock.
      const pipeDrawn = frameSegments(pipelineSegments, minute, 90);
      if (pipeDrawn.length) {
        ctx.globalAlpha = 1;
        ctx.strokeStyle = PIPELINE;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([1, 5]);
        ctx.beginPath();
        for (const d of pipeDrawn) {
          const a = map.latLngToContainerPoint(d.a);
          const b = map.latLngToContainerPoint(d.b);
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }
    };
    redrawRef.current = draw;

    const onZoomStart = () => {
      zooming = true;
      canvas.style.visibility = 'hidden';
    };
    const onZoomEnd = () => {
      zooming = false;
      canvas.style.visibility = '';
      draw();
    };
    const onResize = () => {
      size();
      draw();
    };
    map.on('zoomstart', onZoomStart);
    map.on('zoomend', onZoomEnd);
    map.on('move', draw);
    map.on('resize', onResize);

    let frame = 0;
    if (reduced) {
      draw();
    } else {
      const total = truckPlayMs(data);
      const t0 = performance.now();
      const step = (now: number) => {
        const t = now - t0;
        minute = t >= total ? Infinity : minuteToDraw(t, false);
        draw();
        if (t < total) frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    }

    return () => {
      cancelAnimationFrame(frame);
      redrawRef.current = null;
      map.off('zoomstart', onZoomStart);
      map.off('zoomend', onZoomEnd);
      map.off('move', draw);
      map.off('resize', onResize);
      canvas.remove();
      for (const l of layers) l.remove();
      for (const entry of markersRef.current.values()) {
        const el = entry.marker.getElement();
        if (!el) continue;
        delete el.dataset.reach;
        el.classList.remove('truck-site-reached', 'truck-site-dim');
      }
    };
  }, [map, renderer, townRenderer, data, segments, pipelineSegments, byCode, arrivals]);

  return null;
}

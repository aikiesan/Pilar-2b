/**
 * PILAR-2b — GeoServer demo map (ISOLATED EXAMPLE)
 * -----------------------------------------------------------------------------
 * A minimal Leaflet map that overlays a GeoServer WMS layer on top of an
 * OpenStreetMap base. Used only by the /geoserver-demo page to prove the
 * end-to-end GeoServer integration. Not wired into the production map.
 *
 * Must render client-side only (Leaflet needs window) — the page imports this
 * via next/dynamic with { ssr: false }.
 */
'use client';

import React, { useState } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import GeoServerWMSLayer from './GeoServerWMSLayer';

// Center on São Paulo state.
const SP_CENTER: [number, number] = [-22.5, -48.5];

// Layers published by scripts/geoserver/provision_geoserver.py (workspace cp2b).
const DEMO_LAYERS = [
  { id: 'cp2b:municipalities', label: 'Municipalities (biogas potential)' },
  { id: 'cp2b:biogas_plants', label: 'Biogas plants' },
  { id: 'cp2b:gas_pipelines', label: 'Gas pipelines' },
];

export default function GeoServerDemoMap() {
  const [active, setActive] = useState<string>(DEMO_LAYERS[0].id);
  const [opacity, setOpacity] = useState<number>(0.7);

  return (
    <div className="w-full h-full relative">
      {/* Simple control — pick which GeoServer WMS layer to overlay. */}
      <div className="absolute top-3 right-3 z-[1000] bg-white/95 rounded-md shadow p-3 text-sm space-y-2">
        <label htmlFor="gs-layer" className="block font-medium text-gray-700">
          GeoServer WMS layer
        </label>
        <select
          id="gs-layer"
          value={active}
          onChange={(e) => setActive(e.target.value)}
          className="border rounded px-2 py-1 w-56"
        >
          {DEMO_LAYERS.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
        <label htmlFor="gs-opacity" className="block font-medium text-gray-700">
          Opacity: {opacity.toFixed(2)}
        </label>
        <input
          id="gs-opacity"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={opacity}
          onChange={(e) => setOpacity(parseFloat(e.target.value))}
          className="w-56"
        />
      </div>

      <MapContainer
        center={SP_CENTER}
        zoom={7}
        scrollWheelZoom
        className="w-full h-full"
        style={{ minHeight: 480 }}
      >
        {/* OSM base layer */}
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {/* GeoServer overlay — re-mounts when the selected layer changes. */}
        <GeoServerWMSLayer key={active} layers={active} opacity={opacity} />
      </MapContainer>
    </div>
  );
}

/**
 * PILAR-2b — GeoServer WMS layer (ISOLATED EXAMPLE)
 * -----------------------------------------------------------------------------
 * Minimal, self-contained example of consuming a GeoServer WMS layer from the
 * existing Leaflet / react-leaflet stack. This is an *additive demo* — it does
 * NOT touch the production map logic in MapComponent.tsx.
 *
 * It wraps react-leaflet's <WMSTileLayer>. GeoServer serves OGC-standard WMS, so
 * no custom client code is needed beyond pointing at the workspace WMS endpoint.
 *
 * Env: set NEXT_PUBLIC_GEOSERVER_URL to the public GeoServer base, e.g.
 *   local:       http://localhost:8080/geoserver
 *   production:  https://cp2b.unicamp.br/pilar2b/geoserver
 */
'use client';

import React from 'react';
import { WMSTileLayer } from 'react-leaflet';

const GEOSERVER_URL =
  process.env.NEXT_PUBLIC_GEOSERVER_URL || 'http://localhost:8080/geoserver';

export interface GeoServerWMSLayerProps {
  /** Workspace:layer name as published in GeoServer, e.g. "cp2b:municipalities". */
  layers: string;
  /** GeoServer workspace used to build the WMS endpoint (default: "cp2b"). */
  workspace?: string;
  /** Layer opacity 0–1. */
  opacity?: number;
  /** Optional named SLD style registered in GeoServer. */
  styles?: string;
  /** WMS version. 1.3.0 is the modern default; 1.1.1 if you hit axis-order issues. */
  version?: '1.3.0' | '1.1.1';
}

/**
 * Render a single GeoServer WMS layer. Drop it inside a react-leaflet
 * <MapContainer> (see GeoServerDemoMap.tsx).
 */
export default function GeoServerWMSLayer({
  layers,
  workspace = 'cp2b',
  opacity = 0.7,
  styles = '',
  version = '1.3.0',
}: GeoServerWMSLayerProps) {
  // Per-workspace WMS endpoint, e.g. http://localhost:8080/geoserver/cp2b/wms
  const wmsUrl = `${GEOSERVER_URL}/${workspace}/wms`;

  return (
    <WMSTileLayer
      url={wmsUrl}
      layers={layers}
      styles={styles}
      format="image/png"
      transparent
      version={version}
      opacity={opacity}
      // Identify the request source in GeoServer logs.
      attribution='&copy; CP2B / NIPE–UNICAMP · served via GeoServer'
    />
  );
}

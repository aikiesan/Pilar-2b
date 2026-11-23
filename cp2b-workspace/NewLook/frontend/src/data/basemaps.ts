/**
 * Basemap tile sources for the map page.
 *
 * Three options, deliberately no dark canvas (product decision). Each is a free,
 * attribution-only raster source that needs no API key, so nothing here touches
 * the build or requires a token:
 *   - mapa      OpenStreetMap standard        (streets; the default)
 *   - satelite  Esri World Imagery            (aerial/satellite, + place labels)
 *   - terreno   OpenTopoMap                   (shaded relief + contours)
 *
 * No CARTO: its basemaps.cartocdn.com tiles now answer every request without
 * a key with an "API KEY REQUIRED" image, so the "light canvas" option and its
 * default covered the map with that watermark. basemaps.test.ts refuses any
 * provider that needs a key.
 *
 * `labelsUrl` is a labels-only overlay (place names, borders) drawn above the
 * choropleth, in its own pane. Only satellite has one: its imagery carries no
 * names. OpenStreetMap and OpenTopoMap print their own, and the municipality
 * fill is see-through, so they show under it; a second set from another source
 * lands a few pixels off and every town reads twice.
 */

export type BasemapId = 'mapa' | 'satelite' | 'terreno';

/** A basemap's name is copy: it lives in messages under Map.basemaps.<id>. */
export interface Basemap {
  id: BasemapId;
  icon: string;
  url: string;
  attribution: string;
  maxZoom: number;
  /** Labels-only overlay (names, borders) above the choropleth, for a base without names of its own. */
  labelsUrl?: string;
}

export const BASEMAPS: Record<BasemapId, Basemap> = {
  mapa: {
    id: 'mapa',
    icon: '🗺️',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  },
  satelite: {
    id: 'satelite',
    icon: '🛰️',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    maxZoom: 19,
    labelsUrl:
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
  },
  terreno: {
    id: 'terreno',
    icon: '⛰️',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution:
      'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM | Style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
    maxZoom: 17,
  },
};

export const BASEMAP_ORDER: BasemapId[] = ['mapa', 'satelite', 'terreno'];

export const DEFAULT_BASEMAP: BasemapId = 'mapa';

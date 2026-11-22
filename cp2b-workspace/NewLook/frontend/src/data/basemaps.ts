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
 * `labelsUrl` is a labels-only overlay (place names, borders) that the map draws
 * ABOVE the choropleth, in its own pane: the base tiles carry their own names,
 * but those sit under the municipality fill and can't be read once it is on.
 * Esri's light-gray reference (dark text, white halo) reads on any fill colour;
 * satellite keeps Esri's imagery reference, which it always needed for names.
 */

const LIGHT_LABELS =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}';
const LABELS_ATTRIBUTION = 'Labels &copy; Esri';

export type BasemapId = 'mapa' | 'satelite' | 'terreno';

/** A basemap's name is copy: it lives in messages under Map.basemaps.<id>. */
export interface Basemap {
  id: BasemapId;
  icon: string;
  url: string;
  attribution: string;
  maxZoom: number;
  /** Labels-only overlay (names, borders), drawn above the choropleth. */
  labelsUrl: string;
}

export const BASEMAPS: Record<BasemapId, Basemap> = {
  mapa: {
    id: 'mapa',
    icon: '🗺️',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      `&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · ${LABELS_ATTRIBUTION}`,
    maxZoom: 19,
    labelsUrl: LIGHT_LABELS,
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
      'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM | Style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA) · ' +
      LABELS_ATTRIBUTION,
    maxZoom: 17,
    labelsUrl: LIGHT_LABELS,
  },
};

export const BASEMAP_ORDER: BasemapId[] = ['mapa', 'satelite', 'terreno'];

export const DEFAULT_BASEMAP: BasemapId = 'mapa';

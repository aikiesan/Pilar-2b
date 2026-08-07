/**
 * Basemap tile sources for the map page.
 *
 * Four options, deliberately no dark canvas (product decision). Each is a free,
 * attribution-only raster source that needs no API key, so nothing here touches
 * the build or requires a token:
 *   - mapa      OpenStreetMap standard        (streets, the current default)
 *   - satelite  Esri World Imagery            (aerial/satellite, + place labels)
 *   - terreno   OpenTopoMap                   (shaded relief + contours)
 *   - light     CARTO Positron                (muted light canvas, best for
 *                                              reading the choropleth on top)
 *
 * `refUrl` is an optional label/boundary overlay drawn ON TOP of the base — only
 * satellite needs it, because imagery alone carries no municipality names.
 */

export type BasemapId = 'mapa' | 'satelite' | 'terreno' | 'light';

export interface Basemap {
  id: BasemapId;
  label: string;
  icon: string;
  url: string;
  attribution: string;
  maxZoom: number;
  /** Optional reference overlay (labels/boundaries) drawn above the base tiles. */
  refUrl?: string;
}

export const BASEMAPS: Record<BasemapId, Basemap> = {
  mapa: {
    id: 'mapa',
    label: 'Mapa',
    icon: '🗺️',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  },
  satelite: {
    id: 'satelite',
    label: 'Satélite',
    icon: '🛰️',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    maxZoom: 19,
    refUrl:
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
  },
  terreno: {
    id: 'terreno',
    label: 'Terreno',
    icon: '⛰️',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution:
      'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM | Style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
    maxZoom: 17,
  },
  light: {
    id: 'light',
    label: 'Light Canvas',
    icon: '🔆',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20,
  },
};

export const BASEMAP_ORDER: BasemapId[] = ['mapa', 'satelite', 'terreno', 'light'];

export const DEFAULT_BASEMAP: BasemapId = 'mapa';

/**
 * PILAR-2b V3 - Main Map Component
 * Full-page React Leaflet map with floating panels (DBFZ-inspired)
 * Mobile: QuickFilterBar + MobileBottomSheet replace floating panels
 * Desktop: EnhancedTooltip, ProfilePanel, Comparison, Export
 * All: URL query-param state so filters can be shared/bookmarked
 */

'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { MapContainer, TileLayer, ScaleControl, ZoomControl, useMap } from 'react-leaflet';
import dynamic from 'next/dynamic';
import { useGeospatialData, useCodigestionClusters, useResidueCNMatrix, useIntermediateRegionsGeoJSON } from '@/hooks/useGeospatialData';
import { useCnProfiles } from '@/hooks/useCnProfiles';
import type { FilterCriteria } from '@/components/dashboard/FilterPanel';
import type { MunicipalityCollection, MunicipalityFeature, DisplayMetric, CodigestionCluster } from '@/types/geospatial';
import { MAP_SCENARIOS, DEFAULT_MAP_SCENARIO, applyScenarioToProps, type MapScenarioKey } from '@/data/scenarioFactors';
import { DISPLAY_METRICS, getMetricSpec, computeAdaptiveBreaks, DEFAULT_MAP_PALETTE } from '@/lib/mapMetrics';
import { setMapPalette } from '@/hooks/useMapPalette';
import { hasAnySelectedResidue } from '@/lib/mapValues';
import { BASEMAPS, DEFAULT_BASEMAP, type BasemapId } from '@/data/basemaps';
import type { ThematicPreset } from '@/data/thematicPresets';
import { DATA_EXPORT_ENABLED } from '@/lib/featureFlags';
import { isSaoPaulo, NATIONAL_BETA_LAYER_ID, SP_MUNICIPALITY_COUNT } from '@/lib/mapScope';
import type { BiomassType, ResidueType } from './FloatingControlPanel';
import type { VisualizationMode } from './LeftFilterPanel';
import { type ColorMode } from '@/types/geospatial';
import type { InfrastructureLayerStatus, NationalLayer } from './InfrastructureLayer';
import {
  BRAZIL_STATES,
  SAO_PAULO_UF,
  SCOPE_BRAZIL,
  getState,
  scopeView,
  scopeHasResidueBreakdown,
  ufOf,
  type MapScope,
} from '@/data/brazilStates';
import ScopeSwitcher from './ScopeSwitcher';
import MapLegend from './MapLegend';
import MapLoadingSkeleton from './MapLoadingSkeleton';
import { isPlantLayer } from '@/lib/plantLayers';
import 'leaflet/dist/leaflet.css';
import '@/lib/leafletConfig';

const MAP_CONTAINER_STYLE = { height: '100%', width: '100%' } as const;

// Recenters the Leaflet map when the scope (SP / state / Brazil) changes.
// MapContainer's `center`/`zoom` props apply only on mount, so scope changes
// need an imperative flyTo via the map instance.
function ScopeViewController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    // Phone screens need more geographic context than the desktop canvas.
    // Start one level wider so the first gesture can be a pan, not an escape.
    const isMobile = typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(max-width: 767px)').matches;
    map.flyTo(center, isMobile ? Math.max(zoom - 1, 3) : zoom, { duration: 0.6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center[0], center[1], zoom]);
  return null;
}

// Creates a dedicated Leaflet pane so infrastructure (pipelines, highways,
// plants, substations, protected areas…) draws ABOVE the municipality
// choropleth. That choropleth is a canvas in the default overlayPane (z 400) and
// infra lines/polygons are SVG in the same pane, so without a higher pane they
// were buried under the fill. z 450 clears the choropleth; markers keep their
// own higher pane, so points stay on top of the infra lines too.
function InfraPane() {
  const map = useMap();
  useEffect(() => {
    if (!map.getPane('infrastructure')) {
      const p = map.createPane('infrastructure');
      p.style.zIndex = '450';
    }
  }, [map]);
  return null;
}

// Dynamically import components to avoid SSR issues
const MunicipalityLayer = dynamic(() => import('./MunicipalityLayer'), { ssr: false });
const InfrastructureLayer = dynamic(() => import('./InfrastructureLayer'), { ssr: false });
const HeatmapLayer = dynamic(() => import('./HeatmapLayer'), { ssr: false });
const MapBiomasLayer = dynamic(() => import('./MapBiomasLayer'), { ssr: false });
const MapBiomasLegend = dynamic(() => import('./MapBiomasLegend'), { ssr: false });
const BiomassLayerLegend = dynamic(() => import('./BiomassLayerLegend'), { ssr: false });
const HeatmapLegend = dynamic(() => import('./HeatmapLegend'), { ssr: false });
const MobileBottomSheet = dynamic(() => import('./MobileBottomSheet'), { ssr: false });

// Desktop left panel (replaces bottom drawer with compact vertical control)
const DesktopLeftPanel = dynamic(() => import('./DesktopLeftPanel'), { ssr: false });

// Map chrome overlays (basemap switcher + compass)
const BasemapControl = dynamic(() => import('./BasemapControl'), { ssr: false });
const NorthArrow = dynamic(() => import('./NorthArrow'), { ssr: false });
const ThematicMapBar = dynamic(() => import('./ThematicMapBar'), { ssr: false });

// Profile + Tooltip overlays
const MunicipalityProfilePanel = dynamic(() => import('./MunicipalityProfilePanel'), { ssr: false });
const EnhancedTooltip = dynamic(() => import('./EnhancedTooltip'), { ssr: false });

// Modals
const ComparisonPanel = dynamic(() => import('./ComparisonPanel'), { ssr: false });
const ExportControl = dynamic(() => import('./ExportControl'), { ssr: false });

// Visualization layers
const BubbleChartLayer = dynamic(() => import('./BubbleChartLayer'), { ssr: false });

// Co-digestion clustering layers
const CodigestionClusterLayer = dynamic(() => import('./CodigestionClusterLayer'), { ssr: false });
const CodigestionDetailPanel = dynamic(() => import('./CodigestionDetailPanel'), { ssr: false });
const CnChoroLayer = dynamic(() => import('./CnChoroLayer'), { ssr: false });
const IntermediateRegionBoundaryLayer = dynamic(
  () => import('./IntermediateRegionBoundaryLayer'),
  { ssr: false }
);
const IntermediateRegionsMapLayer = dynamic(
  () => import('./IntermediateRegionsMapLayer'),
  { ssr: false }
);

// Parse the ?scope= URL param into a scope value (a UF code or SCOPE_BRAZIL).
// Accepts legacy 'brazil'/'sp', a 2-digit UF code ('41'), or a sigla ('PR').
function parseScopeParam(raw: string | null): MapScope {
  if (!raw) return SAO_PAULO_UF;
  const v = raw.trim().toLowerCase();
  if (v === 'brazil' || v === 'br' || v === 'todos') return SCOPE_BRAZIL;
  if (v === 'sp') return SAO_PAULO_UF;
  if (/^\d{2}$/.test(v) && getState(v)) return v;
  const bySigla = BRAZIL_STATES.find((s) => s.sigla.toLowerCase() === v);
  if (bySigla) return bySigla.code;
  return SAO_PAULO_UF;
}

// National PostGIS layers and how each is filtered server-side.
//
// `uf` where the source ships a real two-letter code; `bbox` for the lines and
// polygons whose uf the loader leaves NULL by design, because they cross state
// borders and pinning them to one would be a lie. Neither is cosmetic: without
// a filter the paved state highways are 23,332 features nationally instead of
// the 6,164 São Paulo needs.
//
// Everything here is off by default and fetched only when toggled, so none of
// it touches the first paint. Measured over gzip with the São Paulo bbox:
// gas nodes ~5 KB total, protected areas 138 KB, settlements 82 KB, state
// highways 261 KB — the heaviest single layer, and only if asked for.
const SP_BBOX_PARAM = '-53.2,-25.4,-44.1,-19.7';

const NATIONAL_INFRA_LAYERS: {
  id: NationalLayer;
  uf?: string;
  bbox?: string;
}[] = [
  { id: 'biogas_plant' },
  { id: 'ethanol_plant' },
  { id: 'biomass_thermal_plant' },
  { id: 'biodiesel_plant' },
  { id: 'slaughterhouse' },
  { id: 'substation' },
  { id: 'transmission_line' },
  { id: 'gas_pipeline_transport' },
  { id: 'gas_pipeline_distribution' },
  { id: 'gas_delivery_point', uf: 'SP' },
  { id: 'compression_station', uf: 'SP' },
  { id: 'gas_processing_unit', uf: 'SP' },
  { id: 'settlement', uf: 'SP' },
  { id: 'gas_pipeline_outflow', bbox: SP_BBOX_PARAM },
  { id: 'protected_area_state', bbox: SP_BBOX_PARAM },
  { id: 'indigenous_territory', bbox: SP_BBOX_PARAM },
  { id: 'highway_state', bbox: SP_BBOX_PARAM },
  { id: 'highway_federal', bbox: SP_BBOX_PARAM },
];

// Valid residue values for URL parsing
const VALID_RESIDUES: ResidueType[] = [
  'sugarcane', 'soybean', 'corn', 'coffee', 'citrus',
  'cattle', 'swine', 'poultry', 'aquaculture', 'rsu', 'rpo',
];
const VALID_BIOMASS: BiomassType[] = ['total', 'agricultural', 'livestock', 'urban'];
const VALID_VIZ: VisualizationMode[] = ['choropleth', 'heatmap', 'bubble', 'clusters'];
const VALID_METRICS: DisplayMetric[] = DISPLAY_METRICS;

interface MapComponentProps {
  activeFilters?: FilterCriteria;
  biomassType?: BiomassType;
  onBiomassTypeChange?: (type: BiomassType) => void;
  opacity?: number;
  onOpacityChange?: (opacity: number) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export default function MapComponent({
  activeFilters,
  biomassType: propBiomassType = 'total',
  onBiomassTypeChange,
  opacity: propOpacity = 0.7,
  onOpacityChange,
  searchQuery: propSearchQuery = '',
  onSearchChange,
}: MapComponentProps = {}) {
  const t = useTranslations('Map');
  const { data, loading, error } = useGeospatialData();

  // ── URL state sync (client-only, safe since ssr:false) ─────────────────────
  const readURLParam = (key: string): string | null => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get(key);
  };

  const urlMode = readURLParam('mode');
  const urlType = readURLParam('type');
  const urlResidues = readURLParam('r');
  const urlQuery = readURLParam('q');
  const urlMetric = readURLParam('metric');
  const urlScope = readURLParam('scope'); // 'brazil' → national view

  const initialMode: VisualizationMode =
    VALID_VIZ.includes(urlMode as VisualizationMode) ? (urlMode as VisualizationMode) : 'choropleth';

  // visualizationMode must be declared before useCodigestionClusters uses it
  const [visualizationMode, setVisualizationMode] = useState<VisualizationMode>(initialMode);

  const { data: clusterData, loading: clusterLoading } = useCodigestionClusters({
    radiusKm: 30,
    minBiomass: 1000,
    enabled: visualizationMode === 'clusters',
  });
  const { data: cnMatrix } = useResidueCNMatrix();
  // Separate state so we can pass it to the hook before visibleLayerIds is computed
  const [intermediateRegionsEnabled, setIntermediateRegionsEnabled] = useState(false);
  const { data: intermediateRegionsGeoJSON } = useIntermediateRegionsGeoJSON({
    enrich: true,
    enabled: intermediateRegionsEnabled,
  });
  const [isMounted, setIsMounted] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [layersRendered, setLayersRendered] = useState(0);

  const initialBiomass: BiomassType =
    VALID_BIOMASS.includes(urlType as BiomassType) ? (urlType as BiomassType) : propBiomassType;
  const initialResidues: ResidueType[] = urlResidues
    ? urlResidues.split(',').filter(r => VALID_RESIDUES.includes(r as ResidueType)) as ResidueType[]
    : [];
  const initialQuery = urlQuery ?? propSearchQuery;
  const initialMetric: DisplayMetric =
    VALID_METRICS.includes(urlMetric as DisplayMetric) ? (urlMetric as DisplayMetric) : 'biomass_tons';

  // Local state (authoritative)
  const [selectedResidues, setSelectedResidues] = useState<ResidueType[]>(initialResidues);
  const [biomassType, setBiomassType] = useState<BiomassType>(initialBiomass);
  const [searchQuery, setSearchQuery] = useState<string>(initialQuery);
  const [opacity, setOpacity] = useState<number>(propOpacity);
  const [displayMetric, setDisplayMetric] = useState<DisplayMetric>(initialMetric);
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
  const [showClusterPanel, setShowClusterPanel] = useState(false);
  const [colorMode, setColorMode] = useState<ColorMode>('biogas');
  const [mapScenario, setMapScenario] = useState<MapScenarioKey>(DEFAULT_MAP_SCENARIO);
  // Basemap tile source (Mapa / Satélite / Terreno / Light) and the last-applied
  // thematic preset (for highlighting; cleared the moment a filter is touched).
  const [basemap, setBasemap] = useState<BasemapId>(DEFAULT_BASEMAP);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  // The on-map thematic ribbon starts visible (that's the point — it invites
  // exploration); users can collapse it to reclaim the strip.
  const [thematicBarCollapsed, setThematicBarCollapsed] = useState(false);

  // Daltonic (colour-vision-deficiency) mode: swaps the choropleth ramp for a
  // CVD-safe single-hue palette. Persisted in localStorage like the theme.
  const [daltonic, setDaltonic] = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem('pilar2b-daltonic') === 'true') setDaltonic(true);
    } catch {
      /* localStorage unavailable (SSR / privacy mode) */
    }
  }, []);
  const toggleDaltonic = () => {
    setDaltonic((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('pilar2b-daltonic', String(next));
      } catch {
        /* ignore persist failure */
      }
      return next;
    });
  };

  const { profilesMap: cnProfilesMap, isLoading: cnLoading } = useCnProfiles(colorMode === 'cn_profile');
  const [scope, setScope] = useState<MapScope>(parseScopeParam(urlScope));

  const { center: mapCenter, zoom: mapZoom } = scopeView(scope);
  const residueBreakdownAvailable = scopeHasResidueBreakdown(scope);

  // ── Enhanced interaction state (Phase 2+3) ────────────────────────────────
  const [selectedMunicipality, setSelectedMunicipality] = useState<MunicipalityFeature | null>(null);
  const [hoveredMunicipality, setHoveredMunicipality] = useState<MunicipalityFeature | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [comparisonMunicipalities, setComparisonMunicipalities] = useState<MunicipalityFeature[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [showExport, setShowExport] = useState(false);

  // Write URL whenever filter state changes
  const syncURL = useCallback((
    mode: VisualizationMode,
    type: BiomassType,
    residues: ResidueType[],
    query: string,
    metric: DisplayMetric,
  ) => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    params.set('mode', mode);
    if (type !== 'total') params.set('type', type); else params.delete('type');
    if (residues.length > 0) params.set('r', residues.join(',')); else params.delete('r');
    if (query) params.set('q', query); else params.delete('q');
    if (metric !== 'biomass_tons') params.set('metric', metric); else params.delete('metric');
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
  }, []);

  const handleScopeChange = useCallback((next: MapScope) => {
    setScope(next);
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (next === SAO_PAULO_UF) params.delete('scope');
      else params.set('scope', next === SCOPE_BRAZIL ? 'brazil' : next);
      window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
    }
  }, []);

  const handleVisualizationModeChange = (mode: VisualizationMode) => {
    setVisualizationMode(mode);
    setActivePresetId(null);
    if (mode !== 'clusters') { setShowClusterPanel(false); setSelectedClusterId(null); }
    syncURL(mode, biomassType, selectedResidues, searchQuery, displayMetric);
  };

  const handleDisplayMetricChange = (metric: DisplayMetric) => {
    setDisplayMetric(metric);
    setActivePresetId(null);
    syncURL(visualizationMode, biomassType, selectedResidues, searchQuery, metric);
  };

  const handleBiomassTypeChange = (type: BiomassType) => {
    setBiomassType(type);
    setActivePresetId(null);
    onBiomassTypeChange?.(type);
    syncURL(visualizationMode, type, selectedResidues, searchQuery, displayMetric);
  };

  const handleResiduesChange = (residues: ResidueType[]) => {
    setSelectedResidues(residues);
    setActivePresetId(null);
    syncURL(visualizationMode, biomassType, residues, searchQuery, displayMetric);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    onSearchChange?.(query);
    syncURL(visualizationMode, biomassType, selectedResidues, query, displayMetric);
  };

  const handleOpacityChange = (val: number) => {
    setOpacity(val);
    onOpacityChange?.(val);
  };

  // ── Municipality interaction callbacks (Phase 2) ──────────────────────────
  const handleMunicipalityClick = useCallback((feature: MunicipalityFeature) => {
    setSelectedMunicipality(feature);
  }, []);

  const handleMunicipalityHover = useCallback((feature: MunicipalityFeature | null, e?: MouseEvent) => {
    setHoveredMunicipality(feature);
    if (e) setMousePosition({ x: e.clientX, y: e.clientY });
  }, []);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Escape') { setSelectedMunicipality(null); return; }
      if (e.key === 'c' || e.key === 'C') { setShowComparison(true); return; }
      if (e.key === 'e' || e.key === 'E') {
        if (DATA_EXPORT_ENABLED) setShowExport(true);
        return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── Comparison callbacks (Phase 3) ────────────────────────────────────────
  const handleAddToComparison = useCallback((feature: MunicipalityFeature) => {
    setComparisonMunicipalities(prev => {
      if (prev.length >= 4) return prev;
      if (prev.some(m => m.properties.ibge_code === feature.properties.ibge_code)) return prev;
      return [...prev, feature];
    });
  }, []);

  const handleRemoveFromComparison = useCallback((id: number) => {
    setComparisonMunicipalities(prev => prev.filter(m => m.properties.id !== id));
  }, []);

  // ── Layer state ─────────────────────────────────────────────────────────────
  // Snake_case ids are national PostGIS layers (migration 023, MapBiomas 10.1);
  // hyphenated ids are the remaining São Paulo shapefile layers. The national
  // layers supersede their SP counterparts (they cover SP too — e.g. 51 of the
  // 543 biogas plants are in SP), so the SP versions of plants/substations/
  // transmission/pipelines are retired here rather than listed twice.
  // ETEs and Rodovias stay SP-only: there is no national equivalent loaded yet.
  const [layers, setLayers] = useState([
    { id: 'municipalities', name: 'Municípios de São Paulo', visible: true, icon: '📍' },
    // The rest of Brazil is a SEPARATE, subordinate layer — same GeoJSON
    // request, different confidence. On by default (it is already in
    // production and removing it silently would be a regression), but drawn
    // as flat grey context so São Paulo owns the choropleth. See lib/mapScope.
    { id: NATIONAL_BETA_LAYER_ID, name: 'Demais municípios do Brasil (BETA)', visible: true, icon: '🧪' },
    { id: 'intermediate-regions', name: 'Regiões Intermediárias (IBGE)', visible: false, icon: '🗺️' },
    { id: 'mapbiomas', name: 'MapBiomas 2024', visible: false, icon: '🌳' },
    { id: 'biogas_plant', name: 'Usinas de Biogás (MapBiomas, BR)', visible: false, icon: '🏭' },
    { id: 'ethanol_plant', name: 'Usinas de Etanol (MapBiomas, BR)', visible: false, icon: '🌾' },
    { id: 'biomass_thermal_plant', name: 'UTEs a Biomassa (MapBiomas, BR)', visible: false, icon: '🔥' },
    { id: 'biodiesel_plant', name: 'Usinas de Biodiesel (MapBiomas, BR)', visible: false, icon: '🛢️' },
    { id: 'slaughterhouse', name: 'Frigoríficos (MapBiomas, BR)', visible: false, icon: '🥩' },
    { id: 'substation', name: 'Subestações (MapBiomas, BR)', visible: false, icon: '⚡' },
    { id: 'transmission_line', name: 'Linhas de Transmissão (MapBiomas, BR)', visible: false, icon: '🔌' },
    { id: 'gas_pipeline_transport', name: 'Gasodutos de Transporte (MapBiomas, BR)', visible: false, icon: '🔧' },
    { id: 'gas_pipeline_distribution', name: 'Gasodutos de Distribuição (MapBiomas, BR)', visible: false, icon: '🔩' },
    { id: 'gas_delivery_point', name: 'Pontos de Entrega de Gás (MapBiomas, BR)', visible: false, icon: '🔷' },
    { id: 'compression_station', name: 'Estações de Compressão (MapBiomas, BR)', visible: false, icon: '🔶' },
    { id: 'gas_processing_unit', name: 'UPGNs (MapBiomas, BR)', visible: false, icon: '🔹' },
    { id: 'gas_pipeline_outflow', name: 'Gasodutos de Escoamento (MapBiomas, BR)', visible: false, icon: '🧵' },
    { id: 'protected_area_state', name: 'UCs de Proteção Integral (MapBiomas, BR)', visible: false, icon: '🌲' },
    { id: 'indigenous_territory', name: 'Terras Indígenas (MapBiomas, BR)', visible: false, icon: '🪶' },
    { id: 'settlement', name: 'Assentamentos (MapBiomas, BR)', visible: false, icon: '🏘️' },
    { id: 'highway_state', name: 'Rodovias Estaduais pavimentadas (MapBiomas, BR)', visible: false, icon: '🛣️' },
    { id: 'highway_federal', name: 'Rodovias Federais pavimentadas (MapBiomas, BR)', visible: false, icon: '🛤️' },
    { id: 'etes', name: 'ETEs (SNIS, 2023 — SP)', visible: false, icon: '💧' },
    { id: 'railways', name: 'Rodovias (EPE, 2023 — SP)', visible: false, icon: '🛣️' },
  ]);
  const [infrastructureStatuses, setInfrastructureStatuses] = useState<Record<string, InfrastructureLayerStatus>>({});

  const [showMapBiomasLegend, setShowMapBiomasLegend] = useState(false);
  // No state for the plants legend: it is a pure function of which plant layers
  // are on (see visiblePlantLayerIds below). It used to be a boolean flipped
  // only by `biogas_plant`, so etanol / UTEs a biomassa / biodiesel drew markers
  // with nothing to decode them.
  // Mobile: the choropleth legend is collapsed to a chip by default and
  // expands on tap, so it doesn't crowd the small screen.
  const [legendOpenMobile, setLegendOpenMobile] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    if (data && !loading && isMounted) {
      setIsRendering(true);
      setLayersRendered(0);
      const timer = setTimeout(() => {
        setIsRendering(false);
        setLayersRendered(1);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [data, loading, isMounted]);

  const handleLayerToggle = (layerId: string, visible: boolean) => {
    setLayers(prev => prev.map(l => l.id === layerId ? { ...l, visible } : l));
    if (!visible) {
      setInfrastructureStatuses(prev => {
        const next = { ...prev };
        delete next[layerId];
        return next;
      });
    }
    if (layerId === 'mapbiomas') setShowMapBiomasLegend(visible);
    if (layerId === 'intermediate-regions') {
      setIntermediateRegionsEnabled(visible);
      if (visible) handleScopeChange(SCOPE_BRAZIL);
    }
  };

  // Apply a thematic preset: one click reconfigures the live map (mode, metric,
  // sector/residue, scenario, palette, and any layers the theme needs). Reuses
  // the same state the manual controls write, so nothing downstream is special-
  // cased — the map cannot tell a preset from a hand-assembled combination.
  // Declared below the layer state it touches (setLayers) so it references it
  // after it exists. The plant legend follows visiblePlantLayerIds automatically
  // (no manual toggle), so setting the layers is enough.
  const handleApplyPreset = useCallback((preset: ThematicPreset) => {
    const c = preset.config;
    const nextMode = c.visualizationMode ?? visualizationMode;
    const nextType = c.biomassType ?? biomassType;
    const nextResidues = c.selectedResidues ?? selectedResidues;
    const nextMetric = c.displayMetric ?? displayMetric;

    setVisualizationMode(nextMode);
    if (nextMode !== 'clusters') { setShowClusterPanel(false); setSelectedClusterId(null); }
    setBiomassType(nextType);
    onBiomassTypeChange?.(nextType);
    setSelectedResidues(nextResidues);
    setDisplayMetric(nextMetric);
    if (c.colorMode) setColorMode(c.colorMode);
    if (c.scenario) setMapScenario(c.scenario);
    // Palette lives in its own store; a preset always sets one (falling back to
    // the platform default) so switching themes never inherits a stale scale.
    setMapPalette(c.palette ?? DEFAULT_MAP_PALETTE);
    // Presets own the infrastructure layers EXCLUSIVELY: applying a theme turns
    // ON exactly its layers and turns OFF every other infra layer, so switching
    // maps never leaves a pile of overlapping layers stacked from earlier themes.
    // Base/context layers (the choropleth itself, the national beta layer, IBGE
    // regions, MapBiomas) are never touched by a preset.
    const presetLayers = new Set(c.layers ?? []);
    const KEEP = new Set<string>(['municipalities', NATIONAL_BETA_LAYER_ID, 'intermediate-regions', 'mapbiomas']);
    setLayers(prev => prev.map(l => (KEEP.has(l.id) ? l : { ...l, visible: presetLayers.has(l.id) })));
    setActivePresetId(preset.id);
    syncURL(nextMode, nextType, nextResidues, searchQuery, nextMetric);
  }, [visualizationMode, biomassType, selectedResidues, displayMetric, searchQuery, onBiomassTypeChange, syncURL]);

  const visibleLayerIds = useMemo(
    () => layers.filter(l => l.visible).map(l => l.id),
    [layers]
  );
  // Every plant layer on the map, so the legend explains all of them and only
  // them. `biogas-plants` is the legacy SP layer, which draws several subtypes
  // under one id — the legend expands it accordingly.
  const visiblePlantLayerIds = useMemo(
    () => visibleLayerIds.filter(id => isPlantLayer(id) || id === 'biogas-plants'),
    [visibleLayerIds]
  );
  // Declared here, above the filtering memo, because the scope filter has to
  // know about it: the beta layer is the one thing allowed to survive a scope
  // that is not its own.
  const showNationalBeta = visibleLayerIds.includes(NATIONAL_BETA_LAYER_ID);
  const infrastructureAlerts = useMemo(
    () => Object.values(infrastructureStatuses).filter(status =>
      visibleLayerIds.includes(status.layerType) &&
      (status.state === 'empty' || status.state === 'error')
    ),
    [infrastructureStatuses, visibleLayerIds]
  );
  const handleInfrastructureStatus = useCallback((status: InfrastructureLayerStatus) => {
    setInfrastructureStatuses(prev => ({ ...prev, [status.layerType]: status }));
  }, []);
  const getLayerLabel = useCallback((layerId: string) => {
    return layers.find(layer => layer.id === layerId)?.name || layerId;
  }, [layers]);

  // ── Derive biomass attribute for BubbleChartLayer ─────────────────────────
  const metricSuffix = displayMetric === 'biomass_tons' ? 'biomass_tons_year' : 'biogas_m3_year';
  const biomassAttribute = biomassType === 'total'
    ? `total_${metricSuffix}`
    : `${biomassType}_${metricSuffix}`;

  // ── Scenario scaling (per-residue, per-municipality) ────────────────────────
  // Baseline = "Médio Prazo". Other scenarios scale each *_biogas_m3_year field by
  // its residue's canonical factor, so each municipality responds to its own mix.
  const scaledData = useMemo(() => {
    if (!data || mapScenario === 'baseline') return data;
    return {
      ...data,
      features: data.features.map((f) => ({
        ...f,
        properties: applyScenarioToProps(
          f.properties as unknown as Record<string, unknown>,
          mapScenario
        ) as unknown as MunicipalityFeature['properties'],
      })),
    } as MunicipalityCollection;
  }, [data, mapScenario]);

  // ── Data filtering ──────────────────────────────────────────────────────────
  const filteredData = useMemo(() => {
    if (!scaledData) return scaledData;

    const filtered: MunicipalityFeature[] = scaledData.features.filter((feature) => {
      const props = feature.properties;

      // Scope filter: keep only the selected state (SP by default), or all of
      // Brazil. The UF is the first two digits of the IBGE code. This also
      // trims the rendered polygon count without any backend change.
      //
      // The national beta layer is the one exception, and without it the toggle
      // did nothing at all in the default (SP) scope: it promised "demais
      // municípios do Brasil" while this line had already dropped every one of
      // them, so MunicipalityLayer and BETA_STYLE — both correct — never
      // received a single feature to draw.
      const isBeta = !isSaoPaulo(props.ibge_code);
      const inScope = scope === SCOPE_BRAZIL || ufOf(props.ibge_code) === scope;
      if (!inScope && !(showNationalBeta && isBeta)) return false;

      // Search query filter
      const query = activeFilters?.searchQuery || searchQuery;
      if (query) {
        const q = query.toLowerCase();
        if (!props.name.toLowerCase().includes(q) && !String(props.ibge_code).includes(q)) return false;
      }

      // Every filter below this line reads a number that only São Paulo has. A
      // beta polygon carries none of them and is not painted by the ramp
      // anyway — it is flat context — so it passes them rather than vanishing
      // the moment any filter is touched.
      if (isBeta) return true;

      // Biogas range filter
      if (activeFilters?.minBiogas && props.total_biogas_m3_year < activeFilters.minBiogas) return false;
      if (activeFilters?.maxBiogas && props.total_biogas_m3_year > activeFilters.maxBiogas) return false;

      // Residue type filter
      if (activeFilters?.residueTypes && activeFilters.residueTypes.length > 0) {
        const ok = activeFilters.residueTypes.some(type => {
          if (type === 'agricultural') return props.agricultural_biogas_m3_year > 0;
          if (type === 'livestock') return props.livestock_biogas_m3_year > 0;
          if (type === 'urban') return props.urban_biogas_m3_year > 0;
          return false;
        });
        if (!ok) return false;
      }

      // Specific residue filter — only meaningful where the per-residue
      // breakdown exists (SP today). Elsewhere the fields are zero, so applying
      // it would blank the map; skip it and let the aggregate bands show.
      //
      // This read the legacy `{residue}_biogas_m3_year` columns until the
      // payload stopped carrying them (fields=map trims them as detail-only), at
      // which point every municipality failed the test and picking a residue
      // emptied the map instead of filtering it. hasAnySelectedResidue reads the
      // served scenario shares, which is what the choropleth paints too, so the
      // polygons kept and the values shown can no longer disagree.
      if (residueBreakdownAvailable && !hasAnySelectedResidue(props, selectedResidues, mapScenario)) {
        return false;
      }

      // Region filter
      if (activeFilters?.regions && activeFilters.regions.length > 0) {
        if (!activeFilters.regions.includes(props.intermediate_region)) return false;
      }

      return true;
    });

    return { ...scaledData, features: filtered } as MunicipalityCollection;
  }, [scaledData, activeFilters, searchQuery, selectedResidues, scope, residueBreakdownAvailable, mapScenario, showNationalBeta]);

  // ── Adaptive colour scale ───────────────────────────────────────────────────
  // Classified over the São Paulo municipalities CURRENTLY VISIBLE, in the
  // active metric's display unit — the same values the choropleth paints and the
  // legend prints. Beta rows are excluded because the ramp never applies to
  // them; including them would let unvalidated numbers set the class limits.
  //
  // This is what makes the residue filter legible: a single-residue slice is one
  // to two orders of magnitude below the state total, and against the fixed
  // ladder it was one flat colour.
  const scaleBreaks = useMemo(() => {
    const spec = getMetricSpec(displayMetric);
    const ctx = { biomassType, selectedResidues, scenario: mapScenario };
    const values: number[] = [];
    for (const f of filteredData?.features ?? []) {
      if (!isSaoPaulo(f.properties?.ibge_code)) continue;
      const { value } = spec.rawValue(f.properties, ctx);
      if (value !== null && value > 0) values.push(spec.toDisplay(value));
    }
    return computeAdaptiveBreaks(values);
  }, [filteredData, displayMetric, biomassType, selectedResidues, mapScenario]);

  // ── Guard states ────────────────────────────────────────────────────────────
  if (!isMounted) return <MapLoadingSkeleton />;
  if (loading || (data && isRendering)) return <MapLoadingSkeleton />;

  // Data problems no longer blank the whole page: the base map (OSM tiles,
  // independent of our backend) always renders, with an alert banner floating
  // over it. Graceful degradation — the user keeps a working, zoomable map,
  // sees exactly what failed, and can retry.
  const noData = !error && (!data || data.features.length === 0);

  const displayData: MunicipalityCollection =
    filteredData || scaledData || data
    || ({ type: 'FeatureCollection', features: [] } as MunicipalityCollection);

  // São Paulo only. Bubble and heatmap encode magnitude as size/intensity, and
  // there is no "muted" register in those channels the way there is for a
  // choropleth fill — a beta bubble would carry the same visual weight as a
  // canonical one. So those two modes render SP exclusively, and the national
  // beta toggle applies to the choropleth, where the layer can actually be
  // subordinated instead of merely shrunk.
  const spDisplayData: MunicipalityCollection = {
    ...displayData,
    features: displayData.features.filter((f) => isSaoPaulo(f.properties?.ibge_code)),
  };
  const spCount = spDisplayData.features.length;
  const betaCount = displayData.features.length - spCount;

  const activeBasemap = BASEMAPS[basemap];

  return (
    <div className="flex w-full h-full">
      {/* ── Desktop Persistent Sidebar ── */}
      {isMounted && (
        <DesktopLeftPanel
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          selectedResidues={selectedResidues}
          onResiduesChange={handleResiduesChange}
          biomassType={biomassType}
          onBiomassTypeChange={handleBiomassTypeChange}
          visualizationMode={visualizationMode}
          onVisualizationModeChange={handleVisualizationModeChange}
          opacity={opacity}
          onOpacityChange={handleOpacityChange}
          layers={layers}
          onLayerToggle={handleLayerToggle}
          municipalityCount={spCount}
          totalMunicipalities={SP_MUNICIPALITY_COUNT}
          betaMunicipalityCount={showNationalBeta ? betaCount : 0}
          onOpenComparison={() => setShowComparison(true)}
          onOpenExport={() => setShowExport(true)}
          displayMetric={displayMetric}
          onDisplayMetricChange={handleDisplayMetricChange}
          cnMatrix={cnMatrix}
          colorMode={colorMode}
          onColorModeChange={setColorMode}
          residueBreakdownAvailable={residueBreakdownAvailable}
          scenario={mapScenario}
          onApplyPreset={handleApplyPreset}
          activePresetId={activePresetId}
        />
      )}

      {/* ── Map area (flex-1 fills remaining width) ── */}
      <div className="relative flex-1 min-w-0 h-full">

        {/* Data-issue banner: floats over the (always-rendered) base map.
            Keeps the raw error message + reload affordance the old
            full-screen card had, without hiding the map. */}
        {(error || noData) && (
          <div
            role="alert"
            className="absolute top-16 left-1/2 z-[1100] w-[min(92%,560px)] -translate-x-1/2 rounded-lg bg-white/95 p-4 shadow-xl ring-1 ring-black/10 backdrop-blur md:top-16 dark:bg-slate-800/95"
          >
            <div className="flex items-start gap-3">
              <span aria-hidden="true" className="text-2xl leading-none">{error ? '❌' : '📭'}</span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-red-600 dark:text-red-400">
                  {error ? t('errors.loadingError') : t('errors.noData')}
                </p>
                {error && (
                  <p className="mt-1 break-words font-mono text-xs text-red-800 dark:text-red-300">
                    {error.message}
                  </p>
                )}
              </div>
              <button
                onClick={() => window.location.reload()}
                className="shrink-0 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
              >
                {error ? t('errors.reloadPage') : t('errors.tryAgain')}
              </button>
            </div>
          </div>
        )}

        {/* ── Thematic maps ribbon — the "test drive". Ready-made maps surfaced
            directly on the map, always visible, one click applies. Pinned to the
            top of the map area; every other top control sits just below it. ── */}
        <div className="absolute top-0 inset-x-0 z-[1002]">
          {isMounted && (
            <ThematicMapBar
              activePresetId={activePresetId}
              onApplyPreset={handleApplyPreset}
              collapsed={thematicBarCollapsed}
              onToggleCollapsed={() => setThematicBarCollapsed((c) => !c)}
            />
          )}
        </div>

        {/* ── Scope switcher — top-left on every viewport. Picks SP (default),
            any single state, or all of Brazil. On mobile this is the primary
            navigation affordance and sits alone at the top so nothing wraps. */}
        <div className="absolute top-14 left-2 z-[1000] md:top-16 md:left-3">
          <ScopeSwitcher
            scope={scope}
            onScopeChange={handleScopeChange}
            count={displayData.features.length}
          />
        </div>

        {/* ── Basemap switcher + compass — top-right ── */}
        <div className="absolute top-14 right-2 z-[1000] flex flex-col items-end gap-2 md:top-16 md:right-3">
          {isMounted && <BasemapControl value={basemap} onChange={setBasemap} />}
          {isMounted && <NorthArrow />}
        </div>

        {/* Scenario toggle — per-municipality biogas potential by scenario.
            Desktop only: on mobile it moves into the bottom sheet (it's a
            specific analytical control, not something you switch constantly). */}
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1000] hidden md:flex items-center gap-1 rounded-full bg-white/95 px-1.5 py-1 shadow-lg ring-1 ring-black/5 backdrop-blur">
          <span className="px-2 text-[11px] font-semibold text-gray-500">{t('scenario_label')}</span>
          {MAP_SCENARIOS.map(({ key, color }) => (
            <button
              key={key}
              type="button"
              onClick={() => setMapScenario(key)}
              title={
                key === 'fronteira' || key === 'real' || key === 'ideal'
                  ? t(`scenario_${key}_tip`)
                  : undefined
              }
              className={`rounded-full px-3 py-1 text-[11px] font-medium transition-all ${
                mapScenario === key ? 'text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
              }`}
              style={mapScenario === key ? { backgroundColor: color } : undefined}
            >
              {t(`scenario_${key}`)}
            </button>
          ))}
          <span className="mx-0.5 h-4 w-px bg-gray-200" aria-hidden="true" />
          <button
            type="button"
            onClick={toggleDaltonic}
            aria-pressed={daltonic}
            title="Modo daltônico — paleta segura para daltonismo"
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-all ${
              daltonic ? 'bg-slate-700 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            👁 Daltônico
          </button>
        </div>

        {/* Keyboard instructions for the interactive map (WCAG 2.1.1). */}
        <p id="map-keyboard-help" className="sr-only">{t('map_keyboard_help')}</p>

        {/* ARIA attributes live on a wrapper div: react-leaflet's MapContainer
            forwards unknown props to Leaflet's options, not the DOM. */}
        <div
          role="application"
          aria-label={t('map_aria_label')}
          aria-describedby="map-keyboard-help"
          className="pilar-primary-map"
          style={MAP_CONTAINER_STYLE}
        >
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          zoomControl={false}
          scrollWheelZoom={true}
          // Canvas renderer: one <canvas> instead of one SVG node per polygon.
          // SVG re-transformed every municipality path on each zoom frame (the
          // source of the zoom stutter); canvas redraws once per frame and is
          // the required headroom for the national dataset — now 5,571 polygons
          // — until the MapLibre migration (roadmap §3.3).
          preferCanvas={true}
          style={MAP_CONTAINER_STYLE}
        >
          {/* Basemap — switchable (Mapa / Satélite / Terreno / Light Canvas).
              The `key` forces a clean re-fetch when the source changes. Satellite
              carries a reference overlay (labels/boundaries) so municipality names
              stay legible over the imagery. */}
          <TileLayer
            key={basemap}
            attribution={activeBasemap.attribution}
            url={activeBasemap.url}
            maxZoom={activeBasemap.maxZoom}
          />
          {activeBasemap.refUrl && (
            <TileLayer key={`${basemap}-ref`} url={activeBasemap.refUrl} maxZoom={activeBasemap.maxZoom} />
          )}

          {/* Metric scale bar (km only — imperial off). */}
          <ScaleControl position="bottomleft" imperial={false} metric={true} />
          <ZoomControl position="bottomleft" />

          <ScopeViewController center={mapCenter} zoom={mapZoom} />
          <InfraPane />



          {/* Municipality Layer */}
          {visibleLayerIds.includes('municipalities') && displayData && (
            <>
              {visualizationMode === 'choropleth' || visualizationMode === 'clusters' ? (
                <MunicipalityLayer
                  data={displayData}
                  opacity={visualizationMode === 'clusters' ? 0.4 : opacity}
                  biomassType={biomassType}
                  selectedResidues={selectedResidues}
                  displayMetric={displayMetric}
                  colorMode={colorMode}
                  mapScenario={mapScenario}
                  daltonic={daltonic}
                  scaleBreaks={scaleBreaks}
                  showNationalBeta={showNationalBeta}
                  onMunicipalityClick={visualizationMode === 'clusters' ? undefined : handleMunicipalityClick}
                  onMunicipalityHover={visualizationMode === 'clusters' ? undefined : handleMunicipalityHover}
                />
              ) : visualizationMode === 'bubble' ? (
                <BubbleChartLayer data={spDisplayData} opacity={opacity} attribute={biomassAttribute} />
              ) : (
                <HeatmapLayer data={spDisplayData} selectedResidues={selectedResidues} opacity={opacity} />
              )}
            </>
          )}

          {/* C/N Choropleth overlay — hidden when cluster mode is active */}
          {/* C/N profiles are built from the canonical SP residue mix, so the
              overlay is SP-scoped like the pipeline that produced it. */}
          {colorMode === 'cn_profile' && !cnLoading && spDisplayData && (
            <CnChoroLayer geoJsonData={spDisplayData} profilesMap={cnProfilesMap} />
          )}

          {/* Co-digestion Cluster Layer */}
          {visualizationMode === 'clusters' && clusterData?.clusters && (
            <CodigestionClusterLayer
              clusters={clusterData.clusters}
              selectedClusterId={selectedClusterId}
              onClusterClick={(cluster: CodigestionCluster) => {
                setSelectedClusterId(cluster.cluster_id);
                setShowClusterPanel(true);
              }}
            />
          )}

          {visibleLayerIds.includes('mapbiomas') && <MapBiomasLayer opacity={0.7} />}

          {/* National layers (PostGIS, migration 023). Each is small — the
              largest is 1,712 transmission lines — so they load at full
              resolution with no LOD, unlike the municipality choropleth. */}
          {NATIONAL_INFRA_LAYERS.map(({ id, uf, bbox }) =>
            visibleLayerIds.includes(id) ? (
              <InfrastructureLayer
                key={id}
                layerType={id}
                uf={uf}
                bbox={bbox}
                onStatus={handleInfrastructureStatus}
                pane="infrastructure"
              />
            ) : null
          )}

          {/* São Paulo shapefile layers with no national equivalent loaded yet */}
          {visibleLayerIds.includes('railways') && <InfrastructureLayer layerType="railways" onStatus={handleInfrastructureStatus} pane="infrastructure" />}
          {visibleLayerIds.includes('etes') && <InfrastructureLayer layerType="etes" onStatus={handleInfrastructureStatus} pane="infrastructure" />}
          {visibleLayerIds.includes('intermediate-regions') && (
            intermediateRegionsGeoJSON
              ? <IntermediateRegionsMapLayer
                  geoJSON={intermediateRegionsGeoJSON}
                  opacity={opacity}
                />
              : <IntermediateRegionBoundaryLayer visible={true} />
          )}
        </MapContainer>
        </div>

        {/* Overlays — all absolute-positioned within the map area */}
        {infrastructureAlerts.length > 0 && (
          <div className="absolute top-28 right-4 z-[450] max-w-sm space-y-2">
            {infrastructureAlerts.map(status => (
              <div
                key={status.layerType}
                className="rounded-lg border border-amber-300 bg-amber-50/95 px-3 py-2 text-xs text-amber-900 shadow-lg backdrop-blur"
                role="status"
              >
                <p className="font-semibold">
                  {getLayerLabel(status.layerType)} indisponível
                </p>
                <p className="mt-1 leading-snug">
                  {status.message || 'O servidor retornou uma camada vazia.'}
                </p>
              </div>
            ))}
          </div>
        )}

        {isMounted && hoveredMunicipality && (
          <div className="hidden md:block">
            <EnhancedTooltip
              municipality={hoveredMunicipality}
              position={mousePosition}
              visible={true}
              metric={displayMetric}
              scenario={mapScenario}
            />
          </div>
        )}

        {isMounted && (
          <MunicipalityProfilePanel
            municipality={selectedMunicipality}
            onClose={() => setSelectedMunicipality(null)}
            visible={selectedMunicipality !== null}
            metric={displayMetric}
            scenario={mapScenario}
          />
        )}

        {isMounted && (
          <CodigestionDetailPanel
            cluster={showClusterPanel && selectedClusterId
              ? (clusterData?.clusters?.find(c => c.cluster_id === selectedClusterId) ?? null)
              : null}
            onClose={() => { setShowClusterPanel(false); setSelectedClusterId(null); }}
            visible={showClusterPanel && selectedClusterId !== null}
          />
        )}

        {isMounted && (
          <ComparisonPanel
            // Comparison puts two municipalities' numbers side by side as if
            // they were commensurable. Until the national rows clear validation
            // they are not, so the picker offers São Paulo only.
            municipalities={(data?.features ?? []).filter(f => isSaoPaulo(f.properties?.ibge_code))}
            selectedMunicipalities={comparisonMunicipalities}
            onMunicipalityAdd={handleAddToComparison}
            onMunicipalityRemove={handleRemoveFromComparison}
            onClose={() => setShowComparison(false)}
            visible={showComparison}
          />
        )}

        {isMounted && DATA_EXPORT_ENABLED && (
          <ExportControl data={displayData} visible={showExport} onClose={() => setShowExport(false)} />
        )}

        {/* ── Bottom-left overlay stack ──
            One container per corner: overlays flow upward with a fixed gap,
            so legends can never overlap each other regardless of which
            combination is visible (previously each overlay hardcoded its own
            bottom-offset and collided). pointer-events pass through the empty
            container; children remain interactive. */}
        <div className="absolute bottom-40 left-4 z-[500] flex flex-col-reverse items-start gap-2 pointer-events-none md:bottom-4 [&>*]:pointer-events-auto">

        {/* Cluster K4 legend — shown when cluster color mode is active */}
        {colorMode === 'cluster' && (
          <div className="bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-gray-200 text-xs">
            <p className="font-semibold text-gray-700 mb-1.5">Clusters K=4 (2023)</p>
            {[
              { color: '#4daf4a', label: 'Cana dominante', n: 599 },
              { color: '#ff7f00', label: 'Soja/grãos intensivo', n: 36 },
              { color: '#e41a1c', label: 'RSU urbano', n: 1 },
              { color: '#377eb8', label: 'Pecuária intensiva', n: 9 },
            ].map(({ color, label, n }) => (
              <div key={color} className="flex items-center gap-2 py-0.5">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <span className="text-gray-700">{label}</span>
                <span className="text-gray-400 ml-auto pl-2">{n}</span>
              </div>
            ))}
          </div>
        )}

        {/* C/N Profile legend — shown when cn_profile color mode is active */}
        {colorMode === 'cn_profile' && (
          <div className="bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-gray-200 text-xs">
            <p className="font-semibold text-gray-700 mb-1.5">{t('cnLegend.title')}</p>
            {[
              { color: '#1e40af', label: t('cnLegend.c_rich') },
              { color: '#60a5fa', label: t('cnLegend.c_mod') },
              { color: '#16a34a', label: t('cnLegend.balanced') },
              { color: '#f97316', label: t('cnLegend.n_mod') },
              { color: '#dc2626', label: t('cnLegend.n_rich') },
            ].map(({ color, label }) => (
              <div key={color} className="flex items-center gap-2 py-0.5">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <span className="text-gray-700">{label}</span>
              </div>
            ))}
          </div>
        )}

        {isMounted && <BiomassLayerLegend layerIds={visiblePlantLayerIds} />}

        </div>{/* end bottom-left overlay stack */}

        {/* ── Bottom-right overlay stack (same non-overlapping flow) ── */}
        <div className="absolute bottom-20 right-2 z-[500] flex flex-col-reverse items-end gap-2 pointer-events-none md:bottom-4 md:right-4 [&>*]:pointer-events-auto">

        {/* Legends.
            Desktop: shown in full. Mobile: the choropleth legend collapses to a
            chip (tap to expand) so it doesn't crowd the screen. */}
        {visibleLayerIds.includes('municipalities') && visualizationMode !== 'clusters' && (
          visualizationMode === 'choropleth' ? (
            colorMode === 'biogas' ? (
              <>
                {/* Desktop — always expanded */}
                <div className="hidden md:block">
                  <MapLegend displayMetric={displayMetric} daltonic={daltonic} showNationalBeta={showNationalBeta} scenario={mapScenario} scaleBreaks={scaleBreaks} />
                </div>
                {/* Mobile — chip + expandable legend */}
                <div className="md:hidden">
                  {legendOpenMobile ? (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setLegendOpenMobile(false)}
                        aria-label="Recolher legenda"
                        className="absolute -top-2 -right-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white shadow ring-1 ring-black/10"
                      >
                        <span className="block text-base leading-none text-gray-500">×</span>
                      </button>
                      <MapLegend displayMetric={displayMetric} daltonic={daltonic} showNationalBeta={showNationalBeta} scenario={mapScenario} scaleBreaks={scaleBreaks} />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setLegendOpenMobile(true)}
                      className="flex min-h-11 items-center gap-1.5 rounded-full bg-white/95 px-3.5 py-2.5 text-xs font-semibold text-gray-700 shadow-lg ring-1 ring-black/5 backdrop-blur"
                    >
                      <span className="h-2.5 w-8 rounded-full bg-gradient-to-r from-[#eff3ff] via-[#6baed6] to-[#08519c]" aria-hidden="true" />
                      Legenda
                    </button>
                  )}
                </div>
              </>
            ) : null
          ) : <HeatmapLegend />
        )}

        {visualizationMode === 'clusters' && clusterLoading && isMounted && (
          <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow text-xs text-violet-700 flex items-center gap-2">
            <span className="animate-spin">⚗️</span> Calculando clusters...
          </div>
        )}

        {isMounted && <MapBiomasLegend visible={showMapBiomasLegend} />}

        </div>{/* end bottom-right overlay stack */}
      </div>

      {/* ── Mobile Tab Bar + Sheet (hidden on desktop, fixed position) ── */}
      {isMounted && (
        <MobileBottomSheet
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          selectedResidues={selectedResidues}
          onResiduesChange={handleResiduesChange}
          biomassType={biomassType}
          onBiomassTypeChange={handleBiomassTypeChange}
          visualizationMode={visualizationMode}
          onVisualizationModeChange={handleVisualizationModeChange}
          opacity={opacity}
          onOpacityChange={handleOpacityChange}
          layers={layers}
          onLayerToggle={handleLayerToggle}
          municipalityCount={spCount}
          totalMunicipalities={SP_MUNICIPALITY_COUNT}
          displayMetric={displayMetric}
          onDisplayMetricChange={handleDisplayMetricChange}
          cnMatrix={cnMatrix}
          colorMode={colorMode}
          onColorModeChange={setColorMode}
          residueBreakdownAvailable={residueBreakdownAvailable}
          scenario={mapScenario}
          onScenarioChange={setMapScenario}
          daltonic={daltonic}
          onToggleDaltonic={toggleDaltonic}
        />
      )}
    </div>
  );
}

/**
 * PILAR-2b V3 - Main Map Component
 * Full-page React Leaflet map with floating panels (DBFZ-inspired)
 * Mobile: QuickFilterBar + MobileBottomSheet replace floating panels
 * Desktop: EnhancedTooltip, ProfilePanel, Comparison, Export
 * All: URL query-param state so filters can be shared/bookmarked
 */

'use client';

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useIsClient } from '@/hooks/useIsClient';
import { useLocale, useTranslations } from 'next-intl';
import MapTour, { MapTourButton } from './MapTour';
import { MapContainer, TileLayer, ScaleControl, ZoomControl, useMap } from 'react-leaflet';
import dynamic from 'next/dynamic';
import { CircleAlert, Loader2 } from 'lucide-react';
import type { LandAroundPoint, LandAroundRadius } from '@/lib/landAround';
import { gatherAround, placeOf, type GatherRadius } from '@/lib/gather';
import { availableMapTools, initialMapSearch, isMapToolAvailable, parseMapToolParams, writeMapToolParams, type MapToolId, type SimilarWithin } from '@/lib/mapTools';
import { buildProfiles, findSimilar } from '@/lib/similarity';
import { isTruckReachData, summarizeTruckReach, type TruckLimit, type TruckSite } from '@/lib/truckReach';
import type { TruckReachState } from './TruckReachWindow';
import { useMapToolAccess } from '@/lib/mapToolAccess';
import { useGeospatialData, useCodigestionClusters, useResidueCNMatrix, useIntermediateRegionsGeoJSON, useSitingIndicators, useMunicipalityLandCover, useTruckSites, useTruckReach, useRegistryAnalyses, useRegistryAnalysis } from '@/hooks/useGeospatialData';
import { figureState, kmDecimals, landCoverFigureState, nextComparePair } from '@/lib/compare';
import { buildDots, buildSymbols } from '@/lib/magnitudeViews';
import { isAmountMetric } from '@/lib/sectorSplit';
import { CONTEXT_FILL } from './magnitudeMarks';
import { prefersReducedMotion } from '@/lib/mapMotion';
import { useFormat } from '@/hooks/useFormat';
import { LATEST_LAND_COVER_YEAR } from '@/lib/landCover';
import { centroidOf, haversineKm } from '@/lib/mapGeometry';
import { ANALYSES, analysisFill, classifyAnalysis, isAnalysisId } from '@/lib/mapAnalyses';
import {
  builtInView, isRegistryRef, readAnalysisRef, registryId, registryResult, registryView,
  type AnalysisView, type MapAnalysisRef,
} from '@/lib/analysisRegistry';
import BivariateLegend from './BivariateLegend';
import type { CrossPicked } from './CrossWindow';
import type { FilterCriteria, BiomassType, ResidueType, VisualizationMode } from '@/types/map';
import type { MunicipalityCollection, MunicipalityFeature, DisplayMetric, CodigestionCluster } from '@/types/geospatial';
import { MAP_SCENARIOS, DEFAULT_MAP_SCENARIO, SERVED_SOURCE_TIER, applyScenarioToProps, isServedScenario, type MapScenarioKey } from '@/data/scenarioFactors';
import { DISPLAY_METRICS, getMetricSpec, computeAdaptiveBreaks, DEFAULT_MAP_PALETTE } from '@/lib/mapMetrics';
import { setMapPalette } from '@/hooks/useMapPalette';
import { CN_LEGEND_ROWS } from '@/lib/cnScale';
import { useTypologyProfiles } from '@/hooks/useTypologyProfiles';
import { useBetaAccess } from '@/lib/betaAccess';
import {
  TIPOLOGIA_COLORS, REGIME_COLORS, TIPOLOGIA_ORDER, REGIME_ORDER,
  TIPOLOGIA_KEY, REGIME_KEY,
} from '@/lib/typologyScale';
import type { Messages } from '@/types/i18n';
import { getBiomethaneScenarioValue, hasAnySelectedResidue } from '@/lib/mapValues';
import { BASEMAPS, DEFAULT_BASEMAP, type BasemapId } from '@/data/basemaps';
import type { ThematicPreset } from '@/data/thematicPresets';
import { DATA_EXPORT_ENABLED, MAP_ANALYSES_ENABLED } from '@/lib/featureFlags';
import {
  isSaoPaulo,
  isMinasGerais,
  isPublicMapMunicipality,
  MG_BETA_LAYER_ID,
  SP_MUNICIPALITY_COUNT,
  MG_MUNICIPALITY_COUNT,
} from '@/lib/mapScope';
import { type ColorMode } from '@/types/geospatial';
import type { InfrastructureLayerStatus, NationalLayer } from './InfrastructureLayer';
import {
  BRAZIL_STATES,
  SAO_PAULO_UF,
  SCOPE_BRAZIL,
  getState,
  scopeView,
  ufOf,
  type MapScope,
} from '@/data/brazilStates';
import ScopeSwitcher from './ScopeSwitcher';
import { useTopRowClearance } from './mapWindowShell';
import MapMunicipalitySearch from './MapMunicipalitySearch';
import MapLegend from './MapLegend';
import MapLoadingSkeleton from './MapLoadingSkeleton';
import { isPlantLayer } from '@/lib/plantLayers';
import { matchesMunicipality, searchMunicipalities } from '@/lib/municipalitySearch';
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

    // Guard the flyTo. In a viewport short enough for the map container to lay
    // out at zero height, Leaflet's zoom interpolation divides by a zero-sized
    // bounds and hands back (NaN, NaN) — which throws "Invalid LatLng object"
    // out of an effect and takes the whole page to the ErrorBoundary. Skipping
    // the animation leaves the map at its mount center, which is already the
    // right place; the next real resize re-runs this effect.
    if (!Number.isFinite(center[0]) || !Number.isFinite(center[1]) || !Number.isFinite(zoom)) return;
    // getSize is absent from lightweight useMap test doubles, so probe for it
    // rather than assume it: a missing size check should skip the guard, not
    // throw out of the effect.
    const size = typeof map.getSize === 'function' ? map.getSize() : null;
    if (size && (size.x === 0 || size.y === 0)) return;

    const target = isMobile ? Math.max(zoom - 1, 3) : zoom;
    if (prefersReducedMotion()) map.setView(center, target, { animate: false });
    else map.flyTo(center, target, { duration: 0.6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center[0], center[1], zoom]);
  return null;
}

/**
 * Leaflet 1.9 resizes the map only with the window. The left panel folding,
 * a sheet opening or the layout reflowing changed the container's size behind
 * its back: tiles went missing at the new edge until the next window resize.
 * This tells it on every container resize, once per frame.
 */
function MapResizeWatcher() {
  const map = useMap();
  useEffect(() => {
    if (typeof ResizeObserver === 'undefined' || typeof map.getContainer !== 'function') return;
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => map.invalidateSize({ pan: false }));
    });
    observer.observe(map.getContainer());
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [map]);
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
      // The pane itself never catches the pointer: its interactive lines and
      // markers turn it back on for themselves (leaflet-interactive), and every
      // other click reaches the municipality underneath.
      p.style.pointerEvents = 'none';
    }
  }, [map]);
  return null;
}

// Place names drawn ABOVE the choropleth, infrastructure and the highlight
// outline (460), below markers (600): the base tiles' own names sit under the
// municipality fill and can't be read once it is on. The pane never catches
// the pointer, so clicks still reach the municipality underneath. Made during
// render so it exists before the TileLayer child adds itself to it.
const LABELS_PANE = 'basemap-labels';
function BasemapLabels({ url, maxZoom }: { url: string; maxZoom: number }) {
  const map = useMap();
  useMemo(() => {
    if (!map.getPane(LABELS_PANE)) {
      const p = map.createPane(LABELS_PANE);
      p.style.zIndex = '470';
      p.style.pointerEvents = 'none';
    }
  }, [map]);
  return <TileLayer key={url} url={url} maxZoom={maxZoom} pane={LABELS_PANE} />;
}

// Dynamically import components to avoid SSR issues
const MunicipalityLayer = dynamic(() => import('./MunicipalityLayer'), { ssr: false });
const InfrastructureLayer = dynamic(() => import('./InfrastructureLayer'), { ssr: false });
const DotDensityLayer = dynamic(() => import('./DotDensityLayer'), { ssr: false });
const MapBiomasLayer = dynamic(() => import('./MapBiomasLayer'), { ssr: false });
const MapBiomasLegend = dynamic(() => import('./MapBiomasLegend'), { ssr: false });
const BiomassLayerLegend = dynamic(() => import('./BiomassLayerLegend'), { ssr: false });
const MagnitudeLegend = dynamic(() => import('./MagnitudeLegend'), { ssr: false });
const MobileBottomSheet = dynamic(() => import('./MobileBottomSheet'), { ssr: false });

// Desktop left panel (replaces bottom drawer with compact vertical control)
const DesktopLeftPanel = dynamic(() => import('./DesktopLeftPanel'), { ssr: false });

// Map chrome overlays (basemap switcher + compass)
const BasemapControl = dynamic(() => import('./BasemapControl'), { ssr: false });
const ThematicMapBar = dynamic(() => import('./ThematicMapBar'), { ssr: false });
const ThematicMapMenu = dynamic(() => import('./ThematicMapMenu'), { ssr: false });
const MunicipalityHighlight = dynamic(() => import('./MunicipalityHighlight'), { ssr: false });
const MapPresence = dynamic(() => import('./MapPresence'), { ssr: false });

// The click tools: the Tools menu, and Land around's circle and window.
const MapToolsMenu = dynamic(() => import('./MapToolsMenu'), { ssr: false });
const LandAroundLayer = dynamic(() => import('./LandAroundLayer'), { ssr: false });
const CompareLayer = dynamic(() => import('./CompareLayer'), { ssr: false });
const Compare = dynamic(() => import('./CompareWindow'), { ssr: false });
const CrossWindow = dynamic(() => import('./CrossWindow'), { ssr: false });
const LandAround = dynamic(() => import('./LandAroundWindow'), { ssr: false });
const GatherLayer = dynamic(() => import('./GatherLayer'), { ssr: false });
const GatherWindow = dynamic(() => import('./GatherWindow'), { ssr: false });
const SimilarLayer = dynamic(() => import('./SimilarLayer'), { ssr: false });
const SimilarWindow = dynamic(() => import('./SimilarWindow'), { ssr: false });
const TruckReachLayer = dynamic(() => import('./TruckReachLayer'), { ssr: false });
const TruckReachWindow = dynamic(() => import('./TruckReachWindow'), { ssr: false });

// Profile + Tooltip overlays
const MunicipalityProfilePanel = dynamic(() => import('./MunicipalityProfilePanel'), { ssr: false });
const EnhancedTooltip = dynamic(() => import('./EnhancedTooltip'), { ssr: false });

// Modals
const ExportControl = dynamic(() => import('./ExportControl'), { ssr: false });

// Visualization layers
const SectorSymbolLayer = dynamic(() => import('./SectorSymbolLayer'), { ssr: false });

// Co-digestion clustering layers
const CodigestionClusterLayer = dynamic(() => import('./CodigestionClusterLayer'), { ssr: false });
const CodigestionDetailPanel = dynamic(() => import('./CodigestionDetailPanel'), { ssr: false });
const CnChoroLayer = dynamic(() => import('./CnChoroLayer'), { ssr: false });
const TypologyChoroLayer = dynamic(() => import('./TypologyChoroLayer'), { ssr: false });
const IntermediateRegionBoundaryLayer = dynamic(
  () => import('./IntermediateRegionBoundaryLayer'),
  { ssr: false }
);
const IntermediateRegionsMapLayer = dynamic(
  () => import('./IntermediateRegionsMapLayer'),
  { ssr: false }
);

// The public rollout accepts only canonical SP and the MG pilot. Legacy
// national/other-state URLs fall back to SP rather than widening the payload.
function parseScopeParam(raw: string | null): MapScope {
  if (!raw) return SAO_PAULO_UF;
  const v = raw.trim().toLowerCase();
  if (v === 'sp') return SAO_PAULO_UF;
  if (v === 'mg') return '31';
  if (v === '35' || v === '31') return v;
  const bySigla = BRAZIL_STATES.find(
    (state) => (state.code === '35' || state.code === '31') && state.sigla.toLowerCase() === v
  );
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

type MapLayerId = keyof Messages['Map']['layerNames'];

interface MapLayerState {
  id: MapLayerId;
  visible: boolean;
  icon: string;
}

// Snake_case ids are national PostGIS layers (migration 023, MapBiomas 10.1);
// hyphenated ids are the remaining São Paulo shapefile layers. The national
// layers supersede their SP counterparts (they cover SP too — e.g. 51 of the
// 543 biogas plants are in SP), so the SP versions of plants/substations/
// transmission/pipelines are retired here rather than listed twice.
// ETEs and highways stay SP-only: there is no national equivalent loaded yet.
const INITIAL_LAYERS: MapLayerState[] = [
  { id: 'municipalities', visible: true, icon: '📍' },
  // São Paulo is the canonical scope and the first thing a visitor should see, so the
  // Minas Gerais pilot starts hidden. Users opt into it from the layer panel.
  { id: MG_BETA_LAYER_ID, visible: false, icon: '🧪' },
  { id: 'intermediate-regions', visible: false, icon: '🗺️' },
  { id: 'mapbiomas', visible: false, icon: '🌳' },
  { id: 'biogas_plant', visible: false, icon: '🏭' },
  { id: 'ethanol_plant', visible: false, icon: '🌾' },
  { id: 'biomass_thermal_plant', visible: false, icon: '🔥' },
  { id: 'biodiesel_plant', visible: false, icon: '🛢️' },
  { id: 'slaughterhouse', visible: false, icon: '🥩' },
  { id: 'substation', visible: false, icon: '⚡' },
  { id: 'transmission_line', visible: false, icon: '🔌' },
  { id: 'gas_pipeline_transport', visible: false, icon: '🔧' },
  { id: 'gas_pipeline_distribution', visible: false, icon: '🔩' },
  { id: 'gas_delivery_point', visible: false, icon: '🔷' },
  { id: 'compression_station', visible: false, icon: '🔶' },
  { id: 'gas_processing_unit', visible: false, icon: '🔹' },
  { id: 'gas_pipeline_outflow', visible: false, icon: '🧵' },
  { id: 'protected_area_state', visible: false, icon: '🌲' },
  { id: 'indigenous_territory', visible: false, icon: '🪶' },
  { id: 'settlement', visible: false, icon: '🏘️' },
  { id: 'highway_state', visible: false, icon: '🛣️' },
  { id: 'highway_federal', visible: false, icon: '🛤️' },
  { id: 'etes', visible: false, icon: '💧' },
  { id: 'railways', visible: false, icon: '🛣️' },
];

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
  'cattle', 'swine', 'poultry', 'aquaculture', 'rsu', 'rpo', 'sewage',
];
const VALID_BIOMASS: BiomassType[] = ['total', 'agricultural', 'livestock', 'urban'];
const VALID_VIZ: VisualizationMode[] = ['choropleth', 'dots', 'symbols', 'clusters'];
/** The views Pontos and Símbolos replaced, so their old links still open something close. */
const LEGACY_VIZ: Record<string, VisualizationMode> = { heatmap: 'dots', bubble: 'symbols' };
const VALID_METRICS: DisplayMetric[] = DISPLAY_METRICS;
/** Truck reach shows the gas pipelines its routes run to. */
const TRUCK_CONTEXT_LAYERS: readonly string[] = ['gas_pipeline_transport', 'gas_pipeline_distribution'];
const NO_TRUCK_SITES: readonly TruckSite[] = [];
const MG_DISABLED_RESIDUES = new Set<ResidueType>(['aquaculture', 'rpo', 'sewage']);

function sanitizeResiduesForScope(scope: MapScope, residues: ResidueType[]): ResidueType[] {
  return scope === '31' ? residues.filter(residue => !MG_DISABLED_RESIDUES.has(residue)) : residues;
}

interface MapComponentProps {
  activeFilters?: FilterCriteria;
  biomassType?: BiomassType;
  onBiomassTypeChange?: (type: BiomassType) => void;
  opacity?: number;
  onOpacityChange?: (opacity: number) => void;
  /** A municipality (name or IBGE code) to select once the map loads. */
  searchQuery?: string;
}

export default function MapComponent({
  activeFilters,
  biomassType: propBiomassType = 'total',
  onBiomassTypeChange,
  opacity: propOpacity = 0.7,
  onOpacityChange,
  searchQuery: propSearchQuery = '',
}: MapComponentProps = {}) {
  const t = useTranslations('Map');
  const tCompare = useTranslations('Map.compare');
  const tCommon = useTranslations('common');
  const tAnalyses = useTranslations('Map.analyses');
  const viewLocale = useLocale() === 'en' ? 'en' : 'pt-BR';
  const { data, loading, error } = useGeospatialData();

  // Backend typology/regime values are identifiers; show their catalog label.
  const typologyLabel = (isTypology: boolean, value: string): string => {
    if (isTypology) {
      const key = TIPOLOGIA_KEY[value];
      return key ? t(`typology.classes.${key}`) : value;
    }
    const key = REGIME_KEY[value];
    return key ? t(`typology.regime.${key}`) : value;
  };

  // ── URL state sync (client-only, safe since ssr:false) ─────────────────────
  // The link the map opens with, read once from the router, not from
  // window.location: on a client-side navigation (back from sign-in, a link in
  // the header) this renders before the browser's address changes, so
  // window.location still holds the previous page's query. Reading that, the
  // map found no tool and its URL sync then wrote the bare /map back.
  const routeSearch = useSearchParams();
  const [initialSearch] = useState(() => initialMapSearch(routeSearch));
  const readURLParam = (key: string): string | null => new URLSearchParams(initialSearch).get(key);

  const rawUrlMode = readURLParam('mode');
  const urlMode = rawUrlMode && LEGACY_VIZ[rawUrlMode] ? LEGACY_VIZ[rawUrlMode] : rawUrlMode;
  const urlType = readURLParam('type');
  const urlResidues = readURLParam('r');
  // `m` is the selected municipality (IBGE code); `q` is the old search, read once
  // so links made before the search selected instead of filtering still land on it.
  const urlMunicipality = readURLParam('m');
  const urlQuery = readURLParam('q');
  const urlMetric = readURLParam('metric');
  const urlScope = readURLParam('scope'); // 'brazil' → national view
  // Held back with MAP_ANALYSES_ENABLED: an old ?a= link opens the plain map,
  // unless it opens the Cruzar tool, which shows it to approved accounts.
  // A registry link (?a=r:<id>) is not held back: the API decides who sees it.
  const rawUrlAnalysis = readURLParam('a');
  const urlRegistryLink = rawUrlAnalysis?.startsWith('r:') ?? false;
  const urlAnalysis = MAP_ANALYSES_ENABLED || urlRegistryLink || readURLParam('tool') === 'cross' ? rawUrlAnalysis : null;
  const urlAnalysisRef = readAnalysisRef(urlAnalysis);
  const initialScope = parseScopeParam(urlScope);

  // An analysis paints the choropleth, so ?a= wins over any other ?mode=.
  const initialMode: VisualizationMode =
    urlAnalysisRef ? 'choropleth'
      : VALID_VIZ.includes(urlMode as VisualizationMode) ? (urlMode as VisualizationMode) : 'choropleth';

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
  const isMounted = useIsClient();

  const initialBiomass: BiomassType =
    VALID_BIOMASS.includes(urlType as BiomassType) ? (urlType as BiomassType) : propBiomassType;
  const parsedInitialResidues: ResidueType[] = urlResidues
    ? urlResidues.split(',').filter(r => VALID_RESIDUES.includes(r as ResidueType)) as ResidueType[]
    : [];
  const initialResidues = sanitizeResiduesForScope(initialScope, parsedInitialResidues);
  const initialResiduesWereSanitized = initialResidues.length !== parsedInitialResidues.length;
  const initialResidueParam = initialResidues.join(',');
  const initialPick = urlMunicipality ?? urlQuery ?? (propSearchQuery || null);
  const initialMetric: DisplayMetric =
    VALID_METRICS.includes(urlMetric as DisplayMetric) ? (urlMetric as DisplayMetric) : 'biomass_tons';

  // Local state (authoritative)
  const [selectedResidues, setSelectedResidues] = useState<ResidueType[]>(initialResidues);
  const [biomassType, setBiomassType] = useState<BiomassType>(initialBiomass);
  // A municipality to select as soon as the data is in: from the URL or the caller.
  const pendingPick = useRef<string | null>(initialPick);
  // Bumped when the view should frame the selection (search, URL), not on a click.
  const [fitKey, setFitKey] = useState(0);
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
  // The bivariate analysis painting the map, if any (?a=<id>). Any other map
  // choice (metric, mode, theme, filter) ends it: the two never mix.
  const [activeAnalysis, setActiveAnalysis] = useState<MapAnalysisRef | null>(urlAnalysisRef);
  // A registry link that is malformed, or that this account may not see: the
  // map opens with no analysis and the Cruzar window says so, the same words
  // either way, so a link does not tell a hidden analysis from a missing one.
  // The registry link as asked for (well-formed only). A visitor who is not
  // signed in gets a 404 for it and the analysis is cleared, yet the login
  // link must still bring it back once the account may see it.
  const [requestedRegistryRef] = useState<MapAnalysisRef | null>(
    urlAnalysisRef !== null && isRegistryRef(urlAnalysisRef) ? urlAnalysisRef : null,
  );
  const [registryUnavailable, setRegistryUnavailable] = useState(urlRegistryLink && urlAnalysisRef === null);
  // While the analyses are held back, drop an old ?a= so the URL matches the
  // plain map it opened (and a shared link does not carry it on).
  useEffect(() => {
    if (MAP_ANALYSES_ENABLED || typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (!params.has('a') || params.get('tool') === 'cross' || params.get('a')?.startsWith('r:')) return;
    params.delete('a');
    const query = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
  }, []);

  // Preserve valid MG sector/metric bookmarks while removing residue keys that
  // are visibly disabled for the pilot. Without this, a stale URL could count
  // pruning/sewage/aquaculture as active filters even though the user could not
  // deselect them in the disabled controls.
  useEffect(() => {
    if (!initialResiduesWereSanitized || typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (initialResidueParam) params.set('r', initialResidueParam);
    else params.delete('r');
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
  }, [initialResiduesWereSanitized, initialResidueParam]);

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

  const hasBetaAccess = useBetaAccess();
  // Beta layers are 401-gated server-side, so never fire the request without
  // a token — it would be a guaranteed failure on every public page view.
  // One source for all three beta modes. C:N used to come from its own endpoint,
  // which serves the arithmetic mean; the typology rows carry `cn_harm`, the
  // N-additive value the dossier declares, so the map reads that instead.
  const isTypologyMode = colorMode === 'tipologia' || colorMode === 'regime';
  const isCnMode = colorMode === 'cn_profile';
  const { typologyMap, isLoading: typologyLoading } =
    useTypologyProfiles(hasBetaAccess && (isTypologyMode || isCnMode));

  // SP only — MG rows carry a null cn_harm and are simply absent here, which the
  // layer paints as no-data rather than as a value.
  const cnByIbge = useMemo(() => {
    const out: Record<string, number> = {};
    Object.values(typologyMap).forEach((row) => {
      if (row.cn_harm != null) out[String(row.ibge_code)] = row.cn_harm;
    });
    return out;
  }, [typologyMap]);
  // Clicking a legend class isolates it; clicking again clears.
  const [highlightClass, setHighlightClass] = useState<string | null>(null);
  // Tipologia and regime label sets are disjoint, so a filter carried across a
  // mode switch matches nothing and dims every polygon — the map goes blank
  // with only the "show all classes" link to explain it. Drop it on any change.
  useEffect(() => {
    setHighlightClass(null);
  }, [colorMode]);

  const [scope, setScope] = useState<MapScope>(initialScope);
  // The C:N modes exist only where cn_harm does, which is São Paulo. Switching
  // scope to Minas while one of them is active removed it from the selector but
  // left it selected: the map painted nothing and a stale legend stayed behind.
  // Fall back to the metric everyone has.
  useEffect(() => {
    if (scope === '31' && (colorMode === 'cn_profile' || colorMode === 'regime')) {
      setColorMode('biogas');
    }
  }, [scope, colorMode]);

  const { center: mapCenter, zoom: mapZoom } = scopeView(scope);
  const availableResidueCategories: Array<'agricultural' | 'livestock' | 'urban'> =
    scope === SAO_PAULO_UF || scope === '31'
      ? ['agricultural', 'livestock', 'urban']
      : [];
  const residueBreakdownAvailable = availableResidueCategories.length > 0;

  // ── Enhanced interaction state (Phase 2+3) ────────────────────────────────
  const [selectedMunicipality, setSelectedMunicipality] = useState<MunicipalityFeature | null>(null);
  const [hoveredMunicipality, setHoveredMunicipality] = useState<MunicipalityFeature | null>(null);

  // ── Click tools (lib/mapTools.ts) ─────────────────────────────────────────
  // One tool open at a time, kept in the URL (?tool=..), so a shared link
  // opens it. Anyone can open a tool; useMapToolAccess decides whether its
  // clicks do anything, and the tool's window says what is needed.
  const toolAccess = useMapToolAccess();
  const toolsOnOffer = useMemo(() => availableMapTools(), []);
  const [initialTools] = useState(() =>
    parseMapToolParams(initialSearch),
  );
  const [activeTool, setActiveTool] = useState<MapToolId | null>(
    isMapToolAvailable(initialTools.tool)
      ? initialTools.tool
      // A registry link opens Cruzar: its reading, or why there is none, lives there.
      : urlRegistryLink ? 'cross' : null,
  );
  // Land around
  const landOn = activeTool === 'land';
  const [landPoint, setLandPoint] = useState<LandAroundPoint | null>(initialTools.land.point);
  const [landRadius, setLandRadius] = useState<LandAroundRadius>(initialTools.land.radius);
  // Compare: A and B as IBGE codes, in pick order.
  const compareOn = activeTool === 'compare';
  const [comparePair, setComparePair] = useState<string[]>(initialTools.compare.pair);
  const pickCompare = useCallback((code: string) => setComparePair((pair) => nextComparePair(pair, code, 'click') as string[]), []);
  // A search pick fills A or B but never takes one away (nextComparePair).
  const searchCompare = useCallback((code: string) => setComparePair((pair) => nextComparePair(pair, code, 'search') as string[]), []);
  // Gather: the plant's point and the catchment radius.
  const gatherOn = activeTool === 'gather';
  const [gatherPoint, setGatherPoint] = useState<LandAroundPoint | null>(initialTools.gather.point);
  const [gatherRadius, setGatherRadius] = useState<GatherRadius>(initialTools.gather.radius);
  // A link may name the plant by municipality (?hub=); its centre is the point
  // once the map's features are in.
  const [gatherHub, setGatherHub] = useState<string | null>(initialTools.gather.hub);
  // Find similar: the municipality picked, where to look, and the match a row
  // in the window points at.
  const similarOn = activeTool === 'similar';
  const [similarOf, setSimilarOf] = useState<string | null>(initialTools.similar.of);
  const [similarWithin, setSimilarWithin] = useState<SimilarWithin>(initialTools.similar.within);
  const [similarHovered, setSimilarHovered] = useState<string | null>(null);
  const pickSimilar = useCallback((code: string) => {
    setSimilarHovered(null);
    setSimilarOf(code);
  }, []);
  // The rows change with the scope, so the outline of one that goes would stay.
  const changeSimilarWithin = useCallback((within: SimilarWithin) => {
    setSimilarHovered(null);
    setSimilarWithin(within);
  }, []);
  // Truck reach: the picked site, the drive-time limit and the 50 km circle.
  const truckOn = activeTool === 'truck';
  const [truckSite, setTruckSite] = useState<string | null>(initialTools.truck.site);
  const [truckLimit, setTruckLimit] = useState<TruckLimit>(initialTools.truck.limit);
  const [truckCircle, setTruckCircle] = useState(false);
  // The site a row of the nearest list points at.
  const [truckHovered, setTruckHovered] = useState<string | null>(null);
  // The tool a link opened with its pick, framed on arrival (useToolFraming).
  // Once the reader leaves it, reopening the tool is not an arrival any more.
  const [arrivalTool, setArrivalTool] = useState<MapToolId | null>(() => {
    const t = initialTools;
    const picked =
      (t.tool === 'land' && t.land.point !== null) ||
      (t.tool === 'compare' && t.compare.pair.length > 0) ||
      (t.tool === 'gather' && (t.gather.point !== null || t.gather.hub !== null)) ||
      (t.tool === 'similar' && t.similar.of !== null) ||
      (t.tool === 'truck' && t.truck.site !== null);
    return picked ? t.tool : null;
  });
  // A new pick leaves the link too: a link whose pick never drew must not
  // make the reader's first click move the map.
  const leftLinkPick =
    (arrivalTool === 'land' && landPoint !== initialTools.land.point) ||
    (arrivalTool === 'compare' && comparePair !== initialTools.compare.pair) ||
    (arrivalTool === 'gather' && (gatherPoint !== initialTools.gather.point || gatherHub !== initialTools.gather.hub)) ||
    (arrivalTool === 'similar' && similarOf !== initialTools.similar.of) ||
    (arrivalTool === 'truck' && truckSite !== initialTools.truck.site);
  if (arrivalTool !== null && (activeTool !== arrivalTool || leftLinkPick)) setArrivalTool(null);
  // A tool that draws its own municipality layer hides the choropleth and its legends.
  const fillHiddenByTool = landOn || compareOn || gatherOn || similarOn;
  // Cruzar: the analysis is the map's own ?a=; the tool is how it reaches
  // approved accounts while MAP_ANALYSES_ENABLED keeps it off the public map.
  const crossOn = activeTool === 'cross';
  const activeRegistryId = activeAnalysis && isRegistryRef(activeAnalysis) ? registryId(activeAnalysis) : null;
  // Asked for only where they can show: Cruzar, the panel (flag on), or a link.
  const registryList = useRegistryAnalyses(crossOn || MAP_ANALYSES_ENABLED || activeRegistryId !== null);
  const registryDetail = useRegistryAnalysis(activeRegistryId, activeRegistryId !== null);
  // The API's 404 (or a list without it) reads the same as a malformed link.
  const registryHidden = activeRegistryId !== null && (
    (registryDetail.isSuccess && registryDetail.data === null)
    || (registryList.isSuccess && !registryList.data?.some((meta) => meta.id === activeRegistryId))
  );
  const analysisUnavailable = registryUnavailable || registryHidden;
  // What was chosen, less a registry analysis the API will not serve.
  const analysisChosen = registryHidden ? null : activeAnalysis;
  // A registry analysis is shown whenever the API served it, flag or not.
  const analysisShown: MapAnalysisRef | null =
    analysisChosen && (isRegistryRef(analysisChosen) || MAP_ANALYSES_ENABLED || (crossOn && toolAccess === 'allowed'))
      ? analysisChosen
      : null;
  const registryAnswer = tAnalyses('registry_answer');
  const registryViews = useMemo(
    () => (registryList.data ?? []).map((meta) => registryView(meta, viewLocale, registryAnswer)),
    [registryList.data, viewLocale, registryAnswer],
  );
  const analysisView: AnalysisView | null = !analysisShown
    ? null
    : isAnalysisId(analysisShown)
      ? builtInView(analysisShown, tAnalyses)
      : (registryViews.find((v) => v.ref === analysisShown) ?? null);
  // Drop the link's ?a=, so the URL matches the plain map it opened.
  useEffect(() => {
    if (!analysisUnavailable || typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (!params.has('a')) return;
    params.delete('a');
    const query = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
  }, [analysisUnavailable]);
  // The municipality whose cell the Cruzar window marks (a click or a search pick).
  const [crossPick, setCrossPick] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = writeMapToolParams(window.location.search, {
      tool: activeTool,
      land: { point: landPoint, radius: landRadius },
      compare: { pair: comparePair },
      gather: { point: gatherPoint, radius: gatherRadius, hub: gatherPoint ? null : gatherHub },
      similar: { of: similarOf, within: similarWithin },
      truck: { site: truckSite, limit: truckLimit },
    });
    const query = params.toString();
    const next = `${window.location.pathname}${query ? `?${query}` : ''}`;
    if (next !== `${window.location.pathname}${window.location.search}`) window.history.replaceState(null, '', next);
  }, [activeTool, landPoint, landRadius, comparePair, gatherPoint, gatherRadius, gatherHub, similarOf, similarWithin, truckSite, truckLimit]);

  // Choose a bivariate analysis (or none). It paints the choropleth, so the map
  // goes back to the choropleth mode, and the theme highlight goes.
  const handleAnalysisChange = useCallback((next: MapAnalysisRef | null) => {
    setActiveAnalysis(next);
    setRegistryUnavailable(false);
    if (next) {
      setVisualizationMode('choropleth');
      setShowClusterPanel(false);
      setSelectedClusterId(null);
      setActivePresetId(null);
    }
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (next) {
        params.set('a', next);
        params.set('mode', 'choropleth');
      } else {
        params.delete('a');
      }
      window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
    }
  }, []);

  const closeTool = useCallback(() => {
    // Closing Cruzar ends the analysis it painted.
    if (activeTool === 'cross') handleAnalysisChange(null);
    setActiveTool(null);
    setLandPoint(null);
    setComparePair([]);
    setCrossPick(null);
    setGatherPoint(null);
    setGatherHub(null);
    setSimilarOf(null);
    setSimilarHovered(null);
    setTruckSite(null);
    setTruckCircle(false);
    setTruckHovered(null);
  }, [activeTool, handleAnalysisChange]);

  // Gather places the plant where the map is clicked (the shapes are hidden
  // while it is on, so the click reaches the map).
  const handleGatherPick = useCallback((point: LandAroundPoint) => {
    if (toolAccess !== 'allowed') return;
    setGatherHub(null);
    setGatherPoint(point);
  }, [toolAccess]);

  // The window names the place from the server's nearest municipality: while
  // Land around is on, the municipality shapes are hidden and take no clicks.
  const handleLandPick = useCallback((point: LandAroundPoint) => {
    if (toolAccess !== 'allowed') return;
    setLandPoint(point);
  }, [toolAccess]);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showExport, setShowExport] = useState(false);

  // Write URL whenever filter state changes
  const syncURL = useCallback((
    mode: VisualizationMode,
    type: BiomassType,
    residues: ResidueType[],
    metric: DisplayMetric,
  ) => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    params.set('mode', mode);
    if (type !== 'total') params.set('type', type); else params.delete('type');
    if (residues.length > 0) params.set('r', residues.join(',')); else params.delete('r');
    params.delete('q');
    if (metric !== 'biomass_tons') params.set('metric', metric); else params.delete('metric');
    // Every caller is a map choice that ends the analysis.
    params.delete('a');
    setActiveAnalysis(null);
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
  }, []);

  const handleScopeChange = useCallback((next: MapScope) => {
    const nextResidues = sanitizeResiduesForScope(next, selectedResidues);
    setScope(next);
    setSelectedMunicipality(null);
    setHoveredMunicipality(null);
    setSelectedResidues(nextResidues);
    setActivePresetId(null);
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (next === SAO_PAULO_UF) params.delete('scope');
      else params.set('scope', next === SCOPE_BRAZIL ? 'brazil' : next);
      params.delete('q');
      params.delete('m');
      if (nextResidues.length > 0) params.set('r', nextResidues.join(','));
      else params.delete('r');
      window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
    }
  }, [selectedResidues]);

  const handleVisualizationModeChange = (mode: VisualizationMode) => {
    setVisualizationMode(mode);
    setActivePresetId(null);
    if (mode !== 'clusters') { setShowClusterPanel(false); setSelectedClusterId(null); }
    syncURL(mode, biomassType, selectedResidues, displayMetric);
  };

  const handleDisplayMetricChange = (metric: DisplayMetric) => {
    setDisplayMetric(metric);
    setActivePresetId(null);
    syncURL(visualizationMode, biomassType, selectedResidues, metric);
  };

  const handleBiomassTypeChange = (type: BiomassType) => {
    const sectorResidues: Record<Exclude<BiomassType, 'total'>, ResidueType[]> = {
      agricultural: ['sugarcane', 'soybean', 'corn', 'coffee', 'citrus'],
      livestock: ['cattle', 'swine', 'poultry', 'aquaculture'],
      urban: ['rsu', 'rpo', 'sewage'],
    };
    const residues = sanitizeResiduesForScope(
      scope,
      type === 'total' ? [] : sectorResidues[type],
    );
    const nextMetric: DisplayMetric = type === 'urban' && displayMetric === 'biomass_tons'
      ? 'methane_m3'
      : displayMetric;
    setBiomassType(type);
    setSelectedResidues(residues);
    setDisplayMetric(nextMetric);
    setActivePresetId(null);
    onBiomassTypeChange?.(type);
    syncURL(visualizationMode, type, residues, nextMetric);
  };

  const handleResiduesChange = (residues: ResidueType[]) => {
    const scopedResidues = sanitizeResiduesForScope(scope, residues);
    const nextMetric: DisplayMetric = scopedResidues.includes('sewage') && displayMetric === 'biomass_tons'
      ? 'methane_m3'
      : displayMetric;
    setSelectedResidues(scopedResidues);
    setDisplayMetric(nextMetric);
    setActivePresetId(null);
    syncURL(visualizationMode, biomassType, scopedResidues, nextMetric);
  };


  const handleOpacityChange = (val: number) => {
    setOpacity(val);
    onOpacityChange?.(val);
  };

  // ── Municipality interaction callbacks (Phase 2) ──────────────────────────
  // One way to select a municipality, whether by a click, the search or the URL:
  // the profile opens, the outline follows, and the URL keeps it (?m=<ibge>).
  const selectMunicipality = useCallback((feature: MunicipalityFeature | null, frame = false) => {
    setSelectedMunicipality(feature);
    if (feature && frame) setFitKey((k) => k + 1);
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const code = feature?.properties?.ibge_code;
    if (code != null && code !== '') params.set('m', String(code)); else params.delete('m');
    params.delete('q');
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
  }, []);

  // With a tool open, a click on a municipality goes to the tool, never to the
  // profile.
  const handleMunicipalityClick = useCallback((feature: MunicipalityFeature) => {
    switch (activeTool) {
      case 'land':
        // The click places the circle (LandAroundLayer).
        return;
      case 'compare':
        // CompareLayer picks on its own outlines; this covers any other path.
        if (toolAccess === 'allowed' && feature.properties?.ibge_code != null) pickCompare(String(feature.properties.ibge_code));
        return;
      case 'similar':
        // SimilarLayer picks on its own outlines; this covers any other path.
        if (toolAccess === 'allowed' && feature.properties?.ibge_code != null) pickSimilar(String(feature.properties.ibge_code));
        return;
      case 'truck':
        // Truck reach picks its sites, not municipalities.
        return;
      case 'cross':
        // The window marks the municipality's cell; the profile stays shut.
        if (feature.properties?.ibge_code != null) setCrossPick(String(feature.properties.ibge_code));
        return;
      case null:
        selectMunicipality(feature);
        return;
      default:
        // A tool on offer that takes municipalities handles them here.
        return;
    }
  }, [selectMunicipality, activeTool, toolAccess, pickCompare, pickSimilar]);

  // Opening a tool closes the profile; picking the open tool, or none, closes it.
  const selectTool = useCallback((tool: MapToolId | null) => {
    if (tool === null || tool === activeTool) { closeTool(); return; }
    closeTool();
    selectMunicipality(null);
    setActiveTool(tool);
  }, [activeTool, closeTool, selectMunicipality]);

  // The municipality the URL (or the caller) names, selected and framed once the
  // data is in. Matched as the search matches, among the municipalities of the
  // current scope; an unknown one is dropped quietly, leaving the map as it is.
  useEffect(() => {
    const wanted = pendingPick.current;
    if (!wanted || !data) return;
    const inScope = data.features.filter(
      (f) => isPublicMapMunicipality(f.properties?.ibge_code) && ufOf(f.properties?.ibge_code) === scope,
    );
    const [match] = searchMunicipalities(
      inScope,
      wanted,
      (f) => ({ name: f.properties?.name ?? '', code: f.properties?.ibge_code ?? '' }),
      1,
    );
    pendingPick.current = null;
    if (match) selectMunicipality(match, true);
  }, [data, scope, selectMunicipality]);

  const handleMunicipalityHover = useCallback((feature: MunicipalityFeature | null, e?: MouseEvent) => {
    setHoveredMunicipality(feature);
    if (e) setMousePosition({ x: e.clientX, y: e.clientY });
  }, []);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      // A menu that closed on this Escape (Temas, state) marks it handled;
      // closing a menu must not also drop the selected municipality.
      if (e.key === 'Escape') {
        if (e.defaultPrevented) return;
        if (activeTool) closeTool(); else selectMunicipality(null);
        return;
      }
      if (e.key === 'e' || e.key === 'E') {
        if (DATA_EXPORT_ENABLED) setShowExport(true);
        return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectMunicipality, activeTool, closeTool]);

  // ── Layer state ─────────────────────────────────────────────────────────────
  // Names are copy (Map.layerNames.<id>) and are attached at render time, so
  // they always follow the page locale; state holds only id, visibility, icon.
  const [layers, setLayers] = useState<MapLayerState[]>(INITIAL_LAYERS);
  const tLayerNames = useTranslations('Map.layerNames');
  const namedLayers = useMemo(
    () => layers.map((layer) => ({ ...layer, name: tLayerNames(layer.id) })),
    [layers, tLayerNames]
  );
  const [infrastructureStatuses, setInfrastructureStatuses] = useState<Record<string, InfrastructureLayerStatus>>({});

  const [showMapBiomasLegend, setShowMapBiomasLegend] = useState(false);
  // No state for the plants legend: it is a pure function of which plant layers
  // are on (see visiblePlantLayerIds below). It used to be a boolean flipped
  // only by `biogas_plant`, so etanol / UTEs a biomassa / biodiesel drew markers
  // with nothing to decode them.
  // Mobile: the choropleth legend is collapsed to a chip by default and
  // expands on tap, so it doesn't crowd the small screen.
  const [legendOpenMobile, setLegendOpenMobile] = useState(false);

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
    const KEEP = new Set<string>(['municipalities', MG_BETA_LAYER_ID, 'intermediate-regions', 'mapbiomas']);
    setLayers(prev => prev.map(l => (KEEP.has(l.id) ? l : { ...l, visible: presetLayers.has(l.id) })));
    setActivePresetId(preset.id);
    syncURL(nextMode, nextType, nextResidues, nextMetric);
  }, [visualizationMode, biomassType, selectedResidues, displayMetric, onBiomassTypeChange, syncURL]);

  // An analysis brings its infrastructure as context (plants for the gap,
  // pipelines for siting) and takes it away when it ends. Only the layers the
  // analysis itself switched on are taken away: one the reader already had on
  // stays on. Truck reach brings the gas pipelines the same way.
  // The tool windows sit under the control row, however many lines it wraps to.
  const topRowRef = useTopRowClearance();

  const analysisOwnedLayersRef = useRef<readonly string[]>([]);
  // As a string, so a registry view rebuilt on each render does not re-run it.
  const analysisLayersKey = (analysisView?.layers ?? []).join(',');
  useEffect(() => {
    const next: readonly string[] = [
      ...(analysisLayersKey ? analysisLayersKey.split(',') : []),
      ...(truckOn ? TRUCK_CONTEXT_LAYERS : []),
    ];
    if (analysisOwnedLayersRef.current.length === 0 && next.length === 0) return;
    setLayers(prev => {
      const owned = analysisOwnedLayersRef.current;
      const nowOwned: string[] = [];
      const updated = prev.map(l => {
        if (next.includes(l.id)) {
          if (owned.includes(l.id)) nowOwned.push(l.id);
          if (l.visible) return l;
          nowOwned.push(l.id);
          return { ...l, visible: true };
        }
        if (owned.includes(l.id) && l.visible) return { ...l, visible: false };
        return l;
      });
      analysisOwnedLayersRef.current = nowOwned;
      return updated;
    });
  }, [analysisLayersKey, truckOn]);

  const visibleLayerIds = useMemo(
    () => layers.filter(l => l.visible).map((l): string => l.id),
    [layers]
  );
  // Land around takes every click on the map, and the municipality shapes
  // would catch it first; while the tool is on they step aside (fill, its
  // beta overlays and legends), and come back as they were when it closes.
  const showMunicipalityFill = visibleLayerIds.includes('municipalities') && !fillHiddenByTool;
  // Every plant layer on the map, so the legend explains all of them and only
  // them. (The legacy SP `biogas-plants` layer is retired from INITIAL_LAYERS;
  // the legend still knows how to expand it should it come back.)
  const visiblePlantLayerIds = useMemo(
    () => visibleLayerIds.filter(isPlantLayer),
    [visibleLayerIds]
  );
  // Declared here, above the filtering memo, because the scope filter has to
  // know about it: the beta layer is the one thing allowed to survive a scope
  // that is not its own.
  const showNationalBeta = visibleLayerIds.includes(MG_BETA_LAYER_ID);
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
    return namedLayers.find(layer => layer.id === layerId)?.name || layerId;
  }, [namedLayers]);

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
      if (!isPublicMapMunicipality(props.ibge_code)) return false;
      const isBeta = isMinasGerais(props.ibge_code);
      const inScope = scope === SCOPE_BRAZIL || ufOf(props.ibge_code) === scope;
      if (!inScope && !(showNationalBeta && isBeta)) return false;

      // Search query filter
      // Only a caller's filter narrows by name: the map's own search selects instead.
      const query = activeFilters?.searchQuery;
      // By name or IBGE code, as everywhere (lib/municipalitySearch).
      if (query && !matchesMunicipality(query, props.name, props.ibge_code)) return false;

      // Every filter below this line reads a number that only São Paulo has. A
      // beta polygon carries none of them and is not painted by the ramp
      // anyway — it is flat context — so it passes them rather than vanishing
      // the moment any filter is touched.
      if (isBeta && scope !== '31') return true;

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
  }, [scaledData, activeFilters, selectedResidues, scope, residueBreakdownAvailable, mapScenario, showNationalBeta]);

  // ── Adaptive colour scale ───────────────────────────────────────────────────
  // Classified over the selected state's municipalities CURRENTLY VISIBLE, in the
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
      if (ufOf(f.properties?.ibge_code) !== scope) continue;
      const { value } = spec.rawValue(f.properties, ctx);
      if (value !== null && value > 0) values.push(spec.toDisplay(value));
    }
    return computeAdaptiveBreaks(values);
  }, [filteredData, displayMetric, biomassType, selectedResidues, mapScenario, scope]);

  // ── Bivariate analysis ──────────────────────────────────────────────────────
  const analysisDef = analysisShown && isAnalysisId(analysisShown) ? ANALYSES[analysisShown] : null;
  const registryShown = analysisShown !== null && isRegistryRef(analysisShown);
  const compareAllowed = compareOn && toolAccess === 'allowed';
  // Compare reads the pipelines and plants too (a public endpoint) and the land
  // cover (signed-in only).
  const siting = useSitingIndicators(Boolean(analysisDef?.needsSiting) || compareAllowed);
  const compareLandCover = useMunicipalityLandCover(LATEST_LAND_COVER_YEAR, compareAllowed);
  const compareDistanceKm = useMemo(() => {
    if (comparePair.length < 2 || !data) return null;
    const [a, b] = comparePair.map((code) => centroidOf(data.features.find((f) => String(f.properties?.ibge_code) === code)));
    return a && b ? haversineKm(a, b) : null;
  }, [comparePair, data]);
  const formatNumber = useFormat().number;
  const compareDistanceLabel = useCallback(
    (km: number) => tCompare('distance', { km: formatNumber(km, { decimals: kmDecimals(km) }) }),
    [tCompare, formatNumber],
  );
  const sitingIndicators = siting.data?.available ? siting.data.indicators : null;
  const analysisWaiting = registryShown
    ? !registryDetail.data || !analysisView
    : Boolean(analysisDef?.needsSiting) && !sitingIndicators;
  const analysisFailed = registryShown
    ? registryDetail.isError || registryList.isError
    : Boolean(analysisDef?.needsSiting) && (siting.isError || siting.data?.available === false);
  const analysisUf = scope === '31' ? '31' : SAO_PAULO_UF;
  const registryDetailData = registryShown ? registryDetail.data ?? null : null;
  const analysisResult = useMemo(() => {
    // Served already classified: the server cut the classes per state.
    if (registryDetailData) return registryResult(registryDetailData, analysisUf);
    if (!analysisDef || analysisWaiting) return null;
    // Methane follows the scenario the map is on (N4 Real, N3 Ideal).
    const tier = SERVED_SOURCE_TIER[isServedScenario(mapScenario) ? mapScenario : 'real'];
    return classifyAnalysis(analysisDef, data?.features ?? [], analysisUf, sitingIndicators, `ch4_${tier}_m3_year`);
  }, [registryDetailData, analysisDef, analysisWaiting, data, analysisUf, sitingIndicators, mapScenario]);
  const analysisFillFor = useMemo(() => {
    if (!analysisResult) return null;
    const palette = daltonic ? 'cvd' : 'default';
    return (code: string) => {
      const row = analysisResult.byCode.get(code);
      return row ? analysisFill(row.cell, palette) : undefined;
    };
  }, [analysisResult, daltonic]);
  // The municipality Cruzar marks, outlined on the map in place of the profile's.
  const crossPickFeature = useMemo(
    () => (crossOn && crossPick && data
      ? data.features.find((f) => String(f.properties?.ibge_code) === crossPick) ?? null
      : null),
    [crossOn, crossPick, data],
  );
  const highlighted = crossOn ? crossPickFeature : selectedMunicipality;

  const crossPicked = useMemo((): CrossPicked | null => {
    // Nothing to say until the reading is in: a loading analysis is not "no data".
    if (!crossPick || !data || !analysisResult) return null;
    const feature = data.features.find((f) => String(f.properties?.ibge_code) === crossPick);
    if (!feature) return null;
    const name = feature.properties?.name ?? crossPick;
    if (crossPick.slice(0, 2) !== analysisUf) return { name, status: 'outside', cell: null };
    const cell = analysisResult?.byCode.get(crossPick)?.cell ?? null;
    return { name, status: cell === null ? 'no_data' : 'cell', cell };
  }, [crossPick, data, analysisUf, analysisResult]);

  // ── Gather: the catchment around the plant ────────────────────────────────
  // A link by municipality (?hub=) puts the plant on its centroid until a
  // click moves it.
  const gatherAt = useMemo<LandAroundPoint | null>(() => {
    if (gatherPoint) return gatherPoint;
    if (!gatherHub || !data) return null;
    const hub = data.features.find((f) => String(f.properties?.ibge_code) === gatherHub);
    const centre = hub ? centroidOf(hub) : null;
    return centre ? { lat: centre.lat, lng: centre.lng } : null;
  }, [gatherPoint, gatherHub, data]);
  const gatherResult = useMemo(
    () => (gatherOn && toolAccess === 'allowed' && gatherAt && data
      ? gatherAround(data.features, gatherAt, gatherRadius, mapScenario)
      : null),
    [gatherOn, toolAccess, gatherAt, gatherRadius, data, mapScenario],
  );
  const gatherPlace = useMemo(() => {
    if (!gatherOn || !gatherAt || !data) return null;
    return placeOf(data.features, gatherAt)?.properties?.name ?? null;
  }, [gatherOn, gatherAt, data]);

  // ── Find similar: the twelve most like the picked municipality ────────────
  // The land cover query is Compare's (same key), so switching between the two
  // tools does not fetch it twice.
  const similarAllowed = similarOn && toolAccess === 'allowed';
  const similarLandCover = useMunicipalityLandCover(LATEST_LAND_COVER_YEAR, similarAllowed);
  const similarProfiles = useMemo(
    () => (similarAllowed && data && similarLandCover.data?.available
      ? buildProfiles(data.features, similarLandCover.data)
      : null),
    [similarAllowed, data, similarLandCover.data],
  );
  const similarResult = useMemo(
    () => (similarProfiles && similarOf ? findSimilar(similarProfiles, similarOf, similarWithin) : null),
    [similarProfiles, similarOf, similarWithin],
  );
  const similarDataState = similarLandCover.data?.available === false ? 'unavailable' : figureState(similarLandCover);
  const featureByCode = useMemo(
    () => new Map((data?.features ?? []).map((f) => [String(f.properties?.ibge_code), f])),
    [data],
  );
  const similarOfName = similarOf ? featureByCode.get(similarOf)?.properties?.name ?? null : null;
  const similarBiomethaneOf = useCallback((code: string) => {
    const props = featureByCode.get(code)?.properties;
    return props ? getBiomethaneScenarioValue(props, mapScenario).value : null;
  }, [featureByCode, mapScenario]);
  // A row opens that municipality's profile, which takes the tool's place.
  const openSimilar = useCallback((code: string) => {
    const feature = featureByCode.get(code);
    if (!feature) return;
    closeTool();
    selectMunicipality(feature, true);
  }, [featureByCode, closeTool, selectMunicipality]);

  // ── Truck reach: where a truck gets from the picked site ──────────────────
  // The sites are public; the routes need an approved sign-in. The choropleth
  // stays, quieter, so the roads read over it.
  const truckAllowed = truckOn && toolAccess === 'allowed';
  const truckSites = useTruckSites(truckOn);
  const truckReach = useTruckReach(truckSite, truckAllowed);
  const truckSiteList = truckSites.data?.available ? truckSites.data.sites : NO_TRUCK_SITES;
  const truckData = truckAllowed && isTruckReachData(truckReach.data) && truckReach.data.site.site_id === truckSite
    ? truckReach.data
    : null;
  const truckPicked = useMemo(
    () => truckData?.site ?? truckSiteList.find((s) => s.site_id === truckSite) ?? null,
    [truckData, truckSiteList, truckSite],
  );
  let truckState: TruckReachState = 'loading';
  if (truckSites.data?.available === false || (truckReach.data && !isTruckReachData(truckReach.data))) truckState = 'unavailable';
  else if (truckReach.isError) truckState = /HTTP 404/.test(truckReach.error?.message ?? '') ? 'not_found' : 'failed';
  else if (truckData) truckState = 'ready';
  const truckSummary = useMemo(
    () => (truckData && data ? summarizeTruckReach(truckData, truckLimit, data.features, truckSiteList) : null),
    [truckData, truckLimit, data, truckSiteList],
  );
  const describeTruckSite = useCallback(
    (site: TruckSite) => t('truck.site_tip', { name: site.name, kind: t(`truck.kinds.${site.kind}`), town: site.municipality }),
    [t],
  );
  const pickTruckSite = useCallback((siteId: string) => {
    if (toolAccess === 'allowed') setTruckSite(siteId);
  }, [toolAccess]);

  // ── Pontos and Símbolos: the amounts of the state in view, by origin ───────
  // The same features the old heat and bubble views drew: the scope's state,
  // after the filters. Built only while the view is on.
  const magnitudeFeatures = useMemo(() => {
    const source = filteredData || scaledData || data;
    if (!source) return [];
    const inState = scope === '31' ? isMinasGerais : isSaoPaulo;
    return source.features.filter((f) => inState(f.properties?.ibge_code));
  }, [filteredData, scaledData, data, scope]);
  const amountMetric = isAmountMetric(displayMetric);
  const magnitudeCtx = useMemo(
    () => ({ biomassType, selectedResidues, scenario: mapScenario }),
    [biomassType, selectedResidues, mapScenario],
  );
  const dotsView = useMemo(
    () => (visualizationMode === 'dots' && amountMetric ? buildDots(magnitudeFeatures, displayMetric, magnitudeCtx) : null),
    [visualizationMode, amountMetric, magnitudeFeatures, displayMetric, magnitudeCtx],
  );
  const symbolsView = useMemo(
    () => (visualizationMode === 'symbols' && amountMetric ? buildSymbols(magnitudeFeatures, displayMetric, magnitudeCtx) : null),
    [visualizationMode, amountMetric, magnitudeFeatures, displayMetric, magnitudeCtx],
  );
  // Under the marks the municipalities are flat context: one pale fill, their
  // outlines, and the usual hover and click. Outside the state in view they
  // keep the background style.
  const contextFill = useMemo(() => {
    const prefix = scope === '31' ? '31' : '35';
    return (code: string) => (code.startsWith(prefix) ? CONTEXT_FILL : undefined);
  }, [scope]);

  // ── Guard states ────────────────────────────────────────────────────────────
  if (!isMounted) return <MapLoadingSkeleton />;
  // Only the first load: React Query keeps `data` during a background
  // refetch, so the map stays mounted (view, tools and selection intact).
  if (loading) return <MapLoadingSkeleton />;

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
  const mgDisplayData: MunicipalityCollection = {
    ...displayData,
    features: displayData.features.filter((feature) => isMinasGerais(feature.properties?.ibge_code)),
  };
  const activeStateData = scope === '31' ? mgDisplayData : spDisplayData;
  const betaCount = mgDisplayData.features.length;
  const isMgScope = scope === '31';
  const activeScopeCount = activeStateData.features.length;
  const infraAlertCards = infrastructureAlerts.map(status => (
    <div
      key={status.layerType}
      className="rounded-lg border border-amber-300 bg-amber-50/95 px-3 py-2 text-xs text-amber-900 shadow-lg backdrop-blur"
      role="status"
    >
      <p className="font-semibold">
        {t('layerAlert.unavailable', { layer: getLayerLabel(status.layerType) })}
      </p>
      <p className="mt-1 leading-snug">
        {status.state === 'error' ? t('layerAlert.error') : t('layerAlert.empty')}
      </p>
    </div>
  ));
  // The search finds every municipality of the state, not only those the
  // filters left painted: a city without the selected residue still exists,
  // and picking it outlines it and opens its profile all the same.
  const searchFeatures = (scaledData ?? data)?.features.filter((f) => {
    const code = f.properties?.ibge_code;
    return isPublicMapMunicipality(code) && (scope === SCOPE_BRAZIL || ufOf(code) === scope);
  }) ?? [];
  const activeScopeTotal = isMgScope ? MG_MUNICIPALITY_COUNT : SP_MUNICIPALITY_COUNT;
  const activeStateName = getState(scope)?.nome ?? 'São Paulo'; // i18n-exempt: proper noun

  const activeBasemap = BASEMAPS[basemap];

  return (
    <div className="flex w-full h-full">
      {/* ── Desktop Persistent Sidebar ── */}
      {isMounted && (
        <DesktopLeftPanel
          selectedResidues={selectedResidues}
          onResiduesChange={handleResiduesChange}
          biomassType={biomassType}
          onBiomassTypeChange={handleBiomassTypeChange}
          visualizationMode={visualizationMode}
          onVisualizationModeChange={handleVisualizationModeChange}
          opacity={opacity}
          onOpacityChange={handleOpacityChange}
          layers={namedLayers}
          onLayerToggle={handleLayerToggle}
          municipalityCount={activeScopeCount}
          totalMunicipalities={activeScopeTotal}
          betaMunicipalityCount={!isMgScope && showNationalBeta ? betaCount : 0}
          onOpenExport={() => setShowExport(true)}
          displayMetric={displayMetric}
          onDisplayMetricChange={handleDisplayMetricChange}
          cnMatrix={cnMatrix}
          colorMode={colorMode}
          onColorModeChange={setColorMode}
          residueBreakdownAvailable={residueBreakdownAvailable}
          availableResidueCategories={availableResidueCategories}
          scopeUf={isMgScope ? 'MG' : 'SP'}
          scenario={mapScenario}
          onApplyPreset={handleApplyPreset}
          activePresetId={activePresetId}
          activeAnalysis={analysisShown}
        />
      )}

      {/* ── Map area (flex-1 fills remaining width) ── */}
      {/* `isolate` keeps Leaflet's internal panes (z-index 400–700) inside their
          own stacking context. Without it they escape into the page's root
          context — no ancestor here creates one — and outrank the sticky header
          at z-50: the header's account dropdown rendered correctly but was
          painted over by the map, leaving a few visible pixels and no reachable
          "sign out". */}
      <div className="relative isolate flex-1 min-w-0 h-full">

        {/* Data-issue banner: floats over the (always-rendered) base map.
            Keeps the raw error message + reload affordance the old
            full-screen card had, without hiding the map. */}
        {(error || noData) && (
          <div
            role="alert"
            className="surface-light absolute top-16 left-1/2 z-[1001] w-[min(92%,560px)] -translate-x-1/2 border border-line border-l-2 border-l-terra-900 bg-paper-raised/95 p-4 shadow-xl backdrop-blur md:top-16"
          >
            <div className="flex items-start gap-3">
              <CircleAlert aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-terra-900" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-terra-900">
                  {error ? t('errors.loadingError') : t('errors.noData')}
                </p>
                {error && (
                  <p className="mt-1 break-words font-mono text-xs text-ink-muted">
                    {error.message}
                  </p>
                )}
              </div>
              <button
                onClick={() => window.location.reload()}
                className="btn-secondary shrink-0 px-4 py-2 text-sm"
              >
                {error ? t('errors.reloadPage') : t('errors.tryAgain')}
              </button>
            </div>
          </div>
        )}

        {/* ── Thematic maps ribbon — phones only. Their chips are the
            navigation there. From md up the same maps live in one button in the
            top row (ThematicMapMenu below), so the map has one row of controls
            over it instead of two. Both carry the tour's "map-themes" anchor;
            the tour points at whichever is on screen. ── */}
        <div data-tour="map-themes" className="absolute top-0 inset-x-0 z-[1002] md:hidden">
          {isMounted && (
            <ThematicMapBar
              activePresetId={activePresetId}
              onApplyPreset={handleApplyPreset}
              disabledBiomassTypes={[]}
              disabledResidues={isMgScope ? ['aquaculture', 'rpo', 'sewage'] : []}
              collapsed={thematicBarCollapsed}
              onToggleCollapsed={() => setThematicBarCollapsed((c) => !c)}
            />
          )}
        </div>

        {/* ── The top row: one row of controls over the map.
            Left: search, state (SP or the MG pilot) and, from md up, the
            thematic maps. Right: scenario (md up; on phones it lives in the
            bottom sheet) and basemap. On phones the row sits under the ribbon
            and the basemap keeps its corner; on a desktop too narrow for both
            groups the right one wraps under, aligned right, instead of
            overlapping the left. The compass is gone: this map never rotates. */}
        <div ref={topRowRef} className="pointer-events-none absolute top-14 left-2 right-2 z-[1000] flex flex-nowrap items-start justify-between gap-2 md:top-3 md:left-3 md:right-3 md:flex-wrap [&>*]:pointer-events-auto">
        <div className="flex min-w-0 flex-1 flex-wrap items-start gap-2 md:flex-none">
          <MapMunicipalitySearch
            features={searchFeatures}
            selected={highlighted}
            onSelect={(feature) => {
              // With Compare open the search fills A or B, as a click does.
              if (compareOn) {
                if (toolAccess === 'allowed' && feature?.properties?.ibge_code != null) searchCompare(String(feature.properties.ibge_code));
                return;
              }
              // With Gather open it puts the plant at the municipality's centre.
              if (gatherOn) {
                const centre = feature ? centroidOf(feature) : null;
                if (toolAccess === 'allowed' && centre) {
                  setGatherHub(null);
                  setGatherPoint({ lat: centre.lat, lng: centre.lng });
                }
                return;
              }
              // With Find similar open it picks the municipality, as a click does.
              if (similarOn) {
                if (toolAccess === 'allowed' && feature?.properties?.ibge_code != null) pickSimilar(String(feature.properties.ibge_code));
                return;
              }
              // With Cruzar open it marks the municipality's cell, and the map
              // outlines it and goes there, as for a profile picked by search.
              if (crossOn) {
                if (feature?.properties?.ibge_code != null) {
                  setCrossPick(String(feature.properties.ibge_code));
                  setFitKey((k) => k + 1);
                }
                return;
              }
              // Picking a municipality opens its profile, which takes the
              // place of the open tool's window.
              if (activeTool) closeTool();
              selectMunicipality(feature, true);
            }}
            onClear={() => (crossOn ? setCrossPick(null) : selectMunicipality(null))}
          />
          <div data-tour="map-scope">
            <ScopeSwitcher
              scope={scope}
              onScopeChange={handleScopeChange}
              count={activeScopeCount}
            />
          </div>
          {/* The click tools: each answers a click on the map in its own way. */}
          {isMounted && (
            <div data-tour="map-tools">
              <MapToolsMenu tools={toolsOnOffer} active={activeTool} onSelect={selectTool} />
            </div>
          )}
          {isMounted && (
            <div data-tour="map-themes" className="hidden md:block">
              <ThematicMapMenu
                activePresetId={activePresetId}
                onApplyPreset={handleApplyPreset}
                disabledBiomassTypes={[]}
                disabledResidues={isMgScope ? ['aquaculture', 'rpo', 'sewage'] : []}
              />
            </div>
          )}
        </div>

        <div className="ml-auto flex shrink-0 items-start gap-2">
          {/* Each button is the full 44 px of the bar (the click target); the
              coloured pill inside it is only the look. */}
          <div data-tour="map-scenario" className="surface-light hidden h-11 md:flex items-stretch px-1 border border-line bg-paper-raised/95 shadow-md backdrop-blur">
            <span className="hidden items-center px-2 text-[11px] font-semibold text-gray-500 2xl:flex">{t('scenario_label')}</span>
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
                aria-pressed={mapScenario === key}
                className="group flex items-center px-0.5 focus:outline-none"
              >
                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors group-focus-visible:ring-2 group-focus-visible:ring-terra-600 ${
                    mapScenario === key ? 'text-white shadow-sm' : 'text-gray-600 group-hover:bg-gray-100'
                  }`}
                  style={mapScenario === key ? { backgroundColor: color } : undefined}
                >
                  {t(`scenario_${key}`)}
                </span>
              </button>
            ))}
            <span className="mx-0.5 my-auto h-4 w-px bg-gray-200" aria-hidden="true" />
            <button
              type="button"
              onClick={toggleDaltonic}
              aria-pressed={daltonic}
              // Below 2xl only the eye shows; the name stays for screen readers.
              aria-label={t('daltonic.toggle')}
              title={t('daltonic.title')}
              className="group flex items-center px-0.5 focus:outline-none"
            >
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors group-focus-visible:ring-2 group-focus-visible:ring-terra-600 ${
                  daltonic ? 'bg-slate-700 text-white shadow-sm' : 'text-gray-600 group-hover:bg-gray-100'
                }`}
              >
                👁<span className="hidden 2xl:inline"> {t('daltonic.toggle')}</span>
              </span>
            </button>
          </div>
          {isMounted && (
            <div data-tour="map-basemap">
              <BasemapControl value={basemap} onChange={setBasemap} />
            </div>
          )}
          {/* Opens Metaninho's guided tour at any time. */}
          {isMounted && <MapTourButton />}
        </div>
        {/* Layer alerts (md up): a full-width line of the row, so they land
            under the controls on one line or two. Status only, no clicks: the
            line lets clicks through to the map. */}
        {infrastructureAlerts.length > 0 && (
          <div className="hidden basis-full justify-end md:flex !pointer-events-none">
            <div className="max-w-sm space-y-2">{infraAlertCards}</div>
          </div>
        )}
        </div>{/* end top row */}

        {/* First visit: Metaninho offers the guided tour. */}
        {isMounted && <MapTour />}

        {/* Keyboard instructions for the interactive map (WCAG 2.1.1). */}
        <p id="map-keyboard-help" className="sr-only">{t('map_keyboard_help')}</p>

        {/* ARIA attributes live on a wrapper div: react-leaflet's MapContainer
            forwards unknown props to Leaflet's options, not the DOM. */}
        <div
          role="application"
          aria-label={t('map_aria_label', { state: activeStateName })}
          aria-describedby="map-keyboard-help"
          className="pilar-primary-map"
          style={MAP_CONTAINER_STYLE}
        >
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          zoomControl={false}
          scrollWheelZoom={true}
          // Gentle wheel zoom. Leaflet rounds each wheel step UP to the next
          // zoomSnap, so with its defaults (snap 1, 60 px per level) one notch of
          // a mouse wheel moved two whole levels — the map grew 4x at once. With
          // a 0.1 snap and 300 px per level a notch moves about 0.3 of a level;
          // a trackpad, which sends many small deltas, glides. zoomDelta stays at
          // its default 1: it is the step of the +/− buttons and the keyboard, not
          // of the wheel. The canvas renderer draws fractional zoom fine.
          zoomSnap={0.1}
          wheelPxPerZoomLevel={300}
          // Canvas renderer: one <canvas> instead of one SVG node per polygon.
          // SVG re-transformed every municipality path on each zoom frame (the
          // source of the zoom stutter); canvas redraws once per frame and is
          // the required headroom for the national dataset — now 5,571 polygons
          // — until the MapLibre migration (roadmap §3.3).
          preferCanvas={true}
          style={MAP_CONTAINER_STYLE}
        >
          {/* Basemap — switchable (Mapa / Satélite / Terreno).
              The `key` forces a clean re-fetch when the source changes.
              Only satellite has a labels overlay (BasemapLabels): its imagery
              has no names. The other bases print their own, which show through
              the see-through fill; a second set would double every name. */}
          <TileLayer
            key={basemap}
            attribution={activeBasemap.attribution}
            url={activeBasemap.url}
            maxZoom={activeBasemap.maxZoom}
          />
          {activeBasemap.labelsUrl && (
            <BasemapLabels key={`${basemap}-labels`} url={activeBasemap.labelsUrl} maxZoom={activeBasemap.maxZoom} />
          )}

          {/* Metric scale bar (km only — imperial off). */}
          <ScaleControl position="bottomleft" imperial={false} metric={true} />
          <ZoomControl position="bottomleft" />

          <ScopeViewController center={mapCenter} zoom={mapZoom} />
          <MapResizeWatcher />
          <InfraPane />



          {/* Municipality Layer */}
          {showMunicipalityFill && displayData && (
            <>
              {visualizationMode === 'choropleth' || visualizationMode === 'clusters' ? (
                <MunicipalityLayer
                  data={displayData}
                  opacity={visualizationMode === 'clusters' ? 0.4 : truckOn ? Math.min(opacity, 0.35) : opacity}
                  biomassType={biomassType}
                  selectedResidues={selectedResidues}
                  displayMetric={displayMetric}
                  colorMode={colorMode}
                  mapScenario={mapScenario}
                  daltonic={daltonic}
                  scaleBreaks={scaleBreaks}
                  showNationalBeta={showNationalBeta}
                  paintBetaData={isMgScope || showNationalBeta}
                  fillOverride={visualizationMode === 'choropleth' ? analysisFillFor : null}
                  onMunicipalityClick={visualizationMode === 'clusters' ? undefined : handleMunicipalityClick}
                  onMunicipalityHover={visualizationMode === 'clusters' ? undefined : handleMunicipalityHover}
                />
              ) : (
                <>
                  <MunicipalityLayer
                    data={displayData}
                    opacity={truckOn ? 0.35 : 0.7}
                    biomassType={biomassType}
                    selectedResidues={selectedResidues}
                    displayMetric={displayMetric}
                    colorMode={colorMode}
                    mapScenario={mapScenario}
                    daltonic={daltonic}
                    scaleBreaks={scaleBreaks}
                    showNationalBeta={showNationalBeta}
                    paintBetaData={isMgScope || showNationalBeta}
                    fillOverride={contextFill}
                    onMunicipalityClick={handleMunicipalityClick}
                    onMunicipalityHover={handleMunicipalityHover}
                  />
                  {dotsView && <DotDensityLayer dots={dotsView.dots} />}
                  {symbolsView && <SectorSymbolLayer items={symbolsView.items} maxValue={symbolsView.maxValue} />}
                </>
              )}
            </>
          )}

          {/* C/N Choropleth overlay — hidden when cluster mode is active */}
          {/* Both beta choropleths follow the scope selector: the typology table
              they read covers SP+MG (1498 rows), so pinning them to SP left the
              MG scope painting nothing at all while the legend still announced
              the full SP+MG counts. */}
          {isCnMode && !fillHiddenByTool && !typologyLoading && activeStateData && (
            <CnChoroLayer geoJsonData={activeStateData} cnByIbge={cnByIbge} />
          )}

          {isTypologyMode && !fillHiddenByTool && !typologyLoading && activeStateData && (
            <TypologyChoroLayer
              geoJsonData={activeStateData}
              typologyMap={typologyMap}
              mode={colorMode === 'tipologia' ? 'tipologia' : 'regime'}
              highlightClass={highlightClass}
            />
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
          <MunicipalityHighlight feature={highlighted} fitKey={fitKey} />
          {isMounted && (
            <LandAroundLayer
              active={landOn}
              point={landOn && toolAccess === 'allowed' ? landPoint : null}
              radiusKm={landRadius}
              onPick={handleLandPick}
              openedFromLink={arrivalTool === 'land'}
            />
          )}
          {isMounted && gatherOn && (
            <GatherLayer
              active={gatherOn}
              point={toolAccess === 'allowed' ? gatherAt : null}
              radiusKm={gatherRadius}
              result={gatherResult}
              features={data?.features ?? []}
              onPick={handleGatherPick}
              openedFromLink={arrivalTool === 'gather'}
            />
          )}
          {isMounted && compareOn && filteredData && (
            <CompareLayer
              features={filteredData.features}
              allFeatures={data?.features ?? filteredData.features}
              pair={comparePair}
              interactive={toolAccess === 'allowed'}
              onPick={pickCompare}
              distanceKm={compareDistanceKm}
              distanceLabel={compareDistanceLabel}
              openedFromLink={arrivalTool === 'compare'}
            />
          )}
          {isMounted && similarOn && filteredData && (
            <SimilarLayer
              features={filteredData.features}
              allFeatures={data?.features ?? filteredData.features}
              result={toolAccess === 'allowed' ? similarResult : null}
              hovered={toolAccess === 'allowed' ? similarHovered : null}
              interactive={toolAccess === 'allowed'}
              onPick={pickSimilar}
              openedFromLink={arrivalTool === 'similar'}
            />
          )}
          {isMounted && truckOn && (
            <TruckReachLayer
              sites={truckSiteList}
              interactive={toolAccess === 'allowed'}
              selected={truckAllowed ? truckSite : null}
              openedWith={arrivalTool === 'truck' ? initialTools.truck.site : null}
              data={truckData}
              hovered={truckAllowed ? truckHovered : null}
              limit={truckLimit}
              showCircle={truckCircle && truckData !== null}
              features={data?.features ?? []}
              describe={describeTruckSite}
              onPick={pickTruckSite}
            />
          )}
        </MapContainer>
        </div>

        {/* Overlays — all absolute-positioned within the map area */}
        {/* Phones: under the top row. From md up the alerts ride inside the top
            row (below), so they sit under the controls however the row wraps. */}
        {infrastructureAlerts.length > 0 && (
          <div className="absolute top-28 right-4 z-[450] max-w-sm space-y-2 md:hidden">
            {infraAlertCards}
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

        {/* The windows slide in from their edge and leave the same way
            (MapPresence keeps each one on screen for its exit). */}
        {isMounted && (
          <MapPresence show={selectedMunicipality !== null}>
            <MunicipalityProfilePanel
              municipality={selectedMunicipality}
              onClose={() => selectMunicipality(null)}
              visible={selectedMunicipality !== null}
              metric={displayMetric}
              scenario={mapScenario}
              features={data?.features}
            />
          </MapPresence>
        )}

        {isMounted && (
          <MapPresence show={landOn}>
          <LandAround
            point={landPoint}
            radius={landRadius}
            access={toolAccess}
            onRadiusChange={setLandRadius}
            onClose={closeTool}
          />
          </MapPresence>
        )}

        {isMounted && (
          <MapPresence show={crossOn}>
          <CrossWindow
            access={toolAccess}
            active={analysisShown ?? (toolAccess === 'allowed' ? null : analysisChosen)}
            onChoose={handleAnalysisChange}
            onClose={closeTool}
            result={analysisResult}
            loading={analysisWaiting && !analysisFailed}
            failed={analysisFailed}
            palette={daltonic ? 'cvd' : 'default'}
            stateLabel={activeStateName}
            picked={crossPicked}
            registry={registryViews}
            unavailable={analysisUnavailable}
            loginAnalysis={requestedRegistryRef}
          />
          </MapPresence>
        )}

        {isMounted && (
          <MapPresence show={gatherOn}>
          <GatherWindow
            access={toolAccess}
            point={gatherAt}
            place={gatherPlace}
            radius={gatherRadius}
            onRadiusChange={setGatherRadius}
            result={gatherResult}
            scenarioLabel={t(isServedScenario(mapScenario) ? `scenario_${mapScenario}` : 'scenario_real')}
            onClose={closeTool}
          />
          </MapPresence>
        )}

        {isMounted && (
          <MapPresence show={similarOn}>
          <SimilarWindow
            access={toolAccess}
            of={similarOf}
            ofName={similarOfName}
            within={similarWithin}
            onWithinChange={changeSimilarWithin}
            dataState={similarDataState}
            result={toolAccess === 'allowed' ? similarResult : null}
            biomethaneOf={similarBiomethaneOf}
            scenarioLabel={t(isServedScenario(mapScenario) ? `scenario_${mapScenario}` : 'scenario_real')}
            onHover={setSimilarHovered}
            onOpen={openSimilar}
            onClose={closeTool}
          />
          </MapPresence>
        )}

        {isMounted && (
          <MapPresence show={truckOn}>
          <TruckReachWindow
            access={toolAccess}
            siteId={truckSite}
            site={truckPicked}
            state={truckState}
            summary={truckSummary}
            limit={truckLimit}
            onLimitChange={setTruckLimit}
            showCircle={truckCircle}
            onCircleChange={setTruckCircle}
            onPickSite={pickTruckSite}
            onHoverSite={setTruckHovered}
            onClose={closeTool}
          />
          </MapPresence>
        )}

        {isMounted && (
          <MapPresence show={compareOn}>
          <Compare
            access={toolAccess}
            pair={comparePair}
            features={data?.features ?? []}
            scenario={mapScenario}
            siting={siting.data?.available ? siting.data.indicators : null}
            sitingState={figureState(siting)}
            landCover={compareLandCover.data}
            landCoverState={landCoverFigureState(compareLandCover)}
            distanceKm={compareDistanceKm}
            onRemove={pickCompare}
            onClose={closeTool}
          />
          </MapPresence>
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

        {/* Typology / regime legend — BETA. Counts come from the rows actually
            painted, not from a hardcoded list and not from the whole table: the
            old K4 legend hardcoded four totals that no longer matched anything
            the map was showing, and counting the full SP+MG table reintroduced
            the same disagreement one scope down — SP showed "Pecuário 599" over
            a map that is overwhelmingly sugarcane (SP's real split is 354
            cana / 77 pecuário). Click a class to isolate it. */}
        {isTypologyMode && !fillHiddenByTool && Object.keys(typologyMap).length > 0 && (() => {
          const isTip = colorMode === 'tipologia';
          const order = isTip ? TIPOLOGIA_ORDER : REGIME_ORDER;
          const colors: Record<string, string> = isTip ? TIPOLOGIA_COLORS : REGIME_COLORS;
          const counts = new Map<string, number>();
          activeStateData.features.forEach((feature) => {
            const row = typologyMap[String(feature.properties?.ibge_code ?? '')];
            if (!row) return;
            // regime_harm, not regime: the latter is the arithmetic-mean
            // classification that #213 withdrew. Null outside SP, and those
            // municipalities simply do not count toward any class.
            const key = isTip ? row.tipologia : row.regime_harm;
            if (!key) return;
            counts.set(key, (counts.get(key) ?? 0) + 1);
          });
          // Nothing classified in this scope — render no legend rather than an
          // empty framed box.
          if (counts.size === 0) return null;

          return (
            <div className="bg-white rounded-lg px-3 py-2 shadow-lg border border-gray-200 text-xs max-w-[15rem]">
              <p className="font-semibold text-gray-900 mb-1.5 flex items-center gap-1.5">
                {t(isTip ? 'colorModes.tipologia' : 'colorModes.regime')}
                <span className="rounded bg-amber-100 px-1 py-0.5 text-[9px] font-bold uppercase text-amber-800">{tCommon('badge.beta')}</span>
              </p>
              {order.filter((label) => counts.has(label)).map((label) => {
                const on = highlightClass === label;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setHighlightClass(on ? null : label)}
                    className={`flex w-full items-center gap-2 rounded px-1 py-0.5 text-left transition-colors ${
                      on ? 'bg-gray-100 font-semibold' : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: colors[label] }} />
                    <span className="text-gray-800 truncate">{typologyLabel(isTip, label)}</span>
                    <span className="text-gray-500 ml-auto pl-2 tabular-nums">{counts.get(label)}</span>
                  </button>
                );
              })}
              {highlightClass && (
                <button
                  type="button"
                  onClick={() => setHighlightClass(null)}
                  className="mt-1 w-full border-t border-gray-100 pt-1 text-[10px] font-semibold text-terra-800 hover:underline"
                >
                  {t('colorModes.clear_filter')}
                </button>
              )}
            </div>
          );
        })()}

        {/* C/N Profile legend — shown when cn_profile color mode is active */}
        {colorMode === 'cn_profile' && (
          <div className="bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-gray-200 text-xs">
            <p className="font-semibold text-gray-700 mb-1.5">{t('cnLegend.title')}</p>
            {CN_LEGEND_ROWS.map(({ color, labelKey }) => (
              <div key={labelKey} className="flex items-center gap-2 py-0.5">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <span className={labelKey === 'optimal' ? 'font-semibold text-gray-900' : 'text-gray-700'}>
                  {t(`cnLegend.${labelKey}`)}
                </span>
              </div>
            ))}
          </div>
        )}

        {isMounted && <BiomassLayerLegend layerIds={visiblePlantLayerIds} />}

        </div>{/* end bottom-left overlay stack */}

        {/* ── Bottom-right overlay stack (same non-overlapping flow) ──
            While the profile panel is open as a right-hand drawer (landscape,
            which covers every desktop) the stack moves left of it, so the
            legend stays readable next to the municipality it explains. The
            offset is the drawer's width in MunicipalityProfilePanel plus 1rem. */}
        <div
          data-testid="map-bottom-right-stack"
          className={`absolute bottom-20 right-2 z-[500] flex flex-col-reverse items-end gap-2 pointer-events-none md:bottom-4 md:right-4 [&>*]:pointer-events-auto transition-[right] duration-200 ${
            selectedMunicipality ? 'landscape:right-[calc(min(88vw,360px)+1rem)]' : ''
          }`}
        >

        {/* Legends.
            Desktop: shown in full. Mobile: the choropleth legend collapses to a
            chip (tap to expand) so it doesn't crowd the screen. */}
        {/* With Cruzar open to an approved account the reading sits in its
            window instead; anyone else sees the window's gate, so the map
            keeps its key here. */}
        {showMunicipalityFill && analysisView && !(crossOn && (registryShown || toolAccess === 'allowed')) && visualizationMode === 'choropleth' && (
          <div data-tour="map-legend">
            <BivariateLegend
              view={analysisView}
              result={analysisResult}
              loading={analysisWaiting && !analysisFailed}
              failed={analysisFailed}
              palette={daltonic ? 'cvd' : 'default'}
              stateLabel={activeStateName}
              onClose={() => handleAnalysisChange(null)}
            />
          </div>
        )}
        {showMunicipalityFill && !analysisShown && visualizationMode !== 'clusters' && (
          visualizationMode === 'choropleth' ? (
            colorMode === 'biogas' ? (
              <>
                {/* Desktop — always expanded */}
                <div data-tour="map-legend" className="hidden md:block">
                  <MapLegend displayMetric={displayMetric} daltonic={daltonic} showNationalBeta={showNationalBeta} scenario={mapScenario} scaleBreaks={scaleBreaks} scopeLabel={activeStateName} betaScope={isMgScope} />
                </div>
                {/* Mobile — chip + expandable legend */}
                <div data-tour="map-legend" className="md:hidden">
                  {legendOpenMobile ? (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setLegendOpenMobile(false)}
                        aria-label={t('legend.collapse')}
                        className="absolute -top-2 -right-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white shadow ring-1 ring-black/10"
                      >
                        <span className="block text-base leading-none text-gray-500">×</span>
                      </button>
                      <MapLegend displayMetric={displayMetric} daltonic={daltonic} showNationalBeta={showNationalBeta} scenario={mapScenario} scaleBreaks={scaleBreaks} scopeLabel={activeStateName} betaScope={isMgScope} />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setLegendOpenMobile(true)}
                      className="surface-light flex min-h-11 items-center gap-1.5 px-3.5 py-2.5 border border-line bg-paper-raised/95 text-xs font-semibold text-gray-700 shadow-md backdrop-blur"
                    >
                      <span className="h-2.5 w-8 rounded-full bg-gradient-to-r from-[#eff3ff] via-[#6baed6] to-[#08519c]" aria-hidden="true" />
                      {t('legend.title')}
                    </button>
                  )}
                </div>
              </>
            ) : null
          ) : (
            <MagnitudeLegend
              view={visualizationMode === 'symbols' ? 'symbols' : 'dots'}
              metric={displayMetric}
              biomassType={biomassType}
              selectedResidues={selectedResidues}
              amount={amountMetric}
              facts={dotsView ?? symbolsView ?? { sectors: [], unsplit: 0, count: 0 }}
              dotValue={dotsView?.dotValue}
              maxValue={symbolsView?.maxValue}
            />
          )
        )}

        {visualizationMode === 'clusters' && clusterLoading && isMounted && (
          <div role="status" className="surface-light flex items-center gap-2 border border-line bg-paper-raised/95 px-3 py-2 text-xs text-ink shadow-md backdrop-blur-sm">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> {t('clusters_loading')}
          </div>
        )}

        {isMounted && <MapBiomasLegend visible={showMapBiomasLegend} />}

        </div>{/* end bottom-right overlay stack */}
      </div>

      {/* ── Mobile Tab Bar + Sheet (hidden on desktop, fixed position) ── */}
      {isMounted && (
        <MobileBottomSheet
          scopeUf={isMgScope ? 'MG' : 'SP'}
          selectedResidues={selectedResidues}
          onResiduesChange={handleResiduesChange}
          biomassType={biomassType}
          onBiomassTypeChange={handleBiomassTypeChange}
          visualizationMode={visualizationMode}
          onVisualizationModeChange={handleVisualizationModeChange}
          opacity={opacity}
          onOpacityChange={handleOpacityChange}
          layers={namedLayers}
          onLayerToggle={handleLayerToggle}
          municipalityCount={activeScopeCount}
          totalMunicipalities={activeScopeTotal}
          displayMetric={displayMetric}
          onDisplayMetricChange={handleDisplayMetricChange}
          cnMatrix={cnMatrix}
          colorMode={colorMode}
          onColorModeChange={setColorMode}
          residueBreakdownAvailable={residueBreakdownAvailable}
          availableResidueCategories={availableResidueCategories}
          scenario={mapScenario}
          onScenarioChange={setMapScenario}
          daltonic={daltonic}
          onToggleDaltonic={toggleDaltonic}
        />
      )}
    </div>
  );
}

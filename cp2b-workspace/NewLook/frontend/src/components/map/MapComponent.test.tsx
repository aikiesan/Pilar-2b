/**
 * Comprehensive tests for MapComponent
 * Tests loading states, filtering, layer management, and visualization modes
 */

import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MapComponent from './MapComponent';
import type { MunicipalityCollection, MunicipalityFeature, MunicipalityProperties } from '@/types/geospatial';
import type { FilterCriteria } from '@/types/map';
import { municipalityProps } from '@/test/fixtures/municipality';

// next/dynamic's loader returns a Promise (import('./X')), so calling it and
// using the result as a component yields "Element type is invalid". The dynamic
// children are individually jest.mock'd below, so render a lightweight stub that
// resolves to the mocked module's default once the import settles.
jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: (loader: () => Promise<any>) => {
    const ReactLib = require('react');
    const Dynamic = (props: any) => {
      const [Comp, setComp] = ReactLib.useState(null);
      ReactLib.useEffect(() => {
        let active = true;
        Promise.resolve(loader())
          .then((mod: any) => { if (active) setComp(() => (mod && mod.default) || mod); })
          .catch(() => {});
        return () => { active = false; };
      }, []);
      return Comp ? ReactLib.createElement(Comp, props) : null;
    };
    return Dynamic;
  },
}));

// Resolve real pt-BR strings so text assertions (e.g. "Erro ao Carregar Mapa")
// match the shipped copy rather than raw keys.
jest.mock('next-intl', () => jest.requireActual('@/test/mocks/next-intl-real'));

// Mock Leaflet CSS imports
jest.mock('leaflet/dist/leaflet.css', () => ({}));
jest.mock('@/lib/leafletConfig', () => ({}));

// Mock useGeospatialData hook.
// MapComponent also calls useCodigestionClusters, useResidueCNMatrix and
// useIntermediateRegionsGeoJSON — they must be stubbed too or the component
// throws "useCodigestionClusters is not a function" before render.
const mockUseGeospatialData = jest.fn();
const mockUseSitingIndicators = jest.fn((_enabled: boolean) => ({ data: undefined, isError: false }));
const mockUseLandCover = jest.fn((_enabled: boolean) => ({ data: undefined, isError: false }));
jest.mock('@/hooks/useGeospatialData', () => ({
  useGeospatialData: () => mockUseGeospatialData(),
  useCodigestionClusters: () => ({ data: null, loading: false, error: null, isFetching: false, refetch: jest.fn() }),
  useResidueCNMatrix: () => ({ data: null, loading: false, error: null }),
  useIntermediateRegionsGeoJSON: () => ({ data: null, loading: false, error: null, isFetching: false, refetch: jest.fn() }),
  // Tooltip/panel top up from the per-municipality detail endpoint; the
  // collection is served slim (fields=map).
  useMunicipalityMetrics: () => ({ data: undefined, isLoading: false, error: null }),
  useSitingIndicators: (enabled: boolean) => mockUseSitingIndicators(enabled),
  useMunicipalityLandCover: (_year: number, enabled: boolean) => mockUseLandCover(enabled),
}));

// MAP_ANALYSES_ENABLED is a build-time constant; a getter lets each test pick it.
let mockAnalysesEnabled = false;
jest.mock('@/lib/featureFlags', () => ({
  ...jest.requireActual('@/lib/featureFlags'),
  get MAP_ANALYSES_ENABLED() { return mockAnalysesEnabled; },
}));

// The beta typology hook lives in a separate module and also calls React
// Query — stub it so the component doesn't need a QueryClientProvider.
jest.mock('@/hooks/useTypologyProfiles', () => ({
  useTypologyProfiles: () => ({ typology: [], typologyMap: {}, isLoading: false, error: null }),
}));

// Mock child components to simplify testing
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }: any) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  ScaleControl: () => <div data-testid="scale-control" />,
  ZoomControl: () => <div data-testid="zoom-control" />,
  // ScopeViewController calls flyTo/setView; InfraPane calls getPane/createPane.
  useMap: () => ({
    flyTo: jest.fn(),
    setView: jest.fn(),
    getPane: jest.fn(() => undefined),
    createPane: jest.fn(() => ({ style: {} })),
  }),
}));

// The outline of the selected municipality: which one, and whether the view was asked to frame it.
jest.mock('./MunicipalityHighlight', () => ({
  __esModule: true,
  default: ({ feature, fitKey }: any) =>
    feature ? (
      <div data-testid="municipality-highlight" data-ibge={feature.properties.ibge_code} data-fit={fitKey} />
    ) : null,
}));

// Who may use the click tools; each test sets it.
let mockToolAccess: 'allowed' | 'sign_in' | 'pending' | 'loading' = 'allowed';
jest.mock('@/lib/mapToolAccess', () => ({
  useMapToolAccess: () => mockToolAccess,
}));

// The Land around window renders for real; its sign-in link is a plain anchor.
jest.mock('@/navigation', () => ({
  Link: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// The analysis behind the Land around window.
const mockAnalyzeProximity = jest.fn();
jest.mock('@/services/proximityApi', () => ({
  ...jest.requireActual('@/services/proximityApi'),
  analyzeProximity: (...args: unknown[]) => mockAnalyzeProximity(...args),
}));

// Compare on the map: the pair it draws, and a stand-in for a click on Ribeirão Preto.
jest.mock('./CompareLayer', () => ({
  __esModule: true,
  default: ({ pair, interactive, onPick }: any) => (
    <div data-testid="compare-layer" data-pair={pair.join(',')} data-interactive={String(interactive)}>
      <button type="button" onClick={() => onPick('3543402')}>compare click</button>
    </div>
  ),
}));

// The circle on the map: which point it draws, and a stand-in for a map click.
jest.mock('./LandAroundLayer', () => ({
  __esModule: true,
  default: ({ active, point, radiusKm, onPick }: any) => (
    <div
      data-testid="land-around-layer"
      data-active={String(active)}
      data-point={point ? `${point.lat},${point.lng}` : ''}
      data-radius={radiusKm}
    >
      <button type="button" onClick={() => onPick({ lat: -21.18, lng: -47.81 })}>map click</button>
    </div>
  ),
}));

jest.mock('./MunicipalityLayer', () => ({
  __esModule: true,
  default: ({ data, biomassType, opacity, paintBetaData, onMunicipalityClick }: any) => (
    <div
      data-testid="municipality-layer"
      data-biomass-type={biomassType}
      data-opacity={opacity}
      data-paint-beta={String(Boolean(paintBetaData))}
    >
      {data?.features?.length || 0} municipalities
      {onMunicipalityClick && data?.features?.[0] && (
        <button type="button" onClick={() => onMunicipalityClick(data.features[0])}>municipality click</button>
      )}
    </div>
  ),
}));

jest.mock('./DotDensityLayer', () => ({
  __esModule: true,
  default: ({ dots }: any) => <div data-testid="dot-layer" data-dots={dots.length} />,
  dotRadius: () => 1,
}));

jest.mock('./SectorSymbolLayer', () => ({
  __esModule: true,
  default: ({ items }: any) => <div data-testid="symbol-layer" data-items={items.length} />,
}));

jest.mock('./InfrastructureLayer', () => ({
  __esModule: true,
  default: ({ layerType }: any) => (
    <div data-testid={`infrastructure-layer-${layerType}`}>{layerType}</div>
  ),
}));

jest.mock('./MapBiomasLayer', () => ({
  __esModule: true,
  default: ({ opacity }: any) => (
    <div data-testid="mapbiomas-layer" data-opacity={opacity} />
  ),
}));

// DesktopLeftPanel receives the search/visualization-mode/layer props, so it's
// the one mocked with interactive elements below.

jest.mock('./DesktopLeftPanel', () => ({
  __esModule: true,
  default: ({
    layers, onLayerToggle, municipalityCount, totalMunicipalities,
    visualizationMode, onVisualizationModeChange, activeAnalysis, onAnalysisChange,
  }: any) => (
    <div
      data-testid="desktop-left-panel"
      data-has-analyses={String(Boolean(onAnalysisChange))}
      data-active-analysis={activeAnalysis ?? ''}
    >
      <div data-testid="municipality-count">{municipalityCount} / {totalMunicipalities}</div>
      <select
        data-testid="visualization-mode-select"
        value={visualizationMode}
        onChange={(e) => onVisualizationModeChange(e.target.value)}
      >
        <option value="choropleth">Choropleth</option>
        <option value="dots">Dots</option>
        <option value="symbols">Symbols</option>
      </select>
      {layers.map((layer: any) => (
        <button
          key={layer.id}
          data-testid={`layer-toggle-${layer.id}`}
          onClick={() => onLayerToggle(layer.id, !layer.visible)}
        >
          {layer.name}: {layer.visible ? 'ON' : 'OFF'}
        </button>
      ))}
    </div>
  ),
}));

jest.mock('./MapLegend', () => ({
  __esModule: true,
  default: () => <div data-testid="map-legend">Legend</div>,
}));

jest.mock('./MagnitudeLegend', () => ({
  __esModule: true,
  default: ({ view, facts }: any) => <div data-testid="magnitude-legend" data-view={view} data-count={facts.count} />,
}));

jest.mock('./MapBiomasLegend', () => ({
  __esModule: true,
  default: ({ visible }: any) => visible ? <div data-testid="mapbiomas-legend">MapBiomas Legend</div> : null,
}));

jest.mock('./BiomassLayerLegend', () => ({
  __esModule: true,
  // Mirrors the real contract: the legend is a function of which plant layers
  // are on, and names them, so a test can assert WHICH types are explained.
  default: ({ layerIds = [] }: any) =>
    layerIds.length > 0 ? (
      <div data-testid="biomass-layer-legend">{layerIds.join(',')}</div>
    ) : null,
}));

jest.mock('./MapLoadingSkeleton', () => ({
  __esModule: true,
  default: () => <div data-testid="loading-skeleton">Loading...</div>,
}));

// Sample test data
const createMunicipalityFeature = (overrides: Partial<MunicipalityProperties> = {}): MunicipalityFeature => ({
  type: 'Feature',
  geometry: {
    type: 'Polygon',
    coordinates: [[[-46.0, -23.0], [-46.1, -23.0], [-46.1, -23.1], [-46.0, -23.1], [-46.0, -23.0]]],
  },
  properties: municipalityProps({
    ibge_code: '3550308',
    name: 'São Paulo',
    intermediate_region: 'São Paulo',
    total_biogas_m3_year: 100_000_000,
    agricultural_biogas_m3_year: 30_000_000,
    livestock_biogas_m3_year: 40_000_000,
    urban_biogas_m3_year: 30_000_000,
    sugarcane_biogas_m3_year: 20_000_000,
    soybean_biogas_m3_year: 5_000_000,
    corn_biogas_m3_year: 3_000_000,
    coffee_biogas_m3_year: 2_000_000,
    citrus_biogas_m3_year: 0,
    cattle_biogas_m3_year: 25_000_000,
    swine_biogas_m3_year: 10_000_000,
    poultry_biogas_m3_year: 5_000_000,
    aquaculture_biogas_m3_year: 0,
    rsu_biogas_m3_year: 20_000_000,
    rpo_biogas_m3_year: 10_000_000,
    ...overrides,
  }),
});

/** Filters as the map page starts them, with the criteria a test sets on top. */
const filters = (criteria: Partial<FilterCriteria>): FilterCriteria => ({
  residueTypes: [],
  regions: [],
  searchQuery: '',
  nearRailway: false,
  nearPipeline: false,
  nearSubstation: false,
  proximityRadius: 50,
  ...criteria,
});

const createMunicipalityCollection = (features: MunicipalityFeature[]): MunicipalityCollection => ({
  type: 'FeatureCollection',
  features,
});

describe('MapComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    // MapComponent syncs filter/visualization state into the URL via
    // history.replaceState. jsdom's window.location persists across tests
    // within this file, so a previous test's URL params would otherwise leak
    // into the next test's initial state (read via readURLParam on mount).
    window.history.replaceState(null, '', '/');
    mockAnalysesEnabled = false;
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Loading State', () => {
    it('should display loading skeleton when loading', () => {
      mockUseGeospatialData.mockReturnValue({
        data: null,
        loading: true,
        error: null,
      });

      render(<MapComponent />);

      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should display loading skeleton during initial rendering', async () => {
      const sampleData = createMunicipalityCollection([
        createMunicipalityFeature(),
      ]);

      mockUseGeospatialData.mockReturnValue({
        data: sampleData,
        loading: false,
        error: null,
      });

      render(<MapComponent />);

      // Initially shows loading skeleton during rendering phase
      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();

      // After rendering timer completes
      act(() => { jest.advanceTimersByTime(1500); });
      await waitFor(() => {
        expect(screen.queryByTestId('loading-skeleton')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error State', () => {
    it('should display error message when fetch fails', () => {
      mockUseGeospatialData.mockReturnValue({
        data: null,
        loading: false,
        error: new Error('Backend API não está respondendo'),
      });

      render(<MapComponent />);

      expect(screen.getByText('Erro ao Carregar Mapa')).toBeInTheDocument();
      expect(screen.getByText('Backend API não está respondendo')).toBeInTheDocument();
    });

    it('should display the raw error message', () => {
      mockUseGeospatialData.mockReturnValue({
        data: null,
        loading: false,
        error: new Error('Network error'),
      });

      render(<MapComponent />);

      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    it('should show reload button on error', () => {
      mockUseGeospatialData.mockReturnValue({
        data: null,
        loading: false,
        error: new Error('Network error'),
      });

      render(<MapComponent />);

      const reloadButton = screen.getByRole('button', { name: /Recarregar Página/i });
      expect(reloadButton).toBeInTheDocument();
    });
  });

  describe('No Data State', () => {
    it('should display "no data" message when features are empty', () => {
      mockUseGeospatialData.mockReturnValue({
        data: createMunicipalityCollection([]),
        loading: false,
        error: null,
      });

      render(<MapComponent />);
      act(() => { jest.advanceTimersByTime(1500); });

      expect(screen.getByText('Nenhum Dado Disponível')).toBeInTheDocument();
    });

    it('should show "try again" button when no data', () => {
      mockUseGeospatialData.mockReturnValue({
        data: null,
        loading: false,
        error: null,
      });

      render(<MapComponent />);

      const tryAgainButton = screen.getByRole('button', { name: /Tentar Novamente/i });
      expect(tryAgainButton).toBeInTheDocument();
    });
  });

  describe('Successful Rendering', () => {
    const sampleMunicipalities = createMunicipalityCollection([
      createMunicipalityFeature({ name: 'São Paulo', ibge_code: '3550308' }),
      createMunicipalityFeature({ name: 'Campinas', ibge_code: '3509502' }),
      createMunicipalityFeature({ name: 'Santos', ibge_code: '3548500' }),
    ]);

    beforeEach(() => {
      mockUseGeospatialData.mockReturnValue({
        data: sampleMunicipalities,
        loading: false,
        error: null,
      });
    });

    it('should render map container with correct data', async () => {
      render(<MapComponent />);

      // Fast-forward rendering timer
      act(() => { jest.advanceTimersByTime(1500); });

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
        // The basemap, plus its labels overlay drawn above the choropleth.
        expect(screen.getAllByTestId('tile-layer')).toHaveLength(2);
      });
    });

    it('should render municipality layer by default', async () => {
      render(<MapComponent />);
      act(() => { jest.advanceTimersByTime(1500); });

      await waitFor(() => {
        expect(screen.getByTestId('municipality-layer')).toBeInTheDocument();
        expect(screen.getByText('3 municipalities')).toBeInTheDocument();
      });
    });

    it('should render all panel components', async () => {
      render(<MapComponent />);
      act(() => { jest.advanceTimersByTime(1500); });

      await waitFor(() => {
        expect(screen.getByTestId('desktop-left-panel')).toBeInTheDocument();
        expect(screen.getByTestId('map-legend')).toBeInTheDocument();
      });
    });

    it('should pass correct props to municipality layer', async () => {
      render(<MapComponent biomassType="agricultural" opacity={0.5} />);
      act(() => { jest.advanceTimersByTime(1500); });

      await waitFor(() => {
        const layer = screen.getByTestId('municipality-layer');
        expect(layer).toHaveAttribute('data-biomass-type', 'agricultural');
        expect(layer).toHaveAttribute('data-opacity', '0.5');
      });
    });
  });

  describe('Visualization Mode Switching', () => {
    const sampleData = createMunicipalityCollection([
      createMunicipalityFeature(),
    ]);

    beforeEach(() => {
      mockUseGeospatialData.mockReturnValue({
        data: sampleData,
        loading: false,
        error: null,
      });
    });

    it('should render choropleth by default', async () => {
      render(<MapComponent />);
      act(() => { jest.advanceTimersByTime(1500); });

      await waitFor(() => {
        expect(screen.getByTestId('municipality-layer')).toBeInTheDocument();
        expect(screen.getByTestId('map-legend')).toBeInTheDocument();
        expect(screen.queryByTestId('dot-layer')).not.toBeInTheDocument();
      });
    });

    it('switches to Pontos: the dots over the municipalities as context, with their key', async () => {
      const user = userEvent.setup({ delay: null });
      render(<MapComponent />);
      act(() => { jest.advanceTimersByTime(1500); });

      await waitFor(() => {
        expect(screen.getByTestId('visualization-mode-select')).toBeInTheDocument();
      });

      await user.selectOptions(screen.getByTestId('visualization-mode-select'), 'dots');

      await waitFor(() => {
        expect(screen.getByTestId('dot-layer')).toBeInTheDocument();
        expect(screen.getByTestId('magnitude-legend')).toHaveAttribute('data-view', 'dots');
        // The outlines stay, for hover and click.
        expect(screen.getByTestId('municipality-layer')).toBeInTheDocument();
        expect(screen.queryByTestId('map-legend')).not.toBeInTheDocument();
      });
      expect(window.location.search).toContain('mode=dots');

      await user.selectOptions(screen.getByTestId('visualization-mode-select'), 'symbols');
      await waitFor(() => {
        expect(screen.getByTestId('symbol-layer')).toBeInTheDocument();
        expect(screen.queryByTestId('dot-layer')).not.toBeInTheDocument();
        expect(screen.getByTestId('magnitude-legend')).toHaveAttribute('data-view', 'symbols');
      });
    });

    it('opens an old heat or bubble link in the view that replaced it', async () => {
      window.history.replaceState(null, '', '/map?mode=bubble');
      render(<MapComponent />);
      act(() => { jest.advanceTimersByTime(1500); });
      expect(await screen.findByTestId('symbol-layer')).toBeInTheDocument();
    });
  });

  describe('Layer Management', () => {
    const sampleData = createMunicipalityCollection([
      createMunicipalityFeature(),
    ]);

    beforeEach(() => {
      mockUseGeospatialData.mockReturnValue({
        data: sampleData,
        loading: false,
        error: null,
      });
    });

    it('should toggle MapBiomas layer', async () => {
      const user = userEvent.setup({ delay: null });
      render(<MapComponent />);
      act(() => { jest.advanceTimersByTime(1500); });

      await waitFor(() => {
        expect(screen.queryByTestId('mapbiomas-layer')).not.toBeInTheDocument();
      });

      const mapbiomasToggle = await waitFor(() => screen.getByTestId('layer-toggle-mapbiomas'));
      await user.click(mapbiomasToggle);

      await waitFor(() => {
        expect(screen.getByTestId('mapbiomas-layer')).toBeInTheDocument();
        expect(screen.getByTestId('mapbiomas-legend')).toBeInTheDocument();
      });
    });

    it('should toggle biogas-plants layer and legend', async () => {
      const user = userEvent.setup({ delay: null });
      render(<MapComponent />);
      act(() => { jest.advanceTimersByTime(1500); });

      await waitFor(() => {
        expect(screen.queryByTestId('infrastructure-layer-biogas_plant')).not.toBeInTheDocument();
      });

      const biogasToggle = await waitFor(() => screen.getByTestId('layer-toggle-biogas_plant'));
      await user.click(biogasToggle);

      await waitFor(() => {
        expect(screen.getByTestId('infrastructure-layer-biogas_plant')).toBeInTheDocument();
        expect(screen.getByTestId('biomass-layer-legend')).toHaveTextContent('biogas_plant');
      });
    });

    // The legend was wired to a single `if (layerId === 'biogas_plant')`, so
    // these three drew markers with nothing on screen to decode them.
    it.each([
      'ethanol_plant',
      'biomass_thermal_plant',
      'biodiesel_plant',
    ])('should render the plants legend for %s', async (layerId) => {
      const user = userEvent.setup({ delay: null });
      render(<MapComponent />);
      act(() => { jest.advanceTimersByTime(1500); });

      expect(screen.queryByTestId('biomass-layer-legend')).not.toBeInTheDocument();

      const toggle = await waitFor(() => screen.getByTestId(`layer-toggle-${layerId}`));
      await user.click(toggle);

      await waitFor(() => {
        expect(screen.getByTestId(`infrastructure-layer-${layerId}`)).toBeInTheDocument();
        expect(screen.getByTestId('biomass-layer-legend')).toHaveTextContent(layerId);
      });
    });

    // ...and the legend must describe only what is on: turning a plant layer
    // off has to take its entry away, not leave a fixed list of four.
    it('should drop a plant type from the legend when its layer is switched off', async () => {
      const user = userEvent.setup({ delay: null });
      render(<MapComponent />);
      act(() => { jest.advanceTimersByTime(1500); });

      const ethanolToggle = await waitFor(() => screen.getByTestId('layer-toggle-ethanol_plant'));
      await user.click(ethanolToggle);
      await waitFor(() => {
        expect(screen.getByTestId('biomass-layer-legend')).toHaveTextContent('ethanol_plant');
      });

      await user.click(ethanolToggle);
      await waitFor(() => {
        expect(screen.queryByTestId('biomass-layer-legend')).not.toBeInTheDocument();
      });
    });

    it('should toggle infrastructure layers', async () => {
      const user = userEvent.setup({ delay: null });
      render(<MapComponent />);
      act(() => { jest.advanceTimersByTime(1500); });

      const pipelinesToggle = await waitFor(() => screen.getByTestId('layer-toggle-gas_pipeline_transport'));
      await user.click(pipelinesToggle);

      await waitFor(() => {
        expect(screen.getByTestId('infrastructure-layer-gas_pipeline_transport')).toBeInTheDocument();
      });

      const substationsToggle = await waitFor(() => screen.getByTestId('layer-toggle-substation'));
      await user.click(substationsToggle);

      await waitFor(() => {
        expect(screen.getByTestId('infrastructure-layer-substation')).toBeInTheDocument();
      });
    });

    it('should show/hide MapBiomas legend with layer toggle', async () => {
      const user = userEvent.setup({ delay: null });
      render(<MapComponent />);
      act(() => { jest.advanceTimersByTime(1500); });

      // Initially no legend
      await waitFor(() => {
        expect(screen.queryByTestId('mapbiomas-legend')).not.toBeInTheDocument();
      });

      // Turn on MapBiomas layer
      const mapbiomasToggle = await waitFor(() => screen.getByTestId('layer-toggle-mapbiomas'));
      await user.click(mapbiomasToggle);

      await waitFor(() => {
        expect(screen.getByTestId('mapbiomas-legend')).toBeInTheDocument();
      });

      // Turn off MapBiomas layer
      await user.click(mapbiomasToggle);

      await waitFor(() => {
        expect(screen.queryByTestId('mapbiomas-legend')).not.toBeInTheDocument();
      });
    });
  });

  describe('Filtering Functionality', () => {
    const createFilteredData = () => createMunicipalityCollection([
      createMunicipalityFeature({
        name: 'São Paulo',
        ibge_code: '3550308',
        total_biogas_m3_year: 100_000_000,
        agricultural_biogas_m3_year: 30_000_000,
        sugarcane_biogas_m3_year: 20_000_000,
        intermediate_region: 'São Paulo',
      }),
      createMunicipalityFeature({
        name: 'Campinas',
        ibge_code: '3509502',
        total_biogas_m3_year: 50_000_000,
        agricultural_biogas_m3_year: 40_000_000,
        sugarcane_biogas_m3_year: 0,
        intermediate_region: 'Campinas',
      }),
      createMunicipalityFeature({
        name: 'Santos',
        ibge_code: '3548500',
        total_biogas_m3_year: 30_000_000,
        agricultural_biogas_m3_year: 5_000_000,
        sugarcane_biogas_m3_year: 0,
        intermediate_region: 'Santos',
      }),
    ]);

    beforeEach(() => {
      mockUseGeospatialData.mockReturnValue({
        data: createFilteredData(),
        loading: false,
        error: null,
      });
    });

    // The search selects; it never filters. A municipality named on load (by
    // name or IBGE code) is outlined and framed, its neighbours stay on the map,
    // and the URL keeps it as ?m=<ibge>.
    it.each([
      ['its name', 'campinas'],
      ['its IBGE code', '3509502'],
    ])('selects a municipality named by %s, keeping every other one on the map', async (_label, query) => {
      render(<MapComponent searchQuery={query} />);
      act(() => { jest.advanceTimersByTime(1500); });

      await waitFor(() => {
        expect(screen.getByTestId('municipality-highlight')).toHaveAttribute('data-ibge', '3509502');
      });
      expect(screen.getByTestId('municipality-highlight')).toHaveAttribute('data-fit', '1');
      expect(screen.getByTestId('municipality-layer')).toHaveTextContent('3 municipalities');
      expect(window.location.search).toContain('m=3509502');
    });

    it('selects the municipality an ?m= link names', async () => {
      window.history.replaceState(null, '', '/map?m=3548500');
      render(<MapComponent />);
      act(() => { jest.advanceTimersByTime(1500); });

      await waitFor(() => {
        expect(screen.getByTestId('municipality-highlight')).toHaveAttribute('data-ibge', '3548500');
      });
    });

    it('drops an unknown municipality quietly', async () => {
      render(<MapComponent searchQuery="Atlântida" />);
      act(() => { jest.advanceTimersByTime(1500); });

      await waitFor(() => {
        expect(screen.getByTestId('municipality-layer')).toHaveTextContent('3 municipalities');
      });
      expect(screen.queryByTestId('municipality-highlight')).not.toBeInTheDocument();
    });

    it('should filter by biogas range', async () => {
      render(
        <MapComponent
          activeFilters={filters({
            minBiogas: 40_000_000,
            maxBiogas: 150_000_000,
            searchQuery: '',
            residueTypes: [],
            regions: [],
          })}
        />
      );
      act(() => { jest.advanceTimersByTime(1500); });

      // Should show municipalities with biogas between 40M and 150M
      await waitFor(() => {
        expect(screen.getByTestId('municipality-layer')).toBeInTheDocument();
      });
    });

    it('should filter by residue types', async () => {
      render(
        <MapComponent
          activeFilters={filters({
            minBiogas: undefined,
            maxBiogas: undefined,
            searchQuery: '',
            residueTypes: ['agricultural'],
            regions: [],
          })}
        />
      );
      act(() => { jest.advanceTimersByTime(1500); });

      await waitFor(() => {
        expect(screen.getByTestId('municipality-layer')).toBeInTheDocument();
      });
    });

    it('should filter by regions', async () => {
      render(
        <MapComponent
          activeFilters={filters({
            minBiogas: undefined,
            maxBiogas: undefined,
            searchQuery: '',
            residueTypes: [],
            regions: ['São Paulo', 'Campinas'],
          })}
        />
      );
      act(() => { jest.advanceTimersByTime(1500); });

      await waitFor(() => {
        expect(screen.getByTestId('municipality-layer')).toBeInTheDocument();
      });
    });

    it('should show filtered count vs total count', async () => {
      render(
        <MapComponent
          activeFilters={filters({
            minBiogas: 60_000_000,
            maxBiogas: undefined,
            searchQuery: '',
            residueTypes: [],
            regions: [],
          })}
        />
      );
      act(() => { jest.advanceTimersByTime(1500); });

      // No scenario switch needed: the map now opens on "Real", and
      // applyScenarioToProps leaves props untouched for the served scenarios
      // (they carry their own ch4_cp2b_n4_* columns rather than scaling the legacy
      // ones). So the fixture's raw total_biogas_m3_year is what the minBiogas
      // filter compares against — which is what the removed "Médio Prazo" click
      // used to arrange.

      // 1 matching SP municipality out of the 645 that make up São Paulo.
      // The denominator is the SP universe (lib/mapScope.SP_MUNICIPALITY_COUNT),
      // not the fixture length: the panel reports coverage of São Paulo, and the
      // collection also carries non-SP municipalities that are excluded from it.
      await waitFor(() => {
        expect(screen.getByTestId('municipality-count')).toHaveTextContent('1 / 645');
      });
    });

    it('should combine multiple filters', async () => {
      render(
        <MapComponent
          activeFilters={filters({
            minBiogas: 50_000_000,
            maxBiogas: undefined,
            searchQuery: '',
            residueTypes: ['agricultural'],
            regions: ['São Paulo'],
          })}
        />
      );
      act(() => { jest.advanceTimersByTime(1500); });

      // Multiple filters should all apply
      await waitFor(() => {
        expect(screen.getByTestId('municipality-layer')).toBeInTheDocument();
      });
    });
  });

  // Two regressions that were invisible from inside the component: picking a
  // residue emptied the map instead of narrowing it, and the MG beta layer drew
  // nothing at all in the default (SP) scope.
  describe('Residue filter + MG beta layer', () => {
    const spWithCane = createMunicipalityFeature({
      ibge_code: '3505500',
      name: 'Barretos',
      ch4_cp2b_n4_m3_year: 1_000,
      ch4_cp2b_n4_sugarcane_m3_year: 600,
      ch4_cp2b_n4_cattle_m3_year: 400,
    });
    const spWithoutCane = createMunicipalityFeature({
      ibge_code: '3548500',
      name: 'Santos',
      ch4_cp2b_n4_m3_year: 500,
      ch4_cp2b_n4_rsu_m3_year: 500,
    });
    const betaMunicipality = createMunicipalityFeature({
      ibge_code: '3106200', // Belo Horizonte — MG, outside the canonical pipeline
      name: 'Belo Horizonte',
    });
    const disabledStateMunicipality = createMunicipalityFeature({
      ibge_code: '3304557',
      name: 'Rio de Janeiro',
    });

    beforeEach(() => {
      mockUseGeospatialData.mockReturnValue({
        data: createMunicipalityCollection([
          spWithCane,
          spWithoutCane,
          betaMunicipality,
          disabledStateMunicipality,
        ]),
        loading: false,
        error: null,
      });
    });

    it('draws the beta municipalities in the SP scope, where the toggle lives', async () => {
      // MG remains as beta context, while states outside the public SP+MG rollout
      // are removed even if a stale payload contains them. The pilot ships hidden,
      // so opt into it first -- SP is the default focus on load.
      render(<MapComponent />);
      act(() => { jest.advanceTimersByTime(1500); });

      await waitFor(() => {
        expect(screen.getByText('2 municipalities')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('layer-toggle-mg-beta'));

      await waitFor(() => {
        expect(screen.getByText('3 municipalities')).toBeInTheDocument();
        expect(screen.getByTestId('municipality-count')).toHaveTextContent('2 / 645');
      });
    });

    it('starts with the MG pilot hidden so São Paulo is the first focus', async () => {
      render(<MapComponent />);
      act(() => { jest.advanceTimersByTime(1500); });

      await waitFor(() => {
        expect(screen.getByTestId('layer-toggle-mg-beta')).toHaveTextContent('OFF');
      });
    });

    it('selects MG as an 853-municipality pilot scope', async () => {
      window.history.replaceState(null, '', '/?scope=31');
      render(<MapComponent />);
      act(() => { jest.advanceTimersByTime(1500); });

      await waitFor(() => {
        expect(screen.getByTestId('municipality-count')).toHaveTextContent('1 / 853');
        expect(screen.getByText('1 municipalities')).toBeInTheDocument();
      });
    });

    it('keeps the MG quantitative ramp active when its context toggle is off', async () => {
      window.history.replaceState(null, '', '/?scope=31&type=livestock');
      render(<MapComponent />);
      act(() => { jest.advanceTimersByTime(1500); });

      await waitFor(() => {
        expect(screen.getAllByTestId('municipality-layer')[0]).toHaveAttribute(
          'data-paint-beta',
          'true',
        );
      });

      fireEvent.click(screen.getByTestId('layer-toggle-mg-beta'));

      await waitFor(() => {
        expect(screen.getAllByTestId('municipality-layer')[0]).toHaveAttribute(
          'data-paint-beta',
          'true',
        );
      });
    });

    it('preserves a validated urban bookmark when MG opens', async () => {
      window.history.replaceState(
        null,
        '',
        '/?scope=31&type=urban&r=rsu,rpo,sewage&metric=methane_m3',
      );
      render(<MapComponent />);
      act(() => { jest.advanceTimersByTime(1500); });

      await waitFor(() => {
        expect(screen.getAllByTestId('municipality-layer')[0]).toHaveAttribute(
          'data-biomass-type',
          'urban',
        );
        expect(window.location.search).toContain('type=urban');
        expect(window.location.search).toContain('metric=methane_m3');
        expect(window.location.search).toContain('r=rsu');
        expect(window.location.search).not.toContain('rpo');
        expect(window.location.search).not.toContain('sewage');
      });
    });

    it('keeps the active sector and metric when switching to MG', async () => {
      window.history.replaceState(
        null,
        '',
        '/?type=urban&r=rsu,rpo,sewage&metric=methane_m3',
      );
      render(<MapComponent />);
      act(() => { jest.advanceTimersByTime(1500); });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /São Paulo SP/i })).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('button', { name: /São Paulo SP/i }));
      fireEvent.click(screen.getByRole('option', { name: /Minas Gerais/i }));

      await waitFor(() => {
        expect(window.location.search).toContain('scope=31');
        expect(window.location.search).toContain('type=urban');
        expect(window.location.search).toContain('metric=methane_m3');
        expect(window.location.search).toContain('r=rsu');
        expect(window.location.search).not.toContain('rpo');
        expect(window.location.search).not.toContain('sewage');
      });
    });

    it('narrows to the municipalities holding the selected residue', async () => {
      // Read from ?r= on mount, the same path a bookmarked filter takes.
      window.history.replaceState(null, '', '/?r=sugarcane');
      render(<MapComponent />);
      act(() => { jest.advanceTimersByTime(1500); });

      await waitFor(() => {
        expect(screen.getByTestId('municipality-count')).toHaveTextContent('1 / 645');
      });

      // The MG pilot is off on load, so opt in to assert the beta row's behaviour.
      fireEvent.click(screen.getByTestId('layer-toggle-mg-beta'));

      await waitFor(() => {
        // Barretos has a cane share, Santos does not; the beta row survives as
        // flat context because it has no per-residue breakdown to test.
        expect(screen.getByTestId('municipality-count')).toHaveTextContent('1 / 645');
        expect(screen.getByText('2 municipalities')).toBeInTheDocument();
      });
    });

    it('keeps every municipality when nothing is selected', async () => {
      render(<MapComponent />);
      act(() => { jest.advanceTimersByTime(1500); });

      await waitFor(() => {
        expect(screen.getByTestId('municipality-count')).toHaveTextContent('2 / 645');
      });
    });
  });

  describe('Props Handling', () => {
    const sampleData = createMunicipalityCollection([
      createMunicipalityFeature(),
    ]);

    beforeEach(() => {
      mockUseGeospatialData.mockReturnValue({
        data: sampleData,
        loading: false,
        error: null,
      });
    });

    it('should use default biomass type', async () => {
      render(<MapComponent />);
      act(() => { jest.advanceTimersByTime(1500); });

      await waitFor(() => {
        const layer = screen.getByTestId('municipality-layer');
        expect(layer).toHaveAttribute('data-biomass-type', 'total');
      });
    });

    it('should accept custom biomass type', async () => {
      render(<MapComponent biomassType="livestock" />);
      act(() => { jest.advanceTimersByTime(1500); });

      await waitFor(() => {
        const layer = screen.getByTestId('municipality-layer');
        expect(layer).toHaveAttribute('data-biomass-type', 'livestock');
      });
    });

    it('should use default opacity', async () => {
      render(<MapComponent />);
      act(() => { jest.advanceTimersByTime(1500); });

      await waitFor(() => {
        const layer = screen.getByTestId('municipality-layer');
        expect(layer).toHaveAttribute('data-opacity', '0.7');
      });
    });

    it('should accept custom opacity', async () => {
      render(<MapComponent opacity={0.9} />);
      act(() => { jest.advanceTimersByTime(1500); });

      await waitFor(() => {
        const layer = screen.getByTestId('municipality-layer');
        expect(layer).toHaveAttribute('data-opacity', '0.9');
      });
    });

    it('should handle callbacks for biomass type change', async () => {
      const handleBiomassTypeChange = jest.fn();
      render(<MapComponent onBiomassTypeChange={handleBiomassTypeChange} />);
      act(() => { jest.advanceTimersByTime(1500); });

      // Callback should be passed to DesktopLeftPanel
      await waitFor(() => {
        expect(screen.getByTestId('desktop-left-panel')).toBeInTheDocument();
      });
    });

    it('should handle callbacks for opacity change', async () => {
      const handleOpacityChange = jest.fn();
      render(<MapComponent onOpacityChange={handleOpacityChange} />);
      act(() => { jest.advanceTimersByTime(1500); });

      // Callback should be passed to DesktopLeftPanel
      await waitFor(() => {
        expect(screen.getByTestId('desktop-left-panel')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle null data gracefully', () => {
      mockUseGeospatialData.mockReturnValue({
        data: null,
        loading: false,
        error: null,
      });

      render(<MapComponent />);

      expect(screen.getByText('Nenhum Dado Disponível')).toBeInTheDocument();
    });

    it('should handle empty features array', () => {
      mockUseGeospatialData.mockReturnValue({
        data: createMunicipalityCollection([]),
        loading: false,
        error: null,
      });

      render(<MapComponent />);
      act(() => { jest.advanceTimersByTime(1500); });

      expect(screen.getByText('Nenhum Dado Disponível')).toBeInTheDocument();
    });

    it('should handle all filters resulting in no matches', async () => {
      mockUseGeospatialData.mockReturnValue({
        data: createMunicipalityCollection([
          createMunicipalityFeature({ total_biogas_m3_year: 10_000_000 }),
        ]),
        loading: false,
        error: null,
      });

      render(
        <MapComponent
          activeFilters={filters({
            minBiogas: 100_000_000, // No municipality meets this
            maxBiogas: undefined,
            searchQuery: '',
            residueTypes: [],
            regions: [],
          })}
        />
      );
      act(() => { jest.advanceTimersByTime(1500); });

      // See the note in "should show filtered count vs total count": the default
      // scenario is now "Real", which does not scale the legacy columns, so no
      // scenario switch is needed to read the fixture's raw values.

      // No match, against the fixed SP denominator.
      await waitFor(() => {
        expect(screen.getByTestId('municipality-count')).toHaveTextContent('0 / 645');
      });
    });
  });

  describe('Map analyses flag (MAP_ANALYSES_ENABLED)', () => {
    beforeEach(() => {
      mockUseGeospatialData.mockReturnValue({
        data: createMunicipalityCollection([createMunicipalityFeature()]),
        loading: false,
        error: null,
      });
    });

    it('hides the analyses and drops ?a= when the flag is off', async () => {
      window.history.replaceState(null, '', '/map?a=siting&m=3509502&scope=31');
      render(<MapComponent />);
      act(() => { jest.advanceTimersByTime(1500); });

      const panel = await screen.findByTestId('desktop-left-panel');
      expect(panel).toHaveAttribute('data-has-analyses', 'false');
      expect(panel).toHaveAttribute('data-active-analysis', '');
      await waitFor(() => expect(window.location.search).not.toMatch(/(^|[?&])a=/));
      expect(window.location.search).toContain('m=3509502');
      expect(window.location.search).toContain('scope=31');
      expect(mockUseSitingIndicators).not.toHaveBeenCalledWith(true);
    });

    it('opens the analysis from ?a= when the flag is on', async () => {
      mockAnalysesEnabled = true;
      window.history.replaceState(null, '', '/map?a=lacuna');
      render(<MapComponent />);
      act(() => { jest.advanceTimersByTime(1500); });

      const panel = await screen.findByTestId('desktop-left-panel');
      expect(panel).toHaveAttribute('data-has-analyses', 'true');
      expect(panel).toHaveAttribute('data-active-analysis', 'lacuna');
    });
  });

  describe('Keyboard', () => {
    beforeEach(() => {
      mockUseGeospatialData.mockReturnValue({
        data: createMunicipalityCollection([createMunicipalityFeature()]),
        loading: false,
        error: null,
      });
    });

    it('opens no tool on Ctrl+C or a plain C', async () => {
      render(<MapComponent />);
      act(() => { jest.advanceTimersByTime(1500); });
      await screen.findByRole('button', { name: 'Ferramentas' });

      fireEvent.keyDown(window, { key: 'c', ctrlKey: true });
      fireEvent.keyDown(window, { key: 'c' });
      fireEvent.keyDown(window, { key: 'C' });

      expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
      expect(window.location.search).not.toContain('tool=');
    });
  });

  describe('Land around', () => {
    const landResult = {
      analysis_id: 'a',
      request: { latitude: -21.18, longitude: -47.81, radius_km: 20 },
      results: {
        buffer_geometry: null,
        municipalities: [{ name: 'Ribeirão Preto', distance_km: 1 }],
        land_use: {
          total_area_km2: 700,
          by_class: { '20': { class_id: 20, name: 'Cana-de-açúcar', color: '#db7093', category: 'agricultural', pixel_count: 1, area_km2: 628.3, percent: 90 } },
          dominant_class: 'Cana-de-açúcar',
          agricultural_percent: 90,
        },
        infrastructure: [],
      },
      summary: { total_area_km2: 1256.6, total_municipalities: 1, total_population: 0, total_biogas_m3_year: 0, energy_potential_mwh_year: 0, radius_recommendation: 'optimal' },
      metadata: { analysis_timestamp: '', processing_time_ms: 1 },
    };

    beforeEach(() => {
      mockToolAccess = 'allowed';
      mockAnalyzeProximity.mockResolvedValue(landResult);
      mockUseGeospatialData.mockReturnValue({
        data: createMunicipalityCollection([createMunicipalityFeature()]),
        loading: false,
        error: null,
      });
    });

    // The Tools menu, closed and with no tool open.
    const menu = () => screen.getByRole('button', { name: 'Ferramentas' });
    const openLandAround = async () => {
      fireEvent.click(await screen.findByRole('button', { name: 'Ferramentas' }));
      fireEvent.click(await screen.findByRole('button', { name: 'Uso do solo no entorno' }));
    };

    it('turns on from the top row, keeps itself in the URL, and a click measures the land there', async () => {
      render(<MapComponent />);
      act(() => { jest.advanceTimersByTime(1500); });
      await openLandAround();

      expect(await screen.findByRole('complementary', { name: 'Uso do solo no entorno' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Ferramentas: Uso do solo no entorno' })).toBeInTheDocument();
      expect(window.location.search).toContain('tool=land');

      fireEvent.click(await screen.findByRole('button', { name: 'map click' }));
      expect(await screen.findByText('50% de lavouras')).toBeInTheDocument();
      expect(screen.getByTestId('land-around-layer')).toHaveAttribute('data-point', '-21.18,-47.81');
      expect(mockAnalyzeProximity).toHaveBeenCalledWith(expect.objectContaining({ latitude: -21.18, longitude: -47.81, radius_km: 20 }));
      expect(window.location.search).toContain('lat=-21.1800');
      expect(window.location.search).toContain('radius=20');
    });

    it('opens a shared link at its point and radius', async () => {
      window.history.replaceState(null, '', '/map?tool=land&lat=-21.18&lng=-47.81&radius=50');
      render(<MapComponent />);
      act(() => { jest.advanceTimersByTime(1500); });

      await waitFor(() => expect(mockAnalyzeProximity).toHaveBeenCalledWith(
        expect.objectContaining({ latitude: -21.18, longitude: -47.81, radius_km: 50 }),
      ));
      expect(await screen.findByRole('button', { name: '50 km', pressed: true })).toBeInTheDocument();
      expect(screen.getByTestId('land-around-layer')).toHaveAttribute('data-radius', '50');
    });

    it('asks a signed-out visitor to sign in, and their clicks draw nothing', async () => {
      mockToolAccess = 'sign_in';
      render(<MapComponent />);
      act(() => { jest.advanceTimersByTime(1500); });
      await openLandAround();

      expect(await screen.findByText('Entre para usar o Uso do solo no entorno')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'map click' }));
      expect(screen.getByTestId('land-around-layer')).toHaveAttribute('data-point', '');
      expect(mockAnalyzeProximity).not.toHaveBeenCalled();
    });

    it('hides the municipality shapes while it is on, so clicks reach the map, and brings them back', async () => {
      render(<MapComponent />);
      act(() => { jest.advanceTimersByTime(1500); });
      expect(await screen.findByTestId('municipality-layer')).toBeInTheDocument();

      await openLandAround();
      await waitFor(() => expect(screen.queryByTestId('municipality-layer')).not.toBeInTheDocument());

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(await screen.findByTestId('municipality-layer')).toBeInTheDocument();
    });

    it('closes on Escape and leaves the URL as it was', async () => {
      window.history.replaceState(null, '', '/map?tool=land&lat=-21.18&lng=-47.81&radius=20');
      render(<MapComponent />);
      act(() => { jest.advanceTimersByTime(1500); });
      expect(await screen.findByRole('complementary', { name: 'Uso do solo no entorno' })).toBeInTheDocument();

      fireEvent.keyDown(window, { key: 'Escape' });
      await waitFor(() => expect(screen.queryByRole('complementary', { name: 'Uso do solo no entorno' })).not.toBeInTheDocument());
      expect(window.location.search).not.toMatch(/tool|lat|lng|radius/);
      expect(menu()).toBeInTheDocument();
    });

    it('tells a visitor waiting for approval, and their clicks draw nothing', async () => {
      mockToolAccess = 'pending';
      window.history.replaceState(null, '', '/map?tool=land');
      render(<MapComponent />);
      act(() => { jest.advanceTimersByTime(1500); });

      expect(await screen.findByText('Seu pedido de acesso está em análise')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'map click' }));
      expect(screen.getByTestId('land-around-layer')).toHaveAttribute('data-point', '');
      expect(mockAnalyzeProximity).not.toHaveBeenCalled();
    });
  });

  describe('Tools menu', () => {
    beforeEach(() => {
      mockToolAccess = 'allowed';
      mockUseGeospatialData.mockReturnValue({
        data: createMunicipalityCollection([createMunicipalityFeature()]),
        loading: false,
        error: null,
      });
    });

    it.each([false, true])('offers the tools that are built (analyses on: %s)', async (analyses) => {
      mockAnalysesEnabled = analyses;
      render(<MapComponent />);
      act(() => { jest.advanceTimersByTime(1500); });
      fireEvent.click(await screen.findByRole('button', { name: 'Ferramentas' }));

      const list = await screen.findByRole('group', { name: 'Ferramentas do mapa' });
      const items = Array.from(list.querySelectorAll('button')).map((b) => b.getAttribute('aria-label'));
      // Compare waits for the analyses; Land around replaced a public page and
      // stays; Cruzar brings the analyses to approved accounts either way.
      expect(items).toEqual(
        analyses
          ? ['Uso do solo no entorno', 'Comparar', 'Cruzar dados']
          : ['Uso do solo no entorno', 'Cruzar dados'],
      );
    });

    it('opens Compare from a shared link once the analyses are on, keeping the pair', async () => {
      mockAnalysesEnabled = true;
      window.history.replaceState(null, '', '/map?tool=compare&pair=3509502,3550308&scope=35');
      render(<MapComponent />);
      act(() => { jest.advanceTimersByTime(1500); });

      expect(await screen.findByRole('complementary', { name: 'Comparar dois municípios' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Ferramentas: Comparar' })).toBeInTheDocument();
      expect(new URLSearchParams(window.location.search).get('pair')).toBe('3509502,3550308');

      // A third pick replaces B.
      fireEvent.click(screen.getByRole('button', { name: 'compare click' }));
      expect(screen.getByTestId('compare-layer')).toHaveAttribute('data-pair', '3509502,3543402');
      await waitFor(() => expect(new URLSearchParams(window.location.search).get('pair')).toBe('3509502,3543402'));
      mockAnalysesEnabled = false;
    });

    it('opens Cruzar from a link with the flag off and paints its analysis for an approved account', async () => {
      window.history.replaceState(null, '', '/map?tool=cross&a=codigestao');
      render(<MapComponent />);
      act(() => { jest.advanceTimersByTime(1500); });

      expect(await screen.findByRole('complementary', { name: 'Cruzar dois dados no mapa' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Com quem codigerir/, pressed: true })).toBeInTheDocument();
      expect(window.location.search).toContain('a=codigestao');
      expect(screen.getByTestId('desktop-left-panel')).toHaveAttribute('data-active-analysis', 'codigestao');
      // The reading sits in the window, not in the map corner too.
      expect(screen.getAllByRole('heading', { name: 'Onde resíduo agrícola e pecuário se encontram?' })).toHaveLength(1);

      // A click marks the municipality's cell instead of opening the profile.
      fireEvent.click(screen.getByRole('button', { name: 'municipality click' }));
      expect(await screen.findByText(/^São Paulo (está na célula marcada|não tem os dois dados)/)).toBeInTheDocument();
      expect(window.location.search).not.toMatch(/(^|[?&])m=/);
      // The map outlines the pick; a click leaves the view where it is.
      const outline = screen.getByTestId('municipality-highlight');
      expect(outline).toHaveAttribute('data-ibge', '3550308');
      expect(outline).toHaveAttribute('data-fit', '0');

      // Switching to the gap reads plants, a signed-in endpoint.
      fireEvent.click(screen.getByRole('button', { name: /Potencial sem planta/ }));
      await waitFor(() => expect(mockUseSitingIndicators).toHaveBeenCalledWith(true));
      expect(window.location.search).toContain('a=lacuna');

      // Closing the tool ends the analysis.
      fireEvent.keyDown(window, { key: 'Escape' });
      await waitFor(() => expect(window.location.search).not.toMatch(/tool=|(^|[?&])a=/));
    });

    it('asks a signed-out visitor to sign in to Cruzar and paints nothing', async () => {
      mockToolAccess = 'sign_in';
      window.history.replaceState(null, '', '/map?tool=cross&a=lacuna');
      render(<MapComponent />);
      act(() => { jest.advanceTimersByTime(1500); });

      expect(await screen.findByText('Entre para cruzar dados')).toBeInTheDocument();
      const next = new URL(screen.getByRole('link', { name: 'Entrar' }).getAttribute('href') ?? '', 'http://x').searchParams.get('next') ?? '';
      expect(next).toContain('tool=cross');
      expect(next).toContain('a=lacuna');
      expect(screen.queryByRole('button', { name: /Potencial sem planta/ })).not.toBeInTheDocument();
      expect(mockUseSitingIndicators).not.toHaveBeenCalledWith(true);
      expect(screen.getByTestId('desktop-left-panel')).toHaveAttribute('data-active-analysis', '');
    });

    it('opens nothing for a link to a tool not on offer, and drops it from the URL', async () => {
      window.history.replaceState(null, '', '/map?tool=compare&pair=3509502,3550308&scope=35');
      render(<MapComponent />);
      act(() => { jest.advanceTimersByTime(1500); });

      await screen.findByRole('button', { name: 'Ferramentas' });
      expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
      await waitFor(() => expect(window.location.search).not.toMatch(/tool|pair/));
      expect(window.location.search).toContain('scope=35');
    });

    it('sends a municipality click to the profile with no tool open, and opening a tool closes the profile', async () => {
      render(<MapComponent />);
      act(() => { jest.advanceTimersByTime(1500); });

      fireEvent.click(await screen.findByRole('button', { name: 'municipality click' }));
      await waitFor(() => expect(window.location.search).toMatch(/(^|[?&])m=/));

      fireEvent.click(screen.getByRole('button', { name: 'Ferramentas' }));
      fireEvent.click(await screen.findByRole('button', { name: 'Uso do solo no entorno' }));
      await waitFor(() => expect(window.location.search).not.toMatch(/(^|[?&])m=/));
      expect(window.location.search).toContain('tool=land');
      // The shapes step aside, so no click can reach the profile while the tool is open.
      expect(screen.queryByRole('button', { name: 'municipality click' })).not.toBeInTheDocument();
    });
  });
});

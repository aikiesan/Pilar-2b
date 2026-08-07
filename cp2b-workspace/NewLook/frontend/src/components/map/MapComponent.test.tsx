/**
 * Comprehensive tests for MapComponent
 * Tests loading states, filtering, layer management, and visualization modes
 */

import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MapComponent from './MapComponent';
import type { MunicipalityCollection, MunicipalityFeature } from '@/types/geospatial';

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

// Mock next-intl. Resolve real pt-BR strings for the component's namespace so
// text assertions (e.g. "Erro ao Carregar Mapa") match the shipped copy rather
// than raw keys.
jest.mock('next-intl', () => {
  const messages = require('../../../messages/pt-BR.json');
  return {
    useTranslations: (namespace?: string) => (key: string) => {
      const path = namespace ? `${namespace}.${key}` : key;
      const value = path.split('.').reduce((acc: any, part) => (acc == null ? acc : acc[part]), messages);
      return typeof value === 'string' ? value : key;
    },
  };
});

// Mock Leaflet CSS imports
jest.mock('leaflet/dist/leaflet.css', () => ({}));
jest.mock('@/lib/leafletConfig', () => ({}));

// Mock useGeospatialData hook.
// MapComponent also calls useCodigestionClusters, useResidueCNMatrix and
// useIntermediateRegionsGeoJSON — they must be stubbed too or the component
// throws "useCodigestionClusters is not a function" before render.
const mockUseGeospatialData = jest.fn();
jest.mock('@/hooks/useGeospatialData', () => ({
  useGeospatialData: () => mockUseGeospatialData(),
  useCodigestionClusters: () => ({ data: null, loading: false, error: null, isFetching: false, refetch: jest.fn() }),
  useResidueCNMatrix: () => ({ data: null, loading: false, error: null }),
  useIntermediateRegionsGeoJSON: () => ({ data: null, loading: false, error: null, isFetching: false, refetch: jest.fn() }),
  // Tooltip/panel top up from the per-municipality detail endpoint; the
  // collection is served slim (fields=map).
  useMunicipalityMetrics: () => ({ data: undefined, isLoading: false, error: null }),
}));

// useCnProfiles lives in a separate module and also calls React Query —
// stub it so the component doesn't need a QueryClientProvider.
jest.mock('@/hooks/useCnProfiles', () => ({
  useCnProfiles: () => ({ profiles: [], profilesMap: {}, isLoading: false, error: null }),
}));

// Mock child components to simplify testing
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }: any) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  ScaleControl: () => <div data-testid="scale-control" />,
  // ScopeViewController calls flyTo/setView; InfraPane calls getPane/createPane.
  useMap: () => ({
    flyTo: jest.fn(),
    setView: jest.fn(),
    getPane: jest.fn(() => undefined),
    createPane: jest.fn(() => ({ style: {} })),
  }),
}));

jest.mock('./MunicipalityLayer', () => ({
  __esModule: true,
  default: ({ data, biomassType, opacity }: any) => (
    <div data-testid="municipality-layer" data-biomass-type={biomassType} data-opacity={opacity}>
      {data?.features?.length || 0} municipalities
    </div>
  ),
}));

jest.mock('./HeatmapLayer', () => ({
  __esModule: true,
  default: ({ data, opacity }: any) => (
    <div data-testid="heatmap-layer" data-opacity={opacity}>
      {data?.features?.length || 0} municipalities
    </div>
  ),
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

// Note: LeftFilterPanel is only imported for its VisualizationMode type in
// MapComponent.tsx — DesktopLeftPanel is the component that's actually
// rendered and receives search/visualization-mode/layer props, so it's the
// one mocked with interactive elements below.

jest.mock('./DesktopLeftPanel', () => ({
  __esModule: true,
  default: ({
    layers, onLayerToggle, municipalityCount, totalMunicipalities,
    visualizationMode, onVisualizationModeChange,
  }: any) => (
    <div data-testid="desktop-left-panel">
      <div data-testid="municipality-count">{municipalityCount} / {totalMunicipalities}</div>
      <select
        data-testid="visualization-mode-select"
        value={visualizationMode}
        onChange={(e) => onVisualizationModeChange(e.target.value)}
      >
        <option value="choropleth">Choropleth</option>
        <option value="heatmap">Heatmap</option>
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

jest.mock('./HeatmapLegend', () => ({
  __esModule: true,
  default: () => <div data-testid="heatmap-legend">Heatmap Legend</div>,
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

jest.mock('./ReferencesPanel', () => ({
  __esModule: true,
  default: () => <div data-testid="references-panel">References</div>,
}));

jest.mock('./MapLoadingSkeleton', () => ({
  __esModule: true,
  default: () => <div data-testid="loading-skeleton">Loading...</div>,
}));

// Sample test data
const createMunicipalityFeature = (overrides: Partial<any> = {}): MunicipalityFeature => ({
  type: 'Feature',
  geometry: {
    type: 'Polygon',
    coordinates: [[[-46.0, -23.0], [-46.1, -23.0], [-46.1, -23.1], [-46.0, -23.1], [-46.0, -23.0]]],
  },
  properties: {
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
  },
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
        expect(screen.getByTestId('tile-layer')).toBeInTheDocument();
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
        expect(screen.queryByTestId('heatmap-layer')).not.toBeInTheDocument();
      });
    });

    it('should switch to heatmap mode', async () => {
      const user = userEvent.setup({ delay: null });
      render(<MapComponent />);
      act(() => { jest.advanceTimersByTime(1500); });

      await waitFor(() => {
        expect(screen.getByTestId('visualization-mode-select')).toBeInTheDocument();
      });

      const select = screen.getByTestId('visualization-mode-select');
      await user.selectOptions(select, 'heatmap');

      await waitFor(() => {
        expect(screen.getByTestId('heatmap-layer')).toBeInTheDocument();
        expect(screen.getByTestId('heatmap-legend')).toBeInTheDocument();
        expect(screen.queryByTestId('municipality-layer')).not.toBeInTheDocument();
      });
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

    it('should filter by search query (name)', async () => {
      render(<MapComponent searchQuery="São Paulo" />);
      act(() => { jest.advanceTimersByTime(1500); });

      // The filtering logic should reduce municipalities to 1
      // Note: In real test, we'd verify the filtered count via the municipality layer
      await waitFor(() => {
        expect(screen.getByTestId('municipality-layer')).toBeInTheDocument();
      });
    });

    it('should filter by search query (IBGE code)', async () => {
      render(<MapComponent searchQuery="3509502" />);
      act(() => { jest.advanceTimersByTime(1500); });

      await waitFor(() => {
        expect(screen.getByTestId('municipality-layer')).toBeInTheDocument();
      });
    });

    it('should filter by biogas range', async () => {
      render(
        <MapComponent
          activeFilters={{
            minBiogas: 40_000_000,
            maxBiogas: 150_000_000,
            searchQuery: '',
            residueTypes: [],
            regions: [],
          }}
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
          activeFilters={{
            minBiogas: undefined,
            maxBiogas: undefined,
            searchQuery: '',
            residueTypes: ['agricultural'],
            regions: [],
          }}
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
          activeFilters={{
            minBiogas: undefined,
            maxBiogas: undefined,
            searchQuery: '',
            residueTypes: [],
            regions: ['São Paulo', 'Campinas'],
          }}
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
          activeFilters={{
            minBiogas: 60_000_000,
            maxBiogas: undefined,
            searchQuery: '',
            residueTypes: [],
            regions: [],
          }}
        />
      );
      act(() => { jest.advanceTimersByTime(1500); });

      // No scenario switch needed: the map now opens on "Real", and
      // applyScenarioToProps leaves props untouched for the served scenarios
      // (they carry their own ch4_real_* columns rather than scaling the legacy
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
          searchQuery="Paulo"
          activeFilters={{
            minBiogas: 50_000_000,
            maxBiogas: undefined,
            searchQuery: '',
            residueTypes: ['agricultural'],
            regions: ['São Paulo'],
          }}
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
  // residue emptied the map instead of narrowing it, and the national beta layer
  // drew nothing at all in the default (SP) scope.
  describe('Residue filter + national beta layer', () => {
    const spWithCane = createMunicipalityFeature({
      ibge_code: '3505500',
      name: 'Barretos',
      ch4_real_m3_year: 1_000,
      ch4_real_sugarcane_m3_year: 600,
      ch4_real_cattle_m3_year: 400,
    });
    const spWithoutCane = createMunicipalityFeature({
      ibge_code: '3548500',
      name: 'Santos',
      ch4_real_m3_year: 500,
      ch4_real_rsu_m3_year: 500,
    });
    const betaMunicipality = createMunicipalityFeature({
      ibge_code: '3106200', // Belo Horizonte — MG, outside the canonical pipeline
      name: 'Belo Horizonte',
    });

    beforeEach(() => {
      mockUseGeospatialData.mockReturnValue({
        data: createMunicipalityCollection([spWithCane, spWithoutCane, betaMunicipality]),
        loading: false,
        error: null,
      });
    });

    it('draws the beta municipalities in the SP scope, where the toggle lives', async () => {
      // The scope filter used to drop every non-SP feature before the beta layer
      // could see one, so "Demais municípios do Brasil (BETA)" was a switch wired
      // to nothing. The layer draws all three; only the two SP rows count as SP.
      render(<MapComponent />);
      act(() => { jest.advanceTimersByTime(1500); });

      await waitFor(() => {
        expect(screen.getByText('3 municipalities')).toBeInTheDocument();
        expect(screen.getByTestId('municipality-count')).toHaveTextContent('2 / 645');
      });
    });

    it('narrows to the municipalities holding the selected residue', async () => {
      // Read from ?r= on mount, the same path a bookmarked filter takes.
      window.history.replaceState(null, '', '/?r=sugarcane');
      render(<MapComponent />);
      act(() => { jest.advanceTimersByTime(1500); });

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
          activeFilters={{
            minBiogas: 100_000_000, // No municipality meets this
            maxBiogas: undefined,
            searchQuery: '',
            residueTypes: [],
            regions: [],
          }}
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
});

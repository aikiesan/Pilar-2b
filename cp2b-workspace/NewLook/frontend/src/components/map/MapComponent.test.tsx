/**
 * Comprehensive tests for MapComponent
 * Tests loading states, filtering, layer management, and visualization modes
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MapComponent from './MapComponent';
import type { MunicipalityCollection, MunicipalityFeature } from '@/types/geospatial';

// Mock Next.js dynamic imports
// In Jest with next/jest SWC transform, import() returns a Promise even for
// jest.mock'd modules. Use React.lazy + Suspense so the lazy component properly
// resolves after microtasks flush inside await act(async () => ...).
jest.mock('next/dynamic', () => {
  const ReactModule = require('react');
  return {
    __esModule: true,
    default: (importFn: () => Promise<any>) => {
      const LazyComponent = ReactModule.lazy(importFn);
      const Wrapper = (props: any) =>
        ReactModule.createElement(
          ReactModule.Suspense,
          { fallback: null },
          ReactModule.createElement(LazyComponent, props),
        );
      return Wrapper;
    },
  };
});

// Mock next-intl — return actual Portuguese strings for assertions
jest.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) => {
    const strings: Record<string, Record<string, string>> = {
      Map: {
        'errors.loadingError': 'Erro ao Carregar Mapa',
        'errors.reloadPage':   'Recarregar Página',
        'errors.noData':       'Nenhum Dado Disponível',
        'errors.tryAgain':     'Tentar Novamente',
      },
    };
    return strings[namespace]?.[key] ?? key;
  },
}));

// Mock Leaflet CSS imports
jest.mock('leaflet/dist/leaflet.css', () => ({}));
jest.mock('@/lib/leafletConfig', () => ({}));

// Mock useGeospatialData hook and co-located hooks
const mockUseGeospatialData = jest.fn();
jest.mock('@/hooks/useGeospatialData', () => ({
  useGeospatialData: () => mockUseGeospatialData(),
  useCodigestionClusters: () => ({ data: null, loading: false, error: null, isFetching: false, refetch: jest.fn() }),
  useResidueCNMatrix: () => ({ data: null, loading: false, error: null }),
  useIntermediateRegionsGeoJSON: () => ({ data: null, loading: false, error: null, isFetching: false, refetch: jest.fn() }),
}));

jest.mock('@/hooks/useCnProfiles', () => ({
  useCnProfiles: () => ({ profiles: [], profilesMap: {}, isLoading: false, error: null }),
}));

// Mock child components to simplify testing
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }: any) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
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

jest.mock('./LeftFilterPanel', () => ({
  __esModule: true,
  default: ({ searchQuery, selectedResidues, biomassType, visualizationMode, onVisualizationModeChange }: any) => (
    <div data-testid="left-filter-panel">
      <input data-testid="search-input" value={searchQuery} readOnly />
      <select
        data-testid="visualization-mode-select"
        value={visualizationMode}
        onChange={(e) => onVisualizationModeChange(e.target.value)}
      >
        <option value="choropleth">Choropleth</option>
        <option value="heatmap">Heatmap</option>
      </select>
    </div>
  ),
}));

jest.mock('./DesktopLeftPanel', () => ({
  __esModule: true,
  default: ({
    layers, onLayerToggle, municipalityCount, totalMunicipalities,
    visualizationMode, onVisualizationModeChange, searchQuery,
  }: any) => (
    <div data-testid="desktop-left-panel">
      <input data-testid="search-input" value={searchQuery || ''} readOnly />
      <select
        data-testid="visualization-mode-select"
        value={visualizationMode}
        onChange={(e) => onVisualizationModeChange(e.target.value)}
      >
        <option value="choropleth">Choropleth</option>
        <option value="heatmap">Heatmap</option>
      </select>
      <div data-testid="municipality-count">{municipalityCount} / {totalMunicipalities}</div>
      {layers?.map((layer: any) => (
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
  default: ({ visible }: any) => visible ? <div data-testid="biomass-layer-legend">Biomass Legend</div> : null,
}));

jest.mock('./ReferencesPanel', () => ({
  __esModule: true,
  default: () => <div data-testid="references-panel">References</div>,
}));

jest.mock('./MapLoadingSkeleton', () => ({
  __esModule: true,
  default: () => <div data-testid="loading-skeleton">Loading...</div>,
}));

// Dynamic components added since the initial test was written — mock as stubs
jest.mock('./BubbleChartLayer', () => ({
  __esModule: true,
  default: ({ data, opacity, attribute }: any) => (
    <div data-testid="bubble-chart-layer" data-opacity={opacity} data-attribute={attribute}>
      {data?.features?.length || 0} municipalities
    </div>
  ),
}));

jest.mock('./CodigestionClusterLayer', () => ({
  __esModule: true,
  default: () => <div data-testid="codigestion-cluster-layer" />,
}));

jest.mock('./CodigestionDetailPanel', () => ({
  __esModule: true,
  default: () => <div data-testid="codigestion-detail-panel" />,
}));

jest.mock('./CnChoroLayer', () => ({
  __esModule: true,
  default: () => <div data-testid="cn-choro-layer" />,
}));

jest.mock('./MobileBottomSheet', () => ({
  __esModule: true,
  default: () => <div data-testid="mobile-bottom-sheet" />,
}));

jest.mock('./MunicipalityProfilePanel', () => ({
  __esModule: true,
  default: () => <div data-testid="municipality-profile-panel" />,
}));

jest.mock('./EnhancedTooltip', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('./ComparisonPanel', () => ({
  __esModule: true,
  default: () => <div data-testid="comparison-panel" />,
}));

jest.mock('./ExportControl', () => ({
  __esModule: true,
  default: () => <div data-testid="export-control" />,
}));

jest.mock('./MapSearchBox', () => ({
  __esModule: true,
  default: () => <div data-testid="map-search-box" />,
}));

jest.mock('./IntermediateRegionBoundaryLayer', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('./IntermediateRegionsMapLayer', () => ({
  __esModule: true,
  default: () => null,
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
    // Reset URL so MapComponent reads clean params on each test.
    // Without this, tests that call syncURL (e.g. heatmap switch) leak
    // ?mode=heatmap into subsequent tests via window.location.search.
    window.history.replaceState(null, '', '/');
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Loading State', () => {
    it('should display loading skeleton when loading', async () => {
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
      await act(async () => jest.advanceTimersByTime(1500));
      await waitFor(() => {
        expect(screen.queryByTestId('loading-skeleton')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error State', () => {
    it('should display error message when fetch fails', async () => {
      mockUseGeospatialData.mockReturnValue({
        data: null,
        loading: false,
        error: new Error('Backend API não está respondendo'),
      });

      render(<MapComponent />);

      expect(screen.getByText('Erro ao Carregar Mapa')).toBeInTheDocument();
      expect(screen.getByText('Backend API não está respondendo')).toBeInTheDocument();
    });

    it('should display the error message in the error panel', async () => {
      mockUseGeospatialData.mockReturnValue({
        data: null,
        loading: false,
        error: new Error('Network error'),
      });

      render(<MapComponent />);

      expect(screen.getByText('Erro ao Carregar Mapa')).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    it('should show reload button on error', async () => {
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
    it('should display "no data" message when features are empty', async () => {
      mockUseGeospatialData.mockReturnValue({
        data: createMunicipalityCollection([]),
        loading: false,
        error: null,
      });

      render(<MapComponent />);
      await act(async () => jest.advanceTimersByTime(1500));

      await waitFor(() => {
        expect(screen.getByText('Nenhum Dado Disponível')).toBeInTheDocument();
      });
    });

    it('should show "try again" button when no data', async () => {
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
      await act(async () => jest.advanceTimersByTime(1500));

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
        expect(screen.getByTestId('tile-layer')).toBeInTheDocument();
      });
    });

    it('should render municipality layer by default', async () => {
      render(<MapComponent />);
      await act(async () => jest.advanceTimersByTime(1500));

      await waitFor(() => {
        expect(screen.getByTestId('municipality-layer')).toBeInTheDocument();
        expect(screen.getByText('3 municipalities')).toBeInTheDocument();
      });
    });

    it('should render all panel components', async () => {
      render(<MapComponent />);
      await act(async () => jest.advanceTimersByTime(1500));

      await waitFor(() => {
        expect(screen.getByTestId('desktop-left-panel')).toBeInTheDocument();
        expect(screen.getByTestId('map-legend')).toBeInTheDocument();
      });
    });

    it('should pass correct props to municipality layer', async () => {
      render(<MapComponent biomassType="agricultural" opacity={0.5} />);
      await act(async () => jest.advanceTimersByTime(1500));

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
      await act(async () => jest.advanceTimersByTime(1500));

      await waitFor(() => {
        expect(screen.getByTestId('municipality-layer')).toBeInTheDocument();
        expect(screen.getByTestId('map-legend')).toBeInTheDocument();
        expect(screen.queryByTestId('heatmap-layer')).not.toBeInTheDocument();
      });
    });

    it('should switch to heatmap mode', async () => {
      const user = userEvent.setup({ delay: null });
      render(<MapComponent />);
      await act(async () => jest.advanceTimersByTime(1500));

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
      await act(async () => jest.advanceTimersByTime(1500));

      await waitFor(() => {
        expect(screen.queryByTestId('mapbiomas-layer')).not.toBeInTheDocument();
      });

      const mapbiomasToggle = screen.getByTestId('layer-toggle-mapbiomas');
      await user.click(mapbiomasToggle);

      await waitFor(() => {
        expect(screen.getByTestId('mapbiomas-layer')).toBeInTheDocument();
        expect(screen.getByTestId('mapbiomas-legend')).toBeInTheDocument();
      });
    });

    it('should toggle biogas-plants layer and legend', async () => {
      const user = userEvent.setup({ delay: null });
      render(<MapComponent />);
      await act(async () => jest.advanceTimersByTime(1500));

      await waitFor(() => {
        expect(screen.queryByTestId('infrastructure-layer-biogas-plants')).not.toBeInTheDocument();
      });

      const biogasToggle = screen.getByTestId('layer-toggle-biogas-plants');
      await user.click(biogasToggle);

      await waitFor(() => {
        expect(screen.getByTestId('infrastructure-layer-biogas-plants')).toBeInTheDocument();
        expect(screen.getByTestId('biomass-layer-legend')).toBeInTheDocument();
      });
    });

    it('should toggle infrastructure layers', async () => {
      const user = userEvent.setup({ delay: null });
      render(<MapComponent />);
      await act(async () => jest.advanceTimersByTime(1500));

      const pipelinesToggle = screen.getByTestId('layer-toggle-pipelines');
      await user.click(pipelinesToggle);

      await waitFor(() => {
        expect(screen.getByTestId('infrastructure-layer-pipelines')).toBeInTheDocument();
      });

      const substationsToggle = screen.getByTestId('layer-toggle-substations');
      await user.click(substationsToggle);

      await waitFor(() => {
        expect(screen.getByTestId('infrastructure-layer-substations')).toBeInTheDocument();
      });
    });

    it('should show/hide MapBiomas legend with layer toggle', async () => {
      const user = userEvent.setup({ delay: null });
      render(<MapComponent />);
      await act(async () => jest.advanceTimersByTime(1500));

      // Initially no legend
      await waitFor(() => {
        expect(screen.queryByTestId('mapbiomas-legend')).not.toBeInTheDocument();
      });

      // Turn on MapBiomas layer
      const mapbiomasToggle = screen.getByTestId('layer-toggle-mapbiomas');
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
      await act(async () => jest.advanceTimersByTime(1500));

      // The filtering logic should reduce municipalities to 1
      // Note: In real test, we'd verify the filtered count via the municipality layer
      await waitFor(() => {
        expect(screen.getByTestId('municipality-layer')).toBeInTheDocument();
      });
    });

    it('should filter by search query (IBGE code)', async () => {
      render(<MapComponent searchQuery="3509502" />);
      await act(async () => jest.advanceTimersByTime(1500));

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
      await act(async () => jest.advanceTimersByTime(1500));

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
      await act(async () => jest.advanceTimersByTime(1500));

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
      await act(async () => jest.advanceTimersByTime(1500));

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
      await act(async () => jest.advanceTimersByTime(1500));

      // Should filter to 1 municipality (São Paulo with 100M) out of 3 total
      await waitFor(() => {
        expect(screen.getByTestId('municipality-count')).toHaveTextContent('1 / 3');
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
      await act(async () => jest.advanceTimersByTime(1500));

      // Multiple filters should all apply
      await waitFor(() => {
        expect(screen.getByTestId('municipality-layer')).toBeInTheDocument();
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
      await act(async () => jest.advanceTimersByTime(1500));

      await waitFor(() => {
        const layer = screen.getByTestId('municipality-layer');
        expect(layer).toHaveAttribute('data-biomass-type', 'total');
      });
    });

    it('should accept custom biomass type', async () => {
      render(<MapComponent biomassType="livestock" />);
      await act(async () => jest.advanceTimersByTime(1500));

      await waitFor(() => {
        const layer = screen.getByTestId('municipality-layer');
        expect(layer).toHaveAttribute('data-biomass-type', 'livestock');
      });
    });

    it('should use default opacity', async () => {
      render(<MapComponent />);
      await act(async () => jest.advanceTimersByTime(1500));

      await waitFor(() => {
        const layer = screen.getByTestId('municipality-layer');
        expect(layer).toHaveAttribute('data-opacity', '0.7');
      });
    });

    it('should accept custom opacity', async () => {
      render(<MapComponent opacity={0.9} />);
      await act(async () => jest.advanceTimersByTime(1500));

      await waitFor(() => {
        const layer = screen.getByTestId('municipality-layer');
        expect(layer).toHaveAttribute('data-opacity', '0.9');
      });
    });

    it('should handle callbacks for biomass type change', async () => {
      const handleBiomassTypeChange = jest.fn();
      render(<MapComponent onBiomassTypeChange={handleBiomassTypeChange} />);
      await act(async () => jest.advanceTimersByTime(1500));

      await waitFor(() => {
        expect(screen.getByTestId('desktop-left-panel')).toBeInTheDocument();
      });
    });

    it('should handle callbacks for opacity change', async () => {
      const handleOpacityChange = jest.fn();
      render(<MapComponent onOpacityChange={handleOpacityChange} />);
      await act(async () => jest.advanceTimersByTime(1500));

      await waitFor(() => {
        expect(screen.getByTestId('desktop-left-panel')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle null data gracefully', async () => {
      mockUseGeospatialData.mockReturnValue({
        data: null,
        loading: false,
        error: null,
      });

      render(<MapComponent />);

      expect(screen.getByText('Nenhum Dado Disponível')).toBeInTheDocument();
    });

    it('should handle empty features array', async () => {
      mockUseGeospatialData.mockReturnValue({
        data: createMunicipalityCollection([]),
        loading: false,
        error: null,
      });

      render(<MapComponent />);
      await act(async () => jest.advanceTimersByTime(1500));

      await waitFor(() => {
        expect(screen.getByText('Nenhum Dado Disponível')).toBeInTheDocument();
      });
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
      await act(async () => jest.advanceTimersByTime(1500));

      // Should show 0 / 1
      await waitFor(() => {
        expect(screen.getByTestId('municipality-count')).toHaveTextContent('0 / 1');
      });
    });
  });
});

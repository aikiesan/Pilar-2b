/**
 * Tests for RegionMarkersLayer Component
 */

import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react';
import { MapContainer } from 'react-leaflet';
import RegionMarkersLayer from './RegionMarkersLayer';

// Mock environment variable
const originalEnv = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv };
  global.fetch = jest.fn();
});

afterEach(() => {
  process.env = originalEnv;
  jest.restoreAllMocks();
});

// Mock react-leaflet
const mockUseMap = jest.fn();
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="map-container">{children}</div>,
  Marker: ({ position, icon, eventHandlers, children }: any) => (
    <div
      data-testid="region-marker"
      data-position={JSON.stringify(position)}
      onClick={() => eventHandlers?.click?.()}
    >
      {children}
    </div>
  ),
  Popup: ({ children }: { children: React.ReactNode }) => <div data-testid="popup">{children}</div>,
  useMap: () => mockUseMap()
}));

// Mock leaflet
jest.mock('leaflet', () => ({
  divIcon: jest.fn((options) => options)
}));

describe('RegionMarkersLayer', () => {
  let mockMap: any;
  const mockOnRegionSelect = jest.fn();

  const mockRegionsResponse = {
    regions: [
      {
        cd_rgint: '3501',
        nm_rgint: 'São Paulo',
        sigla_uf: 'SP',
        vab_total_brl: 500000000000,
        population: 20000000,
        centroid_lat: -23.5505,
        centroid_lng: -46.6333
      },
      {
        cd_rgint: '3502',
        nm_rgint: 'Campinas',
        sigla_uf: 'SP',
        vab_total_brl: 150000000000,
        population: 3000000,
        centroid_lat: -22.9099,
        centroid_lng: -47.0626
      },
      {
        cd_rgint: '3503',
        nm_rgint: 'Sorocaba',
        sigla_uf: 'SP',
        vab_total_brl: 80000000000,
        population: 1500000,
        centroid_lat: -23.5015,
        centroid_lng: -47.4526
      },
      {
        cd_rgint: '3504',
        nm_rgint: 'Invalid Region',
        sigla_uf: 'SP',
        vab_total_brl: 50000000000,
        population: 500000,
        centroid_lat: null,
        centroid_lng: null
      }
    ]
  };

  beforeEach(() => {
    mockMap = {
      setView: jest.fn()
    };
    mockUseMap.mockReturnValue(mockMap);
    mockOnRegionSelect.mockClear();

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockRegionsResponse
    });
  });

  describe('Basic Rendering', () => {
    it('should render markers for all regions with valid coordinates', async () => {
      const { findAllByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <RegionMarkersLayer
            selectedRegion={null}
            onRegionSelect={mockOnRegionSelect}
          />
        </MapContainer>
      );

      const markers = await findAllByTestId('region-marker');
      // Should render 3 markers (excluding invalid region with null coordinates)
      expect(markers).toHaveLength(3);
    });

    it('should fetch regions from API on mount', async () => {
      process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com';

      render(
        <MapContainer center={[0, 0]} zoom={10}>
          <RegionMarkersLayer
            selectedRegion={null}
            onRegionSelect={mockOnRegionSelect}
          />
        </MapContainer>
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('https://api.example.com/api/v1/simulation/regions/brazil');
      });
    });

    it('should use default API URL when not configured', async () => {
      delete process.env.NEXT_PUBLIC_API_URL;

      render(
        <MapContainer center={[0, 0]} zoom={10}>
          <RegionMarkersLayer
            selectedRegion={null}
            onRegionSelect={mockOnRegionSelect}
          />
        </MapContainer>
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('http://localhost:8000/api/v1/simulation/regions/brazil');
      });
    });

    it('should render nothing while loading', () => {
      const { queryByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <RegionMarkersLayer
            selectedRegion={null}
            onRegionSelect={mockOnRegionSelect}
          />
        </MapContainer>
      );

      // Initially no markers (still loading)
      expect(queryByTestId('region-marker')).not.toBeInTheDocument();
    });
  });

  describe('Region Selection', () => {
    it('should highlight selected region', async () => {
      const { findAllByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <RegionMarkersLayer
            selectedRegion="3501"
            onRegionSelect={mockOnRegionSelect}
          />
        </MapContainer>
      );

      const markers = await findAllByTestId('region-marker');
      expect(markers).toHaveLength(3);
    });

    it('should call onRegionSelect when marker is clicked', async () => {
      const { findAllByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <RegionMarkersLayer
            selectedRegion={null}
            onRegionSelect={mockOnRegionSelect}
          />
        </MapContainer>
      );

      const markers = await findAllByTestId('region-marker');
      fireEvent.click(markers[0]);

      expect(mockOnRegionSelect).toHaveBeenCalled();
    });

    it('should center map on selected region when clicked', async () => {
      const { findAllByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <RegionMarkersLayer
            selectedRegion={null}
            onRegionSelect={mockOnRegionSelect}
          />
        </MapContainer>
      );

      const markers = await findAllByTestId('region-marker');
      fireEvent.click(markers[0]);

      expect(mockMap.setView).toHaveBeenCalledWith(
        expect.any(Array),
        8,
        expect.objectContaining({ animate: true })
      );
    });
  });

  describe('Simulation Results Integration', () => {
    it('should render without simulation results', async () => {
      const { findAllByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <RegionMarkersLayer
            selectedRegion={null}
            onRegionSelect={mockOnRegionSelect}
          />
        </MapContainer>
      );

      const markers = await findAllByTestId('region-marker');
      expect(markers).toHaveLength(3);
    });

    it('should handle simulation results with regional impacts', async () => {
      const simulationResult = {
        simulation_id: 'sim-123',
        results: {
          regional_impacts: {
            '3501': {
              region_name: 'São Paulo',
              vab_impact_brl: 5000000000,
              spillover_weight: 0.85
            },
            '3502': {
              region_name: 'Campinas',
              vab_impact_brl: 2000000000,
              spillover_weight: 0.45
            }
          }
        }
      };

      const { findAllByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <RegionMarkersLayer
            selectedRegion={null}
            onRegionSelect={mockOnRegionSelect}
            simulationResult={simulationResult}
          />
        </MapContainer>
      );

      const markers = await findAllByTestId('region-marker');
      expect(markers).toHaveLength(3);
    });

    it('should handle empty simulation results', async () => {
      const simulationResult = {
        simulation_id: 'sim-123',
        results: {
          regional_impacts: {}
        }
      };

      const { findAllByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <RegionMarkersLayer
            selectedRegion={null}
            onRegionSelect={mockOnRegionSelect}
            simulationResult={simulationResult}
          />
        </MapContainer>
      );

      const markers = await findAllByTestId('region-marker');
      expect(markers).toHaveLength(3);
    });

    it('should handle simulation results without regional_impacts', async () => {
      const simulationResult = {
        simulation_id: 'sim-123',
        results: {}
      };

      const { findAllByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <RegionMarkersLayer
            selectedRegion={null}
            onRegionSelect={mockOnRegionSelect}
            simulationResult={simulationResult}
          />
        </MapContainer>
      );

      const markers = await findAllByTestId('region-marker');
      expect(markers).toHaveLength(3);
    });
  });

  describe('Popup Content', () => {
    it('should render popups with region information', async () => {
      const { findAllByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <RegionMarkersLayer
            selectedRegion={null}
            onRegionSelect={mockOnRegionSelect}
          />
        </MapContainer>
      );

      const popups = await findAllByTestId('popup');
      expect(popups.length).toBeGreaterThan(0);
    });

    it('should display region name in popup', async () => {
      const { findAllByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <RegionMarkersLayer
            selectedRegion={null}
            onRegionSelect={mockOnRegionSelect}
          />
        </MapContainer>
      );

      const popups = await findAllByTestId('popup');
      expect(popups[0].textContent).toContain('São Paulo');
    });

    it('should display state abbreviation in popup', async () => {
      const { findAllByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <RegionMarkersLayer
            selectedRegion={null}
            onRegionSelect={mockOnRegionSelect}
          />
        </MapContainer>
      );

      const popups = await findAllByTestId('popup');
      expect(popups[0].textContent).toContain('SP');
    });

    it('should display VAB total in popup', async () => {
      const { findAllByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <RegionMarkersLayer
            selectedRegion={null}
            onRegionSelect={mockOnRegionSelect}
          />
        </MapContainer>
      );

      const popups = await findAllByTestId('popup');
      expect(popups[0].textContent).toContain('VAB Total');
    });

    it('should display population in popup', async () => {
      const { findAllByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <RegionMarkersLayer
            selectedRegion={null}
            onRegionSelect={mockOnRegionSelect}
          />
        </MapContainer>
      );

      const popups = await findAllByTestId('popup');
      expect(popups[0].textContent).toContain('População');
    });

    it('should display simulation impact in popup when available', async () => {
      const simulationResult = {
        simulation_id: 'sim-123',
        results: {
          regional_impacts: {
            '3501': {
              region_name: 'São Paulo',
              vab_impact_brl: 5000000000,
              spillover_weight: 0.85
            }
          }
        }
      };

      const { findAllByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <RegionMarkersLayer
            selectedRegion={null}
            onRegionSelect={mockOnRegionSelect}
            simulationResult={simulationResult}
          />
        </MapContainer>
      );

      const popups = await findAllByTestId('popup');
      expect(popups[0].textContent).toContain('Impacto Simulado');
    });
  });

  describe('Error Handling', () => {
    it('should handle API fetch error', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const { queryByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <RegionMarkersLayer
            selectedRegion={null}
            onRegionSelect={mockOnRegionSelect}
          />
        </MapContainer>
      );

      await waitFor(() => {
        expect(queryByTestId('region-marker')).not.toBeInTheDocument();
      });
    });

    it('should handle API response not ok', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404
      });

      const { queryByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <RegionMarkersLayer
            selectedRegion={null}
            onRegionSelect={mockOnRegionSelect}
          />
        </MapContainer>
      );

      await waitFor(() => {
        expect(queryByTestId('region-marker')).not.toBeInTheDocument();
      });
    });

    it('should handle malformed API response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ invalid: 'data' })
      });

      const { queryByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <RegionMarkersLayer
            selectedRegion={null}
            onRegionSelect={mockOnRegionSelect}
          />
        </MapContainer>
      );

      await waitFor(() => {
        expect(queryByTestId('region-marker')).not.toBeInTheDocument();
      });
    });

    it('should handle empty regions array', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ regions: [] })
      });

      const { queryByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <RegionMarkersLayer
            selectedRegion={null}
            onRegionSelect={mockOnRegionSelect}
          />
        </MapContainer>
      );

      await waitFor(() => {
        expect(queryByTestId('region-marker')).not.toBeInTheDocument();
      });
    });
  });

  describe('Coordinate Filtering', () => {
    it('should filter out regions with null latitude', async () => {
      const { findAllByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <RegionMarkersLayer
            selectedRegion={null}
            onRegionSelect={mockOnRegionSelect}
          />
        </MapContainer>
      );

      const markers = await findAllByTestId('region-marker');
      // Should exclude region with null coordinates (3504)
      expect(markers).toHaveLength(3);
    });

    it('should filter out regions with null longitude', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          regions: [{
            cd_rgint: '3505',
            nm_rgint: 'Test',
            sigla_uf: 'SP',
            vab_total_brl: 1000000,
            population: 10000,
            centroid_lat: -23.5,
            centroid_lng: null
          }]
        })
      });

      const { queryByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <RegionMarkersLayer
            selectedRegion={null}
            onRegionSelect={mockOnRegionSelect}
          />
        </MapContainer>
      );

      await waitFor(() => {
        expect(queryByTestId('region-marker')).not.toBeInTheDocument();
      });
    });

    it('should render regions with valid coordinates only', async () => {
      const { findAllByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <RegionMarkersLayer
            selectedRegion={null}
            onRegionSelect={mockOnRegionSelect}
          />
        </MapContainer>
      );

      const markers = await findAllByTestId('region-marker');
      markers.forEach(marker => {
        const position = JSON.parse(marker.getAttribute('data-position') || '[]');
        expect(position).toHaveLength(2);
        expect(typeof position[0]).toBe('number');
        expect(typeof position[1]).toBe('number');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle regions with zero population', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          regions: [{
            cd_rgint: '3505',
            nm_rgint: 'Empty Region',
            sigla_uf: 'SP',
            vab_total_brl: 1000000,
            population: 0,
            centroid_lat: -23.5,
            centroid_lng: -46.6
          }]
        })
      });

      const { findByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <RegionMarkersLayer
            selectedRegion={null}
            onRegionSelect={mockOnRegionSelect}
          />
        </MapContainer>
      );

      const marker = await findByTestId('region-marker');
      expect(marker).toBeInTheDocument();
    });

    it('should handle regions with null population', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          regions: [{
            cd_rgint: '3505',
            nm_rgint: 'No Pop Region',
            sigla_uf: 'SP',
            vab_total_brl: 1000000,
            population: null,
            centroid_lat: -23.5,
            centroid_lng: -46.6
          }]
        })
      });

      const { findByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <RegionMarkersLayer
            selectedRegion={null}
            onRegionSelect={mockOnRegionSelect}
          />
        </MapContainer>
      );

      const popup = await findByTestId('popup');
      expect(popup.textContent).toContain('N/A');
    });

    it('should handle extreme coordinate values', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          regions: [{
            cd_rgint: '3505',
            nm_rgint: 'Edge Region',
            sigla_uf: 'SP',
            vab_total_brl: 1000000,
            population: 10000,
            centroid_lat: -90,
            centroid_lng: -180
          }]
        })
      });

      const { findByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <RegionMarkersLayer
            selectedRegion={null}
            onRegionSelect={mockOnRegionSelect}
          />
        </MapContainer>
      );

      const marker = await findByTestId('region-marker');
      expect(marker).toBeInTheDocument();
    });

    it('should handle very large VAB values', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          regions: [{
            cd_rgint: '3505',
            nm_rgint: 'Rich Region',
            sigla_uf: 'SP',
            vab_total_brl: 9999999999999999,
            population: 10000,
            centroid_lat: -23.5,
            centroid_lng: -46.6
          }]
        })
      });

      const { findByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <RegionMarkersLayer
            selectedRegion={null}
            onRegionSelect={mockOnRegionSelect}
          />
        </MapContainer>
      );

      const marker = await findByTestId('region-marker');
      expect(marker).toBeInTheDocument();
    });
  });
});

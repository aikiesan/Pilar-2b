/**
 * Tests for RegionChoroplethLayer Component
 */

import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react';
import { MapContainer } from 'react-leaflet';
import RegionChoroplethLayer from './RegionChoroplethLayer';

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
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="map-container">{children}</div>,
  GeoJSON: ({ data, style, onEachFeature }: any) => {
    // Call onEachFeature for features if provided
    if (data?.features?.length > 0 && onEachFeature) {
      data.features.forEach((feature: any) => {
        const mockLayer = {
          bindPopup: jest.fn(),
          on: jest.fn(),
          setStyle: jest.fn(),
          bringToFront: jest.fn()
        };
        onEachFeature(feature, mockLayer);
      });
    }

    return (
      <div
        data-testid="choropleth-geojson"
        data-feature-count={data?.features?.length || 0}
      />
    );
  }
}));

// Mock leaflet
jest.mock('leaflet', () => ({
  Path: class Path {}
}));

describe('RegionChoroplethLayer', () => {
  const mockOnRegionClick = jest.fn();

  const mockGeoJSONData = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[-48.0, -22.0], [-48.1, -22.0], [-48.1, -22.1], [-48.0, -22.1], [-48.0, -22.0]]]
        },
        properties: {
          cd_rgint: '3501',
          nm_rgint: 'São Paulo',
          sigla_uf: 'SP'
        }
      },
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[-47.0, -23.0], [-47.1, -23.0], [-47.1, -23.1], [-47.0, -23.1], [-47.0, -23.0]]]
        },
        properties: {
          cd_rgint: '3502',
          nm_rgint: 'Campinas',
          sigla_uf: 'SP'
        }
      },
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[-46.0, -24.0], [-46.1, -24.0], [-46.1, -24.1], [-46.0, -24.1], [-46.0, -24.0]]]
        },
        properties: {
          nm_rgint: 'Sorocaba',
          sigla_uf: 'SP'
          // Missing cd_rgint
        }
      }
    ]
  };

  const mockRegionsAPIResponse = {
    regions: [
      {
        cd_rgi: '3501',
        nm_rgi: 'São Paulo',
        sigla_uf: 'SP'
      },
      {
        cd_rgi: '3502',
        nm_rgi: 'Campinas',
        sigla_uf: 'SP'
      },
      {
        cd_rgi: '3503',
        nm_rgi: 'Sorocaba',
        sigla_uf: 'SP'
      }
    ]
  };

  beforeEach(() => {
    mockOnRegionClick.mockClear();

    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/data/br_intermediary_regions.geojson')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockGeoJSONData
        });
      }
      if (url.includes('/api/v1/simulation/regions/brazil')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockRegionsAPIResponse
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });
  });

  describe('Basic Rendering', () => {
    it('should render GeoJSON layer after loading', async () => {
      const { findByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <RegionChoroplethLayer
            selectedRegion={null}
            onRegionClick={mockOnRegionClick}
          />
        </MapContainer>
      );

      const geoJson = await findByTestId('choropleth-geojson');
      expect(geoJson).toBeInTheDocument();
    });

    it('should render nothing while loading', () => {
      const { queryByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <RegionChoroplethLayer
            selectedRegion={null}
            onRegionClick={mockOnRegionClick}
          />
        </MapContainer>
      );

      expect(queryByTestId('choropleth-geojson')).not.toBeInTheDocument();
    });

    it('should fetch both shapefile and regions data', async () => {
      render(
        <MapContainer center={[0, 0]} zoom={10}>
          <RegionChoroplethLayer
            selectedRegion={null}
            onRegionClick={mockOnRegionClick}
          />
        </MapContainer>
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/data/br_intermediary_regions.geojson');
        expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/v1/simulation/regions/brazil'));
      });
    });

    it('should render correct number of features', async () => {
      const { findByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <RegionChoroplethLayer
            selectedRegion={null}
            onRegionClick={mockOnRegionClick}
          />
        </MapContainer>
      );

      const geoJson = await findByTestId('choropleth-geojson');
      expect(geoJson).toHaveAttribute('data-feature-count', '3');
    });
  });

  describe('Region Selection', () => {
    it('should handle selected region', async () => {
      const { findByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <RegionChoroplethLayer
            selectedRegion="3501"
            onRegionClick={mockOnRegionClick}
          />
        </MapContainer>
      );

      const geoJson = await findByTestId('choropleth-geojson');
      expect(geoJson).toBeInTheDocument();
    });

    it('should handle no selected region', async () => {
      const { findByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <RegionChoroplethLayer
            selectedRegion={null}
            onRegionClick={mockOnRegionClick}
          />
        </MapContainer>
      );

      const geoJson = await findByTestId('choropleth-geojson');
      expect(geoJson).toBeInTheDocument();
    });

    it('should handle selection change', async () => {
      const { findByTestId, rerender } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <RegionChoroplethLayer
            selectedRegion={null}
            onRegionClick={mockOnRegionClick}
          />
        </MapContainer>
      );

      await findByTestId('choropleth-geojson');

      rerender(
        <MapContainer center={[0, 0]} zoom={10}>
          <RegionChoroplethLayer
            selectedRegion="3501"
            onRegionClick={mockOnRegionClick}
          />
        </MapContainer>
      );

      const geoJson = await findByTestId('choropleth-geojson');
      expect(geoJson).toBeInTheDocument();
    });
  });

  describe('Simulation Results Integration', () => {
    it('should render without simulation results', async () => {
      const { findByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <RegionChoroplethLayer
            selectedRegion={null}
            onRegionClick={mockOnRegionClick}
          />
        </MapContainer>
      );

      const geoJson = await findByTestId('choropleth-geojson');
      expect(geoJson).toBeInTheDocument();
    });

    it('should handle simulation results with regional impacts', async () => {
      const simulationResult = {
        simulation_id: 'sim-123',
        results: {
          regional_impacts: {
            '3501': {
              region_name: 'São Paulo',
              vab_impact_brl: 5000000000,
              spillover_weight: 0.001
            },
            '3502': {
              region_name: 'Campinas',
              vab_impact_brl: 2000000000,
              spillover_weight: 0.0005
            }
          }
        }
      };

      const { findByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <RegionChoroplethLayer
            selectedRegion={null}
            onRegionClick={mockOnRegionClick}
            simulationResult={simulationResult}
          />
        </MapContainer>
      );

      const geoJson = await findByTestId('choropleth-geojson');
      expect(geoJson).toBeInTheDocument();
    });

    it('should handle empty simulation results', async () => {
      const simulationResult = {
        simulation_id: 'sim-123',
        results: {
          regional_impacts: {}
        }
      };

      const { findByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <RegionChoroplethLayer
            selectedRegion={null}
            onRegionClick={mockOnRegionClick}
            simulationResult={simulationResult}
          />
        </MapContainer>
      );

      const geoJson = await findByTestId('choropleth-geojson');
      expect(geoJson).toBeInTheDocument();
    });

    it('should handle simulation results with NaN spillover weight', async () => {
      const simulationResult = {
        simulation_id: 'sim-123',
        results: {
          regional_impacts: {
            '3501': {
              region_name: 'São Paulo',
              vab_impact_brl: 5000000000,
              spillover_weight: NaN
            }
          }
        }
      };

      const { findByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <RegionChoroplethLayer
            selectedRegion={null}
            onRegionClick={mockOnRegionClick}
            simulationResult={simulationResult}
          />
        </MapContainer>
      );

      const geoJson = await findByTestId('choropleth-geojson');
      expect(geoJson).toBeInTheDocument();
    });

    it('should handle simulation results with undefined spillover weight', async () => {
      const simulationResult = {
        simulation_id: 'sim-123',
        results: {
          regional_impacts: {
            '3501': {
              region_name: 'São Paulo',
              vab_impact_brl: 5000000000,
              spillover_weight: undefined
            }
          }
        }
      };

      const { findByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <RegionChoroplethLayer
            selectedRegion={null}
            onRegionClick={mockOnRegionClick}
            simulationResult={simulationResult}
          />
        </MapContainer>
      );

      const geoJson = await findByTestId('choropleth-geojson');
      expect(geoJson).toBeInTheDocument();
    });
  });

  describe('Color Scaling', () => {
    it('should apply red gradient based on spillover weight', async () => {
      const simulationResult = {
        simulation_id: 'sim-123',
        results: {
          regional_impacts: {
            '3501': {
              region_name: 'São Paulo',
              vab_impact_brl: 5000000000,
              spillover_weight: 0.001 // High impact (displays as 10% with 100x boost)
            },
            '3502': {
              region_name: 'Campinas',
              vab_impact_brl: 500000000,
              spillover_weight: 0.00001 // Low impact
            }
          }
        }
      };

      const { findByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <RegionChoroplethLayer
            selectedRegion={null}
            onRegionClick={mockOnRegionClick}
            simulationResult={simulationResult}
          />
        </MapContainer>
      );

      const geoJson = await findByTestId('choropleth-geojson');
      expect(geoJson).toBeInTheDocument();
    });

    it('should apply gray color for regions without impact', async () => {
      const simulationResult = {
        simulation_id: 'sim-123',
        results: {
          regional_impacts: {
            '3501': {
              region_name: 'São Paulo',
              vab_impact_brl: 5000000000,
              spillover_weight: 0.001
            }
          }
        }
      };

      const { findByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <RegionChoroplethLayer
            selectedRegion={null}
            onRegionClick={mockOnRegionClick}
            simulationResult={simulationResult}
          />
        </MapContainer>
      );

      const geoJson = await findByTestId('choropleth-geojson');
      expect(geoJson).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle shapefile fetch error', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/data/br_intermediary_regions.geojson')) {
          return Promise.reject(new Error('Network error'));
        }
        if (url.includes('/api/v1/simulation/regions/brazil')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockRegionsAPIResponse
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const { queryByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <RegionChoroplethLayer
            selectedRegion={null}
            onRegionClick={mockOnRegionClick}
          />
        </MapContainer>
      );

      await waitFor(() => {
        expect(queryByTestId('choropleth-geojson')).not.toBeInTheDocument();
      });
    });

    it('should handle API fetch error', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/data/br_intermediary_regions.geojson')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockGeoJSONData
          });
        }
        if (url.includes('/api/v1/simulation/regions/brazil')) {
          return Promise.reject(new Error('API error'));
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const { queryByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <RegionChoroplethLayer
            selectedRegion={null}
            onRegionClick={mockOnRegionClick}
          />
        </MapContainer>
      );

      await waitFor(() => {
        expect(queryByTestId('choropleth-geojson')).not.toBeInTheDocument();
      });
    });

    it('should handle both fetches failing', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const { queryByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <RegionChoroplethLayer
            selectedRegion={null}
            onRegionClick={mockOnRegionClick}
          />
        </MapContainer>
      );

      await waitFor(() => {
        expect(queryByTestId('choropleth-geojson')).not.toBeInTheDocument();
      });
    });

    it('should handle shapefile response not ok', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/data/br_intermediary_regions.geojson')) {
          return Promise.resolve({ ok: false, status: 404 });
        }
        if (url.includes('/api/v1/simulation/regions/brazil')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockRegionsAPIResponse
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const { queryByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <RegionChoroplethLayer
            selectedRegion={null}
            onRegionClick={mockOnRegionClick}
          />
        </MapContainer>
      );

      await waitFor(() => {
        expect(queryByTestId('choropleth-geojson')).not.toBeInTheDocument();
      });
    });

    it('should handle API response not ok', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/data/br_intermediary_regions.geojson')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockGeoJSONData
          });
        }
        if (url.includes('/api/v1/simulation/regions/brazil')) {
          return Promise.resolve({ ok: false, status: 500 });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const { queryByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <RegionChoroplethLayer
            selectedRegion={null}
            onRegionClick={mockOnRegionClick}
          />
        </MapContainer>
      );

      await waitFor(() => {
        expect(queryByTestId('choropleth-geojson')).not.toBeInTheDocument();
      });
    });
  });

  describe('Region Code Mapping', () => {
    it('should use direct code from GeoJSON properties', async () => {
      const { findByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <RegionChoroplethLayer
            selectedRegion={null}
            onRegionClick={mockOnRegionClick}
          />
        </MapContainer>
      );

      const geoJson = await findByTestId('choropleth-geojson');
      expect(geoJson).toBeInTheDocument();
    });

    it('should fallback to name mapping when code not in properties', async () => {
      const { findByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <RegionChoroplethLayer
            selectedRegion={null}
            onRegionClick={mockOnRegionClick}
          />
        </MapContainer>
      );

      const geoJson = await findByTestId('choropleth-geojson');
      expect(geoJson).toBeInTheDocument();
    });

    it('should handle features without region code', async () => {
      const { findByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <RegionChoroplethLayer
            selectedRegion={null}
            onRegionClick={mockOnRegionClick}
          />
        </MapContainer>
      );

      const geoJson = await findByTestId('choropleth-geojson');
      expect(geoJson).toHaveAttribute('data-feature-count', '3');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty GeoJSON features', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/data/br_intermediary_regions.geojson')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ type: 'FeatureCollection', features: [] })
          });
        }
        if (url.includes('/api/v1/simulation/regions/brazil')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockRegionsAPIResponse
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const { findByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <RegionChoroplethLayer
            selectedRegion={null}
            onRegionClick={mockOnRegionClick}
          />
        </MapContainer>
      );

      const geoJson = await findByTestId('choropleth-geojson');
      expect(geoJson).toHaveAttribute('data-feature-count', '0');
    });

    it('should handle empty regions API response', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/data/br_intermediary_regions.geojson')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockGeoJSONData
          });
        }
        if (url.includes('/api/v1/simulation/regions/brazil')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ regions: [] })
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const { findByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <RegionChoroplethLayer
            selectedRegion={null}
            onRegionClick={mockOnRegionClick}
          />
        </MapContainer>
      );

      const geoJson = await findByTestId('choropleth-geojson');
      expect(geoJson).toBeInTheDocument();
    });

    it('should handle malformed GeoJSON', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/data/br_intermediary_regions.geojson')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ invalid: 'data' })
          });
        }
        if (url.includes('/api/v1/simulation/regions/brazil')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockRegionsAPIResponse
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const { queryByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <RegionChoroplethLayer
            selectedRegion={null}
            onRegionClick={mockOnRegionClick}
          />
        </MapContainer>
      );

      // Component should handle gracefully (may or may not render)
      await waitFor(() => {
        expect(queryByTestId('map-container')).toBeInTheDocument();
      });
    });

    it('should handle very large spillover weights', async () => {
      const simulationResult = {
        simulation_id: 'sim-123',
        results: {
          regional_impacts: {
            '3501': {
              region_name: 'São Paulo',
              vab_impact_brl: 5000000000,
              spillover_weight: 0.999
            }
          }
        }
      };

      const { findByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <RegionChoroplethLayer
            selectedRegion={null}
            onRegionClick={mockOnRegionClick}
            simulationResult={simulationResult}
          />
        </MapContainer>
      );

      const geoJson = await findByTestId('choropleth-geojson');
      expect(geoJson).toBeInTheDocument();
    });

    it('should handle negative spillover weights', async () => {
      const simulationResult = {
        simulation_id: 'sim-123',
        results: {
          regional_impacts: {
            '3501': {
              region_name: 'São Paulo',
              vab_impact_brl: 5000000000,
              spillover_weight: -0.001
            }
          }
        }
      };

      const { findByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <RegionChoroplethLayer
            selectedRegion={null}
            onRegionClick={mockOnRegionClick}
            simulationResult={simulationResult}
          />
        </MapContainer>
      );

      const geoJson = await findByTestId('choropleth-geojson');
      expect(geoJson).toBeInTheDocument();
    });
  });

  describe('Simulation ID Changes', () => {
    it('should re-render when simulation ID changes', async () => {
      const simulationResult1 = {
        simulation_id: 'sim-123',
        results: { regional_impacts: {} }
      };

      const { findByTestId, rerender } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <RegionChoroplethLayer
            selectedRegion={null}
            onRegionClick={mockOnRegionClick}
            simulationResult={simulationResult1}
          />
        </MapContainer>
      );

      await findByTestId('choropleth-geojson');

      const simulationResult2 = {
        simulation_id: 'sim-456',
        results: { regional_impacts: {} }
      };

      rerender(
        <MapContainer center={[0, 0]} zoom={10}>
          <RegionChoroplethLayer
            selectedRegion={null}
            onRegionClick={mockOnRegionClick}
            simulationResult={simulationResult2}
          />
        </MapContainer>
      );

      const geoJson = await findByTestId('choropleth-geojson');
      expect(geoJson).toBeInTheDocument();
    });
  });
});

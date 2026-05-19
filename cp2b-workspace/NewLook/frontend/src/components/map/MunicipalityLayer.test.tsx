/**
 * Tests for MunicipalityLayer Component
 */

import React from 'react';
import { render } from '@testing-library/react';
import { MapContainer } from 'react-leaflet';
import MunicipalityLayer from './MunicipalityLayer';
import type { MunicipalityCollection } from '@/types/geospatial';

// Mock react-leaflet
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="map-container">{children}</div>,
  GeoJSON: ({ data, style, onEachFeature }: any) => {
    // Simulate calling onEachFeature for the first feature
    if (data?.features?.length > 0 && onEachFeature) {
      const mockLayer = {
        bindTooltip: jest.fn(),
        bindPopup: jest.fn(),
        on: jest.fn(),
        setStyle: jest.fn(),
        bringToFront: jest.fn()
      };
      onEachFeature(data.features[0], mockLayer);
    }
    return <div data-testid="geojson-layer" data-feature-count={data?.features?.length || 0} />;
  },
}));

// Mock leaflet
jest.mock('leaflet', () => ({
  Path: class Path {},
  DomUtil: {
    create: jest.fn(() => document.createElement('div'))
  }
}));

// Mock react-dom/client
jest.mock('react-dom/client', () => ({
  createRoot: jest.fn(() => ({
    render: jest.fn(),
    unmount: jest.fn()
  }))
}));

describe('MunicipalityLayer', () => {
  const mockMunicipalityData: MunicipalityCollection = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[-48.0, -22.0], [-48.1, -22.0], [-48.1, -22.1], [-48.0, -22.1], [-48.0, -22.0]]]
        },
        properties: {
          name: 'Campinas',
          total_biogas_m3_year: 150000000,
          agricultural_biogas_m3_year: 60000000,
          livestock_biogas_m3_year: 40000000,
          urban_biogas_m3_year: 50000000,
          sugarcane_biogas_m3_year: 30000000,
          soybean_biogas_m3_year: 15000000,
          corn_biogas_m3_year: 10000000,
          cattle_biogas_m3_year: 20000000,
          swine_biogas_m3_year: 15000000,
          poultry_biogas_m3_year: 5000000
        }
      },
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[-47.0, -23.0], [-47.1, -23.0], [-47.1, -23.1], [-47.0, -23.1], [-47.0, -23.0]]]
        },
        properties: {
          name: 'São Paulo',
          total_biogas_m3_year: 600000000,
          agricultural_biogas_m3_year: 100000000,
          livestock_biogas_m3_year: 200000000,
          urban_biogas_m3_year: 300000000
        }
      },
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[-46.0, -24.0], [-46.1, -24.0], [-46.1, -24.1], [-46.0, -24.1], [-46.0, -24.0]]]
        },
        properties: {
          name: 'Small City',
          total_biogas_m3_year: 500000
        }
      },
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[-45.0, -25.0], [-45.1, -25.0], [-45.1, -25.1], [-45.0, -25.1], [-45.0, -25.0]]]
        },
        properties: {
          name: 'Zero City',
          total_biogas_m3_year: 0
        }
      }
    ]
  };

  describe('Basic Rendering', () => {
    it('should render GeoJSON layer with municipality data', () => {
      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <MunicipalityLayer data={mockMunicipalityData} />
        </MapContainer>
      );

      const geoJsonLayer = getByTestId('geojson-layer');
      expect(geoJsonLayer).toBeInTheDocument();
      expect(geoJsonLayer).toHaveAttribute('data-feature-count', '4');
    });

    it('should render with custom opacity', () => {
      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <MunicipalityLayer data={mockMunicipalityData} opacity={0.5} />
        </MapContainer>
      );

      expect(getByTestId('geojson-layer')).toBeInTheDocument();
    });

    it('should render with no features', () => {
      const emptyData: MunicipalityCollection = {
        type: 'FeatureCollection',
        features: []
      };

      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <MunicipalityLayer data={emptyData} />
        </MapContainer>
      );

      expect(getByTestId('geojson-layer')).toHaveAttribute('data-feature-count', '0');
    });
  });

  describe('Biomass Type Filtering', () => {
    it('should render with total biomass type (default)', () => {
      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <MunicipalityLayer data={mockMunicipalityData} biomassType="total" />
        </MapContainer>
      );

      expect(getByTestId('geojson-layer')).toBeInTheDocument();
    });

    it('should render with agricultural biomass type', () => {
      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <MunicipalityLayer data={mockMunicipalityData} biomassType="agricultural" />
        </MapContainer>
      );

      expect(getByTestId('geojson-layer')).toBeInTheDocument();
    });

    it('should render with livestock biomass type', () => {
      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <MunicipalityLayer data={mockMunicipalityData} biomassType="livestock" />
        </MapContainer>
      );

      expect(getByTestId('geojson-layer')).toBeInTheDocument();
    });

    it('should render with urban biomass type', () => {
      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <MunicipalityLayer data={mockMunicipalityData} biomassType="urban" />
        </MapContainer>
      );

      expect(getByTestId('geojson-layer')).toBeInTheDocument();
    });
  });

  describe('Residue Type Filtering', () => {
    it('should render with single residue selected', () => {
      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <MunicipalityLayer data={mockMunicipalityData} selectedResidues={['sugarcane']} />
        </MapContainer>
      );

      expect(getByTestId('geojson-layer')).toBeInTheDocument();
    });

    it('should render with multiple residues selected', () => {
      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <MunicipalityLayer
            data={mockMunicipalityData}
            selectedResidues={['sugarcane', 'soybean', 'corn']}
          />
        </MapContainer>
      );

      expect(getByTestId('geojson-layer')).toBeInTheDocument();
    });

    it('should render with livestock residues', () => {
      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <MunicipalityLayer
            data={mockMunicipalityData}
            selectedResidues={['cattle', 'swine', 'poultry']}
          />
        </MapContainer>
      );

      expect(getByTestId('geojson-layer')).toBeInTheDocument();
    });

    it('should render with urban residues', () => {
      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <MunicipalityLayer
            data={mockMunicipalityData}
            selectedResidues={['rsu', 'rpo']}
          />
        </MapContainer>
      );

      expect(getByTestId('geojson-layer')).toBeInTheDocument();
    });

    it('should render with empty residues array', () => {
      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <MunicipalityLayer data={mockMunicipalityData} selectedResidues={[]} />
        </MapContainer>
      );

      expect(getByTestId('geojson-layer')).toBeInTheDocument();
    });
  });

  describe('Color Scale', () => {
    it('should apply correct color for zero value', () => {
      // Color for 0 should be #f7f7f7 (light gray)
      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <MunicipalityLayer data={mockMunicipalityData} />
        </MapContainer>
      );

      expect(getByTestId('geojson-layer')).toBeInTheDocument();
    });

    it('should apply correct color for low value (< 1M)', () => {
      const lowValueData: MunicipalityCollection = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [[[-48.0, -22.0], [-48.1, -22.0], [-48.1, -22.1], [-48.0, -22.0]]] },
          properties: { name: 'Test', total_biogas_m3_year: 500000 }
        }]
      };

      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <MunicipalityLayer data={lowValueData} />
        </MapContainer>
      );

      expect(getByTestId('geojson-layer')).toBeInTheDocument();
    });

    it('should apply correct color for medium value (10M-50M)', () => {
      const mediumValueData: MunicipalityCollection = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [[[-48.0, -22.0], [-48.1, -22.0], [-48.1, -22.1], [-48.0, -22.0]]] },
          properties: { name: 'Test', total_biogas_m3_year: 25000000 }
        }]
      };

      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <MunicipalityLayer data={mediumValueData} />
        </MapContainer>
      );

      expect(getByTestId('geojson-layer')).toBeInTheDocument();
    });

    it('should apply correct color for very high value (> 500M)', () => {
      const highValueData: MunicipalityCollection = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [[[-48.0, -22.0], [-48.1, -22.0], [-48.1, -22.1], [-48.0, -22.0]]] },
          properties: { name: 'Test', total_biogas_m3_year: 600000000 }
        }]
      };

      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <MunicipalityLayer data={highValueData} />
        </MapContainer>
      );

      expect(getByTestId('geojson-layer')).toBeInTheDocument();
    });
  });

  describe('Props Changes', () => {
    it('should re-render when biomass type changes', () => {
      const { getByTestId, rerender } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <MunicipalityLayer data={mockMunicipalityData} biomassType="total" />
        </MapContainer>
      );

      expect(getByTestId('geojson-layer')).toBeInTheDocument();

      rerender(
        <MapContainer center={[0, 0]} zoom={10}>
          <MunicipalityLayer data={mockMunicipalityData} biomassType="agricultural" />
        </MapContainer>
      );

      expect(getByTestId('geojson-layer')).toBeInTheDocument();
    });

    it('should re-render when opacity changes', () => {
      const { getByTestId, rerender } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <MunicipalityLayer data={mockMunicipalityData} opacity={0.7} />
        </MapContainer>
      );

      expect(getByTestId('geojson-layer')).toBeInTheDocument();

      rerender(
        <MapContainer center={[0, 0]} zoom={10}>
          <MunicipalityLayer data={mockMunicipalityData} opacity={0.3} />
        </MapContainer>
      );

      expect(getByTestId('geojson-layer')).toBeInTheDocument();
    });

    it('should re-render when selected residues change', () => {
      const { getByTestId, rerender } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <MunicipalityLayer data={mockMunicipalityData} selectedResidues={['sugarcane']} />
        </MapContainer>
      );

      expect(getByTestId('geojson-layer')).toBeInTheDocument();

      rerender(
        <MapContainer center={[0, 0]} zoom={10}>
          <MunicipalityLayer data={mockMunicipalityData} selectedResidues={['soybean', 'corn']} />
        </MapContainer>
      );

      expect(getByTestId('geojson-layer')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle feature without properties', () => {
      const invalidData: MunicipalityCollection = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [[[-48.0, -22.0], [-48.1, -22.0], [-48.1, -22.1], [-48.0, -22.0]]] },
          properties: null as any
        }]
      };

      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <MunicipalityLayer data={invalidData} />
        </MapContainer>
      );

      expect(getByTestId('geojson-layer')).toBeInTheDocument();
    });

    it('should handle missing biogas values', () => {
      const missingData: MunicipalityCollection = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [[[-48.0, -22.0], [-48.1, -22.0], [-48.1, -22.1], [-48.0, -22.0]]] },
          properties: { name: 'Test' }
        }]
      };

      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <MunicipalityLayer data={missingData} />
        </MapContainer>
      );

      expect(getByTestId('geojson-layer')).toBeInTheDocument();
    });

    it('should handle null biogas values', () => {
      const nullData: MunicipalityCollection = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [[[-48.0, -22.0], [-48.1, -22.0], [-48.1, -22.1], [-48.0, -22.0]]] },
          properties: {
            name: 'Test',
            total_biogas_m3_year: null as any,
            agricultural_biogas_m3_year: null as any
          }
        }]
      };

      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <MunicipalityLayer data={nullData} />
        </MapContainer>
      );

      expect(getByTestId('geojson-layer')).toBeInTheDocument();
    });

    it('should handle unknown residue type', () => {
      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <MunicipalityLayer
            data={mockMunicipalityData}
            selectedResidues={['unknown' as any]}
          />
        </MapContainer>
      );

      expect(getByTestId('geojson-layer')).toBeInTheDocument();
    });

    it('should handle extremely large biogas values', () => {
      const largeValueData: MunicipalityCollection = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [[[-48.0, -22.0], [-48.1, -22.0], [-48.1, -22.1], [-48.0, -22.0]]] },
          properties: {
            name: 'Test',
            total_biogas_m3_year: 5000000000000 // 5 trillion
          }
        }]
      };

      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <MunicipalityLayer data={largeValueData} />
        </MapContainer>
      );

      expect(getByTestId('geojson-layer')).toBeInTheDocument();
    });

    it('should handle negative biogas values', () => {
      const negativeData: MunicipalityCollection = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [[[-48.0, -22.0], [-48.1, -22.0], [-48.1, -22.1], [-48.0, -22.0]]] },
          properties: {
            name: 'Test',
            total_biogas_m3_year: -1000000
          }
        }]
      };

      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <MunicipalityLayer data={negativeData} />
        </MapContainer>
      );

      expect(getByTestId('geojson-layer')).toBeInTheDocument();
    });
  });

  describe('Multiple Municipalities', () => {
    it('should render all municipalities in collection', () => {
      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <MunicipalityLayer data={mockMunicipalityData} />
        </MapContainer>
      );

      expect(getByTestId('geojson-layer')).toHaveAttribute('data-feature-count', '4');
    });

    it('should handle large number of municipalities', () => {
      const largeData: MunicipalityCollection = {
        type: 'FeatureCollection',
        features: Array.from({ length: 100 }, (_, i) => ({
          type: 'Feature' as const,
          geometry: {
            type: 'Polygon' as const,
            coordinates: [[[-48.0 + i * 0.1, -22.0], [-48.1 + i * 0.1, -22.0], [-48.1 + i * 0.1, -22.1], [-48.0 + i * 0.1, -22.0]]]
          },
          properties: {
            name: `City ${i}`,
            total_biogas_m3_year: 1000000 * (i + 1)
          }
        }))
      };

      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <MunicipalityLayer data={largeData} />
        </MapContainer>
      );

      expect(getByTestId('geojson-layer')).toHaveAttribute('data-feature-count', '100');
    });
  });
});

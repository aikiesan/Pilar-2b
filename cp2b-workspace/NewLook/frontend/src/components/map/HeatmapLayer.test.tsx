/**
 * Tests for HeatmapLayer Component
 */

import React from 'react';
import { render } from '@testing-library/react';
import { MapContainer } from 'react-leaflet';
import HeatmapLayer from './HeatmapLayer';
import type { MunicipalityCollection } from '@/types/geospatial';

// Mock react-leaflet
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="map-container">{children}</div>,
  CircleMarker: ({ center, radius, pathOptions, children }: any) => (
    <div
      data-testid="circle-marker"
      data-center={JSON.stringify(center)}
      data-radius={radius}
      data-color={pathOptions?.fillColor}
      data-opacity={pathOptions?.fillOpacity}
    >
      {children}
    </div>
  ),
  Tooltip: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip">{children}</div>,
}));

describe('HeatmapLayer', () => {
  const mockMunicipalityData: MunicipalityCollection = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [-48.0, -22.0],
            [-48.1, -22.0],
            [-48.1, -22.1],
            [-48.0, -22.1],
            [-48.0, -22.0]
          ]]
        },
        properties: {
          name: 'Campinas',
          total_biogas_m3_year: 150000000,
          sugarcane_biogas_m3_year: 50000000,
          soybean_biogas_m3_year: 30000000,
          corn_biogas_m3_year: 20000000,
          cattle_biogas_m3_year: 25000000,
          swine_biogas_m3_year: 15000000,
          poultry_biogas_m3_year: 10000000
        }
      },
      {
        type: 'Feature',
        geometry: {
          type: 'MultiPolygon',
          coordinates: [
            [[
              [-47.0, -23.0],
              [-47.1, -23.0],
              [-47.1, -23.1],
              [-47.0, -23.1],
              [-47.0, -23.0]
            ]]
          ]
        },
        properties: {
          name: 'São Paulo',
          total_biogas_m3_year: 600000000,
          sugarcane_biogas_m3_year: 100000000,
          cattle_biogas_m3_year: 200000000
        }
      },
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [-46.0, -24.0],
            [-46.1, -24.0],
            [-46.1, -24.1],
            [-46.0, -24.1],
            [-46.0, -24.0]
          ]]
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
          coordinates: [[
            [-45.0, -25.0],
            [-45.1, -25.0],
            [-45.1, -25.1],
            [-45.0, -25.1],
            [-45.0, -25.0]
          ]]
        },
        properties: {
          name: 'Zero City',
          total_biogas_m3_year: 0
        }
      }
    ]
  };

  describe('Basic Rendering', () => {
    it('should render circle markers for municipalities with biogas data', () => {
      const { getAllByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <HeatmapLayer data={mockMunicipalityData} selectedResidues={[]} />
        </MapContainer>
      );

      const markers = getAllByTestId('circle-marker');
      // Should render 3 markers (excluding zero value)
      expect(markers).toHaveLength(3);
    });

    it('should not render markers for municipalities with zero biogas', () => {
      const { getAllByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <HeatmapLayer data={mockMunicipalityData} selectedResidues={[]} />
        </MapContainer>
      );

      const markers = getAllByTestId('circle-marker');
      // Zero City should not have a marker
      expect(markers).toHaveLength(3);
    });

    it('should render with custom opacity', () => {
      const { getAllByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <HeatmapLayer data={mockMunicipalityData} selectedResidues={[]} opacity={0.8} />
        </MapContainer>
      );

      const markers = getAllByTestId('circle-marker');
      expect(markers[0]).toHaveAttribute('data-opacity', '0.8');
    });

    it('should render with no features', () => {
      const emptyData: MunicipalityCollection = {
        type: 'FeatureCollection',
        features: []
      };

      const { queryByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <HeatmapLayer data={emptyData} selectedResidues={[]} />
        </MapContainer>
      );

      expect(queryByTestId('circle-marker')).not.toBeInTheDocument();
    });
  });

  describe('Centroid Calculation', () => {
    it('should calculate centroid for Polygon geometry', () => {
      const { getAllByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <HeatmapLayer data={mockMunicipalityData} selectedResidues={[]} />
        </MapContainer>
      );

      const markers = getAllByTestId('circle-marker');
      const firstMarkerCenter = JSON.parse(markers[0].getAttribute('data-center') || '[]');

      // Should calculate average of polygon coordinates
      expect(firstMarkerCenter).toHaveLength(2);
      expect(typeof firstMarkerCenter[0]).toBe('number');
      expect(typeof firstMarkerCenter[1]).toBe('number');
    });

    it('should calculate centroid for MultiPolygon geometry', () => {
      const { getAllByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <HeatmapLayer data={mockMunicipalityData} selectedResidues={[]} />
        </MapContainer>
      );

      const markers = getAllByTestId('circle-marker');
      // São Paulo is a MultiPolygon (second feature with non-zero value)
      const multiPolygonMarker = markers.find(m => {
        const center = JSON.parse(m.getAttribute('data-center') || '[]');
        return center[1] < -47.0 && center[1] > -47.2; // lng around -47.05
      });

      expect(multiPolygonMarker).toBeTruthy();
    });
  });

  describe('Residue Filtering', () => {
    it('should use total biogas when no residues selected', () => {
      const { getAllByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <HeatmapLayer data={mockMunicipalityData} selectedResidues={[]} />
        </MapContainer>
      );

      const markers = getAllByTestId('circle-marker');
      expect(markers).toHaveLength(3);
    });

    it('should filter by single residue', () => {
      const { getAllByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <HeatmapLayer data={mockMunicipalityData} selectedResidues={['sugarcane']} />
        </MapContainer>
      );

      const markers = getAllByTestId('circle-marker');
      // Only municipalities with sugarcane data > 0
      expect(markers.length).toBeGreaterThan(0);
    });

    it('should sum multiple residues', () => {
      const { getAllByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <HeatmapLayer data={mockMunicipalityData} selectedResidues={['sugarcane', 'soybean', 'corn']} />
        </MapContainer>
      );

      const markers = getAllByTestId('circle-marker');
      expect(markers.length).toBeGreaterThan(0);
    });

    it('should handle livestock residues', () => {
      const { getAllByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <HeatmapLayer data={mockMunicipalityData} selectedResidues={['cattle', 'swine', 'poultry']} />
        </MapContainer>
      );

      const markers = getAllByTestId('circle-marker');
      expect(markers.length).toBeGreaterThan(0);
    });

    it('should handle urban residues', () => {
      const dataWithUrban: MunicipalityCollection = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[[-48.0, -22.0], [-48.1, -22.0], [-48.1, -22.1], [-48.0, -22.1], [-48.0, -22.0]]]
          },
          properties: {
            name: 'Urban City',
            total_biogas_m3_year: 100000000,
            rsu_biogas_m3_year: 50000000,
            rpo_biogas_m3_year: 30000000
          }
        }]
      };

      const { getAllByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <HeatmapLayer data={dataWithUrban} selectedResidues={['rsu', 'rpo']} />
        </MapContainer>
      );

      const markers = getAllByTestId('circle-marker');
      expect(markers).toHaveLength(1);
    });

    it('should handle aquaculture residue', () => {
      const dataWithAquaculture: MunicipalityCollection = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[[-48.0, -22.0], [-48.1, -22.0], [-48.1, -22.1], [-48.0, -22.1], [-48.0, -22.0]]]
          },
          properties: {
            name: 'Aquaculture City',
            total_biogas_m3_year: 100000000,
            aquaculture_biogas_m3_year: 10000000
          }
        }]
      };

      const { getAllByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <HeatmapLayer data={dataWithAquaculture} selectedResidues={['aquaculture']} />
        </MapContainer>
      );

      const markers = getAllByTestId('circle-marker');
      expect(markers).toHaveLength(1);
    });

    it('should handle coffee and citrus residues', () => {
      const dataWithCrops: MunicipalityCollection = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[[-48.0, -22.0], [-48.1, -22.0], [-48.1, -22.1], [-48.0, -22.1], [-48.0, -22.0]]]
          },
          properties: {
            name: 'Coffee City',
            total_biogas_m3_year: 100000000,
            coffee_biogas_m3_year: 30000000,
            citrus_biogas_m3_year: 20000000
          }
        }]
      };

      const { getAllByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <HeatmapLayer data={dataWithCrops} selectedResidues={['coffee', 'citrus']} />
        </MapContainer>
      );

      const markers = getAllByTestId('circle-marker');
      expect(markers).toHaveLength(1);
    });
  });

  describe('Color Calculation', () => {
    it('should apply light yellow for low values (< 1M)', () => {
      const lowValueData: MunicipalityCollection = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[[-48.0, -22.0], [-48.1, -22.0], [-48.1, -22.1], [-48.0, -22.1], [-48.0, -22.0]]]
          },
          properties: {
            name: 'Low City',
            total_biogas_m3_year: 500000
          }
        }]
      };

      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <HeatmapLayer data={lowValueData} selectedResidues={[]} />
        </MapContainer>
      );

      const marker = getByTestId('circle-marker');
      expect(marker).toHaveAttribute('data-color', '#ffffb2');
    });

    it('should apply orange for medium values (10M-50M)', () => {
      const mediumValueData: MunicipalityCollection = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[[-48.0, -22.0], [-48.1, -22.0], [-48.1, -22.1], [-48.0, -22.1], [-48.0, -22.0]]]
          },
          properties: {
            name: 'Medium City',
            total_biogas_m3_year: 25000000
          }
        }]
      };

      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <HeatmapLayer data={mediumValueData} selectedResidues={[]} />
        </MapContainer>
      );

      const marker = getByTestId('circle-marker');
      expect(marker).toHaveAttribute('data-color', '#fd8d3c');
    });

    it('should apply dark red for very high values (> 500M)', () => {
      const highValueData: MunicipalityCollection = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[[-48.0, -22.0], [-48.1, -22.0], [-48.1, -22.1], [-48.0, -22.1], [-48.0, -22.0]]]
          },
          properties: {
            name: 'High City',
            total_biogas_m3_year: 600000000
          }
        }]
      };

      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <HeatmapLayer data={highValueData} selectedResidues={[]} />
        </MapContainer>
      );

      const marker = getByTestId('circle-marker');
      expect(marker).toHaveAttribute('data-color', '#800026');
    });
  });

  describe('Radius Calculation', () => {
    it('should apply small radius for low values (< 1M)', () => {
      const lowValueData: MunicipalityCollection = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[[-48.0, -22.0], [-48.1, -22.0], [-48.1, -22.1], [-48.0, -22.1], [-48.0, -22.0]]]
          },
          properties: {
            name: 'Low City',
            total_biogas_m3_year: 500000
          }
        }]
      };

      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <HeatmapLayer data={lowValueData} selectedResidues={[]} />
        </MapContainer>
      );

      const marker = getByTestId('circle-marker');
      expect(marker).toHaveAttribute('data-radius', '5');
    });

    it('should apply medium radius for medium values (10M-50M)', () => {
      const mediumValueData: MunicipalityCollection = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[[-48.0, -22.0], [-48.1, -22.0], [-48.1, -22.1], [-48.0, -22.1], [-48.0, -22.0]]]
          },
          properties: {
            name: 'Medium City',
            total_biogas_m3_year: 25000000
          }
        }]
      };

      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <HeatmapLayer data={mediumValueData} selectedResidues={[]} />
        </MapContainer>
      );

      const marker = getByTestId('circle-marker');
      expect(marker).toHaveAttribute('data-radius', '12');
    });

    it('should apply large radius for very high values (> 500M)', () => {
      const highValueData: MunicipalityCollection = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[[-48.0, -22.0], [-48.1, -22.0], [-48.1, -22.1], [-48.0, -22.1], [-48.0, -22.0]]]
          },
          properties: {
            name: 'High City',
            total_biogas_m3_year: 600000000
          }
        }]
      };

      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <HeatmapLayer data={highValueData} selectedResidues={[]} />
        </MapContainer>
      );

      const marker = getByTestId('circle-marker');
      expect(marker).toHaveAttribute('data-radius', '25');
    });
  });

  describe('Tooltips', () => {
    it('should render tooltips for all markers', () => {
      const { getAllByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <HeatmapLayer data={mockMunicipalityData} selectedResidues={[]} />
        </MapContainer>
      );

      const tooltips = getAllByTestId('tooltip');
      expect(tooltips).toHaveLength(3); // Excluding zero value
    });

    it('should display municipality name in tooltip', () => {
      const { getAllByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <HeatmapLayer data={mockMunicipalityData} selectedResidues={[]} />
        </MapContainer>
      );

      const tooltips = getAllByTestId('tooltip');
      expect(tooltips[0].textContent).toContain('Campinas');
    });

    it('should display biogas value in tooltip', () => {
      const { getAllByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <HeatmapLayer data={mockMunicipalityData} selectedResidues={[]} />
        </MapContainer>
      );

      const tooltips = getAllByTestId('tooltip');
      expect(tooltips[0].textContent).toContain('m³/ano');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing biogas values', () => {
      const missingData: MunicipalityCollection = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[[-48.0, -22.0], [-48.1, -22.0], [-48.1, -22.1], [-48.0, -22.1], [-48.0, -22.0]]]
          },
          properties: { name: 'Test' }
        }]
      };

      const { queryByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <HeatmapLayer data={missingData} selectedResidues={[]} />
        </MapContainer>
      );

      // Should not render marker for missing/zero value
      expect(queryByTestId('circle-marker')).not.toBeInTheDocument();
    });

    it('should handle null biogas values', () => {
      const nullData: MunicipalityCollection = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[[-48.0, -22.0], [-48.1, -22.0], [-48.1, -22.1], [-48.0, -22.1], [-48.0, -22.0]]]
          },
          properties: {
            name: 'Test',
            total_biogas_m3_year: null as any
          }
        }]
      };

      const { queryByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <HeatmapLayer data={nullData} selectedResidues={[]} />
        </MapContainer>
      );

      expect(queryByTestId('circle-marker')).not.toBeInTheDocument();
    });

    it('should handle unknown geometry type', () => {
      const unknownGeometry: MunicipalityCollection = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: {
            type: 'Point' as any,
            coordinates: [-48.0, -22.0]
          },
          properties: {
            name: 'Test',
            total_biogas_m3_year: 1000000
          }
        }]
      };

      const { queryByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <HeatmapLayer data={unknownGeometry} selectedResidues={[]} />
        </MapContainer>
      );

      // Should not crash, but won't render marker
      expect(queryByTestId('circle-marker')).not.toBeInTheDocument();
    });

    it('should handle unknown residue type', () => {
      const { getAllByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <HeatmapLayer data={mockMunicipalityData} selectedResidues={['unknown' as any]} />
        </MapContainer>
      );

      // Should not crash, but won't render markers (all values = 0)
      const markers = getAllByTestId('circle-marker');
      expect(markers.length).toBe(0);
    });

    it('should handle extremely large values', () => {
      const largeValueData: MunicipalityCollection = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[[-48.0, -22.0], [-48.1, -22.0], [-48.1, -22.1], [-48.0, -22.1], [-48.0, -22.0]]]
          },
          properties: {
            name: 'Huge City',
            total_biogas_m3_year: 5000000000000 // 5 trillion
          }
        }]
      };

      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <HeatmapLayer data={largeValueData} selectedResidues={[]} />
        </MapContainer>
      );

      const marker = getByTestId('circle-marker');
      expect(marker).toBeInTheDocument();
    });

    it('should handle single coordinate polygon (degenerate case)', () => {
      const degenerateData: MunicipalityCollection = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[[-48.0, -22.0]]]
          },
          properties: {
            name: 'Degenerate',
            total_biogas_m3_year: 1000000
          }
        }]
      };

      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <HeatmapLayer data={degenerateData} selectedResidues={[]} />
        </MapContainer>
      );

      // Should still calculate centroid from single point
      const marker = getByTestId('circle-marker');
      expect(marker).toBeInTheDocument();
    });
  });

  describe('Props Changes', () => {
    it('should re-render when selected residues change', () => {
      const { getAllByTestId, rerender } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <HeatmapLayer data={mockMunicipalityData} selectedResidues={[]} />
        </MapContainer>
      );

      const initialMarkers = getAllByTestId('circle-marker');
      expect(initialMarkers).toHaveLength(3);

      rerender(
        <MapContainer center={[0, 0]} zoom={10}>
          <HeatmapLayer data={mockMunicipalityData} selectedResidues={['sugarcane']} />
        </MapContainer>
      );

      const updatedMarkers = getAllByTestId('circle-marker');
      expect(updatedMarkers.length).toBeGreaterThan(0);
    });

    it('should re-render when opacity changes', () => {
      const { getAllByTestId, rerender } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <HeatmapLayer data={mockMunicipalityData} selectedResidues={[]} opacity={0.6} />
        </MapContainer>
      );

      let markers = getAllByTestId('circle-marker');
      expect(markers[0]).toHaveAttribute('data-opacity', '0.6');

      rerender(
        <MapContainer center={[0, 0]} zoom={10}>
          <HeatmapLayer data={mockMunicipalityData} selectedResidues={[]} opacity={0.9} />
        </MapContainer>
      );

      markers = getAllByTestId('circle-marker');
      expect(markers[0]).toHaveAttribute('data-opacity', '0.9');
    });

    it('should re-render when data changes', () => {
      const { getAllByTestId, rerender } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <HeatmapLayer data={mockMunicipalityData} selectedResidues={[]} />
        </MapContainer>
      );

      expect(getAllByTestId('circle-marker')).toHaveLength(3);

      const newData: MunicipalityCollection = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[[-48.0, -22.0], [-48.1, -22.0], [-48.1, -22.1], [-48.0, -22.1], [-48.0, -22.0]]]
          },
          properties: { name: 'Single City', total_biogas_m3_year: 1000000 }
        }]
      };

      rerender(
        <MapContainer center={[0, 0]} zoom={10}>
          <HeatmapLayer data={newData} selectedResidues={[]} />
        </MapContainer>
      );

      expect(getAllByTestId('circle-marker')).toHaveLength(1);
    });
  });
});

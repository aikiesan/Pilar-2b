/**
 * Tests for InfrastructureLayer Component
 */

import React from 'react';
import { render } from '@testing-library/react';
import { MapContainer } from 'react-leaflet';
import InfrastructureLayer from './InfrastructureLayer';

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock useGeospatialData hook
const mockUseInfrastructureLayer = jest.fn();
jest.mock('@/hooks/useGeospatialData', () => ({
  useInfrastructureLayer: (layerType: string, enabled: boolean) => mockUseInfrastructureLayer(layerType, enabled)
}));

// Mock react-leaflet
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="map-container">{children}</div>,
  GeoJSON: ({ data, style, pointToLayer, onEachFeature }: any) => {
    // Call pointToLayer for point features if provided
    if (data?.features?.length > 0 && pointToLayer && data.features[0].geometry.type === 'Point') {
      const mockLatLng = { lat: 0, lng: 0 } as any;
      pointToLayer(data.features[0], mockLatLng);
    }

    // Call onEachFeature if provided
    if (data?.features?.length > 0 && onEachFeature) {
      const mockLayer = {
        bindPopup: jest.fn(),
        bindTooltip: jest.fn(),
        on: jest.fn(),
        setStyle: jest.fn(),
        bringToFront: jest.fn()
      };
      onEachFeature(data.features[0], mockLayer);
    }

    return (
      <div
        data-testid="infrastructure-geojson"
        data-feature-count={data?.features?.length || 0}
      />
    );
  },
  Marker: ({ position, icon }: any) => <div data-testid="marker" data-position={JSON.stringify(position)} />
}));

// Mock leaflet
jest.mock('leaflet', () => ({
  Path: class Path {},
  marker: jest.fn((latlng, options) => ({ latlng, options })),
  divIcon: jest.fn((options) => options)
}));

describe('InfrastructureLayer', () => {
  const mockLineData = {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [[-48.0, -22.0], [-48.1, -22.1]]
      },
      properties: {
        nome: 'Test Railway',
        tipo: 'Ferrovia',
        operador: 'Test Operator',
        status: 'Ativa'
      }
    }]
  };

  const mockPointData = {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [-48.0, -22.0]
      },
      properties: {
        nome: 'Test Substation',
        potencia: 50000,
        combust: 'Biomassa',
        propriet: 'Test Owner'
      }
    }]
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading States', () => {
    it('should render nothing when loading', () => {
      mockUseInfrastructureLayer.mockReturnValue({
        data: null,
        loading: true,
        error: null,
        isFetching: false
      });

      const { queryByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <InfrastructureLayer layerType="railways" />
        </MapContainer>
      );

      expect(queryByTestId('infrastructure-geojson')).not.toBeInTheDocument();
    });

    it('should render nothing when fetching without data', () => {
      mockUseInfrastructureLayer.mockReturnValue({
        data: null,
        loading: false,
        error: null,
        isFetching: true
      });

      const { queryByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <InfrastructureLayer layerType="railways" />
        </MapContainer>
      );

      expect(queryByTestId('infrastructure-geojson')).not.toBeInTheDocument();
    });

    it('should render data when refetching in background', () => {
      mockUseInfrastructureLayer.mockReturnValue({
        data: mockLineData,
        loading: false,
        error: null,
        isFetching: true
      });

      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <InfrastructureLayer layerType="railways" />
        </MapContainer>
      );

      expect(getByTestId('infrastructure-geojson')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should render nothing on error', () => {
      mockUseInfrastructureLayer.mockReturnValue({
        data: null,
        loading: false,
        error: new Error('Failed to load'),
        isFetching: false
      });

      const { queryByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <InfrastructureLayer layerType="railways" />
        </MapContainer>
      );

      expect(queryByTestId('infrastructure-geojson')).not.toBeInTheDocument();
    });

    it('should log error when loading fails', () => {
      const { logger } = require('@/lib/logger');
      const error = new Error('Network error');

      mockUseInfrastructureLayer.mockReturnValue({
        data: null,
        loading: false,
        error,
        isFetching: false
      });

      render(
        <MapContainer center={[0, 0]} zoom={10}>
          <InfrastructureLayer layerType="railways" />
        </MapContainer>
      );

      expect(logger.error).toHaveBeenCalledWith('Error loading railways layer:', error);
    });
  });

  describe('Line Layer Types', () => {
    it('should render railways layer', () => {
      mockUseInfrastructureLayer.mockReturnValue({
        data: mockLineData,
        loading: false,
        error: null,
        isFetching: false
      });

      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <InfrastructureLayer layerType="railways" />
        </MapContainer>
      );

      expect(getByTestId('infrastructure-geojson')).toBeInTheDocument();
      expect(mockUseInfrastructureLayer).toHaveBeenCalledWith('railways', true);
    });

    it('should render pipelines layer', () => {
      const pipelineData = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [[-48.0, -22.0], [-48.1, -22.1]] },
          properties: {
            Nome_Dut_1: 'Test Pipeline',
            Transporta: 'Gas Natural',
            Diam_Pol_x: 24,
            P_Max_Op: 100,
            COMPRIM_KM: 150
          }
        }]
      };

      mockUseInfrastructureLayer.mockReturnValue({
        data: pipelineData,
        loading: false,
        error: null,
        isFetching: false
      });

      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <InfrastructureLayer layerType="pipelines" />
        </MapContainer>
      );

      expect(getByTestId('infrastructure-geojson')).toBeInTheDocument();
      expect(mockUseInfrastructureLayer).toHaveBeenCalledWith('pipelines', true);
    });

    it('should render transmission-lines layer', () => {
      const transmissionData = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [[-48.0, -22.0], [-48.1, -22.1]] },
          properties: {
            Nome: 'Test Transmission',
            Concession: 'Test Company',
            Tensao: '500kV',
            Extensao: '200km'
          }
        }]
      };

      mockUseInfrastructureLayer.mockReturnValue({
        data: transmissionData,
        loading: false,
        error: null,
        isFetching: false
      });

      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <InfrastructureLayer layerType="transmission-lines" />
        </MapContainer>
      );

      expect(getByTestId('infrastructure-geojson')).toBeInTheDocument();
    });
  });

  describe('Point Layer Types', () => {
    it('should render substations layer', () => {
      mockUseInfrastructureLayer.mockReturnValue({
        data: mockPointData,
        loading: false,
        error: null,
        isFetching: false
      });

      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <InfrastructureLayer layerType="substations" />
        </MapContainer>
      );

      expect(getByTestId('infrastructure-geojson')).toBeInTheDocument();
      expect(mockUseInfrastructureLayer).toHaveBeenCalledWith('substations', true);
    });

    it('should render biogas-plants layer', () => {
      const biogasData = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [-48.0, -22.0] },
          properties: {
            TIPO_PLANT: 'Biogás',
            SUBTIPO: 'Biodigestor',
            STATUS: 'Ativo',
            FONTE_DADO: 'ANP'
          }
        }]
      };

      mockUseInfrastructureLayer.mockReturnValue({
        data: biogasData,
        loading: false,
        error: null,
        isFetching: false
      });

      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <InfrastructureLayer layerType="biogas-plants" />
        </MapContainer>
      );

      expect(getByTestId('infrastructure-geojson')).toBeInTheDocument();
    });

    it('should render etes layer', () => {
      const etesData = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [-48.0, -22.0] },
          properties: {
            ETE_NM: 'ETE Test',
            ETE_DS_STA: 'Ativo',
            ETE_DS_TIP: 'Lodos Ativados',
            ETE_QT_POP: 100000,
            ETE_PC_REM: 95
          }
        }]
      };

      mockUseInfrastructureLayer.mockReturnValue({
        data: etesData,
        loading: false,
        error: null,
        isFetching: false
      });

      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <InfrastructureLayer layerType="etes" />
        </MapContainer>
      );

      expect(getByTestId('infrastructure-geojson')).toBeInTheDocument();
    });
  });

  describe('Biogas Plant Types', () => {
    it('should handle ethanol plant subtype', () => {
      const ethanolData = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [-48.0, -22.0] },
          properties: {
            TIPO_PLANT: 'Biomassa',
            SUBTIPO: 'Etanol',
            STATUS: 'Ativo'
          }
        }]
      };

      mockUseInfrastructureLayer.mockReturnValue({
        data: ethanolData,
        loading: false,
        error: null,
        isFetching: false
      });

      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <InfrastructureLayer layerType="biogas-plants" />
        </MapContainer>
      );

      expect(getByTestId('infrastructure-geojson')).toBeInTheDocument();
    });

    it('should handle biomethane plant subtype', () => {
      const biomethaneData = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [-48.0, -22.0] },
          properties: {
            TIPO_PLANT: 'Biomassa',
            SUBTIPO: 'Biometano',
            STATUS: 'Ativo'
          }
        }]
      };

      mockUseInfrastructureLayer.mockReturnValue({
        data: biomethaneData,
        loading: false,
        error: null,
        isFetching: false
      });

      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <InfrastructureLayer layerType="biogas-plants" />
        </MapContainer>
      );

      expect(getByTestId('infrastructure-geojson')).toBeInTheDocument();
    });

    it('should handle UTE plant subtype', () => {
      const uteData = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [-48.0, -22.0] },
          properties: {
            TIPO_PLANT: 'Biomassa',
            SUBTIPO: 'UTE Termelétrica',
            STATUS: 'Ativo'
          }
        }]
      };

      mockUseInfrastructureLayer.mockReturnValue({
        data: uteData,
        loading: false,
        error: null,
        isFetching: false
      });

      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <InfrastructureLayer layerType="biogas-plants" />
        </MapContainer>
      );

      expect(getByTestId('infrastructure-geojson')).toBeInTheDocument();
    });

    it('should handle generic biogas plant', () => {
      const biogasData = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [-48.0, -22.0] },
          properties: {
            TIPO_PLANT: 'Biogás',
            SUBTIPO: 'Biodigestor',
            STATUS: 'Ativo'
          }
        }]
      };

      mockUseInfrastructureLayer.mockReturnValue({
        data: biogasData,
        loading: false,
        error: null,
        isFetching: false
      });

      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <InfrastructureLayer layerType="biogas-plants" />
        </MapContainer>
      );

      expect(getByTestId('infrastructure-geojson')).toBeInTheDocument();
    });

    it('should handle unknown biogas plant type', () => {
      const unknownData = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [-48.0, -22.0] },
          properties: {
            TIPO_PLANT: 'Unknown',
            SUBTIPO: 'Unknown',
            STATUS: 'Ativo'
          }
        }]
      };

      mockUseInfrastructureLayer.mockReturnValue({
        data: unknownData,
        loading: false,
        error: null,
        isFetching: false
      });

      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <InfrastructureLayer layerType="biogas-plants" />
        </MapContainer>
      );

      expect(getByTestId('infrastructure-geojson')).toBeInTheDocument();
    });
  });

  describe('Polygon Layer Types', () => {
    it('should render admin-regions layer', () => {
      const adminData = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[[-48.0, -22.0], [-48.1, -22.0], [-48.1, -22.1], [-48.0, -22.1], [-48.0, -22.0]]]
          },
          properties: {
            name: 'Test Region'
          }
        }]
      };

      mockUseInfrastructureLayer.mockReturnValue({
        data: adminData,
        loading: false,
        error: null,
        isFetching: false
      });

      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <InfrastructureLayer layerType="admin-regions" />
        </MapContainer>
      );

      expect(getByTestId('infrastructure-geojson')).toBeInTheDocument();
    });

    it('should render intermediate-regions layer', () => {
      const intermediateData = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[[-48.0, -22.0], [-48.1, -22.0], [-48.1, -22.1], [-48.0, -22.1], [-48.0, -22.0]]]
          },
          properties: {
            name: 'Test Intermediate'
          }
        }]
      };

      mockUseInfrastructureLayer.mockReturnValue({
        data: intermediateData,
        loading: false,
        error: null,
        isFetching: false
      });

      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <InfrastructureLayer layerType="intermediate-regions" />
        </MapContainer>
      );

      expect(getByTestId('infrastructure-geojson')).toBeInTheDocument();
    });

    it('should render immediate-regions layer', () => {
      const immediateData = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[[-48.0, -22.0], [-48.1, -22.0], [-48.1, -22.1], [-48.0, -22.1], [-48.0, -22.0]]]
          },
          properties: {
            name: 'Test Immediate'
          }
        }]
      };

      mockUseInfrastructureLayer.mockReturnValue({
        data: immediateData,
        loading: false,
        error: null,
        isFetching: false
      });

      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <InfrastructureLayer layerType="immediate-regions" />
        </MapContainer>
      );

      expect(getByTestId('infrastructure-geojson')).toBeInTheDocument();
    });
  });

  describe('Feature Count', () => {
    it('should render correct number of features', () => {
      const multiFeatureData = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: [[-48.0, -22.0], [-48.1, -22.1]] },
            properties: { nome: 'Railway 1' }
          },
          {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: [[-47.0, -23.0], [-47.1, -23.1]] },
            properties: { nome: 'Railway 2' }
          },
          {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: [[-46.0, -24.0], [-46.1, -24.1]] },
            properties: { nome: 'Railway 3' }
          }
        ]
      };

      mockUseInfrastructureLayer.mockReturnValue({
        data: multiFeatureData,
        loading: false,
        error: null,
        isFetching: false
      });

      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <InfrastructureLayer layerType="railways" />
        </MapContainer>
      );

      expect(getByTestId('infrastructure-geojson')).toHaveAttribute('data-feature-count', '3');
    });

    it('should handle empty features array', () => {
      const emptyData = {
        type: 'FeatureCollection',
        features: []
      };

      mockUseInfrastructureLayer.mockReturnValue({
        data: emptyData,
        loading: false,
        error: null,
        isFetching: false
      });

      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <InfrastructureLayer layerType="railways" />
        </MapContainer>
      );

      expect(getByTestId('infrastructure-geojson')).toHaveAttribute('data-feature-count', '0');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing properties', () => {
      const noPropsData = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [[-48.0, -22.0], [-48.1, -22.1]] },
          properties: {}
        }]
      };

      mockUseInfrastructureLayer.mockReturnValue({
        data: noPropsData,
        loading: false,
        error: null,
        isFetching: false
      });

      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <InfrastructureLayer layerType="railways" />
        </MapContainer>
      );

      expect(getByTestId('infrastructure-geojson')).toBeInTheDocument();
    });

    it('should handle null data', () => {
      mockUseInfrastructureLayer.mockReturnValue({
        data: null,
        loading: false,
        error: null,
        isFetching: false
      });

      const { queryByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <InfrastructureLayer layerType="railways" />
        </MapContainer>
      );

      expect(queryByTestId('infrastructure-geojson')).not.toBeInTheDocument();
    });

    it('should handle malformed GeoJSON', () => {
      const malformedData = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: null as any,
            properties: {}
          }
        ]
      };

      mockUseInfrastructureLayer.mockReturnValue({
        data: malformedData,
        loading: false,
        error: null,
        isFetching: false
      });

      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <InfrastructureLayer layerType="railways" />
        </MapContainer>
      );

      expect(getByTestId('infrastructure-geojson')).toBeInTheDocument();
    });
  });

  describe('React Query Caching', () => {
    it('should call hook with enabled=true', () => {
      mockUseInfrastructureLayer.mockReturnValue({
        data: mockLineData,
        loading: false,
        error: null,
        isFetching: false
      });

      render(
        <MapContainer center={[0, 0]} zoom={10}>
          <InfrastructureLayer layerType="railways" />
        </MapContainer>
      );

      expect(mockUseInfrastructureLayer).toHaveBeenCalledWith('railways', true);
    });

    it('should handle background refetch with existing data', () => {
      mockUseInfrastructureLayer.mockReturnValue({
        data: mockLineData,
        loading: false,
        error: null,
        isFetching: true // Background refetch
      });

      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <InfrastructureLayer layerType="railways" />
        </MapContainer>
      );

      // Should still render data during background refetch
      expect(getByTestId('infrastructure-geojson')).toBeInTheDocument();
    });
  });
});

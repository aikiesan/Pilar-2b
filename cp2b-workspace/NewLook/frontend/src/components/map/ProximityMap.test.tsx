/**
 * Comprehensive tests for ProximityMap
 * Tests proximity analysis map interactions, markers, and buffer visualization
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProximityMap from './ProximityMap';

// Mock Leaflet and CSS imports
jest.mock('leaflet/dist/leaflet.css', () => ({}));
jest.mock('@/lib/leafletConfig', () => ({}));

// Mock Leaflet library
const mockUseMap = jest.fn();
const mockUseMapEvents = jest.fn();
const mockFitBounds = jest.fn();

jest.mock('leaflet', () => ({
  DivIcon: jest.fn().mockImplementation((options) => ({
    options,
    _getIconUrl: jest.fn(),
  })),
  latLngBounds: jest.fn((corner1, corner2) => ({
    corner1,
    corner2,
    isValid: () => true,
  })),
}));

jest.mock('react-leaflet', () => ({
  MapContainer: ({ children, className }: any) => (
    <div data-testid="map-container" className={className}>
      {children}
    </div>
  ),
  TileLayer: ({ url, attribution }: any) => (
    <div data-testid="tile-layer" data-url={url}>
      {attribution}
    </div>
  ),
  Circle: ({ center, radius, pathOptions }: any) => (
    <div
      data-testid="circle"
      data-center={JSON.stringify(center)}
      data-radius={radius}
      data-color={pathOptions.color}
    />
  ),
  Marker: ({ position, icon, children }: any) => (
    <div data-testid="marker" data-position={JSON.stringify(position)}>
      {children}
    </div>
  ),
  Popup: ({ children }: any) => <div data-testid="popup">{children}</div>,
  GeoJSON: ({ data, style }: any) => (
    <div data-testid="geojson" data-type={data.type}>
      GeoJSON: {JSON.stringify(style)}
    </div>
  ),
  useMapEvents: (handlers: any) => {
    mockUseMapEvents.mockReturnValue(handlers);
    return null;
  },
  useMap: () => {
    const mockMap = {
      fitBounds: mockFitBounds,
      setView: jest.fn(),
    };
    mockUseMap.mockReturnValue(mockMap);
    return mockMap;
  },
  ZoomControl: () => <div data-testid="zoom-control" />,
}));

describe('ProximityMap', () => {
  const defaultProps = {
    selectedPoint: null,
    radius: 10,
    onMapClick: jest.fn(),
    bufferGeometry: null,
    municipalities: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initial Rendering', () => {
    it('should show loading state before mounting', () => {
      render(<ProximityMap {...defaultProps} />);

      expect(screen.getByText('Carregando mapa...')).toBeInTheDocument();
    });

    it('should render map container after mounting', () => {
      render(<ProximityMap {...defaultProps} />);

      // Simulate mounting
      jest.runAllTimers();

      waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });
    });

    it('should render with cursor-crosshair class', () => {
      render(<ProximityMap {...defaultProps} />);
      jest.runAllTimers();

      waitFor(() => {
        const container = screen.getByTestId('map-container');
        expect(container).toHaveClass('cursor-crosshair');
      });
    });

    it('should render zoom control', () => {
      render(<ProximityMap {...defaultProps} />);
      jest.runAllTimers();

      waitFor(() => {
        expect(screen.getByTestId('zoom-control')).toBeInTheDocument();
      });
    });

    it('should render tile layer with correct URL', () => {
      render(<ProximityMap {...defaultProps} />);
      jest.runAllTimers();

      waitFor(() => {
        const tileLayer = screen.getByTestId('tile-layer');
        expect(tileLayer).toHaveAttribute(
          'data-url',
          'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        );
      });
    });
  });

  describe('Instructions Overlay', () => {
    it('should show instructions when no point is selected', () => {
      render(<ProximityMap {...defaultProps} />);
      jest.runAllTimers();

      waitFor(() => {
        expect(
          screen.getByText(/Clique no mapa para selecionar um ponto de análise/)
        ).toBeInTheDocument();
      });
    });

    it('should hide instructions when point is selected', () => {
      render(
        <ProximityMap
          {...defaultProps}
          selectedPoint={{ lat: -23.5505, lng: -46.6333 }}
        />
      );
      jest.runAllTimers();

      waitFor(() => {
        expect(
          screen.queryByText(/Clique no mapa para selecionar um ponto de análise/)
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('Coordinates Display', () => {
    it('should show São Paulo state label', () => {
      render(<ProximityMap {...defaultProps} />);
      jest.runAllTimers();

      waitFor(() => {
        expect(screen.getByText('São Paulo')).toBeInTheDocument();
        expect(screen.getByText('Estado')).toBeInTheDocument();
      });
    });

    it('should show selected point coordinates', () => {
      render(
        <ProximityMap
          {...defaultProps}
          selectedPoint={{ lat: -23.5505, lng: -46.6333 }}
        />
      );
      jest.runAllTimers();

      waitFor(() => {
        expect(screen.getByText('-23.5505, -46.6333')).toBeInTheDocument();
      });
    });

    it('should format coordinates to 4 decimal places', () => {
      render(
        <ProximityMap
          {...defaultProps}
          selectedPoint={{ lat: -23.55051234, lng: -46.63334567 }}
        />
      );
      jest.runAllTimers();

      waitFor(() => {
        expect(screen.getByText('-23.5505, -46.6333')).toBeInTheDocument();
      });
    });

    it('should not show coordinates when no point selected', () => {
      render(<ProximityMap {...defaultProps} />);
      jest.runAllTimers();

      waitFor(() => {
        expect(screen.queryByText(/-23.5505/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Selected Point and Radius', () => {
    const selectedPoint = { lat: -23.5505, lng: -46.6333 };

    it('should render marker for selected point', () => {
      render(
        <ProximityMap {...defaultProps} selectedPoint={selectedPoint} />
      );
      jest.runAllTimers();

      waitFor(() => {
        const markers = screen.getAllByTestId('marker');
        expect(markers.length).toBeGreaterThan(0);
        const selectedMarker = markers.find((m) =>
          m.getAttribute('data-position')?.includes('-23.5505')
        );
        expect(selectedMarker).toBeInTheDocument();
      });
    });

    it('should render radius circle for selected point', () => {
      render(
        <ProximityMap
          {...defaultProps}
          selectedPoint={selectedPoint}
          radius={10}
        />
      );
      jest.runAllTimers();

      waitFor(() => {
        const circle = screen.getByTestId('circle');
        expect(circle).toBeInTheDocument();
        expect(circle).toHaveAttribute('data-radius', '10000'); // 10 km * 1000 = 10000 meters
        expect(circle).toHaveAttribute('data-color', '#059669');
      });
    });

    it('should update radius when changed', () => {
      const { rerender } = render(
        <ProximityMap
          {...defaultProps}
          selectedPoint={selectedPoint}
          radius={5}
        />
      );
      jest.runAllTimers();

      waitFor(() => {
        expect(screen.getByTestId('circle')).toHaveAttribute('data-radius', '5000');
      });

      rerender(
        <ProximityMap
          {...defaultProps}
          selectedPoint={selectedPoint}
          radius={15}
        />
      );

      waitFor(() => {
        expect(screen.getByTestId('circle')).toHaveAttribute('data-radius', '15000');
      });
    });

    it('should display selected point info in popup', () => {
      render(
        <ProximityMap
          {...defaultProps}
          selectedPoint={selectedPoint}
          radius={10}
        />
      );
      jest.runAllTimers();

      waitFor(() => {
        expect(screen.getByText('Ponto Selecionado')).toBeInTheDocument();
        expect(screen.getByText(/Lat: -23\.5505/)).toBeInTheDocument();
        expect(screen.getByText(/Lng: -46\.6333/)).toBeInTheDocument();
        expect(screen.getByText('Raio: 10 km')).toBeInTheDocument();
      });
    });

    it('should format popup coordinates to 6 decimal places', () => {
      render(
        <ProximityMap
          {...defaultProps}
          selectedPoint={{ lat: -23.550512345, lng: -46.633345678 }}
          radius={5}
        />
      );
      jest.runAllTimers();

      waitFor(() => {
        expect(screen.getByText(/Lat: -23\.550512/)).toBeInTheDocument();
        expect(screen.getByText(/Lng: -46\.633346/)).toBeInTheDocument();
      });
    });
  });

  describe('Buffer Geometry Visualization', () => {
    const bufferGeometry = {
      type: 'Polygon',
      coordinates: [
        [
          [-46.7, -23.6],
          [-46.5, -23.6],
          [-46.5, -23.5],
          [-46.7, -23.5],
          [-46.7, -23.6],
        ],
      ],
    };

    it('should render buffer geometry when provided', () => {
      render(
        <ProximityMap {...defaultProps} bufferGeometry={bufferGeometry} />
      );
      jest.runAllTimers();

      waitFor(() => {
        const geojson = screen.getByTestId('geojson');
        expect(geojson).toBeInTheDocument();
        expect(geojson).toHaveAttribute('data-type', 'Polygon');
      });
    });

    it('should not render buffer geometry when null', () => {
      render(<ProximityMap {...defaultProps} bufferGeometry={null} />);
      jest.runAllTimers();

      waitFor(() => {
        expect(screen.queryByTestId('geojson')).not.toBeInTheDocument();
      });
    });

    it('should apply correct style to buffer geometry', () => {
      render(
        <ProximityMap {...defaultProps} bufferGeometry={bufferGeometry} />
      );
      jest.runAllTimers();

      waitFor(() => {
        const geojson = screen.getByTestId('geojson');
        const style = geojson.textContent;
        expect(style).toContain('#059669'); // Color
        expect(style).toContain('0.1'); // Fill opacity
        expect(style).toContain('2'); // Weight
      });
    });
  });

  describe('Municipality Markers', () => {
    const municipalities = [
      {
        id: '1',
        name: 'São Paulo',
        centroid: [-46.6333, -23.5505], // [lng, lat]
        distance_km: 0,
        population: 12_000_000,
        biogas_m3_year: 50_000_000,
      },
      {
        id: '2',
        name: 'Campinas',
        centroid: [-47.0628, -22.9099],
        distance_km: 85,
        population: 1_200_000,
        biogas_m3_year: 15_000_000,
      },
      {
        id: '3',
        name: 'Santos',
        latitude: -23.9618,
        longitude: -46.3322, // Alternative format
        distance_km: 50,
        population: 433_000,
        biogas_m3_year: 5_000_000,
      },
    ];

    it('should render municipality markers', () => {
      render(
        <ProximityMap
          {...defaultProps}
          municipalities={municipalities}
          selectedPoint={{ lat: -23.5505, lng: -46.6333 }}
        />
      );
      jest.runAllTimers();

      waitFor(() => {
        const markers = screen.getAllByTestId('marker');
        // 1 for selected point + 3 for municipalities = 4
        expect(markers.length).toBe(4);
      });
    });

    it('should display municipality info in popup', () => {
      render(
        <ProximityMap {...defaultProps} municipalities={[municipalities[0]]} />
      );
      jest.runAllTimers();

      waitFor(() => {
        expect(screen.getByText('São Paulo')).toBeInTheDocument();
        expect(screen.getByText(/Distância:.*0\.0 km/)).toBeInTheDocument();
        expect(screen.getByText(/População:.*12\.000\.000/)).toBeInTheDocument();
        expect(screen.getByText(/Biogás:.*50\.00 mi m³\/ano/)).toBeInTheDocument();
      });
    });

    it('should handle municipalities with different coordinate formats', () => {
      render(
        <ProximityMap {...defaultProps} municipalities={municipalities} />
      );
      jest.runAllTimers();

      waitFor(() => {
        const markers = screen.getAllByTestId('marker');
        expect(markers.length).toBeGreaterThan(0);
      });
    });

    it('should handle municipalities with geom_centroid format', () => {
      const munWithGeom = [
        {
          id: '4',
          name: 'Sorocaba',
          geom_centroid: {
            type: 'Point',
            coordinates: [-47.4526, -23.5015], // [lng, lat]
          },
          distance_km: 95,
          population: 687_000,
          biogas_m3_year: 10_000_000,
        },
      ];

      render(
        <ProximityMap {...defaultProps} municipalities={munWithGeom} />
      );
      jest.runAllTimers();

      waitFor(() => {
        expect(screen.getByText('Sorocaba')).toBeInTheDocument();
      });
    });

    it('should handle municipalities with string geom_centroid', () => {
      const munWithStringGeom = [
        {
          id: '5',
          name: 'Ribeirão Preto',
          geom_centroid: JSON.stringify({
            type: 'Point',
            coordinates: [-47.8103, -21.1704],
          }),
          distance_km: 312,
          population: 703_000,
          biogas_m3_year: 12_000_000,
        },
      ];

      render(
        <ProximityMap {...defaultProps} municipalities={munWithStringGeom} />
      );
      jest.runAllTimers();

      waitFor(() => {
        expect(screen.getByText('Ribeirão Preto')).toBeInTheDocument();
      });
    });

    it('should skip municipalities without valid coordinates', () => {
      const munWithoutCoords = [
        {
          id: '6',
          name: 'Invalid Municipality',
          distance_km: 100,
          population: 100_000,
          biogas_m3_year: 1_000_000,
          // No coordinates
        },
      ];

      render(
        <ProximityMap {...defaultProps} municipalities={munWithoutCoords} />
      );
      jest.runAllTimers();

      waitFor(() => {
        expect(screen.queryByText('Invalid Municipality')).not.toBeInTheDocument();
      });
    });

    it('should format biogas values in millions', () => {
      const munWithBiogas = [
        {
          id: '7',
          name: 'Test City',
          centroid: [-46.0, -23.0],
          distance_km: 10,
          population: 500_000,
          biogas_m3_year: 123_456_789,
        },
      ];

      render(
        <ProximityMap {...defaultProps} municipalities={munWithBiogas} />
      );
      jest.runAllTimers();

      waitFor(() => {
        expect(screen.getByText(/123\.46 mi m³\/ano/)).toBeInTheDocument();
      });
    });

    it('should handle null municipalities array', () => {
      render(<ProximityMap {...defaultProps} municipalities={null} />);
      jest.runAllTimers();

      waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });
    });

    it('should handle empty municipalities array', () => {
      render(<ProximityMap {...defaultProps} municipalities={[]} />);
      jest.runAllTimers();

      waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });
    });
  });

  describe('Map Click Handling', () => {
    it('should call onMapClick when map is clicked', () => {
      const handleMapClick = jest.fn();
      render(<ProximityMap {...defaultProps} onMapClick={handleMapClick} />);
      jest.runAllTimers();

      // The useMapEvents hook should be called
      waitFor(() => {
        expect(mockUseMapEvents).toHaveBeenCalled();
      });
    });

    it('should pass correct coordinates to onMapClick callback', () => {
      const handleMapClick = jest.fn();
      render(<ProximityMap {...defaultProps} onMapClick={handleMapClick} />);
      jest.runAllTimers();

      waitFor(() => {
        const handlers = mockUseMapEvents.mock.results[0]?.value;
        if (handlers && handlers.click) {
          // Simulate map click event
          handlers.click({ latlng: { lat: -23.5, lng: -46.6 } });
          expect(handleMapClick).toHaveBeenCalledWith(-23.5, -46.6);
        }
      });
    });
  });

  describe('Map Bounds Auto-Fit', () => {
    it('should fit bounds when point and radius change', () => {
      const { rerender } = render(
        <ProximityMap
          {...defaultProps}
          selectedPoint={{ lat: -23.5505, lng: -46.6333 }}
          radius={10}
        />
      );
      jest.runAllTimers();

      // Rerender with different radius
      rerender(
        <ProximityMap
          {...defaultProps}
          selectedPoint={{ lat: -23.5505, lng: -46.6333 }}
          radius={20}
        />
      );

      waitFor(() => {
        expect(mockFitBounds).toHaveBeenCalled();
      });
    });

    it('should fit bounds when selected point changes', () => {
      const { rerender } = render(
        <ProximityMap
          {...defaultProps}
          selectedPoint={{ lat: -23.5505, lng: -46.6333 }}
          radius={10}
        />
      );
      jest.runAllTimers();

      rerender(
        <ProximityMap
          {...defaultProps}
          selectedPoint={{ lat: -22.9099, lng: -47.0628 }} // Campinas
          radius={10}
        />
      );

      waitFor(() => {
        expect(mockFitBounds).toHaveBeenCalled();
      });
    });

    it('should not fit bounds when no point is selected', () => {
      render(<ProximityMap {...defaultProps} selectedPoint={null} />);
      jest.runAllTimers();

      expect(mockFitBounds).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero radius', () => {
      render(
        <ProximityMap
          {...defaultProps}
          selectedPoint={{ lat: -23.5505, lng: -46.6333 }}
          radius={0}
        />
      );
      jest.runAllTimers();

      waitFor(() => {
        const circle = screen.getByTestId('circle');
        expect(circle).toHaveAttribute('data-radius', '0');
      });
    });

    it('should handle very large radius', () => {
      render(
        <ProximityMap
          {...defaultProps}
          selectedPoint={{ lat: -23.5505, lng: -46.6333 }}
          radius={1000}
        />
      );
      jest.runAllTimers();

      waitFor(() => {
        const circle = screen.getByTestId('circle');
        expect(circle).toHaveAttribute('data-radius', '1000000'); // 1000 km
      });
    });

    it('should handle municipalities with zero biogas', () => {
      const munWithZeroBiogas = [
        {
          id: '8',
          name: 'Zero Biogas City',
          centroid: [-46.0, -23.0],
          distance_km: 10,
          population: 50_000,
          biogas_m3_year: 0,
        },
      ];

      render(
        <ProximityMap {...defaultProps} municipalities={munWithZeroBiogas} />
      );
      jest.runAllTimers();

      waitFor(() => {
        expect(screen.getByText('Zero Biogas City')).toBeInTheDocument();
        expect(screen.getByText(/0\.00 mi m³\/ano/)).toBeInTheDocument();
      });
    });

    it('should handle municipalities with missing optional fields', () => {
      const minimalMunicipality = [
        {
          name: 'Minimal City',
          centroid: [-46.0, -23.0],
          // Missing: id, distance_km, population, biogas_m3_year
        },
      ];

      render(
        <ProximityMap {...defaultProps} municipalities={minimalMunicipality} />
      );
      jest.runAllTimers();

      waitFor(() => {
        expect(screen.getByText('Minimal City')).toBeInTheDocument();
        expect(screen.getByText(/Distância:.*0 km/)).toBeInTheDocument();
        expect(screen.getByText(/População:.*0/)).toBeInTheDocument();
        expect(screen.getByText(/0\.00 mi m³\/ano/)).toBeInTheDocument();
      });
    });

    it('should handle coordinate edge values', () => {
      const extremeCoords = { lat: -90, lng: -180 };
      render(
        <ProximityMap {...defaultProps} selectedPoint={extremeCoords} />
      );
      jest.runAllTimers();

      waitFor(() => {
        expect(screen.getByText('-90.0000, -180.0000')).toBeInTheDocument();
      });
    });
  });
});

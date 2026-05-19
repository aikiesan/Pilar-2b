/**
 * Tests for MapBiomasLayer Component
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { MapContainer } from 'react-leaflet';
import MapBiomasLayer from './MapBiomasLayer';

// Mock environment variable
const originalEnv = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = originalEnv;
});

// Mock react-leaflet
const mockUseMap = jest.fn();
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="map-container">{children}</div>,
  TileLayer: ({ url, opacity, minZoom, maxZoom, eventHandlers }: any) => (
    <div
      data-testid="tile-layer"
      data-url={url}
      data-opacity={opacity}
      data-min-zoom={minZoom}
      data-max-zoom={maxZoom}
    />
  ),
  useMap: () => mockUseMap()
}));

describe('MapBiomasLayer', () => {
  let mockMap: any;

  beforeEach(() => {
    mockMap = {
      getZoom: jest.fn(() => 10),
      on: jest.fn(),
      off: jest.fn()
    };
    mockUseMap.mockReturnValue(mockMap);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render tile layer when zoom is sufficient', () => {
      mockMap.getZoom.mockReturnValue(10);

      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <MapBiomasLayer />
        </MapContainer>
      );

      expect(getByTestId('tile-layer')).toBeInTheDocument();
    });

    it('should render with default opacity', () => {
      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <MapBiomasLayer />
        </MapContainer>
      );

      expect(getByTestId('tile-layer')).toHaveAttribute('data-opacity', '0.7');
    });

    it('should render with custom opacity', () => {
      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <MapBiomasLayer opacity={0.5} />
        </MapContainer>
      );

      expect(getByTestId('tile-layer')).toHaveAttribute('data-opacity', '0.5');
    });

    it('should render with default minZoom', () => {
      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <MapBiomasLayer />
        </MapContainer>
      );

      expect(getByTestId('tile-layer')).toHaveAttribute('data-min-zoom', '7');
    });

    it('should render with custom minZoom', () => {
      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <MapBiomasLayer minZoom={8} />
        </MapContainer>
      );

      expect(getByTestId('tile-layer')).toHaveAttribute('data-min-zoom', '8');
    });

    it('should render with default maxZoom', () => {
      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <MapBiomasLayer />
        </MapContainer>
      );

      expect(getByTestId('tile-layer')).toHaveAttribute('data-max-zoom', '14');
    });

    it('should render with custom maxZoom', () => {
      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <MapBiomasLayer maxZoom={16} />
        </MapContainer>
      );

      expect(getByTestId('tile-layer')).toHaveAttribute('data-max-zoom', '16');
    });
  });

  describe('Tile URL Configuration', () => {
    it('should use API URL from environment', () => {
      process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com';

      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <MapBiomasLayer />
        </MapContainer>
      );

      const tileLayer = getByTestId('tile-layer');
      expect(tileLayer.getAttribute('data-url')).toContain('https://api.example.com/api/v1/mapbiomas/tiles');
    });

    it('should use default localhost when API URL not set', () => {
      delete process.env.NEXT_PUBLIC_API_URL;

      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <MapBiomasLayer />
        </MapContainer>
      );

      const tileLayer = getByTestId('tile-layer');
      expect(tileLayer.getAttribute('data-url')).toContain('http://localhost:8000/api/v1/mapbiomas/tiles');
    });

    it('should include correct tile URL pattern', () => {
      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <MapBiomasLayer />
        </MapContainer>
      );

      const tileLayer = getByTestId('tile-layer');
      const url = tileLayer.getAttribute('data-url');
      expect(url).toContain('/api/v1/mapbiomas/tiles/{z}/{x}/{y}.png');
    });
  });

  describe('Zoom Level Visibility', () => {
    it('should render when zoom is at minZoom', () => {
      mockMap.getZoom.mockReturnValue(7);

      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={7}>
          <MapBiomasLayer minZoom={7} />
        </MapContainer>
      );

      expect(getByTestId('tile-layer')).toBeInTheDocument();
    });

    it('should not render when zoom is below minZoom', () => {
      mockMap.getZoom.mockReturnValue(6);

      const { queryByTestId } = render(
        <MapContainer center={[0, 0]} zoom={6}>
          <MapBiomasLayer minZoom={7} />
        </MapContainer>
      );

      expect(queryByTestId('tile-layer')).not.toBeInTheDocument();
    });

    it('should render when zoom is above minZoom', () => {
      mockMap.getZoom.mockReturnValue(10);

      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <MapBiomasLayer minZoom={7} />
        </MapContainer>
      );

      expect(getByTestId('tile-layer')).toBeInTheDocument();
    });

    it('should not render when zoom is very low (e.g., 4)', () => {
      mockMap.getZoom.mockReturnValue(4);

      const { queryByTestId } = render(
        <MapContainer center={[0, 0]} zoom={4}>
          <MapBiomasLayer minZoom={7} />
        </MapContainer>
      );

      expect(queryByTestId('tile-layer')).not.toBeInTheDocument();
    });

    it('should render when zoom is at maxZoom', () => {
      mockMap.getZoom.mockReturnValue(14);

      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={14}>
          <MapBiomasLayer maxZoom={14} />
        </MapContainer>
      );

      expect(getByTestId('tile-layer')).toBeInTheDocument();
    });
  });

  describe('Map Event Listeners', () => {
    it('should register zoomend event listener', () => {
      render(
        <MapContainer center={[0, 0]} zoom={10}>
          <MapBiomasLayer />
        </MapContainer>
      );

      expect(mockMap.on).toHaveBeenCalledWith('zoomend', expect.any(Function));
    });

    it('should cleanup event listener on unmount', () => {
      const { unmount } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <MapBiomasLayer />
        </MapContainer>
      );

      unmount();

      expect(mockMap.off).toHaveBeenCalledWith('zoomend', expect.any(Function));
    });

    it('should re-register listeners when minZoom changes', () => {
      const { rerender } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <MapBiomasLayer minZoom={7} />
        </MapContainer>
      );

      jest.clearAllMocks();

      rerender(
        <MapContainer center={[0, 0]} zoom={10}>
          <MapBiomasLayer minZoom={8} />
        </MapContainer>
      );

      expect(mockMap.off).toHaveBeenCalled();
      expect(mockMap.on).toHaveBeenCalled();
    });
  });

  describe('Zoom Change Behavior', () => {
    it('should toggle visibility when zoom changes across minZoom threshold', () => {
      mockMap.getZoom.mockReturnValue(6);

      const { queryByTestId, rerender } = render(
        <MapContainer center={[0, 0]} zoom={6}>
          <MapBiomasLayer minZoom={7} />
        </MapContainer>
      );

      // Initially not visible
      expect(queryByTestId('tile-layer')).not.toBeInTheDocument();

      // Simulate zoom change
      mockMap.getZoom.mockReturnValue(8);

      rerender(
        <MapContainer center={[0, 0]} zoom={8}>
          <MapBiomasLayer minZoom={7} />
        </MapContainer>
      );

      // Now visible
      expect(queryByTestId('tile-layer')).toBeInTheDocument();
    });

    it('should hide when zooming below minZoom', () => {
      mockMap.getZoom.mockReturnValue(10);

      const { getByTestId, queryByTestId, rerender } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <MapBiomasLayer minZoom={7} />
        </MapContainer>
      );

      expect(getByTestId('tile-layer')).toBeInTheDocument();

      // Simulate zoom out
      mockMap.getZoom.mockReturnValue(5);

      rerender(
        <MapContainer center={[0, 0]} zoom={5}>
          <MapBiomasLayer minZoom={7} />
        </MapContainer>
      );

      expect(queryByTestId('tile-layer')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero opacity', () => {
      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <MapBiomasLayer opacity={0} />
        </MapContainer>
      );

      expect(getByTestId('tile-layer')).toHaveAttribute('data-opacity', '0');
    });

    it('should handle full opacity', () => {
      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <MapBiomasLayer opacity={1} />
        </MapContainer>
      );

      expect(getByTestId('tile-layer')).toHaveAttribute('data-opacity', '1');
    });

    it('should handle fractional zoom levels', () => {
      mockMap.getZoom.mockReturnValue(7.5);

      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={7.5}>
          <MapBiomasLayer minZoom={7} />
        </MapContainer>
      );

      expect(getByTestId('tile-layer')).toBeInTheDocument();
    });

    it('should handle very high zoom levels', () => {
      mockMap.getZoom.mockReturnValue(20);

      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={20}>
          <MapBiomasLayer minZoom={7} maxZoom={22} />
        </MapContainer>
      );

      expect(getByTestId('tile-layer')).toBeInTheDocument();
    });

    it('should handle minZoom equals maxZoom', () => {
      mockMap.getZoom.mockReturnValue(10);

      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <MapBiomasLayer minZoom={10} maxZoom={10} />
        </MapContainer>
      );

      expect(getByTestId('tile-layer')).toBeInTheDocument();
    });

    it('should handle negative zoom (edge case)', () => {
      mockMap.getZoom.mockReturnValue(-1);

      const { queryByTestId } = render(
        <MapContainer center={[0, 0]} zoom={-1}>
          <MapBiomasLayer minZoom={7} />
        </MapContainer>
      );

      expect(queryByTestId('tile-layer')).not.toBeInTheDocument();
    });
  });

  describe('Props Changes', () => {
    it('should update opacity when prop changes', () => {
      const { getByTestId, rerender } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <MapBiomasLayer opacity={0.7} />
        </MapContainer>
      );

      expect(getByTestId('tile-layer')).toHaveAttribute('data-opacity', '0.7');

      rerender(
        <MapContainer center={[0, 0]} zoom={10}>
          <MapBiomasLayer opacity={0.3} />
        </MapContainer>
      );

      expect(getByTestId('tile-layer')).toHaveAttribute('data-opacity', '0.3');
    });

    it('should update minZoom when prop changes', () => {
      const { getByTestId, rerender } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <MapBiomasLayer minZoom={7} />
        </MapContainer>
      );

      expect(getByTestId('tile-layer')).toHaveAttribute('data-min-zoom', '7');

      rerender(
        <MapContainer center={[0, 0]} zoom={10}>
          <MapBiomasLayer minZoom={8} />
        </MapContainer>
      );

      expect(getByTestId('tile-layer')).toHaveAttribute('data-min-zoom', '8');
    });

    it('should update maxZoom when prop changes', () => {
      const { getByTestId, rerender } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <MapBiomasLayer maxZoom={14} />
        </MapContainer>
      );

      expect(getByTestId('tile-layer')).toHaveAttribute('data-max-zoom', '14');

      rerender(
        <MapContainer center={[0, 0]} zoom={10}>
          <MapBiomasLayer maxZoom={16} />
        </MapContainer>
      );

      expect(getByTestId('tile-layer')).toHaveAttribute('data-max-zoom', '16');
    });
  });

  describe('API Configuration', () => {
    it('should handle production API URL', () => {
      process.env.NEXT_PUBLIC_API_URL = 'https://api.cp2b.org';

      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <MapBiomasLayer />
        </MapContainer>
      );

      const url = getByTestId('tile-layer').getAttribute('data-url');
      expect(url).toContain('https://api.cp2b.org');
    });

    it('should handle staging API URL', () => {
      process.env.NEXT_PUBLIC_API_URL = 'https://staging-api.cp2b.org';

      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <MapBiomasLayer />
        </MapContainer>
      );

      const url = getByTestId('tile-layer').getAttribute('data-url');
      expect(url).toContain('https://staging-api.cp2b.org');
    });

    it('should handle empty API URL', () => {
      process.env.NEXT_PUBLIC_API_URL = '';

      const { getByTestId } = render(
        <MapContainer center={[0, 0]} zoom={10}>
          <MapBiomasLayer />
        </MapContainer>
      );

      const url = getByTestId('tile-layer').getAttribute('data-url');
      expect(url).toContain('http://localhost:8000');
    });
  });
});

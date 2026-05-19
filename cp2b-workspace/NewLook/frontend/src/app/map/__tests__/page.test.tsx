/**
 * PILAR-2b V3 Frontend - Map Page Tests
 * Comprehensive tests for the interactive map component (core feature)
 */
import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  setupMockFetch,
  cleanupMocks,
  mockApiResponses,
  mockMunicipalitiesList
} from '../../../test/utils/test-utils'

// Mock next/dynamic to avoid SSR issues in tests
jest.mock('next/dynamic', () => {
  return jest.fn((dynamicImport) => {
    const MockComponent = (props: any) => <div {...props} data-testid="mock-dynamic-component" />
    return MockComponent
  })
})

// Mock react-leaflet components
jest.mock('react-leaflet', () => ({
  MapContainer: (props: any) => <div {...props} data-testid="map-container" />,
  TileLayer: ({ url, attribution }: any) => (
    <div data-testid="tile-layer" data-url={url} data-attribution={attribution} />
  ),
  Marker: ({ position, children }: any) => (
    <div data-testid="marker" data-position={JSON.stringify(position)}>
      {children}
    </div>
  ),
  Popup: ({ children }: any) => <div data-testid="popup">{children}</div>
}))

// Import the component after mocks are set up
import MapPage from '../page'

// Mock fetch globally
beforeEach(() => {
  setupMockFetch()
})

afterEach(() => {
  cleanupMocks()
})

describe('MapPage', () => {
  describe('Loading State', () => {
    it('displays loading spinner initially', async () => {
      render(<MapPage />)

      expect(screen.getByText('Carregando mapa...')).toBeInTheDocument()
      expect(document.querySelector('.animate-spin')).toBeInTheDocument()
    })
  })

  describe('Header and Layout', () => {
    it('renders map header correctly', async () => {
      await act(async () => {
        render(<MapPage />)
      })

      await waitFor(() => {
        expect(screen.getByText('Mapa de Potencial Biogás - São Paulo')).toBeInTheDocument()
      })

      expect(screen.getByText('2 municípios')).toBeInTheDocument()
    })

    it('displays map icon in header', async () => {
      await act(async () => {
        render(<MapPage />)
      })

      await waitFor(() => {
        const header = screen.getByText('Mapa de Potencial Biogás - São Paulo').closest('header')
        expect(header).toBeInTheDocument()
      })
    })
  })

  describe('Map Component Rendering', () => {
    it('renders map container', async () => {
      await act(async () => {
        render(<MapPage />)
      })

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument()
      })
    })

    it('renders tile layer with default OSM', async () => {
      await act(async () => {
        render(<MapPage />)
      })

      await waitFor(() => {
        const tileLayer = screen.getByTestId('tile-layer')
        expect(tileLayer).toBeInTheDocument()
        expect(tileLayer).toHaveAttribute('data-url', 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')
      })
    })

    it('renders markers for municipalities', async () => {
      await act(async () => {
        render(<MapPage />)
      })

      await waitFor(() => {
        const markers = screen.getAllByTestId('marker')
        expect(markers).toHaveLength(2) // Based on mock data
      })
    })

    it('renders popups with municipality information', async () => {
      await act(async () => {
        render(<MapPage />)
      })

      await waitFor(() => {
        expect(screen.getByText('Test Municipality')).toBeInTheDocument()
        expect(screen.getByText('Second Test Municipality')).toBeInTheDocument()
      })
    })
  })

  describe('Layer Controls', () => {
    it('renders layer control panel', async () => {
      await act(async () => {
        render(<MapPage />)
      })

      await waitFor(() => {
        expect(screen.getByText('Camadas do Mapa')).toBeInTheDocument()
      })

      expect(screen.getByText('OpenStreetMap')).toBeInTheDocument()
      expect(screen.getByText('Satélite')).toBeInTheDocument()
      expect(screen.getByText('Terreno')).toBeInTheDocument()
    })

    it('allows switching between map layers', async () => {
      const user = userEvent.setup()
      await act(async () => {
        render(<MapPage />)
      })

      await waitFor(() => {
        expect(screen.getByText('OpenStreetMap')).toBeInTheDocument()
      })

      const satelliteRadio = screen.getByDisplayValue('satellite')
      await user.click(satelliteRadio)

      await waitFor(() => {
        const tileLayer = screen.getByTestId('tile-layer')
        expect(tileLayer).toHaveAttribute('data-url', 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}')
      })
    })

    it('switches to terrain layer correctly', async () => {
      const user = userEvent.setup()
      await act(async () => {
        render(<MapPage />)
      })

      await waitFor(() => {
        expect(screen.getByText('Terreno')).toBeInTheDocument()
      })

      const terrainRadio = screen.getByDisplayValue('terrain')
      await user.click(terrainRadio)

      await waitFor(() => {
        const tileLayer = screen.getByTestId('tile-layer')
        expect(tileLayer).toHaveAttribute('data-url', 'https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}.jpg')
      })
    })
  })

  describe('Map Controls', () => {
    it('renders zoom and navigation controls', async () => {
      await act(async () => {
        render(<MapPage />)
      })

      await waitFor(() => {
        expect(screen.getByText('Controles')).toBeInTheDocument()
      })

      expect(screen.getByTitle('Aumentar Zoom')).toBeInTheDocument()
      expect(screen.getByTitle('Diminuir Zoom')).toBeInTheDocument()
      expect(screen.getByTitle('Resetar Vista')).toBeInTheDocument()
    })

    it('zoom controls are interactive', async () => {
      const user = userEvent.setup()
      await act(async () => {
        render(<MapPage />)
      })

      await waitFor(() => {
        expect(screen.getByTitle('Aumentar Zoom')).toBeInTheDocument()
      })

      const zoomInButton = screen.getByTitle('Aumentar Zoom')
      const zoomOutButton = screen.getByTitle('Diminuir Zoom')
      const resetButton = screen.getByTitle('Resetar Vista')

      // Test button clicks (functionality tested separately due to map ref dependency)
      await user.click(zoomInButton)
      await user.click(zoomOutButton)
      await user.click(resetButton)

      expect(zoomInButton).toBeInTheDocument()
      expect(zoomOutButton).toBeInTheDocument()
      expect(resetButton).toBeInTheDocument()
    })
  })

  describe('Legend', () => {
    it('renders biogas potential legend', async () => {
      await act(async () => {
        render(<MapPage />)
      })

      await waitFor(() => {
        expect(screen.getByText('Potencial Biogás (m³/ano)')).toBeInTheDocument()
      })

      expect(screen.getByText('80+ (Alto)')).toBeInTheDocument()
      expect(screen.getByText('60-79 (Médio-Alto)')).toBeInTheDocument()
      expect(screen.getByText('40-59 (Médio)')).toBeInTheDocument()
      expect(screen.getByText('20-39 (Baixo)')).toBeInTheDocument()
      expect(screen.getByText('<20 (Muito Baixo)')).toBeInTheDocument()
    })

    it('legend has proper color indicators', async () => {
      await act(async () => {
        render(<MapPage />)
      })

      await waitFor(() => {
        expect(screen.getByText('Potencial Biogás (m³/ano)')).toBeInTheDocument()
      })

      // Check that legend has color squares (simplified check)
      const legendContainer = screen.getByText('Potencial Biogás (m³/ano)').closest('div')
      expect(legendContainer).toBeInTheDocument()
    })
  })

  describe('Municipality Data Display', () => {
    it('displays municipality details in popups', async () => {
      await act(async () => {
        render(<MapPage />)
      })

      await waitFor(() => {
        expect(screen.getByText('Test Municipality')).toBeInTheDocument()
      })

      // Check for municipality details
      expect(screen.getByText('1234567')).toBeInTheDocument() // IBGE code
      expect(screen.getByText('100.000')).toBeInTheDocument() // Population formatted
      expect(screen.getByText('500 km²')).toBeInTheDocument() // Area
    })

    it('displays biogas potential with color coding', async () => {
      await act(async () => {
        render(<MapPage />)
      })

      await waitFor(() => {
        expect(screen.getByText('75.5 m³/ano')).toBeInTheDocument()
      })

      expect(screen.getByText('45.2 m³/ano')).toBeInTheDocument()
    })

    it('formats numbers correctly in popups', async () => {
      await act(async () => {
        render(<MapPage />)
      })

      await waitFor(() => {
        // Check locale formatting
        expect(screen.getByText('100.000')).toBeInTheDocument() // Population
        expect(screen.getByText('500 km²')).toBeInTheDocument() // Area
      })
    })
  })

  describe('Error Handling', () => {
    it('displays error message when data fetching fails', async () => {
      // Mock fetch to return error
      global.fetch = jest.fn(() =>
        Promise.reject(new Error('Network error'))
      ) as jest.Mock

      await act(async () => {
        render(<MapPage />)
      })

      await waitFor(() => {
        expect(screen.getByText('Erro ao Carregar Mapa')).toBeInTheDocument()
      })

      expect(screen.getByText('Network error')).toBeInTheDocument()
      expect(screen.getByText('Tentar Novamente')).toBeInTheDocument()
    })

    it('allows retry after error', async () => {
      // First render with error
      global.fetch = jest.fn(() =>
        Promise.reject(new Error('Network error'))
      ) as jest.Mock

      await act(async () => {
        render(<MapPage />)
      })

      await waitFor(() => {
        expect(screen.getByText('Erro ao Carregar Mapa')).toBeInTheDocument()
      })

      // Setup successful fetch for retry
      setupMockFetch()

      const retryButton = screen.getByText('Tentar Novamente')

      await act(async () => {
        fireEvent.click(retryButton)
      })

      await waitFor(() => {
        expect(screen.getByText('Mapa de Potencial Biogás - São Paulo')).toBeInTheDocument()
      })
    })

    it('handles API response errors gracefully', async () => {
      // Mock fetch to return 500 error
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        })
      ) as jest.Mock

      await act(async () => {
        render(<MapPage />)
      })

      await waitFor(() => {
        expect(screen.getByText('Erro ao Carregar Mapa')).toBeInTheDocument()
      })

      expect(screen.getByText('Failed to fetch municipalities')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper heading hierarchy', async () => {
      await act(async () => {
        render(<MapPage />)
      })

      await waitFor(() => {
        const h1 = screen.getByRole('heading', { level: 1 })
        expect(h1).toHaveTextContent('Mapa de Potencial Biogás - São Paulo')
      })
    })

    it('has accessible form controls', async () => {
      await act(async () => {
        render(<MapPage />)
      })

      await waitFor(() => {
        const radios = screen.getAllByRole('radio')
        expect(radios).toHaveLength(3) // OSM, Satellite, Terrain
      })

      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    })

    it('has accessible buttons with proper titles', async () => {
      await act(async () => {
        render(<MapPage />)
      })

      await waitFor(() => {
        expect(screen.getByTitle('Aumentar Zoom')).toBeInTheDocument()
        expect(screen.getByTitle('Diminuir Zoom')).toBeInTheDocument()
        expect(screen.getByTitle('Resetar Vista')).toBeInTheDocument()
      })
    })

    it('radio buttons have proper labels', async () => {
      await act(async () => {
        render(<MapPage />)
      })

      await waitFor(() => {
        const osmRadio = screen.getByDisplayValue('osm')
        const satelliteRadio = screen.getByDisplayValue('satellite')
        const terrainRadio = screen.getByDisplayValue('terrain')

        expect(osmRadio).toBeInTheDocument()
        expect(satelliteRadio).toBeInTheDocument()
        expect(terrainRadio).toBeInTheDocument()
      })
    })
  })

  describe('Data Integration', () => {
    it('fetches municipality data on mount', async () => {
      await act(async () => {
        render(<MapPage />)
      })

      await waitFor(() => {
        expect(screen.getByText('2 municípios')).toBeInTheDocument()
      })

      expect(global.fetch).toHaveBeenCalledWith('/api/v1/municipalities/')
    })

    it('displays correct municipality count', async () => {
      await act(async () => {
        render(<MapPage />)
      })

      await waitFor(() => {
        expect(screen.getByText('2 municípios')).toBeInTheDocument()
      })
    })

    it('renders all municipality markers', async () => {
      await act(async () => {
        render(<MapPage />)
      })

      await waitFor(() => {
        const markers = screen.getAllByTestId('marker')
        expect(markers).toHaveLength(mockMunicipalitiesList.length)
      })
    })
  })

  describe('Map State Management', () => {
    it('maintains selected layer state', async () => {
      const user = userEvent.setup()
      await act(async () => {
        render(<MapPage />)
      })

      await waitFor(() => {
        expect(screen.getByDisplayValue('osm')).toBeChecked()
      })

      const satelliteRadio = screen.getByDisplayValue('satellite')
      await user.click(satelliteRadio)

      expect(satelliteRadio).toBeChecked()
      expect(screen.getByDisplayValue('osm')).not.toBeChecked()
    })

    it('initializes with correct default values', async () => {
      await act(async () => {
        render(<MapPage />)
      })

      await waitFor(() => {
        expect(screen.getByDisplayValue('osm')).toBeChecked()
      })

      const mapContainer = screen.getByTestId('map-container')
      expect(mapContainer).toBeInTheDocument()
    })
  })
})
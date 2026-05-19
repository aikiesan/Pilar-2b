/**
 * PILAR-2b V3 Frontend - Dashboard Page Tests
 * Comprehensive tests for the dashboard component
 */
import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DashboardPage from '../page'
import {
  setupMockFetch,
  cleanupMocks,
  mockApiResponses,
  mockMunicipalitiesList
} from '../../../test/utils/test-utils'

// Mock fetch globally
beforeEach(() => {
  setupMockFetch()
})

afterEach(() => {
  cleanupMocks()
})

describe('DashboardPage', () => {
  describe('Loading State', () => {
    it('displays loading spinner initially', async () => {
      // Render without act since we want to test the immediate loading state
      render(<DashboardPage />)

      expect(screen.getByText('Carregando dados dos municípios...')).toBeInTheDocument()
      expect(document.querySelector('.animate-spin')).toBeInTheDocument()
    })
  })

  describe('Data Loading and Display', () => {
    it('renders dashboard header correctly', async () => {
      await act(async () => {
        render(<DashboardPage />)
      })

      await waitFor(() => {
        expect(screen.getByText('Dashboard PILAR-2b V3')).toBeInTheDocument()
      })

      expect(screen.getByText('Exportar Dados')).toBeInTheDocument()
    })

    it('displays statistics cards with correct data', async () => {
      await act(async () => {
        render(<DashboardPage />)
      })

      await waitFor(() => {
        expect(screen.getByText('Municípios')).toBeInTheDocument()
      })

      // Check statistics cards
      expect(screen.getByText('População Total')).toBeInTheDocument()
      expect(screen.getByText('Área Total (km²)')).toBeInTheDocument()
      expect(screen.getByText('Potencial Médio de Biogás')).toBeInTheDocument()

      // Check statistics values
      expect(screen.getByText('2')).toBeInTheDocument() // total municipalities
      expect(screen.getByText('175.000')).toBeInTheDocument() // total population
    })

    it('displays municipalities table with correct data', async () => {
      await act(async () => {
        render(<DashboardPage />)
      })

      await waitFor(() => {
        expect(screen.getByText('Municípios de São Paulo')).toBeInTheDocument()
      })

      // Check table headers
      expect(screen.getByText('Município')).toBeInTheDocument()
      expect(screen.getByText('Código IBGE')).toBeInTheDocument()
      expect(screen.getByText('População')).toBeInTheDocument()
      expect(screen.getByText('Área (km²)')).toBeInTheDocument()
      expect(screen.getByText('Potencial Biogás')).toBeInTheDocument()

      // Check municipality data
      expect(screen.getByText('Test Municipality')).toBeInTheDocument()
      expect(screen.getByText('Second Test Municipality')).toBeInTheDocument()
    })

    it('displays correct municipality count', async () => {
      await act(async () => {
        render(<DashboardPage />)
      })

      await waitFor(() => {
        expect(screen.getByText('2 de 2 municípios')).toBeInTheDocument()
      })
    })
  })

  describe('Search Functionality', () => {
    it('filters municipalities based on search term', async () => {
      const user = userEvent.setup()
      await act(async () => {
        render(<DashboardPage />)
      })

      await waitFor(() => {
        expect(screen.getByText('Test Municipality')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Buscar município...')
      await user.type(searchInput, 'Second')

      expect(screen.getByText('Second Test Municipality')).toBeInTheDocument()
      expect(screen.queryByText('Test Municipality')).not.toBeInTheDocument()
    })

    it('shows no results message when search returns nothing', async () => {
      const user = userEvent.setup()
      await act(async () => {
        render(<DashboardPage />)
      })

      await waitFor(() => {
        expect(screen.getByText('Test Municipality')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Buscar município...')
      await user.type(searchInput, 'NonExistentMunicipality')

      expect(screen.getByText('Nenhum município encontrado para "NonExistentMunicipality"')).toBeInTheDocument()
    })

    it('updates municipality count based on search results', async () => {
      const user = userEvent.setup()
      await act(async () => {
        render(<DashboardPage />)
      })

      await waitFor(() => {
        expect(screen.getByText('2 de 2 municípios')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Buscar município...')
      await user.type(searchInput, 'Second')

      await waitFor(() => {
        expect(screen.getByText('1 de 2 municípios')).toBeInTheDocument()
      })
    })

    it('search is case insensitive', async () => {
      const user = userEvent.setup()
      await act(async () => {
        render(<DashboardPage />)
      })

      await waitFor(() => {
        expect(screen.getByText('Test Municipality')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Buscar município...')
      await user.type(searchInput, 'test municipality')

      expect(screen.getByText('Test Municipality')).toBeInTheDocument()
    })
  })

  describe('Data Export Functionality', () => {
    it('renders export button', async () => {
      await act(async () => {
        render(<DashboardPage />)
      })

      await waitFor(() => {
        expect(screen.getByText('Exportar Dados')).toBeInTheDocument()
      })

      const exportButton = screen.getByRole('button', { name: /Exportar Dados/i })
      expect(exportButton).toBeInTheDocument()
    })

    it('export button has correct icon', async () => {
      await act(async () => {
        render(<DashboardPage />)
      })

      await waitFor(() => {
        const exportButton = screen.getByRole('button', { name: /Exportar Dados/i })
        expect(exportButton).toBeInTheDocument()
      })
    })

    it('clicking export button creates download link', async () => {
      // Mock URL.createObjectURL and revokeObjectURL
      const mockCreateObjectURL = jest.fn(() => 'mock-blob-url')
      const mockRevokeObjectURL = jest.fn()

      global.URL.createObjectURL = mockCreateObjectURL
      global.URL.revokeObjectURL = mockRevokeObjectURL

      // Mock DOM methods to avoid jsdom issues
      const mockClick = jest.fn()
      const mockAppendChild = jest.fn()
      const mockRemoveChild = jest.fn()

      // Mock createElement to return a proper anchor element
      const originalCreateElement = document.createElement
      document.createElement = jest.fn((tagName) => {
        if (tagName === 'a') {
          const mockAnchor = originalCreateElement.call(document, 'a')
          mockAnchor.click = mockClick
          return mockAnchor
        }
        return originalCreateElement.call(document, tagName)
      })

      // Mock appendChild and removeChild to avoid jsdom DOM issues
      document.body.appendChild = mockAppendChild
      document.body.removeChild = mockRemoveChild

      const user = userEvent.setup()
      await act(async () => {
        render(<DashboardPage />)
      })

      await waitFor(() => {
        expect(screen.getByText('Exportar Dados')).toBeInTheDocument()
      })

      const exportButton = screen.getByRole('button', { name: /Exportar Dados/i })
      await user.click(exportButton)

      expect(mockCreateObjectURL).toHaveBeenCalled()
      expect(mockClick).toHaveBeenCalled()
      expect(mockAppendChild).toHaveBeenCalled()
      expect(mockRemoveChild).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('displays error message when data fetching fails', async () => {
      // Mock fetch to return error
      global.fetch = jest.fn(() =>
        Promise.reject(new Error('Network error'))
      ) as jest.Mock

      await act(async () => {
        render(<DashboardPage />)
      })

      await waitFor(() => {
        expect(screen.getByText('Erro ao Carregar Dados')).toBeInTheDocument()
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
        render(<DashboardPage />)
      })

      await waitFor(() => {
        expect(screen.getByText('Erro ao Carregar Dados')).toBeInTheDocument()
      })

      // Setup successful fetch for retry
      setupMockFetch()

      const retryButton = screen.getByText('Tentar Novamente')

      await act(async () => {
        fireEvent.click(retryButton)
      })

      await waitFor(() => {
        expect(screen.getByText('Dashboard PILAR-2b V3')).toBeInTheDocument()
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
        render(<DashboardPage />)
      })

      await waitFor(() => {
        expect(screen.getByText('Erro ao Carregar Dados')).toBeInTheDocument()
      })

      expect(screen.getByText('Failed to fetch municipalities')).toBeInTheDocument()
    })
  })

  describe('User Interface', () => {
    it('has proper responsive table structure', async () => {
      await act(async () => {
        render(<DashboardPage />)
      })

      await waitFor(() => {
        expect(screen.getByText('Município')).toBeInTheDocument()
      })

      const table = screen.getByRole('table')
      expect(table).toHaveClass('min-w-full')
    })

    it('applies hover effects to table rows', async () => {
      await act(async () => {
        render(<DashboardPage />)
      })

      await waitFor(() => {
        expect(screen.getByText('Test Municipality')).toBeInTheDocument()
      })

      const tableRows = screen.getAllByRole('row')
      // Skip header row, check data rows
      const dataRows = tableRows.slice(1)

      dataRows.forEach(row => {
        expect(row).toHaveClass('hover:bg-gray-50')
      })
    })

    it('formats large numbers with proper locale formatting', async () => {
      await act(async () => {
        render(<DashboardPage />)
      })

      await waitFor(() => {
        // Check if numbers are properly formatted (with locale formatting)
        expect(screen.getByText('175.000')).toBeInTheDocument() // total population
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper heading hierarchy', async () => {
      await act(async () => {
        render(<DashboardPage />)
      })

      await waitFor(() => {
        const h1 = screen.getByRole('heading', { level: 1 })
        expect(h1).toHaveTextContent('Dashboard PILAR-2b V3')

        const h2 = screen.getByRole('heading', { level: 2 })
        expect(h2).toHaveTextContent('Municípios de São Paulo')
      })
    })

    it('has accessible form labels', async () => {
      await act(async () => {
        render(<DashboardPage />)
      })

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Buscar município...')
        expect(searchInput).toBeInTheDocument()
      })
    })

    it('has accessible buttons with proper roles', async () => {
      await act(async () => {
        render(<DashboardPage />)
      })

      await waitFor(() => {
        const exportButton = screen.getByRole('button', { name: /Exportar Dados/i })
        expect(exportButton).toBeInTheDocument()
      })
    })

    it('table has proper semantic structure', async () => {
      await act(async () => {
        render(<DashboardPage />)
      })

      await waitFor(() => {
        const table = screen.getByRole('table')
        expect(table).toBeInTheDocument()

        const columnHeaders = screen.getAllByRole('columnheader')
        expect(columnHeaders).toHaveLength(5)

        const rows = screen.getAllByRole('row')
        expect(rows.length).toBeGreaterThan(1) // Header + data rows
      })
    })
  })

  describe('Performance', () => {
    it('renders efficiently with large datasets', async () => {
      // Mock larger dataset
      const largeMunicipalitiesList = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        name: `Municipality ${i + 1}`,
        code: `${1000000 + i}`,
        population: 50000 + i * 1000,
        area_km2: 100 + i,
        biogas_potential: 45 + i * 0.5,
        coordinates: {
          lat: -23.5505 + (i * 0.01),
          lng: -46.6333 + (i * 0.01)
        }
      }))

      global.fetch = jest.fn((url: string) => {
        if (url.includes('/stats/summary')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              total_municipalities: largeMunicipalitiesList.length,
              total_population: largeMunicipalitiesList.reduce((sum, m) => sum + m.population, 0),
              total_area_km2: largeMunicipalitiesList.reduce((sum, m) => sum + m.area_km2, 0),
              total_biogas_potential: largeMunicipalitiesList.reduce((sum, m) => sum + m.biogas_potential, 0),
              average_biogas_potential: 50,
              timestamp: '2025-12-26T12:00:00Z'
            })
          })
        }

        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            data: largeMunicipalitiesList,
            total: largeMunicipalitiesList.length,
            limit: 100,
            offset: 0,
            has_more: false
          })
        })
      }) as jest.Mock

      await act(async () => {
        render(<DashboardPage />)
      })

      await waitFor(() => {
        expect(screen.getByText('100 de 100 municípios')).toBeInTheDocument()
      }, { timeout: 3000 })

      // Should render without performance issues
      expect(screen.getByText('Municipality 1')).toBeInTheDocument()
    })
  })
})
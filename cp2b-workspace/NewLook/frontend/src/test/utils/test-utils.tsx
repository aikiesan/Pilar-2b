/**
 * PILAR-2b V3 Frontend - Test Utilities
 * Shared utilities and custom render functions for testing
 */
import React from 'react'
import { render, RenderOptions, RenderResult } from '@testing-library/react'
import { jest } from '@jest/globals'

// Mock providers and contexts when needed
interface ProvidersWrapperProps {
  children: React.ReactNode
}

function ProvidersWrapper({ children }: ProvidersWrapperProps) {
  return (
    <div data-testid="test-wrapper">
      {children}
    </div>
  )
}

/**
 * Custom render function that includes providers
 */
const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
): RenderResult => render(ui, { wrapper: ProvidersWrapper, ...options })

/**
 * Create a mock function with TypeScript support
 */
export const createMockFunction = <T extends (...args: any[]) => any>(
  implementation?: T
): jest.MockedFunction<T> => {
  return jest.fn(implementation) as jest.MockedFunction<T>
}

/**
 * Create mock fetch response
 */
export const createMockFetchResponse = (data: any, ok: boolean = true) => {
  return Promise.resolve({
    ok,
    status: ok ? 200 : 400,
    statusText: ok ? 'OK' : 'Bad Request',
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  } as Response)
}

/**
 * Mock municipality data for testing
 */
export const mockMunicipalityData = {
  id: 1,
  name: 'Test Municipality',
  code: '1234567',
  population: 100000,
  area_km2: 500.0,
  biogas_potential: 75.5,
  coordinates: {
    lat: -23.5505,
    lng: -46.6333
  }
}

/**
 * Mock municipalities list for testing
 */
export const mockMunicipalitiesList = [
  mockMunicipalityData,
  {
    id: 2,
    name: 'Second Test Municipality',
    code: '2234567',
    population: 75000,
    area_km2: 300.0,
    biogas_potential: 45.2,
    coordinates: {
      lat: -22.9056,
      lng: -47.0608
    }
  }
]

/**
 * Mock API responses
 */
export const mockApiResponses = {
  municipalities: {
    data: mockMunicipalitiesList,
    total: 2,
    limit: 100,
    offset: 0,
    has_more: false
  },
  municipalityStats: {
    total_municipalities: 2,
    total_population: 175000,
    total_area_km2: 800.0,
    total_biogas_potential: 120.7,
    average_biogas_potential: 60.35,
    timestamp: '2025-12-26T12:00:00Z'
  }
}

/**
 * Setup mock fetch with predefined responses
 */
export const setupMockFetch = () => {
  const mockFetch = createMockFunction<typeof fetch>()

  mockFetch.mockImplementation((url: string | URL | Request) => {
    const urlString = url.toString()

    if (urlString.includes('/api/v1/municipalities/stats/summary')) {
      return createMockFetchResponse(mockApiResponses.municipalityStats)
    }

    if (urlString.includes('/api/v1/municipalities/')) {
      return createMockFetchResponse(mockApiResponses.municipalities)
    }

    if (urlString.includes('/api/v1/municipalities/1')) {
      return createMockFetchResponse(mockMunicipalityData)
    }

    // Default 404 response
    return createMockFetchResponse(
      { detail: 'Not found' },
      false
    )
  })

  global.fetch = mockFetch
  return mockFetch
}

/**
 * Clean up mocks
 */
export const cleanupMocks = () => {
  jest.clearAllMocks()
  jest.restoreAllMocks()
}

/**
 * Wait for element to appear with timeout
 */
export const waitForElement = async (
  getElement: () => HTMLElement | null,
  timeout: number = 1000
): Promise<HTMLElement> => {
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    const element = getElement()
    if (element) {
      return element
    }
    await new Promise(resolve => setTimeout(resolve, 50))
  }

  throw new Error(`Element not found within ${timeout}ms`)
}

/**
 * Simulate user typing with realistic delays
 */
export const simulateTyping = async (
  element: HTMLElement,
  text: string,
  delay: number = 50
) => {
  const { userEvent } = await import('@testing-library/user-event')
  const user = userEvent.setup({ delay })

  await user.clear(element)
  await user.type(element, text)
}

/**
 * Mock geolocation
 */
export const mockGeolocation = (
  latitude: number = -23.5505,
  longitude: number = -46.6333
) => {
  const mockGeolocation = {
    getCurrentPosition: jest.fn((success) => {
      success({
        coords: {
          latitude,
          longitude,
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      })
    }),
    watchPosition: jest.fn(),
    clearWatch: jest.fn(),
  }

  Object.defineProperty(navigator, 'geolocation', {
    value: mockGeolocation,
    writable: true,
  })

  return mockGeolocation
}

/**
 * Mock localStorage
 */
export const mockLocalStorage = () => {
  const store: Record<string, string> = {}

  const mockStorage = {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key]
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach(key => delete store[key])
    }),
    length: Object.keys(store).length,
    key: jest.fn((index: number) => Object.keys(store)[index] || null),
  }

  Object.defineProperty(window, 'localStorage', {
    value: mockStorage,
    writable: true,
  })

  return mockStorage
}

/**
 * Mock window dimensions
 */
export const mockWindowDimensions = (width: number = 1024, height: number = 768) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  })

  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  })

  // Trigger resize event
  window.dispatchEvent(new Event('resize'))
}

/**
 * Create test component with error boundary
 */
export const withErrorBoundary = (Component: React.ComponentType) => {
  return function TestComponentWithErrorBoundary(props: any) {
    const [hasError, setHasError] = React.useState(false)

    React.useEffect(() => {
      const handleError = () => setHasError(true)
      window.addEventListener('error', handleError)
      return () => window.removeEventListener('error', handleError)
    }, [])

    if (hasError) {
      return <div data-testid="error-boundary">Something went wrong</div>
    }

    return <Component {...props} />
  }
}

// Re-export testing library functions with custom render
export * from '@testing-library/react'
export { customRender as render }
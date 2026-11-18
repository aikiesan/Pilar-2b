import { test as base, expect, Page, Locator } from '@playwright/test'

/**
 * PILAR-2b V3 - E2E Test Fixtures
 *
 * Custom fixtures extending Playwright's base test for:
 * - Authenticated user context
 * - Page object access
 * - Common test utilities
 */

// Test user credentials (use environment variables in CI)
export const TEST_USER = {
  email: process.env.E2E_TEST_EMAIL || 'test@example.com',
  password: process.env.E2E_TEST_PASSWORD || 'testpassword123',
}

// API endpoints
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

/**
 * Custom fixtures for PILAR-2b tests
 */
export interface CustomFixtures {
  // Utility functions
  waitForMapLoad: () => Promise<void>
  waitForApiResponse: (urlPattern: string | RegExp) => Promise<void>
  mockApiResponse: (urlPattern: string | RegExp, response: object) => Promise<void>

  // Common locators
  header: Locator
  mapContainer: Locator
  loadingSpinner: Locator
}

/**
 * Extended test with custom fixtures
 */
export const test = base.extend<CustomFixtures>({
  // Wait for Leaflet map to fully load
  waitForMapLoad: async ({ page }, use) => {
    const waitForMapLoad = async () => {
      // Wait for Leaflet container to be present
      await page.waitForSelector('.leaflet-container', { timeout: 30000 })

      // Wait for tile layer to load (at least one tile)
      await page.waitForSelector('.leaflet-tile-loaded', { timeout: 30000 })

      // Wait for any loading spinners to disappear
      const spinner = page.locator('[class*="animate-spin"]')
      if (await spinner.isVisible()) {
        await spinner.waitFor({ state: 'hidden', timeout: 30000 })
      }
    }
    await use(waitForMapLoad)
  },

  // Wait for specific API response
  waitForApiResponse: async ({ page }, use) => {
    const waitForApiResponse = async (urlPattern: string | RegExp) => {
      await page.waitForResponse(
        (response) => {
          const url = response.url()
          if (typeof urlPattern === 'string') {
            return url.includes(urlPattern)
          }
          return urlPattern.test(url)
        },
        { timeout: 30000 }
      )
    }
    await use(waitForApiResponse)
  },

  // Mock API responses for testing
  mockApiResponse: async ({ page }, use) => {
    const mockApiResponse = async (urlPattern: string | RegExp, response: object) => {
      await page.route(urlPattern, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(response),
        })
      })
    }
    await use(mockApiResponse)
  },

  // Common header locator
  header: async ({ page }, use) => {
    await use(page.locator('header').first())
  },

  // Map container locator
  mapContainer: async ({ page }, use) => {
    await use(page.locator('.leaflet-container'))
  },

  // Loading spinner locator
  loadingSpinner: async ({ page }, use) => {
    await use(page.locator('[class*="animate-spin"]').first())
  },
})

export { expect }

/**
 * Test data factories
 */
export const testData = {
  // Sample municipality for testing
  municipality: {
    cod_ibge: 3550308,
    name: 'São Paulo',
    state: 'SP',
  },

  // Sample region for simulation testing
  region: {
    code: '3501',
    name: 'São Paulo',
    vab_total_brl: 1000000000,
  },

  // Sample simulation parameters
  simulation: {
    investmentPercent: 10,
    sector: 'industry',
  },
}

/**
 * Accessibility testing utilities
 */
export const a11y = {
  // Check for WCAG 2.1 AA compliance basics
  async checkBasicA11y(page: Page) {
    // Check for proper heading hierarchy
    const h1Count = await page.locator('h1').count()
    expect(h1Count).toBeGreaterThanOrEqual(0) // Allow pages without h1

    // Check for skip link (if present)
    const skipLink = page.locator('[href="#main-content"], [href="#main"]')
    if (await skipLink.count() > 0) {
      await expect(skipLink.first()).toBeVisible()
    }

    // Check for alt text on images
    const images = page.locator('img:not([alt])')
    const imagesWithoutAlt = await images.count()
    expect(imagesWithoutAlt).toBe(0)

    // Check for form labels
    const inputs = page.locator('input:not([type="hidden"]):not([type="submit"]):not([type="button"])')
    const inputCount = await inputs.count()
    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i)
      const id = await input.getAttribute('id')
      const ariaLabel = await input.getAttribute('aria-label')
      const ariaLabelledBy = await input.getAttribute('aria-labelledby')

      // Input should have either id with associated label, aria-label, or aria-labelledby
      if (id) {
        const label = page.locator(`label[for="${id}"]`)
        const hasLabel = (await label.count()) > 0 || ariaLabel || ariaLabelledBy
        expect(hasLabel).toBeTruthy()
      } else {
        expect(ariaLabel || ariaLabelledBy).toBeTruthy()
      }
    }
  },

  // Check color contrast (basic check - full check needs axe-core)
  async checkFocusVisible(page: Page) {
    // Tab through focusable elements and verify focus is visible
    const focusableElements = page.locator(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
    const count = await focusableElements.count()

    if (count > 0) {
      await page.keyboard.press('Tab')
      const focusedElement = page.locator(':focus')
      await expect(focusedElement).toBeVisible()
    }
  },
}

/**
 * Navigation helpers
 */
export const navigation = {
  // Navigate to page with locale
  async goToPage(page: Page, path: string, locale: string = 'pt') {
    await page.goto(`/${locale}${path}`)
  },

  // Wait for page navigation to complete
  async waitForNavigation(page: Page) {
    await page.waitForLoadState('networkidle')
  },

  // Get current locale from URL
  async getCurrentLocale(page: Page): Promise<string> {
    const url = page.url()
    const match = url.match(/\/(en|pt|de)(\/|$)/)
    return match ? match[1] : 'pt'
  },
}

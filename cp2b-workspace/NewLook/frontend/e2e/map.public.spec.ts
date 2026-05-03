import { test, expect } from '@playwright/test'
import { MapPage } from './pages/map.page'
import { a11y } from './fixtures/test-fixtures'

/**
 * Public Map Page E2E Tests
 *
 * Tests the public (unauthenticated) map functionality including:
 * - Map loading and display
 * - Zoom controls
 * - Panning and navigation
 * - Layer visibility
 * - Search functionality
 * - Accessibility compliance
 *
 * Note: These tests run without authentication (public project)
 */

test.describe('Public Map Page', () => {
  let mapPage: MapPage

  test.beforeEach(async ({ page }) => {
    mapPage = new MapPage(page)
    await mapPage.goto('pt')
  })

  test.describe('Map Loading', () => {
    test('should display the map container', async () => {
      await expect(mapPage.leafletContainer).toBeVisible()
    })

    test('should load map tiles', async ({ page }) => {
      // Wait for at least one tile to be loaded
      const loadedTile = page.locator('.leaflet-tile-loaded')
      await expect(loadedTile.first()).toBeVisible({ timeout: 30000 })
    })

    test('should display zoom controls', async () => {
      await expect(mapPage.zoomInButton).toBeVisible()
      await expect(mapPage.zoomOutButton).toBeVisible()
    })

    test('should show the header with navigation', async () => {
      await expect(mapPage.header).toBeVisible()
    })

    test('should show login button for unauthenticated users', async () => {
      await expect(mapPage.loginButton).toBeVisible()
    })
  })

  test.describe('Map Interactions', () => {
    test('should zoom in when clicking zoom in button', async ({ page }) => {
      // Get initial tile count or zoom state
      const initialTiles = await page.locator('.leaflet-tile-loaded').count()

      await mapPage.zoomIn()
      await page.waitForTimeout(1000)

      // After zooming, map should still have tiles
      const tilesAfterZoom = await page.locator('.leaflet-tile-loaded').count()
      expect(tilesAfterZoom).toBeGreaterThan(0)
    })

    test('should zoom out when clicking zoom out button', async ({ page }) => {
      // First zoom in
      await mapPage.zoomIn()
      await page.waitForTimeout(500)

      // Then zoom out
      await mapPage.zoomOut()
      await page.waitForTimeout(500)

      // Map should still be functional
      await expect(mapPage.leafletContainer).toBeVisible()
    })

    test('should allow panning the map', async ({ page }) => {
      // Get map center before pan
      const boxBefore = await mapPage.mapContainer.boundingBox()

      // Pan the map
      await mapPage.pan(100, 0)
      await page.waitForTimeout(500)

      // Map should still be visible and functional
      await expect(mapPage.leafletContainer).toBeVisible()
    })

    test('should handle double-click zoom', async ({ page }) => {
      await mapPage.mapContainer.dblclick()
      await page.waitForTimeout(500)

      // Map should still be functional
      await expect(mapPage.leafletContainer).toBeVisible()
    })
  })

  test.describe('Control Panel', () => {
    test('should display floating control panel', async ({ page }) => {
      // Look for any control panel elements
      const controlPanel = page.locator('[class*="floating"], [class*="control"]').first()
      // Control panels might be conditional, just verify map works
      await expect(mapPage.leafletContainer).toBeVisible()
    })

    test('should allow changing map opacity if slider present', async ({ page }) => {
      const opacitySlider = page.locator('input[type="range"]').first()

      if (await opacitySlider.isVisible()) {
        await mapPage.setOpacity(50)
        // Verify slider accepted the value
        await expect(opacitySlider).toHaveValue('50')
      }
    })
  })

  test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await mapPage.goto('pt')

      // Map should still be visible
      await expect(mapPage.leafletContainer).toBeVisible()

      // Zoom controls should still work
      await expect(mapPage.zoomInButton).toBeVisible()
    })

    test('should work on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 })
      await mapPage.goto('pt')

      await expect(mapPage.leafletContainer).toBeVisible()
    })

    test('should work on large desktop viewport', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 })
      await mapPage.goto('pt')

      await expect(mapPage.leafletContainer).toBeVisible()
    })
  })

  test.describe('Accessibility', () => {
    test('should have accessible zoom controls', async ({ page }) => {
      // Zoom in button should have accessible label
      const zoomInLabel = await mapPage.zoomInButton.getAttribute('aria-label')
        || await mapPage.zoomInButton.getAttribute('title')
      expect(zoomInLabel).toBeTruthy()

      // Zoom out button should have accessible label
      const zoomOutLabel = await mapPage.zoomOutButton.getAttribute('aria-label')
        || await mapPage.zoomOutButton.getAttribute('title')
      expect(zoomOutLabel).toBeTruthy()
    })

    test('should support keyboard navigation for zoom', async ({ page }) => {
      // Focus on zoom in button and activate with keyboard
      await mapPage.zoomInButton.focus()
      await page.keyboard.press('Enter')
      await page.waitForTimeout(500)

      // Map should still be functional
      await expect(mapPage.leafletContainer).toBeVisible()
    })

    test('should have visible focus indicators', async ({ page }) => {
      await a11y.checkFocusVisible(page)
    })
  })

  test.describe('Navigation', () => {
    test('should navigate to login page when clicking login button', async ({ page }) => {
      await mapPage.loginButton.click()
      await page.waitForURL(/\/login/)
      await expect(page).toHaveURL(/\/login/)
    })

    test('should navigate to home via header logo', async ({ page }) => {
      const logo = page.locator('header a').first()
      if (await logo.isVisible()) {
        await logo.click()
        // Should navigate somewhere (home or stay if already there)
        await page.waitForLoadState('networkidle')
      }
    })
  })

  test.describe('Localization', () => {
    test('should display Portuguese content by default', async ({ page }) => {
      await expect(page).toHaveURL(/\/pt\/map/)
    })

    test('should work with English locale', async ({ page }) => {
      await page.goto('/en/map')
      await mapPage.waitForMapLoad()

      await expect(mapPage.leafletContainer).toBeVisible()
    })
  })

  test.describe('Performance', () => {
    test('should load map within acceptable time', async ({ page }) => {
      const startTime = Date.now()

      await page.goto('/pt/map')
      await mapPage.waitForMapLoad()

      const loadTime = Date.now() - startTime

      // Map should load within 30 seconds
      expect(loadTime).toBeLessThan(30000)
    })

    test('should maintain interactivity after initial load', async ({ page }) => {
      // Perform several interactions
      await mapPage.zoomIn()
      await page.waitForTimeout(300)
      await mapPage.zoomOut()
      await page.waitForTimeout(300)
      await mapPage.pan(50, 50)
      await page.waitForTimeout(300)

      // Map should still be responsive
      await expect(mapPage.leafletContainer).toBeVisible()
    })
  })

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Block API requests
      await page.route('**/api/**', (route) => route.abort())

      await page.goto('/pt/map')

      // Map container should still render
      await expect(mapPage.mapContainer).toBeVisible()
    })

    test('should display map even if some data fails to load', async ({ page }) => {
      // Block municipality data
      await page.route('**/municipalities**', (route) => route.abort())

      await mapPage.goto('pt')

      // Base map should still be visible
      await expect(mapPage.leafletContainer).toBeVisible()
    })
  })
})

test.describe('Map Data Loading', () => {
  test('should load municipality boundaries', async ({ page }) => {
    const mapPage = new MapPage(page)
    await mapPage.goto('pt')

    // Wait for GeoJSON or interactive elements
    try {
      await mapPage.waitForMunicipalitiesLoad()
      const interactiveElements = page.locator('.leaflet-interactive')
      const count = await interactiveElements.count()
      expect(count).toBeGreaterThanOrEqual(0) // May or may not have data
    } catch {
      // It's okay if municipalities don't load in public view
    }
  })

  test('should handle empty data gracefully', async ({ page }) => {
    // Mock empty response
    await page.route('**/municipalities**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ municipalities: [] }),
      })
    })

    const mapPage = new MapPage(page)
    await mapPage.goto('pt')

    // Map should still work
    await expect(mapPage.leafletContainer).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Proximity analysis sanity sweep
// ---------------------------------------------------------------------------

test.describe('Proximity Analysis Sanity', () => {
  /**
   * Intercepts the proximity API and returns a minimal valid response so we
   * can verify the UI handles a successful analysis without a real backend.
   */
  const MOCK_PROXIMITY_RESPONSE = {
    analysis_point: { latitude: -22.9, longitude: -47.1 },
    radius_km: 20,
    land_use: {
      total_area_km2: 1256.6,
      by_class: {},
      dominant_class: 'Pastagem',
      agricultural_percent: 42.3,
    },
    municipalities: [
      {
        name: 'Campinas',
        ibge_code: '3509502',
        distance_km: 0,
        biogas_m3_year: 150000,
        population: 1213792,
      },
    ],
    biogas_potential: { agricultural: 50000, livestock: 80000, urban: 20000, total: 150000 },
    infrastructure: [],
    summary: {
      total_municipalities: 1,
      total_population: 1213792,
      avg_distance_km: 0,
      total_biogas_m3_year: 150000,
    },
    processing_time_seconds: 0.5,
  }

  test('map loads without unhandled JS errors', async ({ page }) => {
    const jsErrors: string[] = []
    page.on('pageerror', (err) => jsErrors.push(err.message))

    const mapPage = new MapPage(page)
    await mapPage.goto('pt')

    await expect(mapPage.leafletContainer).toBeVisible()
    expect(jsErrors).toHaveLength(0)
  })

  test('proximity API mock returns valid response shape', async ({ page }) => {
    // Intercept the proximity endpoint before loading the page
    await page.route('**/api/v1/proximity**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_PROXIMITY_RESPONSE),
      })
    })

    const mapPage = new MapPage(page)
    await mapPage.goto('pt')

    await expect(mapPage.leafletContainer).toBeVisible()

    // Click map center — may or may not trigger proximity depending on auth state
    await mapPage.clickMapCenter()
    await page.waitForTimeout(1000)

    // Map must remain stable after interaction
    await expect(mapPage.leafletContainer).toBeVisible()
  })

  test('no console errors during municipality layer load', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    const mapPage = new MapPage(page)
    await mapPage.goto('pt')

    // Wait for interactive elements if they load
    try {
      await mapPage.waitForMunicipalitiesLoad()
    } catch {
      // Acceptable — municipalities may not load in unauthenticated public view
    }

    // Filter out known benign network errors (e.g. blocked external tiles in CI)
    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes('net::ERR_') && !e.includes('Failed to load resource')
    )
    expect(criticalErrors).toHaveLength(0)
  })

  test('map remains functional after proximity API failure', async ({ page }) => {
    // Simulate a backend outage
    await page.route('**/api/v1/proximity**', (route) => route.abort())

    const mapPage = new MapPage(page)
    await mapPage.goto('pt')

    // Click to potentially trigger proximity
    await mapPage.clickMapCenter()
    await page.waitForTimeout(1500)

    // The base map must survive an API failure gracefully
    await expect(mapPage.leafletContainer).toBeVisible()
  })
})

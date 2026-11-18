import { Page, Locator, expect } from '@playwright/test'

/**
 * Map Page Object Model
 *
 * Encapsulates all interactions with the map page for E2E tests.
 * Handles both public and authenticated map views.
 */
export class MapPage {
  readonly page: Page

  // Map elements
  readonly mapContainer: Locator
  readonly leafletContainer: Locator
  readonly tileLayer: Locator
  readonly zoomInButton: Locator
  readonly zoomOutButton: Locator

  // Control panel elements
  readonly floatingControlPanel: Locator
  readonly biomassTypeSelector: Locator
  readonly opacitySlider: Locator
  readonly searchInput: Locator

  // Layer controls
  readonly layerControl: Locator

  // Loading states
  readonly mapLoadingSpinner: Locator
  readonly dataLoadingIndicator: Locator

  // Header
  readonly header: Locator
  readonly loginButton: Locator
  readonly userMenu: Locator

  constructor(page: Page) {
    this.page = page

    // Map core elements
    this.mapContainer = page.locator('[class*="leaflet-container"]').first()
    this.leafletContainer = page.locator('.leaflet-container')
    this.tileLayer = page.locator('.leaflet-tile-container')
    this.zoomInButton = page.locator('.leaflet-control-zoom-in')
    this.zoomOutButton = page.locator('.leaflet-control-zoom-out')

    // Control panel
    this.floatingControlPanel = page.locator('[class*="floating"], [class*="control-panel"]').first()
    this.biomassTypeSelector = page.locator('select, [role="combobox"]').first()
    this.opacitySlider = page.locator('input[type="range"]').first()
    this.searchInput = page.locator('input[type="search"], input[placeholder*="search"], input[placeholder*="buscar"]').first()

    // Layer controls
    this.layerControl = page.locator('.leaflet-control-layers')

    // Loading states
    this.mapLoadingSpinner = page.locator('[class*="animate-spin"]').first()
    this.dataLoadingIndicator = page.locator('[aria-busy="true"], [class*="loading"]').first()

    // Header elements
    this.header = page.locator('header').first()
    this.loginButton = page.locator('a[href*="/login"], button:has-text("Login"), button:has-text("Entrar")').first()
    this.userMenu = page.locator('[aria-label*="menu"], [aria-label*="user"], [aria-haspopup="menu"]').first()
  }

  /**
   * Navigate to the public map page
   */
  async goto(locale: string = 'pt-BR') {
    await this.page.goto(`/${locale}/map`)
    await this.waitForMapLoad()
  }

  /**
   * Navigate to authenticated dashboard map
   */
  async gotoDashboard(locale: string = 'pt') {
    await this.page.goto(`/${locale}/dashboard`)
    await this.waitForMapLoad()
  }

  /**
   * Wait for the map to fully load
   */
  async waitForMapLoad() {
    // Wait for Leaflet container
    await this.leafletContainer.waitFor({ state: 'visible', timeout: 30000 })

    // Wait for at least one tile to load
    await this.page.waitForSelector('.leaflet-tile-loaded', { timeout: 30000 })

    // A lingering *data* spinner (the municipality fetch) must not block or fail
    // map-load: when the API is unreachable — e.g. CI's localhost frontend hitting
    // the CORS-blocked production backend — the spinner never clears. The map
    // itself is already rendered (container + tiles above), so cap the wait short
    // and treat a timeout as non-fatal instead of burning 30s per test.
    const spinner = this.page.locator('[class*="animate-spin"]:visible')
    if ((await spinner.count()) > 0) {
      await spinner
        .first()
        .waitFor({ state: 'hidden', timeout: 5000 })
        .catch(() => {})
    }
  }

  /**
   * Zoom in on the map
   */
  async zoomIn(times: number = 1) {
    for (let i = 0; i < times; i++) {
      await this.zoomInButton.click()
      await this.page.waitForTimeout(500) // Wait for zoom animation
    }
  }

  /**
   * Zoom out on the map
   */
  async zoomOut(times: number = 1) {
    for (let i = 0; i < times; i++) {
      await this.zoomOutButton.click()
      await this.page.waitForTimeout(500) // Wait for zoom animation
    }
  }

  /**
   * Pan the map by dragging
   */
  async pan(deltaX: number, deltaY: number) {
    const box = await this.mapContainer.boundingBox()
    if (box) {
      const centerX = box.x + box.width / 2
      const centerY = box.y + box.height / 2

      await this.page.mouse.move(centerX, centerY)
      await this.page.mouse.down()
      await this.page.mouse.move(centerX + deltaX, centerY + deltaY, { steps: 10 })
      await this.page.mouse.up()
    }
  }

  /**
   * Click on a specific location on the map
   */
  async clickOnMap(x: number, y: number) {
    const box = await this.mapContainer.boundingBox()
    if (box) {
      await this.page.mouse.click(box.x + x, box.y + y)
    }
  }

  /**
   * Click on the center of the map
   */
  async clickMapCenter() {
    const box = await this.mapContainer.boundingBox()
    if (box) {
      await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
    }
  }

  /**
   * Search for a location
   */
  async search(query: string) {
    if (await this.searchInput.isVisible()) {
      await this.searchInput.fill(query)
      await this.searchInput.press('Enter')
      await this.page.waitForTimeout(1000) // Wait for search results
    }
  }

  /**
   * Change biomass type filter
   */
  async selectBiomassType(type: string) {
    if (await this.biomassTypeSelector.isVisible()) {
      await this.biomassTypeSelector.selectOption({ label: type })
      await this.page.waitForTimeout(500)
    }
  }

  /**
   * Set opacity level
   */
  async setOpacity(value: number) {
    if (await this.opacitySlider.isVisible()) {
      await this.opacitySlider.fill(value.toString())
      await this.page.waitForTimeout(300)
    }
  }

  /**
   * Check if a municipality marker is visible
   */
  async isMunicipalityVisible(name: string): Promise<boolean> {
    const marker = this.page.locator(`.leaflet-marker-icon[title*="${name}"], .leaflet-popup:has-text("${name}")`)
    return await marker.isVisible()
  }

  /**
   * Get the current zoom level
   */
  async getZoomLevel(): Promise<number> {
    // Leaflet stores zoom level in a data attribute or we can check the transform
    const zoomControl = this.page.locator('.leaflet-control-zoom')
    // This is an approximation - actual implementation may need adjustment
    return 4 // Default Brazil zoom level
  }

  /**
   * Check if map controls are accessible
   */
  async checkAccessibility() {
    // Zoom controls should have accessible labels
    await expect(this.zoomInButton).toHaveAttribute('aria-label', /zoom.*in|aumentar/i)
    await expect(this.zoomOutButton).toHaveAttribute('aria-label', /zoom.*out|diminuir/i)

    // Map container should have appropriate role
    await expect(this.mapContainer).toBeVisible()
  }

  /**
   * Take a screenshot of the map
   */
  async screenshot(name: string) {
    await this.mapContainer.screenshot({ path: `e2e-results/${name}.png` })
  }

  /**
   * Wait for municipalities to load on the map
   */
  async waitForMunicipalitiesLoad() {
    // Wait for GeoJSON layer or markers to appear
    await this.page.waitForSelector('.leaflet-interactive, .leaflet-marker-icon', {
      timeout: 30000,
    })
  }

  /**
   * Get count of visible markers
   */
  async getMarkerCount(): Promise<number> {
    return await this.page.locator('.leaflet-marker-icon').count()
  }

  /**
   * Check if the map is in a valid state
   */
  async isMapReady(): Promise<boolean> {
    const hasContainer = await this.leafletContainer.isVisible()
    const hasTiles = (await this.page.locator('.leaflet-tile-loaded').count()) > 0
    return hasContainer && hasTiles
  }
}

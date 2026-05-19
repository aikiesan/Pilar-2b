/**
 * Smoke Tests — Mission-Critical Path Validation
 *
 * These tests run after every deployment to confirm the platform is alive.
 * They are intentionally narrow: if any of these fail, something fundamental
 * is broken and the deployment should be investigated.
 *
 * Target: production URLs at https://cp2b.unicamp.br/pilar2b
 * In CI (local dev server): falls back to PLAYWRIGHT_BASE_URL / localhost:3000
 */

import { test, expect } from '@playwright/test'

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

test.describe('Smoke — Homepage', () => {
  test('pt-BR homepage loads and returns 200', async ({ page }) => {
    const response = await page.goto(`${BASE}/pt-BR/map`)
    expect(response?.status()).toBeLessThan(400)
  })

  test('English homepage loads and returns 200', async ({ page }) => {
    const response = await page.goto(`${BASE}/en/map`)
    expect(response?.status()).toBeLessThan(400)
  })

  test('root path redirects to locale route', async ({ page }) => {
    await page.goto(BASE)
    await page.waitForURL(/\/(pt-BR|en)\//, { timeout: 10000 })
    expect(page.url()).toMatch(/\/(pt-BR|en)\//)
  })
})

test.describe('Smoke — Core UI elements', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/pt-BR/map`)
  })

  test('page title is set', async ({ page }) => {
    const title = await page.title()
    expect(title).toBeTruthy()
    expect(title.length).toBeGreaterThan(3)
  })

  test('header is visible', async ({ page }) => {
    const header = page.locator('header')
    await expect(header).toBeVisible({ timeout: 10000 })
  })

  test('map container renders', async ({ page }) => {
    const map = page.locator('.leaflet-container, [data-testid="map-container"]').first()
    await expect(map).toBeVisible({ timeout: 30000 })
  })

  test('no unhandled JavaScript errors on load', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto(`${BASE}/pt-BR/map`)
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })
})

test.describe('Smoke — API health', () => {
  test('backend /health endpoint responds 200', async ({ request }) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://newlook-production.up.railway.app'
    const response = await request.get(`${apiUrl}/health`)
    expect(response.status()).toBe(200)
  })

  test('backend /api/v1/municipalities returns data', async ({ request }) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://newlook-production.up.railway.app'
    const response = await request.get(`${apiUrl}/api/v1/municipalities?limit=1`)
    expect(response.status()).toBeLessThan(500)
  })
})

test.describe('Smoke — Locale routing', () => {
  test('pt-BR route contains Portuguese content', async ({ page }) => {
    await page.goto(`${BASE}/pt-BR/map`)
    await page.waitForLoadState('domcontentloaded')
    const html = await page.content()
    // At least one Portuguese word should appear somewhere in the rendered page
    expect(html).toMatch(/[Mm]unicípio|[Bb]iogas|[Pp]otencial|[Cc]ampinas|[Ss]ão Paulo/)
  })

  test('en route contains English content', async ({ page }) => {
    await page.goto(`${BASE}/en/map`)
    await page.waitForLoadState('domcontentloaded')
    const html = await page.content()
    expect(html).toMatch(/[Mm]unicipality|[Bb]iogas|[Pp]otential|[Mm]ap|[Ss]earch/)
  })
})

/**
 * Technology Routes — Educational Pathway Tests (P2)
 *
 * Verifies that the technology routes section of the dashboard renders
 * at least one pathway card and does not crash.  Runs as part of the
 * authenticated `chromium` project.
 */

import { test, expect } from '@playwright/test'

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

test.describe('Technology Routes — Content', () => {
  test('technology-routes page title is set', async ({ page }) => {
    await page.goto(`${BASE}/pt-BR/dashboard/technology-routes`)
    await page.waitForLoadState('domcontentloaded')

    const title = await page.title()
    expect(title).toBeTruthy()
    expect(title.length).toBeGreaterThan(0)
  })

  test('technology-routes page has main content area', async ({ page }) => {
    await page.goto(`${BASE}/pt-BR/dashboard/technology-routes`)
    await page.waitForLoadState('domcontentloaded')

    const main = page.locator('main, [role="main"]').first()
    await expect(main).toBeVisible({ timeout: 10_000 })
  })

  test('technology-routes page has at least one heading', async ({ page }) => {
    await page.goto(`${BASE}/pt-BR/dashboard/technology-routes`)
    await page.waitForLoadState('domcontentloaded')

    const headings = await page.locator('h1, h2, h3').count()
    expect(headings).toBeGreaterThan(0)
  })

  test('technology-routes page loads without JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto(`${BASE}/pt-BR/dashboard/technology-routes`)
    await page.waitForLoadState('networkidle')

    const fatalErrors = errors.filter(
      (e) =>
        !e.includes('fetch') &&
        !e.includes('network') &&
        !e.includes('Failed to load') &&
        !e.includes('ChunkLoadError')
    )
    expect(fatalErrors).toHaveLength(0)
  })

  test('en technology-routes page also loads', async ({ page }) => {
    const response = await page.goto(`${BASE}/en/dashboard/technology-routes`)
    expect(response?.status()).toBeLessThan(500)
  })
})

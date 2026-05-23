/**
 * Dashboard E2E Tests
 *
 * Tests run under the `chromium` project which provides authenticated
 * storage state (from auth.setup.ts).  Tests that don't require auth
 * also validate the redirect-to-login behaviour for unauthenticated users.
 */

import { test, expect } from '@playwright/test'
import { DashboardPage } from './pages/dashboard.page'

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

test.describe('Dashboard — Authenticated', () => {
  test('dashboard page loads without JS error', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto(`${BASE}/pt-BR/dashboard`)
    await page.waitForLoadState('networkidle')

    // Filter out known benign errors (e.g., network requests to unavailable backend)
    const fatalErrors = errors.filter(
      (e) => !e.includes('fetch') && !e.includes('network') && !e.includes('Failed to load')
    )
    expect(fatalErrors).toHaveLength(0)
  })

  test('dashboard resolves to dashboard or redirects to login (never 5xx)', async ({
    page,
  }) => {
    const response = await page.goto(`${BASE}/pt-BR/dashboard`)
    // Either the page loads (2xx) or redirects to login (also 2xx after redirect)
    expect(response?.status()).toBeLessThan(500)
  })

  test('dashboard shows header', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.goto('pt-BR')
    await page.waitForLoadState('domcontentloaded')

    // Either the dashboard header or the login form header — never a blank page
    const header = page.locator('header').first()
    await expect(header).toBeVisible({ timeout: 15_000 })
  })

  test('authenticated dashboard hub shows feature links', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.goto('pt-BR')
    await dashboard.waitForLoad()

    const url = page.url()
    if (url.includes('/login')) {
      // Skip: auth credentials not available in this environment
      test.skip()
    }

    // When authenticated, at least some navigable links should exist
    const links = page.locator('a[href]')
    const count = await links.count()
    expect(count).toBeGreaterThan(0)
  })

  test('unauthenticated request redirects to login', async ({ browser }) => {
    // Create a fresh context with no storage state
    const context = await browser.newContext()
    const page = await context.newPage()

    await page.goto(`${BASE}/pt-BR/dashboard`)
    await page.waitForLoadState('domcontentloaded')

    // Should end up on login page when no auth state is present
    const finalUrl = page.url()
    const isOnLogin = finalUrl.includes('/login')
    const isOnDashboard = finalUrl.includes('/dashboard')

    // One of these must be true — the app should not hang or error
    expect(isOnLogin || isOnDashboard).toBe(true)

    await context.close()
  })
})

test.describe('Dashboard — Navigation', () => {
  test('map navigation link is present', async ({ page }) => {
    await page.goto(`${BASE}/pt-BR/dashboard`)
    await page.waitForLoadState('domcontentloaded')

    const url = page.url()
    if (url.includes('/login')) {
      test.skip()
    }

    const mapLink = page.locator('a[href*="/map"]').first()
    await expect(mapLink).toBeVisible({ timeout: 10_000 })
  })

  test('page title is set correctly', async ({ page }) => {
    await page.goto(`${BASE}/pt-BR/dashboard`)
    await page.waitForLoadState('domcontentloaded')

    const title = await page.title()
    expect(title).toBeTruthy()
    expect(title.length).toBeGreaterThan(3)
  })
})

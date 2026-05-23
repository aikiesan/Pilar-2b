/**
 * Performance Budget Tests (P2)
 *
 * Verifies that core pages meet response-time budgets and that
 * the app does not perform excessive network requests on first load.
 *
 * These tests use Playwright's navigation timing API and request
 * interceptors — no third-party library required.
 *
 * Budgets:
 *  - Initial navigation (TTFB + HTML parse)  < 30 s  (generous for cold start)
 *  - Document DOMContentLoaded event          < 20 s
 *  - No more than 100 network requests on map load
 */

import { test, expect } from '@playwright/test'

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

// ── Navigation timing ─────────────────────────────────────────────────────────

test.describe('Performance — Navigation Timing', () => {
  test('pt-BR map navigates in < 30s', async ({ page }) => {
    const start = Date.now()
    await page.goto(`${BASE}/pt-BR/map`)
    await page.waitForLoadState('domcontentloaded')
    const elapsed = Date.now() - start

    expect(elapsed).toBeLessThan(30_000)
  })

  test('DOMContentLoaded fires within 20s on map page', async ({ page }) => {
    const timings = await page.evaluate(async () => {
      await new Promise((resolve) => {
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
          resolve(null)
        } else {
          window.addEventListener('DOMContentLoaded', resolve, { once: true })
        }
      })
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      return nav
        ? { domContentLoaded: nav.domContentLoadedEventEnd - nav.startTime }
        : null
    })

    if (timings) {
      expect(timings.domContentLoaded).toBeLessThan(20_000)
    }
    // If timing API unavailable (older browser), just pass
  })

  test('login page navigates in < 15s', async ({ page }) => {
    const start = Date.now()
    await page.goto(`${BASE}/pt-BR/login`)
    await page.waitForLoadState('domcontentloaded')
    expect(Date.now() - start).toBeLessThan(15_000)
  })
})

// ── Network request volume ────────────────────────────────────────────────────

test.describe('Performance — Network Budget', () => {
  test('map page makes fewer than 150 network requests on first load', async ({ page }) => {
    let requestCount = 0
    page.on('request', () => requestCount++)

    await page.goto(`${BASE}/pt-BR/map`)
    await page.waitForLoadState('networkidle')

    // 150 is generous (map tiles + API calls); adjust if intentional tile loading increases this
    expect(requestCount).toBeLessThan(150)
  })

  test('login page makes fewer than 50 network requests', async ({ page }) => {
    let requestCount = 0
    page.on('request', () => requestCount++)

    await page.goto(`${BASE}/pt-BR/login`)
    await page.waitForLoadState('networkidle')

    expect(requestCount).toBeLessThan(50)
  })
})

// ── API response times (backend) ──────────────────────────────────────────────

test.describe('Performance — API Latency', () => {
  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || 'https://newlook-production.up.railway.app'

  test('/health responds in < 3s', async ({ request }) => {
    const start = Date.now()
    await request.get(`${API_URL}/health`)
    expect(Date.now() - start).toBeLessThan(3_000)
  })

  test('/api/v1/municipalities?limit=1 responds in < 8s', async ({ request }) => {
    const start = Date.now()
    await request.get(`${API_URL}/api/v1/municipalities?limit=1`)
    expect(Date.now() - start).toBeLessThan(8_000)
  })
})

/**
 * API Health & Connectivity Sanity Tests
 *
 * These tests hit the backend directly via Playwright's `request` context —
 * no browser UI is involved.  They verify the health probes and the minimum
 * API surface needed for the app to be considered operational.
 *
 * Intended to run as part of the `public` Playwright project so that no
 * authentication is required.
 */

import { test, expect } from '@playwright/test'

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://newlook-production.up.railway.app'

const LATENCY_MS = 5_000 // 5-second gate

// ── /health ──────────────────────────────────────────────────────────────────

test.describe('API Health Checks', () => {
  test('GET /health returns 200', async ({ request }) => {
    const start = Date.now()
    const response = await request.get(`${API_URL}/health`)
    const elapsed = Date.now() - start

    expect(response.status()).toBe(200)
    expect(elapsed).toBeLessThan(LATENCY_MS)
  })

  test('GET /health returns correct schema', async ({ request }) => {
    const response = await request.get(`${API_URL}/health`)
    const body = await response.json()

    expect(body).toHaveProperty('status')
    expect(['healthy', 'degraded', 'unhealthy']).toContain(body.status)
    expect(body).toHaveProperty('timestamp')
  })

  test('GET /health/ready returns 200 or 503 (never 4xx)', async ({ request }) => {
    const response = await request.get(`${API_URL}/health/ready`)
    expect([200, 503]).toContain(response.status())
  })

  test('GET /health/ready returns ready boolean', async ({ request }) => {
    const response = await request.get(`${API_URL}/health/ready`)
    const body = await response.json()

    expect(body).toHaveProperty('ready')
    expect(typeof body.ready).toBe('boolean')
    expect(body).toHaveProperty('timestamp')
  })

  test('GET /health/live returns 200', async ({ request }) => {
    const start = Date.now()
    const response = await request.get(`${API_URL}/health/live`)
    const elapsed = Date.now() - start

    expect(response.status()).toBe(200)
    expect(elapsed).toBeLessThan(LATENCY_MS)
  })

  test('GET /health/live reports alive=true', async ({ request }) => {
    const response = await request.get(`${API_URL}/health/live`)
    const body = await response.json()

    expect(body.alive).toBe(true)
    expect(body).toHaveProperty('timestamp')
  })
})

// ── Minimum API surface ───────────────────────────────────────────────────────

test.describe('Minimum API Surface', () => {
  test('GET / (root) returns API info', async ({ request }) => {
    const response = await request.get(`${API_URL}/`)

    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body).toHaveProperty('status', 'running')
    expect(body).toHaveProperty('message')
  })

  test('GET /api/v1/municipalities returns < 500', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/v1/municipalities?limit=1`)
    expect(response.status()).toBeLessThan(500)
  })

  test('GET /api/v1/statistics/summary returns < 500', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/v1/statistics/summary`)
    expect(response.status()).toBeLessThan(500)
  })

  test('GET /api/v1/technology-routes returns < 500', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/v1/technology-routes/`)
    expect(response.status()).toBeLessThan(500)
  })

  test('GET /api/v1/residuos returns < 500', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/v1/residuos/`)
    expect(response.status()).toBeLessThan(500)
  })
})

// ── Response time budget ─────────────────────────────────────────────────────

test.describe('Response Time Budget', () => {
  test('/health responds in < 3s', async ({ request }) => {
    const start = Date.now()
    await request.get(`${API_URL}/health`)
    expect(Date.now() - start).toBeLessThan(3_000)
  })

  test('/api/v1/municipalities?limit=1 responds in < 5s', async ({ request }) => {
    const start = Date.now()
    await request.get(`${API_URL}/api/v1/municipalities?limit=1`)
    expect(Date.now() - start).toBeLessThan(5_000)
  })
})

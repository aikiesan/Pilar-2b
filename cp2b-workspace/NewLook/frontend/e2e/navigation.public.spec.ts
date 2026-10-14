/**
 * Phase 0 of the navigation redesign: retired paths answer 301 to their new
 * home, the developer-only GeoServer demo is not public, and the header and
 * About page work on a phone as well as on a desktop.
 */
import { test, expect, type Page } from '@playwright/test'
import { CONSENT_VERSION } from '../src/lib/consent'

/**
 * A first visit opens the cookie banner over the lower half of a phone screen,
 * after hydration. Answer it before the page loads, as a returning visitor has.
 */
async function answerCookieBanner(page: Page) {
  await page.addInitScript((version) => {
    window.localStorage.setItem(
      'pilar2b-cookie-consent',
      JSON.stringify({ consent: 'essential', version, timestamp: new Date().toISOString() })
    )
  }, CONSENT_VERSION)
}

test.describe('Retired paths', () => {
  for (const [from, to] of [
    ['/pt-BR/sobre', '/pt-BR/about'],
    ['/en/sobre', '/en/about'],
    ['/pt-BR/dashboard/about', '/pt-BR/about#parceiros'],
    ['/en/dashboard/about', '/en/about#parceiros'],
    ['/pt-BR/dashboard/advanced-analysis', '/pt-BR/analysis'],
    ['/en/dashboard/compare', '/en/compare'],
    ['/pt-BR/dashboard/proximity?lat=-22.9&lng=-47.06&radius=20', '/pt-BR/proximity?lat=-22.9&lng=-47.06&radius=20'],
    ['/en/dashboard/technology-routes', '/en/calculator'],
    ['/pt-BR/dashboard/scientific-database?view=references', '/pt-BR/method/science-base?view=references'],
  ] as const) {
    test(`${from} is a 301 to ${to}`, async ({ request }) => {
      const response = await request.get(from, { maxRedirects: 0 })
      expect(response.status()).toBe(301)
      // Next may send the Location absolute or relative; only the path matters.
      expect(response.headers()['location'].replace(/^https?:\/\/[^/]+/, '')).toBe(to)
    })
  }
})

test('/geoserver-demo is not public without its flag', async ({ request }) => {
  test.skip(process.env.NEXT_PUBLIC_ENABLE_GEOSERVER_DEMO === 'true', 'demo enabled for this run')
  const response = await request.get('/pt-BR/geoserver-demo')
  expect(response.status()).toBe(404)
})

test.describe('Header on a desktop', () => {
  test('groups the pages in dropdowns that every visitor can open', async ({ page }) => {
    await answerCookieBanner(page)
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/pt-BR/about')
    const nav = page.getByRole('navigation', { name: 'Main navigation' })

    const about = nav.getByRole('button', { name: 'Sobre' })
    await about.click()
    await expect(about).toHaveAttribute('aria-expanded', 'true')
    await expect(nav.getByRole('link', { name: /O projeto/ })).toHaveAttribute('aria-current', 'page')
    await page.keyboard.press('Escape')
    await expect(about).toHaveAttribute('aria-expanded', 'false')

    await nav.getByRole('button', { name: 'Plataforma' }).click()
    await nav.getByRole('link', { name: /Comparar/ }).click()
    await expect(page).toHaveURL(/\/pt-BR\/compare$/)
  })

  test('the bar fits at 1280 px', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/pt-BR/guide')
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)
    await expect(page.getByRole('link', { name: 'Abrir mapa' })).toBeVisible()
  })
})

test.describe('On a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('the header keeps search and opens a menu with the same groups', async ({ page }) => {
    await page.goto('/pt-BR/about')
    await expect(page.getByRole('button', { name: /buscar/i }).first()).toBeVisible()

    const toggle = page.getByRole('button', { name: 'Abrir menu' })
    await toggle.click()
    await expect(page.getByRole('button', { name: 'Fechar menu' })).toHaveAttribute('aria-expanded', 'true')
    const menu = page.locator('#mobile-menu')
    await expect(menu.getByRole('link', { name: /O projeto/ })).toBeVisible()
    await expect(menu.getByRole('link', { name: /Comparar/ })).toBeVisible()
  })

  test('About fits the screen and its section links jump to anchors', async ({ page }) => {
    await answerCookieBanner(page)
    await page.goto('/pt-BR/about')
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)

    await page.getByRole('navigation', { name: 'Nesta página' }).getByRole('link', { name: 'FAQ' }).click()
    await expect(page).toHaveURL(/#faq$/)
    await expect(page.getByRole('heading', { name: 'FAQ', level: 2 })).toBeInViewport()
  })

  test('Comparar opens a picker instead of bouncing to the Hub', async ({ page }) => {
    await page.goto('/pt-BR/compare')
    await expect(page.getByRole('heading', { name: 'Comparar municípios', level: 1 })).toBeVisible()
    await expect(page.getByLabel('Buscar município', { exact: true })).toBeVisible()
    await expect(page).toHaveURL(/\/pt-BR\/compare$/)
  })
})

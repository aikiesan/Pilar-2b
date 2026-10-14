/**
 * The navigation: retired paths answer 301 to their new home, the developer-
 * only GeoServer demo is not public, the mega-menus work from the keyboard,
 * and on a phone the bottom bar and its menu work as well as on a desktop.
 */
import { test, expect, type Page } from '@playwright/test'
import { CONSENT_VERSION } from '../src/lib/consent'
import { METHOD_PAGES_ENABLED } from '../src/lib/featureFlags'
import { METHOD_PAGES } from './routes'

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

test.describe('Municipality addresses', () => {
  const path = (response: { headers(): Record<string, string> }) =>
    response.headers()['location'].replace(/^https?:\/\/[^/]+/, '')

  test('/pt-BR/municipality is a 301 to the list', async ({ request }) => {
    const response = await request.get('/pt-BR/municipality', { maxRedirects: 0 })
    expect(response.status()).toBe(301)
    expect(path(response)).toBe('/pt-BR/municipalities')
  })

  // To the slug when the API answers with the list, to the code (which the page
  // also renders) when it does not. Either way a 301, never a 404.
  test('an old /municipality/{ibge} link is a 301 to the new address', async ({ request }) => {
    const response = await request.get('/pt-BR/municipality/3509502', { maxRedirects: 0 })
    expect(response.status()).toBe(301)
    expect(path(response)).toMatch(/^\/pt-BR\/municipalities\/(campinas-sp|3509502)$/)
  })

  test('a municipality outside the public scope is not found', async ({ request }) => {
    expect((await request.get('/pt-BR/municipalities/2927408')).status()).toBe(404)
  })
})

test('/geoserver-demo is not public without its flag', async ({ request }) => {
  test.skip(process.env.NEXT_PUBLIC_ENABLE_GEOSERVER_DEMO === 'true', 'demo enabled for this run')
  const response = await request.get('/pt-BR/geoserver-demo')
  expect(response.status()).toBe(404)
})

test.describe('Método pages held back (METHOD_PAGES_ENABLED off)', () => {
  test.skip(METHOD_PAGES_ENABLED, 'the Método pages are public in this build')
  for (const page of METHOD_PAGES) {
    test(`${page} is not public yet`, async ({ request }) => {
      expect((await request.get(`/pt-BR${page}`)).status()).toBe(404)
    })
  }
  test('the science base stays public', async ({ request }) => {
    expect((await request.get('/pt-BR/method/science-base')).status()).toBe(200)
  })
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

  test('a mega-menu opens from the keyboard, one group at a time', async ({ page }) => {
    await answerCookieBanner(page)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/pt-BR/guide')
    const nav = page.getByRole('navigation', { name: 'Main navigation' })
    const data = nav.getByRole('button', { name: 'Dados' })
    const method = nav.getByRole('button', { name: 'Método' })

    await data.focus()
    await page.keyboard.press('ArrowDown')
    await expect(data).toHaveAttribute('aria-expanded', 'true')
    await expect(nav.getByRole('link', { name: /Catálogo de produtos/ })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(data).toHaveAttribute('aria-expanded', 'false')
    await expect(data).toBeFocused()

    await data.click()
    await method.click()
    await expect(data).toHaveAttribute('aria-expanded', 'false')
    await expect(method).toHaveAttribute('aria-expanded', 'true')
    await expect(nav.getByRole('link', { name: /Caracterização química/ })).toBeVisible()
    if (!METHOD_PAGES_ENABLED) {
      await expect(nav.locator('a[href$="/method"], a[href*="/method/fde"], a[href*="/method/scenarios"], a[href*="/method/validation"]')).toHaveCount(0)
    }

    await data.click()
    await nav.getByRole('link', { name: /Catálogo de produtos/ }).click()
    await expect(page).toHaveURL(/\/pt-BR\/data$/)
    await expect(data).toHaveAttribute('aria-expanded', 'false')
  })

  test('the bar fits at 1280 px', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/pt-BR/guide')
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)
    await expect(page.getByRole('link', { name: 'Abrir mapa' })).toBeVisible()
    for (const group of ['Plataforma', 'Dados', 'Método', 'Sobre']) {
      await expect(page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: group })).toBeVisible()
    }
  })
})

test.describe('On a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('the header keeps search; the bottom bar\'s "Mais" opens the menu with the same groups', async ({ page }) => {
    await answerCookieBanner(page)
    await page.goto('/pt-BR/about')
    await expect(page.getByRole('button', { name: /buscar/i }).first()).toBeVisible()
    // One way into the menu on a phone: the bar's "Mais", not a second header button.
    await expect(page.getByRole('button', { name: 'Abrir menu' })).toBeHidden()

    const bar = page.getByRole('navigation', { name: 'Atalhos' })
    await expect(bar.getByRole('link')).toHaveCount(3)
    const more = bar.getByRole('button', { name: /Mais/ })
    await expect(more).toBeVisible()
    await more.click()
    await expect(more).toHaveAttribute('aria-expanded', 'true')
    const menu = page.locator('#mobile-menu')
    await expect(menu.getByRole('heading', { name: 'Método' })).toBeVisible()
    await expect(menu.getByRole('link', { name: /O projeto/ })).toBeVisible()
    await expect(menu.getByRole('link', { name: /Comparar/ })).toBeVisible()
  })

  test('the bottom bar marks its section and never covers the footer', async ({ page }) => {
    await answerCookieBanner(page)
    await page.goto('/pt-BR/data/legend')
    const bar = page.getByRole('navigation', { name: 'Atalhos' })
    await expect(bar.getByRole('link', { name: 'Dados' })).toHaveAttribute('aria-current', 'page')

    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    const footer = await page.locator('footer').boundingBox()
    const barBox = await bar.boundingBox()
    expect(footer && barBox && footer.y + footer.height).toBeLessThanOrEqual(barBox!.y + 1)
  })

  test('the map keeps its own controls: no bottom bar, the header menu instead', async ({ page }) => {
    await answerCookieBanner(page)
    await page.goto('/pt-BR/map')
    await expect(page.getByRole('navigation', { name: 'Atalhos' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Abrir menu' }).click()
    await expect(page.locator('#mobile-menu').getByRole('heading', { name: 'Plataforma' })).toBeVisible()
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

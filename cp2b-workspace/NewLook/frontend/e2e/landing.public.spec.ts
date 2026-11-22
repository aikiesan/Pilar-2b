/**
 * The landing at "/": a search box that is a real combobox, the four counts,
 * and the way to the map. Its counts never show a figure the data did not give:
 * with no API they read as unavailable.
 */
import { test, expect } from '@playwright/test'
import { CONSENT_VERSION } from '../src/lib/consent'
import { MAP_ANALYSES_ENABLED } from '../src/lib/featureFlags'

test.beforeEach(async ({ page }) => {
  await page.addInitScript((version) => {
    window.localStorage.setItem(
      'pilar2b-cookie-consent',
      JSON.stringify({ consent: 'essential', version, timestamp: new Date().toISOString() })
    )
  }, CONSENT_VERSION)
})

for (const width of [1280, 390]) {
  test.describe(`Landing at ${width} px`, () => {
    test.use({ viewport: { width, height: 900 } })

    test('leads with a title, a municipality search and the map', async ({ page }) => {
      await page.goto('/pt-BR')
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      const search = page.getByRole('combobox', { name: 'Buscar município' })
      await expect(search).toBeVisible()
      await expect(search).toHaveAttribute('aria-expanded', 'false')

      const main = page.locator('#main-content')
      await main.getByRole('link', { name: 'Abrir mapa' }).click()
      await expect(page).toHaveURL(/\/pt-BR\/map$/)
    })

    test('shows four counts, each with a label', async ({ page }) => {
      await page.goto('/en')
      const counts = page.getByRole('region', { name: 'The platform in numbers' })
      await expect(counts.locator('dt')).toHaveCount(4)
      await expect(counts.locator('dd')).toHaveCount(4)
      for (const dd of await counts.locator('dd').all()) {
        await expect(dd).not.toBeEmpty()
      }
    })
  })
}

// The four map questions open the analyses, which are held back until sign-in
// with approval exists (MAP_ANALYSES_ENABLED).
test('the home leaves the map questions out while analyses are held back', async ({ page }) => {
  test.skip(MAP_ANALYSES_ENABLED, 'analyses are public in this build')
  await page.goto('/pt-BR')
  await expect(page.locator('#home-questions')).toHaveCount(0)
  await expect(page.locator('a[href*="map?a="]')).toHaveCount(0)
})

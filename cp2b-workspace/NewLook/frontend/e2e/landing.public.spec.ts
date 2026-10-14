/**
 * The landing at "/": a search box that is a real combobox, the four counts,
 * and the way to the map. Its counts never show a figure the data did not give:
 * with no API they read as unavailable.
 */
import { test, expect } from '@playwright/test'
import { CONSENT_VERSION } from '../src/lib/consent'

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

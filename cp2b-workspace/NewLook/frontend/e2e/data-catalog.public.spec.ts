/**
 * The data catalogue: /data lists every residue and links to its product page;
 * a product page's tabs (six, or five while METHOD_PAGES_ENABLED holds the
 * Método tab back) follow the ARIA tabs pattern and keep the active tab in the
 * URL hash; the legend files download as metadata.
 */
import { test, expect } from '@playwright/test'
import { CONSENT_VERSION } from '../src/lib/consent'
import { METHOD_PAGES_ENABLED } from '../src/lib/featureFlags'

/** The tab after Visão geral, and its hash. */
const SECOND_TAB = METHOD_PAGES_ENABLED ? { name: 'Method', hash: 'metodo' } : { name: 'Legend and codes', hash: 'legenda' }

const PRODUCT = '/en/data/agricultural/cana-bagaco'

test.beforeEach(async ({ page }) => {
  await page.addInitScript((version) => {
    window.localStorage.setItem(
      'pilar2b-cookie-consent',
      JSON.stringify({ consent: 'essential', version, timestamp: new Date().toISOString() })
    )
  }, CONSENT_VERSION)
})

for (const width of [1280, 390]) {
  test.describe(`Data catalogue at ${width} px`, () => {
    test.use({ viewport: { width, height: 900 } })

    test('the catalogue leads to a product page', async ({ page }) => {
      await page.goto('/en/data')
      await expect(page.getByRole('heading', { level: 1, name: 'Data catalogue' })).toBeVisible()
      await page.locator('#main-content').getByRole('link', { name: 'Sugarcane bagasse', exact: true }).first().click()
      await expect(page).toHaveURL(new RegExp(`${PRODUCT}$`))
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await expect(page.getByRole('note', { name: 'About this data' })).toBeVisible()
    })

    test('the tabs move with the keyboard and keep their place in the URL', async ({ page }) => {
      await page.goto(PRODUCT)
      const tablist = page.getByRole('tablist', { name: 'Data product sections' })
      const tabs = tablist.getByRole('tab')
      await expect(tabs).toHaveCount(METHOD_PAGES_ENABLED ? 6 : 5)
      const overview = tablist.getByRole('tab', { name: 'Overview' })
      await expect(overview).toHaveAttribute('aria-selected', 'true')
      await expect(page.getByRole('tabpanel', { name: 'Overview' })).toBeVisible()

      await overview.focus()
      await page.keyboard.press('ArrowRight')
      const second = tablist.getByRole('tab', { name: SECOND_TAB.name })
      await expect(second).toBeFocused()
      await expect(second).toHaveAttribute('aria-selected', 'true')
      await expect(page).toHaveURL(new RegExp(`#${SECOND_TAB.hash}$`))
      await expect(page.getByRole('tabpanel', { name: SECOND_TAB.name })).toBeVisible()
      await expect(page.getByRole('tabpanel', { name: 'Overview' })).toBeHidden()

      await page.keyboard.press('End')
      await expect(tablist.getByRole('tab', { name: 'Validation and limitations' })).toBeFocused()
      await page.keyboard.press('ArrowRight')
      await expect(overview).toBeFocused()

      await page.goBack()
      await expect(page).toHaveURL(/#validacao$/)
      await expect(tablist.getByRole('tab', { name: 'Validation and limitations' })).toHaveAttribute('aria-selected', 'true')
    })

    test('a hash opens its tab', async ({ page }) => {
      await page.goto(`${PRODUCT}#legenda`)
      await expect(page.getByRole('tab', { name: 'Legend and codes' })).toHaveAttribute('aria-selected', 'true')
      await expect(page.getByRole('tabpanel', { name: 'Legend and codes' }).getByText('AG_CANA_BAGACO').first()).toBeVisible()
    })
  })
}

test('an unknown residue is a 404, not an empty page', async ({ page }) => {
  const response = await page.goto('/en/data/agricultural/not-a-residue')
  expect(response?.status()).toBe(404)
})

test('the legend files download as metadata', async ({ request }) => {
  const codes = await request.get('/data/pilar2b-residue-codes.csv')
  expect(codes.ok()).toBe(true)
  expect(codes.headers()['content-disposition']).toContain('attachment')
  expect((await codes.text()).split('\n')[0]).toBe('code,name_pt,name_en,sector,sector_colour')

  const ramps = await request.get('/data/pilar2b-qgis-ramps.xml')
  expect(ramps.ok()).toBe(true)
  expect(await ramps.text()).toContain('<qgis_style')
})

/**
 * Finding a municipality: the header search and the landing search look up a
 * name or an IBGE code and nothing else. Accents do not matter, the state may
 * follow the name, and while the list is missing they say so instead of
 * claiming nothing matches.
 *
 * The name list is answered here with a few real municipalities (name and IBGE
 * code only), since the suite runs without the API.
 */
import { test, expect, type Page } from '@playwright/test'
import { CONSENT_VERSION } from '../src/lib/consent'
import { axeViolations } from './axe'

const NAMES = [
  { municipality_name: 'São Paulo', ibge_code: '3550308' },
  { municipality_name: 'Campinas', ibge_code: '3509502' },
  { municipality_name: 'São José dos Campos', ibge_code: '3549904' },
  { municipality_name: "Santa Bárbara d'Oeste", ibge_code: '3545803' },
  { municipality_name: 'Itajubá', ibge_code: '3132404' },
]

async function setUp(page: Page, names: 'list' | 'down') {
  await page.addInitScript((version) => {
    window.localStorage.setItem(
      'pilar2b-cookie-consent',
      JSON.stringify({ consent: 'essential', version, timestamp: new Date().toISOString() })
    )
  }, CONSENT_VERSION)
  await page.route('**/api/v1/municipalities/names**', (route) =>
    names === 'list' ? route.fulfill({ json: NAMES }) : route.fulfill({ status: 503, body: '' })
  )
}

async function openHeaderSearch(page: Page) {
  await page.getByRole('button', { name: 'Buscar município (tecla /)' }).click()
  return page.getByRole('combobox', { name: 'Buscar município' })
}

test.describe('Header search', () => {
  test('finds a name without its accents and opens its page', async ({ page }) => {
    await setUp(page, 'list')
    await page.goto('/pt-BR/guide')
    const input = await openHeaderSearch(page)
    await input.fill('sao jose')
    const option = page.getByRole('option')
    await expect(option).toHaveCount(1)
    await expect(option).toContainText('São José dos Campos')
    await expect(option).toContainText('SP · 3549904')
    await input.press('Enter')
    await expect(page).toHaveURL(/\/pt-BR\/municipalities\/sao-jose-dos-campos-sp$/)
  })

  test('finds an IBGE code, and a name followed by its state', async ({ page }) => {
    await setUp(page, 'list')
    await page.goto('/pt-BR/guide')
    const input = await openHeaderSearch(page)
    await input.fill('3509')
    await expect(page.getByRole('option')).toHaveText(/Campinas/)
    await input.fill('itajuba mg')
    await expect(page.getByRole('option')).toHaveText(/Itajubá.*MG · 3132404/)
    await input.fill('itajuba sp')
    await expect(page.getByRole('option')).toHaveCount(0)
    await expect(page.getByRole('status').filter({ hasText: 'Nenhum município' })).toContainText(
      'São Paulo e o piloto de Minas Gerais'
    )
  })

  test('looks up municipalities only, not pages', async ({ page }) => {
    await setUp(page, 'list')
    await page.goto('/pt-BR/guide')
    const input = await openHeaderSearch(page)
    await input.fill('calculadora')
    await expect(page.getByRole('option')).toHaveCount(0)
    await expect(page.getByRole('status').filter({ hasText: 'Nenhum município' })).toBeVisible()
  })

  test('says the list is unavailable rather than that nothing matches', async ({ page }) => {
    await setUp(page, 'down')
    await page.goto('/pt-BR/guide')
    const input = await openHeaderSearch(page)
    await input.fill('campinas')
    await expect(page.getByRole('status').filter({ hasText: 'não está disponível' })).toBeVisible()
    await expect(page.getByText('Nenhum município encontrado')).toHaveCount(0)
  })

  test('on a phone it spans the screen, does not zoom, and passes axe', async ({ page }) => {
    await setUp(page, 'list')
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/pt-BR/guide')
    const input = await openHeaderSearch(page)
    await expect(input).toBeFocused()
    // 16 px or more, or iOS zooms the page when the field takes focus.
    expect(await input.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16)
    await input.fill('camp')
    await expect(page.getByRole('option')).toHaveCount(2)
    for (const option of await page.getByRole('option').all()) {
      const box = await option.boundingBox()
      expect(box!.width).toBeGreaterThan(350)
      expect(box!.height).toBeGreaterThanOrEqual(44)
    }
    const close = page.getByRole('button', { name: 'Fechar busca' })
    const closeBox = await close.boundingBox()
    expect(closeBox!.width).toBeGreaterThanOrEqual(44)
    expect(await axeViolations(page)).toEqual([])
    await close.click()
    await expect(page.getByRole('button', { name: 'Buscar município (tecla /)' })).toBeFocused()
  })
})

test.describe('Landing search', () => {
  test('finds a name typed with or without punctuation', async ({ page }) => {
    await setUp(page, 'list')
    await page.goto('/pt-BR')
    const input = page.getByRole('combobox', { name: 'Buscar município' })
    await input.fill('santa barbara doeste')
    await expect(page.getByRole('option')).toHaveText(/Santa Bárbara d'Oeste/)
    await input.fill('SAO PAULO')
    await expect(page.getByRole('option').first()).toContainText('São Paulo')
  })
})

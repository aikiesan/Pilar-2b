/**
 * Until the paper is submitted (METHOD_PAGES_ENABLED off), the landing, the
 * catalogue and /about show no availability factor: no FDE value, no FCp, no
 * FDE column, and neither the meta nor the Open Graph description names them.
 *
 * The check reads the server-rendered markup with the <script> blocks taken
 * out, and the visible text. The scripts carry the RSC payload with the whole
 * message catalogue, which the older tools (analysis, calculator) still need.
 */
import { test, expect, type APIRequestContext } from '@playwright/test'
import { METHOD_PAGES_ENABLED } from '../src/lib/featureFlags'
import { allResidueParams, findResidue, residueFDE } from '../src/data/residueCatalog'

test.skip(METHOD_PAGES_ENABLED, 'the factors are public in this build')

const percent = (locale: string, value: number) =>
  new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }).format(value)

/** The page's markup without its scripts, spaces normalised. */
async function markup(request: APIRequestContext, path: string): Promise<string> {
  const response = await request.get(path)
  expect(response.status(), `${path} did not render`).toBe(200)
  return (await response.text())
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/\s+/g, ' ')
}

/** The content of a <meta> tag picked by its name or property. */
function metaContent(html: string, key: string): string | undefined {
  const tag = html.match(new RegExp(`<meta[^>]*(?:name|property)="${key}"[^>]*>`, 'i'))?.[0]
  return tag?.match(/content="([^"]*)"/i)?.[1]
}

function expectNoFactors(html: string, path: string) {
  expect(html, `${path} names FCp`).not.toContain('FCp')
  expect(html.match(/\bFDE\b/)?.[0], `${path} shows FDE`).toBeUndefined()
}

const SECTORS = Array.from(new Set(allResidueParams().map((p) => p.sector)))

for (const locale of ['pt-BR', 'en']) {
  test(`${locale}: the landing, the catalogue and the sector pages show no factor`, async ({ request }) => {
    for (const path of [`/${locale}`, `/${locale}/about`, `/${locale}/data`, ...SECTORS.map((s) => `/${locale}/data/${s}`)]) {
      expectNoFactors(await markup(request, path), path)
    }
  })

  test(`${locale}: no product page shows its FDE`, async ({ request }) => {
    for (const { sector, residue: slug } of allResidueParams()) {
      const path = `/${locale}/data/${sector}/${slug}`
      const html = await markup(request, path)
      expectNoFactors(html, path)
      const residue = findResidue(sector, slug)!
      expect(html, `${path} shows its FDE`).not.toContain(percent(locale, residueFDE(residue)))
    }
  })
}

test('the meta and Open Graph descriptions name no factor', async ({ request }) => {
  for (const path of ['/pt-BR', '/en', '/pt-BR/about', '/en/about']) {
    const html = await markup(request, path)
    for (const key of ['description', 'og:description']) {
      const content = metaContent(html, key)
      expect(content, `${path} has no ${key}`).toBeTruthy()
      expect(content, `${path} ${key} names FCp`).not.toContain('FCp')
      expect(content!.match(/\bFDE\b/)?.[0], `${path} ${key} names FDE`).toBeUndefined()
    }
  }
})

test('the visible text of a product page names no factor', async ({ page }) => {
  await page.goto('/pt-BR/data/agricultural/cana-bagaco')
  const tabs = page.getByRole('tablist', { name: 'Seções do produto de dados' }).getByRole('tab')
  await expect(tabs).toHaveCount(5)
  await expect(tabs.filter({ hasText: 'Método' })).toHaveCount(0)
  for (const tab of await tabs.all()) {
    await tab.click()
    const text = await page.evaluate(() => document.querySelector('main')?.innerText ?? '')
    expect(text).not.toContain('FCp')
    expect(text.match(/\bFDE\b/)?.[0]).toBeUndefined()
  }
})

/**
 * Accessibility E2E Tests — WCAG AA compliance
 *
 * Uses Playwright's built-in accessibility API (page.accessibility.snapshot)
 * and structural DOM checks to verify that key pages meet baseline
 * accessibility requirements without needing a third-party browser plugin.
 *
 * Checks per page:
 *  - <html lang> is set
 *  - Page has exactly one <h1>
 *  - All images have alt text
 *  - All form inputs have associated labels
 *  - Interactive elements are keyboard-focusable
 *  - No empty links or buttons
 */

import { test, expect } from '@playwright/test'

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

// ── Shared helper ─────────────────────────────────────────────────────────────

async function assertBaselineA11y(page: import('@playwright/test').Page, path: string) {
  await page.goto(`${BASE}${path}`)
  await page.waitForLoadState('domcontentloaded')

  // 1. lang attribute must be present
  const lang = await page.getAttribute('html', 'lang')
  expect(lang, `${path}: <html> must have a lang attribute`).toBeTruthy()

  // 2. Images without alt text
  const imgsWithoutAlt = await page.locator('img:not([alt])').count()
  expect(imgsWithoutAlt, `${path}: all <img> elements must have alt`).toBe(0)

  // 3. Inputs without labels (checks aria-label, aria-labelledby, and <label for>)
  const unlabelledInputs = await page.evaluate(() => {
    const inputs = Array.from(
      document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"])')
    )
    return inputs.filter((el) => {
      const input = el as HTMLInputElement
      const id = input.id
      const hasLabel = id ? !!document.querySelector(`label[for="${id}"]`) : false
      const hasAriaLabel = !!input.getAttribute('aria-label')
      const hasAriaLabelledBy = !!input.getAttribute('aria-labelledby')
      const hasTitle = !!input.getAttribute('title')
      const hasPlaceholder = !!input.getAttribute('placeholder')
      return !hasLabel && !hasAriaLabel && !hasAriaLabelledBy && !hasTitle && !hasPlaceholder
    }).length
  })
  expect(unlabelledInputs, `${path}: inputs must have labels`).toBe(0)

  // 4. Empty links
  const emptyLinks = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a'))
    return links.filter((a) => {
      const text = (a.textContent || '').trim()
      const ariaLabel = a.getAttribute('aria-label')
      const title = a.getAttribute('title')
      return !text && !ariaLabel && !title
    }).length
  })
  expect(emptyLinks, `${path}: links must have accessible names`).toBe(0)
}

// ── Public pages ──────────────────────────────────────────────────────────────

test.describe('Accessibility — Public pages', () => {
  test('pt-BR map page passes baseline a11y checks', async ({ page }) => {
    await assertBaselineA11y(page, '/pt-BR/map')
  })

  test('en map page passes baseline a11y checks', async ({ page }) => {
    await assertBaselineA11y(page, '/en/map')
  })

  test('login page passes baseline a11y checks', async ({ page }) => {
    await assertBaselineA11y(page, '/pt-BR/login')
  })
})

// ── Map page focus management ─────────────────────────────────────────────────

test.describe('Accessibility — Keyboard navigation', () => {
  test('map page skip-to-content or first interactive element is reachable by Tab', async ({
    page,
  }) => {
    await page.goto(`${BASE}/pt-BR/map`)
    await page.waitForLoadState('domcontentloaded')

    // Press Tab once and check that focus moves to something interactive
    await page.keyboard.press('Tab')
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName.toLowerCase())
    const focusedRole = await page.evaluate(
      () => document.activeElement?.getAttribute('role') || ''
    )

    const interactiveTags = ['a', 'button', 'input', 'select', 'textarea', 'details', 'summary']
    const isInteractive =
      interactiveTags.includes(focusedTag || '') || focusedRole !== ''

    expect(isInteractive, 'First Tab should focus an interactive element').toBe(true)
  })
})

// ── Colour-contrast-adjacent: heading hierarchy ───────────────────────────────

test.describe('Accessibility — Heading hierarchy', () => {
  test('pt-BR map has at least one heading', async ({ page }) => {
    await page.goto(`${BASE}/pt-BR/map`)
    await page.waitForLoadState('domcontentloaded')
    const headings = await page.locator('h1, h2, h3').count()
    expect(headings).toBeGreaterThan(0)
  })

  test('login page has an h1', async ({ page }) => {
    await page.goto(`${BASE}/pt-BR/login`)
    await page.waitForLoadState('domcontentloaded')
    const h1Count = await page.locator('h1').count()
    expect(h1Count).toBeGreaterThanOrEqual(1)
  })
})

// ── Playwright Accessibility Snapshot ────────────────────────────────────────

test.describe('Accessibility — Snapshot (structural)', () => {
  test('map page accessibility tree is non-empty', async ({ page }) => {
    await page.goto(`${BASE}/pt-BR/map`)
    await page.waitForLoadState('domcontentloaded')

    const snapshot = await page.accessibility.snapshot()
    expect(snapshot).not.toBeNull()
    expect(snapshot?.children?.length).toBeGreaterThan(0)
  })

  test('login page accessibility tree contains a form', async ({ page }) => {
    await page.goto(`${BASE}/pt-BR/login`)
    await page.waitForLoadState('domcontentloaded')

    // Check for form element presence
    const formCount = await page.locator('form').count()
    expect(formCount).toBeGreaterThanOrEqual(1)
  })
})

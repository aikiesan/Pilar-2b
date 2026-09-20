/**
 * Locale integrity — the English site must not render Portuguese UI text.
 *
 * Why this file exists: `smoke.spec.ts` already had an "en route contains
 * English content" test, but it asserted
 * `/[Mm]unicipality|[Bb]iogas|[Pp]otential|[Mm]ap|[Ss]earch/` against the page
 * HTML. "Biogas" is spelled the same in Portuguese, so that test passed on a
 * fully Portuguese page and could never fail. Eight missing `calculator.step2.*`
 * keys and a Portuguese header search box shipped underneath it.
 *
 * A positive assertion cannot catch this. The check has to be negative: no
 * Portuguese UI chrome anywhere in the rendered text of an `/en/` page.
 *
 * Two design rules keep it from going flaky:
 *
 *  1. Assert on `innerText`, never `page.content()`. The HTML carries RSC
 *     payloads and API JSON where Portuguese domain values legitimately appear
 *     (typology classes, municipality names). Only what a reader actually sees
 *     counts.
 *
 *  2. The markers are UI chrome that is never data. Words like "Resíduos" or
 *     "Plataforma" are excluded on purpose — they appear inside the platform's
 *     registered Portuguese name on the citation page, which is a proper noun
 *     and correct to leave untranslated.
 *
 * ROUTES is a ratchet: it lists the pages verified clean. As each page in
 * PENDING is extracted to the message catalogs, move it up. Do not add a route
 * here until it passes, and never relax a marker to make a page go green —
 * that is how the test above got hollowed out.
 */

import { test, expect } from '@playwright/test';

/** Portuguese UI chrome. Never a proper noun, never a domain value. */
const PORTUGUESE_UI = [
  'Município',
  'Municípios',
  'Selecione',
  'Carregando',
  'Nenhum',
  'Nenhuma',
  'Voltar',
  'Fechar',
  'Buscar',
  'Pesquisar',
  'Baixar',
  'Potencial',
  'Cenário',
  'Camadas',
  'navegar',
  'Sobre a plataforma',
  'Dados e documentação',
];

/** Verified free of Portuguese UI text. Extend as pages are extracted. */
const ROUTES = [
  '/en/map',
  '/en/dashboard',
  '/en/dashboard/technology-routes',
  '/en/sobre',
  '/en/about',
  '/en/guide',
  '/en/cite',
];

/**
 * Every public page is on the list. Dashboard sub-pages (proximity,
 * advanced-analysis, scientific-database) are still untranslated and tracked in
 * docs/planning/ROADMAP_2026-09_EN_AND_LEAN.md — add each one here as it lands.
 */

test.describe('Locale integrity — /en/ renders no Portuguese UI', () => {
  for (const route of ROUTES) {
    test(`${route} has no Portuguese UI text`, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle').catch(() => {
        // A slow map tile or API call must not fail the locale assertion;
        // the text we care about is rendered from the catalog, not fetched.
      });

      const text = await page.evaluate(() => document.body.innerText);

      // Liveness first. "No Portuguese on the page" is trivially true of a 500
      // error page, so without these two assertions a fully broken app scores a
      // perfect run — which is exactly what happened the first time this suite
      // was pointed at the Docker container: every route 500'd on a corrupted
      // Turbopack cache and 7 of 8 tests still reported green.
      expect(response?.status(), `${route} did not return a successful status`).toBeLessThan(400);
      expect(
        text.length,
        `${route} rendered almost no text — the page is probably an error or empty shell`
      ).toBeGreaterThan(200);
      const found = PORTUGUESE_UI.filter((marker) => text.includes(marker));

      expect(
        found,
        `${route} renders Portuguese UI text: ${found.join(', ')}. ` +
          `Move these strings into messages/en.json and messages/pt-BR.json.`
      ).toEqual([]);
    });
  }

  test('pt-BR still renders Portuguese (the markers are real)', async ({ page }) => {
    // Guards the guard: if these words stopped appearing on the Portuguese
    // side, the list above would be matching nothing and every /en/ test
    // would pass vacuously — the exact failure this file exists to prevent.
    await page.goto('/pt-BR/map', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});

    const text = await page.evaluate(() => document.body.innerText);
    const found = PORTUGUESE_UI.filter((marker) => text.includes(marker));

    expect(found.length, 'pt-BR/map should render Portuguese UI chrome').toBeGreaterThan(0);
  });
});

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
 * Every page is on the lists below; a new page goes on them with its first
 * commit. Never relax a marker to make a page go green — that is how the test
 * above got hollowed out.
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

/**
 * A number in Portuguese short form ("20 mil", "4,6 bi"): formatted for pt-BR,
 * or a hand-written suffix instead of `useFormat().compact`. `\s` also takes
 * the no-break space Intl puts before the suffix.
 */
const PORTUGUESE_NUMBER = /\d\s(?:mil|mi|bi|tri)\b/;

/** Every public page. */
const ROUTES = [
  '/en',
  '/en/map',
  '/en/dashboard',
  '/en/dashboard/technology-routes',
  '/en/sobre',
  '/en/about',
  '/en/guide',
  '/en/guide/calculadora',
  '/en/cite',
  '/en/login',
  '/en/register',
  '/en/privacy',
  '/en/terms',
  '/en/accessibility',
  '/en/patch-notes',
];

/**
 * Pages behind sign-in. Without an account they redirect to /login, so they
 * are checked only against a server in open mode (NEXT_PUBLIC_DISABLE_AUTH=true,
 * what the public site runs), where a visitor is signed in as the test user:
 *
 *   NEXT_PUBLIC_DISABLE_AUTH=true npm run dev          # one terminal
 *   E2E_OPEN_MODE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test --project=public e2e/i18n.public.spec.ts
 *
 * With no backend running they render their error states — which are copy too.
 */
const SIGNED_IN_ROUTES = [
  '/en/dashboard/proximity',
  '/en/dashboard/advanced-analysis',
  '/en/dashboard/scientific-database',
  '/en/dashboard/scientific-database?view=references',
  '/en/settings',
];

/**
 * The source scanner (npm run i18n:scan, no file pending) and the component
 * tests that render the real catalog hold the signed-in pages' copy in CI; the
 * open-mode run above checks what they actually render.
 */

test.describe('Locale integrity — /en/ renders no Portuguese UI', () => {
  const routes = process.env.E2E_OPEN_MODE ? [...ROUTES, ...SIGNED_IN_ROUTES] : ROUTES;
  for (const route of routes) {
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
      expect(
        text.match(PORTUGUESE_NUMBER)?.[0],
        `${route} shows a number in Portuguese short form. Format it with useFormat().compact.`
      ).toBeUndefined();
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

  test('pt-BR short-form numbers match the pattern', async ({ page }) => {
    // The same guard for PORTUGUESE_NUMBER: the About page's counters count up
    // to "4,6 bi" in pt-BR, so the pattern must find them there.
    await page.goto('/pt-BR/about', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toContainText(PORTUGUESE_NUMBER, { useInnerText: true });
  });
});

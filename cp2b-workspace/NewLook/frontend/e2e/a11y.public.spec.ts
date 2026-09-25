/**
 * Accessibility in a real browser: axe's WCAG 2.1 A and AA rules on every page,
 * in the light and the dark theme, and no page wider than the window at common
 * laptop widths.
 *
 * The Jest axe tests run in jsdom, which lays nothing out and paints nothing:
 * they cannot see contrast, or a header wider than the screen. Both shipped —
 * typed text at 1.04:1 in the dark sign-up form, and a header that pushed the
 * search and the sign-in button off every screen narrower than about 1540 px.
 *
 * axe-core is injected from node_modules (it is already a dependency), so this
 * needs no Playwright plugin. The page lists live in ./routes.ts.
 */

import { test, expect, type Page } from '@playwright/test';
import { routesToCheck } from './routes';

const WCAG_21_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function axeViolations(page: Page): Promise<string[]> {
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  return page.evaluate(async (tags) => {
    const axe = (window as unknown as { axe: { run: (context: Document, options: object) => Promise<any> } }).axe;
    const result = await axe.run(document, { runOnly: { type: 'tag', values: tags } });
    return result.violations.map(
      (v: { id: string; impact: string; nodes: { target: string[] }[] }) =>
        `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`
    );
  }, WCAG_21_AA);
}

async function open(page: Page, route: string) {
  const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {
    // A slow tile or API call must not fail the check; the page itself is here.
  });
  expect(response?.status(), `${route} did not return a successful status`).toBeLessThan(400);
}

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`WCAG 2.1 AA — ${colorScheme} theme`, () => {
    test.use({ colorScheme });

    for (const route of routesToCheck()) {
      test(`${route} has no axe violations`, async ({ page }) => {
        await open(page, route);
        expect(await axeViolations(page), `${route} in the ${colorScheme} theme`).toEqual([]);
      });
    }
  });
}

test.describe('No page is wider than the window', () => {
  for (const width of [1280, 1366, 1440]) {
    test(`at ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      for (const route of ['/en', '/pt-BR', '/en/about', '/pt-BR/guide']) {
        await open(page, route);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth
        );
        expect(overflow, `${route} scrolls sideways at ${width} px`).toBeLessThanOrEqual(0);
      }
    });
  }
});

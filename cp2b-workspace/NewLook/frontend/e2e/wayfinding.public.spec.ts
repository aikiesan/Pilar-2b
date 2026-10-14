/**
 * Never lost: a mistyped address lands on a page with a way out, the
 * Portuguese addresses people type lead to the real pages, every page names
 * itself in the browser tab, and the breadcrumb climbs the menus.
 */

import { test, expect } from '@playwright/test';
import { routesToCheck } from './routes';
import { axeViolations } from './axe';

test.describe('Page not found', () => {
  for (const [route, heading, home] of [
    ['/pt-BR/esta-pagina-nao-existe', 'Não encontramos esta página', 'Voltar ao início'],
    ['/en/no-such-page/at-all', "We couldn't find this page", 'Back to home'],
  ] as const) {
    test(`${route} answers 404 with a way back`, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBe(404);

      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
      // The site's own header is still there, so every menu is one click away.
      await expect(page.locator('header nav').first()).toBeVisible();
      await expect(page.getByRole('combobox').first()).toBeVisible();
      await expect(page.getByRole('main').getByRole('link', { name: home })).toBeVisible();
      expect(await axeViolations(page), route).toEqual([]);
    });
  }
});

test.describe('Portuguese addresses', () => {
  for (const [alias, target, status] of [
    ['/mapa', '/map', 301],
    ['/municipios', '/municipalities', 301],
    ['/municipios/campinas-sp', '/municipalities/campinas-sp', 301],
    ['/dados', '/data', 301],
    ['/guia', '/guide', 301],
    ['/comparar', '/compare', 301],
    ['/calculadora', '/calculator', 301],
    ['/proximidade', '/proximity', 301],
    ['/citar', '/cite', 301],
    ['/acessibilidade', '/accessibility', 301],
    ['/privacidade', '/privacy', 301],
    ['/termos', '/terms', 301],
    ['/metodo', '/method/science-base', 307],
  ] as const) {
    test(`${alias} leads to ${target}`, async ({ request }) => {
      for (const locale of ['pt-BR', 'en']) {
        const response = await request.get(`/${locale}${alias}`, { maxRedirects: 0 });
        expect(response.status()).toBe(status);
        expect(new URL(response.headers().location, 'http://x').pathname).toMatch(new RegExp(`/${locale}${target}$`));
      }
    });
  }
});

test('every page has its own title', async ({ page }) => {
  test.setTimeout(180_000);
  const titles = new Map<string, string>();
  for (const route of routesToCheck().filter((route) => !route.includes('?'))) {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    const title = await page.title();
    expect(title, route).not.toBe('');
    const clash = [...titles].find(([, other]) => other === title);
    expect(clash?.[0], `${route} shares the title "${title}"`).toBeUndefined();
    titles.set(route, title);
  }
});

test.describe('Breadcrumb', () => {
  test('climbs the menus, starting at home', async ({ page }) => {
    await page.goto('/en/data/legend', { waitUntil: 'domcontentloaded' });
    const crumbs = page.getByRole('navigation', { name: 'You are here' });
    await expect(crumbs.getByRole('link', { name: 'Home' })).toHaveAttribute('href', /\/en$/);
    await expect(crumbs.getByRole('link', { name: 'Data' })).toHaveAttribute('href', /\/en\/data$/);
    await expect(crumbs.locator('[aria-current="page"]')).toHaveText('Legend and codes');
  });

  test('a tool page leads back to its menu group, not to a dashboard', async ({ page }) => {
    await page.goto('/pt-BR/compare', { waitUntil: 'domcontentloaded' });
    const crumbs = page.getByRole('navigation', { name: 'Você está em' });
    await expect(crumbs.getByRole('link', { name: 'Início' })).toBeVisible();
    await expect(crumbs.getByRole('link', { name: 'Plataforma' })).toHaveAttribute('href', /\/pt-BR\/map$/);
    await expect(crumbs.getByText(/dashboard/i)).toHaveCount(0);
  });
});

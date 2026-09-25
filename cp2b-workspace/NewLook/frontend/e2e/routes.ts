/**
 * The pages the browser suites visit. A new page goes on these lists with its
 * first commit.
 */

/** Every public page. */
export const ROUTES = [
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
 *   E2E_OPEN_MODE=1 PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test --project=public   # another
 *
 * With no backend running they render their error states — which count too.
 */
export const SIGNED_IN_ROUTES = [
  '/en/dashboard/proximity',
  '/en/dashboard/advanced-analysis',
  '/en/dashboard/scientific-database',
  '/en/dashboard/scientific-database?view=references',
  '/en/settings',
];

/** The routes a run covers: the signed-in pages too when the server is in open mode. */
export const routesToCheck = (): string[] =>
  process.env.E2E_OPEN_MODE ? [...ROUTES, ...SIGNED_IN_ROUTES] : ROUTES;

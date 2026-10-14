import { METHOD_PAGES_ENABLED } from '../src/lib/featureFlags';

/** The Método pages behind METHOD_PAGES_ENABLED. */
export const METHOD_PAGES = ['/method', '/method/fde', '/method/scenarios', '/method/validation'];

/**
 * The pages the browser suites visit. A new page goes on these lists with its
 * first commit.
 */

/** Every public page. */
export const ROUTES = [
  '/en',
  '/en/map',
  '/en/dashboard',
  '/en/calculator',
  '/en/compare',
  '/en/municipalities',
  '/en/data',
  '/en/data/legend',
  '/en/data/agricultural',
  '/en/data/agricultural/cana-bagaco',
  // Held back until the methodology paper is submitted; 404 meanwhile.
  ...(METHOD_PAGES_ENABLED ? METHOD_PAGES.map((page) => `/en${page}`) : []),
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
  '/en/newsletter/unsubscribe',
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
  '/en/proximity',
  '/en/analysis',
  '/en/method/science-base',
  '/en/method/science-base?view=references',
  '/en/settings',
];

/** The routes a run covers: the signed-in pages too when the server is in open mode. */
export const routesToCheck = (): string[] =>
  process.env.E2E_OPEN_MODE ? [...ROUTES, ...SIGNED_IN_ROUTES] : ROUTES;

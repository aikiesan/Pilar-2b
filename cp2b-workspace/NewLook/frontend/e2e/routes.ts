/**
 * Route lists shared by the e2e suites — one source of truth, so a page added to
 * the locale ratchet is automatically warmed up too.
 */

/**
 * Public pages verified free of Portuguese UI text in English. A ratchet:
 * extend as pages are extracted to the catalogs, never shrink it to go green.
 * Dashboard sub-pages (proximity, advanced-analysis, scientific-database) are
 * still untranslated and tracked in docs/planning/ROADMAP_2026-09_EN_AND_LEAN.md.
 */
export const LOCALE_CHECKED_ROUTES = [
  '/en/map',
  '/en/dashboard',
  '/en/dashboard/technology-routes',
  '/en/sobre',
  '/en/about',
  '/en/guide',
  '/en/cite',
];

/**
 * Every route a public spec opens. global-setup.ts requests each of these one at
 * a time before any worker starts — see the comment there for why that matters.
 */
export const WARMUP_ROUTES = ['/pt-BR/map', ...LOCALE_CHECKED_ROUTES];

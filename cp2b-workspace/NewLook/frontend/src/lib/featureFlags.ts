/**
 * Build-time feature flags.
 *
 * One switch per capability, read at every call site, so turning something on or
 * off is a one-line change rather than a hunt through components.
 */

/**
 * Whether visitors may export the underlying dataset (CSV / GeoJSON / image).
 *
 * OFF while the platform is in BETA. The national dataset is still being
 * validated — sugarcane is on a national mill-delivery ratio pending per-state
 * moagem, the summary endpoint still reports São Paulo totals, and several crop
 * streams have open methodology questions. Publishing a downloadable copy now
 * would put numbers into circulation that we may still revise, in files that
 * carry no provenance and cannot be corrected once they are on someone's disk.
 *
 * Viewing is unaffected: the map, panels and API continue to serve everything.
 * This gates the act of taking a COPY away, which is the part that becomes
 * permanent and uncorrectable.
 *
 * To re-enable when the data is cleared for publication, set this to `true` —
 * every export affordance is gated on it and will reappear together. Consider
 * shipping a citation/licence notice with the exports at the same time.
 */
export const DATA_EXPORT_ENABLED = false;

/** Developer-facing reason, logged where an export used to be offered. */
export const DATA_EXPORT_DISABLED_REASON =
  'Data export is temporarily disabled during the beta, while the national database is validated.';

/**
 * Whether the Método pages are public: /method (overview), /method/fde,
 * /method/scenarios and /method/validation.
 *
 * OFF until the methodology paper is through journal submission: the pages
 * set out the method in the paper's own terms, and publishing them first could
 * count as prior publication. While off, the four pages answer 404, and the
 * menus, footer, breadcrumbs and sitemap leave them out; the Método menu keeps
 * the pages that were already public (Base científica, Guia de uso).
 *
 * To publish, set this to `true` — the pages and every link to them return
 * together.
 *
 * The same switch holds back the availability factors in the data catalogue
 * and on the landing (e2e/held-factors.public.spec.ts).
 *
 * After submission, besides flipping this:
 *  - send each page only its own message strings: the layout hands every page
 *    the whole catalogue, old method text included, in its RSC payload.
 */
export const METHOD_PAGES_ENABLED = false;

/**
 * Whether the map analyses are on: the four bivariate analyses on /map (the
 * panel section, the legend and ?a= links), the map questions on the home page
 * and /explore.
 *
 * OFF until sign-in with approval exists: the analyses are the group's own
 * work on top of the raw data, which is already public on REDU, and they are
 * to be shown only to approved accounts
 * (docs/superpowers/specs/2026-11-22-login-com-aprovacao-design.md). While off,
 * ?a= is ignored and dropped from the URL, the panel shows no analyses,
 * /siting-indicators is never requested, the home leaves the questions out and
 * /explore answers 404.
 *
 * This is a frontend gate only. It hides the analyses; it does not protect
 * them: GET /municipalities/siting-indicators still answers anyone, the
 * message catalogue still carries the analysis copy, and the /map bundle still
 * holds lib/mapAnalyses.ts. Protecting the data is Part 2's job, on the server
 * (an approved session), never this switch.
 *
 * Once sign-in exists, the rule becomes "this switch on AND an approved
 * session"; the switch stays as the way to take every analysis down at once.
 * Set it to `true` and every entry point returns together.
 */
export const MAP_ANALYSES_ENABLED = false;

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
 */
export const METHOD_PAGES_ENABLED = false;

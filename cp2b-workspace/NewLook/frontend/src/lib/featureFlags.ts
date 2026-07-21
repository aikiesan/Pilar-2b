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

/** Human-readable reason, shown where an export used to be offered. */
export const DATA_EXPORT_DISABLED_REASON =
  'Exportação de dados temporariamente indisponível durante a fase beta, ' +
  'enquanto a base nacional passa por validação.';

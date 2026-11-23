/**
 * The map's motion, in one place: whether the visitor asked for less of it,
 * and how a Leaflet pane fades in when what it draws changes. The durations and
 * curves themselves are CSS (globals.css, "Map motion").
 */

export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** How long a window takes to leave; keep equal to --motion-exit in globals.css. */
export const MAP_EXIT_MS = 160;

/**
 * Fades a pane in again (class `map-pane-fade`), for a new selection outline or
 * a new set of marks. Restarting a CSS animation takes a reflow between
 * removing and adding the class. Nothing happens with reduced motion.
 */
export function replayPaneFade(pane: HTMLElement | undefined | null): void {
  if (!pane || prefersReducedMotion()) return;
  pane.classList.remove('map-pane-fade');
  void pane.offsetWidth;
  pane.classList.add('map-pane-fade');
}

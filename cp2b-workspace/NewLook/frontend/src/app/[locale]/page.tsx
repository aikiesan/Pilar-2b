/**
 * Root landing route.
 *
 * The interactive map is now the platform's front door: it renders here so the
 * map is the first thing that loads at "/". Project orientation (formerly this
 * marketing home) moved to /sobre and is surfaced through the /guide hub.
 * Re-exporting the map page keeps a single source of truth for the map screen.
 */
export { default } from './map/page';

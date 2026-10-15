#!/usr/bin/env node
/**
 * Builds public/images/map-preview-sp.svg, the static map on the landing page.
 * A picture of the choropleth, not the map: the landing loads no Leaflet and
 * no tiles.
 *
 *   psql "$DATABASE_URL" -f scripts/map-preview/map-preview.sql \
 *     | node scripts/map-preview/build-map-preview.mjs > public/images/map-preview-sp.svg
 *
 * Reads "layer|path data" rows on stdin (layers in map-preview.sql). The
 * basemap mimics the one the map opens on, CARTO Positron (src/data/basemaps.ts):
 * grey-blue sea, near-white land, grey state lines. Municipalities use the
 * map's default YlGnBu ramp (RAMP_DEFAULT and ZERO_FILL in src/lib/mapMetrics.ts).
 * Re-run it when the SP base changes; the picture does not need to track every
 * reload, only to look like the map it opens.
 */
import { readFileSync } from 'node:fs';

const WIDTH = 600;
const HEIGHT = 431;
const SEA = '#d4dadc';
const LAND = '#f4f3f0';
const STATE_LINE = '#c4c4c4';
const SP_EDGE = '#7a7a7a';
const FILLS = ['#f7f7f7', '#ffffd9', '#edf8b1', '#c7e9b4', '#7fcdbb', '#41b6c4', '#1d91c0', '#225ea8', '#0c2c84'];

const layers = new Map(
  readFileSync(0, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.includes('|'))
    .map((line) => {
      const at = line.indexOf('|');
      return [line.slice(0, at), line.slice(at + 1)];
    })
);

if (!layers.has('edge') || !layers.has('land')) {
  console.error('Missing layers on stdin: is the query pointed at a database with SP and its neighbours?');
  process.exit(1);
}

const municipalities = FILLS.map((fill, cls) => (layers.has(String(cls)) ? `<path fill="${fill}" d="${layers.get(String(cls))}"/>` : '')).join('');

process.stdout.write(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}">` +
    `<rect width="${WIDTH}" height="${HEIGHT}" fill="${SEA}"/>` +
    `<path fill="${LAND}" stroke="${STATE_LINE}" stroke-width=".8" stroke-linejoin="round" d="${layers.get('land')}"/>` +
    `<g stroke="#fff" stroke-width=".4" stroke-linejoin="round">${municipalities}</g>` +
    `<path fill="none" stroke="${SP_EDGE}" stroke-width=".9" stroke-linejoin="round" d="${layers.get('edge')}"/>` +
    `</svg>\n`
);

/**
 * Sector colours — agrícola, pecuária, urbano — for the map, charts, cards and
 * PDF reports. Earthy, to sit with the rest of the palette, but still told
 * apart (hue 95°, 60°, 235°) and each a ≥3:1 swatch on white.
 *
 * tailwind.config.js reads the same values from src/styles/palette.js
 * (`bg-sector-agricola` …); a test keeps the two equal.
 */
export const SECTOR_COLORS = {
  agricultural: '#6B7F3A',
  livestock: '#C0782E',
  urban: '#4F6F86',
} as const

export type SectorKey = keyof typeof SECTOR_COLORS

/** A single-series chart (one colour for every bar): the brand terracotta. */
export const SINGLE_SERIES_COLOR = '#8E3B22'
export const SINGLE_SERIES_COLOR_DARK = '#E39A78'

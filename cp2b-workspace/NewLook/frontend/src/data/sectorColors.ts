/**
 * Sector colours — agrícola, pecuária, urbano — for the map, charts, cards and
 * PDF reports. After the CP2b brand (Verde, Âmbar, Azul Petróleo), still told
 * apart under colour blindness, and each a ≥3:1 swatch on white.
 *
 * tailwind.config.js reads the same values from src/styles/palette.js
 * (`bg-sector-agricola` …); a test keeps the two equal.
 */
export const SECTOR_COLORS = {
  agricultural: '#5CA032',
  livestock: '#A15500',
  urban: '#166E97',
} as const

export type SectorKey = keyof typeof SECTOR_COLORS

/** A single-series chart (one colour for every bar): Verde Escuro. */
export const SINGLE_SERIES_COLOR = '#00573A'
export const SINGLE_SERIES_COLOR_DARK = '#80C29D'

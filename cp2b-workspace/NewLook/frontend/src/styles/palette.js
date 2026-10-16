/**
 * PILAR-2b palette — CP2b visual identity (Manual de Identidade Visual, jul. 2025).
 *
 * One source for tailwind.config.js. The ramps keep their old names so the
 * ~2,500 existing classes move to the brand without edits; each step keeps the
 * role (and roughly the lightness) it had, so text/background pairings stay
 * legible. Brand colours from the manual and where they sit:
 *
 *   Azul Petróleo #1E3E4C  → `dusk` 700 and the text colour (--ink)
 *   Verde Escuro  #00573A  → `terra` 600: primary buttons, links, active state
 *   Verde         #5CA032  → `cp2b.verde`, accents and fills (3.2:1, not text)
 *   Verde Limão   #B6E03B  → `cp2b.lima`, accents only (1.5:1 on white), or
 *                            text on Azul Petróleo (7.4:1)
 *   Âmbar Intenso #D37402  → `ochre` 500, fill only; ochre-700 for text (6.7:1)
 *
 *   gray / slate  → cool neutrals tinted towards Azul Petróleo (no beige).
 *   terra         → green ramp around Verde Escuro (was terracotta).
 *   ochre         → amber ramp around Âmbar Intenso (was ochre).
 *   dusk          → Azul Petróleo ramp (was slate-blue).
 *
 * Status colours (success, warning, error) stay Tailwind's own green, amber
 * and red: a success message must not read as the brand colour.
 */
const warmGray = { 50: '#F7F9FA', 100: '#EEF2F4', 200: '#E1E7EA', 300: '#C9D3D8', 400: '#93A3AB', 500: '#5B6B73', 600: '#4A5960', 700: '#37454C', 800: '#243238', 900: '#162227', 950: '#0A1316' }
const warmSlate = warmGray
const terra = { 50: '#EDF7F1', 100: '#D7EDE0', 200: '#B0DBC2', 300: '#80C29D', 400: '#47A475', 500: '#178257', 600: '#00573A', 700: '#004A31', 800: '#003D29', 900: '#003021', 950: '#001A12' }
const ochre = { 50: '#FFF6EA', 100: '#FDE8CC', 200: '#F9CF99', 300: '#F1B05F', 400: '#E6922B', 500: '#D37402', 600: '#AD5F00', 700: '#8C4C00', 800: '#6B3A00', 900: '#522C00', 950: '#2C1700' }
const dusk = { 50: '#EEF4F6', 100: '#DCE8EC', 200: '#BAD1DA', 300: '#8DB2C0', 400: '#5E8C9E', 500: '#3E6C7F', 600: '#2C5465', 700: '#1E3E4C', 800: '#183340', 900: '#122832', 950: '#09161C' }

/** The manual's colours by name, for the few places that want the exact swatch. */
const brand = {
  petroleo: '#1E3E4C',
  'verde-escuro': '#00573A',
  verde: '#5CA032',
  lima: '#B6E03B',
  ambar: '#D37402',
}

/**
 * Sector colours for map, charts, cards and PDFs, after the brand: Verde,
 * a deep Âmbar and a petrol blue. Each is a ≥3:1 swatch on white (3.2, 5.5,
 * 5.7) and the three stay apart for red-green and blue-yellow colour
 * blindness. Mirrored in src/data/sectorColors.ts (a test keeps the two equal).
 */
const sector = {
  agricola: '#5CA032',
  pecuaria: '#A15500',
  urbano: '#166E97',
}

module.exports = { warmGray, warmSlate, terra, ochre, dusk, brand, sector }

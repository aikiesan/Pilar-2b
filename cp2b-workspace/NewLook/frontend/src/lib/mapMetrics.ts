/**
 * Map metric registry — one source of truth for the four choropleth metrics.
 *
 * The layer colouring, the legend, the toggle, and the popup all derive their
 * value, unit, colour and label from here, so they can never disagree (the same
 * discipline that fixed the popup/choropleth split in lib/mapValues.ts). Adding a
 * metric is one entry, not edits scattered across five files.
 *
 * Colour thresholds are expressed in the metric's DISPLAY unit (t/yr, Nm³/day,
 * MWh/yr): the raw served yearly value is converted to display units first, then
 * bucketed — so the legend ranges and the popup number are always the same unit.
 */

import type { MunicipalityProperties } from '@/types/geospatial';
import type { DisplayMetric } from '@/types/geospatial';
import type { BiomassType, ResidueType } from '@/components/map/FloatingControlPanel';
import type { MapScenarioKey } from '@/data/scenarioFactors';
import {
  getBiomassMapValue,
  getBiogasScenarioValue,
  getMethaneScenarioValue,
  getBiomethaneScenarioValue,
  getBioenergyScenarioValue,
  getMethanePerCapitaValue,
  type MapValue,
} from './mapValues';

/**
 * The metrics offered as toggles, in bar order.
 *
 * `methane_m3` is deliberately NOT here. Raw biogás, methane and biomethane are
 * three distinct quantities and all three are served (see mapValues), but the
 * map only needs to OFFER the two a reader reasons about — what the digester
 * produces, and what you get after upgrading. Methane is the intermediate step,
 * and putting it in the toggle bar asked users to care about a distinction the
 * platform should just get right on their behalf.
 *
 * Its METRIC_SPECS entry is kept so bookmarked ?metric=methane_m3 URLs still
 * resolve, and because bioenergia is computed from the CH₄ band — 9.97 kWh/m³ is
 * methane's calorific value, not biogas's.
 */
export const DISPLAY_METRICS: DisplayMetric[] = [
  'biomass_tons',
  'biogas_m3',
  'biomethane_m3',
  'bioenergy_mwh',
];

// Sequential ramps, low → high (ramp[0] = smallest bucket, last = largest).
// Default: YlGnBu (the platform's existing scale), "darker = more".
//
// EIGHT tiers, not six. With six, the Real scenario put 573 of São Paulo's 645
// municipalities into two adjacent colours and left the darkest two holding 1
// and 0 — half the ramp unused, and the state looking uniform apart from the
// capital. Eight is the ColorBrewer maximum for a sequential scale that still
// reads unambiguously at choropleth size.
export const RAMP_DEFAULT = [
  '#ffffd9',
  '#edf8b1',
  '#c7e9b4',
  '#7fcdbb',
  '#41b6c4',
  '#1d91c0',
  '#225ea8',
  '#0c2c84',
];

/** How many colour tiers a ramp has (breaks = TIERS - 1). */
export const RAMP_TIERS = RAMP_DEFAULT.length;

// ── Colour-vision-deficiency (daltonic) palettes ────────────────────────────
// The daltonic toggle no longer forces a single blue ramp; it selects one of
// these CVD-safe palettes. Viridis and cividis are perceptually uniform and
// vary in BOTH hue and lightness (cividis is tuned specifically for
// deuteranopia/protanopia), so they read far better than a single-hue scale
// while still being unambiguous for all major CVD types. "Blues" keeps the
// original monotonic single-hue option for users who prefer it.
export type CvdPaletteId = 'viridis' | 'cividis' | 'blues';

export interface CvdPalette {
  id: CvdPaletteId;
  label: string;
  /** Short note on who it's optimised for. */
  note: string;
  /** Eight low→high tiers, matching RAMP_DEFAULT. */
  ramp: [string, string, string, string, string, string, string, string];
}

export const CVD_PALETTES: Record<CvdPaletteId, CvdPalette> = {
  viridis: {
    id: 'viridis',
    label: 'Viridis',
    note: 'Perceptualmente uniforme · segura para todos os tipos',
    ramp: [
      '#440154',
      '#46327e',
      '#365c8d',
      '#277f8e',
      '#1fa187',
      '#4ac16d',
      '#a0da39',
      '#fde725',
    ],
  },
  cividis: {
    id: 'cividis',
    label: 'Cividis',
    note: 'Otimizada para deuteranopia/protanopia',
    ramp: [
      '#00204d',
      '#00336f',
      '#3c4d6e',
      '#5d6478',
      '#7b7b78',
      '#9e9370',
      '#c3ad60',
      '#ffea46',
    ],
  },
  blues: {
    id: 'blues',
    label: 'Azul (mono)',
    note: 'Tom único · luminância monotônica',
    ramp: [
      '#eff3ff',
      '#deebf7',
      '#c6dbef',
      '#9ecae1',
      '#6baed6',
      '#4292c6',
      '#2171b5',
      '#084594',
    ],
  },
};

export const DEFAULT_CVD_PALETTE: CvdPaletteId = 'viridis';

/** Ramp for a CVD palette id, falling back to the default palette. */
export function getCvdRamp(id?: CvdPaletteId): CvdPalette['ramp'] {
  return (id && CVD_PALETTES[id] ? CVD_PALETTES[id] : CVD_PALETTES[DEFAULT_CVD_PALETTE]).ramp;
}

// Back-compat: the previous single daltonic ramp is now the "blues" palette.
export const RAMP_DALTONIC = CVD_PALETTES.blues.ramp;

// ── General choropleth palettes (thematic maps) ─────────────────────────────
// The daltonic toggle is an accessibility override that stays scoped to the
// CVD-safe ramps above. THIS registry is the everyday "escala de cores" the
// thematic presets pick from and the user can switch freely — it is a SUPERSET
// that includes the platform default (YlGnBu) plus a handful of sequential
// ramps chosen so a preset can match its subject (greens for agrícola, warm
// yellow→red for urban/energia intensity, etc.). Every ramp is eight low→high
// tiers so it drops straight into the same bucketing the default uses; the
// `cvdSafe` flag marks the ones that also read unambiguously for colour-vision
// deficiency, so the selector can hint at it without forcing daltonic mode.
export type MapPaletteId =
  | 'ylgnbu'
  | 'greens'
  | 'ylorrd'
  | 'bupu'
  | 'plasma'
  | 'viridis'
  | 'cividis'
  | 'blues';

export interface MapPalette {
  id: MapPaletteId;
  label: string;
  note: string;
  /** True when the ramp also reads unambiguously for colour-vision deficiency. */
  cvdSafe: boolean;
  /** Eight low→high tiers, matching RAMP_DEFAULT. */
  ramp: readonly string[];
}

export const MAP_PALETTES: Record<MapPaletteId, MapPalette> = {
  ylgnbu: {
    id: 'ylgnbu',
    label: 'Verde-Azul (padrão)',
    note: 'YlGnBu · escala padrão da plataforma',
    cvdSafe: true,
    ramp: RAMP_DEFAULT,
  },
  greens: {
    id: 'greens',
    label: 'Verdes',
    note: 'Sequencial · ênfase agrícola',
    cvdSafe: false,
    ramp: [
      '#f7fcf5', '#e5f5e0', '#c7e9c0', '#a1d99b',
      '#74c476', '#41ab5d', '#238b45', '#005a32',
    ],
  },
  ylorrd: {
    id: 'ylorrd',
    label: 'Amarelo-Vermelho',
    note: 'Sequencial quente · intensidade',
    cvdSafe: false,
    ramp: [
      '#ffffcc', '#ffeda0', '#fed976', '#feb24c',
      '#fd8d3c', '#fc4e2a', '#e31a1c', '#b10026',
    ],
  },
  bupu: {
    id: 'bupu',
    label: 'Azul-Roxo',
    note: 'Sequencial frio · foco urbano',
    cvdSafe: false,
    ramp: [
      '#f7fcfd', '#e0ecf4', '#bfd3e6', '#9ebcda',
      '#8c96c6', '#8c6bb1', '#88419d', '#6e016b',
    ],
  },
  plasma: {
    id: 'plasma',
    label: 'Plasma',
    note: 'Vibrante · alto contraste',
    cvdSafe: true,
    ramp: [
      '#0d0887', '#5b02a3', '#8b0aa5', '#b83289',
      '#db5c68', '#f48849', '#febd2a', '#f0f921',
    ],
  },
  viridis: {
    id: 'viridis',
    label: CVD_PALETTES.viridis.label,
    note: CVD_PALETTES.viridis.note,
    cvdSafe: true,
    ramp: CVD_PALETTES.viridis.ramp,
  },
  cividis: {
    id: 'cividis',
    label: CVD_PALETTES.cividis.label,
    note: CVD_PALETTES.cividis.note,
    cvdSafe: true,
    ramp: CVD_PALETTES.cividis.ramp,
  },
  blues: {
    id: 'blues',
    label: CVD_PALETTES.blues.label,
    note: CVD_PALETTES.blues.note,
    cvdSafe: true,
    ramp: CVD_PALETTES.blues.ramp,
  },
};

export const DEFAULT_MAP_PALETTE: MapPaletteId = 'ylgnbu';

/** Ramp for a general palette id, falling back to the platform default. */
export function getPaletteRamp(id?: MapPaletteId): readonly string[] {
  return (id && MAP_PALETTES[id] ? MAP_PALETTES[id] : MAP_PALETTES[DEFAULT_MAP_PALETTE]).ramp;
}

export const ZERO_FILL = '#f7f7f7'; // measured zero — near-white, clear of the ramp
export const NO_DATA_FILL = '#cbd5e1'; // never loaded — distinct grey (migration 025)

const DAYS_PER_YEAR = 365;

export interface MetricContext {
  biomassType: BiomassType;
  selectedResidues: ResidueType[];
  scenario: MapScenarioKey;
}

export interface MetricSpec {
  key: DisplayMetric;
  toggleLabel: string;
  icon: string;
  /** Tailwind bg for the active toggle button. */
  activeClass: string;
  /** Legend header, includes the display unit. */
  legendTitle: string;
  /** Short unit suffix for popups. */
  unit: string;
  /** Served yearly value + coverage, scenario/sector aware. */
  rawValue: (props: MunicipalityProperties, ctx: MetricContext) => MapValue;
  /** Yearly raw value → number in the display unit. */
  toDisplay: (rawYearly: number) => number;
  /**
   * FALLBACK breaks in display units — RAMP_TIERS-1 ascending upper bounds.
   *
   * Only used when the adaptive scale cannot be computed (nothing visible, or
   * every visible value identical). The live map classifies against
   * `computeAdaptiveBreaks` over what is actually on screen, because no fixed
   * ladder can serve both the state total and a single-residue slice two orders
   * of magnitude below it.
   */
  breaks: number[];
}

/**
 * Log-spaced breaks over the visible distribution — the map's live classifier.
 *
 * Why adaptive: the residue filter and the scenario toggle move these values by
 * one to two orders of magnitude (state CH₄ tops out at 390k Nm³/dia; cattle
 * alone at 45k; swine at ~90). A fixed ladder tuned for one of those paints the
 * others in a single colour.
 *
 * Why logarithmic rather than quantile: the distribution is heavily right-skewed
 * — the capital alone is 3.8× the 99th percentile, on urban waste — and log
 * spacing keeps colour meaning MAGNITUDE. Quantiles would spread the map evenly
 * but make the darkest tier mean "top eighth", which reads as a finding when the
 * differences inside it are small.
 *
 * The ends are clipped to p2/p98 so a single outlier cannot consume the ramp;
 * values beyond simply saturate in the end tiers, which is the honest rendering
 * of an outlier — still the darkest, no longer flattening everyone else.
 */
export function computeAdaptiveBreaks(displayValues: number[], tiers = RAMP_TIERS): number[] | null {
  const v = displayValues.filter((x) => Number.isFinite(x) && x > 0).sort((a, b) => a - b);
  if (v.length < tiers) return null;
  const at = (p: number) => {
    const i = (v.length - 1) * p;
    const lo = Math.floor(i);
    const hi = Math.min(lo + 1, v.length - 1);
    return v[lo] + (v[hi] - v[lo]) * (i - lo);
  };
  const lo = at(0.02);
  const hi = at(0.98);
  if (!(lo > 0) || !(hi > lo)) return null;
  const k = tiers - 1; // number of breaks
  const logLo = Math.log(lo);
  const step = (Math.log(hi) - logLo) / (k - 1);
  return Array.from({ length: k }, (_, i) => Math.exp(logLo + step * i));
}

const perDay = (yearly: number) => yearly / DAYS_PER_YEAR;

export const METRIC_SPECS: Record<DisplayMetric, MetricSpec> = {
  biomass_tons: {
    key: 'biomass_tons',
    toggleLabel: 'Biomassa',
    icon: '🌿',
    activeClass: 'bg-green-600',
    legendTitle: 'Biomassa (t/ano)',
    unit: 't/ano',
    rawValue: (p, c) => getBiomassMapValue(p, c.biomassType, c.selectedResidues),
    toDisplay: (v) => v,
    breaks: [8_000, 21_000, 53_000, 135_000, 340_000, 865_000, 2_200_000],
  },
  // Raw biogas: methane + the CO2 it comes with. Roughly 1.8x the methane
  // figure, so its breaks are scaled accordingly. Until this existed the map
  // showed CH4 under this label, which made biomethane/biogás read 0.97 (a
  // methane-recovery number) instead of the ~0.53 volumetric yield.
  biogas_m3: {
    key: 'biogas_m3',
    toggleLabel: 'Biogás',
    icon: '⚡',
    activeClass: 'bg-blue-600',
    legendTitle: 'Biogás (Nm³/dia)',
    unit: 'Nm³/dia',
    rawValue: (p, c) => getBiogasScenarioValue(p, c.scenario, c.selectedResidues),
    toDisplay: perDay,
    breaks: [2_000, 4_500, 9_500, 20_000, 44_000, 94_000, 200_000],
  },
  // Methane only — what BMP actually predicts, and the basis for bioenergia.
  methane_m3: {
    key: 'methane_m3',
    toggleLabel: 'Metano',
    icon: '🔬',
    activeClass: 'bg-cyan-600',
    legendTitle: 'Metano CH₄ (Nm³/dia)',
    unit: 'Nm³/dia',
    rawValue: (p, c) => getMethaneScenarioValue(p, c.scenario, c.selectedResidues),
    toDisplay: perDay,
    breaks: [1_300, 2_800, 6_000, 12_800, 27_500, 59_000, 126_000],
  },
  biomethane_m3: {
    key: 'biomethane_m3',
    toggleLabel: 'Biometano',
    icon: '🔥',
    activeClass: 'bg-orange-600',
    legendTitle: 'Biometano (Nm³/dia)',
    unit: 'Nm³/dia',
    rawValue: (p, c) => getBiomethaneScenarioValue(p, c.scenario, c.selectedResidues),
    toDisplay: perDay,
    breaks: [1_300, 2_800, 6_000, 12_800, 27_500, 59_000, 126_000],
  },
  bioenergy_mwh: {
    key: 'bioenergy_mwh',
    toggleLabel: 'Bioenergia',
    icon: '🔋',
    activeClass: 'bg-purple-600',
    legendTitle: 'Bioenergia (MWh/ano)',
    unit: 'MWh/ano',
    rawValue: (p, c) => getBioenergyScenarioValue(p, c.scenario, c.selectedResidues),
    toDisplay: (v) => v, // already MWh/yr
    breaks: [4_700, 10_000, 22_000, 47_000, 100_000, 214_000, 460_000],
  },
  // Biometano por habitante (Censo 2022). Deliberately NOT in DISPLAY_METRICS, so
  // it never appears in the toggle bar — it is applied only by the "Potencial per
  // capita" thematic map. rawValue already returns the per-capita figure, so
  // toDisplay is the identity. Adaptive breaks reclassify it live; the fallback
  // ladder below only matters when nothing is on screen.
  ch4_per_capita: {
    key: 'ch4_per_capita',
    toggleLabel: 'Per capita',
    icon: '👥',
    activeClass: 'bg-fuchsia-600',
    legendTitle: 'Biometano per capita (Nm³/hab·ano)',
    unit: 'Nm³/hab·ano',
    rawValue: (p, c) => getMethanePerCapitaValue(p, c.scenario, c.selectedResidues),
    toDisplay: (v) => v,
    breaks: [10, 30, 80, 200, 500, 1_200, 3_000],
  },
};

export function getMetricSpec(metric: DisplayMetric): MetricSpec {
  return METRIC_SPECS[metric] ?? METRIC_SPECS.biomass_tons;
}

/**
 * Colour for a raw yearly value. Converts to display units, then buckets against
 * the spec's breaks. `null` (no_data) and 0 (measured zero) are handled by the
 * caller via NO_DATA_FILL / ZERO_FILL — this only maps positive display values.
 */
export function getMetricColor(
  rawYearly: number,
  spec: MetricSpec,
  daltonic: boolean,
  paletteId?: CvdPaletteId,
  breaks?: number[] | null,
  mapPaletteId?: MapPaletteId
): string {
  // Daltonic is an accessibility override and wins over any thematic palette:
  // a preset must never silently undo the CVD-safe choice. Otherwise the
  // choropleth follows the freely-chosen thematic palette (default YlGnBu).
  const ramp = daltonic ? getCvdRamp(paletteId) : getPaletteRamp(mapPaletteId);
  if (rawYearly <= 0) return ZERO_FILL;
  const v = spec.toDisplay(rawYearly);
  const b = breaks && breaks.length ? breaks : spec.breaks;
  // Linear scan over at most seven breaks — cheaper than a binary search at this
  // size and called once per polygon per restyle.
  for (let i = 0; i < b.length; i++) {
    if (v < b[i]) return ramp[i];
  }
  return ramp[Math.min(b.length, ramp.length - 1)];
}

/** Compact display-unit formatter (e.g. 1.2M, 250K, 900). */
export function formatCompact(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(v >= 10_000 ? 0 : 1)}K`;
  return `${Math.round(v)}`;
}

/** Full display value for one municipality + metric, e.g. "12.3K Nm³/dia". */
export function formatMetricValue(rawYearly: number | null, spec: MetricSpec): string {
  if (rawYearly === null) return 'sem dados';
  return `${formatCompact(spec.toDisplay(rawYearly))} ${spec.unit}`;
}

export interface LegendItem {
  color: string;
  label: string;
}

/**
 * Legend rows (ramp tiers high→low + zero + no_data) in the metric's display
 * unit. Pass the same `breaks` the choropleth was painted with — the legend
 * explains that classification, not a nominal one.
 */
export function legendItems(
  spec: MetricSpec,
  daltonic: boolean,
  paletteId?: CvdPaletteId,
  breaks?: number[] | null,
  mapPaletteId?: MapPaletteId
): LegendItem[] {
  const ramp = daltonic ? getCvdRamp(paletteId) : getPaletteRamp(mapPaletteId);
  const b = breaks && breaks.length ? breaks : spec.breaks;
  const f = formatCompact;
  const rows: LegendItem[] = [
    { color: ramp[Math.min(b.length, ramp.length - 1)], label: `> ${f(b[b.length - 1])}` },
  ];
  for (let i = b.length - 1; i > 0; i--) {
    rows.push({ color: ramp[i], label: `${f(b[i - 1])} – ${f(b[i])}` });
  }
  rows.push({ color: ramp[0], label: `< ${f(b[0])}` });
  rows.push({ color: ZERO_FILL, label: 'Zero' });
  rows.push({ color: NO_DATA_FILL, label: 'Sem dados' });
  return rows;
}

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
  type MapValue,
} from './mapValues';

export const DISPLAY_METRICS: DisplayMetric[] = [
  'biomass_tons',
  'biogas_m3',
  'methane_m3',
  'biomethane_m3',
  'bioenergy_mwh',
];

// Sequential ramps, low → high, both keeping "darker = more".
// Default: YlGnBu (the platform's existing scale).
export const RAMP_DEFAULT = ['#ffffcc', '#c7e9b4', '#7fcdbb', '#41b6c4', '#2c7fb8', '#253494'];
// Daltonic: ColorBrewer "Blues" — single-hue, monotonic luminance, safe for all
// major colour-vision deficiencies (deutan/protan/tritan).
export const RAMP_DALTONIC = ['#eff3ff', '#c6dbef', '#9ecae1', '#6baed6', '#3182bd', '#08519c'];

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
  /** Five ascending upper-bounds (display units) → six ramp tiers. */
  breaks: [number, number, number, number, number];
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
    breaks: [5_000, 50_000, 200_000, 1_000_000, 5_000_000],
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
    rawValue: (p, c) => getBiogasScenarioValue(p, c.scenario),
    toDisplay: perDay,
    breaks: [4_500, 45_000, 180_000, 450_000, 1_800_000],
  },
  // Methane only — what BMP actually predicts, and the basis for bioenergia.
  methane_m3: {
    key: 'methane_m3',
    toggleLabel: 'Metano',
    icon: '🔬',
    activeClass: 'bg-cyan-600',
    legendTitle: 'Metano CH₄ (Nm³/dia)',
    unit: 'Nm³/dia',
    rawValue: (p, c) => getMethaneScenarioValue(p, c.scenario),
    toDisplay: perDay,
    breaks: [2_500, 25_000, 100_000, 250_000, 1_000_000],
  },
  biomethane_m3: {
    key: 'biomethane_m3',
    toggleLabel: 'Biometano',
    icon: '🔥',
    activeClass: 'bg-orange-600',
    legendTitle: 'Biometano (Nm³/dia)',
    unit: 'Nm³/dia',
    rawValue: (p, c) => getBiomethaneScenarioValue(p, c.scenario),
    toDisplay: perDay,
    breaks: [2_500, 25_000, 100_000, 250_000, 1_000_000],
  },
  bioenergy_mwh: {
    key: 'bioenergy_mwh',
    toggleLabel: 'Bioenergia',
    icon: '🔋',
    activeClass: 'bg-purple-600',
    legendTitle: 'Bioenergia (MWh/ano)',
    unit: 'MWh/ano',
    rawValue: (p, c) => getBioenergyScenarioValue(p, c.scenario),
    toDisplay: (v) => v, // already MWh/yr
    breaks: [10_000, 100_000, 500_000, 1_000_000, 5_000_000],
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
  daltonic: boolean
): string {
  const ramp = daltonic ? RAMP_DALTONIC : RAMP_DEFAULT;
  if (rawYearly <= 0) return ZERO_FILL;
  const v = spec.toDisplay(rawYearly);
  const [b0, b1, b2, b3, b4] = spec.breaks;
  if (v < b0) return ramp[0];
  if (v < b1) return ramp[1];
  if (v < b2) return ramp[2];
  if (v < b3) return ramp[3];
  if (v < b4) return ramp[4];
  return ramp[5];
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

/** Legend rows (six ramp tiers + zero + no_data) in the metric's display unit. */
export function legendItems(spec: MetricSpec, daltonic: boolean): LegendItem[] {
  const ramp = daltonic ? RAMP_DALTONIC : RAMP_DEFAULT;
  const [b0, b1, b2, b3, b4] = spec.breaks;
  const f = formatCompact;
  return [
    { color: ramp[5], label: `> ${f(b4)}` },
    { color: ramp[4], label: `${f(b3)} – ${f(b4)}` },
    { color: ramp[3], label: `${f(b2)} – ${f(b3)}` },
    { color: ramp[2], label: `${f(b1)} – ${f(b2)}` },
    { color: ramp[1], label: `${f(b0)} – ${f(b1)}` },
    { color: ramp[0], label: `< ${f(b0)}` },
    { color: ZERO_FILL, label: 'Zero' },
    { color: NO_DATA_FILL, label: 'Sem dados' },
  ];
}

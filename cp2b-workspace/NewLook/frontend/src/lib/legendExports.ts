/**
 * The "Legenda e códigos" files: what the codes mean and which colours the
 * map paints with, so a GIS user can reproduce the platform's legend.
 *
 * Only metadata goes into these files: codes, names, colours and the fallback
 * class limits. No municipal figures and no factor values. Those wait on
 * DATA_EXPORT_ENABLED (src/lib/featureFlags.ts) while the beta database is
 * validated.
 *
 * Served as static files by the route handlers under src/app/data/.
 */
import { DETAILED_RESIDUES } from '@/data/residueFactors'
import { CATALOG_SECTORS, SECTOR_SWATCH } from '@/data/residueCatalog'
import { METRIC_SPECS, RAMP_TIERS } from '@/lib/mapMetrics'
import { toCsv } from '@/lib/download'
import type { DisplayMetric } from '@/types/geospatial'

/** The metrics with a legend, in the order the map offers them. */
export const LEGEND_METRICS: DisplayMetric[] = [
  'biomass_tons',
  'biogas_m3',
  'biomethane_m3',
  'bioenergy_mwh',
  'methane_m3',
  'ch4_per_capita',
]

/** One row per residue: code, both names, sector and the sector's colour. */
export function residueCodesCsv(): string {
  const order = (sector: string) => CATALOG_SECTORS.indexOf(sector as (typeof CATALOG_SECTORS)[number])
  const rows = [...DETAILED_RESIDUES]
    .sort((a, b) => order(a.category) - order(b.category) || a.code.localeCompare(b.code))
    .map((r) => [r.code, r.name['pt-BR'], r.name.en, r.category, SECTOR_SWATCH[r.category]])
  return toCsv([['code', 'name_pt', 'name_en', 'sector', 'sector_colour'], ...rows]) + '\n'
}

/**
 * One row per metric and tier: the tier's colour and its fallback class
 * limits. The live map classifies on log-spaced breaks over what is on screen
 * (computeAdaptiveBreaks), so these limits are the reference ladder, not what
 * every view shows.
 */
export function mapLegendCsv(): string {
  const rows: (string | number)[][] = []
  for (const metric of LEGEND_METRICS) {
    const { ramp, breaks } = METRIC_SPECS[metric]
    for (let tier = 0; tier < RAMP_TIERS; tier++) {
      rows.push([metric, tier + 1, ramp[tier], tier === 0 ? 0 : breaks[tier - 1], tier < breaks.length ? breaks[tier] : ''])
    }
  }
  return toCsv([['metric', 'tier', 'colour', 'reference_lower', 'reference_upper'], ...rows]) + '\n'
}

const xmlEscape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')

const rgba = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},255`
}

/**
 * A QGIS style library (Style Manager → Import) with one colour ramp per
 * metric, named "PILAR-2b <metric>", to apply to a graduated renderer with
 * whatever classes the user chooses.
 */
export function qgisRampsXml(): string {
  const ramps = LEGEND_METRICS.map((metric) => {
    const ramp = METRIC_SPECS[metric].ramp
    const last = ramp.length - 1
    const stops = ramp
      .slice(1, last)
      .map((hex, i) => `${((i + 1) / last).toFixed(4)};${rgba(hex)}`)
      .join(':')
    return [
      `    <colorramp type="gradient" name="${xmlEscape(`PILAR-2b ${metric}`)}">`,
      `      <prop k="color1" v="${rgba(ramp[0])}"/>`,
      `      <prop k="color2" v="${rgba(ramp[last])}"/>`,
      `      <prop k="discrete" v="0"/>`,
      `      <prop k="stops" v="${stops}"/>`,
      `    </colorramp>`,
    ].join('\n')
  })
  return [
    '<!DOCTYPE qgis_style>',
    '<qgis_style version="2">',
    '  <symbols/>',
    '  <colorramps>',
    ...ramps,
    '  </colorramps>',
    '</qgis_style>',
    '',
  ].join('\n')
}

/** Published file names, under the app's base path. */
export const LEGEND_FILES = {
  residueCodes: '/data/pilar2b-residue-codes.csv',
  mapLegend: '/data/pilar2b-map-legend.csv',
  qgisRamps: '/data/pilar2b-qgis-ramps.xml',
} as const

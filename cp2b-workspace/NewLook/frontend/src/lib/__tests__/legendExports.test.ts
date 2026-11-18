import { DETAILED_RESIDUES } from '@/data/residueFactors'
import { METRIC_SPECS, RAMP_TIERS } from '@/lib/mapMetrics'
import { LEGEND_METRICS, mapLegendCsv, qgisRampsXml, residueCodesCsv } from '@/lib/legendExports'

const lines = (csv: string) => csv.trim().split('\n')

describe('legend files', () => {
  it('lists every residue code once, with metadata only', () => {
    const [header, ...rows] = lines(residueCodesCsv())
    expect(header).toBe('code,name_pt,name_en,sector,sector_colour')
    expect(rows).toHaveLength(DETAILED_RESIDUES.length)
    for (const r of DETAILED_RESIDUES) {
      expect(rows.filter((row) => row.startsWith(`${r.code},`))).toHaveLength(1)
    }
  })

  it('gives each metric one row per tier, in the map colours', () => {
    const [header, ...rows] = lines(mapLegendCsv())
    expect(header).toBe('metric,tier,colour,reference_lower,reference_upper')
    expect(rows).toHaveLength(LEGEND_METRICS.length * RAMP_TIERS)
    const biomass = rows.filter((row) => row.startsWith('biomass_tons,'))
    const { ramp, breaks } = METRIC_SPECS.biomass_tons
    expect(biomass[0]).toBe(`biomass_tons,1,${ramp[0]},0,${breaks[0]}`)
    // The top tier is open-ended.
    expect(biomass[RAMP_TIERS - 1]).toBe(`biomass_tons,${RAMP_TIERS},${ramp[RAMP_TIERS - 1]},${breaks[breaks.length - 1]},`)
  })

  it('writes one QGIS gradient ramp per metric', () => {
    const xml = qgisRampsXml()
    expect(xml.startsWith('<!DOCTYPE qgis_style>')).toBe(true)
    expect(xml.match(/<colorramp type="gradient"/g)).toHaveLength(LEGEND_METRICS.length)
    for (const metric of LEGEND_METRICS) expect(xml).toContain(`name="PILAR-2b ${metric}"`)
    // Interior stops only: the ends are color1 and color2.
    const stops = xml.match(/<prop k="stops" v="([^"]*)"/)![1].split(':')
    expect(stops).toHaveLength(RAMP_TIERS - 2)
    for (const stop of stops) expect(stop).toMatch(/^0\.\d{4};\d{1,3},\d{1,3},\d{1,3},255$/)
  })
})

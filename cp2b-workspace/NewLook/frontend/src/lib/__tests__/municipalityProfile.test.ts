/**
 * The municipality page's figures, from the three API bodies. Absent is not
 * zero: a total the API did not serve is null ("sem dado CP2b"); a served 0 is
 * a modelled result and stays 0. Illustrative values, not platform data.
 */
import { profileFrom, servedNumber } from '../municipalityProfile'

const METRICS = {
  name: 'Campinas',
  immediate_region: 'Campinas',
  intermediate_region: 'Campinas',
  population: 1000,
  population_year: 2022,
  cp2b_method_version: 'v1',
  ch4_cp2b_n4_m3_year: 300,
  ch4_cp2b_n3_m3_year: 500,
  ch4_cp2b_n4_agricultural_m3_year: 200,
  ch4_cp2b_n4_livestock_m3_year: 0,
  ch4_cp2b_n4_urban_m3_year: 100,
  ch4_cp2b_n4_sugarcane_m3_year: 200,
  ch4_cp2b_n4_rsu_m3_year: 100,
}

describe('servedNumber', () => {
  it('keeps 0 and drops what was not served', () => {
    expect(servedNumber(0)).toBe(0)
    expect(servedNumber('12.5')).toBe(12.5)
    expect(servedNumber(null)).toBeNull()
    expect(servedNumber(undefined)).toBeNull()
    expect(servedNumber('')).toBeNull()
    expect(servedNumber('n/a')).toBeNull()
  })
})

describe('profileFrom', () => {
  it('is null without the metrics answer', () => {
    expect(profileFrom('3509502', null, null, null)).toBeNull()
  })

  it('reads N4, N3, sectors and residues, with absent shares as 0 under a served total', () => {
    const p = profileFrom('3509502', METRICS, null, null)!
    expect(p.n4).toBe(300)
    expect(p.n3).toBe(500)
    expect(p.sectors).toEqual({ agricultural: 200, livestock: 0, urban: 100 })
    expect(p.residues).toHaveLength(11)
    expect(p.residues.find((r) => r.key === 'sugarcane')?.n4).toBe(200)
    expect(p.residues.find((r) => r.key === 'cattle')?.n4).toBe(0)
    expect(p.methodVersion).toBe('v1')
  })

  it('outside the CP2b scope has no totals, no sectors and no residue values', () => {
    const p = profileFrom('3106200', { name: 'Belo Horizonte', population: 10 }, null, null)!
    expect(p.n4).toBeNull()
    expect(p.n3).toBeNull()
    expect(Object.values(p.sectors).every((v) => v === null)).toBe(true)
    expect(p.residues.every((r) => r.n4 === null)).toBe(true)
  })

  it('keeps a served N4 of 0 as 0', () => {
    expect(profileFrom('3500000', { ...METRICS, ch4_cp2b_n4_m3_year: 0 }, null, null)!.n4).toBe(0)
  })

  it('reads only the totals of the CP2b answer, as a min–max range per level', () => {
    const cp2b = {
      totals: {
        min: { n3: { m3_year: 400 }, n4: { m3_year: 200 } },
        med: { n3: { m3_year: 500 }, n4: { m3_year: 300 } },
        max: { n3: { m3_year: 700 }, n4: { m3_year: 450 } },
      },
      substrates: [{ substrate: 'X', scenarios: { med: { fs_x_fl: 0.5 } } }],
    }
    const p = profileFrom('3509502', METRICS, null, cp2b)!
    expect(p.envelope).toEqual({ n3: { min: 400, max: 700 }, n4: { min: 200, max: 450 } })
    expect(p.upstream).toBeNull()
    expect(JSON.stringify(p)).not.toContain('fs_x_fl')
  })

  it('reads N1 and N2 as a central value with its range', () => {
    const cp2b = {
      totals: {
        min: { n1: { m3_year: 900 }, n2: { m3_year: 600 } },
        med: { n1: { m3_year: 1000 }, n2: { m3_year: 700 } },
        max: { n1: { m3_year: 1200 } },
      },
    }
    const p = profileFrom('3509502', METRICS, null, cp2b)!
    expect(p.upstream).toEqual({
      n1: { value: 1000, range: { min: 900, max: 1200 } },
      n2: { value: 700, range: null },
    })
    expect(profileFrom('3509502', { ...METRICS, ch4_cp2b_n4_m3_year: null }, null, cp2b)!.upstream).toBeNull()
  })

  it('reads rank, neighbours and centroid from the context answer', () => {
    const context = {
      rank_in_state: { position: 3, of: 645, level: 'n4' },
      centroid: { lat: -22.9, lng: -47.06 },
      neighbours: [
        { ibge_code: '3501608', name: 'Americana', ch4_cp2b_n4_m3_year: 10 },
        { ibge_code: '3106200', name: 'Belo Horizonte', ch4_cp2b_n4_m3_year: null },
        { ibge_code: 'x', name: 'Bad' },
      ],
    }
    const p = profileFrom('3509502', METRICS, context, null)!
    expect(p.rank).toEqual({ position: 3, of: 645 })
    expect(p.centroid).toEqual({ lat: -22.9, lng: -47.06 })
    expect(p.neighbours).toEqual([
      { ibge: '3501608', name: 'Americana', n4: 10 },
      { ibge: '3106200', name: 'Belo Horizonte', n4: null },
    ])
  })

  it('without the context answer has no rank and no neighbour list (not an empty one)', () => {
    const p = profileFrom('3509502', METRICS, null, null)!
    expect(p.rank).toBeNull()
    expect(p.neighbours).toBeNull()
    expect(p.centroid).toBeNull()
  })
})

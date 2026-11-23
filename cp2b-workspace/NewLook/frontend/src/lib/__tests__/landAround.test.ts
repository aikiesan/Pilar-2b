import {
  OTHER_FARMING_COLOR,
  UNMAPPED_COLOR,
  circleAreaKm2,
  circleRing,
  isInLandAroundBounds,
  nearestInfrastructure,
  summarizeLandAround,
} from '../landAround'
import type { LandUseClass, ProximityAnalysisResult } from '@/services/proximityApi'

const cls = (class_id: number, area_km2: number, name = `c${class_id}`): LandUseClass => ({
  class_id, name, color: `#${String(class_id).padStart(6, '0')}`, category: 'agricultural', pixel_count: 1, area_km2, percent: 0,
})

function result(classes: LandUseClass[], extra: Partial<ProximityAnalysisResult['results']> = {}, biogas = 0): ProximityAnalysisResult {
  return {
    analysis_id: 'a',
    request: { latitude: -21.18, longitude: -47.81, radius_km: 50 },
    results: {
      buffer_geometry: null,
      municipalities: [],
      land_use: {
        total_area_km2: 0,
        by_class: Object.fromEntries(classes.map((c) => [String(c.class_id), c])),
        dominant_class: '',
        agricultural_percent: 0,
      },
      ...extra,
    },
    summary: {
      total_area_km2: 0, total_municipalities: 0, total_population: 0, total_biogas_m3_year: biogas,
      energy_potential_mwh_year: 0, radius_recommendation: 'optimal',
    },
    metadata: { analysis_timestamp: '', processing_time_ms: 1 },
  }
}

describe('summarizeLandAround', () => {
  // Ribeirão Preto at 50 km, as served on 2026-11-22 (km², rounded).
  const ribeirao = result([cls(20, 4482), cls(39, 319), cls(9, 276), cls(15, 124), cls(41, 60), cls(46, 30), cls(48, 31)])

  it('measures every share against the whole circle, not the classified pixels', () => {
    const s = summarizeLandAround(ribeirao, 50)
    const circle = circleAreaKm2(50)
    expect(s.circleKm2).toBeCloseTo(7854, 0)
    expect(s.cropShare).toBeCloseTo((100 * (4482 + 319 + 60 + 30 + 31)) / circle, 6)
    expect(s.pastureShare).toBeCloseTo((100 * 124) / circle, 6)
    expect(s.plantedForestShare).toBeCloseTo((100 * 276) / circle, 6)
    expect(s.cropShare + s.pastureShare + s.plantedForestShare + s.unmappedShare).toBeCloseTo(100, 6)
  })

  it('lists the five largest classes, groups the rest, and ends with the unmapped remainder', () => {
    const { rows } = summarizeLandAround(ribeirao, 50)
    expect(rows.map((r) => r.classId)).toEqual([20, 39, 9, 15, 41, null, null])
    expect(rows.map((r) => r.kind)).toEqual(['crop', 'crop', 'planted_forest', 'pasture', 'crop', 'other_farming', 'unmapped'])
    expect(rows[5]).toMatchObject({ color: OTHER_FARMING_COLOR, areaKm2: 61 })
    expect(rows[6].color).toBe(UNMAPPED_COLOR)
    expect(rows.reduce((sum, r) => sum + r.share, 0)).toBeCloseTo(100, 6)
  })

  it('does not group a single leftover class away from its name', () => {
    const { rows } = summarizeLandAround(result([cls(20, 50), cls(39, 40), cls(9, 30), cls(15, 20), cls(41, 10)]), 20)
    expect(rows.filter((r) => r.kind === 'other_farming')).toHaveLength(0)
    expect(rows).toHaveLength(6)
  })

  it('caps at the circle when edge pixels add up to a hair more', () => {
    const circle = circleAreaKm2(10)
    const s = summarizeLandAround(result([cls(20, circle * 0.7), cls(15, circle * 0.32)]), 10)
    expect(s.cropShare + s.pastureShare).toBeCloseTo(100, 6)
    expect(s.unmappedShare).toBe(0)
  })

  it('ignores no-data and empty classes', () => {
    const s = summarizeLandAround(result([cls(0, 500), cls(20, 0), cls(39, 100)]), 20)
    expect(s.rows.map((r) => r.classId)).toEqual([39, null])
  })

  it('is empty when the raster found no farming (Minas Gerais, a city centre)', () => {
    const s = summarizeLandAround(result([]), 20)
    expect(s.empty).toBe(true)
    expect(s.unmappedShare).toBe(100)
    expect(s.rows).toEqual([expect.objectContaining({ kind: 'unmapped', share: 100 })])
  })

  it('names the place after the nearest municipality and counts them', () => {
    const s = summarizeLandAround(
      result([cls(20, 10)], {
        municipalities: [
          { name: 'Sertãozinho', distance_km: 18 },
          { name: 'Ribeirão Preto', distance_km: 2 },
        ],
      }, 12_300_000),
      20,
    )
    expect(s.placeName).toBe('Ribeirão Preto')
    expect(s.municipalityCount).toBe(2)
    expect(s.biogasM3Year).toBe(12_300_000)
  })

  it('reports no biogas, rather than zero, when the server found no municipalities', () => {
    const s = summarizeLandAround(result([cls(20, 10)]), 20)
    expect(s.placeName).toBeNull()
    expect(s.biogasM3Year).toBeNull()
  })
})

describe('isInLandAroundBounds', () => {
  it('accepts São Paulo and refuses the north of Minas Gerais', () => {
    expect(isInLandAroundBounds(-21.18, -47.81)).toBe(true)
    expect(isInLandAroundBounds(-18.9, -46.5)).toBe(false)
    expect(isInLandAroundBounds(-23, -43)).toBe(false)
  })
})

describe('nearestInfrastructure', () => {
  const withInfra = (infrastructure: ProximityAnalysisResult['results']['infrastructure']) =>
    result([], { infrastructure })

  it('gives the distance when a feature was found', () => {
    const r = withInfra([{ type: 'gas_pipeline', name: 'x', distance_km: 8.4, found: true, max_distance_km: 100 }])
    expect(nearestInfrastructure(r, 'gas_pipeline')).toEqual({ distanceKm: 8.4, maxKm: 100 })
  })

  it('says none within the search radius when the layer was searched', () => {
    const r = withInfra([{ type: 'substation', name: null, distance_km: null, found: false, max_distance_km: 50 }])
    expect(nearestInfrastructure(r, 'substation')).toEqual({ distanceKm: null, maxKm: 50 })
  })

  it('is null when the server sent nothing usable for the type', () => {
    expect(nearestInfrastructure(withInfra([]), 'gas_pipeline')).toBeNull()
    expect(nearestInfrastructure(withInfra([{ type: 'gas_pipeline', name: null, distance_km: null }]), 'gas_pipeline')).toBeNull()
  })
})

describe('circleRing', () => {
  it('draws the radius in km around the point', () => {
    const ring = circleRing(-21.18, -47.81, 20, 4)
    expect(ring).toHaveLength(4)
    // East and north points: 20 km is about 0.18° of latitude.
    expect(ring[0][0]).toBeCloseTo(-21.18, 6)
    expect(ring[1][0] + 21.18).toBeCloseTo(20 / 111.32, 6)
    expect(ring[0][1] + 47.81).toBeGreaterThan(20 / 111.32)
  })
})

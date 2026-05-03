/**
 * Type integrity tests for geospatial and proximity API shapes.
 *
 * These tests operate at the runtime object level, not at the TypeScript
 * type-checker level. They verify that the interfaces correctly describe
 * the shapes we expect from the API, using the same structural pattern as
 * the existing errors.test.ts suite.
 */

import type {
  MunicipalityProperties,
  MunicipalityFeature,
  MunicipalityCollection,
} from '../geospatial'
import type {
  ProximityAnalysisResponse,
  MunicipalityData,
  BiogasBreakdown,
} from '../../services/proximityApi'

// ---------------------------------------------------------------------------
// Test helpers (runtime type guards — no TypeScript needed at execution time)
// ---------------------------------------------------------------------------

function isMunicipalityCollection(obj: unknown): obj is MunicipalityCollection {
  if (typeof obj !== 'object' || obj === null) return false
  const c = obj as Record<string, unknown>
  return c['type'] === 'FeatureCollection' && Array.isArray(c['features'])
}

function isMunicipalityFeature(obj: unknown): obj is MunicipalityFeature {
  if (typeof obj !== 'object' || obj === null) return false
  const f = obj as Record<string, unknown>
  return (
    f['type'] === 'Feature' &&
    typeof f['geometry'] === 'object' &&
    typeof f['properties'] === 'object'
  )
}

function hasProximityShape(obj: unknown): obj is ProximityAnalysisResponse {
  if (typeof obj !== 'object' || obj === null) return false
  const r = obj as Record<string, unknown>
  return (
    typeof r['analysis_point'] === 'object' &&
    typeof r['radius_km'] === 'number' &&
    typeof r['summary'] === 'object'
  )
}

// ---------------------------------------------------------------------------
// MunicipalityCollection
// ---------------------------------------------------------------------------

describe('MunicipalityCollection', () => {
  const validCollection: MunicipalityCollection = {
    type: 'FeatureCollection',
    features: [],
  }

  it('is accepted by the type guard when type is FeatureCollection', () => {
    expect(isMunicipalityCollection(validCollection)).toBe(true)
  })

  it('is rejected by the type guard when type field is missing', () => {
    const invalid = { features: [] }
    expect(isMunicipalityCollection(invalid)).toBe(false)
  })

  it('is rejected by the type guard when type is wrong value', () => {
    const invalid = { type: 'Feature', features: [] }
    expect(isMunicipalityCollection(invalid)).toBe(false)
  })

  it('accepts an optional metadata block', () => {
    const withMeta: MunicipalityCollection = {
      type: 'FeatureCollection',
      features: [],
      metadata: {
        total_municipalities: 645,
        region: 'São Paulo',
        source: 'IBGE 2024',
      },
    }
    expect(isMunicipalityCollection(withMeta)).toBe(true)
    expect(withMeta.metadata?.total_municipalities).toBe(645)
  })

  it('features array can contain MunicipalityFeature objects', () => {
    const feature: MunicipalityFeature = {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [-46.6, -23.5] },
      properties: {
        id: '3550308',
        name: 'São Paulo',
        ibge_code: '3550308',
        area_km2: 1521,
        population: 12325232,
        population_density: 8102,
        immediate_region: 'São Paulo',
        intermediate_region: 'São Paulo',
        immediate_region_code: '35001',
        intermediate_region_code: '3501',
        total_biogas_m3_year: 5000000,
        agricultural_biogas_m3_year: 0,
        livestock_biogas_m3_year: 0,
        urban_biogas_m3_year: 5000000,
        sugarcane_biogas_m3_year: 0,
        soybean_biogas_m3_year: 0,
        corn_biogas_m3_year: 0,
        coffee_biogas_m3_year: 0,
        citrus_biogas_m3_year: 0,
        cattle_biogas_m3_year: 0,
        swine_biogas_m3_year: 0,
        poultry_biogas_m3_year: 0,
        aquaculture_biogas_m3_year: 0,
        forestry_biogas_m3_year: 0,
        rsu_biogas_m3_year: 5000000,
        rpo_biogas_m3_year: 0,
        sugarcane_residues_tons_year: 0,
        soybean_residues_tons_year: 0,
        corn_residues_tons_year: 0,
        total_biomass_tons_year: 0,
        agricultural_biomass_tons_year: 0,
        livestock_biomass_tons_year: 0,
        urban_biomass_tons_year: 0,
        sugarcane_biomass_tons_year: 0,
        soybean_biomass_tons_year: 0,
        corn_biomass_tons_year: 0,
        coffee_biomass_tons_year: 0,
        citrus_biomass_tons_year: 0,
        cattle_biomass_tons_year: 0,
        swine_biomass_tons_year: 0,
        poultry_biomass_tons_year: 0,
        aquaculture_biomass_tons_year: 0,
        rsu_biomass_tons_year: 0,
        rpo_biomass_tons_year: 0,
        potential_category: 'ALTO',
      },
    }

    const collection: MunicipalityCollection = {
      type: 'FeatureCollection',
      features: [feature],
    }

    expect(isMunicipalityCollection(collection)).toBe(true)
    expect(collection.features).toHaveLength(1)
    expect(isMunicipalityFeature(collection.features[0])).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// MunicipalityFeature
// ---------------------------------------------------------------------------

describe('MunicipalityFeature', () => {
  it('accepts a Point geometry', () => {
    const f: MunicipalityFeature = {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [-46.6, -23.5] },
      properties: {} as MunicipalityProperties,
    }
    expect(isMunicipalityFeature(f)).toBe(true)
  })

  it('accepts a MultiPolygon geometry', () => {
    const f: MunicipalityFeature = {
      type: 'Feature',
      geometry: { type: 'MultiPolygon', coordinates: [[[[0, 0], [1, 0], [1, 1], [0, 0]]]] },
      properties: {} as MunicipalityProperties,
    }
    expect(isMunicipalityFeature(f)).toBe(true)
  })

  it('is rejected when type is not Feature', () => {
    const bad = { type: 'FeatureCollection', geometry: {}, properties: {} }
    expect(isMunicipalityFeature(bad)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// MunicipalityProperties — known runtime gap
// ---------------------------------------------------------------------------

describe('MunicipalityProperties — known gaps', () => {
  it('accepts a negative total_biogas_m3_year (no runtime bounds enforced)', () => {
    // This is a documented gap: the TypeScript interface uses `number` with no
    // constraint. The backend Pydantic model also has no explicit non-negative
    // check here. If you add backend validation, add a corresponding test.
    const props: MunicipalityProperties = {
      id: 1,
      name: 'Test',
      ibge_code: '1234567',
      area_km2: 100,
      population: 1000,
      population_density: 10,
      immediate_region: 'R',
      intermediate_region: 'R',
      immediate_region_code: '1',
      intermediate_region_code: '1',
      total_biogas_m3_year: -999,   // negative — allowed by the type
      agricultural_biogas_m3_year: 0,
      livestock_biogas_m3_year: 0,
      urban_biogas_m3_year: 0,
      sugarcane_biogas_m3_year: 0,
      soybean_biogas_m3_year: 0,
      corn_biogas_m3_year: 0,
      coffee_biogas_m3_year: 0,
      citrus_biogas_m3_year: 0,
      cattle_biogas_m3_year: 0,
      swine_biogas_m3_year: 0,
      poultry_biogas_m3_year: 0,
      aquaculture_biogas_m3_year: 0,
      forestry_biogas_m3_year: 0,
      rsu_biogas_m3_year: 0,
      rpo_biogas_m3_year: 0,
      sugarcane_residues_tons_year: 0,
      soybean_residues_tons_year: 0,
      corn_residues_tons_year: 0,
      total_biomass_tons_year: 0,
      agricultural_biomass_tons_year: 0,
      livestock_biomass_tons_year: 0,
      urban_biomass_tons_year: 0,
      sugarcane_biomass_tons_year: 0,
      soybean_biomass_tons_year: 0,
      corn_biomass_tons_year: 0,
      coffee_biomass_tons_year: 0,
      citrus_biomass_tons_year: 0,
      cattle_biomass_tons_year: 0,
      swine_biomass_tons_year: 0,
      poultry_biomass_tons_year: 0,
      aquaculture_biomass_tons_year: 0,
      rsu_biomass_tons_year: 0,
      rpo_biomass_tons_year: 0,
      potential_category: 'BAIXO',
    }
    // TypeScript compiles this fine — document it as a known runtime gap
    expect(props.total_biogas_m3_year).toBe(-999)
  })
})

// ---------------------------------------------------------------------------
// ProximityAnalysisResponse
// ---------------------------------------------------------------------------

describe('ProximityAnalysisResponse', () => {
  const validSummary = {
    total_municipalities: 3,
    total_population: 450000,
    avg_distance_km: 12.5,
    total_biogas_m3_year: 2000000,
  }

  const validResponse: ProximityAnalysisResponse = {
    analysis_point: { latitude: -23.5, longitude: -46.6 },
    radius_km: 20,
    land_use: {
      total_area_km2: 1256.6,
      by_class: {},
      dominant_class: 'Pastagem',
      agricultural_percent: 42.3,
    },
    municipalities: [],
    biogas_potential: { agricultural: 0, livestock: 0, urban: 0, total: 0 },
    infrastructure: [],
    summary: validSummary,
    processing_time_seconds: 1.23,
  }

  it('is accepted by the shape guard', () => {
    expect(hasProximityShape(validResponse)).toBe(true)
  })

  it('summary fields are all numeric', () => {
    const s = validResponse.summary
    expect(typeof s.total_municipalities).toBe('number')
    expect(typeof s.total_population).toBe('number')
    expect(typeof s.avg_distance_km).toBe('number')
    expect(typeof s.total_biogas_m3_year).toBe('number')
  })

  it('analysis_point has numeric lat and lng', () => {
    const p = validResponse.analysis_point
    expect(typeof p.latitude).toBe('number')
    expect(typeof p.longitude).toBe('number')
  })

  it('is rejected by the shape guard when analysis_point is missing', () => {
    const bad = { radius_km: 10, summary: validSummary }
    expect(hasProximityShape(bad)).toBe(false)
  })

  it('is rejected by the shape guard when summary is missing', () => {
    const bad = {
      analysis_point: { latitude: -23.5, longitude: -46.6 },
      radius_km: 10,
    }
    expect(hasProximityShape(bad)).toBe(false)
  })

  it('MunicipalityData has required fields', () => {
    const m: MunicipalityData = {
      name: 'Campinas',
      ibge_code: '3509502',
      distance_km: 8.2,
      biogas_m3_year: 150000,
      population: 1213792,
    }
    expect(m.name).toBe('Campinas')
    expect(typeof m.distance_km).toBe('number')
    expect(typeof m.biogas_m3_year).toBe('number')
  })

  it('BiogasBreakdown totals match sum of sectors', () => {
    const b: BiogasBreakdown = {
      agricultural: 100000,
      livestock: 200000,
      urban: 50000,
      total: 350000,
    }
    expect(b.total).toBe(b.agricultural + b.livestock + b.urban)
  })
})

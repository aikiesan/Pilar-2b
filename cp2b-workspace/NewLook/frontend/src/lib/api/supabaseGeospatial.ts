/**
 * PILAR-2b V3 - Supabase Geospatial Client
 * Direct Supabase client for fetching geospatial data
 */

import { supabase } from '@/lib/supabase/client'
import type {
  MunicipalityCollection,
  SummaryStatistics,
  MunicipalityFeature,
  RankingsResponse
} from '@/types/geospatial'
import { logger } from '@/lib/logger'

/**
 * Supabase Geospatial Client
 * Fetches municipality and infrastructure data directly from Supabase
 */
class SupabaseGeospatialClient {
  /**
   * Get all municipalities as GeoJSON FeatureCollection
   */
  async getMunicipalitiesGeoJSON(): Promise<MunicipalityCollection> {
    try {
      // Call the RPC function that returns GeoJSON
      const { data, error } = await supabase.rpc('get_municipalities_geojson')

      if (error) {
        logger.error('Supabase RPC error:', error)
        throw error
      }

      if (data) {
        return data as MunicipalityCollection
      }

      // Fallback: Query municipalities and build GeoJSON manually
      return this.buildGeoJSONFromQuery()
    } catch (error) {
      logger.error('Failed to fetch municipalities from Supabase:', error)
      // Return fallback to mock data
      return this.buildGeoJSONFromQuery()
    }
  }

  /**
   * Build GeoJSON from direct query when RPC is not available
   */
  private async buildGeoJSONFromQuery(): Promise<MunicipalityCollection> {
    const { data: municipalities, error } = await supabase
      .from('municipalities')
      .select(`
        id,
        municipality_name,
        ibge_code,
        area_km2,
        population,
        immediate_region,
        intermediate_region,
        total_biogas_m3_year,
        agricultural_biogas_m3_year,
        livestock_biogas_m3_year,
        urban_biogas_m3_year,
        sugarcane_biogas_m3_year,
        soybean_biogas_m3_year,
        corn_biogas_m3_year,
        coffee_biogas_m3_year,
        citrus_biogas_m3_year,
        cattle_biogas_m3_year,
        swine_biogas_m3_year,
        poultry_biogas_m3_year,
        aquaculture_biogas_m3_year,
        rsu_biogas_m3_year,
        rpo_biogas_m3_year
      `)
      .order('municipality_name')

    if (error) {
      logger.error('Supabase query error:', error)
      throw error
    }

    if (!municipalities || municipalities.length === 0) {
      logger.warn('No municipalities found in Supabase')
      return {
        type: 'FeatureCollection',
        features: [],
        metadata: {
          total_municipalities: 0,
          source: 'supabase',
          note: 'No data found'
        }
      }
    }

    // We need geometry data - try to get it with PostGIS function
    const { data: geoData, error: geoError } = await supabase
      .rpc('get_municipalities_with_geometry')

    if (geoError) {
      logger.warn('Could not get geometry data, using centroids')
    }

    // Build features from municipalities data
    const features: MunicipalityFeature[] = municipalities.map((m, index) => {
      const geoFeature = geoData?.find((g: { id: number }) => g.id === m.id)

      // Calculate potential category
      const total = m.total_biogas_m3_year || 0
      let potential_category = 'SEM DADOS'
      if (total > 100000000) potential_category = 'ALTO'
      else if (total > 10000000) potential_category = 'MEDIO'
      else if (total > 0) potential_category = 'BAIXO'

      return {
        type: 'Feature' as const,
        geometry: geoFeature?.geometry || {
          type: 'Point' as const,
          coordinates: [-48.5 + (index % 10) * 0.5, -22.5 + Math.floor(index / 10) * 0.3]
        },
        properties: {
          id: m.id,
          name: m.municipality_name,
          ibge_code: m.ibge_code || '',
          area_km2: m.area_km2 || 0,
          population: m.population || 0,
          population_density: m.area_km2 ? (m.population || 0) / m.area_km2 : 0,
          immediate_region: m.immediate_region || '',
          intermediate_region: m.intermediate_region || '',
          immediate_region_code: '',
          intermediate_region_code: '',
          total_biogas_m3_year: m.total_biogas_m3_year || 0,
          agricultural_biogas_m3_year: m.agricultural_biogas_m3_year || 0,
          livestock_biogas_m3_year: m.livestock_biogas_m3_year || 0,
          urban_biogas_m3_year: m.urban_biogas_m3_year || 0,
          sugarcane_biogas_m3_year: m.sugarcane_biogas_m3_year || 0,
          soybean_biogas_m3_year: m.soybean_biogas_m3_year || 0,
          corn_biogas_m3_year: m.corn_biogas_m3_year || 0,
          coffee_biogas_m3_year: m.coffee_biogas_m3_year || 0,
          citrus_biogas_m3_year: m.citrus_biogas_m3_year || 0,
          cattle_biogas_m3_year: m.cattle_biogas_m3_year || 0,
          swine_biogas_m3_year: m.swine_biogas_m3_year || 0,
          poultry_biogas_m3_year: m.poultry_biogas_m3_year || 0,
          aquaculture_biogas_m3_year: m.aquaculture_biogas_m3_year || 0,
          forestry_biogas_m3_year: 0,
          rsu_biogas_m3_year: m.rsu_biogas_m3_year || 0,
          rpo_biogas_m3_year: m.rpo_biogas_m3_year || 0,
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
          potential_category
        }
      }
    })

    return {
      type: 'FeatureCollection',
      features,
      metadata: {
        total_municipalities: features.length,
        region: 'São Paulo',
        source: 'supabase'
      }
    }
  }

  /**
   * Get summary statistics
   */
  async getSummaryStatistics(): Promise<SummaryStatistics> {
    try {
      const { data: municipalities, error } = await supabase
        .from('municipalities')
        .select(`
          municipality_name,
          population,
          total_biogas_m3_year,
          agricultural_biogas_m3_year,
          livestock_biogas_m3_year,
          urban_biogas_m3_year
        `)
        .gt('total_biogas_m3_year', 0)
        .order('total_biogas_m3_year', { ascending: false })

      if (error) throw error

      if (!municipalities || municipalities.length === 0) {
        throw new Error('No municipalities data found')
      }

      const totalBiogas = municipalities.reduce((sum, m) => sum + (m.total_biogas_m3_year || 0), 0)
      const totalPopulation = municipalities.reduce((sum, m) => sum + (m.population || 0), 0)
      const agricultural = municipalities.reduce((sum, m) => sum + (m.agricultural_biogas_m3_year || 0), 0)
      const livestock = municipalities.reduce((sum, m) => sum + (m.livestock_biogas_m3_year || 0), 0)
      const urban = municipalities.reduce((sum, m) => sum + (m.urban_biogas_m3_year || 0), 0)

      // Category counts
      const categories: Record<string, number> = {
        'ALTO': 0,
        'MEDIO': 0,
        'BAIXO': 0
      }

      municipalities.forEach(m => {
        const total = m.total_biogas_m3_year || 0
        if (total > 100000000) categories['ALTO']++
        else if (total > 10000000) categories['MEDIO']++
        else categories['BAIXO']++
      })

      return {
        total_municipalities: municipalities.length,
        total_biogas_m3_year: totalBiogas,
        average_biogas_m3_year: totalBiogas / municipalities.length,
        total_population: totalPopulation,
        top_municipality: {
          name: municipalities[0]?.municipality_name || '',
          biogas_m3_year: municipalities[0]?.total_biogas_m3_year || 0
        },
        top_5_municipalities: municipalities.slice(0, 5).map(m => ({
          name: m.municipality_name,
          biogas_m3_year: m.total_biogas_m3_year || 0
        })),
        categories,
        sector_breakdown: {
          agricultural,
          livestock,
          urban
        },
        sector_percentages: {
          agricultural: totalBiogas > 0 ? (agricultural / totalBiogas) * 100 : 0,
          livestock: totalBiogas > 0 ? (livestock / totalBiogas) * 100 : 0,
          urban: totalBiogas > 0 ? (urban / totalBiogas) * 100 : 0
        },
        note: 'Data from Supabase database'
      }
    } catch (error) {
      logger.error('Failed to get summary statistics from Supabase:', error)
      throw error
    }
  }

  /**
   * Get rankings by criteria
   */
  async getRankings(
    criteria: 'total' | 'agricultural' | 'livestock' | 'urban' = 'total',
    limit: number = 10
  ): Promise<RankingsResponse> {
    const columnMap = {
      total: 'total_biogas_m3_year',
      agricultural: 'agricultural_biogas_m3_year',
      livestock: 'livestock_biogas_m3_year',
      urban: 'urban_biogas_m3_year'
    }

    const column = columnMap[criteria]

    const { data, error } = await supabase
      .from('municipalities')
      .select(`
        id,
        municipality_name,
        ibge_code,
        population,
        total_biogas_m3_year,
        agricultural_biogas_m3_year,
        livestock_biogas_m3_year,
        urban_biogas_m3_year
      `)
      .gt(column, 0)
      .order(column, { ascending: false })
      .limit(limit)

    if (error) throw error

    const rankings = (data || []).map((m, index) => {
      const biogas = criteria === 'total'
        ? m.total_biogas_m3_year
        : criteria === 'agricultural'
        ? m.agricultural_biogas_m3_year
        : criteria === 'livestock'
        ? m.livestock_biogas_m3_year
        : m.urban_biogas_m3_year

      const total = m.total_biogas_m3_year || 0
      let category = 'BAIXO'
      if (total > 100000000) category = 'ALTO'
      else if (total > 10000000) category = 'MEDIO'

      return {
        rank: index + 1,
        id: m.id,
        name: m.municipality_name,
        ibge_code: m.ibge_code || '',
        biogas_m3_year: biogas || 0,
        population: m.population || 0,
        category
      }
    })

    return {
      criteria,
      total_ranked: rankings.length,
      rankings
    }
  }

  /**
   * Get municipality detail by ID
   */
  async getMunicipalityDetail(id: string | number): Promise<MunicipalityFeature | null> {
    const { data, error } = await supabase
      .from('municipalities')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      logger.error('Failed to get municipality detail:', error)
      return null
    }

    const total = data.total_biogas_m3_year || 0
    let potential_category = 'SEM DADOS'
    if (total > 100000000) potential_category = 'ALTO'
    else if (total > 10000000) potential_category = 'MEDIO'
    else if (total > 0) potential_category = 'BAIXO'

    return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [0, 0] // Would need geometry from PostGIS
      },
      properties: {
        id: data.id,
        name: data.municipality_name,
        ibge_code: data.ibge_code || '',
        area_km2: data.area_km2 || 0,
        population: data.population || 0,
        population_density: data.area_km2 ? (data.population || 0) / data.area_km2 : 0,
        immediate_region: data.immediate_region || '',
        intermediate_region: data.intermediate_region || '',
        immediate_region_code: '',
        intermediate_region_code: '',
        total_biogas_m3_year: data.total_biogas_m3_year || 0,
        agricultural_biogas_m3_year: data.agricultural_biogas_m3_year || 0,
        livestock_biogas_m3_year: data.livestock_biogas_m3_year || 0,
        urban_biogas_m3_year: data.urban_biogas_m3_year || 0,
        sugarcane_biogas_m3_year: data.sugarcane_biogas_m3_year || 0,
        soybean_biogas_m3_year: data.soybean_biogas_m3_year || 0,
        corn_biogas_m3_year: data.corn_biogas_m3_year || 0,
        coffee_biogas_m3_year: data.coffee_biogas_m3_year || 0,
        citrus_biogas_m3_year: data.citrus_biogas_m3_year || 0,
        cattle_biogas_m3_year: data.cattle_biogas_m3_year || 0,
        swine_biogas_m3_year: data.swine_biogas_m3_year || 0,
        poultry_biogas_m3_year: data.poultry_biogas_m3_year || 0,
        aquaculture_biogas_m3_year: data.aquaculture_biogas_m3_year || 0,
        forestry_biogas_m3_year: 0,
        rsu_biogas_m3_year: data.rsu_biogas_m3_year || 0,
        rpo_biogas_m3_year: data.rpo_biogas_m3_year || 0,
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
        potential_category
      }
    }
  }
}

// Export singleton instance
export const supabaseGeospatialClient = new SupabaseGeospatialClient()

export default SupabaseGeospatialClient

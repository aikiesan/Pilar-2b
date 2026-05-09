/**
 * PILAR-2b V3 - Geospatial API Client
 * Centralized API client for geospatial data fetching
 */

import type {
  MunicipalityCollection,
  SummaryStatistics,
  MunicipalityFeature,
  RankingsResponse,
  CodigestionClustersResponse,
  ResidueCNMatrix,
} from '@/types/geospatial';
import { logger } from '@/lib/logger';

// Data source configuration
// NEXT_PUBLIC_USE_MOCK_DATA=true - Use client-side mock data
// Otherwise - Use FastAPI backend
const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true';

// API base URL — use relative URL in the browser so any reverse proxy (Apache, Nginx, etc.)
// routes /api/* transparently without requiring NEXT_PUBLIC_API_URL in the environment.
// On the server (SSR / build) fall back to localhost so internal fetches still work.
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' ? '' : 'http://localhost:8001');
// Use geospatial endpoints when not using mock data
const API_PREFIX = USE_MOCK_DATA ? '' : '/api/v1/geospatial';

class GeospatialClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Generic fetch wrapper with error handling and client-side fallback
   */
  private async fetchJSON<T>(endpoint: string, options?: RequestInit): Promise<T> {
    // Priority 1: Use mock data if enabled
    if (USE_MOCK_DATA) {
      console.info('📦 Using client-side mock data (Railway backend bypassed)');
      return this.getClientSideMockData<T>(endpoint);
    }

    // Priority 2: Use FastAPI backend
    const url = `${this.baseUrl}${API_PREFIX}${endpoint}`;

    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail || `API Error: ${response.status} ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        logger.warn(`API fetch failed for ${endpoint}: ${error.message}`);
        logger.info('🔄 Using client-side mock data as final fallback');
        return this.getClientSideMockData<T>(endpoint);
      }
      throw new Error('Unknown error occurred');
    }
  }

  /**
   * Get client-side mock data when backend is unavailable
   * Returns empty data structures to prevent build failures
   */
  private getClientSideMockData<T>(endpoint: string): T {
    logger.warn('Mock data requested but not available. Using empty fallback.');

    if (endpoint.includes('/geojson') || endpoint.includes('/polygons')) {
      return {
        type: 'FeatureCollection',
        features: [],
        metadata: {
          total_municipalities: 0,
          source: 'Empty fallback',
          note: 'No data available - please configure backend API',
        },
      } as T;
    } else if (endpoint.includes('/summary')) {
      return {
        total_municipalities: 0,
        total_biogas_m3_year: 0,
        average_biogas_m3_year: 0,
        total_population: 0,
        top_municipality: { name: '', biogas_m3_year: 0 },
        top_5_municipalities: [],
        categories: {},
        sector_breakdown: {
          agricultural: 0,
          livestock: 0,
          urban: 0,
        },
        sector_percentages: {
          agricultural: 0,
          livestock: 0,
          urban: 0,
        },
      } as T;
    }

    // Default fallback
    throw new Error('No mock data available for this endpoint');
  }

  /**
   * Get all municipalities as GeoJSON FeatureCollection
   * Uses local PostGIS via FastAPI backend, with IBGE API as geometry fallback
   */
  async getMunicipalitiesGeoJSON(): Promise<MunicipalityCollection> {
    const url = `${this.baseUrl}/api/v1/municipalities/geojson`;

    try {
      logger.info('🗺️ Fetching municipality data from local backend (PostGIS)');
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.features || data.features.length === 0) {
        logger.warn('No municipalities returned from local backend, trying IBGE API fallback');
        return this.getFromIBGEWithBiogasData();
      }

      logger.info(`✅ Loaded ${data.features?.length || 0} municipalities from local DB`);
      return data;
    } catch (error) {
      logger.warn(`Failed to fetch from local backend: ${error}`);
      try {
        logger.info('🗺️ Trying IBGE GeoJSON API fallback');
        return await this.getFromIBGEWithBiogasData();
      } catch (ibgeError) {
        logger.warn(`IBGE fallback failed: ${ibgeError}`);
        logger.error('All data sources failed. Returning empty municipality collection.');
        return {
          type: 'FeatureCollection',
          features: [],
          metadata: {
            total_municipalities: 0,
            source: 'Fallback',
            note: 'All data sources unavailable - please check backend API and local database connection',
          },
        };
      }
    }
  }

  /**
   * Fetch municipality polygons from IBGE API and merge with biogas data from local backend
   */
  private async getFromIBGEWithBiogasData(): Promise<MunicipalityCollection> {
    // Fetch São Paulo state municipalities from IBGE API
    // Code 35 = São Paulo state
    const ibgeUrl = 'https://servicodados.ibge.gov.br/api/v3/malhas/estados/35?formato=application/vnd.geo+json&qualidade=minima&intrarregiao=municipio';

    const response = await fetch(ibgeUrl);
    if (!response.ok) {
      throw new Error(`IBGE API error: ${response.status}`);
    }

    const ibgeData = await response.json();
    logger.info(`📍 Fetched ${ibgeData.features?.length || 0} municipalities from IBGE`);

    // Get biogas data from local backend
    let biogasDataByCode: Record<string, any> = {};
    try {
      const municipalitiesList = await this.fetchJSON<any[]>('/municipalities');
      municipalitiesList.forEach((m: any) => {
        const ibgeCode = m.ibge_code?.toString() || '';
        if (ibgeCode) {
          biogasDataByCode[ibgeCode] = m;
        }
      });
      logger.info(`📊 Loaded biogas data for ${Object.keys(biogasDataByCode).length} municipalities from backend API`);
    } catch (error) {
      logger.warn(`Failed to load biogas data from backend API: ${error}`);
    }

    // Merge IBGE geometries with biogas data
    const enrichedFeatures = ibgeData.features.map((feature: any) => {
      const ibgeCode = feature.properties?.codarea || feature.properties?.CD_MUN || '';
      const biogasData = biogasDataByCode[ibgeCode];

      const properties = {
        id: ibgeCode,
        name: feature.properties?.name || feature.properties?.NM_MUN || 'Unknown',
        ibge_code: ibgeCode,
        area_km2: biogasData?.area_km2 || 0,
        population: biogasData?.population || 0,
        population_density: biogasData?.population_density || 0,
        population_year: biogasData?.population_year,
        area_year: biogasData?.area_year,
        gdp_total: biogasData?.gdp_total || 0,
        gdp_per_capita: biogasData?.gdp_per_capita || 0,
        gdp_year: biogasData?.gdp_year,
        immediate_region: biogasData?.immediate_region || '',
        intermediate_region: biogasData?.intermediate_region || '',
        immediate_region_code: biogasData?.immediate_region_code || '',
        intermediate_region_code: biogasData?.intermediate_region_code || '',
        total_biogas_m3_year: biogasData?.total_biogas_m3_year || 0,
        agricultural_biogas_m3_year: biogasData?.agricultural_biogas_m3_year || 0,
        livestock_biogas_m3_year: biogasData?.livestock_biogas_m3_year || 0,
        urban_biogas_m3_year: biogasData?.urban_biogas_m3_year || 0,
        sugarcane_biogas_m3_year: biogasData?.sugarcane_biogas_m3_year || 0,
        soybean_biogas_m3_year: biogasData?.soybean_biogas_m3_year || 0,
        corn_biogas_m3_year: biogasData?.corn_biogas_m3_year || 0,
        coffee_biogas_m3_year: biogasData?.coffee_biogas_m3_year || 0,
        citrus_biogas_m3_year: biogasData?.citrus_biogas_m3_year || 0,
        cattle_biogas_m3_year: biogasData?.cattle_biogas_m3_year || 0,
        swine_biogas_m3_year: biogasData?.swine_biogas_m3_year || 0,
        poultry_biogas_m3_year: biogasData?.poultry_biogas_m3_year || 0,
        aquaculture_biogas_m3_year: biogasData?.aquaculture_biogas_m3_year || 0,
        forestry_biogas_m3_year: 0,
        rsu_biogas_m3_year: biogasData?.rsu_biogas_m3_year || 0,
        rpo_biogas_m3_year: biogasData?.rpo_biogas_m3_year || 0,
        sugarcane_residues_tons_year: 0,
        soybean_residues_tons_year: 0,
        corn_residues_tons_year: 0,
        potential_category: this.getPotentialCategory(biogasData?.total_biogas_m3_year || 0),
      };

      return {
        type: 'Feature' as const,
        geometry: feature.geometry,
        properties,
      };
    });

    logger.info(`✅ Merged IBGE geometries with biogas data: ${enrichedFeatures.length} municipalities`);

    return {
      type: 'FeatureCollection',
      features: enrichedFeatures,
      metadata: {
        total_municipalities: enrichedFeatures.length,
        source: 'IBGE API + Local DB',
        note: `${enrichedFeatures.length} municípios de São Paulo com geometrias do IBGE e dados de biogás do banco local`,
      },
    };
  }

  /**
   * Get potential category based on biogas value
   */
  private getPotentialCategory(totalBiogas: number): string {
    if (totalBiogas > 100000000) return 'ALTO';
    if (totalBiogas > 10000000) return 'MEDIO';
    if (totalBiogas > 0) return 'BAIXO';
    return 'SEM DADOS';
  }

  /**
   * Get municipality list (non-GeoJSON)
   */
  async getMunicipalitiesList() {
    return this.fetchJSON('/municipalities');
  }

  /**
   * Get detailed municipality data by ID
   */
  async getMunicipalityDetail(municipalityId: string): Promise<MunicipalityFeature> {
    return this.fetchJSON<MunicipalityFeature>(`/municipalities/${municipalityId}`);
  }

  /**
   * Get summary statistics
   */
  async getSummaryStatistics(): Promise<SummaryStatistics> {
    return this.fetchJSON<SummaryStatistics>('/statistics/summary');
  }

  /**
   * Get rankings by criteria
   */
  async getRankings(
    criteria: 'total' | 'agricultural' | 'livestock' | 'urban' = 'total',
    limit: number = 10
  ): Promise<RankingsResponse> {
    return this.fetchJSON<RankingsResponse>(
      `/rankings?criteria=${criteria}&limit=${limit}`
    );
  }

  /**
   * Get co-digestion opportunity clusters based on spatial proximity + C:N compatibility.
   */
  async getCodigestionClusters(params: {
    radius_km?: number;
    min_biomass_tons?: number;
    max_clusters?: number;
  } = {}): Promise<CodigestionClustersResponse> {
    const qs = new URLSearchParams({
      radius_km: String(params.radius_km ?? 30),
      min_biomass_tons: String(params.min_biomass_tons ?? 1000),
      max_clusters: String(params.max_clusters ?? 20),
    });
    const url = `${this.baseUrl}/api/v1/codigestion/clusters?${qs}`;
    const response = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
    if (!response.ok) throw new Error(`Cluster API error: ${response.status}`);
    return response.json();
  }

  /**
   * Get C:N ratios for all 11 residue types. Used to populate filter panel badges.
   */
  async getResidueCNMatrix(): Promise<ResidueCNMatrix> {
    const url = `${this.baseUrl}/api/v1/codigestion/residue-cn-matrix`;
    const response = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
    if (!response.ok) throw new Error(`C:N matrix API error: ${response.status}`);
    return response.json();
  }

  /**
   * Health check
   */
  async healthCheck() {
    return this.fetchJSON('/health');
  }
}

// Export singleton instance
export const geospatialClient = new GeospatialClient();

// Export class for testing
export default GeospatialClient;

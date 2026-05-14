/**
 * Analysis API service for PILAR-2b V3
 * Handles all API calls related to biogas analysis
 */

import { authenticatedFetch } from '@/lib/apiClient';
import { logger } from '@/lib/logger';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

// Types
export type ApiCategory = 'agricultural' | 'livestock' | 'urban' | 'industrial';
export type ResidueCategory = ApiCategory;
export interface Municipality {
  id: number;
  municipality_name: string;
  ibge_code: string;
  administrative_region: string;
  population: number;
  area_km2: number;
  biogas_m3_year: number;
  residue_tons_yr?: number;
}

export interface ByResidueResponse {
  data: Municipality[];
  total: number;
  category: string;
  residue_types: string[];
  columns_used: string[];
}

export interface CategoryStats {
  total: number;
  average: number;
  min: number;
  max: number;
  count: number;
}

export interface StatisticsByCategoryResponse {
  categories: {
    agricultural?: CategoryStats;
    livestock?: CategoryStats;
    urban?: CategoryStats;
    industrial?: CategoryStats;
    total: CategoryStats;
    [key: string]: CategoryStats | undefined;
  };
  total_municipalities: number;
}

export interface RegionData {
  region: string;
  biogas_m3_year: number;
  percentage: number;
}

export interface StatisticsByRegionResponse {
  regions: RegionData[];
  total: number;
  category: string;
}

export interface HistogramBin {
  bin_start: number;
  bin_end: number;
  count: number;
  label: string;
}

export interface DistributionStatistics {
  count: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  std: number;
}

export interface DistributionResponse {
  histogram: HistogramBin[];
  statistics: DistributionStatistics;
  category: string;
}

export interface ResidueType {
  key: string;
  label: string;
  column: string;
}

export interface CategoryConfig {
  label: string;
  icon: string;
  residues: ResidueType[];
}

export interface ResidueConfigResponse {
  categories: {
    agricultural: CategoryConfig;
    livestock: CategoryConfig;
    urban: CategoryConfig;
  };
}

export interface StreamStatisticsResponse {
  total: number;
  streams: Record<string, number>;
  stream_tons: Record<string, number>;
  residue_codes: string[];
  note?: string;
}

// API Functions

/**
 * Get analysis data by residue category
 */
export async function getAnalysisByResidue(
  category: 'agricultural' | 'livestock' | 'urban' | 'industrial',
  options?: {
    residueTypes?: string[];
    limit?: number;
    minValue?: number;
  }
): Promise<ByResidueResponse> {
  const params = new URLSearchParams();
  params.append('category', category);

  // Only add residue_types if array is non-empty and contains valid values
  if (options?.residueTypes && options.residueTypes.length > 0) {
    const validResidueTypes = options.residueTypes.filter(rt => rt && rt.trim() !== '');
    if (validResidueTypes.length > 0) {
      validResidueTypes.forEach(rt => params.append('residue_types', rt));
    }
  }
  if (options?.limit) {
    params.append('limit', options.limit.toString());
  }
  if (options?.minValue) {
    params.append('min_value', options.minValue.toString());
  }

  const url = `${API_BASE_URL}/api/v1/analysis/by-residue?${params}`;
  logger.debug('Fetching analysis by residue:', url);

  const response = await authenticatedFetch(url);

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    logger.error('API Error:', response.status, errorText);
    throw new Error(`Failed to fetch residue analysis: ${response.status} ${errorText}`);
  }

  return response.json();
}

/**
 * Get statistics by category
 */
export async function getStatisticsByCategory(): Promise<StatisticsByCategoryResponse> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/v1/analysis/statistics/by-category`);

  if (!response.ok) {
    throw new Error(`Failed to fetch category statistics: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get statistics by region
 */
export async function getStatisticsByRegion(
  category?: ApiCategory
): Promise<StatisticsByRegionResponse> {
  const params = new URLSearchParams();
  if (category) {
    params.append('category', category);
  }

  const response = await authenticatedFetch(`${API_BASE_URL}/api/v1/analysis/statistics/by-region?${params}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch regional statistics: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get distribution data for histogram
 */
export async function getDistribution(
  category?: ApiCategory,
  bins?: number
): Promise<DistributionResponse> {
  const params = new URLSearchParams();
  if (category) {
    params.append('category', category);
  }
  if (bins) {
    params.append('bins', bins.toString());
  }

  const response = await authenticatedFetch(`${API_BASE_URL}/api/v1/analysis/distribution?${params}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch distribution: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get total biogas potential for a set of frontend residue codes from residue_streams_sp2023.
 * Returns a scalar total instead of waiting for the full municipality list.
 */
export async function getStatisticsByStream(
  residueCodes: string[]
): Promise<StreamStatisticsResponse> {
  const params = new URLSearchParams();
  residueCodes.forEach(c => params.append('residue_codes', c));
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/v1/analysis/statistics/by-stream?${params}`
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch stream statistics: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get residue configuration
 */
export async function getResidueConfig(): Promise<ResidueConfigResponse> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/v1/analysis/residue-config`);

  if (!response.ok) {
    throw new Error(`Failed to fetch residue config: ${response.statusText}`);
  }

  return response.json();
}

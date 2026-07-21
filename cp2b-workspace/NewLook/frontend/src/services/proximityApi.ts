import { DATA_EXPORT_ENABLED, DATA_EXPORT_DISABLED_REASON } from '@/lib/featureFlags';
/**
 * Proximity Analysis API service for PILAR-2b V3
 * Handles spatial analysis with MapBiomas integration
 * Sprint 4: Added retry logic, timeout handling, and better error messages
 * Enhanced: Added frontend caching and request queue integration
 */

import { retryOperation, measurePerformance } from '@/lib/performance';
import { logger } from '@/lib/logger';
import { getFromCache, setInCache, generateCacheKey, CACHE_DURATION } from '@/lib/apiCache';
import { fetchWithQueue } from '@/lib/apiQueue';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';
const REQUEST_TIMEOUT = 120000; // 120 seconds - increased for debugging

// Types matching backend Pydantic models

export interface ProximityAnalysisRequest {
  latitude: number;
  longitude: number;
  radius_km: number;
  infrastructure_types?: string[];
}

export interface LandUseData {
  class_name: string;
  percentage: number;
  area_km2: number;
  color: string;
}

export interface MunicipalityData {
  name: string;
  ibge_code: string;
  distance_km: number;
  biogas_m3_year: number;
  population: number;
}

export interface InfrastructureItem {
  type: string;
  name: string | null;
  distance_km: number;
  found: boolean;
  note?: string;
  properties?: Record<string, any>;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface BiogasBreakdown {
  agricultural: number;
  livestock: number;
  urban: number;
  total: number;
}

export interface ProximityAnalysisResponse {
  analysis_point: {
    latitude: number;
    longitude: number;
  };
  radius_km: number;
  land_use: {
    total_area_km2: number;
    by_class: Record<string, {
      class_id: number;
      name: string;
      color: string;
      category: string;
      pixel_count: number;
      area_km2: number;
      percent: number;
    }>;
    dominant_class: string;
    agricultural_percent: number;
    total_pixels?: number;
    pixel_resolution_m?: number;
    error?: string;
    // Legacy support
    agricultural_percentage?: number;
    breakdown?: LandUseData[];
  };
  municipalities: MunicipalityData[];
  biogas_potential: BiogasBreakdown;
  infrastructure: InfrastructureItem[];
  summary: {
    total_municipalities: number;
    total_population: number;
    avg_distance_km: number;
    total_biogas_m3_year: number;
  };
  processing_time_seconds: number;
}

export interface RadiusRecommendation {
  radius_km: number;
  category: 'optimal' | 'good' | 'acceptable' | 'cautionary';
  color: string;
  description: string;
  typical_use_case: string;
}

export interface InfrastructureType {
  key: string;
  label: string;
  icon: string;
  description: string;
}

/**
 * Perform proximity analysis for a given point and radius
 * Sprint 4: Added timeout, retry logic, and performance measurement
 * Enhanced: Added frontend caching to reduce API calls
 */
export async function analyzeProximity(
  request: ProximityAnalysisRequest
): Promise<ProximityAnalysisResponse> {
  // Check frontend cache first
  const cacheKey = generateCacheKey('proximity-analysis', {
    lat: request.latitude.toFixed(4),
    lng: request.longitude.toFixed(4),
    radius: request.radius_km.toString(),
  });

  const cached = getFromCache<ProximityAnalysisResponse>(cacheKey);
  if (cached) {
    logger.info('🚀 Frontend cache hit - instant response');
    return cached;
  }

  return measurePerformance('Proximity Analysis', async () => {
    return retryOperation(async () => {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      try {
        // Log request for debugging
        logger.info('📍 Proximity Analysis Request:', {
          latitude: request.latitude,
          longitude: request.longitude,
          radius_km: request.radius_km,
        });

        const response = await fetch(`${API_BASE_URL}/api/v1/proximity/analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          // Handle rate limiting (429)
          if (response.status === 429) {
            const data = await response.json().catch(() => ({ retry_after: 60 }));
            const error = new Error(
              `❌ Taxa de requisições excedida\n💡 Aguarde ${data.retry_after || 60} segundos e tente novamente.`
            ) as any;
            error.status = 429;
            throw error;
          }

          // Handle other errors
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.detail || `Erro na análise: ${response.statusText}`
          );
        }

        const result = await response.json();

        // Log full response for debugging
        logger.info('✅ API Response received:', {
          municipalities: result.results?.municipalities?.length || 0,
          totalBiogas: result.summary?.total_biogas_m3_year || 0,
          processingTime: result.metadata?.processing_time_ms || 0,
          hasLandUse: !!result.results?.land_use,
          hasBiogasPotential: !!result.results?.biogas_potential,
        });
        
        // Log the full result structure for debugging
        logger.debug('Full API result structure:', JSON.stringify(result, null, 2));

        // Log cache hits from backend
        if (result.from_cache) {
          logger.info('✅ Backend cache hit (resposta instantânea)');
        }

        // Store in frontend cache
        setInCache(cacheKey, result, CACHE_DURATION.analysis);

        return result;
      } catch (error: any) {
        clearTimeout(timeoutId);

        // Handle timeout
        if (error.name === 'AbortError') {
          throw new Error(
            '❌ Tempo limite excedido\n💡 A análise está demorando muito. Tente novamente com um raio menor.'
          );
        }

        // Handle network errors
        if (error.message && error.message.includes('fetch')) {
          throw new Error(
            '❌ Erro de conexão\n💡 Verifique sua conexão com a internet e tente novamente.'
          );
        }

        // Log error details
        logger.error('❌ Proximity analysis failed:', error);

        throw error;
      }
    }, 2, 1000); // Max 2 retries, 1 second initial delay
  });
}

/**
 * Get radius recommendations based on CP2B methodology
 */
export async function getRadiusRecommendations(): Promise<RadiusRecommendation[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/proximity/radius-recommendations`);

  if (!response.ok) {
    throw new Error(`Failed to fetch recommendations: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Validate if a point is within valid bounds
 */
export async function validatePoint(
  latitude: number,
  longitude: number
): Promise<{ valid: boolean; message: string }> {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
  });

  const response = await fetch(
    `${API_BASE_URL}/api/v1/proximity/validate-point?${params}`
  );

  if (!response.ok) {
    throw new Error(`Failed to validate point: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get available infrastructure types
 */
export async function getInfrastructureTypes(): Promise<InfrastructureType[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/proximity/infrastructure-types`);

  if (!response.ok) {
    throw new Error(`Failed to fetch infrastructure types: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Export analysis results as CSV
 */
export function exportAnalysisToCSV(analysis: ProximityAnalysisResponse): void {
  const timestamp = new Date().toISOString().split('T')[0];
  
  // Create municipalities CSV
  const municipalitiesCSV = [
    ['Município', 'Código IBGE', 'Distância (km)', 'Biogás (m³/ano)', 'População'],
    ...analysis.municipalities.map(m => [
      m.name,
      m.ibge_code,
      m.distance_km.toFixed(2),
      m.biogas_m3_year.toFixed(2),
      m.population.toString()
    ])
  ].map(row => row.join(',')).join('\n');

  // Create land use CSV
  const landUseCSV = [
    ['Classe de Uso', 'Porcentagem (%)', 'Área (km²)'],
    ...(analysis.land_use.breakdown || []).map(lu => [
      lu.class_name,
      lu.percentage.toFixed(2),
      lu.area_km2.toFixed(2)
    ])
  ].map(row => row.join(',')).join('\n');

  // Create infrastructure CSV
  const infrastructureCSV = [
    ['Tipo', 'Nome', 'Distância (km)', 'Latitude', 'Longitude'],
    ...analysis.infrastructure.map(inf => [
      inf.type,
      inf.name || '',
      inf.distance_km.toFixed(2),
      inf.coordinates?.latitude?.toFixed(6) || '',
      inf.coordinates?.longitude?.toFixed(6) || ''
    ])
  ].map(row => row.join(',')).join('\n');

  // Create summary CSV
  const summaryCSV = [
    ['Métrica', 'Valor'],
    ['Ponto de Análise (Lat)', analysis.analysis_point.latitude.toFixed(6)],
    ['Ponto de Análise (Lng)', analysis.analysis_point.longitude.toFixed(6)],
    ['Raio (km)', analysis.radius_km.toString()],
    ['Total de Municípios', analysis.summary.total_municipalities.toString()],
    ['População Total', analysis.summary.total_population.toString()],
    ['Distância Média (km)', analysis.summary.avg_distance_km.toFixed(2)],
    ['Potencial Total de Biogás (m³/ano)', analysis.summary.total_biogas_m3_year.toFixed(2)],
    ['Potencial Agrícola (m³/ano)', analysis.biogas_potential.agricultural.toFixed(2)],
    ['Potencial Pecuário (m³/ano)', analysis.biogas_potential.livestock.toFixed(2)],
    ['Potencial Urbano (m³/ano)', analysis.biogas_potential.urban.toFixed(2)],
    ['Uso Agrícola do Solo (%)', (analysis.land_use.agricultural_percent || 0).toFixed(2)],
    ['Tempo de Processamento (s)', analysis.processing_time_seconds.toFixed(2)]
  ].map(row => row.join(',')).join('\n');

  // Download all CSVs as separate files
  downloadCSV(summaryCSV, `proximity_summary_${timestamp}.csv`);
  downloadCSV(municipalitiesCSV, `proximity_municipalities_${timestamp}.csv`);
  downloadCSV(landUseCSV, `proximity_land_use_${timestamp}.csv`);
  downloadCSV(infrastructureCSV, `proximity_infrastructure_${timestamp}.csv`);
}

/**
 * Helper function to trigger CSV download
 */
function downloadCSV(content: string, filename: string): void {
  // Beta: no dataset leaves the browser. Gated at the primitive so every caller
  // is covered, including any added later. See lib/featureFlags.
  if (!DATA_EXPORT_ENABLED) {
    console.warn(DATA_EXPORT_DISABLED_REASON);
    return;
  }
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

/**
 * Generate shareable URL with analysis parameters
 */
export function generateShareURL(
  latitude: number,
  longitude: number,
  radiusKm: number
): string {
  const params = new URLSearchParams({
    lat: latitude.toFixed(6),
    lng: longitude.toFixed(6),
    radius: radiusKm.toString()
  });

  return `${window.location.origin}/dashboard/proximity?${params.toString()}`;
}

/**
 * Parse URL parameters for shared analysis
 */
export function parseShareURL(): {
  latitude: number | null;
  longitude: number | null;
  radiusKm: number | null;
} {
  if (typeof window === 'undefined') {
    return { latitude: null, longitude: null, radiusKm: null };
  }

  const params = new URLSearchParams(window.location.search);
  
  const lat = params.get('lat');
  const lng = params.get('lng');
  const radius = params.get('radius');

  return {
    latitude: lat ? parseFloat(lat) : null,
    longitude: lng ? parseFloat(lng) : null,
    radiusKm: radius ? parseInt(radius, 10) : null
  };
}


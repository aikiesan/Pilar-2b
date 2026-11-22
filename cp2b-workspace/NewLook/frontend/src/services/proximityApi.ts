/**
 * Proximity Analysis API service for PILAR-2b V3
 * Handles spatial analysis with MapBiomas integration: retry, timeout, frontend
 * caching and the request queue.
 *
 * No user-facing text here: failures are thrown as ProximityError with a code,
 * and the Land around tool on the map words them (Map.landAround.errors).
 */

import { retryOperation, measurePerformance } from '@/lib/performance';
import { logger } from '@/lib/logger';
import { getFromCache, setInCache, generateCacheKey, CACHE_DURATION } from '@/lib/apiCache';
import type { Locale } from '@/config/i18n';
import { withBasePath } from '@/lib/basePath';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';
const REQUEST_TIMEOUT = 120000; // 120 seconds

export interface ProximityAnalysisRequest {
  latitude: number;
  longitude: number;
  radius_km: number;
  /** What to compute; the backend turns each part on when this is left out. */
  options?: {
    include_mapbiomas?: boolean;
    include_biogas_potential?: boolean;
    include_infrastructure?: boolean;
  };
}

/** One MapBiomas class inside the buffer, keyed by its class id. */
export interface LandUseClass {
  class_id: number;
  /** Portuguese class name as served; display names come from the catalog by class_id. */
  name: string;
  color: string;
  /** agricultural | forestry | forest | water | grassland | urban | other | nodata | unknown */
  category: string;
  pixel_count: number;
  area_km2: number;
  percent: number;
}

export interface ProximityMunicipality {
  name: string;
  ibge_code?: string;
  distance_km?: number;
  biogas_m3_year?: number;
  population?: number;
  [key: string]: unknown;
}

export interface ProximityInfrastructure {
  type: string;
  name: string | null;
  /** Null when the layer is not loaded on the server. */
  distance_km: number | null;
  found?: boolean;
  /** The search radius for this type; nothing farther counts as found. */
  max_distance_km?: number;
  /** The feature's point nearest the analysis point; only when found. */
  coordinates?: { latitude: number; longitude: number };
  [key: string]: unknown;
}

/** The types the analysis measures, in the order the backend sends them. */
export const INFRASTRUCTURE_TYPES = ['gas_pipeline', 'substation', 'railway', 'transmission_line', 'ete'] as const;
export type InfrastructureType = (typeof INFRASTRUCTURE_TYPES)[number];

export function isInfrastructureType(type: string): type is InfrastructureType {
  return (INFRASTRUCTURE_TYPES as readonly string[]).includes(type);
}

/** One colour per type, on the results list and on the map; pipelines and roads as on the main map. */
export const INFRASTRUCTURE_COLORS: Record<InfrastructureType, string> = {
  gas_pipeline: '#FF6B35',
  substation: '#7C3AED',
  railway: '#8B4513',
  transmission_line: '#B8860B',
  ete: '#0284C7',
};

/** The /proximity/analyze response, as the backend sends it. */
export interface ProximityAnalysisResult {
  analysis_id: string;
  request: { latitude: number; longitude: number; radius_km: number };
  results: {
    buffer_geometry: unknown;
    municipalities: ProximityMunicipality[];
    biogas_potential?: {
      total_m3_year: number;
      by_category: Record<string, number>;
      energy_potential_mwh_year: number;
      co2_reduction_tons_year: number;
      homes_powered_equivalent: number;
    };
    land_use?: {
      total_area_km2: number;
      by_class: Record<string, LandUseClass>;
      dominant_class: string;
      /** Present on newer backends; otherwise derive it with dominantLandUseClass(). */
      dominant_class_id?: number;
      agricultural_percent: number;
    };
    infrastructure?: ProximityInfrastructure[];
  };
  summary: {
    total_area_km2: number;
    total_municipalities: number;
    total_population: number;
    total_biogas_m3_year: number;
    energy_potential_mwh_year: number;
    radius_recommendation: string;
  };
  metadata: {
    analysis_timestamp: string;
    processing_time_ms: number;
  };
  from_cache?: boolean;
}

export type ProximityErrorCode =
  | 'rate_limited'
  | 'timeout'
  | 'network'
  | 'invalid_coordinates'
  | 'invalid_radius'
  | 'server';

/** A failed analysis. `code` selects the message; `retryAfter` is in seconds. */
export class ProximityError extends Error {
  constructor(
    readonly code: ProximityErrorCode,
    readonly retryAfter?: number,
    readonly status?: number
  ) {
    super(`proximity analysis failed: ${code}${status ? ` (HTTP ${status})` : ''}`);
    this.name = 'ProximityError';
  }
}

/** Backend validation codes (ValidationService) → our error codes. */
const VALIDATION_CODES: Record<string, ProximityErrorCode> = {
  INVALID_COORDINATES: 'invalid_coordinates',
  INVALID_RADIUS: 'invalid_radius',
};

/** The error code for a FastAPI 422, from the request fields it names. */
function requestFieldError(detail: unknown): ProximityErrorCode | null {
  if (!Array.isArray(detail)) return null;
  const fields = detail.flatMap((d) => (Array.isArray(d?.loc) ? d.loc : []));
  if (fields.includes('latitude') || fields.includes('longitude')) return 'invalid_coordinates';
  if (fields.includes('radius_km')) return 'invalid_radius';
  return null;
}

/** The class covering the most of the buffer, when the backend did not name its id. */
export function dominantLandUseClass(byClass: Record<string, LandUseClass>): LandUseClass | null {
  let best: LandUseClass | null = null;
  for (const entry of Object.values(byClass)) {
    if (!best || entry.pixel_count > best.pixel_count) best = entry;
  }
  return best;
}

/**
 * Perform proximity analysis for a given point and radius, with timeout,
 * retries and a frontend cache.
 */
export async function analyzeProximity(
  request: ProximityAnalysisRequest
): Promise<ProximityAnalysisResult> {
  const cacheKey = generateCacheKey('proximity-analysis', {
    lat: request.latitude.toFixed(4),
    lng: request.longitude.toFixed(4),
    radius: request.radius_km.toString(),
  });

  const cached = getFromCache<ProximityAnalysisResult>(cacheKey);
  if (cached) {
    logger.info('🚀 Frontend cache hit - instant response');
    return cached;
  }

  return measurePerformance('Proximity Analysis', async () => {
    return retryOperation(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      try {
        logger.info('📍 Proximity Analysis Request:', {
          latitude: request.latitude,
          longitude: request.longitude,
          radius_km: request.radius_km,
        });

        const response = await fetch(`${API_BASE_URL}/api/v1/proximity/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          if (response.status === 429) {
            throw new ProximityError('rate_limited', Number(data.retry_after) || 60, 429);
          }
          // 400s carry { detail: { error, code, suggestion } }; the error text is
          // the backend's own (Portuguese), so only the code is used. A point or
          // radius outside the request model's bounds fails earlier, in FastAPI's
          // own validation: a 422 whose detail lists the fields at fault.
          const code = VALIDATION_CODES[data?.detail?.code] ?? requestFieldError(data?.detail) ?? 'server';
          logger.warn('Proximity analysis rejected:', response.status, data?.detail);
          throw new ProximityError(code, undefined, response.status);
        }

        const result: ProximityAnalysisResult = await response.json();

        logger.info('✅ API Response received:', {
          municipalities: result.results?.municipalities?.length || 0,
          totalBiogas: result.summary?.total_biogas_m3_year || 0,
          processingTime: result.metadata?.processing_time_ms || 0,
          hasLandUse: !!result.results?.land_use,
          hasBiogasPotential: !!result.results?.biogas_potential,
        });
        if (result.from_cache) logger.info('✅ Backend cache hit');

        setInCache(cacheKey, result, CACHE_DURATION.analysis);
        return result;
      } catch (error: unknown) {
        clearTimeout(timeoutId);
        if (error instanceof ProximityError) throw error;
        if (error instanceof Error && error.name === 'AbortError') throw new ProximityError('timeout');
        if (error instanceof TypeError) throw new ProximityError('network'); // fetch() network failure
        logger.error('❌ Proximity analysis failed:', error);
        throw error;
      }
    }, 2, 1000, isRetryable); // Max 2 retries, 1 second initial delay
  });
}

/**
 * Only transient failures are retried: a dropped connection or a server error.
 * A rejected point or radius will be rejected again, a rate limit is made worse
 * by hammering, and a 2-minute timeout should not become a 6-minute wait.
 */
function isRetryable(error: unknown): boolean {
  if (!(error instanceof ProximityError)) return true;
  return error.code === 'network' || (error.code === 'server' && (error.status ?? 500) >= 500);
}

/**
 * Shareable link to the Land around tool on the map, open at this point, in the
 * sharer's language (a link without the locale prefix would open in Portuguese
 * for everyone).
 */
export function generateShareURL(
  latitude: number,
  longitude: number,
  radiusKm: number,
  locale: Locale
): string {
  const params = new URLSearchParams({
    tool: 'land',
    lat: latitude.toFixed(4),
    lng: longitude.toFixed(4),
    radius: radiusKm.toString(),
  });

  // Built by hand, so the base path (/pilar2b in production) is added here.
  return `${window.location.origin}${withBasePath(`/${locale}/map`)}?${params.toString()}`;
}

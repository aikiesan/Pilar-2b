import { DATA_EXPORT_ENABLED, DATA_EXPORT_DISABLED_REASON } from '@/lib/featureFlags';
/**
 * Proximity Analysis API service for PILAR-2b V3
 * Handles spatial analysis with MapBiomas integration: retry, timeout, frontend
 * caching and the request queue.
 *
 * No user-facing text here: failures are thrown as ProximityError with a code,
 * and the page words them (pages.proximity.errors). CSV headers are passed in by
 * the caller, in the page's language.
 */

import { retryOperation, measurePerformance } from '@/lib/performance';
import { logger } from '@/lib/logger';
import { getFromCache, setInCache, generateCacheKey, CACHE_DURATION } from '@/lib/apiCache';
import type { Locale } from '@/config/i18n';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';
const REQUEST_TIMEOUT = 120000; // 120 seconds

export interface ProximityAnalysisRequest {
  latitude: number;
  longitude: number;
  radius_km: number;
  infrastructure_types?: string[];
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
  distance_km: number;
  coordinates?: { latitude: number; longitude: number };
  [key: string]: unknown;
}

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
          // the backend's own (Portuguese), so only the code is used.
          const code = VALIDATION_CODES[data?.detail?.code] ?? 'server';
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

/** Column and row headings for the CSV export, in the page's language. */
export interface ProximityCsvHeaders {
  municipalities: [name: string, ibge: string, distance: string, biogas: string, population: string];
  landUse: [className: string, percent: string, area: string];
  infrastructure: [type: string, name: string, distance: string, latitude: string, longitude: string];
  summary: {
    metric: string;
    value: string;
    latitude: string;
    longitude: string;
    radius: string;
    municipalities: string;
    population: string;
    avgDistance: string;
    totalBiogas: string;
    agricultural: string;
    livestock: string;
    urban: string;
    agriculturalLand: string;
    processingTime: string;
  };
  /** Display name of a land-use class, by its MapBiomas id. */
  landUseClass: (entry: LandUseClass) => string;
}

/** Quotes a CSV field when it holds a comma, quote or line break. */
function csvField(value: string | number): string {
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const csv = (rows: (string | number)[][]) => rows.map((row) => row.map(csvField).join(',')).join('\n');

/**
 * Export analysis results as four CSV files. Numbers use a dot decimal
 * separator, as data files should, whatever the page language.
 */
export function exportAnalysisToCSV(result: ProximityAnalysisResult, headers: ProximityCsvHeaders): void {
  const timestamp = new Date().toISOString().split('T')[0];
  const { municipalities } = result.results;
  const landUse = Object.values(result.results.land_use?.by_class ?? {});
  const infrastructure = result.results.infrastructure ?? [];
  const byCategory = result.results.biogas_potential?.by_category ?? {};
  const distances = municipalities.map((m) => Number(m.distance_km) || 0);
  const avgDistance = distances.length ? distances.reduce((a, b) => a + b, 0) / distances.length : 0;
  const fixed = (value: unknown, digits = 2) => (Number(value) || 0).toFixed(digits);

  const municipalitiesCSV = csv([
    headers.municipalities,
    ...municipalities.map((m) => [
      m.name,
      m.ibge_code ?? '',
      fixed(m.distance_km),
      fixed(m.biogas_m3_year),
      String(Number(m.population) || 0),
    ]),
  ]);

  const landUseCSV = csv([
    headers.landUse,
    ...landUse.map((entry) => [headers.landUseClass(entry), fixed(entry.percent), fixed(entry.area_km2)]),
  ]);

  const infrastructureCSV = csv([
    headers.infrastructure,
    ...infrastructure.map((inf) => [
      inf.type,
      inf.name ?? '',
      fixed(inf.distance_km),
      inf.coordinates ? inf.coordinates.latitude.toFixed(6) : '',
      inf.coordinates ? inf.coordinates.longitude.toFixed(6) : '',
    ]),
  ]);

  const s = headers.summary;
  const summaryCSV = csv([
    [s.metric, s.value],
    [s.latitude, result.request.latitude.toFixed(6)],
    [s.longitude, result.request.longitude.toFixed(6)],
    [s.radius, String(result.request.radius_km)],
    [s.municipalities, String(result.summary.total_municipalities)],
    [s.population, String(result.summary.total_population)],
    [s.avgDistance, avgDistance.toFixed(2)],
    [s.totalBiogas, fixed(result.summary.total_biogas_m3_year)],
    [s.agricultural, fixed(byCategory.agricultural)],
    [s.livestock, fixed(byCategory.livestock)],
    [s.urban, fixed(byCategory.urban)],
    [s.agriculturalLand, fixed(result.results.land_use?.agricultural_percent)],
    [s.processingTime, (result.metadata.processing_time_ms / 1000).toFixed(2)],
  ]);

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
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

/**
 * Shareable URL for an analysis, in the sharer's language (a link without the
 * locale prefix would open in Portuguese for everyone).
 */
export function generateShareURL(
  latitude: number,
  longitude: number,
  radiusKm: number,
  locale: Locale
): string {
  const params = new URLSearchParams({
    lat: latitude.toFixed(6),
    lng: longitude.toFixed(6),
    radius: radiusKm.toString(),
  });

  return `${window.location.origin}/${locale}/dashboard/proximity?${params.toString()}`;
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
    radiusKm: radius ? parseInt(radius, 10) : null,
  };
}

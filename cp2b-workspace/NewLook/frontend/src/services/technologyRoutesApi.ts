/**
 * PILAR-2b V3 - Technology Routes API Service
 * Educational tool for visualizing biogas technology pathways
 * Calculation-free, reference-based learning platform
 *
 * Performance Optimizations:
 * - In-memory caching with TTL
 * - Request deduplication
 * - Optimized error handling
 */

import { logger } from '@/lib/logger';
import type {
  TechnologyCardWithReferences,
  TechnologyCard,
  UserRoute,
  CreateRoutePayload,
  UpdateRoutePayload,
  ConnectionValidationResponse,
} from '@/types/technology-routes';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

// ============================================================================
// CACHING LAYER
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class ApiCache {
  private cache = new Map<string, CacheEntry<any>>();
  private pendingRequests = new Map<string, Promise<any>>();

  /**
   * Get data from cache if valid, otherwise return null
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Store data in cache with TTL (time-to-live in milliseconds)
   */
  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Clear cache entry
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get pending request or set new one (request deduplication)
   */
  getPendingRequest<T>(key: string): Promise<T> | null {
    return this.pendingRequests.get(key) || null;
  }

  /**
   * Set pending request
   */
  setPendingRequest<T>(key: string, promise: Promise<T>): void {
    this.pendingRequests.set(key, promise);
    // Clean up after promise resolves/rejects
    promise.finally(() => {
      this.pendingRequests.delete(key);
    });
  }
}

const apiCache = new ApiCache();

/**
 * Helper function to get auth headers from Supabase session
 */
async function getAuthHeaders(): Promise<HeadersInit> {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: { session } } = await supabase.auth.getSession();

    if (session?.access_token) {
      return {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };
    }
  } catch (error) {
    logger.error('Failed to get auth headers:', error);
  }

  return {
    'Content-Type': 'application/json',
  };
}

/**
 * Helper function for API calls with error handling
 */
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  logger.debug(`[TechRoutes API] Calling: ${url}`);

  const headers = await getAuthHeaders();

  // Create abort controller for timeout (better browser compatibility)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    logger.warn(`[TechRoutes API] Request timeout for ${endpoint}`);
    controller.abort();
  }, 15000); // Reduced to 15 seconds for better UX

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    logger.debug(`[TechRoutes API] Response status: ${response.status}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.detail || `API error: ${response.status}`;
      logger.error(`[TechRoutes API] Error response:`, errorData);
      throw new Error(errorMsg);
    }

    const data = await response.json();
    logger.debug(`[TechRoutes API] Success:`, data.length || 'N/A', 'items received');
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    logger.error(`[TechRoutes API] Call failed for ${endpoint}:`, error);

    if (error instanceof Error) {
      logger.error(`[TechRoutes API] Error details:`, {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });

      // Better error messages for common failures
      if (error.name === 'AbortError') {
        throw new Error('A requisição demorou muito. Verifique sua conexão com a internet.');
      }
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão com a internet.');
      }
    }
    throw error;
  }
}

// ============================================================================
// TECHNOLOGY CARDS API
// ============================================================================

export const technologyRoutesApi = {
  /**
   * Get all technologies with their scientific references
   * Optionally filter by category
   * CACHED: 5 minutes TTL for faster subsequent loads
   */
  getTechnologies: async (category?: string): Promise<TechnologyCardWithReferences[]> => {
    const cacheKey = `technologies:${category || 'all'}`;

    // Check cache first
    const cached = apiCache.get<TechnologyCardWithReferences[]>(cacheKey);
    if (cached) {
      logger.debug(`[Cache HIT] ${cacheKey}`);
      return cached;
    }

    // Check if request is already pending (deduplication)
    const pending = apiCache.getPendingRequest<TechnologyCardWithReferences[]>(cacheKey);
    if (pending) {
      logger.debug(`[Request DEDUP] ${cacheKey}`);
      return pending;
    }

    // Make new request
    logger.debug(`[Cache MISS] ${cacheKey} - fetching from API`);
    const params = category ? `?category=${encodeURIComponent(category)}` : '';

    const requestPromise = (async () => {
      const data = await apiCall<any[]>(
        `/api/v1/technology-routes/technologies${params}`
      );

      // Transform snake_case API response to camelCase TypeScript interface
      const transformed = data.map(tech => ({
        id: tech.id,
        category: tech.category,
        namePt: tech.name_pt,
        nameEn: tech.name_en,
        emoji: tech.emoji,
        descriptionPt: tech.description_pt,
        descriptionEn: tech.description_en,
        color: tech.color,
        canConnectTo: tech.can_connect_to,
        canReceiveFrom: tech.can_receive_from,
        isCustom: tech.is_custom,
        createdBy: tech.created_by,
        createdAt: tech.created_at,
        updatedAt: tech.updated_at,
        references: tech.references.map((ref: any) => ({
          referenceId: ref.reference_id,
          title: ref.title,
          authors: ref.authors,
          year: ref.year,
          journal: ref.journal,
          doi: ref.doi,
          url: ref.url,
          relevanceNote: ref.relevance_note,
        })),
      }));

      // Cache for 5 minutes
      apiCache.set(cacheKey, transformed, 5 * 60 * 1000);

      return transformed;
    })();

    // Register as pending to prevent duplicate requests
    apiCache.setPendingRequest(cacheKey, requestPromise);

    return requestPromise;
  },

  /**
   * Get a specific technology by ID with its references
   */
  getTechnologyById: async (techId: string): Promise<TechnologyCardWithReferences> => {
    const tech = await apiCall<any>(
      `/api/v1/technology-routes/technologies/${encodeURIComponent(techId)}`
    );

    // Transform snake_case API response to camelCase TypeScript interface
    return {
      id: tech.id,
      category: tech.category,
      namePt: tech.name_pt,
      nameEn: tech.name_en,
      emoji: tech.emoji,
      descriptionPt: tech.description_pt,
      descriptionEn: tech.description_en,
      color: tech.color,
      canConnectTo: tech.can_connect_to,
      canReceiveFrom: tech.can_receive_from,
      isCustom: tech.is_custom,
      createdBy: tech.created_by,
      createdAt: tech.created_at,
      updatedAt: tech.updated_at,
      references: tech.references.map((ref: any) => ({
        referenceId: ref.reference_id,
        title: ref.title,
        authors: ref.authors,
        year: ref.year,
        journal: ref.journal,
        doi: ref.doi,
        url: ref.url,
        relevanceNote: ref.relevance_note,
      })),
    };
  },

  /**
   * Create a custom user-defined technology card
   */
  createCustomTechnology: async (data: Partial<TechnologyCard>): Promise<TechnologyCard> => {
    return apiCall<TechnologyCard>(
      '/api/v1/technology-routes/technologies/custom',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  },

  /**
   * Delete a custom technology card (only owner can delete)
   */
  deleteCustomTechnology: async (techId: string): Promise<void> => {
    await apiCall<void>(
      `/api/v1/technology-routes/technologies/custom/${encodeURIComponent(techId)}`,
      {
        method: 'DELETE',
      }
    );
  },

  // ==========================================================================
  // USER ROUTES API
  // ==========================================================================

  /**
   * Get all routes created by the current user
   */
  getUserRoutes: async (): Promise<UserRoute[]> => {
    return apiCall<UserRoute[]>('/api/v1/technology-routes/routes');
  },

  /**
   * Get a specific route by ID (must be owner)
   */
  getRouteById: async (routeId: string): Promise<UserRoute> => {
    return apiCall<UserRoute>(
      `/api/v1/technology-routes/routes/${encodeURIComponent(routeId)}`
    );
  },

  /**
   * Create a new technology route
   */
  createRoute: async (data: CreateRoutePayload): Promise<UserRoute> => {
    return apiCall<UserRoute>(
      '/api/v1/technology-routes/routes',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  },

  /**
   * Update an existing route (must be owner)
   */
  updateRoute: async (
    routeId: string,
    data: UpdateRoutePayload
  ): Promise<UserRoute> => {
    return apiCall<UserRoute>(
      `/api/v1/technology-routes/routes/${encodeURIComponent(routeId)}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
  },

  /**
   * Delete a route (must be owner)
   */
  deleteRoute: async (routeId: string): Promise<void> => {
    await apiCall<void>(
      `/api/v1/technology-routes/routes/${encodeURIComponent(routeId)}`,
      {
        method: 'DELETE',
      }
    );
  },

  // ==========================================================================
  // PUBLIC SHARING API
  // ==========================================================================

  /**
   * Get public routes (no authentication required)
   */
  getPublicRoutes: async (limit = 20, offset = 0): Promise<UserRoute[]> => {
    return apiCall<UserRoute[]>(
      `/api/v1/technology-routes/public/routes?limit=${limit}&offset=${offset}`
    );
  },

  /**
   * Get a route by its share token (no authentication required)
   */
  getRouteByShareToken: async (shareToken: string): Promise<UserRoute> => {
    return apiCall<UserRoute>(
      `/api/v1/technology-routes/share/${encodeURIComponent(shareToken)}`
    );
  },

  // ==========================================================================
  // VALIDATION API
  // ==========================================================================

  /**
   * Validate if two technologies can be connected
   */
  validateConnection: async (
    sourceTechId: string,
    targetTechId: string
  ): Promise<ConnectionValidationResponse> => {
    return apiCall<ConnectionValidationResponse>(
      '/api/v1/technology-routes/validate-connection',
      {
        method: 'POST',
        body: JSON.stringify({
          source_tech_id: sourceTechId,
          target_tech_id: targetTechId,
        }),
      }
    );
  },
};

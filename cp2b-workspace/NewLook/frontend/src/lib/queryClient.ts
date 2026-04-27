/**
 * PILAR-2b V3 - TanStack Query Configuration
 * Optimized caching and data synchronization for geospatial data
 */

import { QueryClient } from '@tanstack/react-query';

/**
 * Create QueryClient with optimized defaults for geospatial data
 *
 * Strategy:
 * - Geospatial data changes infrequently, so we cache aggressively
 * - Use staleTime to prevent unnecessary refetches
 * - Enable background refetching for fresh data
 * - Retry failed requests with exponential backoff
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 30 seconds (reduced from 5 minutes for database content)
      // This ensures users see new references quickly after database updates
      staleTime: 1000 * 30, // 30 seconds

      // Keep unused data in cache for 5 minutes
      gcTime: 1000 * 60 * 5, // 5 minutes (formerly cacheTime)

      // Retry failed requests 3 times with exponential backoff
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Refetch on window focus for fresh data
      refetchOnWindowFocus: true,

      // Refetch on reconnect
      refetchOnReconnect: true,

      // Refetch on mount if data is stale (allows fresh data after database updates)
      refetchOnMount: true,

      // Enable structural sharing for better performance
      structuralSharing: true,
    },
    mutations: {
      // Retry mutations once
      retry: 1,
    },
  },
});

/**
 * Query Keys for consistent caching
 * Centralized query key management prevents cache misses
 */
export const queryKeys = {
  // Municipality data
  municipalities: {
    all: ['municipalities'] as const,
    geojson: () => [...queryKeys.municipalities.all, 'geojson'] as const,
    list: () => [...queryKeys.municipalities.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.municipalities.all, 'detail', id] as const,
  },

  // Infrastructure layers
  infrastructure: {
    all: ['infrastructure'] as const,
    layer: (type: string) => [...queryKeys.infrastructure.all, type] as const,
  },

  // Statistics
  statistics: {
    all: ['statistics'] as const,
    summary: () => [...queryKeys.statistics.all, 'summary'] as const,
    rankings: (criteria: string, limit: number) =>
      [...queryKeys.statistics.all, 'rankings', criteria, limit] as const,
  },

  // MapBiomas
  mapbiomas: {
    all: ['mapbiomas'] as const,
    layer: () => [...queryKeys.mapbiomas.all, 'layer'] as const,
  },

  // Co-digestion clustering and C:N analysis
  codigestion: {
    all: ['codigestion'] as const,
    clusters: (radiusKm: number, minBiomass: number) =>
      [...queryKeys.codigestion.all, 'clusters', radiusKm, minBiomass] as const,
    cnMatrix: () => [...queryKeys.codigestion.all, 'cn-matrix'] as const,
  },
};

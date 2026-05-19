/**
 * PILAR-2b V3 - Frontend API Cache
 * Caches API responses in localStorage with TTL support
 * Reduces backend load and improves UX with instant responses
 */

import { logger } from './logger';

// Cache duration configurations (in milliseconds)
export const CACHE_DURATION = {
  municipalities: 24 * 60 * 60 * 1000, // 24 hours
  statistics: 12 * 60 * 60 * 1000,     // 12 hours
  analysis: 5 * 60 * 1000,             // 5 minutes
  recommendations: 60 * 60 * 1000,     // 1 hour
};

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Get cached data from localStorage
 */
export function getFromCache<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;

  try {
    const cached = localStorage.getItem(`api_cache:${key}`);
    if (!cached) return null;

    const entry: CacheEntry<T> = JSON.parse(cached);
    const age = Date.now() - entry.timestamp;

    if (age < entry.ttl) {
      logger.info(`✅ Cache hit for ${key} (${Math.round(age / 1000)}s old)`);
      return entry.data;
    }

    // Expired - remove from cache
    localStorage.removeItem(`api_cache:${key}`);
    return null;
  } catch (error) {
    logger.warn(`Cache read error for ${key}:`, error);
    return null;
  }
}

/**
 * Store data in localStorage cache
 */
export function setInCache<T>(key: string, data: T, ttl: number = CACHE_DURATION.analysis): void {
  if (typeof window === 'undefined') return;

  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };
    localStorage.setItem(`api_cache:${key}`, JSON.stringify(entry));
    logger.debug(`Cache set for ${key} (TTL: ${ttl / 1000}s)`);
  } catch (error) {
    logger.warn(`Cache write error for ${key}:`, error);
    // If localStorage is full, try to clear old entries
    clearExpiredCache();
  }
}

/**
 * Generate cache key from request parameters
 */
export function generateCacheKey(endpoint: string, params?: Record<string, any>): string {
  if (!params) return endpoint;

  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');

  return `${endpoint}?${sortedParams}`;
}

/**
 * Clear expired cache entries
 */
export function clearExpiredCache(): void {
  if (typeof window === 'undefined') return;

  const keysToRemove: string[] = [];
  const now = Date.now();

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('api_cache:')) {
      try {
        const cached = localStorage.getItem(key);
        if (cached) {
          const entry = JSON.parse(cached);
          if (now - entry.timestamp >= entry.ttl) {
            keysToRemove.push(key);
          }
        }
      } catch {
        keysToRemove.push(key!);
      }
    }
  }

  keysToRemove.forEach(key => localStorage.removeItem(key));

  if (keysToRemove.length > 0) {
    logger.info(`Cleared ${keysToRemove.length} expired cache entries`);
  }
}

/**
 * Clear all API cache
 */
export function clearAllCache(): void {
  if (typeof window === 'undefined') return;

  const keysToRemove: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('api_cache:')) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach(key => localStorage.removeItem(key));
  logger.info(`Cleared all ${keysToRemove.length} cache entries`);
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { count: number; totalSize: number } {
  if (typeof window === 'undefined') return { count: 0, totalSize: 0 };

  let count = 0;
  let totalSize = 0;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('api_cache:')) {
      count++;
      const item = localStorage.getItem(key);
      if (item) {
        totalSize += item.length;
      }
    }
  }

  return { count, totalSize };
}

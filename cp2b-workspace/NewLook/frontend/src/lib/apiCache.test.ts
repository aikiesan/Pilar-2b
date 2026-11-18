/**
 * Tests for API Cache
 * Tests localStorage-based caching with TTL support
 */

import {
  getFromCache,
  setInCache,
  generateCacheKey,
  clearExpiredCache,
  clearAllCache,
  getCacheStats,
  CACHE_DURATION,
} from './apiCache';

// Mock logger
jest.mock('./logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

describe('apiCache', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('setInCache and getFromCache', () => {
    it('should store and retrieve data from cache', () => {
      const testData = { id: 1, name: 'Test' };

      setInCache('test-key', testData, CACHE_DURATION.analysis);
      const cached = getFromCache<typeof testData>('test-key');

      expect(cached).toEqual(testData);
    });

    it('should return null for non-existent key', () => {
      const cached = getFromCache('non-existent');
      expect(cached).toBeNull();
    });

    it('should return null for expired cache', () => {
      const testData = { id: 1, name: 'Test' };

      // Set cache with 1ms TTL
      setInCache('test-key', testData, 1);

      // Wait for expiration
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const cached = getFromCache('test-key');
          expect(cached).toBeNull();
          resolve();
        }, 10);
      });
    });

    it('should remove expired entry from localStorage', () => {
      const testData = { id: 1, name: 'Test' };

      setInCache('test-key', testData, 1);

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          getFromCache('test-key');

          // Entry should be removed
          const item = localStorage.getItem('api_cache:test-key');
          expect(item).toBeNull();
          resolve();
        }, 10);
      });
    });

    it('should use default TTL when not specified', () => {
      const testData = { id: 1, name: 'Test' };

      setInCache('test-key', testData);

      const item = localStorage.getItem('api_cache:test-key');
      expect(item).not.toBeNull();

      const entry = JSON.parse(item!);
      expect(entry.ttl).toBe(CACHE_DURATION.analysis);
    });

    it('should handle various data types', () => {
      const testCases = [
        { type: 'string', data: 'test string' },
        { type: 'number', data: 42 },
        { type: 'boolean', data: true },
        { type: 'array', data: [1, 2, 3] },
        { type: 'object', data: { nested: { deep: 'value' } } },
        { type: 'null', data: null },
      ];

      testCases.forEach(({ type, data }) => {
        setInCache(`test-${type}`, data);
        const cached = getFromCache(`test-${type}`);
        expect(cached).toEqual(data);
      });
    });

    it('should handle cache read errors gracefully', () => {
      // Set invalid JSON in localStorage
      localStorage.setItem('api_cache:invalid', 'not-valid-json{');

      const cached = getFromCache('invalid');
      expect(cached).toBeNull();
    });

    it('should prefix cache keys correctly', () => {
      setInCache('test', { data: 'value' });

      const keys = Object.keys(localStorage);
      expect(keys[0]).toBe('api_cache:test');
    });

    it('should store timestamp and TTL in cache entry', () => {
      const testData = { id: 1 };
      const ttl = 10000;

      const beforeTime = Date.now();
      setInCache('test-key', testData, ttl);
      const afterTime = Date.now();

      const item = localStorage.getItem('api_cache:test-key');
      const entry = JSON.parse(item!);

      expect(entry.data).toEqual(testData);
      expect(entry.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(entry.timestamp).toBeLessThanOrEqual(afterTime);
      expect(entry.ttl).toBe(ttl);
    });
  });

  describe('generateCacheKey', () => {
    it('should return endpoint when no params provided', () => {
      const key = generateCacheKey('/api/municipalities');
      expect(key).toBe('/api/municipalities');
    });

    it('should generate key with sorted parameters', () => {
      const params = {
        limit: 10,
        offset: 0,
        search: 'test',
      };

      const key = generateCacheKey('/api/municipalities', params);
      expect(key).toBe('/api/municipalities?limit=10&offset=0&search=test');
    });

    it('should sort parameters consistently', () => {
      const params1 = { b: 2, a: 1, c: 3 };
      const params2 = { c: 3, a: 1, b: 2 };

      const key1 = generateCacheKey('/api/test', params1);
      const key2 = generateCacheKey('/api/test', params2);

      expect(key1).toBe(key2);
    });

    it('should handle empty params object', () => {
      const key = generateCacheKey('/api/test', {});
      expect(key).toBe('/api/test?');
    });

    it('should handle params with various value types', () => {
      const params = {
        string: 'value',
        number: 42,
        boolean: true,
        null: null,
        undefined: undefined,
      };

      const key = generateCacheKey('/api/test', params);
      expect(key).toContain('string=value');
      expect(key).toContain('number=42');
      expect(key).toContain('boolean=true');
    });
  });

  describe('clearExpiredCache', () => {
    it('should remove only expired entries', () => {
      // Add valid entry (long TTL)
      setInCache('valid', { data: 'keep' }, 10000);

      // Add expired entry (short TTL)
      setInCache('expired', { data: 'remove' }, 1);

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          clearExpiredCache();

          // Valid entry should still exist
          expect(getFromCache('valid')).toEqual({ data: 'keep' });

          // Expired entry should be removed
          const expiredItem = localStorage.getItem('api_cache:expired');
          expect(expiredItem).toBeNull();

          resolve();
        }, 10);
      });
    });

    it('should handle invalid cache entries', () => {
      // Set valid entry
      setInCache('valid', { data: 'value' });

      // Set invalid JSON entry
      localStorage.setItem('api_cache:invalid', 'not-json{');

      // Should not throw
      expect(() => clearExpiredCache()).not.toThrow();

      // Invalid entry should be removed
      const invalidItem = localStorage.getItem('api_cache:invalid');
      expect(invalidItem).toBeNull();

      // Valid entry should remain
      expect(getFromCache('valid')).toEqual({ data: 'value' });
    });

    it('should not affect non-cache localStorage items', () => {
      localStorage.setItem('other-data', 'should-remain');
      setInCache('cache-data', { data: 'value' }, 1);

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          clearExpiredCache();

          expect(localStorage.getItem('other-data')).toBe('should-remain');
          resolve();
        }, 10);
      });
    });

    it('should handle empty localStorage', () => {
      expect(() => clearExpiredCache()).not.toThrow();
    });
  });

  describe('clearAllCache', () => {
    it('should remove all cache entries', () => {
      setInCache('key1', { data: 1 });
      setInCache('key2', { data: 2 });
      setInCache('key3', { data: 3 });

      clearAllCache();

      expect(getFromCache('key1')).toBeNull();
      expect(getFromCache('key2')).toBeNull();
      expect(getFromCache('key3')).toBeNull();
    });

    it('should not remove non-cache localStorage items', () => {
      localStorage.setItem('user-settings', 'value');
      setInCache('cache-key', { data: 'value' });

      clearAllCache();

      expect(localStorage.getItem('user-settings')).toBe('value');
      expect(getFromCache('cache-key')).toBeNull();
    });

    it('should handle empty localStorage', () => {
      expect(() => clearAllCache()).not.toThrow();
    });
  });

  describe('getCacheStats', () => {
    it('should return zero stats for empty cache', () => {
      const stats = getCacheStats();

      expect(stats.count).toBe(0);
      expect(stats.totalSize).toBe(0);
    });

    it('should count cache entries correctly', () => {
      setInCache('key1', { data: 'value1' });
      setInCache('key2', { data: 'value2' });
      setInCache('key3', { data: 'value3' });

      const stats = getCacheStats();

      expect(stats.count).toBe(3);
    });

    it('should calculate total size correctly', () => {
      setInCache('key1', { data: 'a' });

      const stats = getCacheStats();

      expect(stats.totalSize).toBeGreaterThan(0);
    });

    it('should not count non-cache items', () => {
      localStorage.setItem('other-item', 'value');
      setInCache('cache-item', { data: 'value' });

      const stats = getCacheStats();

      expect(stats.count).toBe(1);
    });

    it('should handle large cache entries', () => {
      const largeData = Array(1000).fill({ id: 1, name: 'test' });

      setInCache('large', largeData);

      const stats = getCacheStats();

      expect(stats.count).toBe(1);
      expect(stats.totalSize).toBeGreaterThan(10000); // Should be quite large
    });
  });

  describe('CACHE_DURATION constants', () => {
    it('should define proper durations', () => {
      expect(CACHE_DURATION.municipalities).toBe(24 * 60 * 60 * 1000); // 24 hours
      expect(CACHE_DURATION.statistics).toBe(12 * 60 * 60 * 1000); // 12 hours
      expect(CACHE_DURATION.analysis).toBe(5 * 60 * 1000); // 5 minutes
      expect(CACHE_DURATION.recommendations).toBe(60 * 60 * 1000); // 1 hour
    });
  });

  describe('SSR compatibility', () => {
    const originalWindow = global.window;

    beforeEach(() => {
      // Simulate SSR by removing window
      delete (global as any).window;
    });

    afterEach(() => {
      // Restore window
      global.window = originalWindow;
    });

    it('getFromCache should return null in SSR', () => {
      const cached = getFromCache('test');
      expect(cached).toBeNull();
    });

    it('setInCache should not throw in SSR', () => {
      expect(() => setInCache('test', { data: 'value' })).not.toThrow();
    });

    it('clearExpiredCache should not throw in SSR', () => {
      expect(() => clearExpiredCache()).not.toThrow();
    });

    it('clearAllCache should not throw in SSR', () => {
      expect(() => clearAllCache()).not.toThrow();
    });

    it('getCacheStats should return zero in SSR', () => {
      const stats = getCacheStats();
      expect(stats).toEqual({ count: 0, totalSize: 0 });
    });
  });

  describe('Edge cases', () => {
    it('should handle localStorage quota exceeded', () => {
      // Mock setItem to throw quota exceeded error
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = jest.fn(() => {
        throw new DOMException('QuotaExceededError');
      });

      // Should not throw
      expect(() => setInCache('test', { data: 'value' })).not.toThrow();

      // Restore original
      Storage.prototype.setItem = originalSetItem;
    });

    it('should handle very large objects', () => {
      const largeObject = {
        data: Array(10000).fill({ id: 1, name: 'test', value: 'x'.repeat(100) }),
      };

      setInCache('large', largeObject);
      const cached = getFromCache('large');

      expect(cached).toEqual(largeObject);
    });

    it('should handle special characters in keys', () => {
      const testData = { data: 'value' };
      const specialKeys = [
        'key with spaces',
        'key/with/slashes',
        'key?with=params',
        'key#with#hash',
      ];

      specialKeys.forEach((key) => {
        setInCache(key, testData);
        expect(getFromCache(key)).toEqual(testData);
      });
    });

    it('should handle concurrent cache operations', () => {
      const operations = [];

      // Simulate concurrent writes
      for (let i = 0; i < 100; i++) {
        operations.push(setInCache(`key-${i}`, { id: i }));
      }

      // Verify all writes succeeded
      for (let i = 0; i < 100; i++) {
        const cached = getFromCache(`key-${i}`);
        expect(cached).toEqual({ id: i });
      }
    });
  });
});

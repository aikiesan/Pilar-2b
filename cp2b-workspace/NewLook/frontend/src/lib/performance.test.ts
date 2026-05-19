/**
 * Tests for Performance Utility
 * Tests performance monitoring and optimization functions
 */

import {
  measurePerformance,
  retryOperation,
  sleep,
  memoize,
  batchRequests,
  isOnline,
  getConnectionQuality,
  lazyLoad,
  isProduction,
  logPerformanceMetrics,
  recordWebVital,
  getWebVitals,
} from './performance';
import { logger } from './logger';

// Mock logger
jest.mock('./logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Performance Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('measurePerformance', () => {
    it('should measure and log successful operation duration', async () => {
      const operation = async () => {
        await sleep(10);
        return 'success';
      };

      const result = await measurePerformance('testOp', operation);

      expect(result).toBe('success');
      expect(logger.info).toHaveBeenCalled();
      const logCall = (logger.info as jest.Mock).mock.calls[0][0];
      expect(logCall).toContain('testOp');
      expect(logCall).toContain('ms');
    });

    it('should warn if operation is slow (>3000ms)', async () => {
      const slowOperation = async () => {
        await sleep(3100);
        return 'slow';
      };

      const result = await measurePerformance('slowOp', slowOperation);

      expect(result).toBe('slow');
      expect(logger.warn).toHaveBeenCalled();
      const warnCall = (logger.warn as jest.Mock).mock.calls[0][0];
      expect(warnCall).toContain('Slow operation detected');
      expect(warnCall).toContain('slowOp');
    });

    it('should log error and rethrow on failure', async () => {
      const failingOperation = async () => {
        throw new Error('Operation failed');
      };

      await expect(measurePerformance('failOp', failingOperation)).rejects.toThrow(
        'Operation failed'
      );

      expect(logger.error).toHaveBeenCalled();
      const errorCall = (logger.error as jest.Mock).mock.calls[0][0];
      expect(errorCall).toContain('failOp');
      expect(errorCall).toContain('failed');
    });

    it('should return the result of the operation', async () => {
      const complexResult = { data: [1, 2, 3], total: 3 };
      const operation = async () => complexResult;

      const result = await measurePerformance('complexOp', operation);

      expect(result).toEqual(complexResult);
    });

    it('should handle operations that return undefined', async () => {
      const operation = async () => undefined;

      const result = await measurePerformance('undefinedOp', operation);

      expect(result).toBeUndefined();
    });
  });

  describe('retryOperation', () => {
    it('should succeed on first attempt', async () => {
      const successOperation = jest.fn().mockResolvedValue('success');

      const result = await retryOperation(successOperation, 3, 100);

      expect(result).toBe('success');
      expect(successOperation).toHaveBeenCalledTimes(1);
    });

    it('should retry and eventually succeed', async () => {
      let attempts = 0;
      const eventualSuccessOperation = jest.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      });

      const result = await retryOperation(eventualSuccessOperation, 3, 100);

      expect(result).toBe('success');
      expect(eventualSuccessOperation).toHaveBeenCalledTimes(3);
      expect(logger.warn).toHaveBeenCalledTimes(2); // 2 retries
    });

    it('should throw after max retries exceeded', async () => {
      const alwaysFailOperation = jest.fn().mockRejectedValue(new Error('Always fails'));

      await expect(retryOperation(alwaysFailOperation, 2, 100)).rejects.toThrow(
        'Always fails'
      );

      expect(alwaysFailOperation).toHaveBeenCalledTimes(3); // Initial + 2 retries
      expect(logger.warn).toHaveBeenCalledTimes(2);
    });

    it('should use exponential backoff', async () => {
      const delays: number[] = [];
      let callTime = Date.now();

      const trackingOperation = jest.fn().mockImplementation(async () => {
        const now = Date.now();
        if (delays.length > 0) {
          delays.push(now - callTime);
        }
        callTime = now;
        throw new Error('Fail');
      });

      await expect(retryOperation(trackingOperation, 2, 100)).rejects.toThrow();

      // First retry after ~100ms, second after ~200ms (exponential: 100 * 2^0, 100 * 2^1)
      // Allow some tolerance for execution time
      expect(delays.length).toBe(2);
      expect(delays[0]).toBeGreaterThanOrEqual(90);
      expect(delays[1]).toBeGreaterThanOrEqual(180);
    });

    it('should use default values (3 retries, 1000ms initial delay)', async () => {
      const failOperation = jest.fn().mockRejectedValue(new Error('Fail'));

      await expect(retryOperation(failOperation)).rejects.toThrow();

      expect(failOperation).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });
  });

  describe('sleep', () => {
    it('should delay for specified milliseconds', async () => {
      const start = Date.now();
      await sleep(100);
      const duration = Date.now() - start;

      expect(duration).toBeGreaterThanOrEqual(90); // Allow some tolerance
      expect(duration).toBeLessThan(150);
    });

    it('should handle zero delay', async () => {
      const start = Date.now();
      await sleep(0);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(10);
    });
  });

  describe('memoize', () => {
    it('should cache and return memoized results', () => {
      const expensiveFunction = jest.fn((x: number) => x * 2);
      const memoized = memoize(expensiveFunction);

      const result1 = memoized(5);
      const result2 = memoized(5);
      const result3 = memoized(10);

      expect(result1).toBe(10);
      expect(result2).toBe(10);
      expect(result3).toBe(20);
      expect(expensiveFunction).toHaveBeenCalledTimes(2); // Only for 5 and 10, not second call with 5
    });

    it('should handle multiple arguments', () => {
      const multiArgFn = jest.fn((a: number, b: number) => a + b);
      const memoized = memoize(multiArgFn);

      memoized(1, 2);
      memoized(1, 2);
      memoized(2, 3);

      expect(multiArgFn).toHaveBeenCalledTimes(2); // (1,2) and (2,3)
    });

    it('should respect maxCacheSize', () => {
      const fn = jest.fn((x: number) => x);
      const memoized = memoize(fn, 2); // Max 2 entries

      memoized(1);
      memoized(2);
      memoized(3); // Should evict 1

      expect(fn).toHaveBeenCalledTimes(3);

      // Call 1 again - should not be cached
      memoized(1);
      expect(fn).toHaveBeenCalledTimes(4);

      // Call 2 again - should be cached
      memoized(2);
      expect(fn).toHaveBeenCalledTimes(4); // No additional call
    });

    it('should handle complex objects as arguments', () => {
      const fn = jest.fn((obj: { a: number; b: number }) => obj.a + obj.b);
      const memoized = memoize(fn);

      memoized({ a: 1, b: 2 });
      memoized({ a: 1, b: 2 });

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should differentiate between different argument orders', () => {
      const fn = jest.fn((obj: { a: number; b: number }) => obj.a + obj.b);
      const memoized = memoize(fn);

      memoized({ a: 1, b: 2 });
      memoized({ b: 2, a: 1 }); // Different order in object

      // JSON.stringify preserves key order, so these are different
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('batchRequests', () => {
    it('should batch requests with default batch size', async () => {
      const requests = Array.from({ length: 12 }, (_, i) => async () => i);

      const results = await batchRequests(requests);

      expect(results).toHaveLength(12);
      expect(results).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    });

    it('should batch requests with custom batch size', async () => {
      const executionOrder: number[] = [];
      const requests = Array.from({ length: 10 }, (_, i) => async () => {
        await sleep(10);
        executionOrder.push(i);
        return i;
      });

      const results = await batchRequests(requests, 3);

      expect(results).toHaveLength(10);
      // First 3 should execute together, then next 3, etc.
      expect(executionOrder.slice(0, 3).sort()).toEqual([0, 1, 2]);
    });

    it('should handle empty request array', async () => {
      const results = await batchRequests([]);

      expect(results).toEqual([]);
    });

    it('should handle single request', async () => {
      const requests = [async () => 'single'];

      const results = await batchRequests(requests);

      expect(results).toEqual(['single']);
    });

    it('should handle failed requests', async () => {
      const requests = [
        async () => 'success1',
        async () => {
          throw new Error('fail');
        },
        async () => 'success2',
      ];

      await expect(batchRequests(requests)).rejects.toThrow('fail');
    });
  });

  describe('isOnline', () => {
    const originalNavigator = global.navigator;

    afterEach(() => {
      Object.defineProperty(global, 'navigator', {
        value: originalNavigator,
        configurable: true,
      });
    });

    it('should return true when online', () => {
      Object.defineProperty(global, 'navigator', {
        value: { onLine: true },
        configurable: true,
      });

      expect(isOnline()).toBe(true);
    });

    it('should return false when offline', () => {
      Object.defineProperty(global, 'navigator', {
        value: { onLine: false },
        configurable: true,
      });

      expect(isOnline()).toBe(false);
    });

    it('should handle undefined navigator', () => {
      Object.defineProperty(global, 'navigator', {
        value: undefined,
        configurable: true,
      });

      expect(isOnline()).toBe(false);
    });
  });

  describe('getConnectionQuality', () => {
    it('should return connection type when available', () => {
      const mockConnection = { effectiveType: '4g' };
      Object.defineProperty(global.navigator, 'connection', {
        value: mockConnection,
        configurable: true,
      });

      expect(getConnectionQuality()).toBe('4g');
    });

    it('should return unknown when connection API not available', () => {
      Object.defineProperty(global.navigator, 'connection', {
        value: undefined,
        configurable: true,
      });

      expect(getConnectionQuality()).toBe('unknown');
    });
  });

  describe('lazyLoad', () => {
    it('should lazy load component with minimum load time', async () => {
      const mockComponent = { default: () => null };
      const importFn = jest.fn().mockResolvedValue(mockComponent);

      const lazyFn = lazyLoad(importFn, 100);

      const start = Date.now();
      const result = await lazyFn();
      const duration = Date.now() - start;

      expect(result).toBe(mockComponent);
      expect(duration).toBeGreaterThanOrEqual(90);
    });

    it('should enforce minimum load time even if import is fast', async () => {
      const mockComponent = { default: () => null };
      const fastImport = jest.fn().mockResolvedValue(mockComponent);

      const lazyFn = lazyLoad(fastImport, 200);

      const start = Date.now();
      await lazyFn();
      const duration = Date.now() - start;

      expect(duration).toBeGreaterThanOrEqual(190);
    });
  });

  describe('isProduction', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should return true in production', () => {
      process.env.NODE_ENV = 'production';
      expect(isProduction()).toBe(true);
    });

    it('should return false in development', () => {
      process.env.NODE_ENV = 'development';
      expect(isProduction()).toBe(false);
    });

    it('should return false in test', () => {
      process.env.NODE_ENV = 'test';
      expect(isProduction()).toBe(false);
    });
  });

  describe('logPerformanceMetrics', () => {
    const originalWindow = global.window;
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      global.window = originalWindow as any;
      process.env.NODE_ENV = originalEnv;
    });

    it('should not log in production', () => {
      process.env.NODE_ENV = 'production';

      logPerformanceMetrics();

      expect(logger.info).not.toHaveBeenCalled();
    });

    it('should not log when window is undefined (SSR)', () => {
      process.env.NODE_ENV = 'development';
      (global as any).window = undefined;

      logPerformanceMetrics();

      expect(logger.info).not.toHaveBeenCalled();
    });

    it('should log metrics in development when Performance API available', () => {
      process.env.NODE_ENV = 'development';

      const mockPerformance = {
        timing: {
          navigationStart: 1000,
          domainLookupStart: 1100,
          domainLookupEnd: 1150,
          connectStart: 1200,
          connectEnd: 1250,
          requestStart: 1300,
          responseEnd: 1400,
          domContentLoadedEventEnd: 1500,
          loadEventEnd: 1600,
        },
        navigation: {
          type: 0,
        },
      };

      (global as any).window = { performance: mockPerformance };

      const result = logPerformanceMetrics();

      expect(logger.info).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result?.pageLoadTime).toBe(600);
      expect(result?.dnsLookupTime).toBe(50);
    });
  });

  describe('Web Vitals', () => {
    it('should record web vital', () => {
      recordWebVital('LCP', 1234.56);

      expect(logger.info).toHaveBeenCalled();
      const logCall = (logger.info as jest.Mock).mock.calls[0][0];
      expect(logCall).toContain('LCP');
      expect(logCall).toContain('1234.56');
    });

    it('should store and retrieve web vitals', () => {
      recordWebVital('FCP', 100.5);
      recordWebVital('CLS', 0.05);

      const vitals = getWebVitals();

      expect(vitals.FCP).toBe(100.5);
      expect(vitals.CLS).toBe(0.05);
    });

    it('should return copy of web vitals object', () => {
      recordWebVital('TTFB', 50);

      const vitals1 = getWebVitals();
      const vitals2 = getWebVitals();

      expect(vitals1).not.toBe(vitals2); // Different objects
      expect(vitals1).toEqual(vitals2); // Same values
    });

    it('should handle all web vital types', () => {
      recordWebVital('CLS', 0.1);
      recordWebVital('FID', 20);
      recordWebVital('FCP', 500);
      recordWebVital('LCP', 1000);
      recordWebVital('TTFB', 100);

      const vitals = getWebVitals();

      expect(vitals.CLS).toBe(0.1);
      expect(vitals.FID).toBe(20);
      expect(vitals.FCP).toBe(500);
      expect(vitals.LCP).toBe(1000);
      expect(vitals.TTFB).toBe(100);
    });
  });

  describe('Integration Tests', () => {
    it('should combine measurePerformance with retryOperation', async () => {
      let attempts = 0;
      const flakyOperation = async () => {
        attempts++;
        if (attempts < 2) throw new Error('Temporary error');
        return 'success';
      };

      const result = await measurePerformance('retryTest', async () => {
        return await retryOperation(flakyOperation, 3, 50);
      });

      expect(result).toBe('success');
      expect(logger.info).toHaveBeenCalled(); // From measurePerformance
      expect(logger.warn).toHaveBeenCalled(); // From retryOperation
    });

    it('should use memoized function in batchRequests', async () => {
      const expensiveFn = jest.fn((x: number) => x * 2);
      const memoized = memoize(expensiveFn);

      const requests = [
        async () => memoized(1),
        async () => memoized(2),
        async () => memoized(1), // Should use cache
        async () => memoized(2), // Should use cache
      ];

      await batchRequests(requests, 2);

      expect(expensiveFn).toHaveBeenCalledTimes(2); // Only called for 1 and 2
    });
  });
});

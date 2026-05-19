/**
 * Performance Monitoring and Optimization Utilities
 * Sprint 4: Task 4.1 - Performance Optimization
 */

import { logger } from './logger'

/**
 * Measure performance of an async operation
 * 
 * @param operationName - Name for logging
 * @param operation - Async function to measure
 * @returns Operation result
 */
export async function measurePerformance<T>(
  operationName: string,
  operation: () => Promise<T>
): Promise<T> {
  const startTime = performance.now()
  
  try {
    const result = await operation()
    const duration = performance.now() - startTime
    
    logger.info(`⚡ ${operationName} completed in ${duration.toFixed(0)}ms`)
    
    // Log warning if operation is slow
    if (duration > 3000) {
      logger.warn(`⚠️ Slow operation detected: ${operationName} took ${duration.toFixed(0)}ms`)
    }
    
    return result
  } catch (error) {
    const duration = performance.now() - startTime
    logger.error(`❌ ${operationName} failed after ${duration.toFixed(0)}ms`, error)
    throw error
  }
}

/**
 * Retry failed operations with exponential backoff
 * 
 * @param operation - Async function to retry
 * @param maxRetries - Maximum retry attempts (default: 3)
 * @param initialDelay - Initial delay in ms (default: 1000)
 * @returns Operation result
 * 
 * @example
 * const data = await retryOperation(
 *   () => fetch('/api/data'),
 *   3, // max 3 retries
 *   1000 // start with 1s delay
 * )
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      
      if (attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt) // Exponential backoff
        logger.warn(
          `Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms: ${lastError.message}`
        )
        await sleep(delay)
      }
    }
  }
  
  throw lastError!
}

/**
 * Sleep utility for delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Memoize expensive computations
 * 
 * @param fn - Function to memoize
 * @param maxCacheSize - Maximum cache entries (default: 100)
 * @returns Memoized function
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  maxCacheSize: number = 100
): T {
  const cache = new Map<string, ReturnType<T>>()
  
  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args)
    
    if (cache.has(key)) {
      return cache.get(key)
    }
    
    const result = fn(...args)
    
    // Evict oldest if cache is full
    if (cache.size >= maxCacheSize) {
      const firstKey = cache.keys().next().value
      if (firstKey !== undefined) {
        cache.delete(firstKey)
      }
    }
    
    cache.set(key, result)
    return result
  }) as T
}

/**
 * Batch multiple API calls and deduplicate
 * 
 * @param requests - Array of request functions
 * @param batchSize - Maximum concurrent requests (default: 5)
 * @returns Array of results
 */
export async function batchRequests<T>(
  requests: (() => Promise<T>)[],
  batchSize: number = 5
): Promise<T[]> {
  const results: T[] = []
  
  for (let i = 0; i < requests.length; i += batchSize) {
    const batch = requests.slice(i, i + batchSize)
    const batchResults = await Promise.all(batch.map(req => req()))
    results.push(...batchResults)
  }
  
  return results
}

/**
 * Check if browser is online
 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine
}

/**
 * Get connection quality estimate
 * 
 * @returns Connection type string
 */
export function getConnectionQuality(): string {
  if (typeof navigator === 'undefined') return 'unknown'
  
  // @ts-ignore - experimental API
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
  
  if (!connection) return 'unknown'
  
  const effectiveType = connection.effectiveType
  return effectiveType || 'unknown'
}

/**
 * Lazy load component (code splitting helper)
 * 
 * @param importFn - Dynamic import function
 * @param minLoadTime - Minimum loading time in ms (prevents flash)
 * @returns Lazy component
 */
export function lazyLoad<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  minLoadTime: number = 200
): () => Promise<{ default: T }> {
  return async () => {
    const [module] = await Promise.all([
      importFn(),
      sleep(minLoadTime)
    ])
    return module
  }
}

/**
 * Check if code is running in production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

/**
 * Log performance metrics (only in development)
 */
export function logPerformanceMetrics() {
  if (isProduction() || typeof window === 'undefined') return
  
  // Check if Performance API is available
  if (!window.performance || !window.performance.timing) return
  
  const timing = window.performance.timing
  const navigation = window.performance.navigation
  
  const metrics = {
    // Page load metrics
    pageLoadTime: timing.loadEventEnd - timing.navigationStart,
    domReadyTime: timing.domContentLoadedEventEnd - timing.navigationStart,
    firstPaintTime: timing.responseEnd - timing.navigationStart,
    
    // Network metrics
    dnsLookupTime: timing.domainLookupEnd - timing.domainLookupStart,
    tcpConnectionTime: timing.connectEnd - timing.connectStart,
    serverResponseTime: timing.responseEnd - timing.requestStart,
    
    // Navigation type
    navigationType: navigation.type === 0 ? 'navigate' : 
                    navigation.type === 1 ? 'reload' : 
                    navigation.type === 2 ? 'back_forward' : 'unknown'
  }
  
  logger.info('📊 Performance Metrics:', metrics)
  
  return metrics
}

/**
 * Web Vitals tracking (Core Web Vitals)
 * 
 * To be used with web-vitals library:
 * import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals'
 */
export interface WebVitals {
  CLS?: number  // Cumulative Layout Shift
  FID?: number  // First Input Delay
  FCP?: number  // First Contentful Paint
  LCP?: number  // Largest Contentful Paint
  TTFB?: number // Time to First Byte
}

let webVitals: WebVitals = {}

export function recordWebVital(name: keyof WebVitals, value: number) {
  webVitals[name] = value
  logger.info(`📈 Web Vital - ${name}: ${value.toFixed(2)}`)
}

export function getWebVitals(): WebVitals {
  return { ...webVitals }
}


/**
 * PILAR-2b V3 - API Request Queue
 * Manages API requests with rate limiting, retries, and priority
 * Prevents 429 errors by throttling requests
 */

import { logger } from './logger';

interface QueueItem<T> {
  requestFn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: any) => void;
  priority: number;
  retries: number;
  maxRetries: number;
}

class ApiRequestQueue {
  private queue: QueueItem<any>[] = [];
  private processing = false;
  private requestDelay: number;
  private lastRequestTime = 0;

  constructor(requestDelay = 200) {
    this.requestDelay = requestDelay; // 200ms between requests
  }

  /**
   * Add a request to the queue
   * Higher priority requests are processed first
   */
  async enqueue<T>(
    requestFn: () => Promise<T>,
    options: { priority?: number; maxRetries?: number } = {}
  ): Promise<T> {
    const { priority = 0, maxRetries = 3 } = options;

    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        requestFn,
        resolve,
        reject,
        priority,
        retries: 0,
        maxRetries,
      });

      // Sort by priority (higher first)
      this.queue.sort((a, b) => b.priority - a.priority);

      // Start processing if not already
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift()!;

      // Ensure minimum delay between requests
      const timeSinceLastRequest = Date.now() - this.lastRequestTime;
      if (timeSinceLastRequest < this.requestDelay) {
        await this.sleep(this.requestDelay - timeSinceLastRequest);
      }

      try {
        this.lastRequestTime = Date.now();
        const result = await item.requestFn();
        item.resolve(result);
      } catch (error: any) {
        // Handle rate limiting with retry
        if (error.status === 429 && item.retries < item.maxRetries) {
          const backoffTime = this.calculateBackoff(item.retries);
          logger.warn(
            `Rate limited. Retry ${item.retries + 1}/${item.maxRetries} in ${backoffTime}ms`
          );

          item.retries++;
          // Re-add to front of queue after backoff
          setTimeout(() => {
            this.queue.unshift(item);
            this.processQueue();
          }, backoffTime);
        } else {
          item.reject(error);
        }
      }
    }

    this.processing = false;
  }

  private calculateBackoff(retryCount: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s...
    return Math.pow(2, retryCount) * 1000;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Clear all pending requests
   */
  clear(): void {
    this.queue.forEach(item => {
      item.reject(new Error('Queue cleared'));
    });
    this.queue = [];
    logger.info('Request queue cleared');
  }
}

// Global queue instance
export const apiQueue = new ApiRequestQueue();

/**
 * Fetch wrapper that uses the request queue
 */
export async function fetchWithQueue(
  url: string,
  options?: RequestInit,
  queueOptions?: { priority?: number; maxRetries?: number }
): Promise<Response> {
  return apiQueue.enqueue(async () => {
    const response = await fetch(url, options);

    // Throw error for non-OK responses to trigger retry logic
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`) as any;
      error.status = response.status;
      error.response = response;
      throw error;
    }

    return response;
  }, queueOptions);
}

/**
 * Debounce wrapper for API calls
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * Throttle wrapper for API calls
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

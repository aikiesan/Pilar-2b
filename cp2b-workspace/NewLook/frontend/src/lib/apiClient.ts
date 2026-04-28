/**
 * Shared API Client Utility
 * Provides authentication headers for API requests
 */

import { logger } from '@/lib/logger';

/**
 * Get authentication headers from Supabase session
 * Returns headers with Authorization Bearer token if user is authenticated
 */
export async function getAuthHeaders(): Promise<HeadersInit> {
  return {
    'Content-Type': 'application/json',
  };
}

/**
 * Make an authenticated API call
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = await getAuthHeaders();

  return fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });
}

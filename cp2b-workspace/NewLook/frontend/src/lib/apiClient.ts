/**
 * Shared API Client Utility
 * Provides authentication headers (local VM-hosted JWT) for API requests.
 */

/** localStorage key for the local access token. Shared with AuthContext. */
export const TOKEN_STORAGE_KEY = 'pilar2b-auth-token';

/** Read the stored access token (null on server or when absent). */
export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (token) window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    /* ignore quota / private-mode errors */
  }
}

/**
 * Get authentication headers for API requests.
 * Attaches `Authorization: Bearer <token>` when a token is present.
 */
export async function getAuthHeaders(): Promise<HeadersInit> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = getStoredToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

/**
 * Make an authenticated API call.
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

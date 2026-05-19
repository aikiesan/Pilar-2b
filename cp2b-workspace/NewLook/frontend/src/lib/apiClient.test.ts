/**
 * Tests for API Client
 * Tests authentication headers and authenticated fetch functionality
 */

import { getAuthHeaders, authenticatedFetch } from './apiClient';

// Mock Supabase
const mockGetSession = jest.fn();
const mockCreateClient = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args: any[]) => mockCreateClient(...args),
}));

describe('apiClient', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    process.env = { ...originalEnv };
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

    // Setup default mock behavior
    mockCreateClient.mockReturnValue({
      auth: {
        getSession: mockGetSession,
      },
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getAuthHeaders', () => {
    it('should return headers with authorization token when user is authenticated', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            access_token: 'test-access-token',
          },
        },
      });

      const headers = await getAuthHeaders();

      expect(headers).toEqual({
        Authorization: 'Bearer test-access-token',
        'Content-Type': 'application/json',
      });
    });

    it('should return headers without authorization when no session exists', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: null,
        },
      });

      const headers = await getAuthHeaders();

      expect(headers).toEqual({
        'Content-Type': 'application/json',
      });
    });

    it('should return headers without authorization when session has no token', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            access_token: null,
          },
        },
      });

      const headers = await getAuthHeaders();

      expect(headers).toEqual({
        'Content-Type': 'application/json',
      });
    });

    it('should handle missing Supabase URL', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;

      const headers = await getAuthHeaders();

      expect(headers).toEqual({
        'Content-Type': 'application/json',
      });
      expect(mockCreateClient).not.toHaveBeenCalled();
    });

    it('should handle missing Supabase key', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      const headers = await getAuthHeaders();

      expect(headers).toEqual({
        'Content-Type': 'application/json',
      });
      expect(mockCreateClient).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockGetSession.mockRejectedValue(new Error('Session error'));

      const headers = await getAuthHeaders();

      expect(headers).toEqual({
        'Content-Type': 'application/json',
      });
    });

    it('should create Supabase client with correct credentials', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
      });

      await getAuthHeaders();

      expect(mockCreateClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-anon-key'
      );
    });
  });

  describe('authenticatedFetch', () => {
    beforeEach(() => {
      // Mock global fetch
      global.fetch = jest.fn();
    });

    it('should make fetch request with auth headers', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            access_token: 'test-token',
          },
        },
      });

      const mockResponse = { ok: true, json: async () => ({ data: 'test' }) };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await authenticatedFetch('/api/test');

      expect(global.fetch).toHaveBeenCalledWith('/api/test', {
        headers: {
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        },
      });
    });

    it('should merge custom headers with auth headers', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            access_token: 'test-token',
          },
        },
      });

      const mockResponse = { ok: true };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await authenticatedFetch('/api/test', {
        headers: {
          'X-Custom-Header': 'custom-value',
        },
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/test', {
        headers: {
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
          'X-Custom-Header': 'custom-value',
        },
      });
    });

    it('should pass through other fetch options', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
      });

      const mockResponse = { ok: true };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await authenticatedFetch('/api/test', {
        method: 'POST',
        body: JSON.stringify({ data: 'test' }),
        signal: new AbortController().signal,
      });

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      expect(fetchCall[1].method).toBe('POST');
      expect(fetchCall[1].body).toBe(JSON.stringify({ data: 'test' }));
      expect(fetchCall[1].signal).toBeDefined();
    });

    it('should allow custom headers to override auth headers', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            access_token: 'test-token',
          },
        },
      });

      const mockResponse = { ok: true };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await authenticatedFetch('/api/test', {
        headers: {
          'Content-Type': 'application/xml',
        },
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/test', {
        headers: {
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/xml', // Custom value overrides
        },
      });
    });

    it('should return fetch response', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
      });

      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const response = await authenticatedFetch('/api/test');

      expect(response).toBe(mockResponse);
    });

    it('should work without session', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
      });

      const mockResponse = { ok: true };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await authenticatedFetch('/api/test');

      expect(global.fetch).toHaveBeenCalledWith('/api/test', {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    it('should handle fetch errors', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
      });

      const fetchError = new Error('Network error');
      (global.fetch as jest.Mock).mockRejectedValue(fetchError);

      await expect(authenticatedFetch('/api/test')).rejects.toThrow('Network error');
    });

    it('should handle different HTTP methods', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
      });

      const mockResponse = { ok: true };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

      for (const method of methods) {
        await authenticatedFetch('/api/test', { method });

        expect(global.fetch).toHaveBeenCalledWith('/api/test', {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }
    });

    it('should handle full URL paths', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
      });

      const mockResponse = { ok: true };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await authenticatedFetch('https://api.example.com/v1/test');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/v1/test',
        expect.any(Object)
      );
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

    it('should return basic headers in SSR environment', async () => {
      const headers = await getAuthHeaders();

      expect(headers).toEqual({
        'Content-Type': 'application/json',
      });
    });

    it('should not attempt to access Supabase in SSR', async () => {
      await getAuthHeaders();

      // Should not create client in SSR
      expect(mockCreateClient).not.toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('should handle malformed session response', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          // Missing session property
        },
      });

      const headers = await getAuthHeaders();

      expect(headers).toEqual({
        'Content-Type': 'application/json',
      });
    });

    it('should handle undefined session data', async () => {
      mockGetSession.mockResolvedValue({
        data: undefined,
      });

      const headers = await getAuthHeaders();

      expect(headers).toEqual({
        'Content-Type': 'application/json',
      });
    });

    it('should handle empty access token string', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            access_token: '',
          },
        },
      });

      const headers = await getAuthHeaders();

      expect(headers).toEqual({
        'Content-Type': 'application/json',
      });
    });

    it('should handle Supabase client creation error', async () => {
      mockCreateClient.mockImplementation(() => {
        throw new Error('Client creation failed');
      });

      const headers = await getAuthHeaders();

      expect(headers).toEqual({
        'Content-Type': 'application/json',
      });
    });

    it('should handle getSession rejection', async () => {
      mockGetSession.mockRejectedValue(new Error('Session fetch failed'));

      const headers = await getAuthHeaders();

      expect(headers).toEqual({
        'Content-Type': 'application/json',
      });
    });
  });
});

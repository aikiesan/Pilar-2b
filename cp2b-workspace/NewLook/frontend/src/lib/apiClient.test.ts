/**
 * Tests for API Client
 *
 * The app no longer uses Supabase — auth is handled by the self-hosted backend
 * (FastAPI JWT). `getAuthHeaders()` currently returns only the JSON content
 * type; `authenticatedFetch()` merges those headers with any caller-supplied
 * options and delegates to `fetch`. These tests exercise that real behaviour.
 */

import { getAuthHeaders, authenticatedFetch } from './apiClient';

describe('apiClient', () => {
  describe('getAuthHeaders', () => {
    it('returns JSON content-type headers', async () => {
      const headers = await getAuthHeaders();
      expect(headers).toEqual({ 'Content-Type': 'application/json' });
    });

    it('is safe to call in an SSR environment (no window)', async () => {
      const originalWindow = global.window;
      delete (global as any).window;
      try {
        const headers = await getAuthHeaders();
        expect(headers).toEqual({ 'Content-Type': 'application/json' });
      } finally {
        global.window = originalWindow;
      }
    });
  });

  describe('authenticatedFetch', () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    it('makes a fetch request with the base auth headers', async () => {
      const mockResponse = { ok: true, json: async () => ({ data: 'test' }) };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await authenticatedFetch('/api/test');

      expect(global.fetch).toHaveBeenCalledWith('/api/test', {
        headers: { 'Content-Type': 'application/json' },
      });
    });

    it('merges custom headers with the auth headers', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

      await authenticatedFetch('/api/test', {
        headers: { 'X-Custom-Header': 'custom-value' },
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/test', {
        headers: {
          'Content-Type': 'application/json',
          'X-Custom-Header': 'custom-value',
        },
      });
    });

    it('lets custom headers override the defaults', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

      await authenticatedFetch('/api/test', {
        headers: { 'Content-Type': 'application/xml' },
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/test', {
        headers: { 'Content-Type': 'application/xml' },
      });
    });

    it('passes through other fetch options', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

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

    it('returns the fetch response', async () => {
      const mockResponse = { ok: true, status: 200, json: async () => ({ data: 'test' }) };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const response = await authenticatedFetch('/api/test');
      expect(response).toBe(mockResponse);
    });

    it('propagates fetch errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
      await expect(authenticatedFetch('/api/test')).rejects.toThrow('Network error');
    });

    it('handles different HTTP methods', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
      const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

      for (const method of methods) {
        await authenticatedFetch('/api/test', { method });
        expect(global.fetch).toHaveBeenCalledWith('/api/test', {
          method,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    });

    it('handles full URL paths', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

      await authenticatedFetch('https://api.example.com/v1/test');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/v1/test',
        expect.any(Object)
      );
    });
  });
});

/**
 * Tests for the real (VM-local, JWT) AuthContext.
 *
 * `fetch` is mocked so the provider talks to a fake auth API. Covers: no-session
 * start, token-restored session, login/logout, and the useAuth() guard.
 */
import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '../AuthContext'
import { TOKEN_STORAGE_KEY } from '@/lib/apiClient'

jest.mock('@/lib/logger', () => ({
  logger: { warn: jest.fn(), debug: jest.fn(), info: jest.fn(), error: jest.fn() },
}))

const PROFILE = {
  id: 'u1',
  email: 'internal@cp2b.unicamp.br',
  full_name: 'Internal User',
  role: 'interno',
  clearance: 1,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

function jsonResponse(data: unknown, ok = true, status = 200) {
  return Promise.resolve({ ok, status, json: async () => data } as Response)
}

// Route the mocked fetch by URL + method.
function installFetchMock() {
  const fn = jest.fn((url: string, options: RequestInit = {}) => {
    const method = (options.method || 'GET').toUpperCase()
    if (url.endsWith('/auth/login')) {
      return jsonResponse({ access_token: 'signed.jwt', token_type: 'bearer', user: PROFILE })
    }
    if (url.endsWith('/auth/logout')) return jsonResponse({ message: 'Logout successful' })
    if (url.endsWith('/auth/me') && method === 'GET') return jsonResponse(PROFILE)
    if (url.endsWith('/auth/me') && method === 'PUT')
      return jsonResponse({ ...PROFILE, full_name: 'Renamed' })
    return jsonResponse({ detail: 'not found' }, false, 404)
  })
  // @ts-expect-error jsdom global
  global.fetch = fn
  return fn
}

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  )
}
const renderAuth = () => renderHook(() => useAuth(), { wrapper: createWrapper() })

describe('AuthContext (real)', () => {
  beforeEach(() => {
    localStorage.clear()
    jest.clearAllMocks()
    installFetchMock()
  })

  it('throws when used outside an AuthProvider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used within an AuthProvider')
    spy.mockRestore()
  })

  it('starts with no session when there is no token', async () => {
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('restores the session from a stored token via /auth/me', async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'existing.jwt')
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.user?.email).toBe(PROFILE.email)
    expect(result.current.isInternal).toBe(true)
    expect(result.current.hasClearance(1)).toBe(true)
    expect(result.current.hasClearance(2)).toBe(false)
  })

  it('clears stale supabase tokens on mount', async () => {
    localStorage.setItem('sb-project-auth-token', 'stale')
    localStorage.setItem('unrelated-key', 'keep')
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(localStorage.getItem('sb-project-auth-token')).toBeNull()
    expect(localStorage.getItem('unrelated-key')).toBe('keep')
  })

  it('login stores the token and sets the user', async () => {
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => {
      await result.current.login({ email: PROFILE.email, password: 'Password123' })
    })
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBe('signed.jwt')
    expect(result.current.user?.role).toBe('interno')
    expect(result.current.isAuthenticated).toBe(true)
  })

  it('logout clears the token and the user', async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'existing.jwt')
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => {
      await result.current.logout()
    })
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull()
    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })
})

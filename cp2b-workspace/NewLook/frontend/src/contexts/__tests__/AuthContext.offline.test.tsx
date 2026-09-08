/**
 * Tests for AuthContext in OFFLINE mode (NEXT_PUBLIC_DISABLE_AUTH=true).
 *
 * AUTH_DISABLED is read once at module import time, so this lives in its own
 * file: the env is set BEFORE the module is require()'d (below the ES imports,
 * which are hoisted). AuthContext is pulled in via require rather than a static
 * import so it loads after the env is set while still sharing this file's single
 * React instance — a static re-import under jest.isolateModules would duplicate
 * React and break hooks.
 */
import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

jest.mock('@/lib/logger', () => ({
  logger: { warn: jest.fn(), debug: jest.fn(), info: jest.fn(), error: jest.fn() },
}))

process.env.NEXT_PUBLIC_DISABLE_AUTH = 'true'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { AuthProvider, useAuth } = require('../AuthContext')

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    )
  }
  return Wrapper
}
const renderAuth = () => renderHook(() => useAuth(), { wrapper: createWrapper() })

describe('AuthContext (offline mode)', () => {
  beforeEach(() => {
    localStorage.clear()
    jest.clearAllMocks()
    // A fetch spy that fails loudly — offline mode must never hit the network.
    global.fetch = jest.fn(() => {
      throw new Error('offline mode must not call fetch')
    }) as unknown as typeof fetch
  })

  it('signs in the test user immediately, with no backend call', async () => {
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user?.email).toBe('test@example.org')
    expect(result.current.user?.role).toBe('interno')
    expect(result.current.isInternal).toBe(true)
    expect(result.current.hasClearance(2)).toBe(true)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('logout keeps the visitor signed in as the test user', async () => {
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => {
      await result.current.logout()
    })
    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user?.email).toBe('test@example.org')
    // No session to end, so still no network.
    expect(global.fetch).not.toHaveBeenCalled()
  })

  // The synthetic user is a FALLBACK for anonymous visitors, not an override.
  // Login used to short-circuit here — it set the test user, called nothing and
  // stored no token — which made signing in impossible on the public site and
  // left the token-gated beta layers unreachable.
  describe('a real login still works', () => {
    const ADMIN = {
      id: 'real-uid',
      email: 'admin@example.org',
      full_name: 'Real Admin',
      role: 'admin',
      clearance: 2,
      is_active: true,
      created_at: new Date(0).toISOString(),
      updated_at: new Date(0).toISOString(),
    }

    const jsonOnce = (body: unknown) =>
      Promise.resolve({ ok: true, status: 200, json: async () => body } as Response)

    it('calls the backend, stores the token and adopts the real user', async () => {
      global.fetch = jest.fn(() =>
        jsonOnce({ access_token: 'real-jwt', user: ADMIN }),
      ) as unknown as typeof fetch

      const { result } = renderAuth()
      await waitFor(() => expect(result.current.loading).toBe(false))
      await act(async () => {
        await result.current.login({ email: ADMIN.email, password: 'pw' })
      })

      expect(global.fetch).toHaveBeenCalledTimes(1)
      expect(localStorage.getItem('pilar2b-auth-token')).toBe('real-jwt')
      expect(result.current.user?.email).toBe(ADMIN.email)
      expect(result.current.isAdmin).toBe(true)
    })

    it('logging out drops the token and falls back to the test user', async () => {
      global.fetch = jest.fn(() =>
        jsonOnce({ access_token: 'real-jwt', user: ADMIN }),
      ) as unknown as typeof fetch

      const { result } = renderAuth()
      await waitFor(() => expect(result.current.loading).toBe(false))
      await act(async () => {
        await result.current.login({ email: ADMIN.email, password: 'pw' })
      })
      await act(async () => {
        await result.current.logout()
      })

      expect(localStorage.getItem('pilar2b-auth-token')).toBeNull()
      expect(result.current.user?.email).toBe('test@example.org')
    })

    it('a stored token is revalidated on mount instead of being ignored', async () => {
      // The reload case: open mode used to skip session loading entirely, so a
      // real session silently degraded to the test user on every page load
      // while its token stayed in localStorage.
      localStorage.setItem('pilar2b-auth-token', 'real-jwt')
      global.fetch = jest.fn(() => jsonOnce(ADMIN)) as unknown as typeof fetch

      const { result } = renderAuth()
      await waitFor(() => expect(result.current.user?.email).toBe(ADMIN.email))
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('a rejected token is discarded and the visitor returns to the test user', async () => {
      localStorage.setItem('pilar2b-auth-token', 'expired')
      global.fetch = jest.fn(() =>
        Promise.resolve({ ok: false, status: 401, json: async () => ({}) } as Response),
      ) as unknown as typeof fetch

      const { result } = renderAuth()
      await waitFor(() => expect(result.current.loading).toBe(false))
      expect(localStorage.getItem('pilar2b-auth-token')).toBeNull()
      expect(result.current.user?.email).toBe('test@example.org')
    })
  })
})

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

  it('login is a no-op that keeps the test user (no network)', async () => {
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => {
      await result.current.login({ email: 'whoever@example.org', password: 'irrelevant' })
    })
    expect(result.current.user?.email).toBe('test@example.org')
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
    expect(global.fetch).not.toHaveBeenCalled()
  })
})

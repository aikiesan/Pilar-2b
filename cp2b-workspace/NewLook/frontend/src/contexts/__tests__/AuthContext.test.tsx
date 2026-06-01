/**
 * Tests for AuthContext
 *
 * Authentication is currently disabled in the app — the provider treats every
 * visitor as a local admin user (Supabase has been removed). These tests cover
 * that real behaviour: the mock user, the no-op auth methods, and the
 * useAuth() guard.
 */
import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '../AuthContext'

jest.mock('@/lib/logger', () => ({
  logger: { warn: jest.fn(), debug: jest.fn(), info: jest.fn(), error: jest.fn() },
}))

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  )
  Wrapper.displayName = 'TestWrapper'
  return Wrapper
}

const renderAuth = () => renderHook(() => useAuth(), { wrapper: createWrapper() })

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear()
    jest.clearAllMocks()
  })

  describe('useAuth hook', () => {
    it('throws when used outside an AuthProvider', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
      expect(() => renderHook(() => useAuth())).toThrow(
        'useAuth must be used within an AuthProvider'
      )
      spy.mockRestore()
    })
  })

  describe('Initial state', () => {
    it('loads the mock admin user and finishes loading', async () => {
      const { result } = renderAuth()

      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(result.current.user).not.toBeNull()
      expect(result.current.user?.email).toBe('local@cp2b.com')
      expect(result.current.user?.role).toBe('admin')
      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.isAdmin).toBe(true)
      expect(result.current.isAutenticado).toBe(true)
    })

    it('clears any leftover supabase auth tokens from localStorage on mount', async () => {
      localStorage.setItem('sb-project-auth-token', 'stale')
      localStorage.setItem('unrelated-key', 'keep')

      const { result } = renderAuth()
      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(localStorage.getItem('sb-project-auth-token')).toBeNull()
      expect(localStorage.getItem('unrelated-key')).toBe('keep')
    })
  })

  describe('Auth methods', () => {
    it('login sets the user to the provided email', async () => {
      const { result } = renderAuth()
      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        await result.current.login({ email: 'someone@example.com', password: 'x' })
      })

      expect(result.current.user?.email).toBe('someone@example.com')
      expect(result.current.isAuthenticated).toBe(true)
    })

    it('register sets the user email and full name', async () => {
      const { result } = renderAuth()
      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        await result.current.register({
          email: 'new@example.com',
          password: 'x',
          full_name: 'New Person',
        } as any)
      })

      expect(result.current.user?.email).toBe('new@example.com')
      expect(result.current.user?.full_name).toBe('New Person')
    })

    it('updateProfile updates the full name', async () => {
      const { result } = renderAuth()
      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        await result.current.updateProfile('Renamed User')
      })

      expect(result.current.user?.full_name).toBe('Renamed User')
    })

    it('logout keeps the visitor authenticated (auth disabled)', async () => {
      const { result } = renderAuth()
      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        await result.current.logout()
      })

      // Auth is disabled, so logout resets to the mock user rather than null.
      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.user?.email).toBe('local@cp2b.com')
    })
  })
})

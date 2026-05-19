/**
 * Tests for AuthContext
 */
import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '../AuthContext'
import { supabase } from '@/lib/supabase/client'
import type { UserProfile } from '@/types/auth'

// Mock the supabase client
jest.mock('@/lib/supabase/client')

// Mock the logger
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
  },
}))

describe('AuthContext', () => {
  const mockUser: UserProfile = {
    id: 'test-user-id',
    email: 'test@example.com',
    full_name: 'Test User',
    role: 'autenticado',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }

  const mockSession = {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      user_metadata: {
        full_name: 'Test User',
      },
    },
    access_token: 'mock-access-token',
  }

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks()

    // Mock Supabase auth methods that are always needed
    ;(supabase.auth.getSession as jest.Mock) = jest.fn().mockResolvedValue({
      data: { session: null },
      error: null,
    })

    ;(supabase.auth.onAuthStateChange as jest.Mock) = jest.fn().mockReturnValue({
      data: {
        subscription: {
          unsubscribe: jest.fn(),
        },
      },
    })

    // Mock supabase.auth.getUser by default
    ;(supabase.auth.getUser as jest.Mock) = jest.fn().mockResolvedValue({
      data: { user: null },
      error: null,
    })

    // Mock supabase.auth methods
    ;(supabase.auth.signUp as jest.Mock) = jest.fn()
    ;(supabase.auth.signInWithPassword as jest.Mock) = jest.fn()
    ;(supabase.auth.signOut as jest.Mock) = jest.fn()

    // Mock supabase.from to return null by default (tests can override)
    ;(supabase.from as jest.Mock) = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    })
  })

  afterEach(() => {
    // Clean up any pending timers or async operations
    jest.clearAllTimers()
  })

  describe('useAuth hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      // Suppress console error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      expect(() => {
        renderHook(() => useAuth())
      }).toThrow('useAuth must be used within an AuthProvider')

      consoleSpy.mockRestore()
    })

    it('should provide auth context when used within AuthProvider', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      expect(result.current).toBeDefined()
      expect(result.current).toHaveProperty('user')
      expect(result.current).toHaveProperty('loading')
      expect(result.current).toHaveProperty('login')
      expect(result.current).toHaveProperty('register')
      expect(result.current).toHaveProperty('logout')
      expect(result.current).toHaveProperty('updateProfile')
      expect(result.current).toHaveProperty('isAuthenticated')
      expect(result.current).toHaveProperty('isAdmin')
      expect(result.current).toHaveProperty('isAutenticado')
    })
  })

  describe('Initial state', () => {
    it('should start with null user and loading true', () => {
      ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      expect(result.current.user).toBeNull()
      expect(result.current.loading).toBe(true)
      expect(result.current.isAuthenticated).toBe(false)
    })

    it('should load user from existing session', async () => {
      ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
      })
      ;(supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockSession.user },
      })
      ;(supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: mockUser,
          error: null,
        }),
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.user).not.toBeNull()
      expect(result.current.isAuthenticated).toBe(true)
    })
  })

  describe('register', () => {
    it('should successfully register a new user', async () => {
      ;(supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: {
          user: mockSession.user,
          session: mockSession,
        },
        error: null,
      })
      ;(supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockSession.user },
      })
      ;(supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: mockUser,
          error: null,
        }),
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.register({
          email: 'test@example.com',
          password: 'password123',
          full_name: 'Test User',
        })
      })

      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: {
            full_name: 'Test User',
          },
        },
      })
      expect(result.current.user).not.toBeNull()
      expect(result.current.isAuthenticated).toBe(true)
    })

    it('should throw error on registration failure', async () => {
      const errorMessage = 'Email already registered'
      ;(supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: errorMessage },
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await expect(
        act(async () => {
          await result.current.register({
            email: 'test@example.com',
            password: 'password123',
            full_name: 'Test User',
          })
        })
      ).rejects.toThrow()
    })
  })

  describe('login', () => {
    it('should successfully login a user', async () => {
      ;(supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: {
          user: mockSession.user,
          session: mockSession,
        },
        error: null,
      })
      ;(supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockSession.user },
      })
      ;(supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: mockUser,
          error: null,
        }),
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.login({
          email: 'test@example.com',
          password: 'password123',
        })
      })

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
      expect(result.current.user).not.toBeNull()
      expect(result.current.isAuthenticated).toBe(true)
    })

    it('should throw error on login failure', async () => {
      const errorMessage = 'Invalid credentials'
      ;(supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: errorMessage },
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await expect(
        act(async () => {
          await result.current.login({
            email: 'test@example.com',
            password: 'wrong-password',
          })
        })
      ).rejects.toThrow()
    })
  })

  describe('logout', () => {
    it('should successfully logout a user', async () => {
      ;(supabase.auth.signOut as jest.Mock).mockResolvedValue({
        error: null,
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      // Set initial user
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.logout()
      })

      expect(supabase.auth.signOut).toHaveBeenCalled()
      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
    })

    it('should throw error on logout failure', async () => {
      const errorMessage = 'Logout failed'
      ;(supabase.auth.signOut as jest.Mock).mockResolvedValue({
        error: { message: errorMessage },
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await expect(
        act(async () => {
          await result.current.logout()
        })
      ).rejects.toThrow()
    })
  })

  describe('updateProfile', () => {
    it('should successfully update user profile', async () => {
      // Setup initial authenticated user
      ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
      })
      ;(supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockSession.user },
      })
      ;(supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: mockUser,
          error: null,
        }),
        update: jest.fn().mockReturnThis(),
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      await waitFor(() => {
        expect(result.current.user).not.toBeNull()
      })

      await act(async () => {
        await result.current.updateProfile('Updated Name')
      })

      expect(result.current.user?.full_name).toBe('Updated Name')
    })

    it('should throw error when no user is logged in', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await expect(
        act(async () => {
          await result.current.updateProfile('Updated Name')
        })
      ).rejects.toThrow('No user logged in')
    })
  })

  describe('Role checks', () => {
    it('should correctly identify admin users', async () => {
      const adminUser = { ...mockUser, role: 'admin' as const }
      ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
      })
      ;(supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockSession.user },
      })
      ;(supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: adminUser,
          error: null,
        }),
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      await waitFor(() => {
        expect(result.current.user).not.toBeNull()
      })

      expect(result.current.isAdmin).toBe(true)
      expect(result.current.isAutenticado).toBe(true)
    })

    it('should correctly identify authenticated non-admin users', async () => {
      ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
      })
      ;(supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockSession.user },
      })
      ;(supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: mockUser,
          error: null,
        }),
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      })

      await waitFor(() => {
        expect(result.current.user).not.toBeNull()
      })

      expect(result.current.isAdmin).toBe(false)
      expect(result.current.isAutenticado).toBe(true)
    })
  })
})

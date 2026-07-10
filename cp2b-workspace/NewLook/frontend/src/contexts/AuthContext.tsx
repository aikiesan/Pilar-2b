'use client'

/**
 * Authentication Context Provider for PILAR-2b V3.
 *
 * Real, VM-local auth: talks to the FastAPI auth endpoints, stores a JWT in
 * localStorage (shared with apiClient so every authenticated request carries it),
 * and exposes role + data-clearance helpers for gating internal/confidential tools.
 * Registration is invite-only (admin creates accounts via POST /auth/users).
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type {
  AuthContextType,
  UserProfile,
  LoginCredentials,
  RegistrationData,
} from '@/types/auth'
import { authenticatedFetch, setStoredToken, getStoredToken } from '@/lib/apiClient'
import { logger } from '@/lib/logger'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''
const AUTH = `${API_BASE_URL}/api/v1/auth`

// Offline mode (pre-VM phase): with NEXT_PUBLIC_DISABLE_AUTH=true the app makes
// NO backend auth calls at all — every visitor is transparently signed in as
// TEST_USER. Flip the env back to 'false' (the default) to restore real,
// invite-only VM auth. See docs/deployment/AUTH_VM_DEPLOYMENT.md.
const AUTH_DISABLED = process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true'

// Synthetic user used ONLY in offline mode. 'interno' + clearance 2 opens every
// research/analysis tool and confidential data tier so the whole app is
// explorable locally; it deliberately is NOT 'admin', so the admin-only account
// management UI (which needs the real backend) stays hidden rather than 401-ing.
const TEST_USER: UserProfile = {
  id: '00000000-0000-0000-0000-000000000000',
  email: 'test@example.org',
  full_name: 'Usuário de Teste',
  role: 'interno',
  clearance: 2,
  is_active: true,
  created_at: new Date(0).toISOString(),
  updated_at: new Date(0).toISOString(),
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(AUTH_DISABLED ? TEST_USER : null)
  const [loading, setLoading] = useState(!AUTH_DISABLED)
  const queryClient = useQueryClient()

  // On mount: if a token exists, validate it by loading the profile.
  useEffect(() => {
    // Offline mode: nothing to load — TEST_USER is already the initial state.
    if (AUTH_DISABLED) return
    let cancelled = false
    async function loadSession() {
      // Clean up any stale Supabase tokens from the previous (mock) auth.
      try {
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith('sb-') && key.endsWith('-auth-token')) localStorage.removeItem(key)
        })
      } catch { /* ignore */ }

      if (!getStoredToken()) {
        if (!cancelled) setLoading(false)
        return
      }
      try {
        const res = await authenticatedFetch(`${AUTH}/me`)
        if (!res.ok) throw new Error(`me ${res.status}`)
        const profile = (await res.json()) as UserProfile
        if (!cancelled) setUser(profile)
      } catch {
        setStoredToken(null) // invalid/expired → drop it
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadSession()
    return () => { cancelled = true }
  }, [])

  const login = useCallback(async (credentials: LoginCredentials) => {
    if (AUTH_DISABLED) { setUser(TEST_USER); return }
    const res = await authenticatedFetch(`${AUTH}/login`, {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
    if (!res.ok) {
      const detail = await res.json().catch(() => ({}))
      throw new Error(detail?.detail || 'Login failed')
    }
    const data = await res.json()
    setStoredToken(data.access_token)
    setUser(data.user as UserProfile)
    queryClient.clear()
  }, [queryClient])

  // Invite-only: hits the admin create-user endpoint (403 unless the caller is admin).
  const register = useCallback(async (data: RegistrationData) => {
    if (AUTH_DISABLED) return
    const res = await authenticatedFetch(`${AUTH}/users`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const detail = await res.json().catch(() => ({}))
      throw new Error(detail?.detail || 'Registration is invite-only')
    }
  }, [])

  const logout = useCallback(async () => {
    // Offline mode: there is no session — stay signed in as the test user.
    if (AUTH_DISABLED) { setUser(TEST_USER); return }
    try {
      await authenticatedFetch(`${AUTH}/logout`, { method: 'POST' })
    } catch (e) {
      logger.debug('[Auth] logout request failed (token cleared anyway)', e)
    }
    setStoredToken(null)
    setUser(null)
    queryClient.clear()
  }, [queryClient])

  const updateProfile = useCallback(async (full_name: string) => {
    if (AUTH_DISABLED) { setUser((u) => (u ? { ...u, full_name } : u)); return }
    const res = await authenticatedFetch(`${AUTH}/me`, {
      method: 'PUT',
      body: JSON.stringify({ full_name }),
    })
    if (!res.ok) throw new Error('Profile update failed')
    setUser((await res.json()) as UserProfile)
  }, [])

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    updateProfile,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isAutenticado: user?.role === 'autenticado' || user?.role === 'interno' || user?.role === 'admin',
    isInternal: user?.role === 'interno' || user?.role === 'admin',
    hasClearance: (level: number) => (user?.clearance ?? 0) >= level,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

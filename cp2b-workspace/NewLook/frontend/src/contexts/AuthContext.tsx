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
import { authenticatedFetch, setStoredToken, getStoredToken, TOKEN_STORAGE_KEY } from '@/lib/apiClient'
import { logger } from '@/lib/logger'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''
const AUTH = `${API_BASE_URL}/api/v1/auth`

// Open mode (NEXT_PUBLIC_DISABLE_AUTH=true, what the public site runs): an
// anonymous visitor is transparently signed in as TEST_USER so the whole
// platform is explorable without an account.
//
// TEST_USER is a FALLBACK, not an override. An explicit login still goes to the
// backend and a real token still wins. It used to be an override — login() set
// TEST_USER, called nothing and stored no token — which made signing in a no-op
// on the public site: token-gated features (the beta map layers) could not be
// unlocked at all, because the only way to hold a token was to plant one by
// hand. See docs/deployment/AUTH_VM_DEPLOYMENT.md.
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

// Who we are when no real session is held: the synthetic user in open mode,
// nobody otherwise.
const anonymousUser = (): UserProfile | null => (AUTH_DISABLED ? TEST_USER : null)

// Same-tab counterpart to the `storage` event, which only fires in OTHER tabs.
// Lets useRealSession() flip the header the moment a login or logout lands.
function announceAuthChange() {
  try {
    window.dispatchEvent(new Event('pilar2b-auth-changed'))
  } catch { /* SSR / no window */ }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(anonymousUser())
  // Open mode renders immediately as the anonymous user; the effect below only
  // upgrades that if a real token turns out to be stored. Blocking on a spinner
  // there would regress the public page for the sake of a rare case.
  const [loading, setLoading] = useState(!AUTH_DISABLED)
  const queryClient = useQueryClient()

  // On mount: if a token exists, validate it by loading the profile. This runs
  // in open mode too — otherwise a reload silently dropped a real session back
  // to TEST_USER while its token stayed in localStorage, so the header showed
  // the test user while token-gated features behaved as signed in.
  useEffect(() => {
    let cancelled = false
    async function loadSession() {
      // Clean up any stale Supabase tokens from the previous (mock) auth.
      try {
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith('sb-') && key.endsWith('-auth-token')) localStorage.removeItem(key)
        })
      } catch { /* ignore */ }

      if (!getStoredToken()) {
        if (!cancelled) { setUser(anonymousUser()); setLoading(false) }
        return
      }
      try {
        const res = await authenticatedFetch(`${AUTH}/me`)
        if (!res.ok) throw new Error(`me ${res.status}`)
        const profile = (await res.json()) as UserProfile
        if (!cancelled) setUser(profile)
      } catch {
        setStoredToken(null) // invalid/expired → drop it
        announceAuthChange()
        if (!cancelled) setUser(anonymousUser())
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadSession()

    // Another tab signing in or out changes the token under us. Without this the
    // header would flip to "signed in" (useRealSession reads localStorage) while
    // `user` still held the previous identity — a session shown under the wrong
    // name until the next reload.
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === TOKEN_STORAGE_KEY) loadSession()
    }
    window.addEventListener('storage', onStorage)
    return () => {
      cancelled = true
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  // Always real, open mode included — see the AUTH_DISABLED note above.
  const login = useCallback(async (credentials: LoginCredentials) => {
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
    announceAuthChange()
    setUser(data.user as UserProfile)
    queryClient.clear()
  }, [queryClient])

  // Invite-only: hits the admin create-user endpoint (403 unless the caller is admin).
  const register = useCallback(async (data: RegistrationData) => {
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
    // Only call the backend if there is a session to end; in open mode the
    // button can be reached with no token at all.
    if (getStoredToken()) {
      try {
        await authenticatedFetch(`${AUTH}/logout`, { method: 'POST' })
      } catch (e) {
        logger.debug('[Auth] logout request failed (token cleared anyway)', e)
      }
    }
    setStoredToken(null)
    announceAuthChange()
    // Open mode drops back to the anonymous browsing identity, not to nobody.
    setUser(anonymousUser())
    queryClient.clear()
  }, [queryClient])

  const updateProfile = useCallback(async (full_name: string) => {
    // No real session (open-mode visitor): the synthetic profile is local only.
    if (!getStoredToken()) { setUser((u) => (u ? { ...u, full_name } : u)); return }
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

'use client'

/**
 * Authentication Context Provider for PILAR-2b V3
 * Manages global authentication state and provides auth methods
 * NOTE: Authentication is currently disabled. All users are treated as authenticated.
 */
import React, { createContext, useContext, useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type {
  AuthContextType,
  UserProfile,
  LoginCredentials,
  RegistrationData
} from '@/types/auth'
import { logger } from '@/lib/logger'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const MOCK_USER: UserProfile = {
  id: 'mock-local-user-id',
  email: 'local@cp2b.com',
  full_name: 'Local User',
  role: 'admin',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const queryClient = useQueryClient()

  // Load mock user on mount
  useEffect(() => {
    logger.warn('Authentication disabled - using mock local admin user')
    setUser(MOCK_USER)
    setLoading(false)
  }, [queryClient])

  // Mock register
  const register = async (data: RegistrationData) => {
    logger.debug('[Auth] Mock register', data)
    setUser({ ...MOCK_USER, email: data.email, full_name: data.full_name })
  }

  // Mock login
  const login = async (credentials: LoginCredentials) => {
    logger.debug('[Auth] Mock login attempt:', credentials.email)
    setUser({ ...MOCK_USER, email: credentials.email })
  }

  // Mock logout
  const logout = async () => {
    logger.debug('[Auth] Mock logout attempt')
    // Reset to mock user anyway, or could set to null if we wanted to test UI state
    setUser(MOCK_USER) 
  }

  // Mock update profile
  const updateProfile = async (full_name: string) => {
    logger.debug('[Auth] Mock update profile:', full_name)
    if (user) {
      setUser({
        ...user,
        full_name,
        updated_at: new Date().toISOString()
      })
    }
  }

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    updateProfile,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isAutenticado: user?.role === 'autenticado' || user?.role === 'admin'
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

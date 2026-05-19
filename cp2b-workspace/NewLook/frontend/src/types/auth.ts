/**
 * Authentication types for PILAR-2b V3
 */

export type UserRole = 'visitante' | 'autenticado' | 'admin'

export interface UserProfile {
  id: string
  email: string
  full_name: string
  role: UserRole
  created_at: string
  updated_at: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
  user: UserProfile
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegistrationData {
  email: string
  password: string
  full_name: string
}

export interface AuthContextType {
  user: UserProfile | null
  loading: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  register: (data: RegistrationData) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (full_name: string) => Promise<void>
  isAuthenticated: boolean
  isAdmin: boolean
  isAutenticado: boolean
}

/**
 * Authentication types for PILAR-2b V3
 */

export type UserRole = 'visitante' | 'autenticado' | 'interno' | 'admin'

export interface UserProfile {
  id: string
  email: string
  full_name: string
  role: UserRole
  clearance: number // 0 public · 1 registered · 2 partner · 3 internal
  is_active: boolean
  /** Sign-up with approval; a session only exists for approved accounts. */
  status?: 'pending_email' | 'pending_review' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
}

export interface LoginCredentials {
  email: string
  password: string
}

/** An access request (POST /auth/signup): it waits for the e-mail, then for an admin. */
export interface RegistrationData {
  email: string
  password: string
  full_name: string
  institution: string
  purpose: string
  accept_terms: boolean
  /** The hidden field a person leaves empty. */
  website?: string
}

export interface AuthContextType {
  user: UserProfile | null
  /**
   * The REAL signed-in profile, never the open-mode TEST_USER: undefined while
   * a stored token is being checked, null without a session.
   */
  sessionUser: UserProfile | null | undefined
  loading: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  register: (data: RegistrationData) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (full_name: string) => Promise<void>
  isAuthenticated: boolean
  isAdmin: boolean
  isAutenticado: boolean
  isInternal: boolean
  hasClearance: (level: number) => boolean
}

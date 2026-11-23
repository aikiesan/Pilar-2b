/**
 * Who may use the map tools: a stored session whose real profile (/auth/me) is
 * approved at level 1 or above, read after mount, and never the open-mode
 * TEST_USER.
 */
import { act, renderHook } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { useMapToolAccess } from '../mapToolAccess'
import { TOKEN_STORAGE_KEY } from '../apiClient'
import type { UserProfile } from '@/types/auth'

let mockProfile: UserProfile | null | undefined
jest.mock('@/contexts/AuthContext', () => ({ useSessionUser: () => mockProfile }))

const profile = (over: Partial<UserProfile> = {}): UserProfile => ({
  id: 'u1',
  email: 'a@b.c',
  full_name: 'A',
  role: 'autenticado',
  clearance: 1,
  is_active: true,
  created_at: '',
  updated_at: '',
  status: 'approved',
  ...over,
})

function Probe() {
  return <span>{useMapToolAccess()}</span>
}

function signIn() {
  act(() => {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, 'jwt')
    window.dispatchEvent(new Event('pilar2b-auth-changed'))
  })
}

describe('useMapToolAccess', () => {
  beforeEach(() => {
    mockProfile = profile()
  })
  afterEach(() => window.localStorage.clear())

  it('is loading until the session has been read (server render, first paint)', () => {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, 'jwt')
    expect(renderToString(<Probe />)).toContain('loading')
  })

  it('asks to sign in without a stored session, whatever open mode says', () => {
    const { result } = renderHook(() => useMapToolAccess())
    expect(result.current).toBe('sign_in')
  })

  it('allows an approved session at level 1, and follows a sign-in in this tab', () => {
    const { result } = renderHook(() => useMapToolAccess())
    expect(result.current).toBe('sign_in')
    signIn()
    expect(result.current).toBe('allowed')
  })

  it('waits while the stored token is checked', () => {
    mockProfile = undefined
    const { result } = renderHook(() => useMapToolAccess())
    signIn()
    expect(result.current).toBe('loading')
  })

  it('asks to sign in again when the stored token was refused', () => {
    mockProfile = null
    const { result } = renderHook(() => useMapToolAccess())
    signIn()
    expect(result.current).toBe('sign_in')
  })

  it('keeps the tools closed for a session at level 0, or not approved', () => {
    mockProfile = profile({ clearance: 0 })
    const { result, rerender } = renderHook(() => useMapToolAccess())
    signIn()
    expect(result.current).toBe('pending')
    mockProfile = profile({ status: 'pending_review', clearance: 2 })
    rerender()
    expect(result.current).toBe('pending')
  })

  it('opens for every level above 1', () => {
    mockProfile = profile({ clearance: 3, role: 'admin' })
    const { result } = renderHook(() => useMapToolAccess())
    signIn()
    expect(result.current).toBe('allowed')
  })
})

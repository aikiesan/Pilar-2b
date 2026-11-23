/**
 * Who may use the map tools: a stored session, read after mount, and never
 * the open-mode TEST_USER.
 */
import { act, renderHook } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { useMapToolAccess } from '../mapToolAccess'
import { TOKEN_STORAGE_KEY } from '../apiClient'

function Probe() {
  return <span>{useMapToolAccess()}</span>
}

describe('useMapToolAccess', () => {
  afterEach(() => window.localStorage.clear())

  it('is loading until the session has been read (server render, first paint)', () => {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, 'jwt')
    expect(renderToString(<Probe />)).toContain('loading')
  })

  it('asks to sign in without a stored session, whatever open mode says', () => {
    const { result } = renderHook(() => useMapToolAccess())
    expect(result.current).toBe('sign_in')
  })

  it('allows a stored session, and follows a sign-in in this tab', () => {
    const { result } = renderHook(() => useMapToolAccess())
    expect(result.current).toBe('sign_in')
    act(() => {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, 'jwt')
      window.dispatchEvent(new Event('pilar2b-auth-changed'))
    })
    expect(result.current).toBe('allowed')
  })
})

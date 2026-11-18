import { renderToString } from 'react-dom/server'
import { renderHook } from '@testing-library/react'
import { useIsClient } from './useIsClient'

function Probe() {
  return <span>{useIsClient() ? 'client' : 'server'}</span>
}

describe('useIsClient', () => {
  it('is false while rendering on the server', () => {
    expect(renderToString(<Probe />)).toContain('server')
  })

  it('is true in the browser, from the first render', () => {
    expect(renderHook(() => useIsClient()).result.current).toBe(true)
  })
})

import { renderHook } from '@testing-library/react'
import type L from 'leaflet'
import { useRendererCleanup } from './useRendererCleanup'

const fakeMap = (onMap: boolean) => {
  const removeLayer = jest.fn()
  return { map: { hasLayer: jest.fn(() => onMap), removeLayer } as unknown as L.Map, removeLayer }
}

describe('useRendererCleanup', () => {
  it('takes the renderer off the map when the layer goes', () => {
    const { map, removeLayer } = fakeMap(true)
    const renderer = {} as L.Renderer
    const { unmount } = renderHook(() => useRendererCleanup(map, renderer))
    expect(removeLayer).not.toHaveBeenCalled()
    unmount()
    expect(removeLayer).toHaveBeenCalledWith(renderer)
  })

  it('leaves the map alone when the renderer never drew', () => {
    const { map, removeLayer } = fakeMap(false)
    const { unmount } = renderHook(() => useRendererCleanup(map, {} as L.Renderer))
    unmount()
    expect(removeLayer).not.toHaveBeenCalled()
  })

  it('does nothing without a renderer (a layer outside a pane)', () => {
    const { map, removeLayer } = fakeMap(true)
    const { unmount } = renderHook(() => useRendererCleanup(map, undefined))
    unmount()
    expect(removeLayer).not.toHaveBeenCalled()
  })
})

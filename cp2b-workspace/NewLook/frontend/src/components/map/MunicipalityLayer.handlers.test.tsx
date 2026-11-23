/**
 * The click and hover handlers change with the open tool, while Leaflet binds
 * them once per polygon, when the layer is made. The layer must call the
 * latest ones: opened with Truck reach, the map used to ignore municipality
 * clicks after the tool closed.
 */
import React from 'react'
import { render } from '@testing-library/react'
import MunicipalityLayer from './MunicipalityLayer'
import type { MunicipalityCollection, MunicipalityFeature } from '@/types/geospatial'
import { municipalityProps } from '@/test/fixtures/municipality'

// Handlers the layer bound on its one polygon, as Leaflet would keep them.
const mockBound: Record<string, (e?: unknown) => void> = {}

// Unlike the shared mock, this GeoJSON runs onEachFeature once, on mount, like
// the real layer: later renders don't bind again.
jest.mock('react-leaflet', () => {
  const ReactActual = jest.requireActual('react')
  // The shared leaflet mock (moduleNameMapper), the same L.Path the layer checks.
  const L = jest.requireActual('leaflet')
  return {
    GeoJSON: ({ data, onEachFeature }: { data: MunicipalityCollection; onEachFeature: (f: unknown, l: unknown) => void }) => {
      const bound = ReactActual.useRef(false)
      if (!bound.current && data.features.length > 0) {
        bound.current = true
        const layer = Object.assign(Object.create((L.default ?? L).Path.prototype), {
          on: (handlers: Record<string, (e?: unknown) => void>) => Object.assign(mockBound, handlers),
          bindTooltip: jest.fn(),
          bindPopup: jest.fn(),
          setStyle: jest.fn(),
          bringToFront: jest.fn(),
        })
        onEachFeature(data.features[0], layer)
      }
      return null
    },
  }
})

const data: MunicipalityCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [[[-48, -22], [-48.1, -22], [-48.1, -22.1], [-48, -22]]] },
      properties: municipalityProps({ name: 'Campinas', total_biogas_m3_year: 150000000 }),
    },
  ],
} as MunicipalityCollection

describe('MunicipalityLayer handlers', () => {
  beforeEach(() => {
    for (const key of Object.keys(mockBound)) delete mockBound[key]
  })

  it('calls the click handler the map has now, not the one it had at mount', () => {
    const whileTruckOpen = jest.fn()
    const afterClose = jest.fn()
    const { rerender } = render(<MunicipalityLayer data={data} onMunicipalityClick={whileTruckOpen} />)
    rerender(<MunicipalityLayer data={data} onMunicipalityClick={afterClose} />)

    mockBound.click()

    expect(whileTruckOpen).not.toHaveBeenCalled()
    expect(afterClose).toHaveBeenCalledWith(expect.objectContaining({ properties: expect.objectContaining({ name: 'Campinas' }) }) as MunicipalityFeature)
  })

  it('calls the hover handler the map has now', () => {
    const first = jest.fn()
    const latest = jest.fn()
    const { rerender } = render(<MunicipalityLayer data={data} onMunicipalityHover={first} onMunicipalityClick={jest.fn()} />)
    rerender(<MunicipalityLayer data={data} onMunicipalityHover={latest} onMunicipalityClick={jest.fn()} />)

    mockBound.mouseover({ target: { setStyle: jest.fn(), bringToFront: jest.fn() }, originalEvent: {} })

    expect(first).not.toHaveBeenCalled()
    expect(latest).toHaveBeenCalled()
  })
})

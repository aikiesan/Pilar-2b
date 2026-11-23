/**
 * A window leaves the way it came: on screen for its exit, showing what it
 * showed last, out of reach meanwhile; at once with reduced motion.
 */
import { act, render, screen } from '@testing-library/react'
import MapPresence from './MapPresence'

const setReducedMotion = (reduce: boolean) => {
  window.matchMedia = jest.fn().mockImplementation((query: string) => ({
    matches: reduce && query.includes('reduce'),
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }))
}

describe('MapPresence', () => {
  const original = window.matchMedia
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => {
    jest.useRealTimers()
    window.matchMedia = original
  })

  it('keeps the last frame for the exit, inert, then lets it go', () => {
    setReducedMotion(false)
    const { rerender, container } = render(<MapPresence show><p>Pair: A and B</p></MapPresence>)
    expect(screen.getByText('Pair: A and B')).toBeInTheDocument()

    // Closing clears the window's props; the exit still shows the last frame.
    rerender(<MapPresence show={false}><p>Pair: none</p></MapPresence>)
    expect(screen.getByText('Pair: A and B')).toBeInTheDocument()
    expect(screen.queryByText('Pair: none')).not.toBeInTheDocument()
    const wrapper = container.querySelector('.map-presence')!
    expect(wrapper).toHaveAttribute('data-leaving')
    expect(wrapper).toHaveAttribute('inert')

    act(() => { jest.advanceTimersByTime(160) })
    expect(screen.queryByText('Pair: A and B')).not.toBeInTheDocument()
  })

  it('comes back at once when opened again during the exit', () => {
    setReducedMotion(false)
    const { rerender, container } = render(<MapPresence show><p>One</p></MapPresence>)
    rerender(<MapPresence show={false}><p>One</p></MapPresence>)
    rerender(<MapPresence show><p>Two</p></MapPresence>)
    expect(screen.getByText('Two')).toBeInTheDocument()
    expect(container.querySelector('.map-presence')).not.toHaveAttribute('data-leaving')
    act(() => { jest.advanceTimersByTime(500) })
    expect(screen.getByText('Two')).toBeInTheDocument()
  })

  it('goes at once with reduced motion', () => {
    setReducedMotion(true)
    const { rerender } = render(<MapPresence show><p>Window</p></MapPresence>)
    rerender(<MapPresence show={false}><p>Window</p></MapPresence>)
    expect(screen.queryByText('Window')).not.toBeInTheDocument()
  })
})

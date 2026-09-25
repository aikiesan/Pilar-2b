/**
 * AnimatedCounter ends on its target, written the way the page's locale writes
 * it — the About page's "4.6 bi" used to read the same in English.
 */
import { render, screen } from '@testing-library/react'
import AnimatedCounter from '../AnimatedCounter'

let mockLocale = 'pt-BR'
jest.mock('next-intl', () => ({ useLocale: () => mockLocale }))

const RealIntersectionObserver = global.IntersectionObserver

beforeEach(() => {
  mockLocale = 'pt-BR'
  // In view at once, and every animation frame lands past the duration.
  global.IntersectionObserver = class {
    constructor(private readonly callback: IntersectionObserverCallback) {}
    observe() {
      this.callback([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver)
    }
    disconnect() {}
  } as unknown as typeof IntersectionObserver
  let now = 0
  jest.spyOn(window, 'requestAnimationFrame').mockImplementation((frame) => {
    frame((now += 5_000))
    return 0
  })
})

afterEach(() => {
  global.IntersectionObserver = RealIntersectionObserver
  jest.restoreAllMocks()
})

describe('AnimatedCounter', () => {
  it('shortens large magnitudes in the page language', () => {
    render(<AnimatedCounter end={4.6e9} decimals={1} compact />)
    expect(screen.getByText('4,6 bi')).toBeInTheDocument()
  })

  it('writes the same magnitude the English way on /en', () => {
    mockLocale = 'en'
    render(<AnimatedCounter end={4.6e9} decimals={1} compact />)
    expect(screen.getByText('4.6B')).toBeInTheDocument()
  })

  it('groups thousands and keeps the prefix', () => {
    render(<AnimatedCounter end={5571} prefix="~" />)
    expect(screen.getByText('~5.571')).toBeInTheDocument()
  })
})

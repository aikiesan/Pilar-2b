/** Anonymous counts follow every route; consented page views only while the visitor accepts. */
import React from 'react'
import { act, render } from '@testing-library/react'
import AnalyticsTracker from '../AnalyticsTracker'
import { countPageview, forgetVisitor, trackPageview } from '@/lib/analytics'
import { saveConsent } from '@/lib/consent'

jest.mock('next-intl', () => jest.requireActual('@/test/mocks/next-intl-real'))
let mockPathname = '/map'
jest.mock('@/navigation', () => ({ usePathname: () => mockPathname }))
jest.mock('@/lib/analytics', () => ({
  trackPageview: jest.fn(),
  forgetVisitor: jest.fn(),
  countPageview: jest.fn(),
  sendVisibleTime: jest.fn(),
}))

beforeEach(() => {
  localStorage.clear()
  jest.mocked(trackPageview).mockClear()
  jest.mocked(forgetVisitor).mockClear()
  jest.mocked(countPageview).mockClear()
  mockPathname = '/map'
})

describe('AnalyticsTracker', () => {
  it('sends nothing before the visitor accepts', () => {
    render(<AnalyticsTracker />)
    expect(trackPageview).not.toHaveBeenCalled()
  })

  it('counts the page as soon as the visitor accepts, then every route', () => {
    const { rerender } = render(<AnalyticsTracker />)
    act(() => saveConsent('all'))
    expect(trackPageview).toHaveBeenLastCalledWith('/map', 'pt-BR')

    mockPathname = '/guide'
    rerender(<AnalyticsTracker />)
    expect(trackPageview).toHaveBeenLastCalledWith('/guide', 'pt-BR')
    expect(trackPageview).toHaveBeenCalledTimes(2)
  })

  it('counts every route anonymously, with or without a choice', () => {
    const { rerender } = render(<AnalyticsTracker />)
    expect(countPageview).toHaveBeenLastCalledWith('/map', 'pt-BR')

    act(() => saveConsent('essential'))
    mockPathname = '/guide'
    rerender(<AnalyticsTracker />)

    expect(countPageview).toHaveBeenLastCalledWith('/guide', 'pt-BR')
    expect(countPageview).toHaveBeenCalledTimes(2) // a consent change is not a new page
    expect(trackPageview).not.toHaveBeenCalled()
  })

  it('forgets the visitor when statistics are refused', () => {
    saveConsent('all')
    render(<AnalyticsTracker />)
    act(() => saveConsent('essential'))

    expect(forgetVisitor).toHaveBeenCalled()
    expect(trackPageview).toHaveBeenCalledTimes(1) // the page viewed while accepted
  })
})

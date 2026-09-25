/** Page views follow the route, and only while the visitor accepts statistics. */
import React from 'react'
import { act, render } from '@testing-library/react'
import AnalyticsTracker from '../AnalyticsTracker'
import { forgetVisitor, trackPageview } from '@/lib/analytics'
import { saveConsent } from '@/lib/consent'

jest.mock('next-intl', () => jest.requireActual('@/test/mocks/next-intl-real'))
let mockPathname = '/map'
jest.mock('@/navigation', () => ({ usePathname: () => mockPathname }))
jest.mock('@/lib/analytics', () => ({ trackPageview: jest.fn(), forgetVisitor: jest.fn() }))

beforeEach(() => {
  localStorage.clear()
  jest.mocked(trackPageview).mockClear()
  jest.mocked(forgetVisitor).mockClear()
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

  it('forgets the visitor when statistics are refused', () => {
    saveConsent('all')
    render(<AnalyticsTracker />)
    act(() => saveConsent('essential'))

    expect(forgetVisitor).toHaveBeenCalled()
    expect(trackPageview).toHaveBeenCalledTimes(1) // the page viewed while accepted
  })
})

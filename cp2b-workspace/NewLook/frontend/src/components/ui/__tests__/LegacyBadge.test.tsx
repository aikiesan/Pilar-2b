/**
 * The legacy mark on the older tools' figures: visible text in both catalogs.
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import en from '../../../../messages/en.json'
import LegacyBadge from '../LegacyBadge'

jest.mock('next-intl', () => jest.requireActual('@/test/mocks/next-intl-real'))

describe('LegacyBadge', () => {
  it('reads "estimativa anterior (legado)" as visible text', () => {
    render(<LegacyBadge />)
    expect(screen.getByText('estimativa anterior (legado)')).toBeVisible()
  })

  it('has its English label', () => {
    expect(en.common.legacy.label).toBe('previous estimate (legacy)')
  })
})

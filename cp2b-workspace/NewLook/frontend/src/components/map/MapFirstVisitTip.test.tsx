import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import ptBR from '../../../messages/pt-BR.json'
import MapFirstVisitTip from './MapFirstVisitTip'

jest.mock('next-intl', () => jest.requireActual('@/test/mocks/next-intl-real'))

const TIP = ptBR.Map.first_visit

describe('MapFirstVisitTip', () => {
  beforeEach(() => window.localStorage.clear())

  it('shows on the first visit and says what to do first', () => {
    render(<MapFirstVisitTip />)
    expect(screen.getByRole('dialog', { name: TIP.title })).toHaveTextContent(TIP.body)
  })

  it('"Entendi" hides it, and it stays hidden on the next visit', () => {
    const { unmount } = render(<MapFirstVisitTip />)
    fireEvent.click(screen.getByRole('button', { name: TIP.dismiss }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    unmount()
    render(<MapFirstVisitTip />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('the close button hides it too', () => {
    render(<MapFirstVisitTip />)
    fireEvent.click(screen.getByRole('button', { name: TIP.close }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

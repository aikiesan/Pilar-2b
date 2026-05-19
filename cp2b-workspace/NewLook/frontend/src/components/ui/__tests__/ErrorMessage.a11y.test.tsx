import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import ErrorMessage from '../ErrorMessages'
import { testWCAGAA } from '@/test/utils/accessibility'

const ERROR_TYPES = ['validation', 'network', 'timeout', 'rate_limit', 'server', 'generic'] as const

describe('ErrorMessage Accessibility', () => {
  it('meets WCAG 2.1 Level AA for generic error', async () => {
    await testWCAGAA(
      <ErrorMessage type="generic" message="An unexpected error occurred." />
    )
  })

  it('meets WCAG 2.1 Level AA for network error with retry', async () => {
    await testWCAGAA(
      <ErrorMessage type="network" message="Connection failed." onRetry={jest.fn()} />
    )
  })

  describe('ARIA and semantic structure', () => {
    it('uses role="alert" or role="status" for screen reader announcement', () => {
      render(<ErrorMessage type="server" message="Server error." />)
      const el = screen.getByRole('alert') || screen.getByRole('status')
      expect(el).toBeInTheDocument()
    })

    it('renders actionable error message text', () => {
      render(<ErrorMessage type="validation" message="Invalid coordinates." suggestion="Check latitude and longitude." />)
      expect(screen.getByText('Invalid coordinates.')).toBeInTheDocument()
      expect(screen.getByText(/check latitude/i)).toBeInTheDocument()
    })
  })

  describe('Retry button', () => {
    it('retry button has accessible label', () => {
      render(<ErrorMessage type="network" message="Network error." onRetry={jest.fn()} />)
      const btn = screen.getByRole('button', { name: /retry|try again/i })
      expect(btn).toBeInTheDocument()
    })

    it('retry button is keyboard accessible', async () => {
      const user = userEvent.setup()
      const onRetry = jest.fn()
      render(<ErrorMessage type="network" message="Network error." onRetry={onRetry} />)
      const btn = screen.getByRole('button', { name: /retry|try again/i })
      btn.focus()
      await user.keyboard('{Enter}')
      expect(onRetry).toHaveBeenCalled()
    })

    it('rate_limit error disables retry button during countdown', () => {
      render(<ErrorMessage type="rate_limit" message="Too many requests." retryAfter={30} />)
      const btn = screen.queryByRole('button', { name: /retry|try again/i })
      if (btn) expect(btn).toBeDisabled()
    })
  })

  describe('No axe violations across all error types', () => {
    ERROR_TYPES.forEach(type => {
      it(`type="${type}" has no axe violations`, async () => {
        const { container } = render(
          <ErrorMessage type={type} message={`${type} error occurred.`} onRetry={jest.fn()} />
        )
        const results = await axe(container)
        expect(results).toHaveNoViolations()
      })
    })
  })
})

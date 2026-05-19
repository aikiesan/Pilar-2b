import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import Toast from '../Toast'
import { testWCAGAA } from '@/test/utils/accessibility'

jest.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({ removeToast: jest.fn() }),
}))

const makeToast = (overrides = {}) => ({
  id: '1',
  type: 'info' as const,
  message: 'Test notification',
  duration: 5000,
  ...overrides,
})

describe('Toast Accessibility', () => {
  it('info toast meets WCAG 2.1 Level AA', async () => {
    await testWCAGAA(<Toast toast={makeToast()} />)
  })

  it('error toast meets WCAG 2.1 Level AA', async () => {
    await testWCAGAA(<Toast toast={makeToast({ type: 'error', message: 'Something went wrong' })} />)
  })

  describe('ARIA roles', () => {
    it('error type uses role="alert" with aria-live="assertive"', () => {
      render(<Toast toast={makeToast({ type: 'error', message: 'Error occurred' })} />)
      const el = screen.getByRole('alert')
      expect(el).toHaveAttribute('aria-live', 'assertive')
    })

    it('non-error types use role="status" with aria-live="polite"', () => {
      const { rerender } = render(<Toast toast={makeToast({ type: 'info' })} />)
      expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')

      rerender(<Toast toast={makeToast({ type: 'success' })} />)
      expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')

      rerender(<Toast toast={makeToast({ type: 'warning' })} />)
      expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
    })
  })

  describe('Close button', () => {
    it('close button has accessible label', () => {
      render(<Toast toast={makeToast()} />)
      const btn = screen.getByRole('button', { name: /dismiss|close/i })
      expect(btn).toBeInTheDocument()
    })

    it('close button is keyboard accessible', async () => {
      const user = userEvent.setup()
      render(<Toast toast={makeToast()} />)
      const btn = screen.getByRole('button', { name: /dismiss|close/i })
      btn.focus()
      expect(btn).toHaveFocus()
      await user.keyboard('{Enter}')
    })

    it('has no axe violations with all toast types', async () => {
      for (const type of ['success', 'error', 'warning', 'info'] as const) {
        const { container, unmount } = render(<Toast toast={makeToast({ type, message: `${type} message` })} />)
        const results = await axe(container)
        expect(results).toHaveNoViolations()
        unmount()
      }
    })
  })
})

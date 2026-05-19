/**
 * LoadingSpinner Accessibility Tests
 * Tests for WCAG 2.1 Level AA compliance
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import LoadingSpinner from '../LoadingSpinner'
import { testWCAGAA, screenReaderUtils } from '@/test/utils/accessibility'

describe('LoadingSpinner Accessibility', () => {
  it('should meet WCAG 2.1 Level AA accessibility standards', async () => {
    const component = <LoadingSpinner />
    await testWCAGAA(component)
  })

  it('should have proper ARIA attributes', () => {
    render(<LoadingSpinner message="Loading data..." />)

    const container = screen.getByRole('status')
    expect(container).toBeInTheDocument()
    expect(container).toHaveAttribute('aria-live', 'polite')
  })

  it('should provide screen reader accessible text', () => {
    render(<LoadingSpinner />)

    const srText = screen.getByText('Loading...')
    expect(srText).toHaveClass('sr-only')
  })

  it('should properly label loading message when provided', () => {
    const message = 'Loading user data...'
    render(<LoadingSpinner message={message} />)

    const messageElement = screen.getByLabelText('Loading message')
    expect(messageElement).toHaveTextContent(message)
  })

  it('should be focusable and keyboard accessible', () => {
    render(<LoadingSpinner />)

    const container = screen.getByRole('status')
    // Loading indicators should not be focusable as they are informational
    expect(container).not.toHaveAttribute('tabindex')
  })

  it('should have appropriate semantic structure', () => {
    render(<LoadingSpinner message="Please wait..." />)

    // Should have a status role for screen readers
    const statusElement = screen.getByRole('status')
    expect(statusElement).toBeInTheDocument()

    // Should have proper aria-live region
    expect(statusElement).toHaveAttribute('aria-live', 'polite')
  })

  it('should handle different sizes without accessibility issues', async () => {
    const sizes = ['sm', 'md', 'lg'] as const

    for (const size of sizes) {
      const { unmount } = render(<LoadingSpinner size={size} />)
      await testWCAGAA(<LoadingSpinner size={size} />)
      unmount()
    }
  })

  it('should not have any color contrast violations', async () => {
    // Test with custom axe config focused on color contrast
    const component = <LoadingSpinner message="Loading..." />
    const { container } = render(component)

    const { axe } = await import('jest-axe')
    const results = await axe(container, {
      rules: {
        'color-contrast': { enabled: true },
      },
    })

    expect(results).toHaveNoViolations()
  })
})
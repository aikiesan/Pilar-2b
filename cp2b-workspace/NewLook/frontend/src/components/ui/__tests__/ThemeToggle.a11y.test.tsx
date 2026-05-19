import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import ThemeToggle from '../ThemeToggle'
import { testWCAGAA } from '@/test/utils/accessibility'

const mockSetTheme = jest.fn()

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({ resolvedTheme: 'dark', setTheme: mockSetTheme }),
}))

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      'theme.switch_to_light': 'Switch to light mode',
      'theme.switch_to_dark': 'Switch to dark mode',
    }
    return map[key] ?? key
  },
}))

describe('ThemeToggle Accessibility', () => {
  beforeEach(() => mockSetTheme.mockClear())

  it('meets WCAG 2.1 Level AA (dark variant)', async () => {
    await testWCAGAA(<ThemeToggle variant="dark" />)
  })

  it('meets WCAG 2.1 Level AA (light variant)', async () => {
    await testWCAGAA(<ThemeToggle variant="light" />)
  })

  it('has descriptive aria-label based on current theme', () => {
    render(<ThemeToggle />)
    const btn = screen.getByRole('button')
    expect(btn).toHaveAttribute('aria-label', 'Switch to light mode')
  })

  it('is keyboard accessible — Enter triggers theme change', async () => {
    const user = userEvent.setup()
    render(<ThemeToggle />)
    const btn = screen.getByRole('button')
    btn.focus()
    expect(btn).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(mockSetTheme).toHaveBeenCalledWith('light')
  })

  it('icon is aria-hidden so screen readers use the button label only', () => {
    render(<ThemeToggle />)
    const icons = document.querySelectorAll('svg')
    icons.forEach(icon => expect(icon).toHaveAttribute('aria-hidden', 'true'))
  })

  it('has no axe violations', async () => {
    const { container } = render(<ThemeToggle />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})

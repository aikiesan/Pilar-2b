/**
 * LanguageSwitcher Accessibility Tests
 * Tests for WCAG 2.1 Level AA compliance
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'
import { useRouter, usePathname } from 'next/navigation'
import LanguageSwitcher from '../LanguageSwitcher'
import {
  testWCAGAA,
  keyboardTestUtils,
  testFocusManagement,
  createA11yTestSuite
} from '@/test/utils/accessibility'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}))

// Mock next-intl
jest.mock('next-intl', () => ({
  useLocale: jest.fn(() => 'en'),
}))

const mockRouter = {
  push: jest.fn(),
  refresh: jest.fn(),
}

const mockMessages = {
  common: {
    language: 'Language',
  },
}

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={mockMessages}>
      {component}
    </NextIntlClientProvider>
  )
}

describe('LanguageSwitcher Accessibility', () => {
  beforeEach(() => {
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(usePathname as jest.Mock).mockReturnValue('/en/dashboard')
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should meet WCAG 2.1 Level AA accessibility standards', async () => {
    const component = <LanguageSwitcher />
    await testWCAGAA(component)
  })

  describe('ARIA Attributes', () => {
    it('should have proper button ARIA attributes', () => {
      renderWithProviders(<LanguageSwitcher />)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', 'Change language')
      expect(button).toHaveAttribute('aria-expanded', 'false')
      expect(button).toHaveAttribute('aria-haspopup', 'true')
    })

    it('should update aria-expanded when dropdown opens', async () => {
      const user = userEvent.setup()
      renderWithProviders(<LanguageSwitcher />)

      const button = screen.getByRole('button')

      // Initially closed
      expect(button).toHaveAttribute('aria-expanded', 'false')

      // Click to open
      await user.click(button)
      expect(button).toHaveAttribute('aria-expanded', 'true')
    })

    it('should have proper menu item roles', async () => {
      const user = userEvent.setup()
      renderWithProviders(<LanguageSwitcher />)

      const button = screen.getByRole('button')
      await user.click(button)

      const menuItems = screen.getAllByRole('menuitem')
      expect(menuItems).toHaveLength(2) // Portuguese and English

      menuItems.forEach(item => {
        expect(item).toHaveAttribute('role', 'menuitem')
      })
    })
  })

  describe('Keyboard Navigation', () => {
    it('should be keyboard accessible', async () => {
      const user = userEvent.setup()
      renderWithProviders(<LanguageSwitcher />)

      const button = screen.getByRole('button')

      // Tab to focus the button
      await user.tab()
      expect(button).toHaveFocus()

      // Enter/Space should open dropdown
      await user.keyboard('{Enter}')
      expect(button).toHaveAttribute('aria-expanded', 'true')

      const menuItems = screen.getAllByRole('menuitem')
      expect(menuItems[0]).toBeInTheDocument()
    })

    it('should handle Escape key to close dropdown', async () => {
      const user = userEvent.setup()
      renderWithProviders(<LanguageSwitcher />)

      const button = screen.getByRole('button')
      await user.click(button)

      expect(button).toHaveAttribute('aria-expanded', 'true')

      // Press Escape
      await user.keyboard('{Escape}')

      // Dropdown should close
      expect(button).toHaveAttribute('aria-expanded', 'false')
    })

    it('should support arrow key navigation in menu', async () => {
      const user = userEvent.setup()
      renderWithProviders(<LanguageSwitcher />)

      const button = screen.getByRole('button')
      await user.click(button)

      const menuItems = screen.getAllByRole('menuitem')

      // First item should be focusable
      menuItems[0].focus()
      expect(menuItems[0]).toHaveFocus()

      // Arrow down should move to next item
      await user.keyboard('{ArrowDown}')
      expect(menuItems[1]).toHaveFocus()

      // Arrow up should move back
      await user.keyboard('{ArrowUp}')
      expect(menuItems[0]).toHaveFocus()
    })
  })

  describe('Focus Management', () => {
    it('should manage focus properly when opening/closing', async () => {
      const user = userEvent.setup()
      renderWithProviders(<LanguageSwitcher />)

      const button = screen.getByRole('button')

      // Focus and open dropdown
      button.focus()
      expect(button).toHaveFocus()

      await user.click(button)
      expect(button).toHaveAttribute('aria-expanded', 'true')

      // Focus should remain on button when dropdown opens
      expect(button).toHaveFocus()
    })

    it('should trap focus within dropdown when open', async () => {
      const user = userEvent.setup()
      renderWithProviders(<LanguageSwitcher />)

      const button = screen.getByRole('button')
      await user.click(button)

      const menuItems = screen.getAllByRole('menuitem')

      // Tab navigation should stay within menu
      await user.tab()
      expect(document.activeElement).toBeOneOf([button, ...menuItems])
    })
  })

  describe('Screen Reader Support', () => {
    it('should provide meaningful labels for all interactive elements', () => {
      renderWithProviders(<LanguageSwitcher />)

      const button = screen.getByLabelText('Change language')
      expect(button).toBeInTheDocument()
    })

    it('should indicate current language selection', async () => {
      const user = userEvent.setup()
      renderWithProviders(<LanguageSwitcher />)

      const button = screen.getByRole('button')
      await user.click(button)

      // Look for checkmark indicator for current language
      const checkmark = screen.getByText('✓')
      expect(checkmark).toBeInTheDocument()
    })

    it('should have descriptive text content', async () => {
      const user = userEvent.setup()
      renderWithProviders(<LanguageSwitcher />)

      const button = screen.getByRole('button')
      await user.click(button)

      // Should show language names, not just flags
      expect(screen.getByText('English')).toBeInTheDocument()
      expect(screen.getByText('Português')).toBeInTheDocument()
    })
  })

  describe('Interactive Behavior', () => {
    it('should handle click outside to close dropdown', async () => {
      const user = userEvent.setup()
      renderWithProviders(<LanguageSwitcher />)

      const button = screen.getByRole('button')
      await user.click(button)
      expect(button).toHaveAttribute('aria-expanded', 'true')

      // Click outside
      fireEvent.mouseDown(document.body)
      expect(button).toHaveAttribute('aria-expanded', 'false')
    })

    it('should close dropdown when selecting a language', async () => {
      const user = userEvent.setup()
      renderWithProviders(<LanguageSwitcher />)

      const button = screen.getByRole('button')
      await user.click(button)

      const portugueseOption = screen.getByText('Português')
      await user.click(portugueseOption)

      expect(button).toHaveAttribute('aria-expanded', 'false')
      expect(mockRouter.push).toHaveBeenCalledWith('/pt-BR/dashboard')
    })
  })

  describe('Component-Specific A11y Tests', () => {
    const interactiveTestSuite = createA11yTestSuite('interactive')

    it('should pass interactive component accessibility standards', async () => {
      await interactiveTestSuite.testComponent(<LanguageSwitcher />)
    })

    it('should have no color contrast violations', async () => {
      const { container } = renderWithProviders(<LanguageSwitcher />)

      const { axe } = await import('jest-axe')
      const results = await axe(container, {
        rules: {
          'color-contrast': { enabled: true },
        },
      })

      expect(results).toHaveNoViolations()
    })
  })
})

// Custom Jest matcher to check if element is one of many
expect.extend({
  toBeOneOf(received, expectedArray) {
    const pass = expectedArray.includes(received)

    if (pass) {
      return {
        message: () => `expected ${received} not to be one of [${expectedArray.join(', ')}]`,
        pass: true,
      }
    } else {
      return {
        message: () => `expected ${received} to be one of [${expectedArray.join(', ')}]`,
        pass: false,
      }
    }
  },
})
/**
 * LanguageSwitcher Accessibility Tests
 *
 * The component is a two-button toggle group (EN | PT) using aria-pressed —
 * not the dropdown/menu the previous version of this file assumed. These tests
 * cover the real component's WCAG behaviour and locale switching.
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import LanguageSwitcher from '../LanguageSwitcher'

const mockPush = jest.fn()
let currentLocale = 'en'

// @/navigation wraps next-intl/navigation (ESM); mock it to avoid the parse
// cascade and to capture router.push(locale) calls.
jest.mock('@/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/dashboard',
}))

jest.mock('next-intl', () => ({
  useLocale: () => currentLocale,
  useTranslations: () => (key: string) => key,
}))

describe('LanguageSwitcher Accessibility', () => {
  beforeEach(() => {
    mockPush.mockClear()
    currentLocale = 'en'
    localStorage.clear()
  })

  it('has no axe violations', async () => {
    const { container } = render(<LanguageSwitcher />)
    expect(await axe(container)).toHaveNoViolations()
  })

  describe('Structure & ARIA', () => {
    it('renders a labelled group with two language buttons', () => {
      render(<LanguageSwitcher />)
      const group = screen.getByRole('group', { name: 'Language selection' })
      expect(group).toBeInTheDocument()
      expect(screen.getAllByRole('button')).toHaveLength(2)
    })

    it('marks the active locale with aria-pressed', () => {
      render(<LanguageSwitcher />)
      const en = screen.getByText('EN').closest('button')!
      const pt = screen.getByText('PT').closest('button')!
      expect(en).toHaveAttribute('aria-pressed', 'true')
      expect(pt).toHaveAttribute('aria-pressed', 'false')
    })

    it('reflects a different active locale', () => {
      currentLocale = 'pt-BR'
      render(<LanguageSwitcher />)
      expect(screen.getByText('PT').closest('button')).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByText('EN').closest('button')).toHaveAttribute('aria-pressed', 'false')
    })

    it('gives each button an accessible label', () => {
      render(<LanguageSwitcher />)
      expect(screen.getByText('EN').closest('button')).toHaveAttribute('aria-label')
      expect(screen.getByText('PT').closest('button')).toHaveAttribute('aria-label')
    })
  })

  describe('Behaviour', () => {
    it('switches locale on click and persists the choice', async () => {
      const user = userEvent.setup()
      render(<LanguageSwitcher />)

      await user.click(screen.getByText('PT'))

      expect(mockPush).toHaveBeenCalledWith('/dashboard', { locale: 'pt-BR' })
      expect(localStorage.getItem('cp2b-locale')).toBe('pt-BR')
    })

    it('does not navigate when selecting the current locale', async () => {
      const user = userEvent.setup()
      render(<LanguageSwitcher />)

      await user.click(screen.getByText('EN'))

      expect(mockPush).not.toHaveBeenCalled()
    })

    it('buttons are keyboard reachable and activatable', async () => {
      const user = userEvent.setup()
      render(<LanguageSwitcher />)

      await user.tab()
      expect(screen.getByText('EN').closest('button')).toHaveFocus()

      await user.tab()
      expect(screen.getByText('PT').closest('button')).toHaveFocus()

      await user.keyboard('{Enter}')
      expect(mockPush).toHaveBeenCalledWith('/dashboard', { locale: 'pt-BR' })
    })
  })
})

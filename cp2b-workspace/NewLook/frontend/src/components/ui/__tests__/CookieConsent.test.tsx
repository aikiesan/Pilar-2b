/**
 * The cookie banner: asks until the visitor chooses, stores the choice, and can
 * be reopened. It stays compact: no newsletter field (that lives in the footer).
 */
import React from 'react'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import CookieConsent from '../CookieConsent'
import { openConsentPreferences, readConsent, saveConsent } from '@/lib/consent'

jest.mock('next-intl', () => jest.requireActual('@/test/mocks/next-intl-real'))
jest.mock('@/navigation', () => ({
  Link: ({ href, children, ...rest }: React.ComponentProps<'a'> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

const banner = () => screen.queryByRole('dialog', { name: 'Usamos cookies e dados' })

beforeEach(() => {
  localStorage.clear()
})

describe('CookieConsent', () => {
  it('asks a visitor who has not chosen, and says what the statistics cookie is', async () => {
    const { container } = render(<CookieConsent />)
    expect(banner()).toBeInTheDocument()
    expect(banner()).toHaveTextContent('cookie de estatísticas')
    expect(banner()).toHaveTextContent('servidores da UNICAMP')
    expect(await axe(container)).toHaveNoViolations()
  })

  it('stays closed once the visitor has chosen', () => {
    saveConsent('essential')
    render(<CookieConsent />)
    expect(banner()).not.toBeInTheDocument()
  })

  it('"Accept all" allows the statistics', async () => {
    const user = userEvent.setup()
    render(<CookieConsent />)
    await user.click(screen.getByRole('button', { name: 'Aceitar tudo' }))

    expect(readConsent()).toBe('all')
    expect(banner()).not.toBeInTheDocument()
  })

  it('"Essential only" refuses the statistics', async () => {
    const user = userEvent.setup()
    render(<CookieConsent />)
    await user.click(screen.getByRole('button', { name: 'Apenas essenciais' }))

    expect(readConsent()).toBe('essential')
  })

  it('has no form fields, only the two choices and the privacy link', () => {
    render(<CookieConsent />)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(2)
    expect(screen.getByRole('link', { name: 'Política de Privacidade' })).toHaveAttribute('href', '/privacy')
  })

  it('reopens from "Cookie preferences" so the choice can be changed', async () => {
    saveConsent('all')
    const user = userEvent.setup()
    render(<CookieConsent />)
    expect(banner()).not.toBeInTheDocument()

    act(() => openConsentPreferences())
    await user.click(screen.getByRole('button', { name: 'Apenas essenciais' }))

    expect(readConsent()).toBe('essential')
    expect(banner()).not.toBeInTheDocument()
  })
})

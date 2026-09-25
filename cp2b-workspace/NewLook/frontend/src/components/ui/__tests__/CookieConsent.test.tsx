/**
 * The cookie banner: asks until the visitor chooses, stores the choice, can be
 * reopened, and subscribes a typed address as its own consent.
 */
import React from 'react'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import CookieConsent from '../CookieConsent'
import { openConsentPreferences, readConsent, saveConsent } from '@/lib/consent'
import { subscribeToNewsletter } from '@/services/newsletterApi'

jest.mock('next-intl', () => jest.requireActual('@/test/mocks/next-intl-real'))
jest.mock('@/navigation', () => ({
  Link: ({ href, children, ...rest }: React.ComponentProps<'a'> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))
jest.mock('@/services/newsletterApi', () => ({ subscribeToNewsletter: jest.fn() }))
const subscribe = subscribeToNewsletter as jest.MockedFunction<typeof subscribeToNewsletter>

const banner = () => screen.queryByRole('dialog', { name: 'Usamos cookies e dados' })

beforeEach(() => {
  localStorage.clear()
  subscribe.mockReset()
  jest.useRealTimers()
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

  it('"Accept all" allows the statistics and subscribes nobody when the field is empty', async () => {
    const user = userEvent.setup()
    render(<CookieConsent />)
    await user.click(screen.getByRole('button', { name: 'Aceitar tudo' }))

    expect(readConsent()).toBe('all')
    expect(subscribe).not.toHaveBeenCalled()
    expect(banner()).not.toBeInTheDocument()
  })

  it('"Essential only" refuses the statistics', async () => {
    const user = userEvent.setup()
    render(<CookieConsent />)
    await user.click(screen.getByRole('button', { name: 'Apenas essenciais' }))

    expect(readConsent()).toBe('essential')
  })

  it('subscribes a typed address whichever button is pressed', async () => {
    subscribe.mockResolvedValue('subscribed')
    const user = userEvent.setup()
    render(<CookieConsent />)
    await user.type(screen.getByLabelText('Assine nossa newsletter (opcional)'), 'ana@example.org')
    await user.click(screen.getByRole('button', { name: 'Apenas essenciais' }))

    expect(subscribe).toHaveBeenCalledWith('ana@example.org', 'cookie_banner', 'pt-BR')
    expect(await screen.findByText('Inscrição feita. Obrigado!')).toBeInTheDocument()
    await waitFor(() => expect(readConsent()).toBe('essential'), { timeout: 3000 })
  })

  it('keeps the banner open and says why when the sign-up fails', async () => {
    subscribe.mockResolvedValue('rate_limited')
    const user = userEvent.setup()
    render(<CookieConsent />)
    await user.type(screen.getByLabelText('Assine nossa newsletter (opcional)'), 'ana@example.org')
    await user.click(screen.getByRole('button', { name: 'Aceitar tudo' }))

    expect(await screen.findByText('Muitas tentativas. Aguarde um minuto e tente de novo.')).toBeInTheDocument()
    expect(readConsent()).toBeNull()
    expect(banner()).toBeInTheDocument()
  })

  it('checks the address before sending it', async () => {
    const user = userEvent.setup()
    render(<CookieConsent />)
    await user.type(screen.getByLabelText('Assine nossa newsletter (opcional)'), 'ana@')
    await user.click(screen.getByRole('button', { name: 'Aceitar tudo' }))

    expect(subscribe).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Assine nossa newsletter (opcional)')).toHaveAttribute('aria-invalid', 'true')
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

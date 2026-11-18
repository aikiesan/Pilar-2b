/** The footer's newsletter form posts to the API, and "Cookie preferences" reopens the banner. */
import React from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Footer from '../Footer'
import { onOpenConsentPreferences } from '@/lib/consent'
import { subscribeToNewsletter } from '@/services/newsletterApi'

jest.mock('next-intl', () => jest.requireActual('@/test/mocks/next-intl-real'))
jest.mock('next/image', () => ({ __esModule: true, default: () => null }))
jest.mock('@/navigation', () => ({
  Link: ({ href, children, ...rest }: React.ComponentProps<'a'> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))
jest.mock('@/services/newsletterApi', () => ({ subscribeToNewsletter: jest.fn() }))
const subscribe = subscribeToNewsletter as jest.MockedFunction<typeof subscribeToNewsletter>

async function submit(address: string) {
  const user = userEvent.setup()
  render(<Footer />)
  await user.type(screen.getByLabelText('Seu e-mail'), address)
  await user.click(screen.getByRole('button', { name: 'Inscrever' }))
}

beforeEach(() => subscribe.mockReset())

describe('Footer newsletter', () => {
  it('stores the address and says so', async () => {
    subscribe.mockResolvedValue('subscribed')
    await submit('ana@example.org')

    expect(subscribe).toHaveBeenCalledWith('ana@example.org', 'footer', 'pt-BR')
    expect(await screen.findByText('Obrigado! Você receberá nossas novidades em breve.')).toBeInTheDocument()
  })

  it('says when the server did not store it', async () => {
    subscribe.mockResolvedValue('failed')
    await submit('ana@example.org')

    expect(await screen.findByText('Não foi possível processar sua solicitação. Tente novamente.')).toBeInTheDocument()
  })

  it('never sends an invalid address', async () => {
    await submit('ana@')
    expect(subscribe).not.toHaveBeenCalled()
  })

  it('links the consent to the privacy policy', () => {
    render(<Footer />)
    const note = screen.getByText(/concorda em receber a newsletter/)
    expect(within(note).getByRole('link', { name: 'Política de Privacidade' })).toHaveAttribute('href', '/privacy')
  })

  it('"Cookie preferences" reopens the cookie banner', async () => {
    const reopened = jest.fn()
    const stop = onOpenConsentPreferences(reopened)
    render(<Footer />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Preferências de cookies' }))
    expect(reopened).toHaveBeenCalledTimes(1)
    stop()
  })
})

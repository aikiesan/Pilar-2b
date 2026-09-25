/** The About page's newsletter card posts to the API as source "about". */
import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NewsletterSignup from '../NewsletterSignup'
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

async function submit(address: string) {
  const user = userEvent.setup()
  render(<NewsletterSignup />)
  await user.type(screen.getByLabelText('Endereço de e-mail'), address)
  await user.click(screen.getByRole('button', { name: /Inscrever-se gratuitamente/ }))
}

beforeEach(() => subscribe.mockReset())

describe('NewsletterSignup', () => {
  it('stores the address as a sign-up from the About page', async () => {
    subscribe.mockResolvedValue('subscribed')
    await submit('ana@example.org')

    expect(subscribe).toHaveBeenCalledWith('ana@example.org', 'about', 'pt-BR')
    expect(await screen.findByRole('alert')).toHaveTextContent('Obrigado! Você receberá nossas atualizações em breve.')
  })

  it('words the server’s refusal', async () => {
    subscribe.mockResolvedValue('invalid_email')
    await submit('ana@example.org')

    expect(await screen.findByRole('alert')).toHaveTextContent('Esse endereço de e-mail não foi aceito.')
  })

  it('links its consent note to the privacy policy', () => {
    render(<NewsletterSignup />)
    expect(screen.getByRole('link', { name: 'Política de Privacidade' })).toHaveAttribute('href', '/privacy')
  })
})

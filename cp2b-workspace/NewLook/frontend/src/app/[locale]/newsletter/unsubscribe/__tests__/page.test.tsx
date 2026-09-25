/** The unsubscribe link asks for a click, then reports what happened. */
import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UnsubscribePage from '../page'
import { unsubscribeFromNewsletter } from '@/services/newsletterApi'

jest.mock('next-intl', () => jest.requireActual('@/test/mocks/next-intl-real'))
jest.mock('@/navigation', () => ({
  Link: ({ href, children, ...rest }: React.ComponentProps<'a'> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))
let mockToken: string | null = null
jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(mockToken ? { token: mockToken } : {}),
}))
jest.mock('@/services/newsletterApi', () => ({ unsubscribeFromNewsletter: jest.fn() }))
const unsubscribe = unsubscribeFromNewsletter as jest.MockedFunction<typeof unsubscribeFromNewsletter>

beforeEach(() => {
  unsubscribe.mockReset()
  mockToken = '00000000-0000-4000-8000-000000000001' // not random: see the backend test
})

describe('Unsubscribe page', () => {
  it('does nothing until the visitor confirms', () => {
    render(<UnsubscribePage />)
    expect(screen.getByRole('status')).toHaveTextContent('Deixar de enviar a newsletter')
    expect(unsubscribe).not.toHaveBeenCalled()
  })

  it('unsubscribes on the click and says so', async () => {
    unsubscribe.mockResolvedValue('unsubscribed')
    render(<UnsubscribePage />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Cancelar inscrição' }))

    expect(unsubscribe).toHaveBeenCalledWith(mockToken)
    expect(await screen.findByText('Pronto: este endereço não receberá mais a newsletter.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancelar inscrição' })).not.toBeInTheDocument()
  })

  it('explains a link without a token', () => {
    mockToken = null
    render(<UnsubscribePage />)
    expect(screen.getByRole('status')).toHaveTextContent('Este link de cancelamento não é válido.')
    expect(screen.queryByRole('button', { name: 'Cancelar inscrição' })).not.toBeInTheDocument()
  })

  it('offers to try again when the server fails', async () => {
    unsubscribe.mockResolvedValue('failed')
    render(<UnsubscribePage />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Cancelar inscrição' }))

    expect(await screen.findByText(/Não foi possível cancelar a inscrição agora/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancelar inscrição' })).toBeInTheDocument()
  })
})

import { render, screen, waitFor } from '@testing-library/react'
import VerifyEmailPage from '../page'
import { AuthError } from '@/lib/authErrors'

jest.mock('next-intl', () => jest.requireActual('@/test/mocks/next-intl-real'))
jest.mock('@/navigation', () => ({
  Link: ({ href, children, ...rest }: React.ComponentProps<'a'> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))
jest.mock('next/image', () => ({ __esModule: true, default: () => null }))
let mockToken: string | null = 'tok'
jest.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(mockToken ? `token=${mockToken}` : '') }))
const mockVerify = jest.fn()
jest.mock('@/lib/api/accessClient', () => ({ verifyEmail: (t: string) => mockVerify(t) }))

beforeEach(() => {
  mockToken = 'tok'
  mockVerify.mockReset()
})

it('confirms the address once and says the request went to review', async () => {
  mockVerify.mockResolvedValue('pending_review')
  render(<VerifyEmailPage />)
  expect(await screen.findByRole('heading', { name: 'E-mail confirmado' })).toBeInTheDocument()
  expect(screen.getByText(/Seu pedido foi para análise/)).toBeInTheDocument()
  expect(mockVerify).toHaveBeenCalledTimes(1)
  expect(mockVerify).toHaveBeenCalledWith('tok')
})

it('offers to sign in when the account is already approved', async () => {
  mockVerify.mockResolvedValue('approved')
  render(<VerifyEmailPage />)
  expect(await screen.findByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login')
})

it('explains a used or expired link and points to a new request', async () => {
  mockVerify.mockRejectedValue(new AuthError('invalid_token', 400))
  render(<VerifyEmailPage />)
  expect(await screen.findByRole('heading', { name: 'Link sem validade' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Pedir um link novo' })).toHaveAttribute('href', '/register')
})

it('does not call the server without a token', async () => {
  mockToken = null
  render(<VerifyEmailPage />)
  expect(await screen.findByText(/O link está incompleto/)).toBeInTheDocument()
  await waitFor(() => expect(mockVerify).not.toHaveBeenCalled())
})

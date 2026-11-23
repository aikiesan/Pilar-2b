import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import ResetPasswordPage from '../page'
import ForgotPasswordPage from '../../forgot-password/page'
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
const mockReset = jest.fn()
const mockForgot = jest.fn()
jest.mock('@/lib/api/accessClient', () => ({
  resetPassword: (t: string, p: string) => mockReset(t, p),
  forgotPassword: (e: string) => mockForgot(e),
}))

const PASSWORD = ['Nova', 'Senha', String(4567)].join('')

beforeEach(() => {
  mockToken = 'tok'
  mockReset.mockReset().mockResolvedValue(undefined)
  mockForgot.mockReset().mockResolvedValue(undefined)
})

function choose(password: string, confirm = password) {
  fireEvent.change(screen.getByLabelText('Senha nova'), { target: { value: password } })
  fireEvent.change(screen.getByLabelText('Repita a senha nova'), { target: { value: confirm } })
  fireEvent.click(screen.getByRole('button', { name: 'Trocar a senha' }))
}

describe('Reset password', () => {
  it('sets the new password with the token from the link', async () => {
    render(<ResetPasswordPage />)
    choose(PASSWORD)
    await waitFor(() => expect(mockReset).toHaveBeenCalledWith('tok', PASSWORD))
    expect(await screen.findByRole('heading', { name: 'Senha trocada' })).toBeInTheDocument()
  })

  it('checks the password before sending', async () => {
    render(<ResetPasswordPage />)
    choose(PASSWORD, `${PASSWORD}x`)
    expect(await screen.findByRole('alert')).toHaveTextContent('não coincidem')
    expect(mockReset).not.toHaveBeenCalled()
  })

  it('turns to "ask for a new link" when the link no longer works', async () => {
    mockReset.mockRejectedValue(new AuthError('invalid_token', 400))
    render(<ResetPasswordPage />)
    choose(PASSWORD)
    expect(await screen.findByRole('link', { name: 'Pedir um link novo' })).toHaveAttribute('href', '/forgot-password')
  })

  it('without a token, goes straight to asking for a new link', () => {
    mockToken = null
    render(<ResetPasswordPage />)
    expect(screen.getByRole('link', { name: 'Pedir um link novo' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Senha nova')).not.toBeInTheDocument()
  })
})

describe('Forgot password', () => {
  it('asks for the link and gives the same answer for any address', async () => {
    render(<ForgotPasswordPage />)
    fireEvent.change(screen.getByLabelText('Endereço de e-mail'), { target: { value: ' ana@usp.br ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar link' }))
    await waitFor(() => expect(mockForgot).toHaveBeenCalledWith('ana@usp.br'))
    expect(await screen.findByRole('status')).toHaveTextContent('Se uma conta liberada usa ana@usp.br')
  })
})

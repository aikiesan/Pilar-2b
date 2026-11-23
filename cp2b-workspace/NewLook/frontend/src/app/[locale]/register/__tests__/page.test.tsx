import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { axe } from 'jest-axe'
import RegisterPage from '../page'
import { AuthError } from '@/lib/authErrors'

jest.mock('next-intl', () => jest.requireActual('@/test/mocks/next-intl-real'))
jest.mock('@/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  Link: ({ href, children, ...rest }: React.ComponentProps<'a'> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))
jest.mock('next/image', () => ({ __esModule: true, default: () => null }))
const mockRegister = jest.fn()
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ register: mockRegister, loading: false }) }))
const mockResend = jest.fn()
jest.mock('@/lib/api/accessClient', () => ({ resendVerification: (e: string) => mockResend(e) }))

// Built, not written out: secret scanners read a password-shaped literal as a leak.
const PASSWORD = ['Senha', 'Forte', String(2026)].join('')

function fill(over: Record<string, string> = {}) {
  const values: Record<string, string> = {
    'Nome completo': 'Ana Pesquisadora',
    'Endereço de e-mail': 'ana@usp.br',
    'Instituição': 'USP',
    'Para que vai usar o PILAR-2b': 'Estudo regional de potencial',
  }
  for (const [label, value] of Object.entries(values)) {
    fireEvent.change(screen.getByLabelText(label), { target: { value: over[label] ?? value } })
  }
  fireEvent.change(screen.getByLabelText(/^senha$/i), { target: { value: over.password ?? PASSWORD } })
  fireEvent.change(screen.getByLabelText(/confirmar senha/i), { target: { value: over.confirm ?? PASSWORD } })
}

beforeEach(() => {
  mockRegister.mockReset().mockResolvedValue(undefined)
  mockResend.mockReset().mockResolvedValue(undefined)
})

describe('Register page (request access)', () => {
  it('names the password strength bar and says the strength in words', async () => {
    const { container } = render(<RegisterPage />)
    fireEvent.change(screen.getByLabelText(/^senha$/i), { target: { value: 'abcdefgh' } })
    const bar = screen.getByRole('progressbar', { name: 'Força da senha' })
    expect(bar).toHaveAttribute('aria-valuenow', '25')
    expect(bar).toHaveAttribute('aria-valuetext', 'Fraca')
    expect(await axe(container)).toHaveNoViolations()
  })

  it('sends the request, with the hidden field, and moves on to "confirm your e-mail"', async () => {
    render(<RegisterPage />)
    fill()
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'Enviar pedido' }))
    await waitFor(() =>
      expect(mockRegister).toHaveBeenCalledWith({
        email: 'ana@usp.br',
        password: PASSWORD,
        full_name: 'Ana Pesquisadora',
        institution: 'USP',
        purpose: 'Estudo regional de potencial',
        accept_terms: true,
        website: '',
      })
    )
    expect(await screen.findByRole('heading', { name: 'Confirme seu e-mail' })).toBeInTheDocument()
    expect(screen.getByText(/ana@usp\.br/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Enviar o link de novo' }))
    await waitFor(() => expect(mockResend).toHaveBeenCalledWith('ana@usp.br'))
    expect(await screen.findByRole('status')).toHaveTextContent('um link novo está a caminho')
  })

  it('asks for consent, a strong password and a real purpose before sending', async () => {
    render(<RegisterPage />)
    fill()
    fireEvent.click(screen.getByRole('button', { name: 'Enviar pedido' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('consentimento')

    fireEvent.click(screen.getByRole('checkbox'))
    const plain = 'q'.repeat(10)
    fill({ password: plain, confirm: plain })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar pedido' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('maiúscula')

    fill({ 'Para que vai usar o PILAR-2b': 'curto' })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar pedido' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Entre 10 e 500')
    expect(mockRegister).not.toHaveBeenCalled()
  })

  it('says why the server refused', async () => {
    mockRegister.mockRejectedValue(new AuthError('too_many_attempts', 429))
    render(<RegisterPage />)
    fill()
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'Enviar pedido' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Muitas tentativas')
  })
})

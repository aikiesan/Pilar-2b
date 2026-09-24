import { fireEvent, render, screen } from '@testing-library/react'
import LoginPage from '../page'
import { AuthError } from '@/lib/authErrors'

jest.mock('next-intl', () => jest.requireActual('@/test/mocks/next-intl-real'))
jest.mock('@/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}))
jest.mock('next/image', () => ({ __esModule: true, default: () => null }))
const login = jest.fn()
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ login, loading: false, user: null }) }))

function submit(email = 'ana@cp2b.unicamp.br', password = 'Password123') {
  fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: email } })
  fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: password } })
  fireEvent.click(screen.getByRole('button', { name: /entrar/i }))
}

describe('Login page', () => {
  beforeEach(() => login.mockReset())

  it("words the backend's refusal in the page's language", async () => {
    login.mockRejectedValue(new AuthError('account_locked', 403))
    render(<LoginPage />)
    submit()
    expect(await screen.findByRole('alert')).toHaveTextContent('Conta bloqueada temporariamente')
  })

  it('says when the server cannot be reached', async () => {
    login.mockRejectedValue(new AuthError('network'))
    render(<LoginPage />)
    submit()
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível contatar o servidor')
  })

  it('never shows a raw error message', async () => {
    login.mockRejectedValue(new Error('Invalid email or password'))
    render(<LoginPage />)
    submit()
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Falha no login')
    expect(alert).not.toHaveTextContent('Invalid email or password')
  })
})

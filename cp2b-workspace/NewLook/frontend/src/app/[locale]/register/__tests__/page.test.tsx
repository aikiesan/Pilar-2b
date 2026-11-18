import { fireEvent, render, screen } from '@testing-library/react'
import { axe } from 'jest-axe'
import RegisterPage from '../page'

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
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ register: jest.fn(), loading: false }) }))

describe('Register page', () => {
  it('names the password strength bar and says the strength in words', async () => {
    const { container } = render(<RegisterPage />)
    // Eight lowercase letters: long enough to score, too plain to be strong (25/100).
    fireEvent.change(screen.getByLabelText(/^senha/i), { target: { value: 'abcdefgh' } })

    const bar = screen.getByRole('progressbar', { name: 'Força da senha' })
    expect(bar).toHaveAttribute('aria-valuenow', '25')
    expect(bar).toHaveAttribute('aria-valuetext', 'Fraca')
    expect(await axe(container)).toHaveNoViolations()
  })
})

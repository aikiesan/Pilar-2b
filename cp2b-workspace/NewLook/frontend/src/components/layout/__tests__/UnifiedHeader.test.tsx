/**
 * The header's navigation no longer depends on who is signed in.
 *
 * Open mode (NEXT_PUBLIC_DISABLE_AUTH=true, what the public site runs) hands
 * every anonymous visitor the synthetic TEST_USER, so `isAuthenticated` is true
 * for everyone. The header used to pick its link list from that flag, and the
 * only list with "Sobre" never rendered on the live site.
 */
import React from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UnifiedHeader from '../UnifiedHeader'
import { useAuth } from '@/contexts/AuthContext'
import { useRealSession } from '@/lib/betaAccess'

let mockPathname = '/'

jest.mock('next-intl', () => jest.requireActual('@/test/mocks/next-intl-real'))
jest.mock('next/image', () => ({ __esModule: true, default: () => null }))
jest.mock('@/navigation', () => ({
  Link: ({ href, children, ...rest }: React.ComponentProps<'a'> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  usePathname: () => mockPathname,
}))
jest.mock('@/contexts/AuthContext', () => ({ useAuth: jest.fn() }))
jest.mock('@/lib/betaAccess', () => ({ useRealSession: jest.fn() }))
// Each pulls in data hooks or browser APIs that are beside the point here.
jest.mock('@/components/ui/GlobalSearch', () => ({ __esModule: true, default: () => null }))
jest.mock('@/components/ui/LanguageSwitcher', () => ({ __esModule: true, default: () => null }))
jest.mock('@/components/ui/ThemeToggle', () => ({ ThemeToggle: () => null }))

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
const mockedRealSession = useRealSession as jest.MockedFunction<typeof useRealSession>

const TEST_USER = { id: 'test', email: 'test@example.org', full_name: 'Test User', role: 'user' }

function signIn(user: typeof TEST_USER | null, realSession: boolean) {
  mockedUseAuth.mockReturnValue({
    user,
    isAuthenticated: !!user,
    logout: jest.fn(),
  } as unknown as ReturnType<typeof useAuth>)
  mockedRealSession.mockReturnValue(realSession)
}

const mainNav = () => screen.getByRole('navigation', { name: 'Main navigation' })

beforeEach(() => {
  mockPathname = '/'
})

describe('UnifiedHeader navigation', () => {
  it.each([
    ['open mode (synthetic test user, no real session)', TEST_USER, false],
    ['an anonymous visitor with auth enabled', null, false],
    ['a genuinely signed-in account', TEST_USER, true],
  ])('shows the same links to %s', (_label, user, realSession) => {
    signIn(user, realSession)
    render(<UnifiedHeader variant="auto" />)
    const nav = mainNav()

    expect(within(nav).getByRole('link', { name: 'Sobre' })).toHaveAttribute('href', '/about')
    expect(within(nav).getByRole('link', { name: 'Comparar' })).toHaveAttribute('href', '/dashboard/compare')
    expect(within(nav).getByRole('link', { name: 'Guia' })).toHaveAttribute('href', '/guide')
    expect(within(nav).getByRole('link', { name: 'Mapa' })).toHaveAttribute('href', '/map')
    expect(within(nav).queryByRole('link', { name: 'Hub' })).not.toBeInTheDocument()
  })

  it('offers "Entrar" in open mode instead of the test user\'s account menu', () => {
    signIn(TEST_USER, false)
    render(<UnifiedHeader variant="auto" />)
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login')
    expect(screen.queryByText('Test User')).not.toBeInTheDocument()
  })

  it('marks the current page', () => {
    signIn(TEST_USER, false)
    mockPathname = '/about'
    render(<UnifiedHeader variant="auto" />)
    expect(within(mainNav()).getByRole('link', { name: 'Sobre' })).toHaveAttribute('aria-current', 'page')
    expect(within(mainNav()).getByRole('link', { name: 'Mapa' })).not.toHaveAttribute('aria-current')
  })
})

describe('UnifiedHeader mobile menu', () => {
  it('toggles with aria-expanded and lists every entry with its description', async () => {
    signIn(TEST_USER, false)
    const user = userEvent.setup()
    render(<UnifiedHeader variant="auto" />)

    const toggle = screen.getByRole('button', { name: 'Abrir menu' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveAttribute('aria-controls', 'mobile-menu')

    await user.click(toggle)

    const closeButton = screen.getByRole('button', { name: 'Fechar menu' })
    expect(closeButton).toHaveAttribute('aria-expanded', 'true')
    const menu = document.getElementById('mobile-menu')
    expect(menu).not.toBeNull()
    const about = within(menu as HTMLElement).getByRole('link', { name: /Sobre/ })
    expect(about).toHaveAttribute('href', '/about')
    expect(about).toHaveTextContent('Projeto, equipe, parceiros e FAQ')
    expect(within(menu as HTMLElement).getByRole('link', { name: /Comparar/ })).toHaveTextContent(
      'Até 4 municípios lado a lado'
    )
  })
})

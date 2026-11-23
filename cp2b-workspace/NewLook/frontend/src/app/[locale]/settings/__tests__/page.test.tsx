import { render, screen } from '@testing-library/react'
import SettingsPage from '../page'
import type { UserProfile } from '@/types/auth'

jest.mock('next-intl', () => jest.requireActual('@/test/mocks/next-intl-real'))
jest.mock('@/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/settings',
  Link: ({ href, children, ...rest }: React.ComponentProps<'a'> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))
jest.mock('@/components/ui/LanguageSwitcher', () => ({ useLocaleSwitch: () => jest.fn() }))
jest.mock('@/components/ui/Breadcrumb', () => ({ BreadcrumbBar: () => null }))
jest.mock('@/hooks/useBreadcrumbs', () => ({ useBreadcrumbs: () => [] }))

// The open-mode test user is an admin: the button must not follow it.
const testUser = { email: 'teste@example.org', full_name: 'Teste', role: 'admin' }
let mockSession: Partial<UserProfile> | null | undefined
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: testUser, loading: false, isAuthenticated: true }),
  useSessionUser: () => mockSession,
}))

const button = () => screen.queryByRole('link', { name: 'Painel de acessos' })

it('shows the access dashboard to an active admin', () => {
  mockSession = { role: 'admin', is_active: true }
  render(<SettingsPage />)
  expect(button()).toHaveAttribute('href', '/admin')
})

it.each([
  ['no session', null],
  ['a session still loading', undefined],
  ['a regular account', { role: 'autenticado', is_active: true }],
  ['an inactive admin', { role: 'admin', is_active: false }],
] as const)('hides it with %s', (_, session) => {
  mockSession = session as Partial<UserProfile> | null | undefined
  render(<SettingsPage />)
  expect(button()).toBeNull()
})

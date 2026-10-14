/**
 * The header: one grouped navigation for every visitor (Plataforma · Dados ·
 * Método · Sobre), mega-menus that follow the disclosure pattern, a phone menu
 * with the same groups, and the phone bottom bar that opens it.
 *
 * Open mode (NEXT_PUBLIC_DISABLE_AUTH=true, what the public site runs) hands
 * every anonymous visitor the synthetic TEST_USER, so `isAuthenticated` is true
 * for everyone; the navigation must not depend on it.
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
const trigger = (name: string) => within(mainNav()).getByRole('button', { name })

beforeEach(() => {
  mockPathname = '/'
  signIn(TEST_USER, false)
})

describe('UnifiedHeader navigation', () => {
  it.each([
    ['open mode (synthetic test user, no real session)', TEST_USER, false],
    ['an anonymous visitor with auth enabled', null, false],
    ['a genuinely signed-in account', TEST_USER, true],
  ])('gives %s the same groups and links', (_label, user, realSession) => {
    signIn(user, realSession)
    render(<UnifiedHeader />)
    const nav = mainNav()

    for (const group of ['Plataforma', 'Dados', 'Método', 'Sobre']) {
      expect(trigger(group)).toHaveAttribute('aria-expanded', 'false')
    }
    // Base científica lives in the Método menu now, not in the bar.
    expect(within(nav).queryByRole('link', { name: /Base científica/i })).not.toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: 'Guia' })).toHaveAttribute('href', '/guide')
    expect(within(nav).getByRole('link', { name: 'Abrir mapa' })).toHaveAttribute('href', '/map')
    expect(within(nav).queryByRole('link', { name: 'Hub' })).not.toBeInTheDocument()
  })

  it('opens a group to show its pages, each with a description', async () => {
    const user = userEvent.setup()
    render(<UnifiedHeader />)

    await user.click(trigger('Plataforma'))
    expect(trigger('Plataforma')).toHaveAttribute('aria-expanded', 'true')
    const compare = within(mainNav()).getByRole('link', { name: /Comparar/ })
    expect(compare).toHaveAttribute('href', '/compare')
    expect(compare).toHaveTextContent('Até 4 municípios lado a lado')

    await user.click(trigger('Sobre'))
    expect(trigger('Plataforma')).toHaveAttribute('aria-expanded', 'false')
    expect(within(mainNav()).getByRole('link', { name: /O projeto/ })).toHaveAttribute('href', '/about')
    expect(within(mainNav()).getByRole('link', { name: /FAQ e contato/ })).toHaveAttribute('href', '/about#faq')
  })

  it('introduces each group beside its pages, with one call to action', async () => {
    const user = userEvent.setup()
    render(<UnifiedHeader />)

    await user.click(trigger('Dados'))
    const panel = document.getElementById(trigger('Dados').getAttribute('aria-controls') as string) as HTMLElement
    expect(panel).toBeVisible()
    expect(within(panel).getByRole('link', { name: /Legenda e códigos/ })).toHaveAttribute('href', '/data/legend')
    // The intro's call to action and the catalogue item both lead to /data.
    expect(within(panel).getAllByRole('link').filter((a) => a.getAttribute('href') === '/data')).toHaveLength(2)
  })

  it('holds the Método pages back until METHOD_PAGES_ENABLED, keeping the public ones', async () => {
    const user = userEvent.setup()
    render(<UnifiedHeader />)

    await user.click(trigger('Método'))
    const panel = document.getElementById(trigger('Método').getAttribute('aria-controls') as string) as HTMLElement
    const hrefs = within(panel).getAllByRole('link').map((a) => a.getAttribute('href'))
    expect(hrefs).toContain('/method/science-base')
    expect(hrefs).toContain('/guide')
    for (const held of ['/method', '/method/fde', '/method/scenarios', '/method/validation']) {
      expect(hrefs).not.toContain(held)
    }
  })

  it('opens with ArrowDown on the first link and closes with Escape, back on the button', async () => {
    const user = userEvent.setup()
    render(<UnifiedHeader />)

    trigger('Sobre').focus()
    await user.keyboard('{ArrowDown}')
    expect(trigger('Sobre')).toHaveAttribute('aria-expanded', 'true')
    await new Promise((resolve) => requestAnimationFrame(resolve))
    expect(within(mainNav()).getByRole('link', { name: /O projeto/ })).toHaveFocus()

    await user.keyboard('{Escape}')
    expect(trigger('Sobre')).toHaveAttribute('aria-expanded', 'false')
    expect(trigger('Sobre')).toHaveFocus()
  })

  it('closes when the visitor clicks elsewhere', async () => {
    const user = userEvent.setup()
    render(<UnifiedHeader />)
    await user.click(trigger('Plataforma'))
    await user.click(document.body)
    expect(trigger('Plataforma')).toHaveAttribute('aria-expanded', 'false')
  })

  it('marks the current page, and the group that holds it', async () => {
    mockPathname = '/about'
    const user = userEvent.setup()
    render(<UnifiedHeader />)
    await user.click(trigger('Sobre'))
    expect(within(mainNav()).getByRole('link', { name: /O projeto/ })).toHaveAttribute('aria-current', 'page')
    // An anchor on the same page is a section, not the current page.
    expect(within(mainNav()).getByRole('link', { name: /FAQ e contato/ })).not.toHaveAttribute('aria-current')
    expect(trigger('Sobre').className).toContain('text-terra-600')
    expect(trigger('Método').className).not.toContain('text-terra-600')
  })

  it('marks a child page, not its parent, as current', async () => {
    mockPathname = '/data/legend'
    const user = userEvent.setup()
    render(<UnifiedHeader />)
    await user.click(trigger('Dados'))
    expect(within(mainNav()).getByRole('link', { name: /Legenda e códigos/ })).toHaveAttribute('aria-current', 'page')
    expect(within(mainNav()).getByRole('link', { name: /Catálogo de produtos/ })).not.toHaveAttribute('aria-current')
  })

  it('offers "Entrar" in open mode instead of the test user\'s account menu', () => {
    render(<UnifiedHeader />)
    expect(screen.getAllByRole('link', { name: 'Entrar' })[0]).toHaveAttribute('href', '/login')
    expect(screen.queryByText('Test User')).not.toBeInTheDocument()
  })
})

describe('UnifiedHeader phone menu', () => {
  const drawer = () => document.getElementById('mobile-menu') as HTMLElement

  it('opens from the bottom bar\'s "Mais", with the same groups', async () => {
    const user = userEvent.setup()
    render(<UnifiedHeader />)

    const bar = screen.getByRole('navigation', { name: 'Atalhos' })
    const more = within(bar).getByRole('button', { name: /Mais/ })
    expect(more).toHaveAttribute('aria-expanded', 'false')
    expect(more).toHaveAttribute('aria-controls', 'mobile-menu')

    await user.click(more)

    expect(more).toHaveAttribute('aria-expanded', 'true')
    for (const heading of ['Plataforma', 'Dados', 'Método', 'Sobre']) {
      expect(within(drawer()).getByRole('heading', { name: heading })).toBeInTheDocument()
    }
    expect(within(drawer()).getByRole('link', { name: /Abrir mapa/ })).toHaveAttribute('href', '/map')
    const about = within(drawer()).getByRole('link', { name: /O projeto/ })
    expect(about).toHaveAttribute('href', '/about')
    expect(about).toHaveTextContent('Projeto, equipe, parceiros e FAQ')
    expect(within(drawer()).getByRole('link', { name: /Comparar/ })).toHaveTextContent('Até 4 municípios lado a lado')
  })

  it('keeps the header menu button on the full-viewport tools, where the bar is absent', async () => {
    mockPathname = '/map'
    const user = userEvent.setup()
    render(<UnifiedHeader />)

    expect(screen.queryByRole('navigation', { name: 'Atalhos' })).not.toBeInTheDocument()
    const toggle = screen.getByRole('button', { name: 'Abrir menu' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveAttribute('aria-controls', 'mobile-menu')

    await user.click(toggle)
    expect(screen.getByRole('button', { name: 'Fechar menu' })).toHaveAttribute('aria-expanded', 'true')
    expect(within(drawer()).getByRole('heading', { name: 'Método' })).toBeInTheDocument()
  })
})

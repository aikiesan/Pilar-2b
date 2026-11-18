/**
 * The phone bottom bar: three shortcuts and "Mais", which discloses the
 * header's full menu.
 */
import React from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MobileTabBar from '../MobileTabBar'

jest.mock('next-intl', () => jest.requireActual('@/test/mocks/next-intl-real'))
jest.mock('@/navigation', () => ({
  Link: ({ href, children, ...rest }: React.ComponentProps<'a'> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

const bar = () => screen.getByRole('navigation', { name: 'Atalhos' })

describe('MobileTabBar', () => {
  it('shows Mapa, Municípios, Dados and Mais', () => {
    render(<MobileTabBar current={undefined} menuOpen={false} onToggleMenu={jest.fn()} />)
    expect(within(bar()).getByRole('link', { name: 'Mapa' })).toHaveAttribute('href', '/map')
    expect(within(bar()).getByRole('link', { name: 'Municípios' })).toHaveAttribute('href', '/municipalities')
    expect(within(bar()).getByRole('link', { name: 'Dados' })).toHaveAttribute('href', '/data')
    // The accessible name keeps the visible word (WCAG 2.5.3).
    expect(within(bar()).getByRole('button', { name: /^Mais/ })).toHaveTextContent('Mais')
  })

  it('marks the section that holds the current page', () => {
    render(<MobileTabBar current="/data/legend" menuOpen={false} onToggleMenu={jest.fn()} />)
    expect(within(bar()).getByRole('link', { name: 'Dados' })).toHaveAttribute('aria-current', 'page')
    expect(within(bar()).getByRole('link', { name: 'Mapa' })).not.toHaveAttribute('aria-current')
  })

  it('does not take a shared prefix (/database) for a section (/data)', () => {
    render(<MobileTabBar current="/database" menuOpen={false} onToggleMenu={jest.fn()} />)
    expect(within(bar()).getByRole('link', { name: 'Dados' })).not.toHaveAttribute('aria-current')
  })

  it('hands the current mark to "Mais" while the menu is open', () => {
    render(<MobileTabBar current="/data" menuOpen onToggleMenu={jest.fn()} />)
    expect(within(bar()).getByRole('link', { name: 'Dados' })).not.toHaveAttribute('aria-current')
    expect(within(bar()).getByRole('button', { name: /^Mais/ })).toHaveAttribute('aria-expanded', 'true')
  })

  it('"Mais" toggles the menu it controls', async () => {
    const user = userEvent.setup()
    const onToggleMenu = jest.fn()
    render(<MobileTabBar current={undefined} menuOpen={false} onToggleMenu={onToggleMenu} />)
    const more = within(bar()).getByRole('button', { name: /^Mais/ })
    expect(more).toHaveAttribute('aria-expanded', 'false')
    expect(more).toHaveAttribute('aria-controls', 'mobile-menu')
    await user.click(more)
    expect(onToggleMenu).toHaveBeenCalledTimes(1)
  })
})

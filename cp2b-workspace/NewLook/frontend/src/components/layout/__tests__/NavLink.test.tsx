/** A page of ours goes through the locale-aware Link; the CP2b site is a plain, labelled link. */
import React from 'react'
import { render, screen } from '@testing-library/react'
import NavLink from '../NavLink'

jest.mock('next-intl', () => jest.requireActual('@/test/mocks/next-intl-real'))
jest.mock('@/navigation', () => ({
  Link: ({ href, children, ...rest }: React.ComponentProps<'a'> & { href: string }) => (
    <a href={href} data-locale-link="" {...rest}>
      {children}
    </a>
  ),
}))

describe('NavLink', () => {
  it('sends a page of this site through the locale-aware Link', () => {
    render(<NavLink href="/cite">Como citar</NavLink>)
    const link = screen.getByRole('link', { name: 'Como citar' })
    expect(link).toHaveAttribute('href', '/cite')
    expect(link).toHaveAttribute('data-locale-link')
  })

  it('links to the CP2b site as is, in the same tab, and says where it goes', () => {
    render(<NavLink href="https://cp2b.unicamp.br/sobre">O CP2b</NavLink>)
    // The visible text starts the accessible name (WCAG 2.5.3).
    const link = screen.getByRole('link', { name: 'O CP2b (site do CP2b)' })
    expect(link).toHaveAttribute('href', 'https://cp2b.unicamp.br/sobre')
    expect(link).not.toHaveAttribute('data-locale-link')
    expect(link).not.toHaveAttribute('target')
    expect(link.querySelector('[data-icon="ExternalLink"]')).not.toBeNull()
  })

  it('leaves the ↗ out where the link already has an icon', () => {
    render(
      <NavLink href="https://cp2b.unicamp.br/contato" externalIcon={false}>
        Fale conosco
      </NavLink>,
    )
    expect(screen.getByRole('link', { name: 'Fale conosco (site do CP2b)' }).querySelector('[data-icon="ExternalLink"]')).toBeNull()
  })
})

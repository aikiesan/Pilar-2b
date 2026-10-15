/** The platform's FAQ, moved from the old /about page to the end of the guide. */
import React from 'react'
import { render, screen } from '@testing-library/react'
import { axe } from 'jest-axe'
import GuideFaq from '../GuideFaq'

jest.mock('next-intl', () => jest.requireActual('@/test/mocks/next-intl-real'))
jest.mock('@/navigation', () => ({
  Link: ({ href, children, ...rest }: React.ComponentProps<'a'> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

describe('GuideFaq', () => {
  it('lists the six questions under #faq', () => {
    const { container } = render(<GuideFaq />)
    expect(container.querySelector('section#faq')).not.toBeNull()
    expect(screen.getByRole('heading', { level: 2, name: 'Perguntas frequentes' })).toBeInTheDocument()
    expect(container.querySelectorAll('details')).toHaveLength(6)
    expect(screen.getByText('O que é o PILAR-2b?')).toBeInTheDocument()
  })

  it('sends error reports to the CP2b contact form', () => {
    render(<GuideFaq />)
    expect(screen.getByRole('link', { name: 'formulário de contato (site do CP2b)' })).toHaveAttribute(
      'href',
      'https://cp2b.unicamp.br/contato',
    )
  })

  it('has no accessibility violations', async () => {
    const { container } = render(<GuideFaq />)
    expect(await axe(container)).toHaveNoViolations()
  })
})

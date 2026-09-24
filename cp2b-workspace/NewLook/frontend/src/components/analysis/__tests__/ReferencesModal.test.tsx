import { fireEvent, render, screen } from '@testing-library/react'
import ReferencesModal from '../ReferencesModal'

jest.mock('next-intl', () => jest.requireActual('@/test/mocks/next-intl-real'))
jest.mock('@/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={`/pt-BR${href}`} {...rest}>
      {children}
    </a>
  ),
}))

describe('ReferencesModal', () => {
  it('is a labelled dialog that Escape and the backdrop close', () => {
    const onClose = jest.fn()
    render(<ReferencesModal isOpen onClose={onClose} />)
    const dialog = screen.getByRole('dialog', { name: 'Referências e Fontes de Dados' })
    expect(screen.getByRole('button', { name: 'Fechar' })).toHaveFocus()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
    fireEvent.click(dialog) // inside: stays open
    expect(onClose).toHaveBeenCalledTimes(1)
    fireEvent.click(dialog.parentElement as HTMLElement) // the backdrop
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it("points to the scientific database's references in the visitor's language", () => {
    render(<ReferencesModal isOpen onClose={jest.fn()} />)
    const links = screen.getAllByRole('link', { name: 'Abrir a base científica' })
    // The links used to be hardcoded to /pt-BR/… in a new tab, whatever the site language.
    expect(links[0]).toHaveAttribute('href', '/pt-BR/dashboard/scientific-database?view=references')
    expect(links[0]).not.toHaveAttribute('target')
    expect(screen.getByText('Referências científicas validadas na base: 39')).toBeInTheDocument()
  })

  it('describes the data sources in the page language, names as published', () => {
    render(<ReferencesModal isOpen onClose={jest.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /Fontes de Dados/ }))
    expect(screen.getByText('IBGE - Produção Agrícola Municipal (PAM)')).toBeInTheDocument()
    expect(screen.getByText('Dados oficiais municipais')).toBeInTheDocument()
    expect(screen.getByText('Novacana - Mapeamento de Usinas')).toBeInTheDocument()
  })

  it('renders nothing while closed', () => {
    const { container } = render(<ReferencesModal isOpen={false} onClose={jest.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })
})

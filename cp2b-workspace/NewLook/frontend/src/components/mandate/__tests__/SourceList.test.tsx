/**
 * The source list under each mandate card: every source links out in a new
 * tab with its kind and date, an assumption shows without a link, and the
 * count is of distinct sources.
 */
import React from 'react'
import { render, screen, within } from '@testing-library/react'
import { axe } from 'jest-axe'
import SourceList, { countSources, type Reference } from '../SourceList'

const official: Reference = {
  key: 'lei',
  title: 'Lei nº 14.993/2024',
  publisher: 'Presidência da República',
  date: '2024-10',
  url: 'https://www.planalto.gov.br/l14993.htm',
  kind: 'oficial',
  note: null,
}
const assumption: Reference = {
  key: 'suposto',
  title: 'Energia autoconsumida a R$ 450/MWh',
  publisher: 'PILAR-2b',
  date: '2026-10',
  url: null,
  kind: 'estimativa',
  note: 'Sem fonte pública.',
}

const groups = [
  { key: 'a', label: 'Mandato', sources: [official] },
  { key: 'b', label: 'Preços', sources: [official, assumption] },
]

const renderList = () =>
  render(
    <SourceList
      summary={`Fontes deste quadro (${countSources(groups)})`}
      groups={groups}
      kindLabel={(k) => k.toUpperCase()}
      dateLabel={(d) => `em ${d}`}
    />,
  )

describe('SourceList', () => {
  it('counts distinct sources and folds them under the summary', () => {
    const { container } = renderList()
    expect(screen.getByText('Fontes deste quadro (2)')).toBeInTheDocument()
    expect(container.querySelector('details')).not.toHaveAttribute('open')
  })

  it('links each source out, with kind, publisher and date', () => {
    renderList()
    const links = screen.getAllByRole('link', { name: /Lei nº 14\.993\/2024/ })
    expect(links).toHaveLength(2)
    for (const link of links) {
      expect(link).toHaveAttribute('href', official.url as string)
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    }
    const item = links[0].closest('li') as HTMLElement
    expect(within(item).getByText('OFICIAL')).toBeInTheDocument()
    expect(item).toHaveTextContent('Presidência da República · em 2024-10')
  })

  it('shows an assumption as plain text with its note', () => {
    renderList()
    expect(screen.queryByRole('link', { name: /autoconsumida/ })).toBeNull()
    expect(screen.getByText('Energia autoconsumida a R$ 450/MWh')).toBeInTheDocument()
    expect(screen.getByText('Sem fonte pública.')).toBeInTheDocument()
    expect(screen.getByText('ESTIMATIVA')).toBeInTheDocument()
  })

  it('has no accessibility violations', async () => {
    const { container } = renderList()
    expect(await axe(container)).toHaveNoViolations()
  })
})

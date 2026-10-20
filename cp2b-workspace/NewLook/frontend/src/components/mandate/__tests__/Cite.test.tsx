/**
 * The source buttons beside each figure: a linked source opens straight at
 * the source in a new tab and reads out the whole citation; an assumption
 * has no link but says what it is; the calculation button jumps to the
 * card's arithmetic; the legend shows one sample per kind.
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import { axe } from 'jest-axe'
import Cite, { CalcLink, CiteLegend } from '../Cite'
import type { Reference } from '../SourceList'

const ccee: Reference = {
  key: 'ccee',
  title: 'InfoPLD diário de 30/07/2026',
  short: 'CCEE, InfoPLD jul/2026',
  publisher: 'CCEE',
  date: '2026-07-30',
  url: 'https://www.ccee.org.br/infopld.pdf',
  kind: 'dados',
  note: null,
}
const assumption: Reference = {
  key: 'suposto',
  title: 'Energia autoconsumida a R$ 450/MWh',
  short: 'Suposição PILAR-2b',
  publisher: 'PILAR-2b',
  date: '2026-10',
  url: null,
  kind: 'estimativa',
  note: 'Sem fonte pública.',
}
const describeSource = (s: Reference) => `Fonte (${s.kind}): ${s.title} — ${s.publisher}`

describe('Cite', () => {
  it('opens a linked source directly, in a new tab, named by its full citation', () => {
    render(<Cite sources={[ccee]} describe={describeSource} />)
    const link = screen.getByRole('link', { name: 'Fonte (dados): InfoPLD diário de 30/07/2026 — CCEE' })
    expect(link).toHaveAttribute('href', ccee.url as string)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(link).toHaveTextContent('CCEE, InfoPLD jul/2026')
  })

  it('shows an assumption without a link, saying what it is', () => {
    render(<Cite sources={[assumption]} describe={describeSource} />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByText('Fonte (estimativa): Energia autoconsumida a R$ 450/MWh — PILAR-2b')).toBeInTheDocument()
  })

  it('renders nothing without sources', () => {
    const { container } = render(<Cite sources={[]} describe={describeSource} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('jumps to the arithmetic and keys the kinds, accessibly', async () => {
    const { container } = render(
      <div>
        <Cite sources={[ccee, assumption]} describe={describeSource} />
        <CalcLink href="#conta-x" label="Como calculamos este número" text="conta" />
        <CiteLegend heading="Tipos de fonte:" kinds={[{ kind: 'oficial', label: 'Oficial' }]} calcText="conta" />
      </div>,
    )
    expect(screen.getByRole('link', { name: 'Como calculamos este número' })).toHaveAttribute('href', '#conta-x')
    expect(screen.getByText('Oficial')).toBeInTheDocument()
    expect(await axe(container)).toHaveNoViolations()
  })
})

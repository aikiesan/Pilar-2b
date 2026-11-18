import { fireEvent, render, screen, within } from '@testing-library/react'
import { useState } from 'react'
import ReferencesView from '../ReferencesView'
import { references, residues } from '@/test/fixtures/scientific'

jest.mock('next-intl', () => jest.requireActual('@/test/mocks/next-intl-real'))

function Harness({ initialResidue = '' }: { initialResidue?: string }) {
  const [residue, setResidue] = useState(initialResidue)
  return <ReferencesView references={references} residues={residues} residue={residue} onResidueChange={setResidue} />
}

const titles = () => screen.queryAllByRole('article').map((a) => within(a).getByRole('heading').textContent)

describe('ReferencesView', () => {
  it('lists every paper, older ones included', () => {
    render(<Harness />)
    // 2004 is before the fixed 2010 cut-off the page used to apply, with no way to change it.
    expect(titles()).toEqual(['Anaerobic digestion of vinasse', 'Dejetos de bovinos: caracterização'])
  })

  it('filters by sector code, as the references carry it', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('checkbox', { name: /Pecuária/ }))
    expect(titles()).toEqual(['Dejetos de bovinos: caracterização'])
  })

  it('filters to papers with validated data', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Apenas artigos com dados validados' }))
    expect(titles()).toEqual(['Anaerobic digestion of vinasse'])
  })

  it('opens already filtered by the residue another tab chose, and can clear it', () => {
    render(<Harness initialResidue="Esterco bovino" />)
    expect(titles()).toEqual(['Dejetos de bovinos: caracterização'])
    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }))
    expect(titles()).toHaveLength(2)
  })

  it('searches without regard to accents', () => {
    render(<Harness />)
    fireEvent.change(screen.getByLabelText('Buscar'), { target: { value: 'caracterizacao' } })
    expect(titles()).toEqual(['Dejetos de bovinos: caracterização'])
  })

  it('says so when nothing matches', () => {
    render(<Harness />)
    fireEvent.change(screen.getByLabelText('Buscar'), { target: { value: 'nothing like this' } })
    expect(screen.getByText('Nenhuma referência encontrada')).toBeInTheDocument()
  })

  it('labels validated data as such, not as peer review', () => {
    render(<Harness />)
    expect(screen.getAllByText('Dados validados')).toHaveLength(1)
    expect(screen.queryByText(/peer-reviewed/i)).not.toBeInTheDocument()
  })
})

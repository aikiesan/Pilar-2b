import { fireEvent, render, screen } from '@testing-library/react'
import KineticsView from '../KineticsView'
import { kinetics } from '@/test/fixtures/scientific'

jest.mock('next-intl', () => jest.requireActual('@/test/mocks/next-intl-real'))

describe('KineticsView', () => {
  it("offers the kinetics' own residues for selection", () => {
    render(<KineticsView kinetics={kinetics} />)
    // The selector used to list a local mock's names, which never matched the backend's curves.
    const choices = screen.getAllByRole('button', { pressed: false })
    expect(choices.map((b) => b.textContent)).toEqual(['Vinhaça', 'Esterco bovino'])
    fireEvent.click(choices[1])
    expect(screen.getByRole('button', { name: 'Esterco bovino' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('translates the kinetic classes and shows the simulation error', () => {
    render(<KineticsView kinetics={kinetics} />)
    expect(screen.getByText('Rápida')).toBeInTheDocument()
    expect(screen.getByText('Média-rápida')).toBeInTheDocument()
    expect(screen.getByText('+5,0%')).toBeInTheDocument()
    expect(screen.getByText('0,0%')).toBeInTheDocument()
  })

  it('explains an empty database', () => {
    render(<KineticsView kinetics={[]} />)
    expect(screen.getByText('Dados cinéticos não disponíveis')).toBeInTheDocument()
  })
})

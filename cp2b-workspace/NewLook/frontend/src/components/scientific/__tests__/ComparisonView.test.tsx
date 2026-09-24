import { fireEvent, render, screen, within } from '@testing-library/react'
import ComparisonView from '../ComparisonView'
import { residues } from '@/test/fixtures/scientific'

jest.mock('next-intl', () => jest.requireActual('@/test/mocks/next-intl-real'))

describe('ComparisonView', () => {
  it('asks for two residues before comparing', () => {
    render(<ComparisonView residues={residues} />)
    expect(screen.getByText('Selecione pelo menos 2 resíduos')).toBeInTheDocument()
  })

  it('names the best residue per parameter: highest BMP, C:N closest to 25', () => {
    render(<ComparisonView residues={residues} />)
    fireEvent.click(screen.getByRole('button', { name: 'Vinhaça' }))
    fireEvent.click(screen.getByRole('button', { name: 'Esterco bovino' }))
    const row = (name: string) => screen.getByRole('rowheader', { name }).closest('tr') as HTMLElement
    expect(within(row('BMP (L/kg SV)')).getAllByText('Vinhaça').length).toBeGreaterThan(0)
    expect(within(row('C:N')).getAllByText('Esterco bovino').length).toBeGreaterThan(0)
    // Missing values are said, not drawn as zero.
    expect(within(row('SV (% ST)')).getAllByText('Sem dados').length).toBeGreaterThan(0)
  })
})

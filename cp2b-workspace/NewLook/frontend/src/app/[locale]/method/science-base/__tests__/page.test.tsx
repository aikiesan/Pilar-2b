import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import ScientificDatabasePage from '../page'
import * as api from '@/services/scientificApi'
import { kinetics, references, residues, sectors } from '@/test/fixtures/scientific'

jest.mock('next-intl', () => jest.requireActual('@/test/mocks/next-intl-real'))
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1 }, loading: false, isAuthenticated: true }),
}))
jest.mock('@/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }))
jest.mock('@/components/ui/Breadcrumb', () => ({ __esModule: true, default: () => null }))
let search = ''
jest.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(search) }))
jest.mock('@/services/scientificApi')
const mocked = api as jest.Mocked<typeof api>

function serve() {
  mocked.getResidues.mockResolvedValue(residues)
  mocked.getSectorSummary.mockResolvedValue(sectors)
  mocked.getKinetics.mockResolvedValue(kinetics)
  mocked.getReferences.mockResolvedValue(references)
}

describe('Scientific database page', () => {
  beforeAll(() => {
    window.scrollTo = jest.fn()
    Element.prototype.scrollIntoView = jest.fn()
  })
  beforeEach(() => {
    jest.clearAllMocks()
    search = ''
    serve()
  })

  it('opens the tab the address asks for', async () => {
    search = 'view=references'
    render(<ScientificDatabasePage />)
    expect(await screen.findByText('Anaerobic digestion of vinasse')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Referências Científicas' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('reports a failed load and retries on request', async () => {
    mocked.getReferences.mockRejectedValueOnce(new Error('HTTP 503'))
    render(<ScientificDatabasePage />)
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Parte da base científica não pôde ser carregada')
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    await waitFor(() => expect(mocked.getReferences).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
  })

  it('takes a residue picked in the list to its characterization card', async () => {
    search = 'view=residues'
    render(<ScientificDatabasePage />)
    fireEvent.click(await screen.findByRole('button', { name: /Esterco bovino/ }))
    expect(screen.getByRole('button', { name: 'Caracterização Química' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('article', { name: 'Esterco bovino' })).toHaveClass('ring-2')
  })

  it('computes the FDE figure from the residues themselves', async () => {
    render(<ScientificDatabasePage />)
    // One of the three fixture residues has all four factors.
    expect(await screen.findByText('33%')).toBeInTheDocument()
  })
})

/**
 * The Compare window, state by state, with the real pt-BR copy.
 */
import { fireEvent, render, screen, within } from '@testing-library/react'
import { CompareWindow, type CompareWindowProps } from './CompareWindow'
import type { CompareSide } from '@/lib/compare'

jest.mock('next-intl', () => jest.requireActual('@/test/mocks/next-intl-real'))
jest.mock('@/navigation', () => ({
  Link: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => <a href={href} {...props}>{children}</a>,
}))
jest.mock('@/hooks/useGeospatialData', () => ({ useMunicipalityMetrics: () => ({ data: undefined }) }))

// The mock-up's sanity pair, Real scenario.
const saoPaulo: CompareSide = {
  code: '3550308',
  name: 'São Paulo',
  rank: { position: 1, of: 645 },
  biomethane: 51_800_000,
  sectors: { agricultural: 1_000, livestock: 2_000, urban: 3_000_000 },
  topResidues: [{ key: 'rsu', tons: 2_500_000 }, { key: 'sewage', tons: 400_000 }, { key: 'rpo', tons: 100_000 }],
  landCover: {
    groups: { native: 30_000, pasture: 1_000, cane: 0, other_farming: 2_000, urban_other: 120_000 },
    farmlandShare: 0.02,
  },
  pipelineKm: 2.0,
  biogasPlants: 3,
}
const ribeirao: CompareSide = {
  ...saoPaulo,
  code: '3543402',
  name: 'Ribeirão Preto',
  rank: { position: 11, of: 645 },
  biomethane: 10_300_000,
  pipelineKm: 68.7,
  biogasPlants: 0,
  landCover: null,
}

const base: CompareWindowProps = {
  access: 'allowed',
  pair: [],
  sides: [],
  distanceKm: null,
  scenario: 'real',
  onRemove: jest.fn(),
  onClose: jest.fn(),
}
const renderWindow = (props: Partial<CompareWindowProps> = {}) => render(<CompareWindow {...base} {...props} />)

describe('CompareWindow', () => {
  it('asks for a first pick', () => {
    renderWindow()
    expect(screen.getByRole('heading', { name: 'Comparar' })).toBeInTheDocument()
    expect(screen.getByText(/O primeiro que você escolher é o A/)).toBeInTheDocument()
  })

  it('asks a visitor without a session to sign in, coming back to the same pair', () => {
    renderWindow({ access: 'sign_in', pair: ['3550308', '3543402'] })
    const link = screen.getByRole('link', { name: 'Entrar' })
    const next = new URL(link.getAttribute('href') ?? '', 'http://x').searchParams.get('next') ?? ''
    expect(new URLSearchParams(next.split('?')[1]).get('pair')).toBe('3550308,3543402')
    expect(screen.queryByText('Posição no estado em biometano')).not.toBeInTheDocument()
  })

  it('tells a pending account to wait', () => {
    renderWindow({ access: 'pending', pair: ['3550308'] })
    expect(screen.getByText('Seu pedido de acesso está em análise')).toBeInTheDocument()
  })

  it('shows A and asks for B', () => {
    renderWindow({ pair: ['3550308'], sides: [saoPaulo] })
    expect(screen.getByText('São Paulo')).toBeInTheDocument()
    expect(screen.getByText('Clique num segundo município')).toBeInTheDocument()
  })

  it('puts the pair side by side, with no data where there is none', () => {
    renderWindow({ pair: ['3550308', '3543402'], sides: [saoPaulo, ribeirao], distanceKm: 297.4 })
    expect(screen.getByText('A 297 km em linha reta')).toBeInTheDocument()
    expect(screen.getByText('1º de 645 em SP')).toBeInTheDocument()
    expect(screen.getByText('11º de 645 em SP')).toBeInTheDocument()
    expect(screen.getByText('51,8 milhões de m³/ano')).toBeInTheDocument()
    expect(screen.getByText('10,3 milhões de m³/ano')).toBeInTheDocument()
    expect(screen.getByText('2 km')).toBeInTheDocument()
    expect(screen.getByText('69 km')).toBeInTheDocument()
    // Ribeirão Preto has no land cover here: "Sem dado", never 0%.
    const land = screen.getByText('Uso da terra em 2025').parentElement!
    expect(within(land).getByText('2% de agropecuária')).toBeInTheDocument()
    expect(within(land).getByText('Sem dado')).toBeInTheDocument()
    // A measured zero stays a zero.
    const plants = screen.getByText('Usinas de biogás hoje').parentElement!
    expect(within(plants).getByText('0')).toBeInTheDocument()
  })

  it('takes a municipality out from its button, and closes', () => {
    const onRemove = jest.fn()
    const onClose = jest.fn()
    renderWindow({ pair: ['3550308', '3543402'], sides: [saoPaulo, ribeirao], onRemove, onClose })
    fireEvent.click(screen.getByRole('button', { name: 'Tirar Ribeirão Preto' }))
    expect(onRemove).toHaveBeenCalledWith('3543402')
    fireEvent.click(screen.getByRole('button', { name: 'Fechar Comparar' }))
    expect(onClose).toHaveBeenCalled()
  })
})

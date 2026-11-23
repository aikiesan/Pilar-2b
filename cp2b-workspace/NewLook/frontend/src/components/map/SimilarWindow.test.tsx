/**
 * The Find similar window, state by state, with the real pt-BR copy.
 */
import { fireEvent, render, screen } from '@testing-library/react'
import SimilarWindow, { type SimilarWindowProps } from './SimilarWindow'
import type { SimilarResult } from '@/lib/similarity'

jest.mock('next-intl', () => jest.requireActual('@/test/mocks/next-intl-real'))
jest.mock('@/navigation', () => ({
  Link: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => <a href={href} {...props}>{children}</a>,
}))

const RIBEIRAO = '3543402'
const origin = { code: RIBEIRAO, name: 'Ribeirão Preto', lat: -21.18, lng: -47.81, vector: [] }
const NAMES = [
  "Santa Bárbara d'Oeste", 'Catanduva', 'Cosmópolis', 'Araraquara', 'Ourinhos', 'Porto Ferreira',
  'Cordeirópolis', 'Leme', 'Araras', 'Santa Gertrudes', 'Matão', 'Serrana',
]
const matches = NAMES.map((name, i) => ({
  code: String(3500001 + i), name, lat: -22, lng: -47, distance: 0.1 + i * 0.01, similarity: 1 - i * 0.05,
}))
const result: SimilarResult = { status: 'ready', origin, matches, skipped: 44 }
// The last match has no biomethane in the map's scenario.
const biomethaneOf = (code: string) => (code === matches[11].code ? null : 12_300_000)

function renderWindow(props: Partial<SimilarWindowProps>) {
  const handlers = { onWithinChange: jest.fn(), onHover: jest.fn(), onOpen: jest.fn(), onClose: jest.fn() }
  render(
    <SimilarWindow
      access="allowed"
      of={null}
      ofName={null}
      within="state"
      dataState="ready"
      result={null}
      biomethaneOf={biomethaneOf}
      scenarioLabel="Real"
      {...handlers}
      {...props}
    />,
  )
  return handlers
}

describe('SimilarWindow', () => {
  it('signed out: asks to sign in, back to this municipality, and offers no toggle', () => {
    renderWindow({ access: 'sign_in', of: RIBEIRAO, within: 'both' })
    expect(screen.getByText('Entre para usar o Parecidos')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: 'Entrar' })
    expect(decodeURIComponent(link.getAttribute('href')!)).toContain(`tool=similar&of=${RIBEIRAO}&within=both`)
    expect(screen.queryByRole('group', { name: 'Onde procurar' })).not.toBeInTheDocument()
  })

  it('pending: says the request is under review', () => {
    renderWindow({ access: 'pending', of: RIBEIRAO })
    expect(screen.getByText('Seu pedido de acesso está em análise')).toBeInTheDocument()
  })

  it('idle: says to click a municipality or use the search', () => {
    renderWindow({})
    expect(screen.getByRole('heading', { name: 'Parecidos' })).toBeInTheDocument()
    expect(screen.getByText(/Clique num município do mapa, ou ache um na busca/)).toBeInTheDocument()
  })

  it('switches where to look, and not to the one already on', () => {
    const { onWithinChange } = renderWindow({})
    expect(screen.getByRole('button', { name: 'Mesmo estado' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Mesmo estado' }))
    expect(onWithinChange).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Os dois estados' }))
    expect(onWithinChange).toHaveBeenCalledWith('both')
  })

  it.each([
    ['loading', 'Carregando o uso do solo.'],
    ['failed', /O uso do solo não carregou/],
    ['unavailable', /O uso do solo ainda não está carregado neste servidor/],
  ] as const)('land cover %s: says so', (dataState, text) => {
    renderWindow({ of: RIBEIRAO, dataState, result })
    expect(screen.getByText(text)).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('no profile: says the municipality has nothing to compare', () => {
    renderWindow({ of: '3500005', ofName: 'Sem perfil', result: { status: 'no_profile', code: '3500005' } })
    expect(screen.getByText(/Sem perfil não tem dados de resíduos, uso do solo ou biometano/)).toBeInTheDocument()
  })

  it('shows the twelve, and each row points at and opens its municipality', () => {
    const { onHover, onOpen } = renderWindow({ of: RIBEIRAO, ofName: 'Ribeirão Preto', result })
    expect(screen.getByRole('heading', { name: 'Mais parecidos com Ribeirão Preto' })).toBeInTheDocument()
    expect(screen.getByText('pela mistura de resíduos, uso do solo e porte')).toBeInTheDocument()
    expect(screen.getByText('Biometano no cenário Real, milhões de m³/ano')).toBeInTheDocument()

    const rows = screen.getAllByRole('listitem').map((li) => li.querySelector('button')!)
    expect(rows).toHaveLength(12)
    expect(rows[0]).toHaveTextContent("Santa Bárbara d'Oeste")
    expect(rows[0]).toHaveTextContent('100% parecido')
    expect(rows[0]).toHaveTextContent('12,3 mi')
    expect(rows[11]).toHaveTextContent('Sem dado')

    fireEvent.mouseEnter(rows[1])
    expect(onHover).toHaveBeenLastCalledWith(matches[1].code)
    fireEvent.mouseLeave(rows[1])
    expect(onHover).toHaveBeenLastCalledWith(null)
    fireEvent.focus(rows[2])
    expect(onHover).toHaveBeenLastCalledWith(matches[2].code)
    fireEvent.blur(rows[2])
    expect(onHover).toHaveBeenLastCalledWith(null)
    fireEvent.click(rows[3])
    expect(onOpen).toHaveBeenCalledWith(matches[3].code)

    expect(screen.getByText(/Ordenados pela proximidade da mistura de resíduos/)).toBeInTheDocument()
    expect(screen.getByText('44 municípios ficaram de fora por falta de dados.')).toBeInTheDocument()
  })

  it('closes', () => {
    const { onClose } = renderWindow({})
    fireEvent.click(screen.getByRole('button', { name: 'Fechar Parecidos' }))
    expect(onClose).toHaveBeenCalled()
  })
})

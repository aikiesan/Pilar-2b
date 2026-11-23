/**
 * The Gather window, state by state, with the real pt-BR copy.
 */
import { fireEvent, render, screen } from '@testing-library/react'
import GatherWindow, { type GatherWindowProps } from './GatherWindow'
import type { GatherResult } from '@/lib/gather'

jest.mock('next-intl', () => jest.requireActual('@/test/mocks/next-intl-real'))
jest.mock('@/navigation', () => ({
  Link: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => <a href={href} {...props}>{children}</a>,
}))
// Motion reduced: the counter shows the whole value at once.
jest.mock('@/lib/mapMotion', () => ({ ...jest.requireActual('@/lib/mapMotion'), prefersReducedMotion: () => true }))

const point = { lat: -21.18, lng: -47.81 }
const member = (code: string, name: string, biomethane: number | null) => ({
  code, name, lat: 0, lng: 0, km: 1, biomethane,
  bySource: { agricultural: 0, livestock: 0, urban: 0, unsplit: 0 }, dominant: null,
})
const result: GatherResult = {
  members: [member('3543402', 'Ribeirão Preto', 60_000_000), member('3113404', 'Capetinga', 40_000_000), member('3500002', 'Sem dado', null)],
  total: 100_000_000,
  bySource: { agricultural: 75_000_000, livestock: 5_000_000, urban: 20_000_000, unsplit: 0 },
  top: [{ code: '3543402', name: 'Ribeirão Preto', share: 0.6 }, { code: '3113404', name: 'Capetinga', share: 0.4 }],
  withoutData: 1,
  crossesBorder: true,
}

function renderWindow(props: Partial<GatherWindowProps>) {
  const handlers = { onRadiusChange: jest.fn(), onClose: jest.fn() }
  render(
    <GatherWindow access="allowed" point={null} place={null} radius={50} result={null} scenarioLabel="Real" {...handlers} {...props} />,
  )
  return handlers
}

describe('GatherWindow', () => {
  it('signed out: asks to sign in, back to this point, and offers no radius', () => {
    renderWindow({ access: 'sign_in', point })
    expect(screen.getByText('Entre para usar o Reunir')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: 'Entrar' })
    expect(decodeURIComponent(link.getAttribute('href')!)).toContain('tool=gather&lat=-21.1800&lng=-47.8100&radius=50')
    expect(screen.queryByRole('group', { name: 'Raio' })).not.toBeInTheDocument()
  })

  it('idle: says to click the map, at the chosen radius', () => {
    renderWindow({ radius: 25 })
    expect(screen.getByText(/num raio de 25 km/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Reunir' })).toBeInTheDocument()
  })

  it('changes the radius from the buttons, and not to the one already on', () => {
    const { onRadiusChange } = renderWindow({})
    fireEvent.click(screen.getByRole('button', { name: '50 km' }))
    expect(onRadiusChange).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '100 km' }))
    expect(onRadiusChange).toHaveBeenCalledWith(100)
  })

  it('shows the total, the power, the sources, the top and the notes', () => {
    renderWindow({ point, place: 'Ribeirão Preto', result })
    expect(screen.getByRole('heading', { name: 'Uma usina em Ribeirão Preto' })).toBeInTheDocument()
    expect(screen.getByText('3 municípios a até 50 km')).toBeInTheDocument()
    // Reduced motion: the counter is whole at once.
    expect(screen.getAllByText('100 milhões de m³/ano')).toHaveLength(2)
    // 100 million m³ × 9.97 kWh × 0.38 / 8760 h ≈ 43 MW.
    expect(screen.getByText(/Cerca de 43 MW/)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Agrícola 75%/ })).toBeInTheDocument()
    expect(screen.getByText('Os que mais contribuem')).toBeInTheDocument()
    expect(screen.getByText('60%')).toBeInTheDocument()
    expect(screen.getByText(/passa a divisa entre São Paulo e Minas Gerais/)).toBeInTheDocument()
    expect(screen.getByText('1 município no círculo sem biometano neste cenário.')).toBeInTheDocument()
  })

  it('says so when nothing in the circle has biomethane', () => {
    renderWindow({ point, result: { ...result, total: 0, top: [], crossesBorder: false } })
    expect(screen.getByText('Nenhum município com biometano neste cenário num raio de 50 km.')).toBeInTheDocument()
  })

  it('closes', () => {
    const { onClose } = renderWindow({})
    fireEvent.click(screen.getByRole('button', { name: 'Fechar Reunir' }))
    expect(onClose).toHaveBeenCalled()
  })
})

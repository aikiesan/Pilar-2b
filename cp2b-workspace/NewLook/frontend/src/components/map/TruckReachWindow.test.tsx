/**
 * The Truck reach window, state by state, with the real pt-BR copy.
 */
import { fireEvent, render, screen } from '@testing-library/react'
import TruckReachWindow, { type TruckReachWindowProps } from './TruckReachWindow'
import type { TruckSite, TruckSummary } from '@/lib/truckReach'

jest.mock('next-intl', () => jest.requireActual('@/test/mocks/next-intl-real'))
jest.mock('@/navigation', () => ({
  Link: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => <a href={href} {...props}>{children}</a>,
}))

const site: TruckSite = {
  site_id: 'ITB_SP_0005', name: 'Usina São Martinho', kind: 'ethanol', ibge_code: '3540705',
  municipality: 'Pradópolis', at_town_centre: false, lon: -48.07, lat: -21.36,
}
const summary: TruckSummary = {
  byLimit: { 30: 5, 60: 24, 90: 53 },
  reached: [],
  caneTons: 1_234_000,
  biomethane: 45_600_000,
  withoutData: 2,
  otherSites: { mills: 3, landfills: 1, plants: 0 },
  pipeline: { minutes: 52.7, km: 61.9, beyond: false },
  circle: { inCircle: 30, slowerByRoad: 12, roadBeyondCircle: 6 },
}

function renderWindow(props: Partial<TruckReachWindowProps>) {
  const handlers = { onLimitChange: jest.fn(), onCircleChange: jest.fn(), onClose: jest.fn() }
  render(
    <TruckReachWindow
      access="allowed"
      siteId={null}
      site={null}
      state="loading"
      summary={null}
      limit={60}
      showCircle={false}
      {...handlers}
      {...props}
    />,
  )
  return handlers
}

describe('TruckReachWindow', () => {
  it('signed out: asks to sign in, back to this site and limit, and offers no limits', () => {
    renderWindow({ access: 'sign_in', siteId: site.site_id, site, limit: 90 })
    expect(screen.getByText('Entre para usar o Alcance do caminhão')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: 'Entrar' })
    expect(decodeURIComponent(link.getAttribute('href')!)).toContain('tool=truck&site=ITB_SP_0005&t=90')
    expect(screen.queryByRole('group', { name: 'Tempo de viagem' })).not.toBeInTheDocument()
    // The site's name waits for the sign-in too.
    expect(screen.getByRole('heading', { name: 'Alcance do caminhão' })).toBeInTheDocument()
  })

  it('pending: says the request is under review', () => {
    renderWindow({ access: 'pending', siteId: site.site_id })
    expect(screen.getByText('Seu pedido de acesso está em análise')).toBeInTheDocument()
  })

  it('idle: says to click a mill or landfill', () => {
    renderWindow({})
    expect(screen.getByRole('heading', { name: 'Alcance do caminhão' })).toBeInTheDocument()
    expect(screen.getByText('Clique numa usina ou aterro para ver até onde um caminhão chega.')).toBeInTheDocument()
  })

  it('idle on a server without routes: says so instead', () => {
    renderWindow({ state: 'unavailable' })
    expect(screen.getByText(/ainda não estão carregadas neste servidor/)).toBeInTheDocument()
    expect(screen.queryByText(/Clique numa usina/)).not.toBeInTheDocument()
  })

  it('switches the limit, and not to the one already on', () => {
    const { onLimitChange } = renderWindow({})
    expect(screen.getByRole('button', { name: '60 min' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: '60 min' }))
    expect(onLimitChange).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '30 min' }))
    expect(onLimitChange).toHaveBeenCalledWith(30)
  })

  it.each([
    ['loading', 'Carregando as rotas.'],
    ['failed', /As rotas não carregaram/],
    ['unavailable', /ainda não estão carregadas neste servidor/],
    ['not_found', 'Não há rotas de caminhão para este local.'],
  ] as const)('routes %s: says so, under the site name', (state, text) => {
    renderWindow({ siteId: site.site_id, site, state })
    expect(screen.getByText(text)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Usina São Martinho' })).toBeInTheDocument()
    expect(screen.getByText('Usina de etanol em Pradópolis')).toBeInTheDocument()
  })

  it('a site outside São Paulo: says trucks are routed there only', () => {
    renderWindow({ siteId: 'X', site: { ...site, ibge_code: '3100104' }, state: 'ready', summary })
    expect(screen.getByText(/cobrem só São Paulo/)).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('ready: the count, the table with the chosen limit, what lies in reach and the pipeline', () => {
    renderWindow({ siteId: site.site_id, site, state: 'ready', summary })
    expect(screen.getByText('24 municípios a até 60 minutos de caminhão')).toBeInTheDocument()
    const rows = screen.getAllByRole('row').map((r) => r.textContent)
    expect(rows).toEqual(['Até 30 minutos5', 'Até 60 minutos24', 'Até 90 minutos53'])
    expect(screen.getByRole('rowheader', { name: 'Até 60 minutos' }).closest('tr')).toHaveClass('font-semibold')
    expect(screen.getByText(/^1\.234 mil t\/ano$/)).toBeInTheDocument()
    expect(screen.getByText('45,6 milhões de m³/ano')).toBeInTheDocument()
    expect(screen.getByText('3 usinas, 1 aterro')).toBeInTheDocument()
    expect(screen.getByText('Gasoduto mais próximo: 53 minutos de caminhão.')).toBeInTheDocument()
    expect(screen.getByText('2 municípios ao alcance não têm dado de cana ou biometano.')).toBeInTheDocument()
  })

  it('ready: says when the pipeline lies past the limit, or past 180 minutes', () => {
    renderWindow({ siteId: site.site_id, site, state: 'ready', limit: 30, summary: { ...summary, pipeline: { minutes: 52.7, km: 61.9, beyond: true } } })
    expect(screen.getByText('Gasoduto mais próximo: 53 minutos de caminhão, além do limite de 30 minutos.')).toBeInTheDocument()
  })

  it('ready without a pipeline in 180 minutes', () => {
    renderWindow({ siteId: site.site_id, site, state: 'ready', summary: { ...summary, pipeline: null } })
    expect(screen.getByText('Nenhum gasoduto a até 180 minutos de caminhão.')).toBeInTheDocument()
  })

  it('weighs the road against the 50 km circle, and toggles the circle', () => {
    const { onCircleChange } = renderWindow({ siteId: site.site_id, site, state: 'ready', summary })
    expect(screen.getByText(
      'Um círculo de 50 km pegaria 30 municípios. 12 deles ficam a mais de 60 minutos pela estrada, e a estrada alcança 6 fora do círculo.',
    )).toBeInTheDocument()
    const toggle = screen.getByRole('button', { name: 'Mostrar um círculo de 50 km' })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(toggle)
    expect(onCircleChange).toHaveBeenCalledWith(true)
  })

  it('says "nenhum" for a zero in the circle sentence, never "0 deles fica"', () => {
    renderWindow({ siteId: site.site_id, site, state: 'ready', summary: { ...summary, circle: { inCircle: 20, slowerByRoad: 0, roadBeyondCircle: 0 } } })
    expect(screen.getByText(
      'Um círculo de 50 km pegaria 20 municípios. Nenhum deles fica a mais de 60 minutos pela estrada, e a estrada não alcança nenhum fora do círculo.',
    )).toBeInTheDocument()
  })

  it('names the plants in reach only when there are some', () => {
    renderWindow({ siteId: site.site_id, site, state: 'ready', summary: { ...summary, otherSites: { mills: 1, landfills: 0, plants: 2 } } })
    // Portuguese counts 0 as one; the copy says "nenhum" instead.
    expect(screen.getByText(/1 usina, nenhum aterro/)).toHaveTextContent('1 usina, nenhum aterro e 2 usinas de biogás ou biometano')
  })

  it('closes', () => {
    const { onClose } = renderWindow({})
    fireEvent.click(screen.getByRole('button', { name: 'Fechar Alcance do caminhão' }))
    expect(onClose).toHaveBeenCalled()
  })
})

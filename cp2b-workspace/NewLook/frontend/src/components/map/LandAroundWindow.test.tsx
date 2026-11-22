/**
 * The Land around window, state by state, with the real pt-BR copy.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import LandAround, { LandAroundWindow, type LandAroundWindowProps } from './LandAroundWindow'
import { ProximityError, type ProximityAnalysisResult } from '@/services/proximityApi'

jest.mock('next-intl', () => jest.requireActual('@/test/mocks/next-intl-real'))
jest.mock('@/navigation', () => ({
  Link: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => <a href={href} {...props}>{children}</a>,
}))
const mockAnalyze = jest.fn()
jest.mock('@/services/proximityApi', () => ({
  ...jest.requireActual('@/services/proximityApi'),
  analyzeProximity: (...args: unknown[]) => mockAnalyze(...args),
}))

const point = { lat: -21.18, lng: -47.81 }
// 20 km circle: 1,256.6 km². Sugar cane 628.3 (50%), pasture 125.7 (10%), planted forest 62.8 (5%).
const result: ProximityAnalysisResult = {
  analysis_id: 'a',
  request: { latitude: point.lat, longitude: point.lng, radius_km: 20 },
  results: {
    buffer_geometry: null,
    municipalities: [{ name: 'Ribeirão Preto', distance_km: 2 }, { name: 'Cravinhos', distance_km: 15 }],
    land_use: {
      total_area_km2: 816.8,
      by_class: {
        '20': { class_id: 20, name: 'Cana-de-açúcar', color: '#db7093', category: 'agricultural', pixel_count: 1, area_km2: 628.32, percent: 0 },
        '15': { class_id: 15, name: 'Pastagem', color: '#edde8e', category: 'agricultural', pixel_count: 1, area_km2: 125.66, percent: 0 },
        '9': { class_id: 9, name: 'Silvicultura', color: '#7a5900', category: 'forestry', pixel_count: 1, area_km2: 62.83, percent: 0 },
        '99': { class_id: 99, name: 'Classe nova', color: '#000000', category: 'agricultural', pixel_count: 1, area_km2: 1, percent: 0 },
      },
      dominant_class: 'Cana-de-açúcar',
      agricultural_percent: 0,
    },
    infrastructure: [
      { type: 'gas_pipeline', name: 'GASBOL', distance_km: 8.42, found: true, max_distance_km: 100 },
      { type: 'substation', name: null, distance_km: null, found: false, max_distance_km: 50 },
    ],
  },
  summary: {
    total_area_km2: 1256.6, total_municipalities: 2, total_population: 0, total_biogas_m3_year: 12_300_000,
    energy_potential_mwh_year: 0, radius_recommendation: 'optimal',
  },
  metadata: { analysis_timestamp: '', processing_time_ms: 1 },
}

function renderWindow(props: Partial<LandAroundWindowProps>) {
  const handlers = { onRadiusChange: jest.fn(), onClose: jest.fn(), onRetry: jest.fn() }
  render(<LandAroundWindow status="idle" point={null} radius={20} {...handlers} {...props} />)
  return handlers
}

describe('LandAroundWindow', () => {
  it('signed out: asks to sign in, back to this point, and offers no radius', () => {
    renderWindow({ status: 'signed_out', point })
    expect(screen.getByText('Entre para usar o Uso do solo no entorno')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: 'Entrar' })
    expect(link.getAttribute('href')).toBe(
      `/login?next=${encodeURIComponent('/map?tool=land&lat=-21.1800&lng=-47.8100&radius=20')}`,
    )
    expect(screen.queryByRole('group', { name: 'Raio' })).not.toBeInTheDocument()
  })

  it('idle: says to click the map, at the chosen radius', () => {
    renderWindow({ status: 'idle', radius: 50 })
    expect(screen.getByText('Clique num ponto do mapa para ver como é usada a terra num raio de 50 km.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Uso do solo no entorno' })).toBeInTheDocument()
  })

  it('loading: says so in a live region', () => {
    renderWindow({ status: 'loading', point })
    expect(screen.getByRole('status')).toHaveTextContent('Medindo a terra em volta deste ponto…')
  })

  it('result: shares of the whole circle, names from the catalog, extras, source', () => {
    renderWindow({ status: 'done', result, point })
    expect(screen.getByRole('heading', { name: 'Num raio de 20 km de Ribeirão Preto' })).toBeInTheDocument()
    expect(screen.getByText('2 municípios, 1.257 km²')).toBeInTheDocument()
    expect(screen.getByText('50% de lavouras')).toBeInTheDocument()
    expect(screen.getByText('10% de pastagem, 5% de silvicultura')).toBeInTheDocument()
    // Catalog names, a served name for a class the catalog lacks, and the remainder.
    expect(screen.getByText('Cana-de-açúcar')).toBeInTheDocument()
    expect(screen.getByText('Silvicultura')).toBeInTheDocument()
    expect(screen.getByText('Classe nova')).toBeInTheDocument()
    expect(screen.getByText('Fora da agropecuária (vegetação nativa, cidades, água)')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Uso do solo dentro do círculo' })).toBeInTheDocument()
    expect(screen.getByText('12,3 milhões de m³/ano')).toBeInTheDocument()
    expect(screen.getByText('8,4 km')).toBeInTheDocument()
    expect(screen.getByText('Nenhum a até 50 km')).toBeInTheDocument()
    expect(screen.getByText('MapBiomas Coleção 10, 2024. O uso do solo está mapeado só para São Paulo.')).toBeInTheDocument()
  })

  it('result: the clicked municipality names the place before the server does', () => {
    renderWindow({ status: 'done', result, point, placeHint: 'Sertãozinho' })
    expect(screen.getByRole('heading', { name: 'Num raio de 20 km de Sertãozinho' })).toBeInTheDocument()
  })

  it('empty: no farming found, and why', () => {
    const empty = { ...result, results: { ...result.results, municipalities: [], land_use: { ...result.results.land_use!, by_class: {} } } }
    renderWindow({ status: 'done', result: empty, point })
    expect(screen.getByRole('heading', { name: 'Num raio de 20 km deste ponto' })).toBeInTheDocument()
    expect(screen.getByText(/Nenhuma área agropecuária num raio de 20 km/)).toBeInTheDocument()
    expect(screen.queryByText(/de lavouras/)).not.toBeInTheDocument()
  })

  it('error: outside São Paulo, with no retry', () => {
    renderWindow({ status: 'error', error: new ProximityError('invalid_coordinates'), point })
    expect(screen.getByRole('alert')).toHaveTextContent('Este ponto está fora de São Paulo')
    expect(screen.queryByRole('button', { name: 'Tentar de novo' })).not.toBeInTheDocument()
  })

  it('error: a rate limit says how long to wait, and offers a retry', () => {
    const { onRetry } = renderWindow({ status: 'error', error: new ProximityError('rate_limited', 30), point })
    expect(screen.getByRole('alert')).toHaveTextContent('Aguarde 30 segundos')
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(onRetry).toHaveBeenCalled()
  })

  it('changes the radius and closes', () => {
    const { onRadiusChange, onClose } = renderWindow({ status: 'done', result, point })
    expect(screen.getByRole('button', { name: '20 km', pressed: true })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '50 km' }))
    expect(onRadiusChange).toHaveBeenCalledWith(50)
    fireEvent.click(screen.getByRole('button', { name: 'Fechar Uso do solo no entorno' }))
    expect(onClose).toHaveBeenCalled()
  })
})

describe('LandAround (with its request)', () => {
  beforeEach(() => mockAnalyze.mockReset())
  const props = { radius: 20 as const, onRadiusChange: jest.fn(), onClose: jest.fn() }

  it('asks for land use, biogas and infrastructure, then shows the result', async () => {
    mockAnalyze.mockResolvedValue(result)
    render(<LandAround {...props} point={point} signedIn />)
    expect(await screen.findByText('50% de lavouras')).toBeInTheDocument()
    expect(mockAnalyze).toHaveBeenCalledWith({
      latitude: -21.18, longitude: -47.81, radius_km: 20,
      options: { include_mapbiomas: true, include_biogas_potential: true, include_infrastructure: true },
    })
  })

  it('refuses a point outside São Paulo without asking the server', async () => {
    render(<LandAround {...props} point={{ lat: -18.9, lng: -46.5 }} signedIn />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Este ponto está fora de São Paulo')
    expect(mockAnalyze).not.toHaveBeenCalled()
  })

  it('shows a failed request and retries it', async () => {
    mockAnalyze.mockRejectedValueOnce(new ProximityError('network')).mockResolvedValueOnce(result)
    render(<LandAround {...props} point={point} signedIn />)
    fireEvent.click(await screen.findByRole('button', { name: 'Tentar de novo' }))
    await waitFor(() => expect(screen.getByText('50% de lavouras')).toBeInTheDocument())
    expect(mockAnalyze).toHaveBeenCalledTimes(2)
  })

  it('asks nothing of the server for a signed-out visitor', () => {
    render(<LandAround {...props} point={point} signedIn={false} />)
    expect(screen.getByText('Entre para usar o Uso do solo no entorno')).toBeInTheDocument()
    expect(mockAnalyze).not.toHaveBeenCalled()
  })
})

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import ResultsDashboard from './ResultsDashboard'
import { ALL_OUTPUT_TYPES, runCalculation } from '../calculatorEngine'

// Every label comes from the real (pt-BR) catalog.
jest.mock('next-intl', () => jest.requireActual('@/test/mocks/next-intl-real'))
jest.mock('@/contexts/ThemeContext', () => ({ useTheme: () => ({ resolvedTheme: 'light' }) }))
// Recharts measures a real DOM; a fixed-size container keeps jsdom quiet.
jest.mock('recharts', () => {
  const actual = jest.requireActual('recharts')
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactElement }) => (
      <div style={{ width: 400, height: 160 }}>{children}</div>
    ),
  }
})

// The climate panel asks the backend; answer as POST /api/v1/ghg/estimate would.
const mockEstimate = jest.fn()
jest.mock('../ghgApi', () => ({
  ...jest.requireActual('../ghgApi'),
  estimateGhg: (...args: unknown[]) => mockEstimate(...args),
}))
beforeEach(() => {
  mockEstimate.mockReset().mockResolvedValue({
    be_methane_t: 1200, be_fossil_t: 300, pe_leak_t: 40, pe_slip_t: 10, pe_flare_t: 0,
    pe_total_t: 50, er_net_t: 1450, gwp_version: 'AR6', gwp_value: 27,
    leak_break_even: 0.62, assumptions: { leak: 0.025 }, unverified: ['linhas_de_base.lagoa_anaerobia'],
  })
})

function renderResults(activity: 'sugarcane' | 'swine' | 'corn') {
  const result =
    activity === 'sugarcane'
      ? runCalculation('sugarcane', { type: 'hectares', value: 40 }, null, [4, 5, 6, 7, 8, 9], ['energy', 'carbon'])
      : activity === 'swine'
        ? runCalculation('swine', null, { heads: { swine: 800 } }, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], ['biomethane'])
        : runCalculation('corn', null, null, [7, 8, 9], ALL_OUTPUT_TYPES, { tonnes: 2000 })
  return render(<ResultsDashboard result={result} municipalityName="Campinas" onReset={jest.fn()} />)
}

describe('ResultsDashboard', () => {
  it.each(['sugarcane', 'swine', 'corn'] as const)('renders %s results with no unresolved message keys', (activity) => {
    const { container } = renderResults(activity)
    expect(container.textContent).not.toMatch(/calculator\.|common\.units\./)
    // ICU arguments are all supplied: no "{name}" placeholder survives.
    expect(container.textContent).not.toMatch(/\{\w+\}/)
  })

  it('words the activity summary from the engine’s quantity', () => {
    renderResults('sugarcane')
    expect(screen.getByText('Cana-de-açúcar (40 ha)')).toBeInTheDocument()
    expect(screen.getByText('Potencial estimado em Campinas')).toBeInTheDocument()
  })

  it('names the scenarios and marks the selected one', () => {
    renderResults('swine')
    const ideal = screen.getByRole('button', { name: /Ideal — Biodigestor CSTR/ })
    expect(ideal).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: /Básico — Lagoa coberta/ }))
    expect(screen.getByRole('button', { name: /Básico — Lagoa coberta/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('formats money and months for the page locale', () => {
    const { container } = renderResults('corn')
    expect(container.textContent).toMatch(/R\$\s[\d.]+/)
    expect(container.textContent).not.toMatch(/\d+k\b/) // the old "R$ 350k" shorthand
  })

  it('explains the assumptions with the engine’s own numbers', () => {
    const { container } = renderResults('corn')
    expect(container.textContent).toContain('Aproveita cerca de 55% do potencial')
    expect(container.textContent).toContain('110% de realização de receita')
    expect(container.textContent).toContain('acima de 40 anos')
  })

  it('shows the three parts of the climate result, never a credit price', async () => {
    renderResults('sugarcane') // carbon selected
    expect(await screen.findByText('Redução líquida')).toBeInTheDocument()
    expect(screen.getByText('Metano evitado (linha de base)')).toBeInTheDocument()
    expect(screen.getByText(/O benefício zera se o vazamento chegar a 62/)).toBeInTheDocument()
    expect(screen.getByText(/GWP do metano: AR6/)).toBeInTheDocument()
    expect(screen.queryByText('Crédito de carbono')).not.toBeInTheDocument()
  })

  it('asks the backend with the scenario methane and the default route of the products', async () => {
    renderResults('swine') // biomethane only
    await screen.findByText('Redução líquida')
    const [req] = mockEstimate.mock.calls.at(-1)
    expect(req).toMatchObject({ baseline: 'nao_informado', route: 'biometano_veicular', slip_technology: 'lavagem_agua' })
    expect(req).not.toHaveProperty('leak') // ghg.yaml's default until the user moves the slider
    expect(req.ch4_produced_nm3_year).toBeGreaterThan(0)
  })

  it('says so when the GHG API cannot answer', async () => {
    mockEstimate.mockResolvedValue(null)
    renderResults('sugarcane')
    expect(await screen.findByText(/indisponível/)).toBeInTheDocument()
  })
})

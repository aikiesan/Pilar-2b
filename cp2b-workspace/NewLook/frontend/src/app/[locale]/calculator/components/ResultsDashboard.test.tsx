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
})

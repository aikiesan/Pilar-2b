/**
 * The bivariate legend, with the real pt-BR copy: a built-in analysis exactly
 * as it always read, and a registry one with its own labels.
 */
import { render, screen } from '@testing-library/react'
import { useTranslations } from 'next-intl'
import BivariateLegend from './BivariateLegend'
import type { AnalysisResult } from '@/lib/mapAnalyses'
import { builtInView, registryView, type RegistryAnalysisMeta } from '@/lib/analysisRegistry'

jest.mock('next-intl', () => jest.requireActual('@/test/mocks/next-intl-real'))

const result: AnalysisResult = {
  id: 'lacuna',
  xBreaks: [1000, 50000],
  yBreaks: [1, 2],
  byCode: new Map(),
  counts: [10, 20, 30, 40, 50, 60, 70, 80, 90],
  noData: 5,
}

function Lacuna() {
  const t = useTranslations('Map.analyses')
  return <BivariateLegend view={builtInView('lacuna', t)} result={result} stateLabel="São Paulo" />
}

// Made up: the repository is public.
const demoMeta: RegistryAnalysisMeta = {
  id: 'demo_xy',
  title: { pt: 'Demo XY', en: 'Demo XY (en)' },
  question: { pt: 'Onde X e Y se encontram?', en: 'Where do X and Y meet?' },
  source: null,
  x_label: { pt: 'Eixo X', en: 'X axis' },
  y_label: { pt: 'Eixo Y', en: 'Y axis' },
  answer_cell: 8,
  layers: [],
  uf_prefixes: ['35'],
}
const demoResult: AnalysisResult = {
  id: 'r:demo_xy',
  xBreaks: [10, 20],
  yBreaks: [3, 7],
  byCode: new Map(),
  counts: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  noData: 0,
}

describe('BivariateLegend', () => {
  it('the four built-ins render exactly as before', () => {
    render(<Lacuna />)
    const section = screen.getByRole('region', { name: 'Potencial sem planta' })
    expect(screen.getByRole('heading', { name: 'Onde há metano e nenhuma usina de biogás?' })).toBeInTheDocument()
    expect(section.textContent).toBe(
      'Onde há metano e nenhuma usina de biogás?' +
        'Usinas de biogás ↑2+10' +
        '708090405060102030' +
        '< 1 mil1 mil–50 mil≥ 50 mil' +
        'Metano →' +
        '30 municípios na célula destacada: muito metano e nenhuma usina.' +
        'Classes em tercis entre os municípios de São Paulo com valor. Usinas em 0, 1 e 2 ou mais. ' +
        '5 municípios sem dado, em cinza.',
    )
  })

  it('legend runs an inverted registry axis backwards: the top row is the shortest distance', () => {
    const view = registryView({ ...demoMeta, y_invert: true }, 'pt-BR', 'x')
    render(<BivariateLegend view={view} result={demoResult} stateLabel="São Paulo" />)
    const text = screen.getByRole('region', { name: 'Demo XY' }).textContent ?? ''
    // Rows are drawn top (class 2) to bottom (class 0).
    expect(text.indexOf('< 3')).toBeGreaterThanOrEqual(0)
    expect(text.indexOf('< 3')).toBeLessThan(text.indexOf('≥ 7'))
    // The x axis is not inverted and keeps its order.
    expect(text.indexOf('< 10')).toBeLessThan(text.indexOf('≥ 20'))
  })

  it('legend draws a registry view with its own labels and the generic answer', () => {
    const view = registryView(demoMeta, 'pt-BR', 'municípios na célula em destaque')
    render(<BivariateLegend view={view} result={demoResult} stateLabel="São Paulo" />)
    const section = screen.getByRole('region', { name: 'Demo XY' })
    expect(screen.getByRole('heading', { name: 'Onde X e Y se encontram?' })).toBeInTheDocument()
    expect(section).toHaveTextContent('Eixo Y ↑')
    expect(section).toHaveTextContent('Eixo X →')
    expect(section).toHaveTextContent('< 10')
    expect(section).toHaveTextContent('10–20')
    expect(section).toHaveTextContent('≥ 7')
    // The answer cell (8) holds 9: the count, then the generic answer.
    expect(section).toHaveTextContent('9 municípios na célula em destaque')
    expect(section).not.toHaveTextContent('Usinas em 0, 1 e 2')
    expect(section.querySelector('.ring-2')).toHaveTextContent('9')
  })

  it('shows the registry source after the method line, when there is one', () => {
    const view = registryView({ ...demoMeta, source: { pt: 'Fonte demo, 2024', en: 'Demo source, 2024' } }, 'pt-BR', 'x')
    render(<BivariateLegend view={view} result={demoResult} stateLabel="São Paulo" />)
    expect(screen.getByText('Fonte demo, 2024')).toBeInTheDocument()
  })

  it('shows nothing for an empty source, and the built-in legend has none', () => {
    const empty = registryView({ ...demoMeta, source: { pt: '', en: '' } }, 'pt-BR', 'x')
    const { container, unmount } = render(<BivariateLegend view={empty} result={demoResult} stateLabel="São Paulo" />)
    expect(container.querySelectorAll('p')).toHaveLength(3) // x axis title, answer, method
    unmount()
    const c2 = render(<Lacuna />).container
    expect(c2.querySelectorAll('p')).toHaveLength(3)
  })
})

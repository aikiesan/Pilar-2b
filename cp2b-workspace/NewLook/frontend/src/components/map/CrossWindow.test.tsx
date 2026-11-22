/**
 * The Cruzar window, state by state, with the real pt-BR copy.
 */
import { fireEvent, render, screen } from '@testing-library/react'
import CrossWindow, { type CrossWindowProps } from './CrossWindow'
import type { AnalysisResult } from '@/lib/mapAnalyses'

jest.mock('next-intl', () => jest.requireActual('@/test/mocks/next-intl-real'))
jest.mock('@/navigation', () => ({
  Link: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => <a href={href} {...props}>{children}</a>,
}))

const result: AnalysisResult = {
  id: 'codigestao',
  xBreaks: [100, 1000],
  yBreaks: [50, 500],
  byCode: new Map(),
  counts: [10, 20, 30, 40, 50, 60, 70, 80, 90],
  noData: 5,
}

const base: CrossWindowProps = {
  access: 'allowed',
  active: null,
  onChoose: jest.fn(),
  onClose: jest.fn(),
  result: null,
  loading: false,
  failed: false,
  palette: 'default',
  stateLabel: 'São Paulo',
  picked: null,
}
const renderWindow = (props: Partial<CrossWindowProps> = {}) => render(<CrossWindow {...base} {...props} />)

describe('CrossWindow', () => {
  it('offers the four questions, none chosen', () => {
    renderWindow()
    expect(screen.getByRole('heading', { name: 'Cruzar dados' })).toBeInTheDocument()
    expect(screen.getByText(/Escolha uma pergunta/)).toBeInTheDocument()
    const group = screen.getByRole('group', { name: 'Perguntas' })
    expect(group.querySelectorAll('button')).toHaveLength(4)
    expect(screen.queryByRole('button', { pressed: true })).not.toBeInTheDocument()
  })

  it('chooses a question, and choosing it again turns it off', () => {
    const onChoose = jest.fn()
    const { rerender } = renderWindow({ onChoose })
    fireEvent.click(screen.getByRole('button', { name: /Com quem codigerir/ }))
    expect(onChoose).toHaveBeenLastCalledWith('codigestao')

    rerender(<CrossWindow {...base} onChoose={onChoose} active="codigestao" result={result} />)
    fireEvent.click(screen.getByRole('button', { name: /Com quem codigerir/, pressed: true }))
    expect(onChoose).toHaveBeenLastCalledWith(null)
  })

  it('shows the reading under the choices, with the state in the method', () => {
    renderWindow({ active: 'codigestao', result })
    expect(screen.getByRole('heading', { name: 'Onde resíduo agrícola e pecuário se encontram?' })).toBeInTheDocument()
    expect(screen.getByText(/municípios de São Paulo com valor/)).toBeInTheDocument()
    expect(screen.getByText(/Clique num município/)).toBeInTheDocument()
    // No close of its own inside the window: the window closes itself.
    expect(screen.getAllByRole('button', { name: /Fechar/ })).toHaveLength(1)
  })

  it('marks the picked municipality in its cell', () => {
    const { container } = renderWindow({
      active: 'codigestao',
      result,
      picked: { name: 'Ribeirão Preto', status: 'cell', cell: 4 },
    })
    expect(screen.getByText('Ribeirão Preto está na célula marcada.')).toBeInTheDocument()
    const marked = container.querySelectorAll('[data-picked]')
    expect(marked).toHaveLength(1)
    expect(marked[0]).toHaveTextContent('50')
  })

  it('says when the pick has no cell, or lies outside the state read', () => {
    const { rerender } = renderWindow({ active: 'codigestao', result, picked: { name: 'Ilhabela', status: 'no_data', cell: null } })
    expect(screen.getByText('Ilhabela não tem os dois dados, e fica em cinza.')).toBeInTheDocument()

    rerender(<CrossWindow {...base} active="codigestao" result={result} picked={{ name: 'Uberaba', status: 'outside', cell: null }} />)
    expect(screen.getByText('Uberaba fica fora de São Paulo, que esta leitura cobre.')).toBeInTheDocument()
  })

  it('asks a visitor without a session to sign in, coming back to the same analysis', () => {
    renderWindow({ access: 'sign_in', active: 'lacuna' })
    const link = screen.getByRole('link', { name: 'Entrar' })
    const next = new URL(link.getAttribute('href') ?? '', 'http://x').searchParams.get('next') ?? ''
    expect(next).toBe('/map?tool=cross&a=lacuna')
    expect(screen.queryByRole('group', { name: 'Perguntas' })).not.toBeInTheDocument()
  })

  it('tells a pending account to wait', () => {
    renderWindow({ access: 'pending' })
    expect(screen.getByText('Seu pedido de acesso está em análise')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Perguntas' })).not.toBeInTheDocument()
  })

  it('closes', () => {
    const onClose = jest.fn()
    renderWindow({ onClose })
    fireEvent.click(screen.getByRole('button', { name: 'Fechar Cruzar dados' }))
    expect(onClose).toHaveBeenCalled()
  })
})

import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import AnalysesTab from './AnalysesTab'
import * as adminClient from '@/lib/api/adminClient'

jest.mock('@/lib/api/adminClient')
const api = adminClient as jest.Mocked<typeof adminClient>

const analysis = (over: Partial<adminClient.AdminAnalysis> = {}): adminClient.AdminAnalysis => ({
  id: 'demo_xy',
  title_pt: 'Análise de demonstração',
  level: 2,
  opens_at: null,
  is_active: true,
  municipalities: 12,
  grants: 1,
  ...over,
})

const bruna: adminClient.AdminUser = {
  id: 'u2',
  email: 'bruna@example.org',
  full_name: 'Bruna Teste',
  role: 'autenticado',
  clearance: 1,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  last_login_at: null,
}
const grant: adminClient.AdminGrant = {
  user_id: 'u3',
  full_name: 'Caio Teste',
  email: 'caio@example.org',
  granted_by_name: 'Adm Teste',
  granted_at: '2026-11-01T12:00:00Z',
  expires_at: null,
  note: 'piloto',
}

beforeEach(() => {
  jest.resetAllMocks()
  api.listAnalyses.mockResolvedValue([analysis()])
  api.listUsers.mockResolvedValue([bruna])
  api.listGrants.mockResolvedValue([grant])
  api.patchAnalysis.mockResolvedValue(analysis())
  api.putGrant.mockResolvedValue(grant)
  api.deleteGrant.mockResolvedValue(undefined)
})

it('sets an analysis level and opening date', async () => {
  render(<AnalysesTab />)
  fireEvent.change(await screen.findByLabelText('Nível de Análise de demonstração'), {
    target: { value: '0' },
  })
  expect(api.patchAnalysis).not.toHaveBeenCalled()
  expect(
    screen.getByText('Abrir para 0 Público? Qualquer visitante passa a ver.'),
  ).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
  await waitFor(() => expect(api.patchAnalysis).toHaveBeenCalledWith('demo_xy', { level: 0 }))

  fireEvent.change(screen.getByLabelText('Abertura de Análise de demonstração'), {
    target: { value: '2027-03-01' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Salvar abertura' }))
  expect(api.patchAnalysis).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
  await waitFor(() =>
    expect(api.patchAnalysis).toHaveBeenCalledWith('demo_xy', {
      opens_at: '2027-03-01T00:00:00-03:00',
    }),
  )
  expect(api.listAnalyses.mock.calls.length).toBeGreaterThanOrEqual(3)
})

it('clears the opening date with null and shows it in pt-BR', async () => {
  api.listAnalyses.mockResolvedValue([analysis({ opens_at: '2027-03-01T03:00:00Z' })])
  render(<AnalysesTab />)
  expect(await screen.findByText('01/03/2027')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Limpar' }))
  await waitFor(() => expect(api.patchAnalysis).toHaveBeenCalledWith('demo_xy', { opens_at: null }))
})

it('grants an analysis to one person with an expiry, and revokes it', async () => {
  render(<AnalysesTab />)
  fireEvent.click(await screen.findByRole('button', { name: /Liberações/ }))
  const list = await screen.findByRole('region', { name: 'Liberações' })
  expect(await within(list).findByText('Caio Teste')).toBeInTheDocument()
  expect(within(list).getByText('caio@example.org')).toBeInTheDocument()
  expect(within(list).getByText('Adm Teste')).toBeInTheDocument()
  expect(within(list).getByText('piloto')).toBeInTheDocument()

  fireEvent.change(within(list).getByLabelText('Buscar pessoa'), { target: { value: 'bruna@' } })
  fireEvent.click(within(list).getByRole('button', { name: /Bruna Teste/ }))
  fireEvent.change(within(list).getByLabelText('Vencimento'), { target: { value: '2027-06-30' } })
  fireEvent.change(within(list).getByLabelText('Nota'), { target: { value: 'revisão' } })
  expect(within(list).getByText('7/200')).toBeInTheDocument()
  fireEvent.click(within(list).getByRole('button', { name: 'Liberar' }))
  await waitFor(() =>
    expect(api.putGrant).toHaveBeenCalledWith('demo_xy', 'u2', {
      expires_at: '2027-06-30T00:00:00-03:00',
      note: 'revisão',
    }),
  )
  await waitFor(() => expect(api.listGrants).toHaveBeenCalledTimes(2))

  fireEvent.click(within(list).getByRole('button', { name: 'Tirar' }))
  expect(api.deleteGrant).not.toHaveBeenCalled()
  fireEvent.click(within(list).getByRole('button', { name: 'Confirmar' }))
  await waitFor(() => expect(api.deleteGrant).toHaveBeenCalledWith('demo_xy', 'u3'))
})

it('shows an API error inline in the analysis row', async () => {
  api.patchAnalysis.mockRejectedValue(new Error('Não foi possível salvar.'))
  render(<AnalysesTab />)
  fireEvent.change(await screen.findByLabelText('Nível de Análise de demonstração'), {
    target: { value: '3' },
  })
  const row = screen.getByText('Análise de demonstração').closest('tr') as HTMLElement
  expect(await within(row).findByRole('alert')).toHaveTextContent('Não foi possível salvar.')
})

it('cancelling a widening change calls nothing', async () => {
  render(<AnalysesTab />)
  fireEvent.change(await screen.findByLabelText('Nível de Análise de demonstração'), {
    target: { value: '0' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
  expect(screen.queryByText(/Abrir para/)).not.toBeInTheDocument()
  expect(api.patchAnalysis).not.toHaveBeenCalled()
})

it('raising the level, deactivating and clearing apply at once', async () => {
  api.listAnalyses.mockResolvedValue([analysis({ opens_at: '2027-03-01T03:00:00Z' })])
  render(<AnalysesTab />)
  fireEvent.change(await screen.findByLabelText('Nível de Análise de demonstração'), {
    target: { value: '3' },
  })
  await waitFor(() => expect(api.patchAnalysis).toHaveBeenCalledWith('demo_xy', { level: 3 }))
  fireEvent.click(screen.getByRole('checkbox', { name: 'Ativa' }))
  await waitFor(() => expect(api.patchAnalysis).toHaveBeenCalledWith('demo_xy', { is_active: false }))
  fireEvent.click(screen.getByRole('button', { name: 'Limpar' }))
  await waitFor(() => expect(api.patchAnalysis).toHaveBeenCalledWith('demo_xy', { opens_at: null }))
  expect(screen.queryByRole('button', { name: 'Confirmar' })).not.toBeInTheDocument()
})

it('activating an inactive analysis asks first', async () => {
  api.listAnalyses.mockResolvedValue([analysis({ is_active: false })])
  render(<AnalysesTab />)
  fireEvent.click(await screen.findByRole('checkbox', { name: 'Ativa' }))
  expect(api.patchAnalysis).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
  await waitFor(() => expect(api.patchAnalysis).toHaveBeenCalledWith('demo_xy', { is_active: true }))
})

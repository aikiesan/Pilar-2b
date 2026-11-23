import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import RequestsTab from './RequestsTab'
import * as adminClient from '@/lib/api/adminClient'

jest.mock('@/lib/api/adminClient')
const api = adminClient as jest.Mocked<typeof adminClient>

const req = (over = {}) => ({
  id: 'u1',
  email: 'ana@usp.br',
  full_name: 'Ana Pesquisadora',
  institution: 'USP',
  purpose: 'Estudo regional de potencial',
  status: 'pending_review' as const,
  clearance: 0,
  created_at: '2026-11-20T12:00:00Z',
  email_verified_at: '2026-11-20T12:10:00Z',
  reviewed_at: null,
  review_note: null,
  ...over,
})

beforeEach(() => {
  jest.resetAllMocks()
  api.listRequests.mockResolvedValue([req()] as never)
  api.approveRequest.mockResolvedValue(req({ status: 'approved' }) as never)
  api.rejectRequest.mockResolvedValue(req({ status: 'rejected' }) as never)
})

it('lists the requests waiting for a decision, with what the person wrote', async () => {
  const onPendingCount = jest.fn()
  render(<RequestsTab onPendingCount={onPendingCount} />)
  expect(await screen.findByText('Ana Pesquisadora')).toBeInTheDocument()
  expect(screen.getByText('Estudo regional de potencial')).toBeInTheDocument()
  expect(screen.getByText('ana@usp.br')).toBeInTheDocument()
  expect(screen.getByText('USP')).toBeInTheDocument()
  expect(api.listRequests).toHaveBeenCalledWith('pending_review')
  expect(onPendingCount).toHaveBeenCalledWith(1)
  // Level 1 is offered first, and level 0 is not offered at all.
  const level = screen.getByRole('combobox', { name: 'Nível de Ana Pesquisadora' })
  expect(level).toHaveValue('1')
  expect(Array.from((level as HTMLSelectElement).options).map((o) => o.value)).toEqual(['1', '2', '3'])
})

it('approves at the chosen level and refreshes the list', async () => {
  render(<RequestsTab />)
  const level = await screen.findByRole('combobox', { name: 'Nível de Ana Pesquisadora' })
  fireEvent.change(level, { target: { value: '2' } })
  api.listRequests.mockResolvedValue([] as never)
  fireEvent.click(screen.getByRole('button', { name: 'Aprovar' }))
  await waitFor(() => expect(api.approveRequest).toHaveBeenCalledWith('u1', 2))
  expect(await screen.findByText(/aprovado\(a\) com nível 2/)).toBeInTheDocument()
  expect(await screen.findByText('Nenhum pedido esperando decisão.')).toBeInTheDocument()
})

it('refuses with the reason typed, or none', async () => {
  render(<RequestsTab />)
  fireEvent.click(await screen.findByRole('button', { name: 'Recusar' }))
  fireEvent.change(screen.getByLabelText(/Motivo/), { target: { value: '  Fora do escopo ' } })
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar recusa' }))
  await waitFor(() => expect(api.rejectRequest).toHaveBeenCalledWith('u1', 'Fora do escopo'))

  fireEvent.click(await screen.findByRole('button', { name: 'Recusar' }))
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar recusa' }))
  await waitFor(() => expect(api.rejectRequest).toHaveBeenLastCalledWith('u1', null))
})

it('cancelling a refusal changes nothing', async () => {
  render(<RequestsTab />)
  fireEvent.click(await screen.findByRole('button', { name: 'Recusar' }))
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
  expect(api.rejectRequest).not.toHaveBeenCalled()
  expect(screen.getByRole('button', { name: 'Aprovar' })).toBeInTheDocument()
})

it('shows the refused list with its reason, where only approving is left', async () => {
  render(<RequestsTab />)
  await screen.findByText('Ana Pesquisadora')
  api.listRequests.mockResolvedValue([
    req({ status: 'rejected', review_note: 'Fora do escopo', reviewed_at: '2026-11-21T10:00:00Z' }),
  ] as never)
  fireEvent.click(screen.getByRole('button', { name: 'Recusados' }))
  expect(await screen.findByText('Motivo: Fora do escopo')).toBeInTheDocument()
  expect(api.listRequests).toHaveBeenLastCalledWith('rejected')
  expect(screen.getByRole('button', { name: 'Aprovar' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Recusar' })).not.toBeInTheDocument()
})

it('shows a failure in the row that caused it', async () => {
  api.approveRequest.mockRejectedValue(new Error('Este pedido já foi decidido. Atualize a página.'))
  render(<RequestsTab />)
  fireEvent.click(await screen.findByRole('button', { name: 'Aprovar' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('já foi decidido')
})

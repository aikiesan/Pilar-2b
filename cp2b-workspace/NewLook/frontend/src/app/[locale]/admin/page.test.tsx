import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import AdminPage from './page'
import * as adminClient from '@/lib/api/adminClient'
import { notFound } from 'next/navigation'

jest.mock('next/navigation', () => ({ notFound: jest.fn() }))
jest.mock('@/lib/api/adminClient')
jest.mock('@/components/admin/PeopleTab', () => ({
  __esModule: true,
  default: () => <div>painel de pessoas</div>,
}))
jest.mock('@/components/admin/AnalysesTab', () => ({
  __esModule: true,
  default: () => <div>painel de análises</div>,
}))
jest.mock('@/components/admin/RequestsTab', () => ({
  __esModule: true,
  default: () => <div>painel de pedidos</div>,
}))
const api = adminClient as jest.Mocked<typeof adminClient>

const me = (over = {}) => ({
  id: 'admin1',
  email: 'a@example.org',
  full_name: 'Adm',
  role: 'admin',
  clearance: 3,
  is_active: true,
  created_at: '',
  updated_at: '',
  ...over,
})

beforeEach(() => jest.resetAllMocks())

it('is shown to an active admin, opening on the requests with their count', async () => {
  api.fetchSession.mockResolvedValue(me() as never)
  api.listRequests.mockResolvedValue([{ id: 'r1' }, { id: 'r2' }] as never)
  render(<AdminPage />)
  expect(await screen.findByText('painel de pedidos')).toBeInTheDocument()
  expect(await screen.findByRole('button', { name: 'Pedidos 2 para decidir' })).toBeInTheDocument()
  expect(api.listRequests).toHaveBeenCalledWith('pending_review')
  fireEvent.click(screen.getByRole('button', { name: 'Pessoas' }))
  expect(screen.getByText('painel de pessoas')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Análises' }))
  expect(screen.getByText('painel de análises')).toBeInTheDocument()
  expect(notFound).not.toHaveBeenCalled()
})

it('shows no count when nothing waits', async () => {
  api.fetchSession.mockResolvedValue(me() as never)
  api.listRequests.mockResolvedValue([] as never)
  render(<AdminPage />)
  expect(await screen.findByRole('button', { name: 'Pedidos' })).toBeInTheDocument()
})

it('is not shown to a non-admin', async () => {
  api.fetchSession.mockResolvedValue(me({ role: 'interno' }) as never)
  render(<AdminPage />)
  await waitFor(() => expect(notFound).toHaveBeenCalled())
  expect(screen.queryByText('painel de pessoas')).not.toBeInTheDocument()
})

it('is not shown to an inactive admin', async () => {
  api.fetchSession.mockResolvedValue(me({ is_active: false }) as never)
  render(<AdminPage />)
  await waitFor(() => expect(notFound).toHaveBeenCalled())
})

it('is not shown without a real session (open mode synthetic user)', async () => {
  api.fetchSession.mockResolvedValue(null)
  render(<AdminPage />)
  await waitFor(() => expect(notFound).toHaveBeenCalled())
  expect(screen.queryByText('painel de pessoas')).not.toBeInTheDocument()
})

it('is not shown when the check fails', async () => {
  api.fetchSession.mockRejectedValue(new Error('boom'))
  render(<AdminPage />)
  await waitFor(() => expect(notFound).toHaveBeenCalled())
})

it('renders nothing while checking', () => {
  api.fetchSession.mockReturnValue(new Promise(() => {}))
  const { container } = render(<AdminPage />)
  expect(container).toBeEmptyDOMElement()
  expect(notFound).not.toHaveBeenCalled()
})

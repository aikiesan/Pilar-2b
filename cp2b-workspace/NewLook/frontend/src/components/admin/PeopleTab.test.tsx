import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import PeopleTab from './PeopleTab'
import * as adminClient from '@/lib/api/adminClient'

jest.mock('@/lib/api/adminClient')
const api = adminClient as jest.Mocked<typeof adminClient>

const user = (over: Partial<adminClient.AdminUser>): adminClient.AdminUser => ({
  id: 'u1',
  email: 'ana@example.org',
  full_name: 'Ana Teste',
  role: 'autenticado',
  clearance: 1,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  last_login_at: null,
  ...over,
})

const people = [
  user({}),
  user({ id: 'admin1', email: 'adm@example.org', full_name: 'Adm Teste', role: 'admin', clearance: 3 }),
]

beforeEach(() => {
  jest.resetAllMocks()
  api.listUsers.mockResolvedValue(people)
  api.setClearance.mockResolvedValue(undefined as never)
})

it('changes a person level after confirming', async () => {
  render(<PeopleTab currentUserId="admin1" />)
  const select = await screen.findByLabelText('Nível de Ana Teste')
  fireEvent.change(select, { target: { value: '2' } })
  expect(api.setClearance).not.toHaveBeenCalled()
  expect(screen.getByText('Mudar para 2 Parceiro?')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
  await waitFor(() => expect(api.setClearance).toHaveBeenCalledWith('u1', 2))
  await waitFor(() => expect(api.listUsers).toHaveBeenCalledTimes(2))
})

it('cancelling leaves the level alone', async () => {
  render(<PeopleTab currentUserId="admin1" />)
  fireEvent.change(await screen.findByLabelText('Nível de Ana Teste'), { target: { value: '3' } })
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
  expect(api.setClearance).not.toHaveBeenCalled()
  expect(screen.queryByText(/Mudar para/)).not.toBeInTheDocument()
})

it('disables the selector on the admin own row', async () => {
  render(<PeopleTab currentUserId="admin1" />)
  expect(await screen.findByLabelText('Nível de Adm Teste')).toBeDisabled()
  expect(screen.getByLabelText('Nível de Ana Teste')).toBeEnabled()
})

it('shows an API error inline in the row', async () => {
  api.setClearance.mockRejectedValue(new Error('Não foi possível mudar o nível.'))
  render(<PeopleTab currentUserId="admin1" />)
  fireEvent.change(await screen.findByLabelText('Nível de Ana Teste'), { target: { value: '2' } })
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
  const row = screen.getByText('Ana Teste').closest('tr') as HTMLElement
  expect(await within(row).findByRole('alert')).toHaveTextContent('Não foi possível mudar o nível.')
})

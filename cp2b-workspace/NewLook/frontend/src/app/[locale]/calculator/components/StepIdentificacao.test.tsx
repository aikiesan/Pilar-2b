import React, { useState } from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import StepIdentificacao, { type IdentificacaoData } from './StepIdentificacao'
import { fetchSpMunicipalities } from '../calculatorApi'

jest.mock('next-intl', () => jest.requireActual('@/test/mocks/next-intl-real'))
jest.mock('../calculatorApi', () => ({ fetchSpMunicipalities: jest.fn() }))
const fetchMunicipalities = fetchSpMunicipalities as jest.MockedFunction<typeof fetchSpMunicipalities>

const EMPTY: IdentificacaoData = { nome: '', email: '', municipality_id: null, municipality_name: '', consent_lgpd: false }

function Harness({ onNext = jest.fn() }: { onNext?: () => void }) {
  const [data, setData] = useState(EMPTY)
  return <StepIdentificacao data={data} onChange={setData} onNext={onNext} />
}

const next = () => screen.getByRole('button', { name: /Próximo/ })

function fillPerson() {
  fireEvent.change(screen.getByLabelText(/Nome completo/), { target: { value: 'Ana Souza' } })
  fireEvent.change(screen.getByLabelText(/E-mail/), { target: { value: 'ana@unicamp.br' } })
  fireEvent.click(screen.getByRole('checkbox'))
}

describe('StepIdentificacao', () => {
  beforeEach(() => fetchMunicipalities.mockReset())

  it('advances once every required field is valid and a listed municipality is chosen', async () => {
    fetchMunicipalities.mockResolvedValue([{ id: 7, municipality_name: 'Ribeirão Preto', ibge_code: '3543402' }])
    render(<Harness />)
    const municipality = await screen.findByLabelText(/Município/)
    await waitFor(() => expect(municipality).toBeEnabled())

    fillPerson()
    expect(next()).toBeDisabled()

    // Not a listed municipality yet …
    fireEvent.change(municipality, { target: { value: 'Ribeirão' } })
    expect(next()).toBeDisabled()
    // … the exact name (any case) selects it.
    fireEvent.change(municipality, { target: { value: 'ribeirão preto' } })
    expect(next()).toBeEnabled()
    expect(screen.getByText('✓ Ribeirão Preto')).toBeInTheDocument()
  })

  it('offers the municipalities as native, keyboard-reachable suggestions', async () => {
    fetchMunicipalities.mockResolvedValue([
      { id: 1, municipality_name: 'Campinas', ibge_code: '3509502' },
      { id: 2, municipality_name: 'Santos', ibge_code: '3548500' },
    ])
    const { container } = render(<Harness />)
    await waitFor(() => expect(container.querySelectorAll('datalist option')).toHaveLength(2))
    expect(screen.getByLabelText(/Município/)).toHaveAttribute('list', 'calc-municipality-options')
  })

  it('accepts a typed name when the municipality list cannot be loaded', async () => {
    fetchMunicipalities.mockResolvedValue([])
    render(<Harness />)
    expect(await screen.findByText(/Não foi possível carregar a lista de municípios/)).toBeInTheDocument()
    fillPerson()
    fireEvent.change(screen.getByLabelText(/Município/), { target: { value: 'Campinas' } })
    expect(next()).toBeEnabled()
  })

  it('explains a malformed email as the user types', async () => {
    fetchMunicipalities.mockResolvedValue([])
    render(<Harness />)
    const email = screen.getByLabelText(/E-mail/)
    fireEvent.change(email, { target: { value: 'ana@' } })
    expect(email).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Informe um e-mail válido.')).toBeInTheDocument()
    fireEvent.change(email, { target: { value: 'ana@unicamp.br' } })
    expect(screen.queryByText('Informe um e-mail válido.')).not.toBeInTheDocument()
    await screen.findByText(/Não foi possível carregar/)
  })

  it('requires the LGPD consent', async () => {
    fetchMunicipalities.mockResolvedValue([])
    render(<Harness />)
    await screen.findByText(/Não foi possível carregar/)
    fireEvent.change(screen.getByLabelText(/Nome completo/), { target: { value: 'Ana' } })
    fireEvent.change(screen.getByLabelText(/E-mail/), { target: { value: 'ana@unicamp.br' } })
    fireEvent.change(screen.getByLabelText(/Município/), { target: { value: 'Campinas' } })
    expect(next()).toBeDisabled()
    fireEvent.click(screen.getByRole('checkbox'))
    expect(next()).toBeEnabled()
  })
})

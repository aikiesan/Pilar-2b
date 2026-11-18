import { getReferences, getResidues, toLiteratureReference } from './scientificApi'
import { authenticatedFetch } from '@/lib/apiClient'

jest.mock('@/lib/apiClient', () => ({ authenticatedFetch: jest.fn() }))
const fetchMock = authenticatedFetch as jest.MockedFunction<typeof authenticatedFetch>

const respond = (body: unknown, status = 200) =>
  fetchMock.mockResolvedValueOnce({ ok: status < 400, status, json: async () => body } as Response)

describe('scientificApi', () => {
  beforeEach(() => fetchMock.mockReset())

  it('reads every residue once, even when the table holds duplicate rows', async () => {
    respond({ residuos: [{ id: 1, nome: 'Vinhaça' }, { id: 1, nome: 'Vinhaça' }, { id: 2, nome: 'Palha de cana' }] })
    const residues = await getResidues()
    expect(residues.map((r) => r.id)).toEqual([1, 2])
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/v1\/residuos\/\?limit=500$/)
  })

  it('rejects on an HTTP error instead of inventing data', async () => {
    respond({ detail: 'down' }, 503)
    await expect(getResidues()).rejects.toThrow('HTTP 503')
  })

  it('maps the references endpoint onto the page model', async () => {
    respond({
      references: [
        {
          id: 7,
          authors: 'Silva, J.',
          title: 'Biogas from vinasse',
          year: 2021,
          doi: '10.1/x',
          is_primary: true,
          sector_codigo: 'AG_AGRICULTURA',
          residuo_nome: 'Vinhaça',
          residuo_nome_en: 'Vinasse',
        },
      ],
    })
    const [ref] = await getReferences()
    expect(ref).toEqual({
      id: 7,
      authors: 'Silva, J.',
      title: 'Biogas from vinasse',
      journal: null,
      year: 2021,
      doi: '10.1/x',
      url: null,
      validated: true,
      sector: 'AG_AGRICULTURA',
      residue: { nome: 'Vinhaça', nome_en: 'Vinasse' },
    })
  })

  it('keeps unknown sectors and missing fields explicit', () => {
    const ref = toLiteratureReference({ id: 1, citation: 'Anon. report', sector_codigo: 'XX' })
    expect(ref.title).toBe('Anon. report')
    expect(ref.sector).toBeNull()
    expect(ref.year).toBeNull()
    expect(ref.residue).toBeNull()
    expect(ref.validated).toBe(false)
  })
})

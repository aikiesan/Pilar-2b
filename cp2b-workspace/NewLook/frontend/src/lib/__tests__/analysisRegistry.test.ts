import {
  builtInView,
  isRegistryRef,
  readAnalysisRef,
  registryId,
  registryView,
  registryResult,
  type RegistryAnalysisDetail,
  type RegistryAnalysisMeta,
} from '../analysisRegistry'
import GeospatialClient from '../api/geospatialClient'

const META: RegistryAnalysisMeta = {
  id: 'demo_xy',
  title: { pt: 'Demonstração', en: 'Demo' },
  question: { pt: 'Onde há X e Y?', en: 'Where are X and Y?' },
  source: { pt: 'Fonte inventada', en: 'Made-up source' },
  x_label: { pt: 'X', en: 'X axis' },
  y_label: { pt: 'Y', en: 'Y axis' },
  answer_cell: 8,
  layers: ['biogas_plant'],
  uf_prefixes: ['35', '31'],
}

const DETAIL: RegistryAnalysisDetail = {
  id: 'demo_xy',
  cells: { '3500001': 0, '3500002': 8, '3500003': null, '3100001': 4 },
  breaks: { '35': { x: [1, 2], y: [3, 4] }, '31': { x: null, y: null } },
  counts: { '35': [1, 0, 0, 0, 0, 0, 0, 0, 1], '31': [0, 0, 0, 0, 1, 0, 0, 0, 0] },
  no_data: { '35': 1, '31': 0 },
}

describe('analysis refs', () => {
  it('reads built-in ids and r: ids, and nothing else', () => {
    expect(readAnalysisRef('lacuna')).toBe('lacuna')
    expect(readAnalysisRef('r:demo_xy')).toBe('r:demo_xy')
    expect(readAnalysisRef('r:Demo-XY')).toBeNull()
    expect(readAnalysisRef('r:')).toBeNull()
    expect(readAnalysisRef('r:' + 'a'.repeat(41))).toBeNull()
    expect(readAnalysisRef('outra')).toBeNull()
    expect(readAnalysisRef(null)).toBeNull()
  })
  it('tells registry refs apart and extracts the id', () => {
    expect(isRegistryRef('r:demo_xy')).toBe(true)
    expect(isRegistryRef('lacuna')).toBe(false)
    expect(registryId('r:demo_xy')).toBe('demo_xy')
  })
})

describe('registryResult', () => {
  it('builds a result for one state from the served cells', () => {
    const r = registryResult(DETAIL, '35')
    expect(r.id).toBe('r:demo_xy')
    expect([...r.byCode.keys()].every((c) => c.startsWith('35'))).toBe(true)
    expect(r.byCode.get('3500002')).toEqual({ x: null, y: null, cell: 8 })
    expect(r.byCode.get('3500003')?.cell).toBeNull()
    expect(r.counts).toEqual(DETAIL.counts['35'])
    expect(r.noData).toBe(1)
    expect(r.xBreaks).toEqual(DETAIL.breaks['35'].x)
    expect(r.yBreaks).toEqual(DETAIL.breaks['35'].y)
  })
  it('copes with a state the server did not send', () => {
    const r = registryResult({ ...DETAIL, breaks: {}, counts: {}, no_data: {} }, '31')
    expect(r.counts).toEqual(new Array(9).fill(0))
    expect(r.xBreaks).toBeNull()
    expect(r.noData).toBe(0)
  })
})

describe('views', () => {
  it('picks the copy in the map locale', () => {
    expect(registryView(META, 'en', 'municipalities in the highlighted cell').title).toBe(META.title.en)
    const pt = registryView(META, 'pt-BR', 'x')
    expect(pt).toMatchObject({ ref: 'r:demo_xy', title: 'Demonstração', xLabel: 'X', answerCell: 8, source: 'Fonte inventada' })
  })
  it('reads built-in copy through the translator', () => {
    const v = builtInView('lacuna', (k) => `t:${k}`)
    expect(v.ref).toBe('lacuna')
    expect(v.title).toBe('t:lacuna.title')
    expect(v.answerCell).toBe(2)
    expect(v.layers).toEqual(['biogas_plant'])
  })
})

describe('registry client', () => {
  const client = new GeospatialClient('')
  const realFetch = global.fetch
  afterEach(() => {
    global.fetch = realFetch
    window.localStorage.clear()
  })
  const reply = (status: number, body: unknown = {}) =>
    jest.fn().mockResolvedValue({ ok: status >= 200 && status < 300, status, json: async () => body })

  it('returns null on 404 and never fetches a malformed id', async () => {
    global.fetch = reply(404)
    expect(await client.getRegistryAnalysis('demo_xy')).toBeNull()
    const spy = reply(200)
    global.fetch = spy
    expect(await client.getRegistryAnalysis('../x')).toBeNull()
    expect(spy).not.toHaveBeenCalled()
  })
  it('throws on other failures and asks for no-store', async () => {
    const spy = reply(500)
    global.fetch = spy
    await expect(client.getRegistryAnalyses()).rejects.toThrow()
    expect(spy.mock.calls[0][1]).toMatchObject({ cache: 'no-store' })
  })
  it('sends the token only when there is one', async () => {
    const spy = reply(200, { analyses: [] })
    global.fetch = spy
    expect(await client.getRegistryAnalyses()).toEqual([])
    expect(JSON.stringify(spy.mock.calls[0][1])).not.toContain('Authorization')
    window.localStorage.setItem('pilar2b-auth-token', 'tok')
    await client.getRegistryAnalyses()
    expect(spy.mock.calls[1][1].headers.Authorization).toBe('Bearer tok')
  })
})

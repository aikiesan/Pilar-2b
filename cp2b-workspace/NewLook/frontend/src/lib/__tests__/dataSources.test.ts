import { describeSource, layerSources, pageSources, sourceDateLabel, type SourceTranslator } from '../dataSources'
import { sourceCatalog } from '@/test/fixtures/sourceCatalog'

const format = {
  dateTime: (d: Date, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('pt-BR', o).format(d),
} as Parameters<typeof sourceDateLabel>[1]

const MESSAGES = {
  describe: 'Fonte ({kind}): {title}{by}.',
  to_check: 'A conferir: {what}',
  new_tab: 'Abre em nova aba.',
}
const t: SourceTranslator = (key, values = {}) =>
  MESSAGES[key].replace(/\{(\w+)\}/g, (_, name: string) => values[name] ?? '')
const kind = (k: string) => k.toUpperCase()

describe('dataSources', () => {
  it('gives each layer and page block its sources, in the order cited', () => {
    expect(layerSources(sourceCatalog, 'municipalities').map((s) => s.key)).toEqual([
      'cp2b_v51',
      'ibge_malha_municipal',
    ])
    expect(pageSources(sourceCatalog, 'municipio_potencial').map((s) => s.key)).toEqual(['cp2b_v51'])
  })

  it('cites nothing when the catalog, the layer or the source is missing', () => {
    expect(layerSources(null, 'municipalities')).toEqual([])
    expect(layerSources(sourceCatalog, 'etes')).toEqual([])
    expect(pageSources(sourceCatalog, 'orfao')).toEqual([])
  })

  it('dates a source at the precision given', () => {
    expect(sourceDateLabel('2025', format)).toBe('2025')
    expect(sourceDateLabel('2025-08', format)).toMatch(/ago.*2025/)
  })

  it('describes a linked source with publisher, date and the new tab', () => {
    expect(describeSource(sourceCatalog.sources.ibge_malha_municipal, t, kind, format)).toBe(
      'Fonte (OFICIAL): IBGE, Malha Municipal 2025 — IBGE, 2025. Abre em nova aba.',
    )
  })

  it('leaves out what the registry does not know and says what is missing', () => {
    expect(describeSource(sourceCatalog.sources.mapbiomas_infraestrutura, t, kind, format)).toBe(
      'Fonte (DADOS): MapBiomas 10.1, camadas de infraestrutura — Projeto MapBiomas. ' +
        'A conferir: Página de download, data e licença.',
    )
  })
})

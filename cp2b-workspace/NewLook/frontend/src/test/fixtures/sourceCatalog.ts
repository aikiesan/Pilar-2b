import type { SourceCatalog } from '@/lib/dataSources'

/** A slice of GET /api/v1/sources: one estimate, one linked source, one still to check. */
export const sourceCatalog: SourceCatalog = {
  version: '2026-10-21',
  sources: {
    cp2b_v51: {
      key: 'cp2b_v51',
      title: 'Método CP2b v5.1',
      short: 'CP2b v5.1',
      publisher: 'CP2B / NIPE-UNICAMP',
      date: '2026-09',
      url: null,
      kind: 'estimativa',
      note: null,
      license: null,
      to_check: null,
    },
    ibge_malha_municipal: {
      key: 'ibge_malha_municipal',
      title: 'IBGE, Malha Municipal 2025',
      short: 'IBGE, malha 2025',
      publisher: 'IBGE',
      date: '2025',
      url: 'https://www.ibge.gov.br/geociencias/organizacao-do-territorio/malhas-territoriais/15774-malhas.html',
      kind: 'oficial',
      note: null,
      license: null,
      to_check: null,
    },
    mapbiomas_infraestrutura: {
      key: 'mapbiomas_infraestrutura',
      title: 'MapBiomas 10.1, camadas de infraestrutura',
      short: 'MapBiomas 10.1',
      publisher: 'Projeto MapBiomas',
      date: null,
      url: null,
      kind: 'dados',
      note: null,
      license: null,
      to_check: 'Página de download, data e licença.',
    },
  },
  layers: {
    municipalities: ['cp2b_v51', 'ibge_malha_municipal'],
    biogas_plant: ['mapbiomas_infraestrutura'],
  },
  pages: { municipio_potencial: ['cp2b_v51'], orfao: ['nao_existe'] },
  to_check: ['mapbiomas_infraestrutura'],
  without_license: ['ibge_malha_municipal', 'mapbiomas_infraestrutura'],
}

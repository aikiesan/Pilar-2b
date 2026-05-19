/**
 * PILAR-2b V3 - Comprehensive Data Sources References Panel
 * Floating panel with all data sources organized by category
 */

'use client';

import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, X, ExternalLink, Search } from 'lucide-react';

interface ReferenceSource {
  name: string;
  organization: string;
  url?: string;
  type?: string;
  year?: string;
  description?: string;
  details?: string[];
  notes?: string;
}

interface ReferenceCategory {
  id: string;
  title: string;
  icon: string;
  sources: ReferenceSource[];
  subcategories?: {
    title: string;
    sources: ReferenceSource[];
  }[];
}

const REFERENCES_DATA: ReferenceCategory[] = [
  {
    id: 'agricultural',
    title: 'Setor Agrícola',
    icon: '🌾',
    sources: [
      {
        name: 'IBGE - Produção Agrícola Municipal (PAM)',
        organization: 'SIDRA/IBGE',
        url: 'https://sidra.ibge.gov.br/pesquisa/pam/tabelas',
        type: 'Dados oficiais municipais',
        year: '2024',
        description: 'Área plantada, área colhida, quantidade produzida, rendimento médio, valor da produção',
        details: [
          'Tabela SIDRA 1612: Lavouras temporárias e permanentes',
          'Atualização: Anual (última divulgação: setembro 2024)',
          'Cobertura: 645 municípios de São Paulo'
        ]
      },
      {
        name: 'MapBiomas - Coleção 10.0',
        organization: 'Projeto MapBiomas Brasil',
        url: 'https://brasil.mapbiomas.org/colecoes-mapbiomas/',
        type: 'Cobertura e Uso do Solo',
        year: '2024',
        description: 'Mapeamento anual de cobertura e uso do solo do Brasil',
        details: [
          'Módulo de Agricultura (Coleção 10)',
          'Módulo de Pastagem (Coleção 10)',
          'Módulo de Desmatamento e Vegetação Secundária',
          'Resolução espacial: 30m × 30m (Landsat)',
          'Período temporal: 2000-2024',
          'Plataforma: Google Earth Engine (GEE)'
        ]
      }
    ],
    subcategories: [
      {
        title: 'Cana-de-Açúcar',
        sources: [
          {
            name: 'UNICADATA - UNICA',
            organization: 'União da Indústria de Cana-de-Açúcar',
            url: 'https://unicadata.com.br/',
            type: 'Acompanhamento da Safra',
            year: '2024/2025',
            description: 'Balanço da Safra 2024/2025 - Produção, moagem, etanol, açúcar por região/usina'
          },
          {
            name: 'CONAB - Acompanhamento da Safra Brasileira',
            organization: 'Companhia Nacional de Abastecimento',
            url: 'https://www.gov.br/conab/pt-br/assuntos/noticias',
            type: 'Safra 2024/25',
            year: '2024/2025',
            details: [
              'Safra 2024/25: 676,96 milhões de toneladas (Brasil)',
              'Sudeste: 439,6 milhões de toneladas (queda 6,3%)',
              'Área colhida SP: 5,48 milhões de hectares'
            ]
          },
          {
            name: 'EMBRAPA - Cenário Agroenergético da Cana-de-Açúcar em São Paulo',
            organization: 'EMBRAPA Meio Ambiente',
            url: 'https://www.embrapa.br/busca-de-publicacoes/-/publicacao/1035982/cenario-agroenergetico-da-cana-de-acucar-em-sao-paulo',
            type: 'Avaliação socioeconômica e ambiental',
            description: 'Avaliação de sensibilidade socioeconômica e ambiental usando SIG. Fatores de correção para disponibilidade de resíduos.'
          },
          {
            name: 'Novacana - Mapeamento de Usinas',
            organization: 'Portal Novacana',
            url: 'https://www.novacana.com/usinas_brasil/estados/sao-paulo',
            type: 'Localização de usinas',
            description: 'Lista de unidades sucroenergéticas em operação em São Paulo - Localização, capacidade, processamento'
          },
          {
            name: 'UDOPmaps - Bioenergia em Números',
            organization: 'União dos Produtores de Bioenergia (UDOP)',
            url: 'http://udopmaps.com.br/mapa/bioenergia-em-numeros',
            type: 'Plataforma GIS',
            description: 'Plataforma de inteligência de dados e mapas do setor bioenergético. Usinas de biomassa georreferenciadas.'
          },
          {
            name: 'IBGE Explica - Produção de Cana-de-Açúcar SP',
            organization: 'IBGE',
            url: 'https://www.ibge.gov.br/explica/producao-agropecuaria/cana-de-acucar/sp',
            type: 'Dados estaduais',
            description: 'Valor da produção, quantidade, área colhida, rendimento médio. Fontes: PAM, Censo Agropecuário 2017.'
          }
        ]
      },
      {
        title: 'Citros, Soja, Milho e Café',
        sources: [
          {
            name: 'IBGE - Culturas Específicas (PAM)',
            organization: 'SIDRA/IBGE',
            url: 'https://sidra.ibge.gov.br/pesquisa/pam/tabelas',
            type: 'Tabela 1612',
            description: 'Dados municipais por cultura: área, produção, valor. Aplicação: Cálculo de RPR (Residue-to-Product Ratio) por cultura.'
          }
        ]
      }
    ]
  },
  {
    id: 'livestock',
    title: 'Setor Pecuário',
    icon: '🐄',
    sources: [
      {
        name: 'GEDAVE - Defesa Agropecuária do Estado de São Paulo',
        organization: 'Coordenadoria de Defesa Agropecuária (CDA-SP)',
        url: 'https://www.defesa.agricultura.sp.gov.br/',
        type: 'Sistema de gestão de defesa agropecuária',
        year: '2024',
        description: 'Registros de rebanhos e Guias de Trânsito Animal (GTA) georreferenciados por propriedade',
        details: [
          'Sistema: https://gedave.defesaagropecuaria.sp.gov.br/',
          'Bovinocultura (corte e leite)',
          'Suinocultura intensiva',
          'Avicultura (galináceos e codornas)',
          'Atualização: Sistema informatizado versão 2.0 (2024)'
        ]
      },
      {
        name: 'IBGE - Pesquisa Pecuária Municipal (PPM)',
        organization: 'SIDRA/IBGE',
        type: 'Inventários de rebanhos',
        description: 'Inventários de rebanhos bovinos, suínos, aves por município. Aplicação: Estimativa de geração de dejetos (kg/cabeça/dia).'
      }
    ]
  },
  {
    id: 'urban',
    title: 'Setor Urbano',
    icon: '🏙️',
    sources: [],
    subcategories: [
      {
        title: 'Resíduos Sólidos Urbanos (RSU)',
        sources: [
          {
            name: 'SNIS - Sistema Nacional de Informações sobre Saneamento',
            organization: 'Ministério das Cidades/SNISA',
            url: 'https://app-hmg.cidades.gov.br/indicadores-sinisa/web/',
            type: 'Dados municipais de saneamento',
            year: '2022-2023',
            description: 'Resíduos Sólidos Urbanos, Águas Pluviais, Indicadores municipais de coleta, destinação, reciclagem',
            details: [
              'URL Série Histórica: https://app4.cidades.gov.br/serieHistorica/',
              'Cobertura: Municípios de São Paulo com dados declarados'
            ]
          },
          {
            name: 'IBGE - Estimativa Populacional',
            organization: 'IBGE',
            url: 'https://censo2022.ibge.gov.br/panorama/',
            type: 'Censo Demográfico 2022',
            description: 'População por domicílio e município. Aplicação: Cálculo de geração per capita de RSU (kg/habitante/dia).'
          }
        ]
      },
      {
        title: 'Esgotamento Sanitário',
        sources: [
          {
            name: 'SNIS - Esgoto',
            organization: 'Ministério das Cidades/SNISA',
            url: 'https://app-hmg.cidades.gov.br/indicadores-sinisa/web/site/index',
            type: 'Indicadores 2023',
            year: '2023',
            description: 'Volume coletado, tratado, ETEs operacionais. Indicadores: Cobertura, eficiência de tratamento',
            details: [
              'Componentes: Água, Esgoto, Resíduos Sólidos, Águas Pluviais',
              'Nível: Brasil, macrorregiões, estados, municípios'
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'infrastructure',
    title: 'Camadas de Infraestrutura',
    icon: '📍',
    sources: [],
    subcategories: [
      {
        title: 'Malhas Territoriais',
        sources: [
          {
            name: 'IBGE - Malha Municipal 2024',
            organization: 'IBGE - Organização do Território',
            url: 'https://www.ibge.gov.br/geociencias/organizacao-do-territorio/malhas-territoriais/15774-malhas.html',
            type: 'Shapefiles oficiais',
            year: '2024',
            description: 'Shapefiles de municípios de São Paulo, regiões geográficas imediatas/intermediárias',
            details: [
              'Formato: SHP, GeoJSON',
              'Sistema de referência: SIRGAS 2000'
            ]
          }
        ]
      },
      {
        title: 'Plantas de Biogás',
        sources: [
          {
            name: 'MapBiomas + ANP',
            organization: 'MapBiomas Brasil + Agência Nacional do Petróleo',
            type: 'Plantas georreferenciadas',
            year: '2024',
            description: 'Plantas de biogás operacionais georreferenciadas. Dados: Localização, capacidade, tipo de resíduo'
          },
          {
            name: 'CIBiogás - Atlas do Biogás Brasil',
            organization: 'Centro Internacional de Energias Renováveis - Biogás',
            url: 'https://cibiogas.org',
            type: 'Base de dados nacional',
            year: '2019',
            description: '521 plantas operacionais - Capacidade, feedstock, tecnologia'
          },
          {
            name: 'ANP - Painel Dinâmico de Produtores de Etanol',
            organization: 'Agência Nacional do Petróleo, Gás Natural e Biocombustíveis',
            url: 'https://app.powerbi.com/view?r=eyJrIjoiMmRhZWU2NDUtZWE2Yi00NzI5LWJjMGQtNjIwNjE0MjM0MjEzIiwidCI6IjQ0OTlmNGZmLTI0YTYtNGI0Mi1iN2VmLTEyNGFmY2FkYzkxMyJ9',
            type: 'Painel Interativo',
            year: '2025',
            description: 'Mapa dinâmico de produtores, capacidades autorizadas, produção temporal, matéria-prima utilizada',
            details: [
              'Documentação: https://www.gov.br/anp/pt-br/centrais-de-conteudo/paineis-dinamicos-da-anp/',
              'Base de Dados: https://www.gov.br/anp/pt-br/assuntos/producao-e-fornecimento-de-biocombustiveis/etanol/arquivos-etanol/pb-da-etanol.zip',
              'Última Atualização: 25/11/2025 09:26:22',
              'Fonte: Sistema de Movimentação de Produtos (SIMP) - Resoluções ANP 729/2018 e 734/2018',
              'Sistema de Referência: SIRGAS 2000 (código 4674)',
              'Frequência: Dados mensais'
            ]
          }
        ]
      },
      {
        title: 'Infraestrutura Energética',
        sources: [
          {
            name: 'EPE - WebMap EPE (Versão Atualizada 2025)',
            organization: 'Empresa de Pesquisa Energética',
            url: 'https://gisepeprd2.epe.gov.br/WebMapEPE/',
            type: 'Sistema WebGIS Integrado',
            year: '2025',
            description: 'Aplicação WebGIS interativa com 8 grupos de camadas geográficas',
            details: [
              'Documentação: https://www.epe.gov.br/pt/publicacoes-dados-abertos/publicacoes/webmap-epe',
              'Funcionalidades: Consultas espaciais e alfanuméricas, Download vetorial/raster, Medições, Impressão, Upload de dados',
              'Serviço WMS: Compartilhamento como Web Map Service',
              'Metadados: Consulta de confiabilidade geoespacial por camada',
              'Grupos: Sistema Elétrico, Biocombustíveis, Gás Natural, Combustíveis Líquidos, Meio Ambiente'
            ]
          },
          {
            name: 'EPE - Gasodutos',
            organization: 'Empresa de Pesquisa Energética',
            url: 'http://www.epe.gov.br/pt/imprensa/noticias',
            type: 'Plano Indicativo de Gasodutos de Transporte (PIG)',
            year: '2024',
            description: '8 projetos indicativos (~2.300 km), incluindo 2 para biometano',
            details: [
              'Destaque: Gasoduto Sertãozinho-São Carlos (99,5 km) - setor sucroenergético'
            ]
          },
          {
            name: 'EPE - Subestações',
            organization: 'Empresa de Pesquisa Energética',
            type: 'Infraestrutura elétrica',
            year: '2024',
            description: 'Subestações de transmissão e distribuição georreferenciadas'
          },
          {
            name: 'EPE - Linhas de Transmissão',
            organization: 'Empresa de Pesquisa Energética',
            type: 'Malha de transmissão',
            year: '2023',
            description: 'Malha de transmissão de energia elétrica em São Paulo. Dados: Tensão, operadoras, extensão'
          }
        ]
      },
      {
        title: 'Rodovias',
        sources: [
          {
            name: 'EPE - Malha Rodoviária',
            organization: 'Empresa de Pesquisa Energética',
            type: 'Infraestrutura de transporte',
            year: '2023',
            description: 'Rodovias federais e estaduais. Aplicação: Cálculo do Fator Logístico (FL) - custos de transporte'
          },
          {
            name: 'DNIT/DER-SP - Dados Complementares',
            organization: 'DNIT / Departamento de Estradas de Rodagem de São Paulo',
            type: 'Infraestrutura rodoviária',
            description: 'Densidade viária, condições de acesso (pavimentado/não pavimentado)'
          }
        ]
      }
    ]
  },
  {
    id: 'methodologies',
    title: 'Metodologias e Estudos',
    icon: '📊',
    sources: [
      {
        name: 'EMBRAPA - Metodologia para Dejetos Animais',
        organization: 'EMBRAPA Documentos 196 (Mito et al., 2018)',
        type: 'Metodologia técnica',
        description: 'Metodologia definitiva para suínos e bovinos. Parâmetros: Sólidos Voláteis (SV), Bo (potencial metanogênico), efluentes por categoria animal'
      },
      {
        name: 'ABiogás - Potencial Brasileiro de Biogás',
        organization: 'Associação Brasileira de Biogás',
        type: 'Estudo de potencial',
        year: '2020',
        description: 'Estimativa nacional e setorial de potencial de biogás e biometano',
        details: [
          'Potencial total: 84,99 bilhões Nm³/ano (Brasil)',
          'Biometano: 43,23 bilhões Nm³/ano',
          'Setor sucroenergético: 39,76 bilhões Nm³/ano (47% do total)'
        ]
      }
    ]
  }
];

export default function ReferencesPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [expandedSources, setExpandedSources] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const toggleSource = (sourceId: string) => {
    setExpandedSources(prev =>
      prev.includes(sourceId)
        ? prev.filter(id => id !== sourceId)
        : [...prev, sourceId]
    );
  };

  // Filter sources based on search query
  const filteredData = React.useMemo(() => {
    if (!searchQuery.trim()) return REFERENCES_DATA;

    const query = searchQuery.toLowerCase();
    return REFERENCES_DATA.map(category => {
      const filteredSources = (category.sources || []).filter(source =>
        source.name.toLowerCase().includes(query) ||
        source.organization.toLowerCase().includes(query) ||
        source.description?.toLowerCase().includes(query)
      );

      const filteredSubcategories = category.subcategories?.map(subcat => ({
        ...subcat,
        sources: (subcat.sources || []).filter(source =>
          source.name.toLowerCase().includes(query) ||
          source.organization.toLowerCase().includes(query) ||
          source.description?.toLowerCase().includes(query)
        )
      })).filter(subcat => subcat.sources && subcat.sources.length > 0);

      return {
        ...category,
        sources: filteredSources,
        subcategories: filteredSubcategories
      };
    }).filter(cat => (cat.sources && cat.sources.length > 0) || (cat.subcategories && cat.subcategories.length > 0));
  }, [searchQuery]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-16 right-[90px] md:top-20 md:right-[320px] z-[500] bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg rounded-lg px-3 py-2 md:px-4 md:py-2.5 hover:from-blue-700 hover:to-blue-800 transition-all flex items-center gap-2 text-sm font-medium"
      >
        <BookOpen className="w-4 h-4" />
        <span className="hidden md:inline">Fontes de Dados</span>
        <span className="md:hidden">📚</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 md:p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 md:px-6 py-4 rounded-t-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 md:w-6 md:h-6 text-white" />
            <h2 className="text-lg md:text-xl font-bold text-white">Fontes de Dados - PILAR-2b BiogasAtlas</h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-white/80 hover:text-white transition-colors p-1"
          >
            <X className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-4 md:px-6 py-3 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar fontes de dados..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4">
          <div className="space-y-3">
            {filteredData.map((category) => (
              <div key={category.id} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{category.icon}</span>
                    <h3 className="text-base md:text-lg font-semibold text-gray-900">{category.title}</h3>
                  </div>
                  {expandedCategories.includes(category.id) ? (
                    <ChevronUp className="w-5 h-5 text-gray-600" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                  )}
                </button>

                {/* Category Content */}
                {expandedCategories.includes(category.id) && (
                  <div className="p-4 space-y-3 bg-white">
                    {/* Direct sources */}
                    {category.sources && category.sources.length > 0 && category.sources.map((source, idx) => {
                      const sourceId = `${category.id}-${idx}`;
                      return (
                        <div key={sourceId} className="border-l-4 border-blue-500 pl-4">
                          <button
                            onClick={() => toggleSource(sourceId)}
                            className="w-full text-left flex items-start justify-between gap-2 group"
                          >
                            <div className="flex-1">
                              <h4 className="text-sm md:text-base font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                                {source.name}
                              </h4>
                              <p className="text-xs md:text-sm text-gray-600 mt-0.5">{source.organization}</p>
                            </div>
                            {expandedSources.includes(sourceId) ? (
                              <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                            )}
                          </button>

                          {expandedSources.includes(sourceId) && (
                            <div className="mt-3 space-y-2 text-xs md:text-sm">
                              {source.url && (
                                <div>
                                  <a
                                    href={source.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    {source.url}
                                  </a>
                                </div>
                              )}
                              {source.type && (
                                <p><strong>Tipo:</strong> {source.type}</p>
                              )}
                              {source.year && (
                                <p><strong>Ano:</strong> {source.year}</p>
                              )}
                              {source.description && (
                                <p><strong>Descrição:</strong> {source.description}</p>
                              )}
                              {source.details && source.details.length > 0 && (
                                <div>
                                  <strong>Detalhes:</strong>
                                  <ul className="list-disc list-inside ml-2 mt-1 space-y-1">
                                    {source.details.map((detail, i) => (
                                      <li key={i} className="text-gray-700">{detail}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {source.notes && (
                                <p className="italic text-gray-600"><strong>Observações:</strong> {source.notes}</p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Subcategories */}
                    {category.subcategories?.map((subcat, subcatIdx) => (
                      <div key={subcatIdx} className="mt-4">
                        <h4 className="text-sm md:text-base font-semibold text-gray-800 mb-2 flex items-center gap-2">
                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          {subcat.title}
                        </h4>
                        <div className="space-y-3 ml-4">
                          {subcat.sources && subcat.sources.length > 0 && subcat.sources.map((source, idx) => {
                            const sourceId = `${category.id}-${subcatIdx}-${idx}`;
                            return (
                              <div key={sourceId} className="border-l-4 border-blue-300 pl-4">
                                <button
                                  onClick={() => toggleSource(sourceId)}
                                  className="w-full text-left flex items-start justify-between gap-2 group"
                                >
                                  <div className="flex-1">
                                    <h5 className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                                      {source.name}
                                    </h5>
                                    <p className="text-xs text-gray-600 mt-0.5">{source.organization}</p>
                                  </div>
                                  {expandedSources.includes(sourceId) ? (
                                    <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                                  )}
                                </button>

                                {expandedSources.includes(sourceId) && (
                                  <div className="mt-3 space-y-2 text-xs">
                                    {source.url && (
                                      <div>
                                        <a
                                          href={source.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
                                        >
                                          <ExternalLink className="w-3 h-3" />
                                          {source.url}
                                        </a>
                                      </div>
                                    )}
                                    {source.type && (
                                      <p><strong>Tipo:</strong> {source.type}</p>
                                    )}
                                    {source.year && (
                                      <p><strong>Ano:</strong> {source.year}</p>
                                    )}
                                    {source.description && (
                                      <p><strong>Descrição:</strong> {source.description}</p>
                                    )}
                                    {source.details && source.details.length > 0 && (
                                      <div>
                                        <strong>Detalhes:</strong>
                                        <ul className="list-disc list-inside ml-2 mt-1 space-y-1">
                                          {source.details.map((detail, i) => (
                                            <li key={i} className="text-gray-700">{detail}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                    {source.notes && (
                                      <p className="italic text-gray-600"><strong>Observações:</strong> {source.notes}</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Footer Notes */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">Observações Importantes:</h4>
            <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
              <li><strong>Prioridade de Atualização:</strong> MapBiomas Coleção 10.0 e PAM 2024 são as fontes mais recentes para dados agrícolas</li>
              <li><strong>Dados Georreferenciados:</strong> GEDAVE e MapBiomas fornecem precisão espacial essencial para raio de coleta</li>
              <li><strong>Validação Cruzada:</strong> Sempre validar SIDRA vs MapBiomas vs dados operacionais reais</li>
              <li><strong>Fatores de Correção:</strong> Baseados em literatura (EMBRAPA, CETESB, IEA Bioenergy, FAO) com calibração para São Paulo</li>
              <li><strong>Sistema de Referência:</strong> SIRGAS 2000 (código EPSG 4674) para todos os dados EPE e ANP</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

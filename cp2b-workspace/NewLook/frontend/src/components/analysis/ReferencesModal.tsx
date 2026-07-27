/**
 * PILAR-2b V3 - Scientific References Modal
 * Displays all scientific references and data sources used in analysis
 */

'use client';

import React, { useState } from 'react';
import { X, ExternalLink, BookOpen, Beaker, FileText, CheckCircle2, Database } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface ReferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Reference {
  residue: string;
  authors: string;
  year: number;
  doi?: string;
  url?: string;
  description?: string;
  journal?: string;
}

interface ReferenceCategory {
  category: string;
  emoji: string;
  color: string;
  bgColor: string;
  references: Reference[];
}

const REFERENCES: ReferenceCategory[] = [
  {
    category: 'Cana-de-Açúcar',
    emoji: '🌱',
    color: 'border-green-500',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    references: [
      {
        residue: 'Bagaço',
        authors: 'Ver base de dados científica',
        year: 2024,
        url: '/pt-BR/dashboard/scientific-database',
        description: '39 referências científicas validadas para bagaço de cana'
      },
      {
        residue: 'Vinhaça',
        authors: 'Ver base de dados científica',
        year: 2024,
        url: '/pt-BR/dashboard/scientific-database',
        description: '27 referências científicas validadas para vinhaça de cana'
      },
      {
        residue: 'Torta de Filtro',
        authors: 'Ver base de dados científica',
        year: 2024,
        url: '/pt-BR/dashboard/scientific-database',
        description: '20 referências científicas validadas para torta de filtro'
      },
      {
        residue: 'Palha',
        authors: 'Ver base de dados científica',
        year: 2024,
        url: '/pt-BR/dashboard/scientific-database',
        description: '31 referências científicas validadas para palha de cana'
      }
    ]
  },
  {
    category: 'Pecuária',
    emoji: '🐄',
    color: 'border-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    references: [
      {
        residue: 'Dejeto Bovino',
        authors: 'Ver base de dados científica',
        year: 2024,
        url: '/pt-BR/dashboard/scientific-database',
        description: '4 referências científicas validadas para dejetos bovinos'
      },
      {
        residue: 'Dejeto Suíno',
        authors: 'Ver base de dados científica',
        year: 2024,
        url: '/pt-BR/dashboard/scientific-database',
        description: '22+ referências científicas validadas para dejetos suínos'
      },
      {
        residue: 'Cama de Frango',
        authors: 'Ver base de dados científica',
        year: 2024,
        url: '/pt-BR/dashboard/scientific-database',
        description: '3 referências científicas validadas para cama de aviário'
      }
    ]
  },
  {
    category: 'Citros',
    emoji: '🍊',
    color: 'border-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    references: [
      {
        residue: 'Bagaço de Laranja',
        authors: 'Ver base de dados científica',
        year: 2024,
        url: '/pt-BR/dashboard/scientific-database',
        description: '3-4 referências científicas validadas para cascas de citros'
      }
    ]
  },
  {
    category: 'Urbano',
    emoji: '🏙️',
    color: 'border-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    references: [
      {
        residue: 'RSU (Resíduos Sólidos Urbanos)',
        authors: 'IPEA',
        year: 2012,
        url: 'https://www.ipea.gov.br/portal/publicacao-item?id=34419',
        description: 'Diagnóstico dos Resíduos Sólidos Urbanos - Relatório de Pesquisa'
      }
    ]
  },
  {
    category: 'Metodologia',
    emoji: '📚',
    color: 'border-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    references: [
      {
        residue: 'Fatores de Correção SAF',
        authors: 'CETESB',
        year: 2018,
        url: 'https://cetesb.sp.gov.br/biogas/',
        description: 'Guia Técnico Ambiental de Inventário de Emissões de Gases de Efeito Estufa'
      },
      {
        residue: 'Metodologia DBFZ',
        authors: 'DBFZ - Deutsches Biomasseforschungszentrum',
        year: 2023,
        url: 'https://www.dbfz.de/',
        description: 'Modelo de três frações para cinética de degradação anaeróbica (k_slow, k_med, k_fast)'
      }
    ]
  }
];

// Data Sources for Agricultural, Livestock, Urban and Operational Plants
interface DataSource {
  name: string;
  organization: string;
  url?: string;
  type?: string;
  year?: string;
  description?: string;
  details?: string[];
}

interface DataSourceCategory {
  category: string;
  emoji: string;
  color: string;
  bgColor: string;
  sources: DataSource[];
  subcategories?: {
    title: string;
    sources: DataSource[];
  }[];
}

const DATA_SOURCES: DataSourceCategory[] = [
  {
    category: 'Setor Agrícola',
    emoji: '🌾',
    color: 'border-green-500',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
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
              'Sudeste: 439,6 milhões de toneladas',
              'Área colhida SP: 5,48 milhões de hectares'
            ]
          },
          {
            name: 'EMBRAPA - Cenário Agroenergético da Cana',
            organization: 'EMBRAPA Meio Ambiente',
            url: 'https://www.embrapa.br/busca-de-publicacoes/-/publicacao/1035982/cenario-agroenergetico-da-cana-de-acucar-em-sao-paulo',
            type: 'Avaliação socioeconômica e ambiental',
            description: 'Fatores de correção para disponibilidade de resíduos usando SIG'
          },
          {
            name: 'Novacana - Mapeamento de Usinas',
            organization: 'Portal Novacana',
            url: 'https://www.novacana.com/usinas_brasil/estados/sao-paulo',
            type: 'Localização de usinas',
            description: 'Lista de unidades sucroenergéticas em operação em São Paulo'
          },
          {
            name: 'UDOPmaps - Bioenergia em Números',
            organization: 'UDOP',
            url: 'http://udopmaps.com.br/mapa/bioenergia-em-numeros',
            type: 'Plataforma GIS',
            description: 'Usinas de biomassa georreferenciadas'
          }
        ]
      }
    ]
  },
  {
    category: 'Setor Pecuário',
    emoji: '🐄',
    color: 'border-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    sources: [
      {
        name: 'GEDAVE - Defesa Agropecuária do Estado de São Paulo',
        organization: 'CDA-SP',
        url: 'https://www.defesa.agricultura.sp.gov.br/',
        type: 'Sistema de gestão',
        year: '2024',
        description: 'Registros de rebanhos e GTAs georreferenciados por propriedade',
        details: [
          'Sistema: https://gedave.defesaagropecuaria.sp.gov.br/',
          'Bovinocultura, Suinocultura, Avicultura',
          'Versão 2.0 (2024)'
        ]
      },
      {
        name: 'IBGE - Pesquisa Pecuária Municipal (PPM)',
        organization: 'SIDRA/IBGE',
        type: 'Inventários de rebanhos',
        description: 'Inventários de rebanhos bovinos, suínos, aves por município. Estimativa de geração de dejetos (kg/cabeça/dia).'
      },
      {
        name: 'EMBRAPA - Metodologia para Dejetos Animais',
        organization: 'EMBRAPA Documentos 196',
        type: 'Metodologia técnica',
        year: '2018',
        description: 'Metodologia para suínos e bovinos. Parâmetros: Sólidos Voláteis (SV), Bo, efluentes por categoria animal'
      }
    ]
  },
  {
    category: 'Setor Urbano',
    emoji: '🏙️',
    color: 'border-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    sources: [
      {
        name: 'SNIS - Sistema Nacional de Informações sobre Saneamento',
        organization: 'Ministério das Cidades/SNISA',
        url: 'https://app-hmg.cidades.gov.br/indicadores-sinisa/web/',
        type: 'Dados municipais',
        year: '2022-2023',
        description: 'RSU, Águas Pluviais, Esgoto. Indicadores de coleta, destinação, reciclagem, ETEs',
        details: [
          'Série Histórica: https://app4.cidades.gov.br/serieHistorica/',
          'Cobertura: Municípios de São Paulo'
        ]
      },
      {
        name: 'IBGE - Estimativa Populacional',
        organization: 'IBGE',
        url: 'https://censo2022.ibge.gov.br/panorama/',
        type: 'Censo Demográfico 2022',
        description: 'População por domicílio e município. Cálculo de geração per capita de RSU (kg/habitante/dia).'
      }
    ]
  },
  {
    category: 'Plantas de Biogás Operacionais',
    emoji: '🏭',
    color: 'border-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    sources: [
      {
        name: 'MapBiomas + ANP',
        organization: 'MapBiomas Brasil + Agência Nacional do Petróleo',
        type: 'Plantas georreferenciadas',
        year: '2024',
        description: 'Plantas de biogás operacionais. Dados: Localização, capacidade, tipo de resíduo'
      },
      {
        name: 'CIBiogás - Atlas do Biogás Brasil',
        organization: 'Centro Internacional de Energias Renováveis',
        url: 'https://cibiogas.org',
        type: 'Base nacional',
        year: '2019',
        description: 'Plantas de biogás operacionais - Capacidade, feedstock, tecnologia'
      },
      {
        name: 'ANP - Painel Dinâmico de Produtores de Etanol',
        organization: 'ANP',
        url: 'https://app.powerbi.com/view?r=eyJrIjoiMmRhZWU2NDUtZWE2Yi00NzI5LWJjMGQtNjIwNjE0MjM0MjEzIiwidCI6IjQ0OTlmNGZmLTI0YTYtNGI0Mi1iN2VmLTEyNGFmY2FkYzkxMyJ9',
        type: 'Painel Interativo',
        year: '2025',
        description: 'Mapa dinâmico de produtores, capacidades, produção, matéria-prima',
        details: [
          'Fonte: Sistema SIMP (Resoluções 729/2018 e 734/2018)',
          'Sistema: SIRGAS 2000 (EPSG 4674)',
          'Atualização: 25/11/2025'
        ]
      },
      {
        name: 'ABiogás - Potencial Brasileiro de Biogás',
        organization: 'Associação Brasileira de Biogás',
        type: 'Estudo de potencial',
        year: '2020',
        description: 'Estimativa nacional de potencial',
        details: [
          'Total: 84,99 bilhões Nm³/ano',
          'Biometano: 43,23 bilhões Nm³/ano',
          'Setor sucroenergético: 39,76 bilhões Nm³/ano (47%)'
        ]
      }
    ]
  }
];

export default function ReferencesModal({ isOpen, onClose }: ReferencesModalProps) {
  const t = useTranslations('analysis')
  const [activeTab, setActiveTab] = useState<'scientific' | 'data-sources'>('scientific');
  if (!isOpen) return null;

  // Count totals
  const totalReferences = REFERENCES.reduce((acc, cat) => acc + cat.references.length, 0);
  const peerReviewedCount = REFERENCES.reduce((acc, cat) =>
    acc + cat.references.filter(r => r.doi).length, 0
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 dark:bg-black/80 z-50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden border border-gray-200 dark:border-slate-700"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {t('references_modal.title')}
                  </h2>
                  <p className="text-sm text-white/80 mt-0.5">
                    {t('references_modal.subtitle')}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                aria-label={t('references_modal.close_aria')}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
            <button
              onClick={() => setActiveTab('scientific')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'scientific'
                  ? 'text-green-700 dark:text-green-400 border-b-2 border-green-600 bg-white dark:bg-slate-800'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Beaker className="w-4 h-4" />
              {t('references_modal.tab_scientific')}
              <span className="ml-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 rounded-full text-xs font-semibold">
                {totalReferences}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('data-sources')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'data-sources'
                  ? 'text-blue-700 dark:text-blue-400 border-b-2 border-blue-600 bg-white dark:bg-slate-800'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Database className="w-4 h-4" />
              {t('references_modal.tab_data_sources')}
              <span className="ml-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 rounded-full text-xs font-semibold">
                {DATA_SOURCES.length}
              </span>
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(85vh-12rem)] p-6">
            {/* Scientific References Tab */}
            {activeTab === 'scientific' && (
              <div className="space-y-8">
                {REFERENCES.map((category, idx) => (
                <div key={idx}>
                  {/* Category Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl">{category.emoji}</span>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        {category.category}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {category.references.length} referência{category.references.length > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  {/* References Grid */}
                  <div className="grid gap-3">
                    {category.references.map((ref, refIdx) => (
                      <div
                        key={refIdx}
                        className={`border-l-4 ${category.color} ${category.bgColor} rounded-r-xl p-4 hover:shadow-md transition-all`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            {/* Title */}
                            <h4 className="font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                              <Beaker className="h-4 w-4 flex-shrink-0 text-gray-500 dark:text-gray-400" />
                              {ref.residue}
                            </h4>

                            {/* Authors and Year */}
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              {ref.authors}{' '}
                              <span className="font-semibold text-green-700 dark:text-green-400">
                                ({ref.year})
                              </span>
                            </p>

                            {/* Journal */}
                            {ref.journal && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-1">
                                {ref.journal}
                              </p>
                            )}

                            {/* Description */}
                            {ref.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                                {ref.description}
                              </p>
                            )}
                          </div>

                          {/* Peer-reviewed badge */}
                          {ref.doi && (
                            <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/40 rounded-lg">
                              <CheckCircle2 className="h-3 w-3" />
                              Peer-Reviewed
                            </span>
                          )}
                        </div>

                        {/* Links Section */}
                        <div className="mt-3 flex flex-wrap gap-2">
                          {ref.doi && (
                            <a
                              href={`https://doi.org/${ref.doi}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 rounded-lg transition-colors"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              DOI: {ref.doi}
                            </a>
                          )}
                          {ref.url && !ref.doi && (
                            <a
                              href={ref.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 rounded-lg transition-colors"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              {t('references_modal.source_access')}
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

                {/* Footer Note for Scientific Tab */}
                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-slate-700">
                  <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                    <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800 dark:text-blue-300">
                      <p className="font-semibold mb-1">{t('references_modal.scientific_footer_heading')}</p>
                      <p className="text-blue-700 dark:text-blue-400">
                        {t('references_modal.scientific_footer_text')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Data Sources Tab */}
            {activeTab === 'data-sources' && (
              <div className="space-y-6">
                {DATA_SOURCES.map((category, idx) => (
                  <div key={idx}>
                    {/* Category Header */}
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-3xl">{category.emoji}</span>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                          {category.category}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {category.sources.length} fonte{category.sources.length > 1 ? 's' : ''} principal{category.sources.length > 1 ? 'is' : ''}
                        </p>
                      </div>
                    </div>

                    {/* Main Sources */}
                    <div className="space-y-3 mb-4">
                      {category.sources.map((source, sourceIdx) => (
                        <div
                          key={sourceIdx}
                          className={`border-l-4 ${category.color} ${category.bgColor} rounded-r-xl p-4 hover:shadow-md transition-all`}
                        >
                          <h4 className="font-bold text-gray-900 dark:text-white mb-1">
                            {source.name}
                          </h4>
                          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                            {source.organization}
                            {source.year && <span className="font-semibold text-blue-700 dark:text-blue-400"> ({source.year})</span>}
                          </p>
                          {source.type && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 italic mb-2">
                              {source.type}
                            </p>
                          )}
                          {source.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              {source.description}
                            </p>
                          )}
                          {source.details && source.details.length > 0 && (
                            <ul className="text-xs text-gray-600 dark:text-gray-400 list-disc list-inside space-y-1 mb-2">
                              {source.details.map((detail, i) => (
                                <li key={i}>{detail}</li>
                              ))}
                            </ul>
                          )}
                          {source.url && (
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 rounded-lg transition-colors mt-2"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              {t('references_modal.source_access')}
                            </a>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Subcategories */}
                    {category.subcategories && category.subcategories.map((subcat, subcatIdx) => (
                      <div key={subcatIdx} className="ml-6 mt-4">
                        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          {subcat.title}
                        </h4>
                        <div className="space-y-3">
                          {subcat.sources.map((source, sourceIdx) => (
                            <div
                              key={sourceIdx}
                              className="border-l-4 border-blue-300 bg-blue-50 dark:bg-blue-900/10 rounded-r-xl p-3 hover:shadow-md transition-all"
                            >
                              <h5 className="font-medium text-gray-900 dark:text-white text-sm mb-1">
                                {source.name}
                              </h5>
                              <p className="text-xs text-gray-700 dark:text-gray-300 mb-1">
                                {source.organization}
                                {source.year && <span className="font-semibold text-blue-700 dark:text-blue-400"> ({source.year})</span>}
                              </p>
                              {source.type && (
                                <p className="text-xs text-gray-600 dark:text-gray-400 italic mb-1">
                                  {source.type}
                                </p>
                              )}
                              {source.description && (
                                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                                  {source.description}
                                </p>
                              )}
                              {source.details && source.details.length > 0 && (
                                <ul className="text-xs text-gray-600 dark:text-gray-400 list-disc list-inside space-y-0.5 mb-1">
                                  {source.details.map((detail, i) => (
                                    <li key={i}>{detail}</li>
                                  ))}
                                </ul>
                              )}
                              {source.url && (
                                <a
                                  href={source.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 rounded-lg transition-colors mt-1"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  {t('references_modal.source_access_short')}
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}

                {/* Footer Note for Data Sources Tab */}
                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-slate-700">
                  <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                    <Database className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-green-800 dark:text-green-300">
                      <p className="font-semibold mb-1">{t('references_modal.data_sources_footer_heading')}</p>
                      <p className="text-green-700 dark:text-green-400 mb-2">
                        {t('references_modal.data_sources_footer_text')}
                      </p>
                      <ul className="text-green-600 dark:text-green-400 text-xs space-y-1 list-disc list-inside">
                        <li><strong>{t('references_modal.data_sources_footer_priority')}</strong></li>
                        <li><strong>{t('references_modal.data_sources_footer_validation')}</strong></li>
                        <li><strong>{t('references_modal.data_sources_footer_precision')}</strong></li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

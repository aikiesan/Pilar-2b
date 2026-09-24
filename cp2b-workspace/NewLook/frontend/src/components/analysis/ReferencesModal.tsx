/**
 * The references and data sources behind the advanced analysis.
 *
 * Source and organization names are proper nouns and publication titles are
 * cited as published, so they stay in their original language; what describes
 * them is written in both.
 */

'use client';

import React, { useId, useRef, useState } from 'react';
import { BookOpen, Database, ExternalLink, FileText, Beaker, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/navigation';
import { useDialog } from '@/hooks/useDialog';
import { useLocalize } from '@/hooks/useLocalize';
import type { Localized } from '@/lib/localized';

interface ReferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** A name that is either a proper noun (one spelling) or a description (two). */
type Name = string | Localized;

/** A residue whose literature lives in the scientific database. */
interface DatabasePointer {
  kind: 'database';
  residue: Localized;
  /** How many validated references the database holds for it ("22+", "3–4"). */
  references: string;
}

/** A source outside the platform. */
interface ExternalReference {
  kind: 'external';
  topic: Localized;
  authors: string;
  year: number;
  url: string;
  /** The publication's own title, as published. */
  title?: string;
  description?: Localized;
}

interface ReferenceCategory {
  category: Localized;
  emoji: string;
  color: string;
  bgColor: string;
  references: Array<DatabasePointer | ExternalReference>;
}

const db = (residue: Localized, references: string): DatabasePointer => ({ kind: 'database', residue, references });

const REFERENCES: ReferenceCategory[] = [
  {
    category: { 'pt-BR': 'Cana-de-açúcar', en: 'Sugarcane' },
    emoji: '🌱',
    color: 'border-green-500',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    references: [
      db({ 'pt-BR': 'Bagaço', en: 'Bagasse' }, '39'),
      db({ 'pt-BR': 'Vinhaça', en: 'Vinasse' }, '27'),
      db({ 'pt-BR': 'Torta de filtro', en: 'Filter cake' }, '20'),
      db({ 'pt-BR': 'Palha', en: 'Straw' }, '31'),
    ],
  },
  {
    category: { 'pt-BR': 'Pecuária', en: 'Livestock' },
    emoji: '🐄',
    color: 'border-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    references: [
      db({ 'pt-BR': 'Dejeto bovino', en: 'Cattle manure' }, '4'),
      db({ 'pt-BR': 'Dejeto suíno', en: 'Swine manure' }, '22+'),
      db({ 'pt-BR': 'Cama de frango', en: 'Poultry litter' }, '3'),
    ],
  },
  {
    category: { 'pt-BR': 'Citros', en: 'Citrus' },
    emoji: '🍊',
    color: 'border-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    references: [db({ 'pt-BR': 'Bagaço e cascas de laranja', en: 'Orange bagasse and peels' }, '3–4')],
  },
  {
    category: { 'pt-BR': 'Urbano', en: 'Urban' },
    emoji: '🏙️',
    color: 'border-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    references: [
      {
        kind: 'external',
        topic: { 'pt-BR': 'RSU (resíduos sólidos urbanos)', en: 'MSW (municipal solid waste)' },
        authors: 'IPEA',
        year: 2012,
        url: 'https://www.ipea.gov.br/portal/publicacao-item?id=34419',
        title: 'Diagnóstico dos Resíduos Sólidos Urbanos: Relatório de Pesquisa', // i18n-exempt: publication title
      },
      {
        kind: 'external',
        topic: { 'pt-BR': 'Lodo de ETE', en: 'WWTP sludge' },
        authors: 'SNIS',
        year: 2023,
        url: 'https://www.gov.br/cidades/pt-br/acesso-a-informacao/acoes-e-programas/saneamento/snis',
        title: 'Sistema Nacional de Informações sobre Saneamento: Diagnóstico Anual', // i18n-exempt: publication title
      },
    ],
  },
  {
    category: { 'pt-BR': 'Metodologia', en: 'Methodology' },
    emoji: '📚',
    color: 'border-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    references: [
      {
        kind: 'external',
        topic: { 'pt-BR': 'Fatores de correção FDE', en: 'FDE correction factors' },
        authors: 'CETESB',
        year: 2018,
        url: 'https://cetesb.sp.gov.br/biogas/',
        title: 'Guia Técnico Ambiental de Inventário de Emissões de Gases de Efeito Estufa', // i18n-exempt: publication title
      },
      {
        kind: 'external',
        topic: { 'pt-BR': 'Metodologia DBFZ', en: 'DBFZ methodology' },
        authors: 'DBFZ - Deutsches Biomasseforschungszentrum',
        year: 2023,
        url: 'https://www.dbfz.de/',
        description: {
          'pt-BR': 'Modelo de três frações para a cinética de degradação anaeróbia (k_slow, k_med, k_fast)',
          en: 'Three-fraction model of anaerobic degradation kinetics (k_slow, k_med, k_fast)',
        },
      },
    ],
  },
];

interface DataSource {
  name: Name;
  organization: string;
  url?: string;
  type?: Localized;
  year?: string;
  description?: Localized;
  details?: Localized<string[]>;
}

interface DataSourceCategory {
  category: Localized;
  emoji: string;
  color: string;
  bgColor: string;
  sources: DataSource[];
  subcategories?: { title: Localized; sources: DataSource[] }[];
}

const DATA_SOURCES: DataSourceCategory[] = [
  {
    category: { 'pt-BR': 'Setor Agrícola', en: 'Agricultural Sector' },
    emoji: '🌾',
    color: 'border-green-500',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    sources: [
      {
        name: 'IBGE - Produção Agrícola Municipal (PAM)', // i18n-exempt: official survey name
        organization: 'SIDRA/IBGE',
        url: 'https://sidra.ibge.gov.br/pesquisa/pam/tabelas',
        type: { 'pt-BR': 'Dados oficiais municipais', en: 'Official municipal data' },
        year: '2024',
        description: {
          'pt-BR': 'Área plantada, área colhida, quantidade produzida, rendimento médio, valor da produção',
          en: 'Planted area, harvested area, quantity produced, average yield, production value',
        },
        details: {
          'pt-BR': [
            'Tabela SIDRA 1612: lavouras temporárias e permanentes',
            'Atualização anual (última divulgação: setembro de 2024)',
            'Cobertura: 645 municípios de São Paulo',
          ],
          en: [
            'SIDRA table 1612: temporary and permanent crops',
            'Updated yearly (latest release: September 2024)',
            'Coverage: the 645 municipalities of São Paulo',
          ],
        },
      },
      {
        name: 'MapBiomas - Coleção 10.0', // i18n-exempt: dataset name
        organization: 'Projeto MapBiomas Brasil', // i18n-exempt: organization name
        url: 'https://brasil.mapbiomas.org/colecoes-mapbiomas/',
        type: { 'pt-BR': 'Cobertura e uso do solo', en: 'Land cover and land use' },
        year: '2024',
        description: {
          'pt-BR': 'Mapeamento anual da cobertura e do uso do solo do Brasil',
          en: 'Annual land cover and land use mapping of Brazil',
        },
        details: {
          'pt-BR': ['Resolução espacial: 30 m × 30 m (Landsat)', 'Período: 2000–2024', 'Plataforma: Google Earth Engine (GEE)'],
          en: ['Spatial resolution: 30 m × 30 m (Landsat)', 'Time span: 2000–2024', 'Platform: Google Earth Engine (GEE)'],
        },
      },
    ],
    subcategories: [
      {
        title: { 'pt-BR': 'Cana-de-açúcar', en: 'Sugarcane' },
        sources: [
          {
            name: 'UNICADATA - UNICA',
            organization: 'União da Indústria de Cana-de-Açúcar', // i18n-exempt: organization name
            url: 'https://unicadata.com.br/',
            type: { 'pt-BR': 'Acompanhamento da safra', en: 'Harvest monitoring' },
            year: '2024/2025',
            description: {
              'pt-BR': 'Balanço da safra 2024/2025: produção, moagem, etanol e açúcar por região e usina',
              en: '2024/2025 harvest report: production, crushing, ethanol and sugar by region and mill',
            },
          },
          {
            name: 'CONAB - Acompanhamento da Safra Brasileira', // i18n-exempt: publication series
            organization: 'Companhia Nacional de Abastecimento', // i18n-exempt: organization name
            url: 'https://www.gov.br/conab/pt-br/assuntos/noticias',
            type: { 'pt-BR': 'Safra 2024/25', en: '2024/25 harvest' },
            year: '2024/2025',
            details: {
              'pt-BR': [
                'Safra 2024/25: 676,96 milhões de toneladas (Brasil)',
                'Sudeste: 439,6 milhões de toneladas',
                'Área colhida em SP: 5,48 milhões de hectares',
              ],
              en: [
                '2024/25 harvest: 676.96 million tonnes (Brazil)',
                'Southeast: 439.6 million tonnes',
                'Harvested area in SP: 5.48 million hectares',
              ],
            },
          },
          {
            name: 'EMBRAPA - Cenário Agroenergético da Cana', // i18n-exempt: publication title
            organization: 'EMBRAPA Meio Ambiente', // i18n-exempt: organization name
            url: 'https://www.embrapa.br/busca-de-publicacoes/-/publicacao/1035982/cenario-agroenergetico-da-cana-de-acucar-em-sao-paulo',
            type: { 'pt-BR': 'Avaliação socioeconômica e ambiental', en: 'Socioeconomic and environmental assessment' },
            description: {
              'pt-BR': 'Fatores de correção da disponibilidade de resíduos, com SIG',
              en: 'Correction factors for residue availability, using GIS',
            },
          },
          {
            name: { 'pt-BR': 'Novacana - Mapeamento de Usinas', en: 'Novacana: mill mapping' },
            organization: 'Portal Novacana',
            url: 'https://www.novacana.com/usinas_brasil/estados/sao-paulo',
            type: { 'pt-BR': 'Localização de usinas', en: 'Mill locations' },
            description: {
              'pt-BR': 'Lista das unidades sucroenergéticas em operação em São Paulo',
              en: 'List of the sugar-energy units operating in São Paulo',
            },
          },
          {
            name: 'UDOPmaps - Bioenergia em Números', // i18n-exempt: platform name
            organization: 'UDOP',
            url: 'http://udopmaps.com.br/mapa/bioenergia-em-numeros',
            type: { 'pt-BR': 'Plataforma SIG', en: 'GIS platform' },
            description: { 'pt-BR': 'Usinas de biomassa georreferenciadas', en: 'Georeferenced biomass plants' },
          },
        ],
      },
    ],
  },
  {
    category: { 'pt-BR': 'Setor Pecuário', en: 'Livestock Sector' },
    emoji: '🐄',
    color: 'border-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    sources: [
      {
        name: 'GEDAVE - Defesa Agropecuária do Estado de São Paulo', // i18n-exempt: system name
        organization: 'CDA-SP',
        url: 'https://www.defesa.agricultura.sp.gov.br/',
        type: { 'pt-BR': 'Sistema de gestão', en: 'Management system' },
        year: '2024',
        description: {
          'pt-BR': 'Registros de rebanhos e GTAs georreferenciados por propriedade',
          en: 'Herd records and animal transit permits (GTAs), georeferenced by farm',
        },
        details: {
          'pt-BR': ['Sistema: https://gedave.defesaagropecuaria.sp.gov.br/', 'Bovinocultura, suinocultura, avicultura', 'Versão 2.0 (2024)'],
          en: ['System: https://gedave.defesaagropecuaria.sp.gov.br/', 'Cattle, swine and poultry farming', 'Version 2.0 (2024)'],
        },
      },
      {
        name: 'IBGE - Pesquisa Pecuária Municipal (PPM)', // i18n-exempt: official survey name
        organization: 'SIDRA/IBGE',
        type: { 'pt-BR': 'Inventários de rebanhos', en: 'Herd inventories' },
        description: {
          'pt-BR': 'Rebanhos bovinos, suínos e de aves por município, para estimar a geração de dejetos (kg/cabeça/dia).',
          en: 'Cattle, swine and poultry herds by municipality, to estimate manure generation (kg/head/day).',
        },
      },
      {
        name: { 'pt-BR': 'EMBRAPA - Metodologia para Dejetos Animais', en: 'EMBRAPA: methodology for animal manure' },
        organization: 'EMBRAPA Documentos 196', // i18n-exempt: publication series
        type: { 'pt-BR': 'Metodologia técnica', en: 'Technical methodology' },
        year: '2018',
        description: {
          'pt-BR': 'Metodologia para suínos e bovinos. Parâmetros: sólidos voláteis (SV), B₀, efluentes por categoria animal',
          en: 'Methodology for swine and cattle. Parameters: volatile solids (VS), B₀, effluents by animal category',
        },
      },
    ],
  },
  {
    category: { 'pt-BR': 'Setor Urbano', en: 'Urban Sector' },
    emoji: '🏙️',
    color: 'border-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    sources: [
      {
        name: 'SNIS - Sistema Nacional de Informações sobre Saneamento', // i18n-exempt: official system name
        organization: 'Ministério das Cidades/SNISA', // i18n-exempt: organization name
        url: 'https://app-hmg.cidades.gov.br/indicadores-sinisa/web/',
        type: { 'pt-BR': 'Dados municipais', en: 'Municipal data' },
        year: '2022-2023',
        description: {
          'pt-BR': 'RSU, águas pluviais, esgoto: indicadores de coleta, destinação, reciclagem e ETEs',
          en: 'MSW, stormwater, sewage: indicators of collection, disposal, recycling and WWTPs',
        },
        details: {
          'pt-BR': ['Série histórica: https://app4.cidades.gov.br/serieHistorica/', 'Cobertura: municípios de São Paulo'],
          en: ['Historical series: https://app4.cidades.gov.br/serieHistorica/', 'Coverage: São Paulo municipalities'],
        },
      },
      {
        name: { 'pt-BR': 'IBGE - Estimativa Populacional', en: 'IBGE: population estimates' },
        organization: 'IBGE',
        url: 'https://censo2022.ibge.gov.br/panorama/',
        type: { 'pt-BR': 'Censo Demográfico 2022', en: '2022 Demographic Census' },
        description: {
          'pt-BR': 'População por domicílio e município, para a geração per capita de RSU (kg/habitante/dia).',
          en: 'Population by household and municipality, for per-capita MSW generation (kg/inhabitant/day).',
        },
      },
    ],
  },
  {
    category: { 'pt-BR': 'Plantas de Biogás em Operação', en: 'Operating Biogas Plants' },
    emoji: '🏭',
    color: 'border-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    sources: [
      {
        name: 'MapBiomas + ANP',
        organization: 'MapBiomas Brasil + Agência Nacional do Petróleo', // i18n-exempt: organization names
        type: { 'pt-BR': 'Plantas georreferenciadas', en: 'Georeferenced plants' },
        year: '2024',
        description: {
          'pt-BR': 'Plantas de biogás em operação: localização, capacidade, tipo de resíduo',
          en: 'Operating biogas plants: location, capacity, feedstock type',
        },
      },
      {
        name: 'CIBiogás - Atlas do Biogás Brasil', // i18n-exempt: publication title
        organization: 'Centro Internacional de Energias Renováveis', // i18n-exempt: organization name
        url: 'https://cibiogas.org',
        type: { 'pt-BR': 'Base nacional', en: 'National database' },
        year: '2019',
        description: {
          'pt-BR': 'Plantas de biogás em operação: capacidade, substrato, tecnologia',
          en: 'Operating biogas plants: capacity, feedstock, technology',
        },
      },
      {
        name: 'ANP - Painel Dinâmico de Produtores de Etanol', // i18n-exempt: official dashboard name
        organization: 'ANP',
        url: 'https://app.powerbi.com/view?r=eyJrIjoiMmRhZWU2NDUtZWE2Yi00NzI5LWJjMGQtNjIwNjE0MjM0MjEzIiwidCI6IjQ0OTlmNGZmLTI0YTYtNGI0Mi1iN2VmLTEyNGFmY2FkYzkxMyJ9',
        type: { 'pt-BR': 'Painel interativo', en: 'Interactive dashboard' },
        year: '2025',
        description: {
          'pt-BR': 'Mapa dinâmico de produtores, capacidades, produção e matéria-prima',
          en: 'Dynamic map of producers, capacities, output and feedstock',
        },
        details: {
          'pt-BR': ['Fonte: sistema SIMP (Resoluções 729/2018 e 734/2018)', 'Referencial: SIRGAS 2000 (EPSG 4674)', 'Atualização: 25/11/2025'],
          en: ['Source: SIMP system (Resolutions 729/2018 and 734/2018)', 'Datum: SIRGAS 2000 (EPSG 4674)', 'Updated: November 25, 2025'],
        },
      },
      {
        name: 'ABiogás - Potencial Brasileiro de Biogás', // i18n-exempt: publication title
        organization: 'Associação Brasileira de Biogás', // i18n-exempt: organization name
        type: { 'pt-BR': 'Estudo de potencial', en: 'Potential study' },
        year: '2020',
        description: { 'pt-BR': 'Estimativa nacional do potencial', en: 'National potential estimate' },
        details: {
          'pt-BR': ['Total: 84,99 bilhões de Nm³/ano', 'Biometano: 43,23 bilhões de Nm³/ano', 'Setor sucroenergético: 39,76 bilhões de Nm³/ano (47%)'],
          en: ['Total: 84.99 billion Nm³/year', 'Biomethane: 43.23 billion Nm³/year', 'Sugar-energy sector: 39.76 billion Nm³/year (47%)'],
        },
      },
    ],
  },
];

// Literal class names: Tailwind only generates classes it can see whole in the source.
const TAB_TONES = {
  green: {
    active: 'text-green-700 dark:text-green-400 border-b-2 border-green-600 bg-white dark:bg-slate-800',
    badge: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400',
  },
  blue: {
    active: 'text-blue-700 dark:text-blue-400 border-b-2 border-blue-600 bg-white dark:bg-slate-800',
    badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',
  },
} as const;

const linkClass =
  'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 rounded-lg transition-colors';

export default function ReferencesModal({ isOpen, onClose }: ReferencesModalProps) {
  const t = useTranslations('analysis.references_modal');
  const localize = useLocalize();
  const nameOf = (name: Name) => (typeof name === 'string' ? name : localize(name));
  const [activeTab, setActiveTab] = useState<'scientific' | 'data-sources'>('scientific');
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useDialog<HTMLDivElement>(isOpen, onClose, closeRef);
  if (!isOpen) return null;

  const totalReferences = REFERENCES.reduce((acc, cat) => acc + cat.references.length, 0);

  // Sources sit under their category (h3), or under a subcategory (h4) when compact.
  const renderSource = (source: DataSource, compact: boolean) => (
    <>
      {compact ? (
        <h5 className="font-medium text-sm text-gray-900 dark:text-white mb-1">{nameOf(source.name)}</h5>
      ) : (
        <h4 className="font-bold text-gray-900 dark:text-white mb-1">{nameOf(source.name)}</h4>
      )}
      <p className={`${compact ? 'text-xs mb-1' : 'text-sm mb-2'} text-gray-700 dark:text-gray-300`}>
        {source.organization}
        {source.year && <span className="font-semibold text-blue-700 dark:text-blue-400"> ({source.year})</span>}
      </p>
      {source.type && <p className="text-xs text-gray-600 dark:text-gray-400 italic mb-1">{localize(source.type)}</p>}
      {source.description && (
        <p className={`${compact ? 'text-xs mb-1' : 'text-sm mb-2'} text-gray-600 dark:text-gray-400`}>{localize(source.description)}</p>
      )}
      {source.details && (
        <ul className="text-xs text-gray-600 dark:text-gray-400 list-disc list-inside space-y-1 mb-2">
          {localize(source.details).map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      )}
      {source.url && (
        <a href={source.url} target="_blank" rel="noopener noreferrer" className={`${linkClass} mt-1`}>
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          {compact ? t('source_access_short') : t('source_access')}
        </a>
      )}
    </>
  );

  return (
    <>
      {/* Clicking the backdrop closes; Escape does the same from the keyboard (useDialog). */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events -- keyboard: Escape */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden border border-gray-200 dark:border-slate-700"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
                  <BookOpen className="h-6 w-6 text-white" aria-hidden="true" />
                </div>
                <div>
                  <h2 id={titleId} className="text-xl font-bold text-white">{t('title')}</h2>
                  <p className="text-sm text-white/80 mt-0.5">{t('subtitle')}</p>
                </div>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                aria-label={t('close_aria')}
              >
                <X className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
            {([
              ['scientific', Beaker, t('tab_scientific'), totalReferences, 'green'],
              ['data-sources', Database, t('tab_data_sources'), DATA_SOURCES.length, 'blue'],
            ] as const).map(([id, Icon, label, count, tone]) => (
              <button
                key={id}
                type="button"
                aria-pressed={activeTab === id}
                onClick={() => setActiveTab(id)}
                className={`flex-1 px-6 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  activeTab === id
                    ? TAB_TONES[tone].active
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                {label}
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-semibold ${TAB_TONES[tone].badge}`}>
                  {count}
                </span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(85vh-12rem)] p-6">
            {activeTab === 'scientific' && (
              <div className="space-y-8">
                {REFERENCES.map((category) => (
                  <section key={category.category.en} aria-label={localize(category.category)}>
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-3xl" aria-hidden="true">{category.emoji}</span>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{localize(category.category)}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('reference_count', { count: category.references.length })}</p>
                      </div>
                    </div>

                    <div className="grid gap-3">
                      {category.references.map((ref) => (
                        <div
                          key={ref.kind === 'database' ? ref.residue.en : ref.topic.en}
                          className={`border-l-4 ${category.color} ${category.bgColor} rounded-r-xl p-4 hover:shadow-md transition-all`}
                        >
                          <h4 className="font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                            <Beaker className="h-4 w-4 flex-shrink-0 text-gray-500 dark:text-gray-400" aria-hidden="true" />
                            {localize(ref.kind === 'database' ? ref.residue : ref.topic)}
                          </h4>
                          {ref.kind === 'database' ? (
                            <>
                              <p className="text-sm text-gray-700 dark:text-gray-300">{t('db_pointer', { count: ref.references })}</p>
                              <div className="mt-3">
                                <Link href="/dashboard/scientific-database?view=references" onClick={onClose} className={linkClass}>
                                  <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                                  {t('open_database')}
                                </Link>
                              </div>
                            </>
                          ) : (
                            <>
                              <p className="text-sm text-gray-700 dark:text-gray-300">
                                {ref.authors} <span className="font-semibold text-green-700 dark:text-green-400">({ref.year})</span>
                              </p>
                              {ref.title && <p className="text-sm text-gray-600 dark:text-gray-400 italic mt-2">{ref.title}</p>}
                              {ref.description && <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{localize(ref.description)}</p>}
                              <div className="mt-3">
                                <a href={ref.url} target="_blank" rel="noopener noreferrer" className={linkClass}>
                                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                                  {t('source_access')}
                                </a>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                ))}

                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-slate-700">
                  <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                    <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <div className="text-sm text-blue-800 dark:text-blue-300">
                      <p className="font-semibold mb-1">{t('scientific_footer_heading')}</p>
                      <p className="text-blue-700 dark:text-blue-400">{t('scientific_footer_text')}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'data-sources' && (
              <div className="space-y-6">
                {DATA_SOURCES.map((category) => (
                  <section key={category.category.en} aria-label={localize(category.category)}>
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-3xl" aria-hidden="true">{category.emoji}</span>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{localize(category.category)}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('source_count', { count: category.sources.length })}</p>
                      </div>
                    </div>

                    <div className="space-y-3 mb-4">
                      {category.sources.map((source) => (
                        <div key={nameOf(source.name)} className={`border-l-4 ${category.color} ${category.bgColor} rounded-r-xl p-4 hover:shadow-md transition-all`}>
                          {renderSource(source, false)}
                        </div>
                      ))}
                    </div>

                    {category.subcategories?.map((subcategory) => (
                      <div key={subcategory.title.en} className="ml-6 mt-4">
                        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                          <span className="w-2 h-2 bg-blue-500 rounded-full" aria-hidden="true"></span>
                          {localize(subcategory.title)}
                        </h4>
                        <div className="space-y-3">
                          {subcategory.sources.map((source) => (
                            <div key={nameOf(source.name)} className="border-l-4 border-blue-300 bg-blue-50 dark:bg-blue-900/10 rounded-r-xl p-3 hover:shadow-md transition-all">
                              {renderSource(source, true)}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </section>
                ))}

                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-slate-700">
                  <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                    <Database className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <div className="text-sm text-green-800 dark:text-green-300">
                      <p className="font-semibold mb-1">{t('data_sources_footer_heading')}</p>
                      <p className="text-green-700 dark:text-green-400 mb-2">{t('data_sources_footer_text')}</p>
                      <ul className="text-green-600 dark:text-green-400 text-xs space-y-1 list-disc list-inside">
                        <li><strong>{t('data_sources_footer_priority')}</strong></li>
                        <li><strong>{t('data_sources_footer_validation')}</strong></li>
                        <li><strong>{t('data_sources_footer_precision')}</strong></li>
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

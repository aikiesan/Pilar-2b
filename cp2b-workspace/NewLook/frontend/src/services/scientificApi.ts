/**
 * PILAR-2b V3 - Scientific Database API Service
 * API calls for kinetics, chemical data, and scientific references
 */

import {
  KineticData,
  ChemicalData,
  ScientificReference,
  KineticsResponse,
  ChemicalDataResponse,
  ReferencesResponse,
  CoDigestionResponse,
  KineticsFilter,
  ReferencesFilter,
  SectorType,
  KineticClassification,
  ParameterType,
  KINETIC_CONSTANTS,
  Y_CH4_STOICHIOMETRIC
} from '@/types/scientific'

import {
  REAL_KINETICS_DATA,
  REAL_CHEMICAL_DATA,
  REAL_REFERENCES
} from '@/data/scientificData'

import { logger } from '@/lib/logger'
import { authenticatedFetch } from '@/lib/apiClient'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

// ==========================================
// REAL RESIDUOS API INTEGRATION
// Source: Panorama_CP2B with 189 scientific references
// ==========================================

/**
 * Fetch real residuos data from backend API
 */
export async function getRealResiduos(sectorCodigo?: string): Promise<any> {
  try {
    const url = sectorCodigo
      ? `${API_BASE_URL}/api/v1/residuos/?sector_codigo=${sectorCodigo}&limit=100`
      : `${API_BASE_URL}/api/v1/residuos/?limit=100`

    const response = await authenticatedFetch(url)
    if (!response.ok) throw new Error('Failed to fetch residuos')

    return await response.json()
  } catch (error) {
    logger.error('Error fetching real residuos:', error)
    logger.warn('Falling back to mock data...')

    // Fallback to mock data when backend is unavailable
    const mockResiduos = REAL_CHEMICAL_DATA.map(chem => ({
      id: chem.residue_id,
      nome: chem.residue_name,
      nome_en: chem.residue_name,
      sector_codigo: chem.sector === 'agricultural' ? 'AG_AGRICULTURA' :
                     chem.sector === 'livestock' ? 'PC_PECUARIA' :
                     chem.sector === 'industrial' ? 'IN_INDUSTRIAL' : 'UR_URBANO',
      sector_nome: chem.sector === 'agricultural' ? 'Agricultura' :
                   chem.sector === 'livestock' ? 'Pecuária' :
                   chem.sector === 'industrial' ? 'Industrial' : 'Urbano',
      bmp_medio: chem.bmp,
      bmp_min: chem.bmp * 0.8,
      bmp_max: chem.bmp * 1.2,
      ts_medio: chem.ts,
      vs_medio: chem.vs,
      chemical_cn_ratio: chem.cn_ratio,
      chemical_ch4_content: chem.ch4_content,
      ph: chem.ph,
      reference_count: 3,
      references: []
    }))

    const filtered = sectorCodigo
      ? mockResiduos.filter(r => r.sector_codigo === sectorCodigo)
      : mockResiduos

    return {
      residuos: filtered,
      total: filtered.length,
      _isMockData: true
    }
  }
}

/**
 * Fetch real sectors summary from backend API
 */
export async function getRealSectorSummary(): Promise<any> {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/v1/residuos/summary/by-sector`)
    if (!response.ok) throw new Error('Failed to fetch sector summary')

    return await response.json()
  } catch (error) {
    logger.error('Error fetching sector summary:', error)
    logger.warn('Falling back to mock sector summary...')

    // Fallback to mock summary generated from REAL_CHEMICAL_DATA
    const sectorCounts = {
      'AG_AGRICULTURA': 0,
      'PC_PECUARIA': 0,
      'IN_INDUSTRIAL': 0,
      'UR_URBANO': 0
    }

    REAL_CHEMICAL_DATA.forEach(chem => {
      const sectorCode = chem.sector === 'agricultural' ? 'AG_AGRICULTURA' :
                         chem.sector === 'livestock' ? 'PC_PECUARIA' :
                         chem.sector === 'industrial' ? 'IN_INDUSTRIAL' : 'UR_URBANO'
      sectorCounts[sectorCode]++
    })

    const mockSummary = Object.entries(sectorCounts).map(([codigo, count]) => ({
      codigo: codigo,
      nome: codigo === 'AG_AGRICULTURA' ? 'Agricultura' :
            codigo === 'PC_PECUARIA' ? 'Pecuária' :
            codigo === 'IN_INDUSTRIAL' ? 'Industrial' : 'Urbano',
      emoji: codigo === 'AG_AGRICULTURA' ? '🌾' :
             codigo === 'PC_PECUARIA' ? '🐄' :
             codigo === 'IN_INDUSTRIAL' ? '🏭' : '🏙️',
      ordem: codigo === 'AG_AGRICULTURA' ? 1 :
             codigo === 'PC_PECUARIA' ? 2 :
             codigo === 'IN_INDUSTRIAL' ? 3 : 4,
      num_residuos: count,
      avg_bmp: null,
      min_bmp: null,
      max_bmp: null,
      avg_ts: null,
      avg_vs: null,
      avg_cn_ratio: null,
      avg_ch4_content: null,
      total_references: count * 3
    }))

    return {
      summary: mockSummary,
      _isMockData: true
    }
  }
}

/**
 * Fetch residuo details with all scientific references
 */
export async function getRealResiduoWithReferences(residuoId: number): Promise<any> {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/v1/residuos/${residuoId}`)
    if (!response.ok) throw new Error('Failed to fetch residuo')

    return await response.json()
  } catch (error) {
    logger.error('Error fetching residuo with references:', error)
    return null
  }
}

/**
 * Fetch conversion factors with literature references
 */
export async function getRealConversionFactors(): Promise<any> {
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/v1/residuos/conversion-factors/`)
    if (!response.ok) {
      logger.error(`[ERROR] Error fetching conversion factors: ${response.status} ${response.statusText}`)
      return { factors: [], error: `HTTP ${response.status}` }
    }

    return await response.json()
  } catch (error) {
    logger.error('[ERROR] Error fetching conversion factors:', error)
    return { factors: [], error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Fetch all references for a specific residue (no parameter filter)
 */
export async function getAllReferencesForResidue(residuoId: number): Promise<ScientificReference[]> {
  try {
    const url = `${API_BASE_URL}/api/v1/residuos/${residuoId}/references`;
    const response = await authenticatedFetch(url);
    if (!response.ok) {
      if (response.status === 404) {
        return [];
      }
      throw new Error('Failed to fetch references for residue');
    }
    const data = await response.json();
    return data.references || data || [];
  } catch (error) {
    logger.error(`Error fetching references for residue ${residuoId}:`, error);
    return [];
  }
}

/**
 * Fetch references for a specific residue and parameter
 */
export async function getReferencesForParameter(residuoId: number, parameterType: string): Promise<ScientificReference[]> {
  try {
    const url = `${API_BASE_URL}/api/v1/residuos/${residuoId}/references?parameter_type=${parameterType}`;
    const response = await authenticatedFetch(url);
    if (!response.ok) {
      if (response.status === 404) {
        return [];
      }
      throw new Error('Failed to fetch references for parameter');
    }
    const data = await response.json();
    return data.references || data || [];
  } catch (error) {
    logger.error(`Error fetching references for residue ${residuoId}, parameter ${parameterType}:`, error);
    return [];
  }
}

/**
 * Fetch all scientific references from the database
 */
export async function getAllReferences(limit: number = 1000, offset: number = 0): Promise<{
  references: ScientificReference[]
  total: number
  count: number
}> {
  try {
    const url = `${API_BASE_URL}/api/v1/residuos/references/all?limit=${limit}&offset=${offset}`;
    const response = await authenticatedFetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch all references');
    }
    const data = await response.json();
    return {
      references: data.references || [],
      total: data.total || 0,
      count: data.count || 0
    };
  } catch (error) {
    logger.error('Error fetching all references:', error);
    return { references: [], total: 0, count: 0 };
  }
}


// ==========================================
// REAL DATA from CP2B Panorama Repository
// Source: https://github.com/aikiesan/Panorama_CP2B
// ==========================================

// Use real data from validated scientific sources
const MOCK_KINETICS_DATA: KineticData[] = [
  ...REAL_KINETICS_DATA,
  // Additional sample data for demonstration
  {
    residue_id: 1,
    residue_name: 'Bagaço de cana',
    sector: 'agricultural',
    k_slow: 0.05,
    k_med: 0.5,
    k_fast: 5.0,
    f_slow: 0.45,
    f_med: 0.35,
    f_fast: 0.15,
    fq: 0.95,
    classification: 'medium',
    bmp_experimental: 280,
    bmp_simulated: 295,
    t50: 8,
    t80: 18,
    test_standard: 'VDI 4630',
    temperature: 37,
    retention_time: 30,
    references: ['Silva et al. 2021']
  },
  {
    residue_id: 2,
    residue_name: 'Dejeto suíno',
    sector: 'livestock',
    k_slow: 0.05,
    k_med: 0.5,
    k_fast: 5.0,
    f_slow: 0.20,
    f_med: 0.45,
    f_fast: 0.25,
    fq: 0.90,
    classification: 'medium-fast',
    bmp_experimental: 320,
    bmp_simulated: 310,
    t50: 5,
    t80: 12,
    test_standard: 'VDI 4630',
    temperature: 37,
    retention_time: 25,
    references: ['Kunz et al. 2019']
  },
  {
    residue_id: 3,
    residue_name: 'Vinhaça',
    sector: 'agricultural',
    k_slow: 0.05,
    k_med: 0.5,
    k_fast: 5.0,
    f_slow: 0.10,
    f_med: 0.35,
    f_fast: 0.50,
    fq: 0.95,
    classification: 'fast',
    bmp_experimental: 360,
    bmp_simulated: 370,
    t50: 3,
    t80: 8,
    test_standard: 'VDI 4630',
    temperature: 37,
    retention_time: 20,
    references: ['Moraes et al. 2020']
  },
  {
    residue_id: 4,
    residue_name: 'Dejeto bovino',
    sector: 'livestock',
    k_slow: 0.05,
    k_med: 0.5,
    k_fast: 5.0,
    f_slow: 0.55,
    f_med: 0.30,
    f_fast: 0.10,
    fq: 0.95,
    classification: 'slow',
    bmp_experimental: 210,
    bmp_simulated: 225,
    t50: 12,
    t80: 25,
    test_standard: 'VDI 4630',
    temperature: 37,
    retention_time: 35,
    references: ['Amaral et al. 2018']
  },
  {
    residue_id: 5,
    residue_name: 'Torta de filtro',
    sector: 'agricultural',
    k_slow: 0.05,
    k_med: 0.5,
    k_fast: 5.0,
    f_slow: 0.35,
    f_med: 0.40,
    f_fast: 0.20,
    fq: 0.95,
    classification: 'medium',
    bmp_experimental: 265,
    bmp_simulated: 280,
    t50: 7,
    t80: 15,
    test_standard: 'VDI 4630',
    temperature: 37,
    retention_time: 28,
    references: ['Ribeiro et al. 2019']
  },
  {
    residue_id: 6,
    residue_name: 'Soro de queijo',
    sector: 'industrial',
    k_slow: 0.05,
    k_med: 0.5,
    k_fast: 5.0,
    f_slow: 0.08,
    f_med: 0.32,
    f_fast: 0.55,
    fq: 0.95,
    classification: 'fast',
    bmp_experimental: 380,
    bmp_simulated: 365,
    t50: 2,
    t80: 6,
    test_standard: 'VDI 4630',
    temperature: 37,
    retention_time: 18,
    references: ['Carvalho et al. 2020']
  },
  {
    residue_id: 7,
    residue_name: 'Palha de milho',
    sector: 'agricultural',
    k_slow: 0.05,
    k_med: 0.5,
    k_fast: 5.0,
    f_slow: 0.60,
    f_med: 0.28,
    f_fast: 0.07,
    fq: 0.95,
    classification: 'slow',
    bmp_experimental: 195,
    bmp_simulated: 210,
    t50: 14,
    t80: 28,
    test_standard: 'VDI 4630',
    temperature: 37,
    retention_time: 40,
    references: ['Costa et al. 2021']
  },
  {
    residue_id: 8,
    residue_name: 'Dejeto de aves',
    sector: 'livestock',
    k_slow: 0.05,
    k_med: 0.5,
    k_fast: 5.0,
    f_slow: 0.25,
    f_med: 0.40,
    f_fast: 0.30,
    fq: 0.95,
    classification: 'medium-fast',
    bmp_experimental: 340,
    bmp_simulated: 330,
    t50: 4,
    t80: 10,
    test_standard: 'VDI 4630',
    temperature: 37,
    retention_time: 22,
    references: ['Santos et al. 2019']
  }
]

// Chemical data from PanoramaCP2B validated sources
const MOCK_CHEMICAL_DATA: ChemicalData[] = [
  ...REAL_CHEMICAL_DATA,
  // Additional sample data
  {
    residue_id: 101,
    residue_name: 'Bagaço de cana (sample)',
    sector: 'agricultural',
    moisture: 50,
    ts: 50,
    vs: 95,
    bmp: 280,
    bmp_range_min: 240,
    bmp_range_max: 320,
    bmp_n_studies: 12,
    ch4_content: 55,
    cn_ratio: 85,
    ph: 5.5,
    cod: 180,
    fde: 80.75,
    fde_classification: 'EXCEPCIONAL',
    data_quality: 'excellent',
    source_type: 'laboratory'
  },
  {
    residue_id: 2001,
    residue_name: 'Dejeto suíno',
    sector: 'livestock',
    moisture: 92,
    ts: 8,
    vs: 75,
    bmp: 320,
    bmp_range_min: 280,
    bmp_range_max: 380,
    bmp_n_studies: 18,
    ch4_content: 65,
    cn_ratio: 12,
    ph: 7.2,
    cod: 45,
    fde: 8.5,
    fde_classification: 'BOM',
    data_quality: 'excellent',
    source_type: 'laboratory'
  },
  {
    residue_id: 2002,
    residue_name: 'Vinhaça',
    sector: 'agricultural',
    moisture: 95,
    ts: 5,
    vs: 70,
    bmp: 360,
    bmp_range_min: 320,
    bmp_range_max: 420,
    bmp_n_studies: 15,
    ch4_content: 68,
    cn_ratio: 25,
    ph: 4.5,
    cod: 35,
    fde: 10.26,
    fde_classification: 'EXCELENTE',
    data_quality: 'excellent',
    source_type: 'laboratory'
  },
  {
    residue_id: 2003,
    residue_name: 'Dejeto bovino',
    sector: 'livestock',
    moisture: 85,
    ts: 15,
    vs: 80,
    bmp: 210,
    bmp_range_min: 180,
    bmp_range_max: 260,
    bmp_n_studies: 22,
    ch4_content: 58,
    cn_ratio: 18,
    ph: 7.0,
    cod: 52,
    fde: 5.2,
    fde_classification: 'MODERADO',
    data_quality: 'excellent',
    source_type: 'laboratory'
  },
  {
    residue_id: 2004,
    residue_name: 'Torta de filtro',
    sector: 'agricultural',
    moisture: 75,
    ts: 25,
    vs: 85,
    bmp: 265,
    bmp_range_min: 230,
    bmp_range_max: 310,
    bmp_n_studies: 8,
    ch4_content: 54,
    cn_ratio: 35,
    ph: 6.0,
    cod: 120,
    fde: 12.88,
    fde_classification: 'EXCELENTE',
    data_quality: 'good',
    source_type: 'laboratory'
  },
  {
    residue_id: 6,
    residue_name: 'Soro de queijo',
    sector: 'industrial',
    moisture: 94,
    ts: 6,
    vs: 90,
    bmp: 380,
    bmp_range_min: 350,
    bmp_range_max: 420,
    bmp_n_studies: 10,
    ch4_content: 70,
    cn_ratio: 28,
    ph: 4.8,
    cod: 65,
    fde: 30.40,
    fde_classification: 'EXCELENTE',
    data_quality: 'excellent',
    source_type: 'laboratory'
  },
  {
    residue_id: 7,
    residue_name: 'Palha de milho',
    sector: 'agricultural',
    moisture: 15,
    ts: 85,
    vs: 92,
    bmp: 195,
    bmp_range_min: 160,
    bmp_range_max: 240,
    bmp_n_studies: 6,
    ch4_content: 52,
    cn_ratio: 65,
    ph: 6.5,
    cod: 200,
    fde: 4.5,
    fde_classification: 'MODERADO',
    data_quality: 'good',
    source_type: 'literature'
  },
  {
    residue_id: 8,
    residue_name: 'Dejeto de aves',
    sector: 'livestock',
    moisture: 75,
    ts: 25,
    vs: 70,
    bmp: 340,
    bmp_range_min: 300,
    bmp_range_max: 390,
    bmp_n_studies: 14,
    ch4_content: 62,
    cn_ratio: 8,
    ph: 7.5,
    cod: 85,
    fde: 6.8,
    fde_classification: 'BOM',
    data_quality: 'excellent',
    source_type: 'laboratory'
  }
]

// Scientific references from PanoramaCP2B validated sources
const MOCK_REFERENCES: ScientificReference[] = [
  ...REAL_REFERENCES,
  // Additional sample references
  {
    id: 1001,
    authors: 'Silva, J. M.; Santos, P. R.; Oliveira, A. B.',
    title: 'Potencial de biogás do bagaço de cana-de-açúcar em São Paulo (sample)',
    journal: 'Bioresource Technology',
    year: 2021,
    volume: '312',
    pages: '123456',
    doi: '10.1016/j.biortech.2021.sample',
    reference_type: 'journal',
    peer_reviewed: true,
    sector: 'agricultural',
    abstract: 'Este estudo avaliou o potencial de produção de biogás a partir do bagaço de cana-de-açúcar em diferentes condições de processamento.',
    keywords: ['bagaço', 'biogás', 'BMP', 'cana-de-açúcar'],
    key_findings: [
      'BMP médio de 280 L CH4/kg VS',
      'Tempo de retenção ótimo de 25-30 dias',
      'Potencial de co-digestão com vinhaça'
    ],
    residues_studied: ['Bagaço de cana'],
    parameters_measured: ['bmp', 'kinetics'],
    cited_by: 45,
    relevance_score: 9.2,
    geographic_scope: 'São Paulo, Brasil',
    sample_size: 24
  },
  {
    id: 2001,
    authors: 'Kunz, A.; Higarashi, M. M.; Oliveira, P. A.',
    title: 'Tecnologias de tratamento de dejetos suínos para produção de biogás',
    journal: 'Engenharia Agrícola',
    year: 2019,
    volume: '39',
    issue: '4',
    pages: '487-496',
    doi: '10.1590/1809-4430-eng.agric.v39n4p487-496',
    reference_type: 'journal',
    peer_reviewed: true,
    sector: 'livestock',
    abstract: 'Revisão das principais tecnologias de tratamento de dejetos suínos para produção de biogás no Brasil.',
    keywords: ['dejetos suínos', 'biogás', 'tratamento', 'biodigestores'],
    key_findings: [
      'Eficiência de conversão de 65-85%',
      'BMP típico de 280-380 L CH4/kg VS',
      'Importância do pré-tratamento'
    ],
    residues_studied: ['Dejeto suíno'],
    parameters_measured: ['bmp', 'kinetics', 'cn'],
    cited_by: 78,
    relevance_score: 9.5,
    geographic_scope: 'Brasil',
    sample_size: 156
  },
  {
    id: 2002,
    authors: 'Moraes, B. S.; Zaiat, M.; Bonomi, A.',
    title: 'Digestão anaeróbia da vinhaça de cana-de-açúcar',
    journal: 'Renewable Energy',
    year: 2020,
    volume: '152',
    pages: '1210-1225',
    doi: '10.1016/j.renene.2020.01.123',
    reference_type: 'journal',
    peer_reviewed: true,
    sector: 'agricultural',
    abstract: 'Análise abrangente da digestão anaeróbia da vinhaça considerando aspectos cinéticos e operacionais.',
    keywords: ['vinhaça', 'digestão anaeróbia', 'cinética', 'metano'],
    key_findings: [
      'Alta taxa de degradação (classificação: rápida)',
      'BMP de 320-420 L CH4/kg VS',
      'pH crítico para estabilidade do processo'
    ],
    residues_studied: ['Vinhaça'],
    parameters_measured: ['bmp', 'kinetics', 'ph'],
    cited_by: 62,
    relevance_score: 9.0,
    geographic_scope: 'São Paulo, Brasil',
    sample_size: 36
  },
  {
    id: 2003,
    authors: 'Carvalho, F.; Prazeres, A. R.; Rivas, J.',
    title: 'Cheese whey wastewater: Characterization and treatment',
    journal: 'Science of the Total Environment',
    year: 2020,
    volume: '718',
    pages: '137000',
    doi: '10.1016/j.scitotenv.2020.137000',
    reference_type: 'journal',
    peer_reviewed: true,
    sector: 'industrial',
    abstract: 'Review of cheese whey characteristics and anaerobic treatment for biogas production.',
    keywords: ['cheese whey', 'anaerobic digestion', 'biogas', 'wastewater'],
    key_findings: [
      'High biodegradability (FQ > 0.90)',
      'Fast kinetics classification',
      'Excellent BMP potential'
    ],
    residues_studied: ['Soro de queijo'],
    parameters_measured: ['bmp', 'kinetics', 'cod'],
    cited_by: 120,
    relevance_score: 8.8,
    geographic_scope: 'Global',
    sample_size: 200
  },
  {
    id: 2004,
    authors: 'Amaral, A. C.; Kunz, A.; Steinmetz, R. L. R.; Scussiato, L. A.',
    title: 'Influence of solid-liquid separation strategy on biogas yield from swine manure',
    journal: 'Journal of Cleaner Production',
    year: 2018,
    volume: '199',
    pages: '125-132',
    doi: '10.1016/j.jclepro.2018.07.114',
    reference_type: 'journal',
    peer_reviewed: true,
    sector: 'livestock',
    abstract: 'Investigation of solid-liquid separation effects on biogas production from cattle manure.',
    keywords: ['cattle manure', 'separation', 'biogas', 'methane yield'],
    key_findings: [
      'Separation increases overall efficiency',
      'Liquid fraction has faster kinetics',
      'Solid fraction requires longer retention'
    ],
    residues_studied: ['Dejeto bovino'],
    parameters_measured: ['bmp', 'kinetics', 'cn'],
    cited_by: 89,
    relevance_score: 8.5,
    geographic_scope: 'Brasil',
    sample_size: 48
  }
]

// ==========================================
// API FUNCTIONS
// ==========================================

/**
 * Get kinetic data for residues
 */
export async function getKineticsData(
  filters?: KineticsFilter
): Promise<KineticsResponse> {
  try {
    const queryParams = new URLSearchParams();
    if (filters?.sector) {
      queryParams.append('sector_codigo', filters.sector);
    }
    if (filters?.classification) {
      queryParams.append('classification', filters.classification);
    }

    const url = `${API_BASE_URL}/api/v1/scientific/kinetics?${queryParams.toString()}`;
    const response = await authenticatedFetch(url);

    if (!response.ok) {
      throw new Error('Failed to fetch kinetics data');
    }

    const json = await response.json();
    let data = json.data || [];

    // Client-side filtering for properties not handled by backend (like specific residue names list)
    if (filters?.residues && filters.residues.length > 0) {
      data = data.filter((d: any) =>
        filters.residues!.includes(d.residue_name)
      );
    }

    return {
      data,
      total: json.count || data.length,
      filters_applied: filters || {}
    };
  } catch (error) {
    logger.error('Error fetching kinetics data:', error);
    // Fallback to empty or mock if critical, but preferably let it fail or return empty
    return {
      data: [],
      total: 0,
      filters_applied: filters || {}
    };
  }
}

/**
 * Get chemical characterization data
 */
export async function getChemicalData(
  residueIds?: number[]
): Promise<ChemicalDataResponse> {
  // TODO: Replace with real API call

  let filteredData = [...MOCK_CHEMICAL_DATA]

  if (residueIds && residueIds.length > 0) {
    filteredData = filteredData.filter(d => residueIds.includes(d.residue_id))
  }

  // Calculate coverage
  const coverage = {
    bmp: filteredData.filter(d => d.bmp).length / filteredData.length * 100,
    moisture: filteredData.filter(d => d.moisture).length / filteredData.length * 100,
    ts: filteredData.filter(d => d.ts).length / filteredData.length * 100,
    vs: filteredData.filter(d => d.vs).length / filteredData.length * 100,
    cn_ratio: filteredData.filter(d => d.cn_ratio).length / filteredData.length * 100,
    ch4_content: filteredData.filter(d => d.ch4_content).length / filteredData.length * 100,
    ph: filteredData.filter(d => d.ph).length / filteredData.length * 100,
    cod: filteredData.filter(d => d.cod).length / filteredData.length * 100
  }

  return {
    data: filteredData,
    total: filteredData.length,
    coverage
  }
}

/**
 * Get scientific references
 */
export async function getReferences(
  filters?: ReferencesFilter
): Promise<ReferencesResponse> {
  try {
    // Fetch all references from the API (up to 5000)
    const result = await getAllReferences(5000, 0)

    // Convert API references to ScientificReference format
    let filteredData: ScientificReference[] = result.references.map((ref: any) => ({
      id: ref.id || 0,
      authors: ref.authors || 'Unknown',
      title: ref.title || ref.citation || 'No title',
      year: ref.year || new Date().getFullYear(),
      doi: ref.doi,
      url: ref.url,  // Add URL field from backend
      peer_reviewed: ref.is_primary || false,
      sector: ref.sector_codigo || 'unknown',
      residues_studied: ref.residuo_nome ? [ref.residuo_nome] : [],
      parameters_measured: ref.parameter_type ? [ref.parameter_type] : [],
      reference_type: 'journal' as const,
      journal: ref.journal,
      abstract: ref.abstract,
      keywords: [],
      key_findings: []
    }))

    // Apply filters
    if (filters?.sector && filters.sector.length > 0) {
      filteredData = filteredData.filter(d =>
        filters.sector!.includes(d.sector)
      )
    }

    if (filters?.residue && filters.residue.length > 0) {
      filteredData = filteredData.filter(d =>
        d.residues_studied.some(r =>
          filters.residue!.some(fr =>
            r.toLowerCase().includes(fr.toLowerCase())
          )
        )
      )
    }

    if (filters?.parameter && filters.parameter.length > 0) {
      filteredData = filteredData.filter(d =>
        d.parameters_measured.some(p =>
          filters.parameter!.includes(p as ParameterType)
        )
      )
    }

    if (filters?.year_range) {
      filteredData = filteredData.filter(d =>
        d.year >= filters.year_range![0] && d.year <= filters.year_range![1]
      )
    }

    if (filters?.peer_reviewed !== undefined) {
      filteredData = filteredData.filter(d => d.peer_reviewed === filters.peer_reviewed)
    }

    return {
      data: filteredData,
      total: filteredData.length,
      filters_applied: filters || {}
    }
  } catch (error) {
    logger.error('Error in getReferences:', error)
    // Fallback to mock data if API fails
    return {
      data: MOCK_REFERENCES,
      total: MOCK_REFERENCES.length,
      filters_applied: filters || {}
    }
  }
}

/**
 * Get co-digestion recommendations
 */
export async function getCoDigestionRecommendations(
  primaryResidue: string,
  targetCN: number
): Promise<CoDigestionResponse> {
  // TODO: Replace with real API call

  const primary = MOCK_CHEMICAL_DATA.find(d => d.residue_name === primaryResidue)

  if (!primary) {
    throw new Error(`Residue not found: ${primaryResidue}`)
  }

  // Find complementary residues
  const candidates = MOCK_CHEMICAL_DATA.filter(d => {
    if (d.residue_name === primaryResidue) return false
    if (primary.cn_ratio > targetCN) {
      return d.cn_ratio < targetCN  // Need N-rich
    } else {
      return d.cn_ratio > targetCN  // Need C-rich
    }
  })

  const recommendations = candidates.map(coSubstrate => {
    // Calculate optimal ratio
    const cn1 = primary.cn_ratio
    const cn2 = coSubstrate.cn_ratio

    let r2 = (targetCN - cn1) / (cn2 - cn1)
    r2 = Math.max(0.1, Math.min(0.9, r2))
    const r1 = 1 - r2

    const ratio: [number, number] = [
      Math.round(r1 * 100),
      Math.round(r2 * 100)
    ]

    const final_cn = r1 * cn1 + r2 * cn2
    const bmp_mix = r1 * primary.bmp + r2 * coSubstrate.bmp
    const improvement_pct = ((bmp_mix - primary.bmp) / primary.bmp * 100)

    return {
      primary_residue: primaryResidue,
      co_substrate: coSubstrate.residue_name,
      ratio,
      final_cn,
      bmp_mix,
      improvement_pct,
      feasibility: {
        score: 7 + Math.random() * 3,  // Mock score 7-10
        viable: true,
        logistics: 'Moderada',
        seasonality: coSubstrate.sector === primary.sector ? 'Compatível' : 'Variável',
        cost: 'Médio'
      }
    }
  }).sort((a, b) => Math.abs(a.final_cn - targetCN) - Math.abs(b.final_cn - targetCN))

  return {
    recommendations: recommendations.slice(0, 5),
    primary_residue: primary,
    target_cn: targetCN
  }
}

/**
 * Get all residue names for selectors
 */
export async function getResidueList(): Promise<string[]> {
  return MOCK_CHEMICAL_DATA.map(d => d.residue_name).sort()
}

/**
 * Get summary statistics for KPI cards
 */
export async function getScientificSummary(): Promise<{
  total_references: number
  total_residues: number
  total_parameters: number
  fde_validated_pct: number
  sector_breakdown: Record<string, number>
}> {
  const residuesWithFDE = MOCK_CHEMICAL_DATA.filter(d => d.fde && d.fde > 0)

  return {
    total_references: MOCK_REFERENCES.length,
    total_residues: MOCK_CHEMICAL_DATA.length,
    total_parameters: 8,  // BMP, TS, VS, C:N, pH, COD, CH4%, FDE
    fde_validated_pct: (residuesWithFDE.length / MOCK_CHEMICAL_DATA.length) * 100,
    sector_breakdown: {
      agricultural: MOCK_CHEMICAL_DATA.filter(d => d.sector === 'agricultural').length,
      livestock: MOCK_CHEMICAL_DATA.filter(d => d.sector === 'livestock').length,
      industrial: MOCK_CHEMICAL_DATA.filter(d => d.sector === 'industrial').length,
      urban: MOCK_CHEMICAL_DATA.filter(d => d.sector === 'urban').length
    }
  }
}

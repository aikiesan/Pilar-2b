/**
 * PILAR-2b V3 - References API Service
 * API calls for unified references and FDE factor references
 * Modified to fetch from local PostgREST (defaulting to http://localhost:3000)
 */

import {
  UnifiedReference,
  ReferenceWithResidue,
  FatorCompeticao,
  FatorColetaPrazo,
  FatorSazonalidade,
  FatorLogistica,
  FDEBreakdownWithReferences,
  ReferenceStatistics,
  ReferencesResponse,
  FDEFactorsResponse,
  ReferenceSearchFilters,
  FDEFactorType
} from '@/types/references'
import { logger } from '@/lib/logger'

// API base URL for PostgREST
const DB_URL = process.env.NEXT_PUBLIC_DB_API_URL || 'http://localhost:3000';

async function fetchDB<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${DB_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    }
  });
  
  if (!response.ok) {
    throw new Error(`DB API Error: ${response.status}`);
  }
  
  // PostgREST returns headers for counts
  if (options?.headers && (options.headers as any)['Prefer']?.includes('count=')) {
    const countHeader = response.headers.get('content-range');
    const count = countHeader ? parseInt(countHeader.split('/')[1]) : 0;
    const data = await response.json();
    return { data, count } as any;
  }
  
  return await response.json();
}

export async function getReferencesForResidue(codigoResidue: string): Promise<UnifiedReference[]> {
  try {
    return await fetchDB<UnifiedReference[]>(`/referencias_unificadas?codigo_residuo=eq.${codigoResidue}&order=ano.desc`);
  } catch (error) {
    logger.error('Error fetching references for residue:', error);
    return [];
  }
}

export async function getReferencesWithResidueDetails(codigoResidue?: string): Promise<ReferenceWithResidue[]> {
  try {
    let endpoint = `/referencias_unificadas?select=*,residuos_cp2b(codigo,residuo,setor,classificacao)&order=ano.desc`;
    if (codigoResidue) {
      endpoint += `&codigo_residuo=eq.${codigoResidue}`;
    }
    const data = await fetchDB<any[]>(endpoint);
    return data.map(item => ({
      ...item,
      residuo_nome: item.residuos_cp2b?.residuo,
      residuo_setor: item.residuos_cp2b?.setor,
      residuo_classificacao: item.residuos_cp2b?.classificacao
    }));
  } catch (error) {
    logger.error('Error in getReferencesWithResidueDetails:', error);
    return [];
  }
}

export async function searchReferences(filters: ReferenceSearchFilters): Promise<ReferencesResponse> {
  try {
    let queryParams = new URLSearchParams();
    if (filters.codigo_residuo) queryParams.append('codigo_residuo', `eq.${filters.codigo_residuo}`);
    if (filters.parametro) queryParams.append('parametro_relacionado', `eq.${filters.parametro}`);
    if (filters.validation_status) queryParams.append('validation_status', `eq.${filters.validation_status}`);
    if (filters.fonte) queryParams.append('fonte', `eq.${filters.fonte}`);
    if (filters.ano_min) queryParams.append('ano', `gte.${filters.ano_min}`);
    if (filters.ano_max) queryParams.append('ano', `lte.${filters.ano_max}`);
    if (filters.tem_doi !== undefined) {
      if (filters.tem_doi) queryParams.append('doi', 'not.is.null');
      else queryParams.append('doi', 'is.null');
    }
    
    queryParams.append('order', 'ano.desc');
    
    const { data, count } = await fetchDB<any>(`/referencias_unificadas?${queryParams.toString()}`, {
      headers: { 'Prefer': 'count=exact' }
    });
    
    return { references: data || [], total: count || 0 };
  } catch (error) {
    logger.error('Error in searchReferences:', error);
    return { references: [], total: 0 };
  }
}

export async function getReferenceStatistics(codigoResidue: string): Promise<ReferenceStatistics | null> {
  try {
    const references = await getReferencesForResidue(codigoResidue);
    if (references.length === 0) return null;

    const validatedRefs = references.filter(r => r.validation_status === 'VALIDATED').length;
    const refsWithDOI = references.filter(r => r.doi && r.doi.trim() !== '').length;
    const years = references.map(r => r.ano).filter((ano): ano is number => ano !== null && ano !== undefined).sort();
    const parametros = Array.from(new Set(references.map(r => r.parametro_relacionado).filter((p): p is string => p !== null && p !== undefined)));
    const fontes = Array.from(new Set(references.map(r => r.fonte).filter((f): f is 'CP2B' | 'WEBAPP' | 'LITERATURA' | 'MANUAL' => f !== null && f !== undefined)));

    return {
      codigo_residuo: codigoResidue,
      total_referencias: references.length,
      referencias_validadas: validatedRefs,
      referencias_com_doi: refsWithDOI,
      anos_cobertura: years,
      parametros_cobertos: parametros,
      fontes_utilizadas: fontes
    };
  } catch (error) {
    logger.error('Error calculating reference statistics:', error);
    return null;
  }
}

export async function getFatorCompeticao(codigoResidue: string): Promise<FatorCompeticao | null> {
  try {
    const data = await fetchDB<any[]>(`/fator_competicao?codigo_residuo=eq.${codigoResidue}&limit=1`);
    return data.length ? { ...data[0], factor_type: 'FC' as const } : null;
  } catch (error) {
    logger.error('Error in getFatorCompeticao:', error);
    return null;
  }
}

export async function getFatorColetaPrazo(codigoResidue: string): Promise<FatorColetaPrazo | null> {
  try {
    const data = await fetchDB<any[]>(`/fator_coleta_prazo?codigo_residuo=eq.${codigoResidue}&limit=1`);
    return data.length ? { ...data[0], factor_type: 'FCP' as const } : null;
  } catch (error) {
    logger.error('Error in getFatorColetaPrazo:', error);
    return null;
  }
}

export async function getFatorSazonalidade(codigoResidue: string): Promise<FatorSazonalidade | null> {
  try {
    const data = await fetchDB<any[]>(`/fator_sazonalidade?codigo_residuo=eq.${codigoResidue}&limit=1`);
    return data.length ? { ...data[0], factor_type: 'FS' as const } : null;
  } catch (error) {
    logger.error('Error in getFatorSazonalidade:', error);
    return null;
  }
}

export async function getFatorLogistica(codigoResidue: string): Promise<FatorLogistica | null> {
  try {
    const data = await fetchDB<any[]>(`/fator_logistica?codigo_residuo=eq.${codigoResidue}&limit=1`);
    return data.length ? { ...data[0], factor_type: 'FL' as const } : null;
  } catch (error) {
    logger.error('Error in getFatorLogistica:', error);
    return null;
  }
}

export async function getAllFDEFactors(codigoResidue: string): Promise<FDEFactorsResponse> {
  try {
    const [fc, fcp, fs, fl] = await Promise.all([
      getFatorCompeticao(codigoResidue),
      getFatorColetaPrazo(codigoResidue),
      getFatorSazonalidade(codigoResidue),
      getFatorLogistica(codigoResidue)
    ]);
    return {
      fator_competicao: fc || undefined,
      fator_coleta_prazo: fcp || undefined,
      fator_sazonalidade: fs || undefined,
      fator_logistica: fl || undefined
    };
  } catch (error) {
    logger.error('Error in getAllFDEFactors:', error);
    return {};
  }
}

export async function getFDEBreakdown(codigoResidue: string): Promise<FDEBreakdownWithReferences | null> {
  try {
    const residueDataArr = await fetchDB<any[]>(`/residuos_cp2b?select=codigo,residuo,fde,classificacao&codigo=eq.${codigoResidue}&limit=1`);
    if (!residueDataArr.length) return null;
    const residueData = residueDataArr[0];

    const [factors, references] = await Promise.all([
      getAllFDEFactors(codigoResidue),
      getReferencesForResidue(codigoResidue)
    ]);

    if (!factors.fator_competicao || !factors.fator_coleta_prazo || !factors.fator_sazonalidade || !factors.fator_logistica) {
      logger.warn(`Missing FDE factors for residue: ${codigoResidue}`);
      return null;
    }

    return {
      codigo_residuo: residueData.codigo,
      residuo_nome: residueData.residuo,
      fde_final: residueData.fde || 0,
      fde_classificacao: residueData.classificacao || 'N/A',
      fator_competicao: factors.fator_competicao,
      fator_coleta_prazo: factors.fator_coleta_prazo,
      fator_sazonalidade: factors.fator_sazonalidade,
      fator_logistica: factors.fator_logistica,
      fde_formula: 'FDE = (1 - FC) × FCP × FS × FL',
      referencias_gerais: references
    };
  } catch (error) {
    logger.error('Error in getFDEBreakdown:', error);
    return null;
  }
}

export async function getAvailableParameters(): Promise<string[]> {
  try {
    const data = await fetchDB<any[]>('/referencias_unificadas?select=parametro_relacionado&parametro_relacionado=not.is.null');
    const parameters = Array.from(new Set(data.map((item) => item.parametro_relacionado).filter((p): p is string => p !== null)));
    return parameters.sort();
  } catch (error) {
    logger.error('Error in getAvailableParameters:', error);
    return [];
  }
}

export async function getReferencesCountByYear(): Promise<Record<number, number>> {
  try {
    const data = await fetchDB<any[]>('/referencias_unificadas?select=ano&ano=not.is.null');
    const countByYear: Record<number, number> = {};
    data.forEach((item) => {
      if (item.ano) {
        countByYear[item.ano] = (countByYear[item.ano] || 0) + 1;
      }
    });
    return countByYear;
  } catch (error) {
    logger.error('Error in getReferencesCountByYear:', error);
    return {};
  }
}

export async function getTotalReferencesCount(): Promise<number> {
  try {
    const { count } = await fetchDB<any>('/referencias_unificadas?limit=1', {
      headers: { 'Prefer': 'count=exact' }
    });
    return count || 0;
  } catch (error) {
    logger.error('Error in getTotalReferencesCount:', error);
    return 0;
  }
}

'use client';

/**
 * BETA — the SP+MG co-digestion typology (tipologia + regime + cn_molar).
 *
 * Fetched from its own endpoint rather than read off the municipalities
 * GeoJSON: that payload is public and already 3.4 MB, and beta fields must not
 * ride along where a logged-out client could read them out of the response.
 * The endpoint answers 401 without a token, so `enabled` should be gated on
 * useBetaAccess() to avoid a guaranteed-failing request.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import { authenticatedFetch } from '@/lib/apiClient';
import { logger } from '@/lib/logger';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' ? '' : 'http://localhost:8001');

export interface MunicipalityTypology {
  ibge_code: string;
  uf: string;
  municipality_name: string;
  cn_molar: number;
  tipologia: string;
  tip_dom_share: number | null;
  regime: string;
  share_c_rich: number | null;
  share_n_rich: number | null;
  shannon_h: number | null;
  total_vs_t: number | null;
  via_a: boolean | null;
  via_b: boolean | null;
  via_b_classe: string | null;
  /**
   * N-additive blend C:N and the regime derived from it — the method the
   * validation dossier declares. SÃO PAULO ONLY: null for the 853 MG rows,
   * because no corrected pipeline output exists for Minas yet.
   *
   * Prefer these over `cn_molar` / `regime`, which are the SV-weighted
   * arithmetic mean and misclassify 31% of SP. Those two stay in the payload
   * only so the published figures remain reproducible.
   */
  cn_harm: number | null;
  regime_harm: string | null;
  dom_stream: string | null;
  d_gas_km: number | null;
}

async function fetchTypology(): Promise<MunicipalityTypology[]> {
  const res = await authenticatedFetch(`${API_BASE_URL}/api/v1/codigestion/municipality-typology`);
  if (!res.ok) throw new Error(`Typology fetch failed: ${res.status}`);
  const data: { profiles: MunicipalityTypology[]; count: number } = await res.json();
  logger.debug('Typology fetched:', data.count);
  return data.profiles;
}

export function useTypologyProfiles(enabled = true) {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.codigestion.typology(),
    queryFn: fetchTypology,
    enabled,
    staleTime: 10 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
    retry: false, // a 401 will never succeed on retry
  });

  const typologyMap = useMemo(
    () => Object.fromEntries((data ?? []).map((p) => [String(p.ibge_code), p])),
    [data],
  );

  return { typology: data ?? [], typologyMap, isLoading, error };
}

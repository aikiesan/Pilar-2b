'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import { logger } from '@/lib/logger';
import type { MunicipalityCnProfile, MunicipalityCnProfilesResponse } from '@/types/geospatial';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' ? '' : 'http://localhost:8001');

async function fetchCnProfiles(): Promise<MunicipalityCnProfile[]> {
  const url = `${API_BASE_URL}/api/v1/codigestion/municipality-cn-profiles`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`C/N profiles fetch failed: ${res.status}`);
  const data: MunicipalityCnProfilesResponse = await res.json();
  logger.debug('C/N profiles fetched:', data.count);
  return data.profiles;
}

export function useCnProfiles(enabled = true) {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.codigestion.cnProfiles(),
    queryFn: fetchCnProfiles,
    enabled,
    staleTime: 10 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
  });

  const profilesMap = useMemo(
    () => Object.fromEntries((data ?? []).map((p) => [p.ibge_code, p])),
    [data],
  );

  return { profiles: data ?? [], profilesMap, isLoading, error };
}

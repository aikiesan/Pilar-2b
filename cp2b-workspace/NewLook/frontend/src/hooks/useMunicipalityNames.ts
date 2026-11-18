'use client'

/**
 * The light list of municipality names and IBGE codes the search boxes read
 * (/municipalities/names, no geometry), fetched once and shared: the header
 * search, the landing and the 404 page never download the map's GeoJSON.
 *
 * Nothing is fetched until `enabled` (a search box opened or focused). A list
 * that cannot be read is an error, not an empty list, so a search box can say
 * "unavailable" rather than "no municipality found"; `retry` asks again.
 */
import { useQuery } from '@tanstack/react-query'
import { fetchMunicipalityNames, type MunicipalityName } from '@/lib/municipalityNames'
import { queryKeys } from '@/lib/queryClient'

export type NamesState = 'idle' | 'loading' | 'ready' | 'failed'

export function useMunicipalityNames(enabled: boolean): {
  names: MunicipalityName[]
  state: NamesState
  retry: () => void
} {
  const query = useQuery({
    queryKey: queryKeys.municipalities.names(),
    queryFn: async () => {
      const list = await fetchMunicipalityNames()
      if (list.length === 0) throw new Error('The municipality list is unavailable')
      return list
    },
    enabled,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 1,
  })

  const state: NamesState = query.isSuccess
    ? 'ready'
    : query.isFetching || (enabled && query.isPending)
      ? 'loading'
      : query.isError
        ? 'failed'
        : 'idle'

  return {
    names: query.data ?? [],
    state,
    retry: () => {
      if (query.isError && !query.isFetching) void query.refetch()
    },
  }
}

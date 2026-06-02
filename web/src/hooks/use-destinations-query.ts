import { useQuery } from '@tanstack/react-query'

import type { TDestination } from 'fractapay-shared'

import { server } from '../services/server'

export const DESTINATIONS_QUERY_KEY = 'destinations'

export function useDestinationsQuery() {
  return useQuery<TDestination[]>({
    queryKey: [DESTINATIONS_QUERY_KEY],
    queryFn: async () => {
      const { data } = await server.get<TDestination[]>('/destinations')

      return data
    },
    staleTime: Infinity,
  })
}

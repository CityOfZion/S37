import { useQuery } from '@tanstack/react-query'

import type { TListDestinationsResult } from 'fractapay-shared'

import { server } from '../services/server'

export function useDestinationsQuery() {
  return useQuery({
    queryKey: ['destinations'],
    queryFn: async () => {
      const response = await server.get<TListDestinationsResult>('/destinations')

      return response.data
    },
    staleTime: Infinity,
  })
}

import { useQuery } from '@tanstack/react-query'

import type { TGetPaymentsParams, TGetPaymentsResponse } from 'fractapay-shared'

import { server } from '../services/server'

export const PAYMENTS_QUERY_KEY = 'payments'

export function usePaymentsQuery(params?: TGetPaymentsParams) {
  return useQuery<TGetPaymentsResponse>({
    queryKey: [PAYMENTS_QUERY_KEY, params],
    queryFn: async () => {
      const { data } = await server.get<TGetPaymentsResponse>('/payments', { params })

      return data
    },
    staleTime: 30_000,
  })
}

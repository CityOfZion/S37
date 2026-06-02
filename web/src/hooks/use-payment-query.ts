import { useQuery } from '@tanstack/react-query'

import type { TPayment, TPaymentStatus } from 'fractapay-shared'

import { server } from '../services/server'

export const TERMINAL_STATUSES = new Set<TPaymentStatus>([
  'COMPLETED',
  'FAILED',
  'REFUNDED',
  'CANCELED',
])

export const PAYMENT_QUERY_KEY = 'payment'

export function usePaymentQuery(id: string) {
  return useQuery<TPayment>({
    queryKey: [PAYMENT_QUERY_KEY, id],
    enabled: !!id,
    refetchInterval: ({ state }) => {
      const status = state.data?.status
      const requestStatus = state.status

      return (status && TERMINAL_STATUSES.has(status)) || requestStatus === 'error' ? false : 5000
    },
    queryFn: async () => {
      const { data } = await server.get<TPayment>(`/payments/${encodeURIComponent(id)}`)

      return data
    },
  })
}

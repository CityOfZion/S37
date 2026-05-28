import { useQuery } from '@tanstack/react-query'

import { PAYMENT_TERMINAL_STATUSES, TPayment } from 'fractapay-shared'

import { server } from '../services/server'

export const PAYMENT_QUERY_KEY = 'payment'

type TOptions = {
  refetch?: boolean
}

export function usePaymentQuery(id: string, options?: TOptions) {
  const refetch = options?.refetch ?? true

  return useQuery<TPayment>({
    queryKey: [PAYMENT_QUERY_KEY, id],
    enabled: !!id,
    refetchInterval: ({ state }) => {
      const status = state.data?.status
      const requestStatus = state.status

      return !refetch ||
        (status && PAYMENT_TERMINAL_STATUSES.has(status)) ||
        requestStatus === 'error'
        ? false
        : 5000
    },
    queryFn: async () => {
      const { data } = await server.get<TPayment>(`/payments/${encodeURIComponent(id)}`)

      return data
    },
  })
}
